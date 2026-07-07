import { Octokit } from "@octokit/rest";
import { FOLDER_TEMPLATES } from "@/lib/templates";
import type { TechStack } from "@/lib/templates";

//GitHub personal Access TokenでOctokitクライアントを初期化
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

//GitHubのユーザー名を取得(リポジトリ作成時のオーナーとして使用)
async function getAuthenticatedUser(): Promise<string> {
  const { data } = await octokit.rest.users.getAuthenticated();
  return data.login;
}

//新規リポジトリを作成する
export async function createRepository(repoName: string): Promise<string> {
  const { data } = await octokit.rest.repos.createForAuthenticatedUser({
    name: repoName,
    private: false,
    auto_init: true, //READMEを自動作成してmainブランチを作る。
  });
  return data.full_name; //例:"username/reponame"
}

//指定リポジトリをブランチに作成する。
export async function createBranch(
  fullRepoName: string, //例:"username/repo-name"
  branchName: string, //例:"feature/login"
): Promise<void> {
  const [owner, repo] = fullRepoName.split("/");

  //mainブランチの最新コミットSHAを取得(ブランチの起点にする)
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: "heads/main",
  });
  const sha = ref.object.sha;

  //取得したSHAを起点にブランチを作成
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha,
  });
}

//コミットの変更差分(diff)を取得する
export async function getDiff(
  fullRepoName: string, //例"suername/repo-name"
  commitSha: string, //対象コミットのSHA
): Promise<string> {
  const [owner, repo] = fullRepoName.split("/");

  const { data } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: commitSha,
  });

  //変更されたファイルのdiffをまとめて一つの文字列にする
  const diffs = (data.files ?? [])
    .map((file) => `=== ${file.filename} === \n${file.patch ?? ""}`)
    .join("\n\n");

  return diffs;
}

//技術スタックに対応するフォルダ構成をmainブランチにpushする
export async function createInitialStructure(
  fullRepoName: string,
  techStack: TechStack,
): Promise<void> {
  const paths = FOLDER_TEMPLATES[techStack];

  //unknownまたはテンプレートがからの場合はスキップ
  if (paths.length === 0) {
    return;
  }

  const [owner, repo] = fullRepoName.split("/");

  //①mainブランチの最新コミットSHAとツリーSHAを取得する
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: "heads/main",
  });
  const { data: commit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: ref.object.sha,
  });

  //②全フォルダを含む新しいツリーを一括作成する
  const { data: newTree } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: commit.tree.sha,
    tree: paths.map((path) => ({
      path,
      mode: "100644" as const,
      type: "blob" as const,
      content: "",
    })),
  });

  //③新しいツリーを指すコミットを作成する
  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: `Initial project structure for ${techStack}`,
    tree: newTree.sha,
    parents: [ref.object.sha],
  });

  //④mainブランチを新しいブランチに更新する
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: "heads/main",
    sha: newCommit.sha,
  });
}

//リポジトリにWebhookを自動登録する
export async function createWebhook(fullRepoName: string): Promise<void> {
  const [owner, repo] = fullRepoName.split("/");

  await octokit.rest.repos.createWebhook({
    owner,
    repo,
    config: {
      url: `${process.env.APP_URL}/api/webhook`, //CloudRunのURL
      content_type: "json",
      secret: process.env.GITHUB_WEBHOOK_SECRET!,
      insecure_ssl: "0",
    },
    events: ["push"],
    active: true,
  });
}

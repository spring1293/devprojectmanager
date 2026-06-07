import { Octokit } from "@octokit/rest";

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
    private: true,
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

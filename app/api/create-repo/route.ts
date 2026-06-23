import { NextRequest, NextResponse } from "next/server";
import {
  createRepository,
  createBranch,
  createInitialStructure,
} from "@/lib/github";
import { sendMail } from "@/lib/gmail";
import { saveRepository, saveBranch } from "@/lib/firestore";
import type { Branch } from "@/types/branch";
import type { Feature } from "@/types/feature";
import type { TechStack } from "@/lib/templates";

//本ルートをビルド時に解析しない
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const {
      repoName,
      projectName,
      branches,
      features,
      techStack,
    }: {
      repoName: string;
      projectName: string;
      branches: Branch[];
      features: Feature[];
      techStack: TechStack;
    } = await req.json();

    if (!repoName || !projectName || !branches || branches.length === 0) {
      return NextResponse.json(
        { error: "リポジトリ名とブランチ情報が必要です" },
        { status: 400 },
      );
    }

    //GitHubにリポジトリを作成(full_nameを受け取る)
    const fullRepoName = await createRepository(repoName);

    //技術スタックに対応するフォルダ構成をpushする
    await createInitialStructure(fullRepoName, techStack);

    //リポジトリ情報を保存
    await saveRepository({
      repoName: fullRepoName, //"owner/repo"形式
      projectName, //ユーザーが入力したプロジェクト名
      summery: "", //今はからで保存
      featureList: features.map((f) => f.title),
      techStack: [techStack],
      isNew: true,
      requirementsText: "",
      embeddingVector: [],
    });

    //各ブランチを作成し、担当者にメールを送信
    await Promise.allSettled(
      branches.map(async (branch) => {
        await createBranch(fullRepoName, branch.branchName);
        const branchFeatures = features.filter((f) =>
          branch.featureIds.includes(f.id),
        );
        await saveBranch(branch, fullRepoName, branchFeatures);
        if (branch.assignee) {
          await sendMail(
            branch.assignee,
            `【作業依頼】 ${branch.branchName}`,
            `担当ブランチが作成されました。\n\nリポジトリ:https://github.com/${fullRepoName}\nブランチ: ${branch.branchName}\n\n担当機能IDリスト: ${branch.featureIds.join(",")}`,
          );
        }
      }),
    );

    return NextResponse.json({ fullRepoName });
  } catch (error) {
    console.error("APIエラー:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

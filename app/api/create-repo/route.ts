import { NextRequest, NextResponse } from "next/server";
import { createRepository, createBranch } from "@/lib/github";
import { sendMail } from "@/lib/gmail";
import { saveBranch } from "@/lib/firestore";
import type { Branch } from "@/types/branch";
import type { Feature } from "@/types/feature";

export async function POST(req: NextRequest) {
  try {
    const {
      repoName,
      branches,
      features,
    }: { repoName: string; branches: Branch[]; features: Feature[] } =
      await req.json();

    if (!repoName || !branches || branches.length === 0) {
      return NextResponse.json(
        { error: "リポジトリ名とブランチ情報が必要です" },
        { status: 400 },
      );
    }

    //GitHubにリポジトリを作成(full_nameを受け取る)
    const fullRepoName = await createRepository(repoName);

    //各ブランチを作成し、担当者にメールを送信
    for (const branch of branches) {
      await createBranch(fullRepoName, branch.branchName);

      //このブランチが担当する機能要件だけを絞り込みんでFiresotreに保存
      const branchFeatures = features.filter((f) =>
        branch.featureIds.includes(f.id),
      );
      await saveBranch(branch, fullRepoName, branchFeatures);

      //担当者が設定されている場合のみメール送信
      if (branch.assignee) {
        await sendMail(
          branch.assignee,
          `【作業依頼】 ${branch.branchName}`,
          `担当ブランチが作成されました。\n\nリポジトリ:https://github.com/${fullRepoName}\nブランチ: ${branch.branchName}\n\n担当機能IDリスト: ${branch.featureIds.join(",")}`,
        );
      }
    }

    return NextResponse.json({ fullRepoName });
  } catch (error) {
    console.error("APIエラー:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

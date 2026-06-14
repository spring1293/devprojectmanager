import { NextRequest, NextResponse } from "next/server";
import { getDiff } from "@/lib/github";
import { reviewCode } from "@/lib/gemini";
import { getBranchByName, updateBranchReview } from "@/lib/firestore";
import { sendMail } from "@/lib/gmail";

//本ルートをビルド時に解析しない
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    //GitHubのpushイベント以外は無視する。
    const event = req.headers.get("x-github-event");
    if (event !== "push") {
      return NextResponse.json({ message: "ignored" });
    }

    //pushされたブランチ名を取得("refs/heads/feature/login"→"feature/login")
    const branchName = (payload.ref as string).replace("refs/heads/", "");

    //最新コミットのSHAを取得
    const commitSha = payload.head_commit?.id as string;
    if (!commitSha) {
      return NextResponse.json({ message: "no commit" });
    }

    //Firestoreからブランチ情報(機能要件・担当者)を取得
    const branchData = await getBranchByName(branchName);
    if (!branchData) {
      return NextResponse.json({ message: "branch not found in Firestore" });
    }

    //GitHub APIでdiffを取得
    const diff = await getDiff(branchData.fullRepoName, commitSha);

    //Geminiでコードレビューを実行
    const reviewResult = await reviewCode(diff, branchData.features);
    //レビュー結果をfirestoreに追加
    await updateBranchReview(branchData.id, reviewResult);

    //担当者にレビュー結果をメール送信
    if (branchData.assignee) {
      await sendMail(
        branchData.assignee,
        `【コードレビュー】${branchName}`,
        `コミット ${commitSha.slice(0, 7)}のレビュー結果です。\n\n${reviewResult}`,
      );
    }

    return NextResponse.json({ message: "review complete" });
  } catch (error) {
    console.error("Webhookエラー:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

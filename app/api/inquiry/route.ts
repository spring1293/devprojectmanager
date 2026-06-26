import { NextRequest, NextResponse } from "next/server";
import {
  classifyInquiry,
  createSuggestedAnswer,
  generateEmbedding,
} from "@/lib/gemini";
import { saveInquiry, getRepositoryById } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { name, email, title, body, repoId } = await req.json();

    if (!title || !body || !email || !repoId) {
      return NextResponse.json(
        { error: "title・body・email・repoIdは必須です" },
        { status: 400 },
      );
    }

    //Firestoreからリポジトリ情報を取得してrepoContextを組み立てる
    const repo = await getRepositoryById(repoId);
    const repoContext = repo
      ? `システム名: ${repo.repoName}\n機能一覧: ${repo.featureList.join(", ")}\n技術スタック: ${repo.techStack.join(", ")}`
      : "";

    //AI分類実行を実行。AIが使えない時でも登録はできるようにtry/catchで処理
    let aiCategory: InquiryCategory = "unclassified";
    try {
      aiCategory = await classifyInquiry(title, body);
    } catch (e) {
      console.error("分類エラー(スキップ)", e);
    }
    //回答提案を実行。AIが使えない時でも登録はできるようにtry/catchで処理
    let suggestedAnswer = "";
    try {
      suggestedAnswer = await createSuggestedAnswer(repoContext, title, body);
    } catch (e) {
      console.error("回答提案エラー(スキップ):", e);
    }
    //embedding失敗時は空配列で保存(類似検索はその問い合わせではスキップ)
    let embeddingVector: number[] | string = [];
    try {
      embeddingVector = await generateEmbedding(`${title} ${body}`);
    } catch (e) {
      console.error("embedding生成エラー(スキップ) :", e);
      embeddingVector = "生成失敗"; //処理に失敗した場合は文字列を入れる
    }

    const id = await saveInquiry({
      repoId,
      name: name ?? "",
      email,
      title,
      body,
      aiCategory,
      confirmedCategory: null,
      status: "open",
      priority: "medium", //重要度
      assignee: "", //担当者
      dueDate: null, //回答期日
      suggestedAnswer,
      resolvedNote: "",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      embeddingVector,
    });
    return NextResponse.json({ id, aiCategory });
  } catch (error) {
    const errStr = String(error);
    //Gemini高不可エラーを検出して専用メッセージを出す
    if (errStr.includes("503") || errStr.includes("UNAVAILABLE")) {
      return NextResponse.json(
        {
          error:
            "AI処理が混雑しています。しばらく経ってから再度送信を行なってください。",
        },
        { status: 503 },
      );
    }
    console.error("問い合わせAPIエラー", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

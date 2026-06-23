import { NextRequest, NextResponse } from "next/server";
import { classifyInquiry, createSuggestedAnswer } from "@/lib/gemini";
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

    //AI分類と回答提案を並列実行
    const [aiCategory, suggestedAnswer] = await Promise.all([
      classifyInquiry(title, body),
      createSuggestedAnswer(repoContext, title, body),
    ]);

    const id = await saveInquiry({
      name: name ?? "",
      email,
      title,
      body,
      aiCategory,
      confirmedCategory: null,
      status: "open",
      suggestedAnswer,
      resolvedNote: "",
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ id, aiCategory });
  } catch (error) {
    console.error("問い合わせAPIエラー", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

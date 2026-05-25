import { NextRequest, NextResponse } from "next/server";
import { analyzeRequirements, generateEmbedding } from "@/lib/gemini";
import { getRepositories, searchSimilarRepositories } from "@/lib/firestore";
import { Repository } from "@/types/repository";

//POST /api/analyze
export async function POST(req: NextRequest) {
  try {
    console.log("APIキー確認:", process.env.GEMINI_API_KEY?.substring(0, 8));
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json(
        { error: "テキストが必要です" },
        { status: 400 },
      );
    }

    //①新規/改造を判定
    const analysis = await analyzeRequirements(text);

    //②改造の場合：既存リポジトリと照合
    if (!analysis.isNew) {
      const repos = await getRepositories();
      return NextResponse.json({ analysis, condidates: repos });
    }

    //③新規の場合：ベクトル類似度検索(Embeddingが使えるようになったら有効化)
    const similarRepos: Repository[] = [];
    //const vector = await generateEmbedding(text);
    //const similarRepos = await searchSimilarRepositories(vector);
    return NextResponse.json({ analysis, candidates: similarRepos });
  } catch (error) {
    //エラーの詳細をログに出力してクライアントに返す
    console.error("APIエラー", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

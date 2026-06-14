import { NextRequest, NextResponse } from "next/server";
import { extractFeatures } from "@/lib/gemini";

//本ルートをビルド時に解析しない
export const dynamic = "force-dynamic";

//POST /api/extract
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json(
        { error: "テキストが必要です" },
        { status: 400 },
      );
    }

    //Geminiで機能要件を抽出
    const features = await extractFeatures(text);
    return NextResponse.json({ features });
  } catch (error) {
    console.error("APIエラー", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

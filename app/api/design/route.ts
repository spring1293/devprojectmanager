import { NextRequest, NextResponse } from "next/server";
import { designBranches } from "@/lib/gemini";
import { Feature } from "@/types/feature";

//feature:機能要件1件分の型
//designBranches:ブランチ設計を提案する関数。

export async function POST(req: NextRequest) {
  try {
    const { features }: { features: Feature[] } = await req.json();
    if (!features || features.length === 0) {
      return NextResponse.json(
        { error: "機能要件が必要です" },
        { status: 400 },
      );
    }

    const branches = await designBranches(features);
    return NextResponse.json({ branches });
  } catch (error) {
    console.error("APIエラー:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

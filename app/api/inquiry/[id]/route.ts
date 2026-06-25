import { NextRequest, NextResponse } from "next/server";
import {
  updateInquiry,
  getInquiryById,
  searchSimilarInquiries,
} from "@/lib/firestore";
import { classifyInquiry, generateEmbedding } from "@/lib/gemini";

export const dynamic = "force-dynamic";

//PATCH /api/inquiry/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; //awaitしてidを取り出す
    const { confirmedCategory, status, resolvedNote } = await req.json();
    await updateInquiry(id, {
      ...(confirmedCategory !== undefined && { confirmedCategory }),
      ...(status !== undefined && { status }),
      ...(resolvedNote !== undefined && { resolvedNote }),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("問い合わせ更新エラー", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

//GET /api/inquiry/[id] - 類似ケース検索
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const inquiry = await getInquiryById(id);
    if (
      !inquiry ||
      !Array.isArray(inquiry.embeddingVector) ||
      inquiry.embeddingVector.length === 0
    ) {
      return NextResponse.json({ similar: [] });
    }
    const similar = await searchSimilarInquiries(
      inquiry.embeddingVector,
      id,
      inquiry.confirmedCategory ?? inquiry.aiCategory,
    );
    return NextResponse.json({ similar });
  } catch (error) {
    console.error("類似問い合わせ検索エラー", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

//POST /api/inquiry/[id] - AI処理の個別再実行
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { action } = await req.json();
    const inquiry = await getInquiryById(id);
    if (!inquiry) {
      return NextResponse.json(
        { error: "問い合わせが見つかりません" },
        { status: 404 },
      );
    }

    if (action === "classify") {
      const aiCategory = await classifyInquiry(inquiry.title, inquiry.body);
      await updateInquiry(id, { aiCategory });
      return NextResponse.json({ aiCategory });
    }

    if (action === "embed") {
      const embeddingVector = await generateEmbedding(
        `${inquiry.title} ${inquiry.body}`,
      );
      await updateInquiry(id, { embeddingVector });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "不明なアクション" }, { status: 400 });
  } catch (error) {
    const errStr = String(error);
    if (errStr.includes("503") || errStr.includes("UNAVAILABLE")) {
      return NextResponse.json(
        { error: "AIが混雑しています。しばらく待ってから再度お試しください。" },
        { status: 503 },
      );
    }
    console.error("AI再実行エラー", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

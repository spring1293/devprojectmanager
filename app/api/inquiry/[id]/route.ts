import { NextRequest, NextResponse } from "next/server";
import { updateInquiry } from "@/lib/firestore";

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

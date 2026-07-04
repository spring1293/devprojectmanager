import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/gmail";

export const dynamic = "force-dynamic";

// POST /api/test-mail — メール送信テスト
export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json();
    if (!to) {
      return NextResponse.json(
        { error: "宛先が指定されていません" },
        { status: 400 },
      );
    }

    await sendMail(
      to,
      "【テスト】メール送信確認",
      `このメールはFlowForgeのメール送信テストです。\n\n送信日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("テストメール送信エラー", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

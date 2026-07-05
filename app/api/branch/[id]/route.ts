import { NextRequest, NextResponse } from "next/server";
import { updateBranch } from "@/lib/firestore";

export const dynamic = "force-dynamic";

//PATCH /api/branch/[id] -- 担当者を変更する
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { assignee, completed } = await req.json();
    if (assignee === undefined && completed === undefined) {
      return NextResponse.json(
        { error: "assigneeまたはcompletedが必要です" },
        { status: 400 },
      );
    }
    const data: { assignee?: string; completed?: boolean } = {};
    if (assignee !== undefined) data.assignee = assignee;
    if (completed !== undefined) data.completed = completed;
    await updateBranch(id, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

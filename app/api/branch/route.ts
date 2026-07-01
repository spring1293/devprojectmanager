import { NextRequest, NextResponse } from "next/server";
import {
  createInquiryBranch,
  updateInquiry,
  getRepositoryById,
} from "@/lib/firestore";
import { createBranch } from "@/lib/github";

export const dynamic = "force-dynamic";

//POST  /api/branch問い合わせ起点でブランチを新規作成し、問い合わせに紐づける
export async function POST(req: NextRequest) {
  try {
    const { branchName, branchType, repoId, description, inquiryId } =
      await req.json();
    //必須フィールドのチェック
    if (!branchName || !branchType || !repoId || !inquiryId) {
      return NextResponse.json(
        { error: "必須フィールドが不足しています" },
        { status: 400 },
      );
    }

    //FirestoreからGitHubリポジトリ名(owner/repo)を取得
    const repository = await getRepositoryById(repoId);
    if (!repository) {
      return NextResponse.json(
        { error: "リポジトリが見つかりません" },
        { status: 404 },
      );
    }
    const fullRepoName = repository.repoName; //"owner/repo"形式

    //GitHubにブランチを作成
    await createBranch(fullRepoName, branchName);

    //Firesotreにブランチドキュメントを保存
    const branchId = await createInquiryBranch({
      branchName,
      branchType,
      fullRepoName,
      description: description ?? "",
      inquiryId,
    });

    //問い合わせにbranchIdを紐づける
    await updateInquiry(inquiryId, { branchId });

    return NextResponse.json({ branchId, branchName });
  } catch (error) {
    console.error("ブランチ作成エラー", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

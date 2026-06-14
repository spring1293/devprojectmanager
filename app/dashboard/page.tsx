import { getAllBranches } from "@/lib/firestore";

//本ルートをビルド時に解析しない
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  //サーバーサイドで直接Firestoreからデータ取得(APIを経由しない)
  const branches = await getAllBranches();

  return (
    <main className="max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-8">進捗ダッシュボード</h1>

      {branches.length === 0 ? (
        <p className="text-gray-500">ブランチ情報がありません。</p>
      ) : (
        <ul className="space-y-6">
          {branches.map((branch) => (
            <li key={branch.id} className="border rounded p-4 space-y-2">
              {/* ブランチ名 */}
              <p className="font-semibold text-lg">{branch.branchName}</p>

              {/* リポジトリ */}
              <p className="text-sm text-gray-500">
                リポジトリ:{" "}
                <a
                  href={`https://github.com/${branch.fullRepoName}`}
                  className="text-indigo-600 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {branch.fullRepoName}
                </a>
              </p>

              {/* 担当者 */}
              <p className="text-sm">担当者: {branch.assignee || "未設定"}</p>

              {/* 担当機能 */}
              <p className="text-sm text-gray-600">
                担当機能: {branch.features.map((f) => f.title).join(",")}
              </p>

              {/* 最新レビュー結果 */}
              <div className="mt-2">
                <p className="text-sm font-semibold">最新レビュー結果:</p>
                {branch.lastReview ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1 bg-gray-50 p-2 rounded">
                    {branch.lastReview}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">レビュー未実装</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

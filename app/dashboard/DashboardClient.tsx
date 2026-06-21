"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Branch } from "@/types/branch";
import type { Feature } from "@/types/feature";

type BranchWithMeta = Branch & {
  fullRepoName: string;
  features: Feature[];
  lastReview: string;
};

export default function DashboardClient({
  branches,
}: {
  branches: BranchWithMeta[];
}) {
  const router = useRouter();

  // fullRepoNameでグループ化してリポジトリ一覧を作成
  const repoMap = branches.reduce<Record<string, BranchWithMeta[]>>(
    (acc, branch) => {
      if (!acc[branch.fullRepoName]) acc[branch.fullRepoName] = [];
      acc[branch.fullRepoName].push(branch);
      return acc;
    },
    {},
  );

  const repoList = Object.keys(repoMap);
  const [selectedRepo, setSelectedRepo] = useState(repoList[0] ?? "");
  const selectedBranches = repoMap[selectedRepo] ?? [];

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* サイドバー */}
      <aside
        className="flex flex-col flex-none h-screen"
        style={{
          width: 266,
          background: "#f7f7f8",
          borderRight: ".5px solid rgba(0,0,0,.10)",
        }}
      >
        {/* ブランド行 */}
        <div className="px-[22px] pt-[22px] pb-[18px]">
          <p className="text-sm font-semibold text-[#0000cd] tracking-tight m-0">
            ハツメイカー(デジタルモデル)
          </p>
          <p className="text-[11px] text-[#8a8a8e] m-0">Software Only</p>
          <p className="text-[11px] text-[#8a8a8e] m-0">DevOps Support</p>
        </div>

        {/* セクションラベル */}
        <p className="text-[11px] font-semibold text-[#8a8a8e] px-6 pb-1.5 m-0">
          リポジトリ
        </p>

        {/* リポジトリリスト */}
        <div className="flex-1 overflow-y-auto px-2.5 pb-2">
          {repoList.length === 0 ? (
            <p className="text-[13px] text-[#8a8a8e] px-2 py-2">
              リポジトリなし
            </p>
          ) : (
            repoList.map((repo) => {
              const repoShort = repo.split("/")[1] ?? repo;
              const isSelected = repo === selectedRepo;
              return (
                <div
                  key={repo}
                  onClick={() => setSelectedRepo(repo)}
                  className="flex flex-col gap-0.5 px-2 py-[7px] rounded-lg cursor-pointer mb-0.5"
                  style={
                    isSelected
                      ? {
                          background: "#fff",
                          boxShadow:
                            "inset 0 0 0 1px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05)",
                        }
                      : {}
                  }
                >
                  <p
                    className="text-[13px] text-[#1d1d1f] m-0 truncate"
                    style={{ fontWeight: isSelected ? 650 : 500 }}
                  >
                    {repoShort}
                  </p>
                  <p className="text-[11px] text-[#8a8a8e] m-0">
                    {repoMap[repo].length} branches
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* フッター：新規プロジェクト追加ボタン */}
        <div
          style={{
            padding: "10px 14px",
            borderTop: ".5px solid rgba(0,0,0,.08)",
          }}
        >
          <button
            onClick={() => router.push("/analyze")}
            className="w-full h-9 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer"
            style={{ background: "rgba(10,132,255,.10)", color: "#0a6fe0" }}
          >
            ＋ 新規プロジェクト追加
          </button>
        </div>
      </aside>

      {/* メインエリア */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[980px] mx-auto px-7 py-7">
          {selectedRepo ? (
            <>
              {/* ヒーロー */}
              <h1
                className="text-[22px] text-[#1d1d1f] mb-1"
                style={{ fontWeight: 680, letterSpacing: "-.015em" }}
              >
                {selectedRepo.split("/")[1]}
              </h1>
              <p className="text-[12.5px] text-[#a1a1a6] font-mono mb-6">
                {selectedRepo}
              </p>

              {/* ブランチ一覧見出し */}
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">
                ブランチ一覧
                <span className="text-[12.5px] font-normal text-[#a1a1a6] ml-2">
                  {selectedBranches.length} ブランチ
                </span>
              </h2>

              {/* ブランチカード */}
              <div className="flex flex-col gap-4">
                {selectedBranches.map((branch) => (
                  <div
                    key={branch.id}
                    className="rounded-xl p-[18px]"
                    style={{
                      boxShadow:
                        "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
                    }}
                  >
                    <p className="text-[12.5px] font-semibold text-[#1d1d1f] font-mono m-0 mb-1">
                      {branch.branchName}
                    </p>
                    {branch.assignee && (
                      <p className="text-[12.5px] text-[#6e6e73] m-0 mb-2">
                        担当: {branch.assignee}
                      </p>
                    )}
                    <ul className="m-0 mb-3 pl-4">
                      {branch.features.map((f) => (
                        <li key={f.id} className="text-[12.5px] text-[#6e6e73]">
                          {f.title}
                        </li>
                      ))}
                    </ul>
                    {branch.lastReview ? (
                      <div
                        className="rounded-lg px-3 py-2.5"
                        style={{
                          background: "#fafafb",
                          border: ".5px solid rgba(0,0,0,.06)",
                        }}
                      >
                        <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-1.5">
                          コードレビュー結果
                        </p>
                        <p className="text-[12.5px] text-[#3a3a3c] m-0 whitespace-pre-wrap leading-relaxed">
                          {branch.lastReview}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[12.5px] text-[#a1a1a6] m-0">
                        レビュー未実施
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[#a1a1a6]">
              左のサイドバーからリポジトリを選択してください
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

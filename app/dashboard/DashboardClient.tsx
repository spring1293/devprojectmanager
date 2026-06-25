"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Branch } from "@/types/branch";
import type { Feature } from "@/types/feature";
import type { Inquiry } from "@/types/inquiry";
import type { Repository } from "@/types/repository";
import OpsDashboardClient from "@/app/ops/dashboard/OpsDashboardClient";

type BranchWithMeta = Branch & {
  fullRepoName: string;
  features: Feature[];
  lastReview: string;
};

export default function DashboardClient({
  branches,
  inquiries,
  repositories,
}: {
  branches: BranchWithMeta[];
  inquiries: Inquiry[];
  repositories: Repository[];
}) {
  const [tab, setTab] = useState<"branches" | "inquiries">("branches");
  const [inquiryFilter, setInquiryFilter] = useState<"repo" | "all">("repo");
  const router = useRouter();

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

  // selectedRepo に対応する Firestore repoId を取得
  const selectedRepoId = repositories.find(
    (r) => r.repoName === selectedRepo,
  )?.id;

  // フィルタに応じて問い合わせを絞り込む
  const filteredInquiries =
    inquiryFilter === "all"
      ? inquiries
      : selectedRepoId
        ? inquiries.filter((i) => i.repoId === selectedRepoId)
        : [];

  // タブUI共通スタイル
  const tabStyle = (active: boolean) => ({
    background: "none" as const,
    color: active ? "#0a84ff" : "#a1a1a6",
    borderBottom: active ? "2px solid #0a84ff" : "2px solid transparent",
  });

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

        <p className="text-[11px] font-semibold text-[#8a8a8e] px-6 pb-1.5 m-0">
          リポジトリ
        </p>

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
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* タブ */}
        <div
          className="flex-none flex gap-5 px-7 h-11 items-center"
          style={{ borderBottom: ".5px solid rgba(0,0,0,.09)" }}
        >
          <button
            onClick={() => setTab("branches")}
            className="text-[13px] font-semibold border-none cursor-pointer h-full"
            style={tabStyle(tab === "branches")}
          >
            ブランチ一覧
          </button>
          <button
            onClick={() => setTab("inquiries")}
            className="text-[13px] font-semibold border-none cursor-pointer h-full"
            style={tabStyle(tab === "inquiries")}
          >
            問い合わせ
          </button>
        </div>

        {/* ブランチタブ */}
        {tab === "branches" && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[980px] mx-auto px-7 py-7">
              {selectedRepo ? (
                <>
                  <h1
                    className="text-[22px] text-[#1d1d1f] mb-1"
                    style={{ fontWeight: 680, letterSpacing: "-.015em" }}
                  >
                    {selectedRepo.split("/")[1]}
                  </h1>
                  <p className="text-[12.5px] text-[#a1a1a6] font-mono mb-6">
                    {selectedRepo}
                  </p>

                  <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">
                    ブランチ一覧
                    <span className="text-[12.5px] font-normal text-[#a1a1a6] ml-2">
                      {selectedBranches.length} ブランチ
                    </span>
                  </h2>

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
                            <li
                              key={f.id}
                              className="text-[12.5px] text-[#6e6e73]"
                            >
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
          </div>
        )}

        {/* 問い合わせタブ */}
        {tab === "inquiries" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* フィルタトグル */}
            <div
              className="flex-none flex gap-2 px-7 py-3"
              style={{ borderBottom: ".5px solid rgba(0,0,0,.06)" }}
            >
              <button
                onClick={() => setInquiryFilter("repo")}
                className="px-3 h-7 rounded-full text-[11px] font-semibold border-none cursor-pointer"
                style={
                  inquiryFilter === "repo"
                    ? { background: "#0a84ff", color: "#fff" }
                    : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
                }
              >
                {selectedRepo.split("/")[1] ?? "このリポジトリ"}
              </button>
              <button
                onClick={() => setInquiryFilter("all")}
                className="px-3 h-7 rounded-full text-[11px] font-semibold border-none cursor-pointer"
                style={
                  inquiryFilter === "all"
                    ? { background: "#0a84ff", color: "#fff" }
                    : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
                }
              >
                すべて
              </button>
            </div>
            {/* 問い合わせ一覧 */}
            <div className="flex-1 overflow-y-auto">
              <OpsDashboardClient inquiries={filteredInquiries} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

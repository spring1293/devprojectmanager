"use client";

const SHOW_TEST_MAIL = false; //trueにすると再表示

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Branch } from "@/types/branch";
import type { Feature } from "@/types/feature";
import type { Inquiry, InquiryStatus } from "@/types/inquiry";
import type { Repository } from "@/types/repository";
import InquiryKanban from "@/app/dashboard/InquiryKanban";
import InquiryGraph from "@/app/dashboard/InquiryGraph";
import OpsDetailClient from "@/app/ops/inquiry/[id]/OpsDetailClient";
import BranchOperationModal from "@/app/dashboard/BranchOperationModal";
import BranchDetailModal from "@/app/dashboard/BranchDetailModal";

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
  const [inquiryView, setInquiryView] = useState<"kanban" | "graph">("kanban");
  const [inquiryList, setInquiryList] = useState(inquiries);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [selectedBranchOpInquiry, setSelectedBranchOpInquiry] =
    useState<Inquiry | null>(null);
  const [testMailTo, setTestMailTo] = useState("");
  const [testMailStatus, setTestMailStatus] = useState<
    "idle" | "sending" | "ok" | "error"
  >("idle");
  const [testMailError, setTestMailError] = useState<string | null>(null);
  const [localBranchNames, setLocalBranchNames] = useState<
    Record<string, string>
  >({});
  const [selectedBranch, setSelectedBranch] = useState<BranchWithMeta | null>(
    null,
  );
  const [localAssignees, setLocalAssignees] = useState<Record<string, string>>(
    {},
  );
  const [branchFilter, setBranchFilter] = useState<"incomplete" | "all">(
    "incomplete",
  );
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>(
    {},
  );
  const router = useRouter();

  const repoMap = branches.reduce<Record<string, BranchWithMeta[]>>(
    (acc, branch) => {
      if (!acc[branch.fullRepoName]) acc[branch.fullRepoName] = [];
      acc[branch.fullRepoName].push(branch);
      return acc;
    },
    {},
  );

  const branchOptions = branches.map((b) => ({
    id: b.id,
    branchName: b.branchName,
    fullRepoName: b.fullRepoName,
    inquiryCount: inquiryList.filter((i) => i.branchId === b.id).length,
  }));

  //サーバーデータ+新規作成ブランチを統合したID→名前マップ
  const branchMap: Record<string, string> = {
    ...Object.fromEntries(branchOptions.map((b) => [b.id, b.branchName])),
    ...localBranchNames,
  };

  const repoList = Object.keys(repoMap);
  const [selectedRepo, setSelectedRepo] = useState(repoList[0] ?? "");
  const selectedBranches = repoMap[selectedRepo] ?? [];
  const filteredBranches =
    branchFilter === "all"
      ? selectedBranches
      : selectedBranches.filter((b) => !(localCompleted[b.id] ?? b.completed));

  // selectedRepo に対応する Firestore repoId を取得
  const selectedRepoId = repositories.find(
    (r) => r.repoName === selectedRepo,
  )?.id;

  // フィルタに応じて問い合わせを絞り込む
  const filteredInquiries =
    inquiryFilter === "all"
      ? inquiryList
      : selectedRepoId
        ? inquiryList.filter((i) => i.repoId === selectedRepoId)
        : [];

  //ステータス変更ハンドラを追加
  const handleStatusChange = async (id: string, status: InquiryStatus) => {
    const res = await fetch(`/api/inquiry/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setInquiryList((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status } : i)),
      );
    }
  };

  //テストメールを送信する
  const handleTestMail = async () => {
    if (!testMailTo.trim()) return;
    setTestMailStatus("sending");
    setTestMailError(null);
    try {
      const res = await fetch("/api/test-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testMailTo }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestMailStatus("ok");
      } else {
        setTestMailStatus("error");
        setTestMailError(data.error ?? "送信失敗");
      }
    } catch {
      setTestMailSatus("error");
      setTestMailError("ネットワークエラー");
    }
  };

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
          <p className="text-[20px] font-semibold text-[#0000cd] tracking-tight m-0">
            🛎️FlowForge🛎️
          </p>
          <p className="text-[var(--font-xs)] text-[#8a8a8e] m-0">
            DevOps Support
          </p>
        </div>

        <p className="text-[var(--font-xs)] font-semibold text-[#8a8a8e] px-6 pb-1.5 m-0">
          リポジトリ
        </p>

        <div className="flex-1 overflow-y-auto px-2.5 pb-2">
          {repoList.length === 0 ? (
            <p className="text-[var(--font-base)] text-[#8a8a8e] px-2 py-2">
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
                    className="text-[var(--font-base)] text-[#1d1d1f] m-0 truncate"
                    style={{ fontWeight: isSelected ? 650 : 500 }}
                  >
                    {repoShort}
                  </p>
                  <p className="text-[var(--font-xs)] text-[#8a8a8e] m-0">
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
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <button
            onClick={() => router.push("/analyze")}
            className="w-full h-9 rounded-lg text-[var(--font-sm)] font-semibold border-none cursor-pointer"
            style={{ background: "rgba(10,132,255,.10)", color: "#0a6fe0" }}
          >
            ＋ 新規プロジェクト追加
          </button>
          <button
            onClick={() => router.push("/inquiry")}
            className="w-full h-9 rounded-lg text-[var(--font-sm)] font-semibold border-none cursor-pointer"
            style={{ background: "rgba(0,0,0,.06)", color: "#3a3a3c" }}
          >
            お問い合わせフォーム(テスト用)
          </button>
        </div>

        {/* メール送信テスト(フラグがfalseなら非表示) */}
        {SHOW_TEST_MAIL && (
          <div
            style={{
              padding: "10px 14px",
              borderTop: ".5px solid rgba(0,0,0,.08)",
            }}
          >
            <p className="text-[var(--font-2xs)] font-semibold text-[#8a8a8e] mb-1.5">
              メール送信テスト
            </p>
            <input
              value={testMailTo}
              onChange={(e) => {
                setTestMailTo(e.target.value);
                setTestMailStatus("idle");
              }}
              placeholder="送信先メールアドレス"
              className="w-full h-8 px-2 rounded-lg text-[var(--font-2xs)] outline-none mb-1.5"
              style={{ border: ".5px solid rgba(0,0,0,.18)" }}
            />
            <button
              onClick={handleTestMail}
              disabled={testMailStatus === "sending" || !testMailTo.trim()}
              className="w-full h-8 rounded-lg text-[var(--font-2xs)] font-semibold border-none cursor-pointer disabled:opacity-40"
              style={{ background: "rgba(0,0,0,.06)", color: "#3a3a3c" }}
            >
              {testMailStatus === "sending" ? "送信中..." : "テストメール送信"}
            </button>
            {testMailStatus === "ok" && (
              <p className="text-[var(--font-2xs)] text-[#34c759] mt-1">
                送信成功 ✓
              </p>
            )}
            {testMailStatus === "error" && (
              <p className="text-[var(--font-2xs)] text-[#ff3b30] mt-1">
                {testMailError}
              </p>
            )}
          </div>
        )}
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
            className="text-[var(--font-base)] font-semibold border-none cursor-pointer h-full"
            style={tabStyle(tab === "branches")}
          >
            ブランチ一覧
          </button>
          <button
            onClick={() => setTab("inquiries")}
            className="text-[var(--font-base)] font-semibold border-none cursor-pointer h-full"
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
                    className="text-[var(--font-xl)] text-[#1d1d1f] mb-1"
                    style={{ fontWeight: 680, letterSpacing: "-.015em" }}
                  >
                    {selectedRepo.split("/")[1]}
                  </h1>
                  <p className="text-[var(--font-sm)] text-[#a1a1a6] font-mono mb-6">
                    {selectedRepo}
                  </p>

                  <h2 className="text-[var(--font-lg)] font-semibold text-[#1d1d1f] mb-3">
                    ブランチ一覧
                    <span className="text-[var(--font-sm)] font-normal text-[#a1a1a6] ml-2">
                      {selectedBranches.length} ブランチ
                    </span>
                  </h2>
                  {/* フィルタボタン */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setBranchFilter("incomplete")}
                      className="px-3 h-7 rounded-full text-[var(--font-xs)] font-semibold border-none cursor-pointer"
                      style={
                        branchFilter === "incomplete"
                          ? { background: "#0a84ff", color: "#fff" }
                          : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
                      }
                    >
                      未完了
                    </button>
                    <button
                      onClick={() => setBranchFilter("all")}
                      className="px-3 h-7 rounded-full text-[var(--font-xs)] font-semibold border-none cursor-pointer"
                      style={
                        branchFilter === "all"
                          ? { background: "#0a84ff", color: "#fff" }
                          : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
                      }
                    >
                      すべて
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredBranches.map((branch) => (
                      <div
                        key={branch.id}
                        onClick={() => setSelectedBranch(branch)}
                        className="rounded-xl p-[18px] cursor-pointer hover:opacity-80"
                        style={{
                          boxShadow:
                            "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
                          opacity:
                            (localCompleted[branch.id] ?? branch.completed)
                              ? 0.5
                              : 1,
                        }}
                      >
                        <p className="text-[var(--font-sm)] font-semibold text-[#1d1d1f] font-mono m-0 mb-1">
                          {branch.branchName}
                        </p>
                        {(localAssignees[branch.id] ?? branch.assignee) && (
                          <p className="text-[var(--font-sm)] text-[#6e6e73] m-0 mb-2">
                            担当: {localAssignees[branch.id] ?? branch.assignee}
                          </p>
                        )}
                        <ul className="m-0 mb-3 pl-4">
                          {branch.features.map((f) => (
                            <li
                              key={f.id}
                              className="text-[var(--font-sm)] text-[#6e6e73]"
                            >
                              {f.title}
                            </li>
                          ))}
                        </ul>
                        {branch.lastReview ? (
                          <span
                            className="inline-block px-2 h-5 rounded text-[var(--font-2xs)] font-semibold"
                            style={{
                              background: "rgba(52,199,89,.12)",
                              color: "#1a7f37",
                            }}
                          >
                            レビューあり
                          </span>
                        ) : (
                          <span className="text-[var(--font-xs)] text-[#a1a1a6]">
                            レビュー未実施
                          </span>
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
            {/* フィルタ + ビュー切替 */}
            <div
              className="flex-none flex items-center justify-between px-7 py-3"
              style={{ borderBottom: ".5px solid rgba(0,0,0,.06)" }}
            >
              <div className="flex gap-2">
                <button
                  onClick={() => setInquiryFilter("repo")}
                  className="px-3 h-7 rounded-full text-[var(--font-xs)] font-semibold border-none cursor-pointer"
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
                  className="px-3 h-7 rounded-full text-[var(--font-xs)] font-semibold border-none cursor-pointer"
                  style={
                    inquiryFilter === "all"
                      ? { background: "#0a84ff", color: "#fff" }
                      : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
                  }
                >
                  すべて
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setInquiryView("kanban")}
                  className="px-3 h-7 rounded-full text-[var(--font-xs)] font-semibold border-none cursor-pointer"
                  style={
                    inquiryView === "kanban"
                      ? { background: "#0a84ff", color: "#fff" }
                      : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
                  }
                >
                  カンバン
                </button>
                <button
                  onClick={() => setInquiryView("graph")}
                  className="px-3 h-7 rounded-full text-[var(--font-xs)] font-semibold border-none cursor-pointer"
                  style={
                    inquiryView === "graph"
                      ? { background: "#0a84ff", color: "#fff" }
                      : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
                  }
                >
                  グラフ
                </button>
              </div>
            </div>

            {/* カンバン or グラフ */}
            <div className="flex-1 overflow-y-auto">
              {inquiryView === "kanban" ? (
                <InquiryKanban
                  inquiries={filteredInquiries}
                  onCardClick={(inquiry) => setSelectedInquiry(inquiry)}
                  onStatusChange={handleStatusChange}
                  onBranchOp={(inquiry) => setSelectedBranchOpInquiry(inquiry)}
                  branchMap={branchMap}
                />
              ) : (
                <InquiryGraph inquiries={filteredInquiries} />
              )}
            </div>
          </div>
        )}
      </div>
      {/* 問い合わせ詳細モーダル */}
      {selectedInquiry && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: "rgba(0,0,0,.45)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedInquiry(null);
          }}
        >
          <div
            className="relative bg-white rounded-2xl my-8 mx-auto w-full max-w-4xl"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}
          >
            <button
              onClick={() => setSelectedInquiry(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 z-10"
              style={{
                background: "rgba(0,0,0,.07)",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                color: "#6e6e73",
              }}
            >
              ✕
            </button>
            <OpsDetailClient
              inquiry={selectedInquiry}
              onClose={() => setSelectedInquiry(null)}
              onUpdate={(updated) =>
                setInquiryList((prev) =>
                  prev.map((i) => (i.id === updated.id ? updated : i)),
                )
              }
            />
          </div>
        </div>
      )}
      {/*ブランチ操作モーダル */}
      {selectedBranchOpInquiry && (
        <BranchOperationModal
          inquiry={selectedBranchOpInquiry}
          branches={branchOptions}
          onClose={() => setSelectedBranchOpInquiry(null)}
          onBranchCreated={(branchId, branchName) => {
            setLocalBranchNames((prev) => ({
              ...prev,
              [branchId]: branchName,
            }));
            // 問い合わせリストのbranchIdをリアルタイム更新
            setInquiryList((prev) =>
              prev.map((i) =>
                i.id === selectedBranchOpInquiry.id ? { ...i, branchId } : i,
              ),
            );
            setSelectedBranchOpInquiry(null);
          }}
        />
      )}
      {/* ブランチ詳細モーダル */}
      {selectedBranch && (
        <BranchDetailModal
          branch={{
            ...selectedBranch,
            assignee:
              localAssignees[selectedBranch.id] ?? selectedBranch.assignee,
            completed:
              localCompleted[selectedBranch.id] ?? selectedBranch.completed,
          }}
          onClose={() => setSelectedBranch(null)}
          onAssigneeUpdated={(branchId, newAssignee) => {
            setLocalAssignees((prev) => ({ ...prev, [branchId]: newAssignee }));
          }}
          onCompletedToggled={(branchId, completed) => {
            setLocalCompleted((prev) => ({ ...prev, [branchId]: completed }));
          }}
        />
      )}
    </div>
  );
}

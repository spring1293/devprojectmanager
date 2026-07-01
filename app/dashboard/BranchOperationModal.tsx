"use client";

import { useState } from "react";
import type { Inquiry } from "@/types/inquiry";

//DashboardClientから渡される既存ブランチの型
type BranchOption = {
  id: string;
  branchName: string;
  fullRepoName: string;
  inquiryCount: number; //紐付け済み問い合わせ件数
};

type Tab = "new" | "existing";

//タイトルから英数字スラッグを生成する
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") //英数字・スペース・ハイフン以外を除去
    .trim()
    .replace(/\s+/g, "-") //スペースをハイフンに置換
    .slice(0, 50); //長すぎる場合は切り詰め
}

export default function BranchOperationModal({
  inquiry,
  branches,
  onClose,
  onBranchCreated,
}: {
  inquiry: Inquiry;
  branches: BranchOption[];
  onClose: () => void;
  onBranchCreated: (branchId: string, branchName: string) => void;
}) {
  const [tab, setTab] = useState<Tab>(inquiry.branchId ? "existing" : "new");

  //タブ共通スタイル
  const tabStyle = (active: boolean) => ({
    background: "none" as const,
    color: active ? "#0a84ff" : "#a1a1a6",
    borderBottom: active ? "2px solid #0a84ff" : "2px solid transparent",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg mx-4"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}
      >
        {/* ヘッダー */}
        <div
          className="px-6 pt-5 pb-4"
          style={{ borderBottom: ".5px solid rgba(0,0,0,.08)" }}
        >
          <p className="text-[13px] font-semibold text-[#1d1d1f] m-0">
            ブランチ操作
          </p>
          <p className="text-[11px] text-[#a1a1a6] m-0 mt-0.5 truncate">
            #{inquiry.id.slice(0, 6)} {inquiry.title}
          </p>
        </div>

        {/* タブ */}
        <div
          className="flex gap-5 px-6 h-10 items-center"
          style={{ borderBottom: ".5px solid rgba(0,0,0,.08)" }}
        >
          {/* ブランチ未作成の場合のみ新規作成タブを表示 */}
          {!inquiry.branchId && (
            <button
              onClick={() => setTab("new")}
              className="text-[12px] font-semibold border-none cursor-pointer h-full"
              style={tabStyle(tab === "new")}
            >
              新規ブランチを作成
            </button>
          )}
          <button
            onClick={() => setTab("existing")}
            className="text-[12px] font-semibold border-none cursor-pointer h-full"
            style={tabStyle(tab === "existing")}
          >
            既存ブランチに紐付け
          </button>
        </div>

        {/* タブコンテンツ */}
        <div className="px-6 py-5">
          {tab === "new" ? (
            <NewBranchTab
              inquiry={inquiry}
              onClose={onClose}
              onBranchCreated={onBranchCreated}
            />
          ) : (
            <ExistingBranchTab
              inquiry={inquiry}
              branches={branches}
              onClose={onClose}
              onBranchCreated={onBranchCreated}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---- タブ1: 新規ブランチ作成 ----
function NewBranchTab({
  inquiry,
  onClose,
  onBranchCreated,
}: {
  inquiry: Inquiry;
  onClose: () => void;
  onBranchCreated: (branchId: string, branchName: string) => void;
}) {
  const category = inquiry.confirmedCategory ?? inquiry.aiCategory;
  // カテゴリからブランチ種別を初期選択
  const defaultType =
    category === "bug" ? "fix" : category === "feature" ? "feat" : "chore";

  const [branchType, setBranchType] = useState<"fix" | "feat" | "chore">(
    defaultType,
  );
  const [branchSuffix, setBranchSuffix] = useState(toSlug(inquiry.title));
  const [description, setDescription] = useState(inquiry.body.slice(0, 200));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フルブランチ名をプレビュー表示
  const idPrefix = inquiry.id.slice(0, 6);
  const branchName = `${branchType}/#${idPrefix}-${branchSuffix}`;

  const handleSubmit = async () => {
    if (!branchSuffix.trim()) {
      setError("ブランチ名を入力してください");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName,
          branchType,
          repoId: inquiry.repoId, // repoIdをリポジトリ識別子として使用
          description,
          inquiryId: inquiry.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "作成に失敗しました");
        return;
      }
      const data = await res.json();
      onBranchCreated(data.branchId, data.branchName);
      onClose();
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ブランチ種別 */}
      <div>
        <p className="text-[11px] font-semibold text-[#6e6e73] mb-1.5">
          ブランチ種別
        </p>
        <div className="flex gap-2">
          {(["fix", "feat", "chore"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setBranchType(t)}
              className="px-3 h-7 rounded-full text-[11px] font-semibold border-none cursor-pointer"
              style={
                branchType === t
                  ? { background: "#0a84ff", color: "#fff" }
                  : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ブランチ名 */}
      <div>
        <p className="text-[11px] font-semibold text-[#6e6e73] mb-1.5">
          ブランチ名
        </p>
        <input
          value={branchSuffix}
          onChange={(e) => setBranchSuffix(e.target.value)}
          className="w-full h-8 px-3 rounded-lg text-[12px] outline-none"
          style={{ border: ".5px solid rgba(0,0,0,.18)" }}
          placeholder="report-graph-not-displayed"
        />
        {/* プレビュー */}
        <p
          className="text-[11px] font-mono mt-1.5 px-1"
          style={{ color: "#0a84ff" }}
        >
          {branchName}
        </p>
      </div>

      {/* 説明 */}
      <div>
        <p className="text-[11px] font-semibold text-[#6e6e73] mb-1.5">説明</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-[12px] outline-none resize-none"
          style={{ border: ".5px solid rgba(0,0,0,.18)" }}
        />
      </div>

      {error && <p className="text-[11px] text-[#ff3b30]">{error}</p>}

      {/* ボタン */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onClose}
          className="px-4 h-8 rounded-lg text-[12px] font-semibold border-none cursor-pointer"
          style={{ background: "rgba(0,0,0,.06)", color: "#3a3a3c" }}
        >
          キャンセル
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 h-8 rounded-lg text-[12px] font-semibold border-none cursor-pointer disabled:opacity-40"
          style={{ background: "#0a84ff", color: "#fff" }}
        >
          {submitting ? "作成中..." : "ブランチを作成"}
        </button>
      </div>
    </div>
  );
}

// ---- タブ2: 既存ブランチに紐付け ----
function ExistingBranchTab({
  inquiry,
  branches,
  onClose,
  onBranchCreated,
}: {
  inquiry: Inquiry;
  branches: BranchOption[];
  onClose: () => void;
  onBranchCreated: (branchId: string, branchName: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = branches.filter((b) =>
    b.branchName.toLowerCase().includes(search.toLowerCase()),
  );

  const selected = branches.find((b) => b.id === selectedId) ?? null;

  const handleSubmit = async () => {
    if (!selectedId) {
      setError("ブランチを選択してください");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/inquiry/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: selectedId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "紐付けに失敗しました");
        return;
      }
      onBranchCreated(selectedId, selected?.branchName ?? "");
      onClose();
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 検索 */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-8 px-3 rounded-lg text-[12px] outline-none"
        style={{ border: ".5px solid rgba(0,0,0,.18)" }}
        placeholder="ブランチ名で検索..."
      />

      {/* ブランチ一覧 */}
      <div
        className="flex flex-col gap-1.5 overflow-y-auto"
        style={{ maxHeight: 240 }}
      >
        {filtered.length === 0 ? (
          <p className="text-[12px] text-[#a1a1a6]">
            該当するブランチがありません
          </p>
        ) : (
          filtered.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer"
              style={{
                border:
                  selectedId === b.id
                    ? "1.5px solid #0a84ff"
                    : ".5px solid rgba(0,0,0,.10)",
                background:
                  selectedId === b.id ? "rgba(10,132,255,.05)" : "#fff",
              }}
            >
              <p className="text-[12px] font-mono text-[#1d1d1f] m-0">
                {b.branchName}
              </p>
              {b.inquiryCount > 0 && (
                <span className="text-[10px] text-[#ff9500] ml-2 shrink-0">
                  {b.inquiryCount}件紐付け済み
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* 選択中ブランチの注意メッセージ */}
      {selected && selected.inquiryCount > 0 && (
        <p className="text-[11px] text-[#ff9500]">
          このブランチにはすでに {selected.inquiryCount}{" "}
          件の問い合わせが紐付いています。 今回の問い合わせを追加すると{" "}
          {selected.inquiryCount + 1} 件になります。
        </p>
      )}

      {error && <p className="text-[11px] text-[#ff3b30]">{error}</p>}

      {/* ボタン */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onClose}
          className="px-4 h-8 rounded-lg text-[12px] font-semibold border-none cursor-pointer"
          style={{ background: "rgba(0,0,0,.06)", color: "#3a3a3c" }}
        >
          キャンセル
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedId}
          className="px-4 h-8 rounded-lg text-[12px] font-semibold border-none cursor-pointer disabled:opacity-40"
          style={{ background: "#0a84ff", color: "#fff" }}
        >
          {submitting ? "紐付け中..." : "ブランチに紐付け"}
        </button>
      </div>
    </div>
  );
}

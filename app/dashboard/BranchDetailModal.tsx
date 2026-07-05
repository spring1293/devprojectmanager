"use client";

import { useState } from "react";
import type { Feature } from "@/types/feature";

type BranchDetail = {
  id: string;
  branchName: string;
  fullRepoName: string;
  assignee: string;
  features: Feature[];
  lastReview: string;
  completed: boolean; //ブランチ完了
};

export default function BranchDetailModal({
  branch,
  onClose,
  onAssigneeUpdated,
  onCompletedToggled,
}: {
  branch: BranchDetail;
  onClose: () => void;
  onAssigneeUpdated: (branchId: string, newAssignee: string) => void;
  onCompletedToggled: (branchId: string, completed: boolean) => void;
}) {
  const [assignee, setAssignee] = useState(branch.assignee);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [completed, setCompleted] = useState(branch.completed);
  const [toggling, setToggling] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/branch/${branch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? "保存に失敗しました");
        return;
      }
      onAssigneeUpdated(branch.id, assignee);
      setSaved(true);
    } catch {
      setSaveError("ネットワークエラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCompleted = async () => {
    setToggling(true);
    try {
      const newVal = !completed;
      const res = await fetch(`/api/branch/${branch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newVal }),
      });
      if (!res.ok) return;
      setCompleted(newVal);
      onCompletedToggled(branch.id, newVal);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xl mx-4 overflow-hidden"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}
      >
        {/* ヘッダー */}
        <div
          className="px-6 pt-5 pb-4 flex items-start justify-between"
          style={{ borderBottom: ".5px solid rgba(0,0,0,.08)" }}
        >
          <div className="min-w-0">
            <p className="text-[var(--font-xs)] font-mono text-[#0a84ff] m-0 truncate">
              {branch.branchName}
            </p>
            <p className="text-[var(--font-xs)] text-[#a1a1a6] m-0 mt-0.5">
              {branch.fullRepoName}
            </p>
          </div>
          {/* ヘッダー右側:完了トグル+閉じるボタン */}
          <div className="flex items-center gap-2 ml-4 flex-none">
            <button
              onClick={handleToggleCompleted}
              disabled={toggling}
              className="px-3 h-7 rounded-full text-[var(--font-xs)] font-semibold border-none cursor-pointer disabled:opacity-40"
              style={
                completed
                  ? { background: "rgba(52,199,89,.15)", color: "#1a7f37" }
                  : { background: "rgba(0,0,0,.06)", color: "#6e6e73" }
              }
            >
              {completed ? "✓ 完了" : "未完了"}
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center flex-none border-none cursor-pointer hover:opacity-70"
              style={{
                background: "rgba(0,0,0,.07)",
                color: "#6e6e73",
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>
        </div>
        <div
          className="px-6 py-5 flex flex-col gap-5 overflow-y-auto"
          style={{ maxHeight: "70vh" }}
        >
          {/* 担当者 */}
          <div>
            <p className="text-[var(--font-xs)] font-semibold text-[#6e6e73] mb-1.5">
              担当者
            </p>
            <div className="flex gap-2">
              <input
                value={assignee}
                onChange={(e) => {
                  setAssignee(e.target.value);
                  setSaved(false);
                }}
                className="flex-1 h-8 px-3 rounded-lg text-[var(--font-sm)] outline-none"
                style={{ border: ".5px solid rgba(0,0,0,.18)" }}
                placeholder="メールアドレス"
              />
              <button
                onClick={handleSave}
                disabled={saving || assignee === branch.assignee}
                className="px-4 h-8 rounded-lg text-[var(--font-sm)] font-semibold border-none cursor-pointer disabled:opacity-40"
                style={{ background: "#0a84ff", color: "#fff" }}
              >
                {saving ? "保存中..." : saved ? "保存済み ✓" : "保存"}
              </button>
            </div>
            {saveError && (
              <p className="text-[var(--font-xs)] text-[#ff3b30] mt-1">
                {saveError}
              </p>
            )}
          </div>

          {/* 担当機能 */}
          <div>
            <p className="text-[var(--font-xs)] font-semibold text-[#6e6e73] mb-1.5">
              担当機能
            </p>
            <ul className="m-0 pl-4 flex flex-col gap-1">
              {branch.features.map((f) => (
                <li key={f.id} className="text-[var(--font-sm)] text-[#3a3a3c]">
                  {f.title}
                </li>
              ))}
            </ul>
          </div>

          {/* レビュー結果 */}
          <div>
            <p className="text-[var(--font-xs)] font-semibold text-[#6e6e73] mb-1.5">
              最新レビュー結果
            </p>
            {branch.lastReview ? (
              <div
                className="rounded-lg px-3 py-2.5"
                style={{
                  background: "#fafafb",
                  border: ".5px solid rgba(0,0,0,.06)",
                }}
              >
                <p className="text-[var(--font-sm)] text-[#3a3a3c] m-0 whitespace-pre-wrap leading-relaxed">
                  {branch.lastReview}
                </p>
              </div>
            ) : (
              <p className="text-[var(--font-sm)] text-[#a1a1a6] m-0">
                レビュー未実施
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

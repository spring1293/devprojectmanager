"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Inquiry, InquiryCategory, InquiryStatus } from "@/types/inquiry";

const CATEGORY_LABEL: Record<InquiryCategory, string> = {
  question: "質問",
  bug: "バグ",
  feature: "機能要望",
};

const STATUS_LABEL: Record<InquiryStatus, string> = {
  open: "未対応",
  in_progress: "対応中",
  resolved: "解決済み",
};

export default function OpsDetailClient({
  inquiry: initial,
}: {
  inquiry: Inquiry;
}) {
  const router = useRouter();
  const [inquiry, setInquiry] = useState(initial);
  const [resolvedNote, setResolvedNote] = useState(initial.resolvedNote);
  const [saving, setSaving] = useState(false);

  const patch = async (data: Partial<Inquiry>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/inquiry/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      setInquiry((prev) => ({ ...prev, ...data }));
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ヘッダー */}
      <div
        className="px-8 py-5"
        style={{ borderBottom: ".5px solid rgba(0,0,0,.09)" }}
      >
        <button
          onClick={() => router.push("/ops/dashboard")}
          className="text-[13px] text-[#0a6fe0] mb-3 flex items-center gap-1 hover:opacity-70"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          ← 問い合わせ一覧に戻る
        </button>
        <h1
          className="text-[22px] text-[#1d1d1f] m-0"
          style={{ fontWeight: 680, letterSpacing: "-.015em" }}
        >
          {inquiry.title}
        </h1>
        <p className="text-[12.5px] text-[#a1a1a6] mt-1 m-0">
          {inquiry.name || "匿名"} · {inquiry.email} ·{" "}
          {inquiry.createdAt.slice(0, 10)}
        </p>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex gap-6 p-8 max-w-4xl mx-auto w-full">
        {/* 左：問い合わせ内容 */}
        <div className="flex-1 flex flex-col gap-5">
          {/* 本文 */}
          <div
            className="rounded-xl p-5"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
            }}
          >
            <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">
              問い合わせ内容
            </p>
            <p className="text-[13.5px] text-[#1d1d1f] m-0 leading-relaxed whitespace-pre-wrap">
              {inquiry.body}
            </p>
          </div>

          {/* AI回答提案 */}
          <div
            className="rounded-xl p-5"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
            }}
          >
            <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">
              AI 回答提案
            </p>
            <p className="text-[13px] text-[#3a3a3c] m-0 leading-relaxed whitespace-pre-wrap">
              {inquiry.suggestedAnswer || "提案なし"}
            </p>
          </div>

          {/* 対応メモ */}
          <div
            className="rounded-xl p-5"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
            }}
          >
            <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">
              対応メモ
            </p>
            <textarea
              value={resolvedNote}
              onChange={(e) => setResolvedNote(e.target.value)}
              rows={4}
              placeholder="対応内容を記録してください"
              className="w-full px-3 py-2.5 rounded-lg text-[13px] text-[#1d1d1f] leading-relaxed resize-none outline-none"
              style={{ border: ".5px solid rgba(0,0,0,.18)" }}
            />
            <button
              onClick={() => patch({ resolvedNote })}
              disabled={saving}
              className="mt-2 px-4 h-8 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer disabled:opacity-40"
              style={{ background: "rgba(0,0,0,.07)", color: "#3a3a3c" }}
            >
              メモを保存
            </button>
          </div>
        </div>

        {/* 右：分類・アクション */}
        <div className="w-72 flex-none flex flex-col gap-4">
          {/* AI仮分類 */}
          <div
            className="rounded-xl p-5"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
            }}
          >
            <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">
              AI仮分類
            </p>
            <span
              className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
              style={{ background: "#f2f2f4", color: "#6e6e73" }}
            >
              {CATEGORY_LABEL[inquiry.aiCategory]}
            </span>
          </div>

          {/* 分類確定 */}
          <div
            className="rounded-xl p-5"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
            }}
          >
            <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">
              分類を確定
            </p>
            <div className="flex flex-col gap-2">
              {(["question", "bug", "feature"] as InquiryCategory[]).map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => patch({ confirmedCategory: cat })}
                    disabled={saving}
                    className="h-9 rounded-lg text-[13px] font-semibold border-none cursor-pointer disabled:opacity-40"
                    style={
                      inquiry.confirmedCategory === cat
                        ? { background: "#0a84ff", color: "#fff" }
                        : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
                    }
                  >
                    {CATEGORY_LABEL[cat]}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* ステータス更新 */}
          <div
            className="rounded-xl p-5"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
            }}
          >
            <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">
              ステータス
            </p>
            <div className="flex flex-col gap-2">
              {(["open", "in_progress", "resolved"] as InquiryStatus[]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => patch({ status: s })}
                    disabled={saving}
                    className="h-9 rounded-lg text-[13px] font-semibold border-none cursor-pointer disabled:opacity-40"
                    style={
                      inquiry.status === s
                        ? { background: "#0a84ff", color: "#fff" }
                        : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
                    }
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Dev連携 */}
          {inquiry.confirmedCategory === "feature" && (
            <button
              onClick={() => router.push("/analyze")}
              className="w-full h-10 rounded-lg text-[13px] font-semibold border-none cursor-pointer"
              style={{ background: "#30a14e", color: "#fff" }}
            >
              要件定義として起票する →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

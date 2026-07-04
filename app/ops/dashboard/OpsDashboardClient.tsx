"use client";

import { useState } from "react";
import type { Inquiry, InquiryStatus, InquiryCategory } from "@/types/inquiry";
import OpsDetailClient from "@/app/ops/inquiry/[id]/OpsDetailClient";

const STATUS_LABEL: Record<InquiryStatus, string> = {
  open: "未対応",
  in_progress: "対応中",
  resolved: "解決済み",
};

const CATEGORY_LABEL: Record<InquiryCategory, string> = {
  question: "質問",
  bug: "バグ",
  feature: "機能要望",
  unclassified: "未分類",
};

const STATUS_COLOR: Record<InquiryStatus, string> = {
  open: "#ff3b30",
  in_progress: "#ff9500",
  resolved: "#30a14e",
};

export default function OpsDashboardClient({
  inquiries,
}: {
  inquiries: Inquiry[];
}) {
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [filterStatus, setFilterStatus] = useState<InquiryStatus | "all">(
    "all",
  );

  const filtered =
    filterStatus === "all"
      ? inquiries
      : inquiries.filter((i) => i.status === filterStatus);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ヘッダー */}
      <div
        className="px-8 py-5"
        style={{ borderBottom: ".5px solid rgba(0,0,0,.09)" }}
      >
        <h1
          className="text-[var(--font-xl)] text-[#1d1d1f] m-0"
          style={{ fontWeight: 680, letterSpacing: "-.015em" }}
        >
          問い合わせ管理
        </h1>
        <p className="text-[var(--font-base)] text-[#6e6e73] mt-1 m-0">
          {inquiries.length} 件の問い合わせ
        </p>
      </div>

      {/* フィルター */}
      <div
        className="px-8 py-3 flex gap-2"
        style={{ borderBottom: ".5px solid rgba(0,0,0,.06)" }}
      >
        {(["all", "open", "in_progress", "resolved"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className="px-3 h-7 rounded-full text-[var(--font-sm)] font-semibold border-none cursor-pointer"
            style={
              filterStatus === s
                ? { background: "#0a84ff", color: "#fff" }
                : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
            }
          >
            {s === "all" ? "すべて" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* 一覧 */}
      <div className="flex-1 px-8 py-6 flex flex-col gap-3 max-w-3xl w-full mx-auto">
        {filtered.length === 0 ? (
          <p className="text-[var(--font-base)] text-[#a1a1a6]">
            該当する問い合わせはありません
          </p>
        ) : (
          filtered.map((inquiry) => (
            <div
              key={inquiry.id}
              onClick={() => setSelectedInquiry(inquiry)}
              className="rounded-xl p-5 cursor-pointer hover:opacity-80"
              style={{
                boxShadow:
                  "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                {/* ステータスバッジ */}
                <span
                  className="px-2 py-0.5 rounded-md text-[var(--font-xs)] font-semibold"
                  style={{
                    color: STATUS_COLOR[inquiry.status],
                    background: `${STATUS_COLOR[inquiry.status]}1a`,
                  }}
                >
                  {STATUS_LABEL[inquiry.status]}
                </span>
                {/* AIカテゴリバッジ */}
                <span
                  className="px-2 py-0.5 rounded-md text-[var(--font-xs)] font-semibold"
                  style={{ background: "#f2f2f4", color: "#6e6e73" }}
                >
                  {CATEGORY_LABEL[inquiry.aiCategory]}
                </span>
                {/* 確定済みは別表示 */}
                {inquiry.confirmedCategory && (
                  <span
                    className="px-2 py-0.5 rounded-md text-[var(--font-xs)] font-semibold"
                    style={{
                      background: "rgba(10,132,255,.12)",
                      color: "#0a6fe0",
                    }}
                  >
                    確定: {CATEGORY_LABEL[inquiry.confirmedCategory]}
                  </span>
                )}
              </div>
              <p className="text-[14px] font-semibold text-[#1d1d1f] m-0 mb-1">
                {inquiry.title}
              </p>
              <p className="text-[var(--font-sm)] text-[#6e6e73] m-0">
                {inquiry.name || "匿名"} · {inquiry.createdAt.slice(0, 10)}
              </p>
            </div>
          ))
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
            {/* 閉じるボタン */}
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
            />
          </div>
        </div>
      )}
    </div>
  );
}

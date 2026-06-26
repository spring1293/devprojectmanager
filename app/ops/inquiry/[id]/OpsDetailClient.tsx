"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Inquiry,
  InquiryCategory,
  InquiryStatus,
  InquiryPriority,
} from "@/types/inquiry";

const CATEGORY_LABEL: Record<InquiryCategory, string> = {
  question: "質問",
  bug: "バグ",
  feature: "機能要望",
  unclassified: "未分類",
};

const PRIORITY_LABEL: Record<InquiryPriority, string> = {
  critical: "緊急",
  high: "大",
  medium: "中",
  low: "小",
};

const PRIORITY_COLOR: Record<InquiryPriority, string> = {
  critical: "#ff3b30",
  high: "#ff9500",
  medium: "#0a84ff",
  low: "#8a8a8e",
};

const STATUS_LABEL: Record<InquiryStatus, string> = {
  open: "未対応",
  in_progress: "対応中",
  resolved: "解決済み",
};

export default function OpsDetailClient({
  inquiry: initial,
  onClose,
  onUpdate,
}: {
  inquiry: Inquiry;
  onClose?: () => void; //モーダル用。未指定の場合はページ遷移
  onUpdate?: (updated: Inquiry) => void; //最新状態に更新
}) {
  const router = useRouter();
  const [inquiry, setInquiry] = useState(initial);
  const [resolvedNote, setResolvedNote] = useState(initial.resolvedNote);
  const [assignee, setAssignee] = useState(initial.assignee ?? "");
  const [dueDate, setDueDate] = useState<string | null>(
    initial.dueDate ?? null,
  );
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
      //変更前:setInquriy((prev) => ({...prev, ...data}));
      //変更後: updatedを作ってからonUpdateも呼ぶ
      const updated = { ...inquiry, ...data };
      setInquiry(updated);
      onUpdate?.(updated);
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  };

  //AI分類とembedding生成を再度処理する
  //embeddingが利用可能かを管理するstate
  const [embeddingReady, setEmbeddingReady] = useState(
    Array.isArray(initial.embeddingVector) &&
      initial.embeddingVector.length > 0,
  );

  const retryAI = async (action: "classify" | "embed") => {
    setSaving(true);
    try {
      const res = await fetch(`/api/inquiry/${inquiry.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "処理に失敗しました");
      }
      const data = await res.json();
      if (action === "classify") {
        setInquiry((prev) => ({ ...prev, aiCategory: data.aiCategory }));
      }
      if (action === "embed") {
        setEmbeddingReady(true);
      }
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  };

  //類似ケースUI用
  const [similar, setSimilar] = useState<Inquiry[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarFilter, setSimilarFilter] = useState<InquiryStatus | "all">(
    "all",
  );
  const [similarLoaded, setSimilarLoaded] = useState(false);

  const loadSimilar = async () => {
    setLoadingSimilar(true);
    try {
      const res = await fetch(`/api/inquiry/${inquiry.id}`);
      const data = await res.json();
      setSimilar(data.similar ?? []);
      setSimilarLoaded(true);
    } catch {
      alert("類似ケースの取得に失敗しました");
    } finally {
      setLoadingSimilar(false);
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
          onClick={() => (onClose ? onClose() : router.push("/ops/dashboard"))}
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

          {/* 類似ケース */}
          <div
            className="rounded-xl p-5"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0">
                類似ケース
              </p>
              {!similarLoaded && (
                <button
                  onClick={loadSimilar}
                  disabled={loadingSimilar}
                  className="px-3 h-7 rounded-lg text-[12px] font-semibold border-none cursor-pointer disabled:opacity-40"
                  style={{ background: "rgba(0,0,0,.07)", color: "#3a3a3c" }}
                >
                  {loadingSimilar ? "検索中..." : "検索する"}
                </button>
              )}
            </div>

            {similarLoaded && (
              <>
                {/* ステータスフィルター */}
                <div className="flex gap-1.5 mb-3">
                  {(["all", "open", "in_progress", "resolved"] as const).map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => setSimilarFilter(s)}
                        className="px-2.5 h-6 rounded-full text-[11px] font-semibold border-none cursor-pointer"
                        style={
                          similarFilter === s
                            ? { background: "#0a84ff", color: "#fff" }
                            : {
                                background: "rgba(0,0,0,.06)",
                                color: "#3a3a3c",
                              }
                        }
                      >
                        {s === "all"
                          ? "すべて"
                          : STATUS_LABEL[s as InquiryStatus]}
                      </button>
                    ),
                  )}
                </div>

                {/* 結果リスト */}
                {(() => {
                  const filtered =
                    similarFilter === "all"
                      ? similar
                      : similar.filter((s) => s.status === similarFilter);
                  return filtered.length === 0 ? (
                    <p className="text-[13px] text-[#a1a1a6] m-0">該当なし</p>
                  ) : (
                    <ul className="m-0 p-0 list-none flex flex-col gap-2">
                      {filtered.map((s) => (
                        <li
                          key={s.id}
                          className="rounded-lg p-3 cursor-pointer hover:opacity-80"
                          style={{
                            background: "#fafafb",
                            border: ".5px solid rgba(0,0,0,.07)",
                          }}
                          onClick={() =>
                            window.open(`/ops/inquiry/${s.id}`, "_blank")
                          }
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                              style={{
                                background: "#f2f2f4",
                                color: "#6e6e73",
                              }}
                            >
                              {STATUS_LABEL[s.status]}
                            </span>
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                              style={{
                                background: "#f2f2f4",
                                color: "#6e6e73",
                              }}
                            >
                              {CATEGORY_LABEL[s.aiCategory]}
                            </span>
                          </div>
                          <p className="text-[12.5px] font-semibold text-[#1d1d1f] m-0 mb-0.5">
                            {s.title}
                          </p>
                          {s.resolvedNote && (
                            <p className="text-[11.5px] text-[#6e6e73] m-0 line-clamp-2">
                              対応: {s.resolvedNote}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </>
            )}
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
            <div className="flex items-center justify-between">
              <span
                className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                style={{ background: "#f2f2f4", color: "#6e6e73" }}
              >
                {CATEGORY_LABEL[inquiry.aiCategory]}
              </span>
              {inquiry.aiCategory === "unclassified" && (
                <button
                  onClick={() => retryAI("classify")}
                  disabled={saving}
                  className="px-3 h-7 rounded-lg text-[12px] font-semibold border-none cursor-pointer disabled:opacity-40"
                  style={{
                    background: "rgba(10,132,255,.10)",
                    color: "#0a6fe0",
                  }}
                >
                  再判定する
                </button>
              )}
            </div>
          </div>

          {/* Embedding状態 */}
          <div
            className="rounded-xl p-5"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
            }}
          >
            <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">
              類似検索用データ
            </p>
            <div className="flex items-center justify-between">
              <span
                className={`text-[12.5px] font-semibold ${embeddingReady ? "text-[#30a14e]" : "text-[#a1a1a6]"}`}
              >
                {embeddingReady ? "生成済み" : "未生成"}
              </span>
              <button
                onClick={() => retryAI("embed")}
                disabled={saving}
                className="px-3 h-7 rounded-lg text-[12px] font-semibold border-none cursor-pointer disabled:opacity-40"
                style={{
                  background: "rgba(10,132,255,.10)",
                  color: "#0a6fe0",
                }}
              >
                生成する
              </button>
            </div>
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

          {/* 重要度 */}
          <div
            className="rounded-xl p-5"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
            }}
          >
            <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">
              重要度
            </p>
            <div className="flex flex-col gap-2">
              {(["critical", "high", "medium", "low"] as InquiryPriority[]).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => patch({ priority: p })}
                    disabled={saving}
                    className="h-9 rounded-lg text-[13px] font-semibold border-none cursor-pointer disabled:opacity-40"
                    style={
                      (inquiry.priority ?? "medium") === p
                        ? { background: PRIORITY_COLOR[p], color: "#fff" }
                        : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
                    }
                  >
                    {PRIORITY_LABEL[p]}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* 担当者 */}
          <div
            className="rounded-xl p-5"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
            }}
          >
            <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">
              担当者
            </p>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="担当者名を入力"
              className="w-full h-9 px-3 rounded-lg text-[13px] text-[#1d1d1f] outline-none"
              style={{ border: ".5px solid rgba(0,0,0,.18)" }}
            />
            <button
              onClick={() => patch({ assignee })}
              disabled={saving}
              className="mt-2 w-full h-8 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer disabled:opacity-40"
              style={{ background: "rgba(0,0,0,.07)", color: "#3a3a3c" }}
            >
              保存
            </button>
          </div>

          {/* 対応完了予定日 */}
          <div
            className="rounded-xl p-5"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
            }}
          >
            <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">
              対応完了予定日
            </p>
            <input
              type="date"
              value={dueDate ?? ""}
              onChange={(e) => setDueDate(e.target.value || null)}
              className="w-full h-9 px-3 rounded-lg text-[13px] text-[#1d1d1f] outline-none"
              style={{ border: ".5px solid rgba(0,0,0,.18)" }}
            />
            <button
              onClick={() => patch({ dueDate })}
              disabled={saving}
              className="mt-2 w-full h-8 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer disabled:opacity-40"
              style={{ background: "rgba(0,0,0,.07)", color: "#3a3a3c" }}
            >
              保存
            </button>
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

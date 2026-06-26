"use client";

import { useState } from "react";
import type { Inquiry, InquiryPriority, InquiryStatus } from "@/types/inquiry";

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
  open: "未着手",
  in_progress: "作業中",
  resolved: "完了",
};
const PRIORITY_ORDER: Record<InquiryPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

//期日アラートの色を返す
function getDueDateColor(dueDate: string | null): string {
  if (!dueDate) return "#a1a1a6";
  const diff = Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diff <= 3) return "#ff3b30";
  if (diff <= 7) return "#ff9500";
  return "#a1a1a6";
}

//カラム内ソート
function sortCards(
  cards: Inquiry[],
  sortKey: "priority" | "dueDate" | "createdAt",
): Inquiry[] {
  return [...cards].sort((a, b) => {
    const ap = a.priority ?? "medium";
    const bp = b.priority ?? "medium";
    //緊急は常に最上位
    if (ap === "critical" && bp !== "critical") return -1;
    if (bp === "critical" && ap !== "critical") return 1;
    if (sortKey === "priority") {
      return PRIORITY_ORDER[ap] - PRIORITY_ORDER[bp];
    }
    if (sortKey === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

//直近完了(resolvedAtから24時間以内)
function isRecentlyResolved(inquiry: Inquiry): boolean {
  if (inquiry.status !== "resolved") return false;
  if (!inquiry.resolvedAt) return true; //resolvedAtがない古いデータは表示する
  const diff = Date.now() - new Date(inquiry.resolvedAt).getTime();
  return diff < 24 * 60 * 60 * 1000;
}

export default function InquiryKanban({
  inquiries,
  onCardClick,
  onStatusChange,
}: {
  inquiries: Inquiry[];
  onCardClick: (inquiry: Inquiry) => void;
  onStatusChange: (id: string, status: InquiryStatus) => Promise<void>;
}) {
  const [sortKey, setSortKey] = useState<"priority" | "dueDate" | "createdAt">(
    "priority",
  );
  const [showResolved, setShowResolved] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);

  //未確認(confirmedCategory === null)
  const unconfirmed = inquiries.filter((i) => i.confirmedCategory === null);

  //未着手(openかつ確認済み)
  const openCards = sortCards(
    inquiries.filter(
      (i) => i.status === "open" && i.confirmedCategory !== null,
    ),
    sortKey,
  );

  //作業中
  const inProgressCards = sortCards(
    inquiries.filter((i) => i.status === "in_progress"),
    sortKey,
  );

  //直近完了
  const resolvedCards = sortCards(
    inquiries.filter(isRecentlyResolved),
    sortKey,
  );

  //担当者リスト(フィルタ用)
  const assignees = [
    ...new Set(inquiries.map((i) => i.assignee).filter(Boolean)),
  ];
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const filterByAssignee = (cards: Inquiry[]) =>
    assigneeFilter === "all"
      ? cards
      : cards.filter((i) => i.assignee === assigneeFilter);

  const handleStatusChange = async (id: string, status: InquiryStatus) => {
    setChangingId(id);
    await onStatusChange(id, status);
    setChangingId(null);
  };
  return (
    <div className="flex flex-col h-full">
      {/* 未確認バナー */}
      {unconfirmed.length > 0 && (
        <div
          className="flex-none flex items-center gap-2 px-7 py-2 flex-wrap"
          style={{
            borderBottom: ".5px solid rgba(0,0,0,.06)",
            background: "#fffbf0",
          }}
        >
          <span className="text-[11px] font-semibold text-[#ff9500]">
            未確認 {unconfirmed.length}件
          </span>
          {unconfirmed.map((i) => (
            <button
              key={i.id}
              onClick={() => onCardClick(i)}
              className="px-2.5 h-6 rounded-full text-[11px] font-semibold border-none cursor-pointer hover:opacity-80"
              style={{ background: "rgba(255,149,0,.12)", color: "#c97000" }}
            >
              #{i.id.slice(0, 6)} {i.title.slice(0, 20)}
              {i.title.length > 20 ? "…" : ""}
            </button>
          ))}
        </div>
      )}

      {/* カンバンヘッダー */}
      <div
        className="flex-none flex items-center gap-3 px-7 py-2"
        style={{ borderBottom: ".5px solid rgba(0,0,0,.06)" }}
      >
        {/* ソート */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
          className="h-7 px-2 rounded-lg text-[11px] text-[#3a3a3c] outline-none"
          style={{ border: ".5px solid rgba(0,0,0,.18)", background: "#fff" }}
        >
          <option value="priority">重要度順</option>
          <option value="dueDate">期日順</option>
          <option value="createdAt">登録日順</option>
        </select>

        {/* 担当者フィルタ */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="h-7 px-2 rounded-lg text-[11px] text-[#3a3a3c] outline-none"
          style={{ border: ".5px solid rgba(0,0,0,.18)", background: "#fff" }}
        >
          <option value="all">担当者: すべて</option>
          {assignees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        {/* 完了表示トグル */}
        <button
          onClick={() => setShowResolved((v) => !v)}
          className="ml-auto px-3 h-7 rounded-lg text-[11px] font-semibold border-none cursor-pointer"
          style={
            showResolved
              ? { background: "#0a84ff", color: "#fff" }
              : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
          }
        >
          直近完了 {showResolved ? "非表示" : "表示"}
        </button>
      </div>

      {/* カンバン本体 */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 px-7 py-5 h-full min-w-[700px]">
          {/* 未着手 */}
          <KanbanColumn
            title="未着手"
            count={filterByAssignee(openCards).length}
            cards={filterByAssignee(openCards)}
            onCardClick={onCardClick}
            actionLabel="作業開始"
            actionStatus="in_progress"
            onStatusChange={handleStatusChange}
            changingId={changingId}
          />

          {/* 作業中 */}
          <KanbanColumn
            title="作業中"
            count={filterByAssignee(inProgressCards).length}
            cards={filterByAssignee(inProgressCards)}
            onCardClick={onCardClick}
            actionLabel="完了にする"
            actionStatus="resolved"
            onStatusChange={handleStatusChange}
            changingId={changingId}
          />

          {/* 直近完了 */}
          {showResolved && (
            <KanbanColumn
              title="直近完了"
              count={filterByAssignee(resolvedCards).length}
              cards={filterByAssignee(resolvedCards)}
              onCardClick={onCardClick}
              grayout
              changingId={changingId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// カラムコンポーネント
function KanbanColumn({
  title,
  count,
  cards,
  onCardClick,
  actionLabel,
  actionStatus,
  onStatusChange,
  grayout = false,
  changingId,
}: {
  title: string;
  count: number;
  cards: Inquiry[];
  onCardClick: (inquiry: Inquiry) => void;
  actionLabel?: string;
  actionStatus?: InquiryStatus;
  onStatusChange?: (id: string, status: InquiryStatus) => void;
  grayout?: boolean;
  changingId: string | null;
}) {
  return (
    <div className="flex flex-col flex-none w-72">
      {/* カラムヘッダー */}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[13px] font-semibold text-[#1d1d1f] m-0">{title}</p>
        <span
          className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold"
          style={{ background: "rgba(0,0,0,.06)", color: "#6e6e73" }}
        >
          {count}
        </span>
      </div>

      {/* カード一覧 */}
      <div className="flex flex-col gap-3 overflow-y-auto flex-1">
        {cards.map((inquiry) => (
          <KanbanCard
            key={inquiry.id}
            inquiry={inquiry}
            onCardClick={onCardClick}
            actionLabel={actionLabel}
            actionStatus={actionStatus}
            onStatusChange={onStatusChange}
            grayout={grayout}
            isChanging={changingId === inquiry.id}
          />
        ))}
        {cards.length === 0 && (
          <p className="text-[12px] text-[#a1a1a6] px-1">なし</p>
        )}
      </div>
    </div>
  );
}

// カードコンポーネント
function KanbanCard({
  inquiry,
  onCardClick,
  actionLabel,
  actionStatus,
  onStatusChange,
  grayout = false,
  isChanging,
}: {
  inquiry: Inquiry;
  onCardClick: (inquiry: Inquiry) => void;
  actionLabel?: string;
  actionStatus?: InquiryStatus;
  onStatusChange?: (id: string, status: InquiryStatus) => void;
  grayout?: boolean;
  isChanging: boolean;
}) {
  const priority = inquiry.priority ?? "medium";
  const dueDateColor = getDueDateColor(inquiry.dueDate);

  return (
    <div
      className="rounded-xl p-4 cursor-pointer"
      style={{
        boxShadow:
          "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
        opacity: grayout ? 0.45 : 1,
        borderLeft: `3px solid ${priority === "critical" ? "#ff3b30" : "transparent"}`,
      }}
      onClick={() => onCardClick(inquiry)}
    >
      {/* バッジ行 */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
          style={{
            background: `${PRIORITY_COLOR[priority]}1a`,
            color: PRIORITY_COLOR[priority],
          }}
        >
          {PRIORITY_LABEL[priority]}
        </span>
        {inquiry.dueDate && (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold ml-auto"
            style={{ color: dueDateColor }}
          >
            📅 {inquiry.dueDate}
          </span>
        )}
      </div>

      {/* タイトル */}
      <p className="text-[13px] font-semibold text-[#1d1d1f] m-0 mb-1 line-clamp-2">
        {inquiry.title}
      </p>

      {/* ID・担当者 */}
      <p className="text-[11px] text-[#a1a1a6] m-0 mb-3">
        #{inquiry.id.slice(0, 6)}
        {inquiry.assignee ? ` · ${inquiry.assignee}` : ""}
      </p>

      {/* アクションボタン */}
      {actionLabel && actionStatus && onStatusChange && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // カードクリックと競合しないよう伝播を止める
            onStatusChange(inquiry.id, actionStatus);
          }}
          disabled={isChanging}
          className="w-full h-7 rounded-lg text-[11px] font-semibold border-none cursor-pointer disabled:opacity-40"
          style={{ background: "rgba(0,0,0,.06)", color: "#3a3a3c" }}
        >
          {isChanging ? "更新中..." : actionLabel}
        </button>
      )}
    </div>
  );
}

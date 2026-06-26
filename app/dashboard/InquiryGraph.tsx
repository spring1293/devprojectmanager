"use client";

import type { Inquiry, InquiryPriority } from "@/types/inquiry";

const PRIORITY_ORDER: Record<InquiryPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
const BAR_COLOR: Record<InquiryPriority, string> = {
  critical: "#ff3b30",
  high: "#ff9500",
  medium: "#0a84ff",
  low: "#8a8a8e",
};

export default function InquiryGraph({ inquiries }: { inquiries: Inquiry[] }) {
  // 今日から30日間の日付配列
  const dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  // 日付ごとに件数と最高重要度を集計
  const dayData = dates.map((date) => {
    const items = inquiries.filter((i) => i.dueDate === date);
    const maxPriority = items.reduce<InquiryPriority | null>((acc, i) => {
      const p = i.priority ?? "medium";
      if (acc === null || PRIORITY_ORDER[p] < PRIORITY_ORDER[acc]) return p;
      return acc;
    }, null);
    return { date, count: items.length, maxPriority };
  });

  const maxCount = Math.max(...dayData.map((d) => d.count), 1);

  // グラフのサイズ定数
  const CHART_HEIGHT = 160;
  const BAR_WIDTH = 16;
  const BAR_GAP = 14;
  const LEFT_MARGIN = 32;
  const BOTTOM_MARGIN = 28;
  const svgWidth = LEFT_MARGIN + dates.length * (BAR_WIDTH + BAR_GAP);
  const svgHeight = CHART_HEIGHT + BOTTOM_MARGIN;

  return (
    <div className="px-7 py-6">
      <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">
        期日別 件数グラフ
      </h2>
      <p className="text-[12px] text-[#a1a1a6] mb-5">
        今日から30日間の対応完了予定日ごとの件数
      </p>

      {/* 凡例 */}
      <div className="flex gap-4 mb-4">
        {(["critical", "high", "medium", "low"] as InquiryPriority[]).map(
          (p) => (
            <div key={p} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ background: BAR_COLOR[p] }}
              />
              <span className="text-[11px] text-[#6e6e73]">
                {p === "critical"
                  ? "緊急"
                  : p === "high"
                    ? "大"
                    : p === "medium"
                      ? "中"
                      : "小"}
              </span>
            </div>
          ),
        )}
      </div>

      {/* SVGグラフ */}
      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} style={{ display: "block" }}>
          {/* Y軸ラベル（0・最大値・中間） */}
          {[0, Math.ceil(maxCount / 2), maxCount].map((v) => {
            const y = CHART_HEIGHT - (v / maxCount) * CHART_HEIGHT;
            return (
              <g key={v}>
                <text
                  x={LEFT_MARGIN - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="#a1a1a6"
                >
                  {v}
                </text>
                <line
                  x1={LEFT_MARGIN}
                  y1={y}
                  x2={svgWidth}
                  y2={y}
                  stroke="rgba(0,0,0,.06)"
                  strokeWidth={1}
                />
              </g>
            );
          })}

          {/* バーとX軸ラベル */}
          {dayData.map((d, i) => {
            const x = LEFT_MARGIN + i * (BAR_WIDTH + BAR_GAP);
            const barHeight = (d.count / maxCount) * CHART_HEIGHT;
            const color = d.maxPriority ? BAR_COLOR[d.maxPriority] : "#e0e0e0";
            const label = d.date.slice(5).replace("-", "/"); // "MM/DD"
            const showLabel = i % 5 === 0; // 5日おきにラベル表示

            return (
              <g key={d.date}>
                {d.count > 0 && (
                  <rect
                    x={x}
                    y={CHART_HEIGHT - barHeight}
                    width={BAR_WIDTH}
                    height={barHeight}
                    fill={color}
                    rx={3}
                  />
                )}
                {d.count > 0 && (
                  <text
                    x={x + BAR_WIDTH / 2}
                    y={CHART_HEIGHT - barHeight - 4}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#6e6e73"
                  >
                    {d.count}
                  </text>
                )}
                {showLabel && (
                  <text
                    x={x + BAR_WIDTH / 2}
                    y={svgHeight - 6}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#a1a1a6"
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}

          {/* X軸ベースライン */}
          <line
            x1={LEFT_MARGIN}
            y1={CHART_HEIGHT}
            x2={svgWidth}
            y2={CHART_HEIGHT}
            stroke="rgba(0,0,0,.12)"
            strokeWidth={1}
          />
        </svg>
      </div>

      {/* 期日なし件数 */}
      {(() => {
        const noDueDate = inquiries.filter(
          (i) => !i.dueDate && i.status !== "resolved",
        ).length;
        return noDueDate > 0 ? (
          <p className="text-[12px] text-[#a1a1a6] mt-4">
            ※ 期日未設定の未完了問い合わせが {noDueDate} 件あります
          </p>
        ) : null;
      })()}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Repository } from "@/types/repository";
import { useRouter } from "next/navigation";
import type { TechStack } from "@/lib/templates";

//APIから帰ってくるデータの型
type AnalyzeResult = {
  analysis: {
    isNew: boolean;
    reason: string;
    systemName: string | null;
  };
  condidates: Repository[];
  techStack: TechStack;
};

export default function AnalyzePage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const router = useRouter();

  //.mdファイルをドロップしてテキストを読み込む
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.endsWith(".md")) {
      alert(".mdファイルのみ対応しています");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setText((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "サーバーエラーが発生しました");
      }
      const data = await res.json();
      localStorage.setItem("requirementsText", text);
      localStorage.setItem("techStack", data.techStack);
      setResult(data);
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
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
          onClick={() => router.push("/dashboard")}
          className="text-[13px] text-[#0a6fe0] mb-3 flex items-center gap-1 hover:opacity-70"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          ←ダッシュボードに戻る
        </button>
        <h1
          className="text-[22px] text-[#1d1d1f] m-0"
          style={{ fontWeight: 680, letterSpacing: "-.015em" }}
        >
          要件定義書 解析
        </h1>
        <p className="text-[13px] text-[#6e6e73] mt-1 m-0">
          システム要件を入力するか、「要件定義書.md」ファイルをドロップしてください。
        </p>
      </div>
      {/* メインコンテンツ */}
      <div
        className={`flex-1 flex gap-5 p-8 ${result ? "" : "flex-col max-w-3xl mx-auto w-full"}`}
      >
        {/* 入力エリア */}
        <div className="flex-1 flex flex-col">
          <div
            className="relative flex-1 flex flex-col"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <textarea
              className="w-full flex-1 p-4 text-[13.5px] text-[#1d1d1f] leading-relaxed resize-none rounded-xl outline-none"
              style={{
                minHeight: result ? "calc(100vh - 220px)" : 320,
                border: isDragging
                  ? "2px dashed #0a84ff"
                  : ".5px solid rgba(0,0,0,.12)",
                background: isDragging ? "rgba(10,132,255,.04)" : "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,.06)",
              }}
              placeholder={"システム要件を入力。\nまたは.mdファイルをドロップ"}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {/* ドラッグ中のオーバーレイ */}
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none">
                <p className="text-[15px] font-semibold text-[#0a84ff]">
                  ここにドロップ
                </p>
              </div>
            )}
          </div>

          {/* ファイル名+解析ボタン */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-[12.5px] text-[#a1a1a5]">
              {fileName ? `📄 ${fileName}` : ""}
            </span>
            <button
              onClick={handleSubmit}
              disabled={loading || !text.trim()}
              className="px-6 h-9 rounded-lg text-[13px] font-semibold border-none cursor-pointer disabled:opacity-40"
              style={{ background: "#0a84ff", color: "#fff" }}
            >
              {loading ? "解析中..." : "解析する"}
            </button>
          </div>
        </div>

        {/* 結果パネル(解析後に表示) */}
        {result && (
          <div className="w-80 flex-none flex flex-col gap-4">
            {/* 判定結果カード */}
            <div
              className="rounded-xl p-5"
              style={{
                boxShadow:
                  "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
              }}
            >
              <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">
                判定結果
              </p>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                  style={
                    result.analysis.isNew
                      ? { color: "#30a14e", background: "rgba(48,179,80,.14)" }
                      : { color: "#0a5fe0", background: "rgba(10,132,255,.12)" }
                  }
                >
                  {result.analysis.isNew ? "新規開発" : "改造"}
                </span>
                <span
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono"
                  style={{ background: "#f2f2f4", color: "#6e6e73" }}
                >
                  {result.techStack}
                </span>
              </div>
              <p className="text-[13px] text-[#6e6e73] m-0 leading-relaxed">
                {result.analysis.reason}
              </p>
              {result.analysis.systemName && (
                <p className="text-[12.5px] text-[#3a3a3c] mt-2 m-0">
                  対象: {result.analysis.systemName}
                </p>
              )}
            </div>

            {/* 類似リポジトリカード */}
            <div
              className="rounded-xl p-5"
              style={{
                boxShadow:
                  "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)",
              }}
            >
              <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">
                類似リポジトリ候補
              </p>
              {(result.condidates?.length ?? 0) === 0 ? (
                <p className="text-[13px] text-[#a1a1a6] m-0">候補なし</p>
              ) : (
                <ul className="m-0 p-0 list-none flex flex-col gap-1">
                  {result.condidates.map((repo) => (
                    <li
                      key={repo.id}
                      className="text-[13px] text-[#3a3a3c] py-1"
                      style={{ borderBottom: ".5px solid rgba(0,0,0,.05)" }}
                    >
                      {repo.repoName}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 次のステップへ */}
            <button
              className="w-full h-10 rounded-lg text-[13px] font-semibold border-none cursor-pointer"
              style={{ background: "#0a84ff", color: "#fff" }}
              onClick={() => router.push("/features")}
            >
              機能要件を抽出する →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

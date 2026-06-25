"use client";

import { useState } from "react";
import type { Repository } from "@/types/repository";

export default function InquiryClient({
  repositories,
}: {
  repositories: Repository[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [repoId, setRepoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!email || !title || !body || !repoId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, title, body, repoId }),
      });
      if (!res.ok) {
        //JSONでない可能性があるのでtext()で受け取る
        const text = await res.text();
        try {
          const err = JSON.parse(text);
          throw new Error(err.error ?? "送信に失敗しました");
        } catch {
          throw new Error(text || "送信に失敗しました");
        }
      }
      setDone(true);
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
    }
  };

  //送信完了画面
  if (done) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[22px] font-semibold text-[#1d1d1f] mb-2">
            送信完了
          </p>
          <p className="text-[13px] text-[#6e6e73] mb-6">
            お問い合わせを受け付けました。
          </p>
          <button
            onClick={() => {
              setDone(false);
              setName("");
              setEmail("");
              setTitle("");
              setBody("");
              setRepoId("");
            }}
            className="text-[13px] text-[#0a6fe0] hover:opacity-70"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            お問い合わせに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ヘッダー */}
      <div
        className="px-8 py-5"
        style={{ borderBottom: ".5px solid rgba(0,0,0,.09)" }}
      >
        <h1
          className="text-[22px] text-[#1d1d1f] m-0"
          style={{ fontWeight: 600, letterSpacing: "-.015em" }}
        >
          お問い合わせ
        </h1>
        <p className="text-[13px] text-[#6e6e73] mt-1 m-0">
          内容を入力して送信してください。AIが内容を確認し、担当者が対応します。
        </p>
      </div>

      {/* フォーム */}
      <div className="flex-1 max-w-xl mx-auto w-full px-8 py-8 flex flex-col gap-5">
        {/* プロジェクト選択 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-[#3a3a3c]">
            プロジェクト<span className="text-red-500">*</span>
          </label>
          <select
            value={repoId}
            onChange={(e) => setRepoId(e.target.value)}
            className="h-9 px-3 rounded-lg text-[13px] text-[#1d1d1f] outline-none"
            style={{ border: ".5px solid rgba(0,0,0,.18)", background: "#fff" }}
          >
            <option value="">選択してください</option>
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.projectName}
              </option>
            ))}
          </select>
        </div>

        {/* お名前 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-[#3a3a3c]">
            お名前
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="山田 太郎"
            className="h-9 px-3 rounded-lg text-[13px] text-[#1d1d1f] outline-none"
            style={{ border: ".5px solid rgba(0,0,0,.18)" }}
          />
        </div>

        {/* メールアドレス */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-[#3a3a3c]">
            メールアドレス<span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className="h-9 px-3 rounded-lg text-[13px] text-[#1d1d1f] outline-none"
            style={{ border: ".5px solid rgba(0,0,0,.18)" }}
          />
        </div>

        {/* タイトル */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-[#3a3a3c]">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="問い合わせの件名を入力"
            className="h-9 px-3 rounded-lg text-[13px] text-[#1d1d1f] outline-none"
            style={{ border: ".5px solid rgba(0,0,0,.18)" }}
          />
        </div>

        {/* 内容 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-[#3a3a3c]">
            内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="詳細を入力してください"
            rows={6}
            className="px-3 py-2.5 rounded-lg text-[13px] text-[#1d1d1f] leading-relaxed resize-none outline-none"
            style={{ border: ".5px solid rgba(0,0,0,.18)" }}
          />
        </div>

        {/* 送信ボタン */}
        <button
          onClick={handleSubmit}
          disabled={loading || !email || !title || !body || !repoId}
          className="h-10 rounded-lg text-[13px] font-semibold border-none cursor-pointer disabled:opacity-40"
          style={{ background: "#0a84ff", color: "#fff" }}
        >
          {loading ? "送信中..." : "送信する"}
        </button>
      </div>
    </div>
  );
}

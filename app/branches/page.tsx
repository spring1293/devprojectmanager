"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TECH_STACK_OPTIONS } from "@/lib/templates";
import type { Branch } from "@/types/branch";
import type { Feature } from "@/types/feature";
import type { TechStack } from "@/lib/templates";

//Branch:ブランチ一件分の型
//Feature:機能要件一件分の型

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [repoName, setRepoName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [techStack, setTechStack] = useState<TechStack>("unknown");
  const router = useRouter();

  //処理開始。loading中orエラー発生を確認
  useEffect(() => {
    const loadBranches = async () => {
      //localStorageから確定済み機能要件を取得
      const stored = localStorage.getItem("confirmedFeatures");
      if (!stored) {
        setLoading(false);
        return;
      }
      const confirmedFeatures: Feature[] = JSON.parse(stored);
      setFeatures(confirmedFeatures);
      //localStoregeから技術スタックを取得する(analyzeページで保存)
      const storedTechStack = localStorage.getItem(
        "techStack",
      ) as TechStack | null;
      if (storedTechStack && TECH_STACK_OPTIONS.includes(storedTechStack)) {
        setTechStack(storedTechStack);
      }

      try {
        const res = await fetch("/api/design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ features: confirmedFeatures }),
        });
        const data = await res.json();
        setBranches(data.branches ?? []);
      } catch (e) {
        setError("ブランチ設計の生成に失敗しました。再試行してください。");
      } finally {
        setLoading(false);
      }
    };
    loadBranches();
  }, []);
  //locading中であれば状態を表示
  if (loading) {
    return (
      <main className="max-w-2xl mx-auto py-16 px-4 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p>ブランチ設計を生成中...</p>
      </main>
    );
  }
  //エラーが出ていればエラー表示+再試行ボタン
  if (error) {
    return (
      <main className="max-w-2xl mx-auto py-16 px-4">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          onClick={() => {
            setError(null);
            setLoading(true);
          }}
        >
          再試行する
        </button>
      </main>
    );
  }

  //loadingもerrorもなければ、確認画面を表示する。
  return (
    <main className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-8">ブランチ設計・担当者アサイン</h1>
      <p className="text-sm text-gray-500 mb-4">
        AIが生成した叩き台です。担当者メールを入力して確定してください。
      </p>

      {/* ブランチ一覧 */}
      <ul className="space-y-4 mb-8">
        {branches.map((branch, index) => (
          <li key={branch.id} className="border rounded p-4 space-y-2">
            {/* ブランチ名 */}
            <p className="font-semibold">{branch.branchName}</p>
            {/* 担当機能ID一覧 */}
            <p className="text-sm text-gray-500">
              担当機能:{branch.featureIds.join(", ")}
            </p>
            {/* 担当者メール入力欄 */}
            <input
              type="email"
              placeholder="担当者のメールアドレス"
              className="w-full border rounded px-2 py-1 text-sm"
              value={branch.assignee}
              onChange={(e) => {
                const updated = [...branches];
                updated[index] = { ...branch, assignee: e.target.value };
                setBranches(updated);
              }}
            />
          </li>
        ))}
      </ul>

      {/* リポジトリ名入力 */}
      <input
        type="text"
        placeholder="作成するリポジトリ名(例:my-project)"
        className="w-full border rounded px-3 py-2 mb-4"
        value={repoName}
        onChange={(e) => setRepoName(e.target.value)}
      />

      {/* 技術スタック選択 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          技術スタック
        </label>
        <select
          className="w-full border rounded px-3 py-2"
          value={techStack}
          onChange={(e) => setTechStack(e.target.value as TechStack)}
        >
          {TECH_STACK_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* 確定ボタン */}
      <button
        className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        disabled={submitting || !repoName || branches.length === 0}
        onClick={async () => {
          setSubmitting(true);
          try {
            const res = await fetch("/api/create-repo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ repoName, branches, features, techStack }),
            });
            const data = await res.json();
            //作成したリポジトリ名をlocalStorageに保存して次フェーズへ
            localStorage.setItem("fullRepoName", data.fullRepoName);
            router.push("/dashboard");
          } catch (e) {
            setError("リポジトリの作成に失敗しました。");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {submitting ? "作成中..." : "確定してリポジトリを作成する"}
      </button>
    </main>
  );
}

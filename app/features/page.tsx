"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Feature } from "@/types/feature";

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadFeatures = async () => {
      //localStorageから要件定義書テキストを取得してAPIを呼ぶ
      const text = localStorage.getItem("requirementsText");
      if (!text) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        setFeatures(data.features ?? []);
      } catch (e) {
        setError("機能要件の抽出に失敗しました。再試行してください。");
      } finally {
        setLoading(false);
      }
    };
    loadFeatures();
  }, []);

  if (loading)
    return (
      <main className="max-w-2xl mx-auto py-16 px-4 fles flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="p-8">機能要件を抽出中...</p>
      </main>
    );
  //エラー発生時の表示
  if (error)
    return (
      <main className="max-w-2xl mx-auto py-16 px-4">
        <p className="text-read-500 mb-4">
          <button
            className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            onClick={() => {
              setError(null);
              setLoading(true);
            }}
          >
            再試行する
          </button>
        </p>
      </main>
    );

  return (
    <main className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-8">機能要件表</h1>
      <p className="text-sm text-gray-500 mb-4">
        AIが生成した叩き台です。内容を確認・編集してください。
      </p>

      {/*機能要件リスト*/}
      <ul className="space-y-4">
        {features.map((feature, index) => (
          <li key={feature.id} className="border rounded p-4">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 space-y-2">
                {/*機能名*/}
                <input
                  className="w-full font-semibold border-b outline-none"
                  value={feature.title}
                  onChange={(e) => {
                    const updated = [...features];
                    updated[index] = { ...feature, title: e.target.value };
                    setFeatures(updated);
                  }}
                />
                {/*詳細説明*/}
                <textarea
                  className="w-full text-sm text-gray-600 border rounded p-1 outline-none"
                  value={feature.description}
                  onChange={(e) => {
                    const updated = [...features];
                    updated[index] = {
                      ...feature,
                      description: e.target.value,
                    };
                    setFeatures(updated);
                  }}
                />
                {/*優先度*/}
                <select
                  className="text-sm border rounded px-2 py-1"
                  value={feature.priority}
                  onChange={(e) => {
                    const updated = [...features];
                    updated[index] = {
                      ...feature,
                      priority: e.target.value as Feature["priority"],
                    };
                    setFeatures(updated);
                  }}
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
              {/*削除ボタン*/}
              <button
                className="text-red-500 text-sm hover:underline"
                onClick={() =>
                  setFeatures(features.filter((_, i) => i !== index))
                }
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/*　機能追加ボタン */}
      <button
        className="mt-4 px-4 py-2 border border-dashed rounded text-gray-500 hover:text-black w-full"
        onClick={() =>
          setFeatures([
            ...features,
            {
              id: String(Date.now()),
              title: "",
              description: "",
              priority: "medium",
            },
          ])
        }
      >
        +機能を追加する
      </button>
      {/*　確定ボタン。要件を保存して次のフェーズへ進む */}
      <button
        className="mt-8 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        disabled={features.length === 0}
        onClick={() => {
          //確定した機能要件をlocalStorageに保存してPhase4へ
          localStorage.setItem("confirmedFeatures", JSON.stringify(features));
          router.push("/branches");
        }}
      >
        確定する
      </button>
    </main>
  );
}

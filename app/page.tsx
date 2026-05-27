"use client";

import { useState } from "react";
import { Repository } from "@/types/repository";
import { useRouter } from "next/navigation";

//APIから帰ってくるデータの型
type AnalyzeResult = {
  analysis: {
    isNew: boolean;
    reason: string;
    systemName: string | null;
  };
  condidates: Repository[];
};

export default function Home() {
  //入力テキスト・ローディング状態を管理
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      //レスポンスが正常でない場合はエラーを投げる
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "サーバーエラーが発生しました");
      }

      const data = await res.json();
      //機能要件抽出ページで使うためのテキストを保存
      localStorage.setItem("requirementsText", text);
      setResult(data);
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-8">要件定義書 解析</h1>

      <textarea
        className="w-full h-64 border rounded p-3 text-sm"
        placeholder="要件定義書のテキストを貼り付けてください"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded haver:bg-blue-700 disabled:opcity-50"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "解析中..." : "解析する"}
      </button>

      {/*結果表示エリア*/}
      {result && (
        <div className="mt-8 p-4 border rounded">
          <p className="font-smibold">
            判定結果:{result.analysis.isNew ? "新規開発" : "改造"}
          </p>
          <p className="text-sm text-gray-600 mt-2">{result.analysis.reason}</p>
          {result.analysis.systemName && (
            <p className="text-sm mt-1">
              対象システム:{result.analysis.systemName}
            </p>
          )}
          <div className="mt-4">
            <p className="font-semibold">類似リポジトリ候補:</p>
            {(result.condidates?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-500 mt-1">候補なし</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {result.condidates.map((repo) => (
                  <li key={repo.id} className="text-sm border-l-2 pl-3">
                    {repo.repoName}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            onClick={() => router.push("/features")}
          >
            機能要件を抽出する→
          </button>
        </div>
      )}
    </main>
  );
}

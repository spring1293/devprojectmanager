import { GoogleGenAI } from "@google/genai";
import { Feature } from "@/types/feature";
import { Branch } from "@/types/branch";

//APIキーでGeminiクライアントを初期化
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

//新規/改造を判定する
export async function analyzeRequirements(text: string): Promise<{
  isNew: boolean;
  reason: string;
  systemName: string | null;
}> {
  const prompt = `以下の要件定義書を読んで、これが新規開発課、既存システムの改造かを判断してください。
  要件定義書:
  ${text}
  以下のJSON形式でのみ回答してください。他の文字は含まないでください:{
    "isNew": trueまたはfalse,
    "reason": "判定理由を1〜2分で",
    "systemName": "改造の場合はシステム名、新規またはシステム名不明の場合はnull"
  }
  `;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const response = result.text ?? "";
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Geminiの応答からJSONを取得できませんでした");

  return JSON.parse(jsonMatch[0]);
}

//テキストをベクトル変換する
export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: text,
  });

  return result.embeddings?.[0]?.values ?? [];
}

//要件定義書から機能要件の叩き台を抽出する。
export async function extractFeatures(text: string): Promise<Feature[]> {
  const prompt = `
    以下の要件定義書を読んで、機能要件のリストを抽出してください。

    要件定義書:
    ${text}

    以下のJSON形式のみで回答してください。他の文字は含めないでください:
    [
      {
        "id": "1",
        "title": "機能名",
        "description": "機能の詳細説明",
        "priority": "high または medium または low"
      }

    ]
  `;
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const response = result.text ?? "";

  //レスポンスから配列のJSON部分を抽出してパース
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Geminiの応答からJSONを取得できませんでした");

  return JSON.parse(jsonMatch[0]);
}

//機能要件からブランチ設計を提案する
export async function designBranches(features: Feature[]): Promise<Branch[]> {
  const featureList = features
    .map((f) => `- ID:${f.id} [${f.priority}] ${f.title}: ${f.description}`)
    .join("\n");

  const prompt = `
    以下の機能要件リストを元に、Gitブランチの設計を提案してください。
    関連する機能はひとつのブランチにまとめ、独立性の高い機能は別ブランチにしてください。

    機能要件:
    ${featureList}

    以下のJSON配列形式でのみ回答してください。他の文字は含めないでください:
    [
      {
        "id": "1",
        "branchName": "feature/ブランチ名",
        "featureIds": ["機能ID", "機能ID"],
        "assignee": ""
      }
    ]
  `;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const response = result.text ?? "";

  //レスポンスから配列のJSON部分を抽出してパース
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Geminiの応答からJSONを取得できませんでした");

  return JSON.parse(jsonMatch[0]);
}

//diffと機能要件を照合してコードレビューを行う。
export async function reviewCode(
  diff: string,
  features: Feature[],
): Promise<string> {
  const featureList = features
    .map((f) => `- [${f.priority}] ${f.title}: ${f.description}`)
    .join("\n");

  const prompt = `
    あなたはコードレビュアーです。以下の機能要件と実装差分(diff)を照合し、レビューコメントを日本語で記述してください。

    【機能要件】
    ${featureList}

    【実装差分(diff)】
    ${diff}

    以下の観点でレビューしてください：
    - 機能要件を満たしているか
    - 明らかなバグや問題点がないか
    - 改善提案があれば記載する

    レビュー結果のみを記述してください。
  `;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.text ?? "レビュー結果を取得できませんでした";
}

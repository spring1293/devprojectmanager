import { GoogleGenAI } from "@google/genai";
import { Feature } from "@/types/feature";
import { Branch } from "@/types/branch";
import type { TechStack } from "@/lib/templates";
import { TECH_STACK_OPTIONS } from "@/lib/templates";
import type { InquiryCategory } from "@/types/inquiry";

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

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

  const result = await getAI().models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const response = result.text ?? "";
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Geminiの応答からJSONを取得できませんでした");

  return JSON.parse(jsonMatch[0]);
}

//テキストをベクトル変換する(直接呼び出しVer)
export async function generateEmbeddingOld(text: string): Promise<number[]> {
  const result = await getAI().models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: { outputDimesionality: 768 },
  });

  return result.embeddings?.[0]?.values ?? [];
}

//テキストをベクトル変換する(REST APIで次元数を明示指定)
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] },
      outputDimensionality: 768,
      taskType: "SEMANTIC_SIMILARITY", //ベクトルの意味的類似度最適化
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`embedding APIエラー:${err}`);
  }
  const data = await res.json();
  return data.embedding?.values ?? [];
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
  const result = await getAI().models.generateContent({
    model: "gemini-2.0-flash",
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

  const result = await getAI().models.generateContent({
    model: "gemini-2.0-flash",
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

  const result = await getAI().models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.text ?? "レビュー結果を取得できませんでした";
}

export async function detectTechStack(text: string): Promise<TechStack> {
  //TECH_STACK_OPTIONSからプロンプトの選択肢を動的に生成する
  const options = TECH_STACK_OPTIONS.join("\n");

  const prompt = `
    以下の要件定義書を読んで、使用する技術スタックを判定してください。

    要件定義書:
    ${text}

    以下のいずれか一つのみで回答してください。他の文字は含めないでください:
    ${options}
  `;

  const result = await getAI().models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const response = (result.text ?? "").trim().toLowerCase() as TechStack;

  //TECH_STACK_OPTIONSに含まれない値が返ってきた場合はunknownにフォールバック
  return TECH_STACK_OPTIONS.includes(response) ? response : "unknown";
}

//問い合わせ内容をquestion/bug/featureに分類する
export async function classifyInquiry(
  title: string,
  body: string,
): Promise<InquiryCategory> {
  const prompt = `
    以下の問い合わせ内容を読んで、カテゴリを判定してください。

    タイトル: ${title}
    内容: ${body}

    以下のいずれか一つのみで回答してください。他の文字は含めないでください:
    question
    bug
    feature

    判定基準:
    - question: 使い方や仕様に関する質問、説明で解決できるもの
    - bug: システムの不具合・エラー・期待と異なる動作の報告
    - feature: 新機能の追加要望・改善提案
  `;

  const result = await getAI().models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const response = (result.text ?? "").trim().toLowerCase() as InquiryCategory;
  const valid: InquiryCategory[] = ["question", "bug", "feature"];

  //想定外の値が返ってきた場合はquestionにフォールバッグ
  return valid.includes(response) ? response : "question";
}

//問い合わせ内容から回答提案を行う
export async function createSuggestedAnswer(
  repoContext: string,
  title: string,
  body: string,
): Promise<string> {
  const prompt = `
    あなたはシステムサポート担当者です。
    以下のリポジトリ情報と、リポジトリに対する問い合わせ内容を確認し、回答提案を行なってください。

    リポジトリ情報: ${repoContext}
    タイトル: ${title}
    問い合わせ内容: ${body}
  `;

  const result = await getAI().models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.text ?? "提案失敗";
}

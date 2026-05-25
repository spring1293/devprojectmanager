import { GoogleGenAI } from "@google/genai";

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

/*
//テキスト生成用モデル(exportすることで他のファイルからも参照できるようにしている)
export const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

//Embedding用モデル(exportすることで他のファイルからも参照できるようにしている)
export const embeddingModel = genAI.getGenerativeModel({
  model: "embedding-001",
});

//要件定義書のテキストを受け取り、新規開発か改造かを判断する。
export async function analyzeRequirements(text: string): Promise<{
  isNew: boolean;
  reason: string;
  systemName: string | null;
}> {
  const prompt = `
        以下の要件定義書を読んで、これが新規開発か既存システムの改造かを判断してください。
        要件定義書:
        ${text}
        以下のJSON形式でのみ回答してください。他の文字は含めないでください:
        {
            "isNew":trueまたはfalse,
            "reason": "判定理由を1〜2文で",
            "systemName": "改造の場合はシステム名、新規またはシステム名不明の場合はnull"
        }
    `;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  //レスポンスからJSON部分を抽出してパース
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch)
    throw new Error("Geminiの応答からJSONを取得できませんでした。");

  return JSON.parse(jsonMatch[0]);
}

//テキストをベクトルに変換する(類似度検索用)
export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}
*/

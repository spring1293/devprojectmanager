import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Repository } from "@/types/repository";

//Firebase Adminの初期化(すでに初期化済みの婆はスキップ)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.replace(
        /\\n/g,
        "\n",
      ),
    }),
  });
}

//Firestoreクライアントをエクスポート
export const db = getFirestore();

//repositoriesコレクションの全データを取得する
export async function getRepositories(): Promise<Repository[]> {
  const snapshot = await db.collection("repositories").get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Repository[];
}

//リポジトリデータをFirestoreに保存する
export async function saveRepository(
  data: Omit<Repository, "id">,
): Promise<string> {
  const docRef = await db.collection("repositories").add(data);
  return docRef.id;
}

//ベクトルで類似リポジトリを検索する(新規案件の類似プロジェクト検索用)
export async function searchSimilarRepositories(
  queryVector: number[],
  limit: number = 5,
): Promise<Repository[]> {
  const vectorQuery = db.collection("repositories").findNearest({
    vectorField: "embeddingVector",
    queryVector: FieldValue.vector(queryVector),
    limit,
    distanceMeasure: "COSINE",
  });
  const snapshot = await vectorQuery.get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Repository[];
}

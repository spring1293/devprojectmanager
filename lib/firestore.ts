import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Repository } from "@/types/repository";
import type { Branch } from "@/types/branch";
import type { Feature } from "@/types/feature";

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

//ブランチ情報をFirestoreに保存する(Phase4確定時に呼ぶ)
//docRef:Firestoreが自動発行したドキュメントへの参照オブジェクト。IDやPathを含んでいる。
export async function saveBranch(
  branch: Branch,
  fullRepoName: string,
  features: Feature[],
): Promise<string> {
  const docRef = await db.collection("branches").add({
    branchName: branch.branchName,
    fullRepoName,
    assignee: branch.assignee,
    featureIds: branch.featureIds,
    features, //機能要件の全データを一緒に保存
    lastReview: "", //最新レビュー結果(最初は空)
  });
  return docRef.id;
}

//ブランチ名でFirestoreからブランチ情報を取得する(Webhook受信時に使用)
export async function getBranchByName(
  branchName: string,
): Promise<
  | (Branch & { fullRepoName: string; features: Feature[]; lastReview: string })
  | null
> {
  const snapshot = await db
    .collection("branches")
    .where("branchName", "==", branchName)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Branch & {
    fullRepoName: string;
    features: Feature[];
    lastReview: string;
  };
}

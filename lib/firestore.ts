import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Repository } from "@/types/repository";
import type { Branch } from "@/types/branch";
import type { Feature } from "@/types/feature";
import type { Inquiry } from "@/types/inquiry";

//Firebase Adminの初期化、Firestoreクライアントをエクスポート(関数化した)
function getDB() {
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
  return getFirestore();
}

//共通のヘルパー関数を追加
function toPlainInquiry(doc: FirebaseFirestore.DocumentSnapshot): Inquiry {
  const data = doc.data()!;
  const ev = data.embeddingVector;
  return {
    id: doc.id,
    ...data,
    embeddingVector:
      ev && typeof ev === "object" && typeof ev.toArray === "function"
        ? ev.toArray()
        : (ev ?? []),
  } as Inquiry;
}

//repositoriesコレクションの全データを取得する
export async function getRepositories(): Promise<Repository[]> {
  const snapshot = await getDB().collection("repositories").get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Repository[];
}

//リポジトリデータをFirestoreに保存する
export async function saveRepository(
  data: Omit<Repository, "id">,
): Promise<string> {
  const docRef = await getDB().collection("repositories").add(data);
  return docRef.id;
}

//ベクトルで類似リポジトリを検索する(新規案件の類似プロジェクト検索用)
export async function searchSimilarRepositories(
  queryVector: number[],
  limit: number = 5,
): Promise<Repository[]> {
  const vectorQuery = getDB()
    .collection("repositories")
    .findNearest({
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
  const docRef = await getDB().collection("branches").add({
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
  const snapshot = await getDB()
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

//全てのブランチ情報を取得する(ダッシュボード用)
export async function getAllBranches(): Promise<
  (Branch & { fullRepoName: string; features: Feature[]; lastReview: string })[]
> {
  const snapshot = await getDB().collection("branches").get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as (Branch & {
    fullRepoName: string;
    features: Feature[];
    lastReview: string;
  })[];
}

//ブランチのレビュー結果をFirestoreに保存する
export async function updateBranchReview(
  branchId: string,
  reviewResult: string,
): Promise<void> {
  await getDB().collection("branches").doc(branchId).update({
    lastReview: reviewResult,
  });
}

//ブランチの担当者を更新する
export async function updateBranch(
  id: string,
  data: { assignee?: string; completed?: boolean },
): Promise<void> {
  await getDB().collection("branches").doc(id).update(data);
}

//問い合わせをFirestoreに保存する
export async function saveInquiry(data: Omit<Inquiry, "id">): Promise<string> {
  const docRef = await getDB()
    .collection("inquiries")
    .add({
      ...data,
      embeddingVector: Array.isArray(data.embeddingVector)
        ? FieldValue.vector(data.embeddingVector)
        : data.embeddingVector,
    });
  return docRef.id;
}

//問い合わせ起点でブランチを新規作成する(機能要件ブランチとは別系統)
export async function createInquiryBranch(data: {
  branchName: string;
  fullRepoName: string;
  branchType: "fix" | "feat" | "chore";
  description: string;
  assignee: string;
  inquiryId: string;
}): Promise<string> {
  const docRef = await getDB()
    .collection("branches")
    .add({
      ...data,
      featureIds: [], //機能要件ベースのブランチと互換性のため空配列
      features: [],
      lastReview: "",
      createdAt: new Date().toISOString(),
    });
  return docRef.id;
}

//IDでリポジトリ情報を1件取得する(問い合わせAPI用)
export async function getRepositoryById(
  id: string,
): Promise<Repository | null> {
  const doc = await getDB().collection("repositories").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Repository;
}

//inquiriesコレクションの全データを取得する(オペレータ管理画面用)
export async function getInquiries(): Promise<Inquiry[]> {
  const snapshot = await getDB()
    .collection("inquiries")
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => toPlainInquiry(doc));
}

//IDで問い合わせ1件分を取得する
export async function getInquiryById(id: string): Promise<Inquiry | null> {
  const doc = await getDB().collection("inquiries").doc(id).get();
  if (!doc.exists) return null;
  return toPlainInquiry(doc);
}

//問い合わせのカテゴリ・ステータス・対応メモを更新
export async function updateInquiry(
  id: string,
  data: Partial<
    Pick<
      Inquiry,
      | "confirmedCategory"
      | "status"
      | "resolvedNote"
      | "priority"
      | "assignee"
      | "dueDate"
      | "resolvedAt"
      | "branchId"
      | "aiCategory"
      | "embeddingVector"
    >
  >,
): Promise<void> {
  const updateData = { ...data };
  if (Array.isArray(updateData.embeddingVector)) {
    updateData.embeddingVector = FieldValue.vector(updateData.embeddingVector);
  }
  await getDB().collection("inquiries").doc(id).update(updateData);
}

//類似問い合わせをベクトル検索する
export async function searchSimilarInquiries(
  queryVector: number[],
  excludeId: string,
  category?: string,
  limit: number = 5,
): Promise<Inquiry[]> {
  const vectorQuery = getDB()
    .collection("inquiries")
    .findNearest({
      vectorField: "embeddingVector",
      queryVector: FieldValue.vector(queryVector),
      limit: limit + 1, //自分自身が含まれる場合に添えて1件多く取得
      distanceMeasure: "COSINE",
    });
  const snapshot = await vectorQuery.get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Inquiry)
    .filter((doc) => doc.id !== excludeId) //自分自身を除外
    .filter(
      (doc) =>
        !category || (doc.confirmedCategory ?? doc.aiCategory) === category,
    ) //同一カテゴリから検索。確定カテゴリ優先
    .slice(0, limit);
}

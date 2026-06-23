//Firestoreのrepositoriesコレクションに保存するデータの型
export type Repository = {
  id: string; //ドキュメントID
  repoName: string; //リポジトリ名
  projectName: string; //プロジェクト名
  summery: string; //システム概要
  featureList: string[]; //機能概要リスト
  techStack: string[]; //使用技術スタック
  isNew: boolean; //新規 or 改造
  requirementsText: string; //要件定義書の要約リスト
  embeddingVector: number[]; //ベクトル(類似検索用)
};

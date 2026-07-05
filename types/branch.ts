//ブランチ1件分の型
export type Branch = {
  id: string;
  branchName: string; //ブランチ名(例:feature/login)
  featureIds: string[]; //担当する機能要件のID一覧
  assignee: string; //担当者のメールアドレス
  completed: boolean; //ブランチが完了したかどうかのフラグ
};

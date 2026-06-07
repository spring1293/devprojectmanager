export type Review = {
  id: string;
  branchName: string; //レビュー対象のブランチ名
  commitSha: string; //レビュー対象のコミットSHA
  result: string; //Geminiのレビュー結果テキスト
  createdAt: Date; //レビュー実行日時
};

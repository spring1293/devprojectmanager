export type InquiryCategory = "question" | "bug" | "feature" | "unclassified";
export type InquiryStatus = "open" | "in_progress" | "resolved";
export type InquiryPriority = "low" | "medium" | "high" | "critical";

export type Inquiry = {
  id: string;
  repoId: string; //対応リポジトリID
  name: string;
  email: string;
  title: string;
  body: string;
  aiCategory: InquiryCategory; //AIの仮分類
  confirmedCategory: InquiryCategory | null; //オペレータが確定した分類
  status: InquiryStatus;
  priority: InquiryPriority; //重要度
  assignee: string; //担当者
  dueDate: string | null; //回答期日
  suggestedAnswer: string; //問い合わせ受付のタイミングでAIが提案する回答案
  resolvedNote: string; //解決時の対応メモ
  createdAt: string; //ISO 8601形式
  resolvedAt: string | null; //解決日時。ISO801形式。未解決はnull
  embeddingVector: number[] | string; //類似問い合わせ検索用。生成失敗を受け入れるためにstringも許容
};

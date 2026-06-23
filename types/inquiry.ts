export type InquiryCategory = "question" | "bug" | "feature";
export type InquiryStatus = "open" | "in_progress" | "resolved";

export type Inquiry = {
  id: string;
  name: string;
  email: string;
  title: string;
  body: string;
  aiCategory: InquiryCategory; //AIの仮分類
  confirmedCategory: InquiryCategory | null; //オペレータが確定した分類
  status: InquiryStatus;
  suggestedAnswer: string; //問い合わせ受付のタイミングでAIが提案する回答案
  resolvedNote: string; //解決時の対応メモ
  createdAt: string; //ISO 8601形式
};

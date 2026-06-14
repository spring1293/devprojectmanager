//機能要件1件分の型
export type Feature = {
  id: string; //一意のID(画面上での管理用)
  title: string; //機能名
  description: string; //機能の詳細説明
  priority: "high" | "medium" | "low"; //優先度
};

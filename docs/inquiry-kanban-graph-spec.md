# 問い合わせ管理 カンバン・グラフ機能 実装仕様書

## 概要

`/dashboard` の問い合わせタブを、カンバンボードと棒グラフによる作業管理ビューに刷新する。
重要度・担当者・対応完了予定日を新フィールドとして追加し、タスクの優先順位と期日集中を一目で把握できるようにする。

---

## 確定した設計方針

| 論点 | 採用方針 |
|---|---|
| ステータス変更 | カード上のボタンで変更（ドラッグ&ドロップなし） |
| 案件番号 | Firestore ID の先頭6文字（例: `#a3f9bc`） |
| 未確認表示 | カンバン上部の折りたたみバナー |
| 棒グラフ実装 | カスタムSVG（ライブラリなし） |
| 配置場所 | `/dashboard` の問い合わせタブを置き換え |
| 担当者入力 | 自由入力テキスト（将来的にユーザーマスタ選択式に変更予定） |

---

## 追加フィールド仕様

### `types/inquiry.ts` に追加

```ts
priority: "low" | "medium" | "high" | "critical"; // 小・中・大・緊急
assignee: string;       // 担当者名（自由入力）
dueDate: string | null; // 対応完了予定日（ISO 8601日付文字列 "YYYY-MM-DD"）
```

### 新規登録時のデフォルト値（`app/api/inquiry/route.ts`）

```ts
priority: "medium",
assignee: "",
dueDate: null,
```

---

## 画面レイアウト

### `/dashboard` 問い合わせタブ

```
[このリポジトリ] [すべて]          [カンバン] [グラフ]
─────────────────────────────────────────────────────
▼ 未確認 3件  [#a3f9bc タイトル] [#b1c2d3 タイトル]...
─────────────────────────────────────────────────────

↓ カンバン表示時
  未着手(N)        作業中(N)        直近完了 [表示/非表示]
  ┌──────────┐   ┌──────────┐   ┌──────────┐
  │ カード    │   │ カード    │   │ カード    │
  │[作業開始] │   │[完了にする]│   │(グレー)   │
  └──────────┘   └──────────┘   └──────────┘

↓ グラフ表示時
  件数
  ↑ 4│    █
    3│    █  █
    2│ █  █  █  █
    1│ █  █  █  █  █
     └──────────────→
       6/27 6/28 6/29 6/30 7/1 ...
```

---

## カンバン詳細仕様

### カラム定義

| カラム | ステータス | 追加条件 |
|---|---|---|
| 未着手 | `open` | `confirmedCategory !== null` のみ表示 |
| 作業中 | `in_progress` | - |
| 直近完了 | `resolved` | 完了から24時間以内。トグルで表示/非表示切り替え |

> `confirmedCategory === null`（未確認）はカンバン本体には表示せず、上部バナーに表示する。

### 未確認バナー

- `confirmedCategory === null` の問い合わせを横並びチップで表示
- クリックすると詳細モーダルが開く（既存の `OpsDetailClient` モーダルを流用）
- 0件の場合はバナー非表示

### カードレイアウト

```
┌─────────────────────────────────────┐
│ [緊急] [バグ]           📅 6/29     │  ← 期日バッジ
│ お問い合わせタイトル                │
│ #a3f9bc · 田中                      │
│ [作業開始]  or  [完了にする]        │
└─────────────────────────────────────┘
```

### ステータス変更ボタン

| カラム | ボタン | 変更後ステータス |
|---|---|---|
| 未着手 | `[作業開始]` | `in_progress` |
| 作業中 | `[完了にする]` | `resolved` |
| 直近完了 | なし（グレーアウト表示） | - |

### 重要度バッジ

| 値 | ラベル | 色 |
|---|---|---|
| `critical` | 緊急 | 赤 `#ff3b30` |
| `high` | 大 | オレンジ `#ff9500` |
| `medium` | 中 | 青 `#0a84ff` |
| `low` | 小 | グレー `#8a8a8e` |

### 期日バッジ（2段階アラート）

| 条件 | 色 |
|---|---|
| 8日以上先 or 期日なし | グレー `#a1a1a6`（通常） |
| 7日以内 | 黄色 `#ff9500` |
| 3日以内 または 超過 | 赤 `#ff3b30` |

### カラム内ソート

ヘッダーのドロップダウンで切り替え可能。

| ソート | 説明 |
|---|---|
| 重要度順（デフォルト） | `critical` は常に最上位固定。それ以外は high→medium→low |
| 期日順 | 近い順（期日なしは末尾） |
| 登録日順 | 新しい順 |

### 担当者フィルタ

表示中の問い合わせから担当者名の一意リストを動的生成し、ドロップダウンで絞り込み。

---

## 棒グラフ詳細仕様

### データ

- `dueDate` が設定されている問い合わせのみ対象（`null` は除外）
- X軸: 今日から30日間の日付を固定表示
- Y軸: 各日付の問い合わせ件数

### 棒の色

その日の問い合わせの最高重要度に基づく。

| 最高重要度 | 棒の色 |
|---|---|
| `critical` を含む | 赤 `#ff3b30` |
| `high` を含む | オレンジ `#ff9500` |
| `medium` のみ | 青 `#0a84ff` |
| `low` のみ | グレー `#8a8a8e` |
| 0件 | 表示なし |

### 実装

- カスタムSVGで実装（外部ライブラリなし）
- X軸ラベル: `M/D` 形式（例: `6/29`）
- Y軸: 最大件数に合わせて自動スケール
- 件数0の日付はバーを表示しない（軸ラベルのみ）

---

## 変更ファイル一覧

| # | ファイル | 変更種別 | 内容 |
|---|---|---|---|
| 1 | `types/inquiry.ts` | 変更 | `priority` `assignee` `dueDate` 追加 |
| 2 | `lib/firestore.ts` | 変更 | save/update で新フィールド対応 |
| 3 | `app/api/inquiry/route.ts` | 変更 | POST時のデフォルト値追加 |
| 4 | `app/ops/inquiry/[id]/OpsDetailClient.tsx` | 変更 | 右パネルに3フィールドの編集UI追加 |
| 5 | `app/dashboard/DashboardClient.tsx` | 変更 | 問い合わせタブをカンバン/グラフビューに置き換え |
| 6 | `app/dashboard/InquiryKanban.tsx` | 新規作成 | カンバンボードコンポーネント |
| 7 | `app/dashboard/InquiryGraph.tsx` | 新規作成 | 棒グラフコンポーネント |

---

## 実装手順

### Step 1: 型定義の更新

**ファイル**: `types/inquiry.ts`

`Inquiry` 型に以下を追加する。

```ts
priority: "low" | "medium" | "high" | "critical";
assignee: string;
dueDate: string | null;
```

完成形:

```ts
export type InquiryPriority = "low" | "medium" | "high" | "critical";

export type Inquiry = {
  id: string;
  repoId: string;
  name: string;
  email: string;
  title: string;
  body: string;
  aiCategory: InquiryCategory;
  confirmedCategory: InquiryCategory | null;
  status: InquiryStatus;
  priority: InquiryPriority;      // 追加
  assignee: string;               // 追加
  dueDate: string | null;         // 追加
  suggestedAnswer: string;
  resolvedNote: string;
  createdAt: string;
  embeddingVector: number[] | string;
};
```

---

### Step 2: Firestore の save/update 対応

**ファイル**: `lib/firestore.ts`

既存の `saveInquiry` と `updateInquiry` は `data` をスプレッドで保存しているため、
`Inquiry` 型に新フィールドを追加するだけで自動的に保存される。追加作業不要。

> ただし既存データには `priority` `assignee` `dueDate` が存在しない。
> 読み込み時に `undefined` になるため、表示側でフォールバックを設ける（後述）。

---

### Step 3: POST APIのデフォルト値追加

**ファイル**: `app/api/inquiry/route.ts`

`saveInquiry` の呼び出し箇所に3フィールドを追加する。

```ts
const id = await saveInquiry({
  repoId,
  name: name ?? "",
  email,
  title,
  body,
  aiCategory,
  confirmedCategory: null,
  status: "open",
  priority: "medium",   // 追加
  assignee: "",          // 追加
  dueDate: null,         // 追加
  suggestedAnswer,
  resolvedNote: "",
  createdAt: new Date().toISOString(),
  embeddingVector,
});
```

---

### Step 4: OpsDetailClient に編集UIを追加

**ファイル**: `app/ops/inquiry/[id]/OpsDetailClient.tsx`

右サイドパネル（`w-72` の `div`）に、以下3つのカードを追加する。
既存の「AI仮分類」「Embedding状態」の下に配置する。

#### 重要度

```tsx
<div className="rounded-xl p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)" }}>
  <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">重要度</p>
  <div className="flex flex-col gap-2">
    {(["critical", "high", "medium", "low"] as InquiryPriority[]).map((p) => (
      <button
        key={p}
        onClick={() => patch({ priority: p })}
        disabled={saving}
        className="h-9 rounded-lg text-[13px] font-semibold border-none cursor-pointer disabled:opacity-40"
        style={
          (inquiry.priority ?? "medium") === p
            ? { background: PRIORITY_COLOR[p], color: "#fff" }
            : { background: "rgba(0,0,0,.06)", color: "#3a3a3c" }
        }
      >
        {PRIORITY_LABEL[p]}
      </button>
    ))}
  </div>
</div>
```

#### 担当者

```tsx
<div className="rounded-xl p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)" }}>
  <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">担当者</p>
  <input
    type="text"
    value={assignee}
    onChange={(e) => setAssignee(e.target.value)}
    placeholder="担当者名を入力"
    className="w-full h-9 px-3 rounded-lg text-[13px] text-[#1d1d1f] outline-none"
    style={{ border: ".5px solid rgba(0,0,0,.18)" }}
  />
  <button
    onClick={() => patch({ assignee })}
    disabled={saving}
    className="mt-2 w-full h-8 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer disabled:opacity-40"
    style={{ background: "rgba(0,0,0,.07)", color: "#3a3a3c" }}
  >
    保存
  </button>
</div>
```

#### 対応完了予定日

```tsx
<div className="rounded-xl p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06), inset 0 0 0 .5px rgba(0,0,0,.10)" }}>
  <p className="text-[11px] font-semibold text-[#a1a1a6] tracking-wide m-0 mb-3">対応完了予定日</p>
  <input
    type="date"
    value={dueDate ?? ""}
    onChange={(e) => setDueDate(e.target.value || null)}
    className="w-full h-9 px-3 rounded-lg text-[13px] text-[#1d1d1f] outline-none"
    style={{ border: ".5px solid rgba(0,0,0,.18)" }}
  />
  <button
    onClick={() => patch({ dueDate })}
    disabled={saving}
    className="mt-2 w-full h-8 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer disabled:opacity-40"
    style={{ background: "rgba(0,0,0,.07)", color: "#3a3a3c" }}
  >
    保存
  </button>
</div>
```

OpsDetailClient に追加が必要な state と定数:

```ts
// state
const [assignee, setAssignee] = useState(initial.assignee ?? "");
const [dueDate, setDueDate] = useState<string | null>(initial.dueDate ?? null);

// 定数
const PRIORITY_LABEL: Record<InquiryPriority, string> = {
  critical: "緊急", high: "大", medium: "中", low: "小",
};
const PRIORITY_COLOR: Record<InquiryPriority, string> = {
  critical: "#ff3b30", high: "#ff9500", medium: "#0a84ff", low: "#8a8a8e",
};
```

---

### Step 5: InquiryKanban.tsx を新規作成

**ファイル**: `app/dashboard/InquiryKanban.tsx`

Props:

```ts
type Props = {
  inquiries: Inquiry[];
  onCardClick: (inquiry: Inquiry) => void; // 既存モーダルを開く
  onStatusChange: (id: string, status: InquiryStatus) => void;
};
```

#### 期日アラートのユーティリティ関数

```ts
function getDueDateColor(dueDate: string | null): string {
  if (!dueDate) return "#a1a1a6";
  const diff = Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff <= 3) return "#ff3b30";
  if (diff <= 7) return "#ff9500";
  return "#a1a1a6";
}
```

#### カラム内ソート関数

```ts
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function sortCards(cards: Inquiry[], sortKey: "priority" | "dueDate" | "createdAt"): Inquiry[] {
  return [...cards].sort((a, b) => {
    // 緊急は常に最上位
    const aCritical = (a.priority ?? "medium") === "critical" ? 0 : 1;
    const bCritical = (b.priority ?? "medium") === "critical" ? 0 : 1;
    if (aCritical !== bCritical) return aCritical - bCritical;

    if (sortKey === "priority") {
      return PRIORITY_ORDER[a.priority ?? "medium"] - PRIORITY_ORDER[b.priority ?? "medium"];
    }
    if (sortKey === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}
```

#### 直近完了の判定

```ts
function isRecentlyResolved(inquiry: Inquiry): boolean {
  if (inquiry.status !== "resolved") return false;
  // resolvedAt フィールドがないため createdAt で代用（将来的に resolvedAt 追加を検討）
  // ここでは常に表示する（トグルで制御）
  return true;
}
```

> **注意**: 現在 `resolvedAt` フィールドがないため、「完了から24時間以内」の正確な判定ができない。
> ハッカソン版では `resolved` のものをすべて直近完了カラムに表示し、トグルで表示/非表示のみ制御する。
> 将来的に `resolvedAt: string` フィールドを追加して正確な24時間判定に変更する。

---

### Step 6: InquiryGraph.tsx を新規作成

**ファイル**: `app/dashboard/InquiryGraph.tsx`

Props:

```ts
type Props = {
  inquiries: Inquiry[];
};
```

#### 実装ロジック概要

```ts
// 今日から30日間の日付配列を生成
const dates = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
});

// 日付ごとに件数と最高重要度を集計
const dayData = dates.map((date) => {
  const items = inquiries.filter((i) => i.dueDate === date);
  const maxPriority = items.reduce<InquiryPriority | null>((acc, i) => {
    const order = PRIORITY_ORDER[i.priority ?? "medium"];
    if (acc === null || order < PRIORITY_ORDER[acc]) return i.priority ?? "medium";
    return acc;
  }, null);
  return { date, count: items.length, maxPriority };
});

const maxCount = Math.max(...dayData.map((d) => d.count), 1);
```

#### SVGレイアウト

```
SVG 全体: width="100%" height={240}
  Y軸ラベル: 左端に件数表示
  バー: 各日付に対応する rect 要素
  X軸ラベル: 5日おきに日付表示（全部表示すると窮屈なため）
```

---

### Step 7: DashboardClient.tsx の問い合わせタブを置き換え

**ファイル**: `app/dashboard/DashboardClient.tsx`

#### 追加する state

```ts
const [inquiryView, setInquiryView] = useState<"kanban" | "graph">("kanban");
```

#### フィルタ行の変更

```tsx
{/* フィルタ + ビュー切替 */}
<div className="flex-none flex items-center justify-between gap-2 px-7 py-3"
  style={{ borderBottom: ".5px solid rgba(0,0,0,.06)" }}>
  <div className="flex gap-2">
    <button onClick={() => setInquiryFilter("repo")} ...>
      {selectedRepo.split("/")[1] ?? "このリポジトリ"}
    </button>
    <button onClick={() => setInquiryFilter("all")} ...>すべて</button>
  </div>
  <div className="flex gap-2">
    <button onClick={() => setInquiryView("kanban")} ...>カンバン</button>
    <button onClick={() => setInquiryView("graph")} ...>グラフ</button>
  </div>
</div>
```

#### 問い合わせタブのメインエリア

```tsx
<div className="flex-1 overflow-y-auto">
  {inquiryView === "kanban" ? (
    <InquiryKanban
      inquiries={filteredInquiries}
      onCardClick={(inquiry) => setSelectedInquiry(inquiry)}
      onStatusChange={handleStatusChange}
    />
  ) : (
    <InquiryGraph inquiries={filteredInquiries} />
  )}
</div>
```

#### ステータス変更ハンドラ

`DashboardClient` で問い合わせ一覧を state で保持し、ステータス変更を即時反映できるようにする。

```ts
const [inquiryList, setInquiryList] = useState(inquiries);

const handleStatusChange = async (id: string, status: InquiryStatus) => {
  const res = await fetch(`/api/inquiry/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (res.ok) {
    setInquiryList((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i))
    );
  }
};
```

> **注意**: `filteredInquiries` は `inquiryList` から派生させる（`inquiries` props からではなく）。

---

## 既存データの後方互換性

新フィールド（`priority` `assignee` `dueDate`）が存在しない既存問い合わせは、
表示側で以下のフォールバックを設ける。

```ts
inquiry.priority ?? "medium"   // デフォルト: 中
inquiry.assignee ?? ""         // デフォルト: 空文字
inquiry.dueDate ?? null        // デフォルト: なし
```

Firestoreへの書き込みは変更なし。既存ドキュメントを一括更新する必要はない。

---

## 将来の改善候補（ハッカソン後）

- `resolvedAt` フィールドを追加して「直近完了24時間以内」を正確に判定
- 担当者をユーザーマスタから選択式に変更
- 棒グラフのバーをクリックで対象問い合わせをハイライト
- ドラッグ&ドロップによるステータス変更
- カンバンカードのインライン編集（担当者・期日）

# Phase 2 API実装まとめ

## 作成したファイル一覧

| ファイル | 内容 |
|---|---|
| `lib/gemini.ts` | GeminiAPIクライアント・判定関数 |
| `lib/firestore.ts` | Firestoreクライアント・DB操作関数 |
| `types/repository.ts` | Repositoryの型定義 |
| `app/api/analyze/route.ts` | 新規/改造判定APIルート |
| `app/page.tsx` | 要件定義書入力UI・結果表示 |

---

## lib/gemini.ts

GeminiAPIの初期化と2つの関数を実装。

### SDKの経緯
- 当初 `@google/generative-ai`（旧SDK）を使用
- v1betaエンドポイントでモデルが404になる問題が発生
- `@google/genai`（新SDK）に切り替えて解決

### 実装した関数

**`analyzeRequirements(text)`**
- 要件定義書のテキストを受け取り、新規/改造を判定する
- Geminiにプロンプトを送り、JSON形式で結果を受け取る
- 返り値：`{ isNew: boolean, reason: string, systemName: string | null }`

**`generateEmbedding(text)`**
- テキストをベクトルに変換する（類似度検索用）
- 現在はEmbeddingモデルのAPI接続問題により一時スキップ中
- Firestoreにデータが蓄積された段階で有効化予定

### 使用モデル
- テキスト生成：`gemini-2.5-flash`
- Embedding：`text-embedding-004`（現在スキップ中）

---

## lib/firestore.ts

Firebase AdminSDKの初期化と3つの関数を実装。

### 初期化の注意点
- `getApps().length` チェックでNext.jsの開発環境での二重初期化を防止
- `privateKey` の `replace(/\\n/g, "\n")` で.env.localの改行文字を変換

### 実装した関数

**`getRepositories()`**
- `repositories` コレクションの全件を取得
- 改造判定時の候補リスト取得に使用

**`saveRepository(data)`**
- リポジトリデータをFirestoreに保存
- FirestoreがIDを自動発行し、そのIDを返す

**`searchSimilarRepositories(queryVector, limit)`**
- ベクトルで類似リポジトリを検索
- `distanceMeasure: "COSINE"` でコサイン類似度を使用
- Embeddingが有効化されたあとに使用

---

## app/api/analyze/route.ts

`POST /api/analyze` エンドポイント。

### 処理フロー

```
リクエスト受信（要件定義書テキスト）
  ↓
analyzeRequirements() で新規/改造を判定
  ↓
【改造】getRepositories() で全件取得して返却
【新規】空配列を返却（Embedding有効化後にベクトル検索に切り替え）
```

### 現在の制限
- 新規判定時のベクトル類似度検索はスキップ中
- Firestoreが空のため、改造判定でも候補は0件

---

## app/page.tsx

- テキストエリアに要件定義書を貼り付けて「解析する」ボタンで送信
- 判定結果（新規/改造・理由・システム名）を表示
- 類似リポジトリ候補を一覧表示

---

## 今後の対応事項

| 項目 | 内容 |
|---|---|
| Embeddingの有効化 | `text-embedding-004` のAPI接続問題を解決し、ベクトル検索を有効化 |
| Firestoreへのデータ登録 | Phase 3以降でリポジトリデータを蓄積していく |
| 承認UIの追加 | 候補確定後に次フェーズへ進む人間の介入ポイントを実装 |

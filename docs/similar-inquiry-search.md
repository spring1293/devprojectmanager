# 類似問い合わせ検索 実装メモ

類似問い合わせ検索機能を実装する際にハマったポイントと解決策をまとめる。

---

## 1. 対応モデルの確認方法

Gemini APIで使用できる埋め込みモデルは、以下のREST APIで一覧を取得できる。

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY" | jq '.models[] | select(.name | contains("embedding")) | .name'
```

または [Google AI Studio](https://aistudio.google.com/) の「Models」タブで確認できる。

### 主な埋め込みモデル（2025年時点）

| モデル名 | 次元数（デフォルト） | 備考 |
|---|---|---|
| `gemini-embedding-001` | 3072 | `outputDimensionality` で削減可能 |
| `gemini-embedding-2` | 3072 | 同上 |
| `text-embedding-004` | 768 | v1beta では 404 になる場合あり |

### APIエンドポイントについて

モデルによって有効なAPIバージョンが異なる。`gemini-embedding-001` は `v1beta` で呼び出す必要がある。

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent
```

### taskType の指定

類似検索に使用する場合は `taskType: "SEMANTIC_SIMILARITY"` を指定すると精度が上がる。

```typescript
body: JSON.stringify({
  model: "models/gemini-embedding-001",
  content: { parts: [{ text }] },
  outputDimensionality: 768,
  taskType: "SEMANTIC_SIMILARITY",
}),
```

---

## 2. なぜ3072次元だと検索ができなかったのか

Firestoreのベクトル検索（`findNearest`）には **ベクトルの次元数上限が2048次元** という制限がある。

`gemini-embedding-001` および `gemini-embedding-2` はデフォルトで **3072次元** のベクトルを生成するため、`findNearest` を呼び出すと以下のエラーが発生する。

```
Error: 3 INVALID_ARGUMENT: Vectors must be at most 2048 dimensions.
```

### 解決策

`outputDimensionality` パラメータで次元数を削減する。768次元はFirestoreの上限に収まり、かつ十分な精度を保てる。

```typescript
body: JSON.stringify({
  model: "models/gemini-embedding-001",
  content: { parts: [{ text }] },
  outputDimensionality: 768,  // 3072 → 768 に削減
}),
```

> **注意**: SDKの `config: { outputDimensionality: 768 }` は認識されないことがあった。REST APIを直接呼び出してリクエストボディに含める方が確実。

---

## 3. ベクトルインデックスの追加方法

Firestoreの `findNearest` はベクトルインデックスが必須。インデックスがない場合は以下のエラーが発生する。

```
Error: 9 FAILED_PRECONDITION: Missing vector index configuration.
```

エラーメッセージに作成コマンドが含まれているので、そのまま実行する。

```bash
gcloud firestore indexes composite create \
  --project=YOUR_PROJECT_ID \
  --collection-group=inquiries \
  --query-scope=COLLECTION \
  --field-config=vector-config='{"dimension":"768","flat": "{}"}',field-path=embeddingVector
```

### パラメータの説明

| パラメータ | 内容 |
|---|---|
| `--collection-group` | 対象のFirestoreコレクション名 |
| `--query-scope=COLLECTION` | コレクション単位での検索（通常はこれを使う） |
| `vector-config.dimension` | 保存するベクトルの次元数（`outputDimensionality` と合わせる） |
| `vector-config.flat` | フラットインデックス（ブルートフォース検索）。小〜中規模データに適する |

### インデックス作成後の注意

インデックス作成には数分かかる。作成が完了するまで `findNearest` はエラーになる。

Firebase Console の「Firestore → インデックス」タブで作成状況を確認できる。

---

## 4. VectorValueオブジェクトと対応

### 問題

Firestoreにベクトルを保存する際、`FieldValue.vector(number[])` でラップして保存する必要がある。これをしないと `findNearest` の検索対象と認識されず、エラーは出ないのに結果が0件になる。

```typescript
// NG: plain な number[] として保存するとfindNearest の検索対象にならない
await db.collection("inquiries").add({ embeddingVector: [0.1, 0.2, ...] });

// OK: FieldValue.vector() でラップする
await db.collection("inquiries").add({ embeddingVector: FieldValue.vector([0.1, 0.2, ...]) });
```

### 読み込み時の問題（Next.js Server Components）

`FieldValue.vector()` で保存したフィールドをFirestoreから読み込むと、`number[]` ではなく **`VectorValue` オブジェクト**として返ってくる。

Next.jsのServer ComponentからClient ComponentにデータをPropsで渡す際、JSON変換が行われる。`VectorValue` はJSONシリアライズ不可のため、以下のエラーが発生する。

```
Error: An error occurred in the Server Components render.
```

### 解決策

Firestoreからデータを読み込む際に、`VectorValue` を `number[]` に変換するヘルパー関数を用意する。

```typescript
function toPlainInquiry(doc: FirebaseFirestore.DocumentSnapshot): Inquiry {
  const data = doc.data()!;
  const ev = data.embeddingVector;
  return {
    id: doc.id,
    ...data,
    embeddingVector:
      ev && typeof ev === "object" && typeof ev.toArray === "function"
        ? ev.toArray()   // VectorValue → number[] に変換
        : (ev ?? []),
  } as Inquiry;
}
```

`VectorValue` かどうかは `typeof ev.toArray === "function"` で判定できる。

### 更新時の型エラー対応

`updateInquiry` のように `Partial<Inquiry>` を引数に取る関数で `FieldValue.vector()` を使う場合、TypeScriptの型エラーが発生する（`VectorValue` は `number[] | string` に代入不可）。`Record<string, unknown>` にキャストして回避する。

```typescript
const updateData: Record<string, unknown> = { ...data };
if (Array.isArray(updateData.embeddingVector)) {
  updateData.embeddingVector = FieldValue.vector(updateData.embeddingVector as number[]);
}
await db.collection("inquiries").doc(id).update(updateData);
```

---

## まとめ：実装チェックリスト

- [ ] 埋め込みモデルは `v1beta` エンドポイントで REST API を直接呼び出す
- [ ] `outputDimensionality: 768` で次元数を2048以下に削減する
- [ ] `taskType: "SEMANTIC_SIMILARITY"` を指定する
- [ ] 保存時は `FieldValue.vector()` でラップする
- [ ] 読み込み時は `VectorValue` を `toArray()` で `number[]` に変換する
- [ ] Firestoreにベクトルインデックスを作成する（次元数をoutputDimensionalityと合わせる）
- [ ] インデックス変更時は既存ドキュメントの再embedding が必要

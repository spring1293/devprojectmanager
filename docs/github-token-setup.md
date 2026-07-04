# GitHub Token & Webhook Secret 設定手順

サブアカウントでの GITHUB_TOKEN および GITHUB_WEBHOOK_SECRET の設定手順をまとめます。

---

## 1. GITHUB_TOKEN の発行

### 1-1. サブアカウントでGitHubにログイン

[github.com](https://github.com) にサブアカウントでログインします。

### 1-2. Personal Access Token を発行

1. 右上のアバター → **Settings** をクリック
2. 左メニュー最下部の **Developer settings** をクリック
3. **Personal access tokens → Tokens (classic)** を選択
4. **Generate new token → Generate new token (classic)** をクリック
5. 以下を設定する

| 項目 | 設定値 |
|------|--------|
| Note | `devprojectmanager` など任意の名前 |
| Expiration | 任意（ハッカソン期間中は `No expiration` でも可） |
| Scopes | 下記参照 |

**必要な Scopes:**

| Scope | 用途 |
|-------|------|
| ✅ `repo` | リポジトリ・ブランチの作成・取得 |
| ✅ `admin:repo_hook` | Webhook の設定 |

6. **Generate token** をクリック
7. 表示されたトークン（`ghp_xxx...`）を**必ずこの画面でコピー**する（再表示不可）

---

## 2. GITHUB_WEBHOOK_SECRET の生成

Webhook Secret は GitHub が発行するものではなく、**自分で任意の文字列を生成**して設定します。

ターミナルで以下のコマンドを実行し、安全なランダム文字列を生成します。

```bash
openssl rand -hex 32
```

出力された文字列（例: `a3f8c2e1...`）を控えておきます。

---

## 3. GitHub リポジトリの Webhook 設定

デモ用リポジトリにWebhookを設定します。

1. サブアカウントの対象リポジトリ → **Settings → Webhooks → Add webhook** をクリック
2. 以下を設定する

| 項目 | 設定値 |
|------|--------|
| Payload URL | `https://{Cloud RunのURL}/api/webhook` |
| Content type | `application/json` |
| Secret | 手順2で生成した文字列（GITHUB_WEBHOOK_SECRETと同じ値） |
| Which events | **Just the push event** |
| Active | ✅ チェックを入れる |

3. **Add webhook** をクリック

---

## 4. 環境変数への設定

### ローカル開発（.env.local）

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_WEBHOOK_SECRET=a3f8c2e1xxxxxxxxxxxxxxxxxxxxxxxx
```

### Cloud Run（本番環境）

Google Cloud Console での設定手順:

1. [console.cloud.google.com](https://console.cloud.google.com) を開く
2. **Cloud Run** → 対象のサービスを選択
3. **「新しいリビジョンを編集してデプロイ」** をクリック
4. **「変数とシークレット」タブ** を開く
5. **「変数を追加」** から以下を設定する

| 名前 | 値 |
|------|----|
| `GITHUB_TOKEN` | 手順1で発行したトークン |
| `GITHUB_WEBHOOK_SECRET` | 手順2で生成した文字列 |

6. **「デプロイ」** をクリック

---

## 5. 動作確認

Webhook が正しく設定されているか確認します。

1. デモ用リポジトリに適当なコミットをpushする
2. GitHub → リポジトリ → **Settings → Webhooks** を開く
3. 設定したWebhookをクリック → **Recent Deliveries** タブを確認
4. ✅ レスポンスが `200` であれば正常

---

## 注意事項

- GITHUB_TOKEN はサブアカウントのものを使用するため、**サブアカウントがリポジトリのオーナーまたはコラボレーターである必要があります**
- トークンは外部に公開しないよう注意してください（`.env.local` は `.gitignore` に含まれていることを確認）
- ハッカソン終了後はトークンを失効させることを推奨します（GitHub → Settings → Developer settings → Tokens → Delete）

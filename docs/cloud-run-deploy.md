# Cloud Run デプロイ手順

## 前提条件

- Google Cloud プロジェクト作成済み
- 請求先アカウント設定済み（`gmail-oauth-setup.md` 参照）
- Dockerfile・.dockerignore 作成済み
- `next.config.ts` に `output: "standalone"` 設定済み

---

## ステップ1：gcloud CLI のインストール

```bash
curl https://sdk.cloud.google.com | bash
```

インストール中の質問：
- インストール先：デフォルト（Enter）でOK
- `PATH` への追加：`Y`
- シェルの再起動：`Y`

インストール後、PATHを反映：

```bash
source ~/.bashrc
```

インストール確認：

```bash
gcloud version
```

---

## ステップ2：認証 & プロジェクト設定

```bash
# Googleアカウントでログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project プロジェクトID
```

> **ポイント：** プロジェクトIDはFirebase ConsoleまたはGoogle Cloud Consoleの上部で確認できる。

---

## ステップ3：必要なAPIの有効化

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

| API | 用途 |
|---|---|
| `run.googleapis.com` | Cloud Run |
| `cloudbuild.googleapis.com` | Dockerイメージのビルド |
| `artifactregistry.googleapis.com` | ビルドしたイメージの保存 |

---

## ステップ4：デプロイ

```bash
gcloud run deploy dev-project-manager \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

`--source .` を指定することで、以下が自動で実行される：
1. ソースコードをCloud Buildにアップロード
2. Dockerfileをもとにイメージをビルド
3. Artifact Registryにイメージを保存
4. Cloud Runにデプロイ

初回実行時、Artifact Registryのリポジトリ作成確認が出る → `Y` で進む。

デプロイ成功後、サービスのURLが表示される。

### デプロイ確認

```bash
gcloud run services describe dev-project-manager \
  --region asia-northeast1 \
  --format "value(status.url)"
```

表示されたURLをブラウザで開いて画面が表示されれば成功。

---

## ステップ5：環境変数の設定

`.env.local` はDockerイメージに含まれないため、Cloud Run側に別途設定する。

Google Cloud Console → Cloud Run → `dev-project-manager` → 「編集とデプロイの新リビジョン」→「変数とシークレット」タブ →「環境変数を追加」

| 変数名 | 値 |
|---|---|
| `GEMINI_API_KEY` | Gemini APIキー |
| `GITHUB_TOKEN` | GitHubトークン |
| `FIREBASE_PROJECT_ID` | FirebaseプロジェクトID |
| `FIREBASE_CLIENT_EMAIL` | Firebaseクライアントメール |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebaseプライベートキー（`-----BEGIN`から全部） |
| `GMAIL_CLIENT_ID` | GmailクライアントID |
| `GMAIL_CLIENT_SECRET` | Gmailクライアントシークレット |
| `GMAIL_REFRESH_TOKEN` | Gmailリフレッシュトークン |

全て入力後「デプロイ」をクリック。

> **補足：** `FIREBASE_SERVICE_ACCOUNT_KEY` は改行を含む長い値だが、コンソールのテキストボックスにそのまま貼り付けてOK。

---

## 再デプロイ手順

コードを修正した後の再デプロイはステップ4のコマンドを再実行するだけでよい。

```bash
gcloud run deploy dev-project-manager \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

---

## 詰まりやすいポイント一覧

| エラー | 原因 | 対処 |
|---|---|---|
| `command not found` (gcloud) | インストール後にPATHが未反映 | `source ~/.bashrc` を実行 |
| `dockerfile parse error: unknown instruction: CMD[` | `CMD` と `[` の間にスペースがない | `CMD ["node", "server.js"]` に修正 |
| `Build failed` | Dockerfileの記述ミス | `gcloud builds log BUILD_ID --region=asia-northeast1` でログを確認 |
| ビルドは通るが画面が崩れる | `output: "standalone"` が未設定 | `next.config.ts` に追加してから再デプロイ |

# Gmail API OAuth 設定手順

## 概要

このプロジェクトではGmail APIを使って作業依頼メール・レビュー結果メールを送信する。
認証方式はOAuth 2.0を使用し、Client ID / Client Secret / Refresh Token の3つを取得する必要がある。

---

## ステップ1：Google Cloud プロジェクトの準備

[Google Cloud Console](https://console.cloud.google.com) にアクセスし、プロジェクトを作成する。

> **ポイント：** FirestoreもGCPプロジェクトを使うため、同じプロジェクトにまとめると管理しやすい。

---

## ステップ2：Gmail API を有効化

「APIとサービス」→「ライブラリ」→ 検索欄に「Gmail API」と入力 →「有効にする」

---

## ステップ3：OAuth 同意画面の設定

「APIとサービス」→「OAuth同意画面」を開く。

### 基本情報

- User type：**外部** を選択
- アプリ名・メールアドレスを入力して保存

### スコープの追加

「データアクセス」タブ →「スコープを追加または削除」→ 以下を追加：

```
https://www.googleapis.com/auth/gmail.send
```

### テストユーザーの追加

> **注意：** Google Cloud ConsoleのUIが新しくなっており、テストユーザーの場所が変わっている。
> 同意画面の下部ではなく、上部タブの **「対象（Audience）」** タブの中にある。

タブ構成：

```
ブランディング ｜ 対象 ｜ データアクセス ｜ クライアント
```

「対象」タブ →「テストユーザー」セクション →「ADD USERS」→ 自分のGmailアドレスを追加 → 保存

---

## ステップ4：OAuth クライアントID の作成

「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」

- アプリケーションの種類：**ウェブアプリケーション**
- 承認済みのリダイレクトURIに以下を追加：

```
https://developers.google.com/oauthplayground
```

> **詰まりポイント①：`redirect_uri_mismatch` エラー**
> このリダイレクトURIを登録し忘れると発生する。必ず追加してから保存すること。

保存すると **クライアントID** と **クライアントシークレット** が表示される。両方コピーしておく。

---

## ステップ5：Refresh Token の取得

[OAuth 2.0 Playground](https://developers.google.com/oauthplayground) を使って取得する。

1. 右上の歯車アイコンをクリック
2. 「Use your own OAuth credentials」にチェックを入れる
3. ステップ4で取得した Client ID / Client Secret を入力
4. 左の一覧から `Gmail API v1` →`https://www.googleapis.com/auth/gmail.send` を選択
5. 「Authorize APIs」をクリック
6. Googleアカウントでログイン・アクセスを許可

> **詰まりポイント②：`access_denied` エラー**
> ステップ3でテストユーザーに自分のGmailアドレスを追加していないと発生する。
> 追加後に再試行すること。

7. 「Exchange authorization code for tokens」をクリック
8. 表示された **Refresh token** をコピー

---

## ステップ6：.env.local への設定

```env
GMAIL_CLIENT_ID=取得したクライアントID
GMAIL_CLIENT_SECRET=取得したクライアントシークレット
GMAIL_REFRESH_TOKEN=取得したリフレッシュトークン
```

---

## 補足：Google Cloud 請求先アカウントの設定

Cloud Run へのデプロイには請求先アカウントの設定が必要。Gmail API 自体には不要だが、同じGCPプロジェクトを使うため合わせて設定しておく。

### 設定手順

1. [Google Cloud Console](https://console.cloud.google.com) → 左上メニュー →「お支払い」
2. 「請求先アカウントを作成」→ 国（日本）・クレジットカード情報を入力
3. 「お支払い」→「マイプロジェクト」→ 対象プロジェクトの「アクション」→「請求先アカウントを変更」→ 作成したアカウントを選択

### Cloud Run の無料枠

カード登録は必要だが、以下の無料枠内であれば請求は発生しない。

| 項目         | 無料枠                |
| ------------ | --------------------- |
| リクエスト数 | 月200万リクエストまで |
| CPU          | 月180,000 vCPU秒まで  |
| メモリ       | 月360,000 GB秒まで    |

---

## まとめ：詰まりやすいポイント一覧

| エラー                       | 原因                                       | 対処                                                                             |
| ---------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| `redirect_uri_mismatch`      | OAuthクライアントにPlaygroundのURIが未登録 | 承認済みリダイレクトURIに `https://developers.google.com/oauthplayground` を追加 |
| `access_denied`              | テストユーザーに自分のアカウントが未登録   | OAuth同意画面「対象」タブでテストユーザーを追加                                  |
| テストユーザーが見つからない | ConsoleのUIが新しくなり場所が変わった      | 「OAuth同意画面」上部の「対象」タブを確認                                        |

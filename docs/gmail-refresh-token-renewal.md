# Gmail リフレッシュトークン再発行手順

## 再発行が必要になるタイミング

GoogleのOAuth同意画面が「テスト」モードの場合、リフレッシュトークンは**発行から7日間で自動失効**する。
以下のエラーが出たら再発行が必要。

```
Error: invalid_grant
error_description: 'Token has been expired or revoked.'
```

---

## 再発行手順

### ① OAuth Playground を開く

ブラウザで以下にアクセスする。

```
https://developers.google.com/oauthplayground
```

---

### ② 自分のOAuthクライアント情報を設定する

1. 右上の歯車アイコンをクリック
2. 「Use your own OAuth credentials」にチェックを入れる
3. 以下の値を入力する

| 項目 | 値 |
|---|---|
| OAuth Client ID | `.env.local` の `GMAIL_CLIENT_ID` の値 |
| OAuth Client secret | `.env.local` の `GMAIL_CLIENT_SECRET` の値 |

4. 設定を閉じる

---

### ③ スコープを選択して認証する

1. 左側のリストから `Gmail API v1` を展開する
2. `https://mail.googleapis.com/` を選択する
3. 「Authorize APIs」をクリックする
4. Googleアカウントの選択画面が出たら、送信元にするGmailアカウントを選ぶ
5. 権限の許可画面で「続行」をクリックする

---

### ④ リフレッシュトークンを取得する

1. 「Exchange authorization code for tokens」ボタンをクリックする
2. 右側に表示された `refresh_token` の値をコピーする

---

### ⑤ .env.local を更新して再起動する

`.env.local` の `GMAIL_REFRESH_TOKEN` を新しい値に更新する。

```
GMAIL_REFRESH_TOKEN=（コピーしたrefresh_tokenの値）
```

その後、開発サーバーを再起動する。

```bash
npm run dev
```

---

## 恒久的な対策

Google Cloud Console でOAuth同意画面を「テスト」→「本番」に変更すると、リフレッシュトークンが失効しなくなる。
ハッカソン提出後など、本格運用に移行するタイミングで対応する。

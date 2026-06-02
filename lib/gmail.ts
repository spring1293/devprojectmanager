import { google } from "googleapis";

//OAuth2クライアントを初期化(設定済みのトークンを使用)
const auth = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
);
auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

const gmail = google.gmail({ version: "v1", auth });

//メールを送信する
export async function sendMail(
  to: string, //宛先メールアドレス
  subject: string, //件名
  body: string, //本文
): Promise<void> {
  //RFC 2822形式のメール文字列を生成
  const message = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    `Content-Type: text/plain; charset=UTF-8`,
    "",
    body,
  ].join("\n");

  //Base64エンコードしてGmailAPIに渡す
  const encoded = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });
}

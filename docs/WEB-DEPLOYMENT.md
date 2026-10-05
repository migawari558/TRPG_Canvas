# ブラウザ版の公開とGoogle Drive同期

ブラウザ版はGitHub Pagesへ自動配置します。`main`へ変更を送ると、`.github/workflows/pages.yml`がテスト、ビルド、公開を行います。

## Google Cloudの初期設定

Google Drive同期には、公開URLに対応するOAuth 2.0クライアントIDが必要です。秘密鍵や有料サーバーは使いません。

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成します。
2. 「APIとサービス」からGoogle Drive APIを有効にします。
3. OAuth同意画面を設定します。要求するスコープは `https://www.googleapis.com/auth/drive.appdata` だけです。
4. 「認証情報」から「OAuthクライアントID」→「ウェブアプリケーション」を作成します。
5. 承認済みJavaScript生成元へ `https://migawari558.github.io` を登録します。
6. GitHubリポジトリの Settings → Secrets and variables → Actions → Variables に、`GOOGLE_CLIENT_ID`という名前でクライアントIDを登録します。
7. Actionsの「Deploy browser app」を再実行します。

ローカル確認では `.env.example` を `.env.local`へコピーし、テスト用クライアントIDを設定します。承認済みJavaScript生成元には `http://localhost:5173` も追加してください。

## 同期の仕組み

- シナリオは先にブラウザへ保存されます。
- Google接続中は、ローカル保存から約5秒後にDriveへまとめて同期します。
- Driveでは非表示のアプリ専用領域に `trpg-canvas-library-v1.json`を1つ保存します。
- 通常のマイドライブ内のファイルを読み取る権限は要求しません。
- 別端末のデータとはシナリオ単位で統合し、更新日時が新しい内容を残します。削除も同期します。
- ブラウザだけの認証では更新トークンを保存しません。認証期限が切れた場合は、利用者が「Google Driveに接続」を再度押します。

Google Drive APIの標準利用は追加料金なしですが、Googleの利用上限が適用されます。このアプリは編集のたびに送信せず、待ち時間を置いてファイル1つへまとめることでAPI呼び出しを抑えています。

公式資料：

- [Google Driveのアプリデータフォルダ](https://developers.google.com/workspace/drive/api/guides/appdata)
- [Google Identity ServicesのWeb認証](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Google Drive APIの利用上限と料金](https://developers.google.com/workspace/drive/api/guides/limits)

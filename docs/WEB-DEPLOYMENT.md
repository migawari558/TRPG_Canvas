# ブラウザ版の公開とGoogle Drive同期

ブラウザ版はGitHub Pagesへ自動配置します。`main`へ変更を送ると、`.github/workflows/pages.yml`がテスト、ビルド、公開を行います。

## Google Cloudの初期設定

Google Drive同期には、公開URLに対応するOAuth 2.0クライアントID、Google Picker用APIキー、プロジェクト番号が必要です。秘密鍵や有料サーバーは使いません。

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成します。
2. 「APIとサービス」からGoogle Drive APIとGoogle Picker APIを有効にします。
3. OAuth同意画面を設定します。要求するスコープは `https://www.googleapis.com/auth/drive.file` です。このスコープは、利用者が選んだファイルとアプリが作成したファイルだけを扱う非機密スコープです。
4. 「認証情報」から「OAuthクライアントID」→「ウェブアプリケーション」を作成します。
5. 承認済みJavaScript生成元へ `https://migawari558.github.io` を登録します。
6. 「認証情報」でAPIキーも作成します。ウェブサイト制限へ `https://migawari558.github.io/*` と `https://docs.google.com/*` を追加し、API制限をGoogle Drive APIとGoogle Picker APIに限定します。
7. IAMと管理 → 設定に表示される「プロジェクト番号」を確認します。
8. GitHubリポジトリの Settings → Secrets and variables → Actions → Variables に次の3件を登録します。
   - `GOOGLE_CLIENT_ID`: ウェブアプリ用OAuthクライアントID
   - `GOOGLE_API_KEY`: 制限を設定したPicker用APIキー
   - `GOOGLE_APP_ID`: Google Cloudのプロジェクト番号
9. Actionsの「Deploy browser app」を再実行します。

ローカル確認では `.env.example` を `.env.local`へコピーし、3件の値を設定します。OAuthの承認済みJavaScript生成元とAPIキーのウェブサイト制限には `http://localhost:5173` も追加してください。

## 同期の仕組み

- シナリオは先にブラウザへ保存されます。
- デスクトップ版は、保存先に共有ライブラリがまだない初回だけ、従来の`<ID>.trpg.json`を`trpg-canvas-library-v1.json`へまとめます。元の個別ファイルは変更せず、以後は共有ライブラリだけを保存本体として更新します。
- Web版ではGoogleへログインし、Google Pickerでこの共有ライブラリを一度選びます。
- Google接続中は、ブラウザ保存から約5秒後に共有ライブラリへ同期します。
- Web版とデスクトップ版は、どちらも同じ共有ライブラリを更新します。
- `drive.file`だけを使うため、選択していないDriveファイルは読み取りません。
- 別端末のデータとはシナリオ単位で統合し、更新日時が新しい内容を残します。削除も同期します。
- ブラウザだけの認証では更新トークンを保存しません。認証期限が切れた場合は、利用者が「Google Driveに接続」を再度押します。

Google Drive APIの標準利用は追加料金なしですが、Googleの利用上限が適用されます。このアプリは編集のたびに送信せず、待ち時間を置いてファイル1つへまとめることでAPI呼び出しを抑えています。

公式資料：

- [Google Drive APIのスコープ](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Google PickerのWeb向け設定](https://developers.google.com/workspace/drive/picker/guides/web-picker-sample)
- [Google Identity ServicesのWeb認証](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Google Drive APIの利用上限と料金](https://developers.google.com/workspace/drive/api/guides/limits)

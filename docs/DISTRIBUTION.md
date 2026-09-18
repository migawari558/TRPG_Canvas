# GitHubから配布する

## このプロジェクトの配布先

リポジトリは [migawari558/TRPG_Canvas](https://github.com/migawari558/TRPG_Canvas) です。Privateのまま運用し、招待した人だけに配布します。

1. リポジトリの **Settings → Collaborators → Add people** から、配布する相手のGitHubアカウントを招待します。
2. 相手に招待を承諾してもらいます。
3. [Releases](https://github.com/migawari558/TRPG_Canvas/releases) のURLを渡します。相手は招待されたアカウントでログインして、端末に合うファイルをダウンロードします。

下書きのReleaseは通常のダウンロード案内には使えません。ビルド結果を確認し、Publish releaseでリポジトリ内に公開してから案内してください。Privateリポジトリのままなら、Releaseを公開しても誰でもアクセスできる状態にはなりません。

個人アカウントのPrivateリポジトリでは、共同編集者の招待にソースコードの閲覧・変更権限も含まれます。アプリのダウンロードだけに権限を限定する仕組みではありません。

## 初回の準備

1. GitHubでリポジトリを作成します。誰でもReleasesから取得できるようにする場合はPublicにします。PublicではソースコードとGit履歴も公開されます。PrivateのReleasesはアクセス権を持つ人だけが利用できます。
2. ローカルのリポジトリを接続します（`OWNER/REPOSITORY` は自分のものに置き換えます）。

```powershell
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin main
```

3. GitHubのActionsで「Build desktop release」を開き、Run workflowを実行します。Windows x64、Apple Silicon Mac、Intel MacをそれぞれGitHub上で作成します。
4. 全ビルド成功後、Releasesに下書きができます。試用して説明文を整え、Publish releaseを押すと配布できます。失敗した場合は公開用の下書きを作りません。

`release/` や `node_modules/` をGitへ追加する必要はありません。シナリオデータもコミットしません。利用者へ渡すのはReleasesページのURLです。

## 次のバージョン

```powershell
npm version patch
git push origin main
git push origin --tags
```

`v0.12.1` のようなタグがpushされるとビルドが始まります。タグとpackage.jsonのバージョンが一致しない場合は停止します。公開済みの版を上書きせず、新しいバージョンを作成してください。手動実行でも同じバージョンの公開済みファイルを上書きしません。

## Macの署名・Apple公証

初期状態は試用向けのアドホック署名です。Appleによる開発元確認・公証はありません。起動時にGatekeeperの確認が出る場合があり、管理された端末では実行できないことがあります。通常配布にはApple Developer ProgramのDeveloper ID証明書での署名と公証を推奨します。

署名する場合、GitHubリポジトリのSettings → Secrets and variables → Actionsへ以下を設定します。値をソースコードに書かないでください。

| Secret | 内容 |
| --- | --- |
| `MAC_CERTIFICATE` | Developer ID Applicationのp12証明書をBase64にしたもの |
| `MAC_CERTIFICATE_PASSWORD` | p12書き出し時のパスワード |
| `APPLE_ID` | 公証に使用するApple Account |
| `APPLE_APP_SPECIFIC_PASSWORD` | Appleのアプリ用パスワード |
| `APPLE_TEAM_ID` | Developer Team ID |

証明書を設定した場合は公証用Secretsも必須です。electron-builderが署名・公証を実行します。証明書なしの場合、Mac版だけにアドホック署名の設定を適用し、Windowsには証明書を渡しません。

参考：[GitHubの実行環境](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)、[electron-builderのMac署名](https://www.electron.build/v26/docs/features/code-signing/)、[Appleの起動時の警告について](https://support.apple.com/ja-jp/102445)。

## ローカルビルド

- Windows: `npm ci` → `npm run dist:win`
- macOS: `npm ci` → `npm run dist:mac`（実行したMacのCPU向け）

Mac版のビルド・実機確認はmacOSが必要です。Windows上でMac版の起動確認はできません。GitHub Actionsの各Macジョブでは、単体テストに加えてElectronの起動復旧・保存・HTML/PDF出力を検証します。

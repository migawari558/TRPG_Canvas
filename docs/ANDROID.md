# Android試作版（codex/android-editorブランチ）

本文のライブMarkdown編集を中心にしたAndroid版です。上部左の丸いボタンから目次、右から執筆メモが開きます。上部中央で本文／フローを切り替えます。フローのカードは閲覧専用です。修飾バーはキーボード直上に配置します。

## PCで画面を試す

```powershell
npm ci
npm run dev:mobile
```

ブラウザで http://127.0.0.1:5173 を開き、開発者ツールのデバイス表示をPixelなどの幅にします。本文、目次、メモ、ファイル取込を試せます。ブラウザのファイル保存はダウンロードです。Androidのファイル選択と元ファイルへの書き込みはエミュレーター／実機で確認してください。

## Android Studioのエミュレーターで動かす

1. Android Studio、Android SDK Platform 35、SDK Build Tools、Android Emulatorをインストールします。Gradle JDKはJava 21を選びます（Android Studio付属のJDKでもバージョンを確認してください）。
2. リポジトリのルートで `npm ci` → `npm run android:sync` を実行します。
3. Android Studioでこのリポジトリの `android` フォルダを開き、Gradle Syncを待ちます。`npm run android:open` でも開けます。
4. Device ManagerでPixelなどの仮想端末を作り、`app` をRunします。
5. ソース変更後は `npm run android:sync` を実行し、Android Studioで再度Runします。

## PCと同じGoogle Driveファイルを編集する

- Android端末またはエミュレーターへGoogle Driveアプリをインストールし、PCと同じアカウントへログインします。エミュレーターはGoogle Play付きのイメージを使います。
- 一覧の「Drive・端末から開く」を押し、Androidのファイル選択画面のメニューからDriveを選択して、PCで使っている `.trpg.json` を開きます。Drive側が書き込みを提供するファイルを選んでください。
- 編集内容は端末内のIndexedDBへ自動保存します。**Driveの元ファイルへ反映するには右上の保存ボタンを押します。** 新規シナリオの初回保存では保存先を選択します。
- 通信や権限で保存に失敗した場合、端末の下書きは残ります。元ファイルが別の端末で変わっていたら、上書きを拒否します。PCとスマホで同時編集せず、Driveの同期完了後に切り替えてください。検出はDriveプロバイダーから読めた内容の比較であり、クラウド上の原子的な同時編集制御ではありません。
- アプリ内でシナリオを開き直す際、端末の下書きがある場合はどちらを開くか確認します。下書きのみにある変更を破棄する前に保存してください。
- プロバイダーの保存処理はクラウドのアップロード完了まで保証しません。Driveアプリ側でも同期状態を確認してください。
- ブラウザのデータ消去やアプリのアンインストールで端末の下書きは消えます。必要なシナリオはファイルへ保存してください。

Google Drive専用のOAuth認証／自動同期ではなく、Android標準のStorage Access Frameworkを使う試作です。Drive提供機能の実機検証は別途必要です。PC版のファイル形式とフローのデータは保持します。

## 検証

`npm run test:mobile` でスマホ幅の本文編集、左右パネル、フローの閲覧専用、修飾バー位置、下書きの再読込を確認できます。これはElectronでWeb画面を検証するテストであり、AndroidのIME・ソフトキーボード・Drive書き込みの実機検証とは別です。

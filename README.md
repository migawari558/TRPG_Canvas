# TRPG Canvas

シナリオの流れを組み立て、本文を書き、配布用のファイルに仕上げるTRPGシナリオエディタです。Windows・Mac・Androidで、シナリオごとのファイルを使って執筆できます。

**[PC版をダウンロード](https://github.com/migawari558/TRPG_Canvas/releases/latest)** · **[Android版を探す](https://github.com/migawari558/TRPG_Canvas/releases?q=android-v&expanded=true)** · **[操作ガイド](docs/wiki/Home.md)**

## できること

| やりたいこと | 機能 |
| --- | --- |
| シナリオの流れを考える | シーンをつないだフローチャート、階層グループ、情報カード、検索・タグ |
| 流れに沿って本文を書く | シーンから本文を作成・移動。Markdown記法がその場で見た目に反映されます |
| 長い原稿を整理する | 章・見出しの目次、折りたたみ、見出し単位の並べ替え、検索・置換 |
| セッション用の文章を整える | GMメモ、話者名付きセリフ、画像・サイズ変更、チェックリスト |
| 自分用のメモを残す | 本文と別の執筆メモ、シーンごとのメモ |
| 読みやすく仕上げる | ライト・ダークなどのテーマ、自作配色、文字サイズ・フォントの設定 |
| 配布する | HTML・PDF・Word・Markdownへ書き出し。PDF・Wordは用紙サイズと1段／2段組みを指定可能 |
| PCとスマホで書く | 同じ `.trpg.json` を利用。Google Driveなどを介して端末を切り替えられます |

**Android版は本文・執筆メモの編集が中心で、フローチャートは閲覧専用です。** 配布用の書き出しはPC版をご利用ください。

## インストール

[Releases](https://github.com/migawari558/TRPG_Canvas/releases)の **Assets** から、端末に合うファイルをダウンロードしてください。`Source code` は利用者向けアプリではありません。

| 端末 | 選ぶファイル | 使い始め方 |
| --- | --- | --- |
| Windows | `…windows-x64-setup.exe` | 起動してインストール |
| Windows（インストール不要） | `…windows-x64-portable.exe` | ダブルクリックで起動 |
| Mac（Mシリーズ） | `…mac-arm64.dmg` | 開いてApplicationsへドラッグ |
| Mac（Intel） | `…mac-x64.dmg` | 開いてApplicationsへドラッグ |
| Android | `android-v…` リリースの `.apk` | スマホで開いてインストール |

PC版とAndroid版はバージョン番号・配布ページが別です。更新はアプリ内の「更新を確認」から案内できます。[インストール・更新の詳細](docs/wiki/Getting-Started.md)

## 最初のシナリオを書く

1. シナリオ一覧から新規作成し、シナリオ名・システム名などを入力します。
2. PC版の「フロー」でシーンを追加し、接続点をつないで流れを作ります。グループや情報カードで構想を整理できます。
3. シーンの「本文を書く」から本文を作り、執筆します。本文から書き始めても構いません。
4. 目次で移動しながら続きを書きます。構想は「執筆メモ」に残せます。変更内容は自動保存されます。
5. PC版の「書き出す」で形式とテーマを選び、プレビューを確認して出力します。

## 操作ガイド

- [インストール・最初の操作・更新](docs/wiki/Getting-Started.md)
- [本文・Markdown・GMメモ・セリフ・画像](docs/wiki/Writing.md)
- [フローチャート・グループ・情報カード](docs/wiki/Flowchart.md)
- [保存・Google Drive・競合・旧バージョンからの移行](docs/wiki/Saving-and-Sync.md)
- [テーマ・HTML／PDF／Word書き出し](docs/wiki/Export-and-Appearance.md)
- [Androidの操作・よくある質問](docs/wiki/Android.md)

## 保存と端末間の同期

本文・フロー・執筆メモは、シナリオごとに **`<ID>.trpg.json` の1ファイル**へ保存します。PC版の保存先は「保存・同期」で確認・変更できます。

PCではGoogle Drive／Dropboxの同期フォルダを保存先に指定します。Androidでは「Drive・端末から開く」で同じファイルを選びます。新規作成時は初回だけ保存先を選んでください。その後は自動保存されます。

端末を切り替える際は同期が終わるのを待ち、シナリオを開き直してください。「保存済み」はクラウドへのアップロード完了を意味しません。同時編集で変更がぶつかった場合は「競合コピー」を保護します。[設定手順・復旧・移行の詳細](docs/wiki/Saving-and-Sync.md)

## 利用上のポイント

- GMメモはHTML・PDF・Wordにも含まれます。プレイヤーへ渡す前に内容を確認してください。
- Androidの下書きは端末内にあります。アンインストール前に必要な内容をファイルへ保存してください。
- Markdown出力は本文のみです。フロー・執筆メモごと引き継ぐ場合は `.trpg.json` をコピーしてください。
- Mac版はAppleによる署名・公証を行っていません。起動できない場合は[インストールガイド](docs/wiki/Getting-Started.md)をご確認ください。

## 開発する方へ

Node.jsを用意し、リポジトリのルートで実行します。

```powershell
npm ci
npm run dev
```

`npm run build` でビルド、`npm start` でビルド済みPCアプリを起動します。Android画面の確認は `npm run dev:mobile` を使います。これは開発用プレビューで、ブラウザ版の配布は行っていません。

React / Tiptap / React Flow / Electron / Capacitorを使用しています。変更に関連するテストを実行してください。Androidの開発は `claude/android-*` ブランチで行います。

[配布・リリース手順](docs/DISTRIBUTION.md) · [Android開発・検証](docs/ANDROID.md) · [PC更新履歴](docs/RELEASE-NOTES.md) · [Android更新履歴](docs/ANDROID-RELEASE-NOTES.md)

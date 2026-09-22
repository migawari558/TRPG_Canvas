## v0.12.11 の変更

画像を含むシナリオで文字入力や画面操作が重くなる問題を修正しました。画像のBase64データを入力のたびにMarkdown変換・JSON比較・文字数集計していた処理を、自動保存時の1回へまとめました。画像の挿入、サイズ変更、Markdown再読み込み、HTML/PDF書き出しの動作は維持しています。

## ダウンロード

| 利用する端末 | ファイル |
| --- | --- |
| Windows 64bit | `TRPG-Canvas-バージョン-windows-x64.exe` |
| Apple Silicon Mac（Mシリーズ） | `TRPG-Canvas-バージョン-mac-arm64.dmg` |
| Intel Mac | `TRPG-Canvas-バージョン-mac-x64.dmg` |

Windowsはexeを起動してください。Macはdmgを開き、TRPG CanvasをApplicationsへドラッグしてから起動してください。zip版も同じアプリを収録しています。

シナリオはアプリと別の保存先に保管されます。バージョン更新時はシナリオのフォルダを消さず、アプリのみ差し替えてください。

WindowsとMacのビルドはGitHub Actionsでテストします。Mac版はAppleによる署名・公証を行っていません。

Macの起動時に開発元の警告が出る場合は、信頼できる配布元のファイルであることを確認したうえで、[Appleの案内](https://support.apple.com/ja-jp/102445)を参照してください。

`SHA256SUMS.txt` は配布ファイルの照合用です。

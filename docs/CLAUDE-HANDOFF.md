# TRPG Canvas の Claude 向け引き継ぎ

2026年11月28日時点。Claude でこのリポジトリを開き、この資料とルートの [AGENTS.md](../AGENTS.md) を渡してください。別の環境で開く場合は、以下の未コミット作業も引き継ぐか確認してください。

## そのまま渡せる最初のメッセージ

> TRPG Canvas の開発を引き継いでください。最初に `AGENTS.md` と `docs/CLAUDE-HANDOFF.md` を読み、`git status --short --branch` と `git log -5 --oneline --decorate` で実際の状態を確認してください。既存の作業ツリーの変更を保持したうえで、私が続けて指定する作業に着手し、変更に関係するテストを実行してください。

## 現在の状態

- 作業の起点は `main`（`6f2b424`、`v1.0.1`、`android-v1.0.1`、`package.json` は `1.0.1`）。旧ブランチ `codex/desktop-design-integration`（`0.12.33`）の内容はすべて `main` に含まれています。
- `main` は Codex の作業フォルダ `.codex/worktrees/android-design-refresh` でもチェックアウトされているため、このフォルダでは `main` を直接開けない場合があります。その場合は作業ブランチを `main` から作成してください。
- Understand-Anything の設定（`.gitignore` の除外、`.understandignore`、`docs/understand-anything.md`）はこの資料と同じコミットで `main` に入れました。解析データの `.ua/` は Git の対象外で、このチェックアウトにだけあります（`65824f9` 時点の解析）。

## 開発ルール

- Android 関連の変更は別の `claude/android-*` ブランチで行う。新しく作る作業ブランチは `claude/` で始める（既存のブランチには `codex/` のものも残っている）。
- Android の作業を `main` にマージするのは、ユーザーが明示的に依頼した場合に限る。
- 変更箇所に関係するテストを実行する。通常の編集では無関係な全件テストを避ける。
- 署名鍵と認証情報を Git に入れない。ローカルの署名バックアップは無視対象の `.signing/` に置く。引き継ぎ資料やチャットにも認証情報を貼らない。
- 既存の保存データとの互換性を確認し、通常の画面操作から変更箇所を検証する。作業結果には実行したテストと未検証の項目を記載する。

## コードの入口と確認方法

TRPG Canvas はローカルで TRPG シナリオを書くアプリです。デスクトップは Electron と React、本文編集は Tiptap、フローチャートは React Flow、Android は Capacitor を使用します。

| 対象 | 最初に見る場所 | 確認方法の例 |
| --- | --- | --- |
| デスクトップの執筆・目次 | `src/App.jsx`、`src/Editor.jsx`、`src/Outline.jsx` | `npm run dev`、`npm run test:writer`、`npm run test:search` |
| フローチャート・カード | `src/Flow.jsx`、`src/flow-model.mjs` | `npm run test:flow-first`、`npm run test:hierarchy` |
| 保存・読み込み | `src/api.js`、`electron/preload.cjs`、`electron/main.cjs`、`electron/storage.cjs` | `node --test tests/workspace.test.cjs`、`npm run test:startup` |
| 書き出し | `src/ExportDialog.jsx`、`src/export.mjs`、`src/docx-export.mjs`、`electron/pdf.cjs` | `npm run test:docx`、`npm run test:pdf-pagination` |
| Android・同期 | `src/mobile/`、`android/`、`capacitor.config.json` | `npm run test:mobile`、`npm run test:mobile-sync` |

保存・読み込みや PDF 出力は Electron から確認できます。最新のコマンドは作業ブランチの [package.json](../package.json) を参照してください。機能仕様は [README.md](../README.md)、UI 方針は [PRODUCT.md](../PRODUCT.md) と [DESIGN.md](../DESIGN.md)、配布や Android の手順は [配布ガイド](DISTRIBUTION.md) と [Android ガイド](ANDROID.md) にあります。

## スキルと Claude での使い方

リポジトリ専用の Understand-Anything が現在の Windows チェックアウトに入っています。手順と導入バージョンは [Understand-Anything の導入メモ](understand-anything.md) を参照してください。

| やりたいこと | 対応するスキル |
| --- | --- |
| コード全体の解析、グラフの表示 | `understand`、`understand-dashboard` |
| コードへの質問、特定機能の解説、初回案内 | `understand-chat`、`understand-explain`、`understand-onboard` |
| Git 差分の影響調査、業務フローの把握 | `understand-diff`、`understand-domain` |
| Figma やナレッジベースの解析 | `understand-figma`、`understand-knowledge` |

同じチェックアウトを使う場合は、必要に応じて `.agents/skills/understand*/SKILL.md` を読み、`.ua/knowledge-graph.json` を参照できます。グラフの対象コミットは `.ua/meta.json` で確認し、作業ブランチと異なる場合は実コードで確認してください。スキルへのジャンクションと本体はローカルにあるため、別のクローンでは再導入が必要です。Codex の `$understand` などの呼び出しや、ホスト側の UI・画像・資料作成スキルを Claude で使う場合は、Claude 側の環境に合わせて設定してください。プロジェクトを進めるための開発ルールと参照先はこの資料とリポジトリ内にあります。

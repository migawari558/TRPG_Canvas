# Understand-Anything

Egonex-AI の [Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) を、このチェックアウト専用の Codex スキルとして導入しています。

## 使い方

このプロジェクトの Codex チャットで、次のように依頼します。

```text
$understand --language ja
```

初回解析が完了したら、次のコマンドでグラフを表示できます。

```text
$understand-dashboard
```

質問は `$understand-chat`、変更の影響調査は `$understand-diff` で実行できます。スキルが候補に出ない場合はプロジェクトを開き直してください。

解析結果は `.ua/` に生成されます。`.ua/` は Git の対象外で、チェックアウトごとに解析します。対象除外は `.understandignore` に定義しています。

## ローカル構成

- 本体: `.tools/understand-anything/`
- スキル: `.agents/skills/understand*` から本体への Windows ジャンクション
- 導入時のコミット: `5338971c07a560c5fb6b26d85ad348b01315e2da`
- 本体のバージョン: `2.9.8`

本体とジャンクションは Git 管理対象外です。別のチェックアウトには引き継がれません。アプリ本体の npm 依存には追加していません。

スキル内の Bash コマンドを Windows で実行するときは PowerShell 相当に読み替え、本体のルートとして `.tools/understand-anything/understand-anything-plugin` を使用します。

## 更新

プロジェクトのルートから PowerShell で実行します。

```powershell
git -C .tools/understand-anything pull --ff-only
Push-Location .tools/understand-anything
pnpm install --frozen-lockfile
pnpm --filter @understand-anything/core build
Pop-Location
```

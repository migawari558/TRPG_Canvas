# Development workflow

- Develop Android-related changes on a separate `codex/android-*` branch.
- Merge Android work into `main` only when the user explicitly asks to merge it.
- Run tests related to the changes; avoid unrelated full test runs during routine edits.
- Keep signing keys and credentials out of Git. Local signing backups belong in the ignored `.signing/` directory.

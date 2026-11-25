# Development workflow

- Develop Android-related changes on a separate `codex/android-*` branch.
- Merge Android work into `main` only when the user explicitly asks to merge it.
- Run tests related to the changes; avoid unrelated full test runs during routine edits.
- Keep signing keys and credentials out of Git. Local signing backups belong in the ignored `.signing/` directory.
- With every release, review and update the relevant user guides in `docs/wiki/` to match the shipped behavior. Publish the Wiki from those sources, and verify that publication succeeded.
- Release descriptions must include only the target version's changes. Use `scripts/release-notes.cjs`; keep earlier changes in the history files and link to them instead of copying the entire history.

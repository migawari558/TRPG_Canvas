const fs = require('node:fs');

function releaseNotes(markdown, tag) {
  if (!/^(?:android-)?v\d+\.\d+\.\d+$/.test(tag)) throw new Error('Invalid release tag');
  const version = tag.replace(/^android-/, '');
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  // Match complete version tokens, including headings such as "v0.12.33 の変更".
  const index = lines.findIndex(line => /^#{1,2} /.test(line) &&
    line.match(/(?:^|\s)(v\d+\.\d+\.\d+)(?=\s|$)/)?.[1] === version);
  if (index < 0) throw new Error(`No release notes found for ${tag}`);
  let end = index + 1;
  while (end < lines.length && !/^#{1,2} /.test(lines[end])) end++;
  const section = lines.slice(index, end).join('\n').trim();
  return `${section}\n\n[操作ガイド](https://github.com/migawari558/TRPG_Canvas/wiki) · [過去の更新](https://github.com/migawari558/TRPG_Canvas/releases)\n`;
}

if (require.main === module) {
  const tag = process.argv[2];
  const source = tag?.startsWith('android-') ? 'docs/ANDROID-RELEASE-NOTES.md' : 'docs/RELEASE-NOTES.md';
  const notes = releaseNotes(fs.readFileSync(source, 'utf8'), tag);
  if (process.argv[3]) fs.writeFileSync(process.argv[3], notes);
  else process.stdout.write(notes);
}
module.exports = { releaseNotes };

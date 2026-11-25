const test = require('node:test');
const assert = require('node:assert/strict');
const { releaseNotes } = require('../scripts/release-notes.cjs');

test('release description selects the exact version and excludes history and download footer', () => {
  const source = '## v1.2.30 の変更\n\n- new\n\n## v1.2.3 の変更\n\n- target\n\n## ダウンロード\nfiles';
  const notes = releaseNotes(source, 'v1.2.3');
  assert.match(notes, /target/);
  assert.doesNotMatch(notes, /new|files|v1\.2\.30/);
  assert.match(notes, /操作ガイド/);
  assert.throws(() => releaseNotes(source, 'v9.9.9'), /No release notes/);
});

test('Android notes preserve upgrade instructions and exclude previous versions', () => {
  const notes = releaseNotes('# Android v0.1.2\n\n- current\n\n上書きできます。\n\n## Android v0.1.1\n\n- old', 'android-v0.1.2');
  assert.match(notes, /current/);
  assert.match(notes, /上書き/);
  assert.doesNotMatch(notes, /old|## Android v0\.1\.1/);
});

test('Wiki publisher checks local links and converts them for GitHub Wiki', () => {
  const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
  const { renderWiki } = require('../scripts/publish-wiki.cjs');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'trpg-wiki-'));
  const source = path.join(temporary, 'source'), output = path.join(temporary, 'output');
  fs.mkdirSync(source);
  try {
    fs.writeFileSync(path.join(source, 'Home.md'), '[本文](Writing.md#memo) [外部](https://example.com/a.md)');
    fs.writeFileSync(path.join(source, 'Writing.md'), '# 本文');
    renderWiki(source, output);
    assert.equal(fs.readFileSync(path.join(output, 'Home.md'), 'utf8'), '[本文](Writing#memo) [外部](https://example.com/a.md)');
    fs.writeFileSync(path.join(source, 'Home.md'), '[不明](Missing.md)');
    assert.throws(() => renderWiki(source, output), /Broken Wiki link/);
  } finally {
    if (!path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Invalid temporary path');
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

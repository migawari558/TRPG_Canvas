const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const storage = require('../electron/storage.cjs');
const heading = (text, level = 2) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
const paragraph = text => ({ type: 'paragraph', content: [{ type: 'text', text }] });
test('section moves preserve nested headings and body, and undo by inverse move', async () => {
  const { moveSection } = await import('../src/model.mjs');
  const content = { type: 'doc', content: [paragraph('preamble'), heading('A'), paragraph('A body'), heading('A child', 3), paragraph('child body'), heading('B'), paragraph('B body')] };
  const moved = moveSection(content, 1, 1);
  assert.deepEqual(moved.content, [content.content[0], ...content.content.slice(5), ...content.content.slice(1, 5)]);
  assert.deepEqual(moveSection(moved, 3, -1), content);
  assert.equal(moveSection(content, 3, 1), content);
  assert.equal(moveSection(content, 1, -1), content);
});
test('nested sections move within their parent, empty headings have valid positions', async () => {
  const { moveSection, outline } = await import('../src/model.mjs');
  const content = { type: 'doc', content: [heading('A'), heading('child 1', 3), paragraph('one'), heading('child 2', 3), paragraph('two'), heading('B')] };
  const result = moveSection(content, 1, 1);
  assert.equal(result.content[1].content[0].text, 'child 2');
  assert.equal(moveSection(content, 1, -1), content);
  assert.equal(outline({ content: [{ type: 'paragraph' }, heading('A')] })[0].pos, 2);
});
test('storage roundtrip, conflict preservation, list and path validation', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-test-'));
  try {
    const { newDocument } = await import('../src/model.mjs');
    const doc = newDocument('Test');
    doc.content = { type: 'doc', content: [paragraph('本文'), { type: 'image', attrs: { src: `data:image/png;base64,${'A'.repeat(100000)}`, alt: 'large' } }] };
    doc.markdown = `本文\n\n![large](data:image/png;base64,${'A'.repeat(100000)})`;
    const initial = await storage.save(folder, doc, null);
    assert.deepEqual((await storage.read(folder, doc.id)).doc, doc);
    assert.equal((await fs.stat(storage.libraryPath(folder))).isFile(), true);
    await assert.rejects(fs.stat(storage.filePath(folder, doc.id)), error => error.code === 'ENOENT');
    const external = await storage.save(folder, { ...doc, title: 'Remote' }, initial.revision);
    const conflict = await storage.save(folder, { ...doc, title: 'Local' }, initial.revision);
    assert.equal(conflict.conflict, true);
    assert.notEqual(conflict.doc.id, doc.id);
    assert.equal((await storage.read(folder, doc.id)).doc.title, 'Remote');
    assert.equal((await storage.read(folder, conflict.doc.id)).doc.title, 'Local（競合コピー）');
    const listed = (await storage.list(folder)).documents;
    assert.equal(listed.length, 2);
    assert.ok(listed.every(item => item.characterCount === 2), 'character count must not scan or count embedded image data');
    assert.throws(() => storage.filePath(folder, '../escape'));
    assert.throws(() => storage.validate({ ...doc, flow: { nodes: [{ id: 'bad', position: { x: '<script>', y: 0 }, data: { label: 'bad' } }], edges: [] } }));
    await storage.remove(folder, doc.id, external.revision);
    assert.equal((await storage.list(folder)).documents.some(item => item.id === doc.id), false);
    assert.equal((await storage.listTrash(folder))[0].title, 'Remote');
    await storage.restore(folder, doc.id);
    assert.equal((await storage.read(folder, doc.id)).doc.title, 'Remote');
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
});
test('desktop migrates legacy scenario files to the shared library without removing originals', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-migration-'));
  try {
    const { newDocument } = await import('../src/model.mjs');
    const first = newDocument('既存シナリオA'), second = newDocument('既存シナリオB');
    first.updatedAt = '2026-10-01T00:00:00Z'; second.updatedAt = '2026-10-02T00:00:00Z';
    await fs.writeFile(storage.filePath(folder, first.id), JSON.stringify(first, null, 2));
    await fs.writeFile(storage.filePath(folder, second.id), JSON.stringify(second, null, 2));
    await fs.writeFile(path.join(folder, 'broken.trpg.json'), '{');
    const listed = await storage.list(folder);
    assert.deepEqual(listed.documents.map(item => item.title), ['既存シナリオB', '既存シナリオA']);
    assert.deepEqual(listed.errors, ['broken.trpg.json']);
    const libraryFile = storage.libraryPath(folder);
    const library = JSON.parse(await fs.readFile(libraryFile, 'utf8'));
    assert.equal(Object.keys(library.documents).length, 2);
    assert.equal((await fs.stat(storage.filePath(folder, first.id))).isFile(), true);
    library.documents[first.id].doc = { ...first, title: 'Web更新', updatedAt: '2026-10-03T00:00:00Z' };
    await fs.writeFile(libraryFile, JSON.stringify(library, null, 2));
    assert.equal((await storage.read(folder, first.id)).doc.title, 'Web更新');
    const saved = await storage.save(folder, { ...library.documents[first.id].doc, title: '移行後の更新', updatedAt: '2026-10-04T00:00:00Z' }, library.documents[first.id].revision);
    assert.equal(saved.conflict, false);
    assert.equal(JSON.parse(await fs.readFile(storage.filePath(folder, first.id), 'utf8')).title, '既存シナリオA');
    await fs.writeFile(storage.filePath(folder, first.id), JSON.stringify({ ...first, title: '個別ファイル側の変更' }, null, 2));
    assert.equal((await storage.read(folder, first.id)).doc.title, '移行後の更新');
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
});
test('character count treats image nodes and markdown images as zero characters', async () => {
  const { characterCount } = await import('../src/model.mjs');
  const image = { type: 'image', attrs: { src: `data:image/png;base64,${'A'.repeat(100000)}`, alt: '数えない代替文字' } };
  assert.equal(characterCount({ content: { type: 'doc', content: [paragraph('本文'), image] }, flow: { nodes: [{ data: { label: '場面', memo: '本文外のシーンメモ' } }], edges: [] } }), 2);
  assert.equal(characterCount({ markdown: `本文\n\n![数えない代替文字](data:image/png;base64,${'A'.repeat(100000)} "width=50")` }), 2);
  assert.equal(characterCount({ markdown: `本文\n<img alt="数えない" src="data:image/png;base64,${'A'.repeat(100000)}">` }), 2);
});
test('HTML escapes executable input, includes optional copy controls and flow', async () => {
  const { exportHtml } = await import('../src/export.mjs');
  const { sampleDocument } = await import('../src/model.mjs');
  const doc = sampleDocument();
  doc.title = '<img src=x onerror=alert(1)>';
  doc.markdown += '\n<script>alert(1)</script>\n\n[x](javascript:alert(1))';
  doc.flow.nodes[0].data.label = '</text><script>alert(1)</script>';
  const html = exportHtml(doc);
  assert.ok(html.includes('class="copy-button"'));
  assert.ok(html.includes('<svg'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  const plain = exportHtml(doc, { copyButtons: false, includeFlow: false });
  assert.ok(!plain.includes('<script>'));
  assert.ok(!plain.includes('<svg'));
  assert.ok(!plain.includes('class="copy-button"'));
});

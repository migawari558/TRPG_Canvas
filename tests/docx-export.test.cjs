const test = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');

test('Word export creates editable styled OOXML with page size and columns', async () => {
  const { exportDocx } = await import('../src/docx-export.mjs');
  const doc = {
    title: 'Word書き出しテスト', systemName: 'テストシステム', subtitle: '編集可能なシナリオ',
    flow: { nodes: [], edges: [] },
    content: { type: 'doc', content: [
      { type: 'heading', attrs: { level: 0 }, content: [{ type: 'text', text: '第一章' }] },
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '導入' }] },
      { type: 'paragraph', content: [
        { type: 'text', text: '太字', marks: [{ type: 'bold' }] }, { type: 'text', text: 'と' },
        { type: 'text', text: '斜体', marks: [{ type: 'italic' }] }, { type: 'hardBreak' },
        { type: 'text', text: '下線', marks: [{ type: 'underline' }] }
      ] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '手掛かり' }] }] }] },
      { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '確認済み' }] }] }] },
      { type: 'gmNote', content: [{ type: 'paragraph', content: [{ type: 'text', text: '秘密の情報' }] }] },
      { type: 'dialogue', attrs: { speaker: 'コレット' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'こちらを見て。' }] }] }
    ] }
  };
  const bytes = await exportDocx(doc, { theme: 'forest', fontSize: 14, fontFamily: 'BIZ UDPGothic', columns: 2, pdfPageSize: 'A5', includeFlow: false });
  assert.deepEqual([...bytes.slice(0, 2)], [0x50, 0x4b]);
  const zip = await JSZip.loadAsync(bytes), xml = await zip.file('word/document.xml').async('string'), styles = await zip.file('word/styles.xml').async('string');
  for (const text of ['Word書き出しテスト', 'テストシステム / SCENARIO', '第一章', '導入', '太字', '斜体', '下線', '手掛かり', '確認済み', 'GM MEMO', '秘密の情報', 'コレット', 'こちらを見て。']) assert.ok(xml.includes(text), text);
  assert.match(xml, /<w:cols[^>]*w:num="2"/);
  assert.match(xml, /<w:pgSz[^>]*w:w="8391"[^>]*w:h="11906"/);
  assert.ok(xml.includes('<w:tbl>'));
  assert.ok(xml.includes('<w:b/>'));
  assert.ok(xml.includes('<w:i/>'));
  assert.match(xml, /<w:u[^>]*w:val="single"/);
  assert.ok(styles.includes('BIZ UDPGothic'));
  assert.match(styles, /<w:sz[^>]*w:val="21"/);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');

test('GM note Markdown renders rich text without exposing its marker', async () => {
  const { markdown, exportHtml } = await import('../src/export.mjs');
  const { gmNoteToMarkdown } = await import('../src/gm-markdown.mjs');
  const { newDocument } = await import('../src/model.mjs');
  const body = '**秘密の手がかり**\n\n- 証拠を見つけたら開示\n- 判定に失敗しても進行';
  const source = gmNoteToMarkdown(body);
  const html = markdown.render(source);
  assert.ok(html.includes('<aside data-gm-note="true" class="gm-note">'));
  assert.ok(html.includes('<strong>秘密の手がかり</strong>'));
  assert.ok(html.includes('<li>証拠を見つけたら開示</li>'));
  assert.ok(!html.includes('[!GM]'));
  assert.equal((html.match(/<aside /g) || []).length, (html.match(/<\/aside>/g) || []).length);
  const exported = exportHtml(newDocument('GMテスト', source));
  assert.ok(exported.includes('repeating-linear-gradient'));
  assert.ok(exported.includes('class="gm-note"'));
});

test('normal quotations and literal code are not changed into notes; note input stays escaped', async () => {
  const { markdown } = await import('../src/export.mjs');
  assert.ok(markdown.render('> 普通の読み上げ文').includes('<blockquote>'));
  assert.ok(!markdown.render('```\n> [!GM]\n```').includes('<aside'));
  const html = markdown.render('> [!GM]\n> <script>alert(1)</script>\n>\n> > 入れ子の引用\n\n本文');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('<blockquote>'));
  assert.ok(html.indexOf('</blockquote>') < html.indexOf('</aside>'));
  assert.ok(html.includes('</aside>\n<p>本文</p>'));
});

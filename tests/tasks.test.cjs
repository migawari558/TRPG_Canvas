const test=require('node:test'),assert=require('node:assert/strict');
test('task Markdown supports nesting and GM notes without converting normal bullets or literal code',async()=>{
 const {markdown}=await import('../src/export.mjs');
 const text='- [ ] 未完了\n- [x] 完了\n  - [X] 子項目\n- 通常項目\n\n> [!GM]\n>\n> - [ ] 秘密の確認\n\n```\n- [x] 記法の例\n```\n\n- [ ] <script>alert(1)</script>';
 const html=markdown.render(text);assert.equal((html.match(/type="checkbox"/g)||[]).length,5);assert.equal((html.match(/data-checked="true"/g)||[]).length,2);assert.ok(html.includes('<li>通常項目</li>'));assert.ok(html.includes('<code>- [x] 記法の例'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('data-gm-note="true"'));
});

test('bare brackets import as tasks while fenced and indented code stays literal',async()=>{
 const {markdown}=await import('../src/export.mjs');
 const source='[] 未完了\n[x] 完了\n\n:::gm\n[] GMの確認\n:::\n\n```\n[] コード\n```\n\n    [] 字下げコード';
 const html=markdown.render(source);
 assert.equal((html.match(/type="checkbox"/g)||[]).length,3);
 assert.equal((html.match(/data-checked="true"/g)||[]).length,1);
 assert.ok(html.includes('<code>[] コード'));
 assert.ok(html.includes('<code>[] 字下げコード'));
 assert.ok(html.includes('data-gm-note="true"'));
});

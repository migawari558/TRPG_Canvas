const test=require('node:test'),assert=require('node:assert/strict');
test('simple GM fences support lists, blank lines and legacy notes while code stays literal',async()=>{
 const {markdown}=await import('../src/export.mjs'),{gmNoteToMarkdown}=await import('../src/gm-markdown.mjs');
 const text=gmNoteToMarkdown('秘密\n\n<!-- trpg-blank -->\n\n- [x] 済み');const html=markdown.render(text);assert.match(text,/:::gm/);assert.match(html,/<aside/);assert.match(html,/blank-line/);assert.match(html,/data-type="taskItem"/);assert.match(markdown.render('> [!GM]\n> 昔のメモ'),/<aside/);assert.doesNotMatch(markdown.render('```\n:::gm\ntext\n:::\n```'),/<aside/);
});
test('HTML uses structured text so italic transitions, hard breaks and blank paragraphs survive',async()=>{
 const {exportHtml}=await import('../src/export.mjs');const html=exportHtml({title:'Test',markdown:'lossy',writingNotes:'PRIVATE',flow:{nodes:[],edges:[]},content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Italic',marks:[{type:'italic'}]},{type:'hardBreak'},{type:'hardBreak'},{type:'text',text:'Upright'}]},{type:'paragraph'},{type:'paragraph',content:[{type:'text',text:'<script>'}]}]}});
 assert.match(html,/<em>Italic<\/em><br><br>Upright/);assert.match(html,/<p class="blank-line"><\/p>/);assert.ok(!html.includes('PRIVATE'));assert.ok(!html.includes('lossy'));assert.ok(html.includes('&lt;script&gt;'));
});

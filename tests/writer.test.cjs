const test=require('node:test'),assert=require('node:assert/strict');
test('simple GM fences support lists, blank lines and legacy notes while code stays literal',async()=>{
 const {markdown}=await import('../src/export.mjs'),{gmNoteToMarkdown}=await import('../src/gm-markdown.mjs');
 const text=gmNoteToMarkdown('秘密\n\n<!-- trpg-blank -->\n\n- [x] 済み');const html=markdown.render(text);assert.match(text,/:::gm/);assert.match(html,/<aside/);assert.match(html,/blank-line/);assert.match(html,/data-type="taskItem"/);assert.match(markdown.render('> [!GM]\n> 昔のメモ'),/<aside/);assert.doesNotMatch(markdown.render('```\n:::gm\ntext\n:::\n```'),/<aside/);
});
test('HTML uses structured text so italic transitions, hard breaks and blank paragraphs survive',async()=>{
 const {exportHtml}=await import('../src/export.mjs');const html=exportHtml({title:'Test',markdown:'lossy',writingNotes:'PRIVATE',flow:{nodes:[],edges:[]},content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Italic',marks:[{type:'italic'}]},{type:'hardBreak'},{type:'hardBreak'},{type:'text',text:'Upright'}]},{type:'paragraph'},{type:'paragraph',content:[{type:'text',text:'<script>'}]}]}});
 assert.match(html,/<em>Italic<\/em><br><br>Upright/);assert.match(html,/<p class="blank-line"><\/p>/);assert.ok(!html.includes('PRIVATE'));assert.ok(!html.includes('lossy'));assert.ok(html.includes('&lt;script&gt;'));
});
test('dialogue Markdown preserves its speaker and renders the two-column dialogue layout',async()=>{
 const {markdown,exportHtml}=await import('../src/export.mjs'),{dialogueToMarkdown}=await import('../src/dialogue-markdown.mjs');
 const source=dialogueToMarkdown('コレット','ダーリン、こちらの方々を見て。\n\n**ご挨拶**でもしましょう。');
 const rendered=markdown.render(source);assert.match(source,/:::dialogue コレット/);assert.match(rendered,/data-speaker="コレット"/);assert.match(rendered,/<strong>ご挨拶<\/strong>/);
 const doc={title:'会話',markdown:'',flow:{nodes:[],edges:[]},content:{type:'doc',content:[{type:'dialogue',attrs:{speaker:'コレット'},content:[{type:'paragraph',content:[{type:'text',text:'本文'}]}]}]}};
 const html=exportHtml(doc,{includeFlow:false});assert.match(html,/class="dialogue"/);assert.match(html,/class="dialogue-speaker"[^>]*>コレット/);assert.match(html,/grid-template-columns/);
 assert.doesNotMatch(markdown.render(':::dialogue <script>\n危険\n:::'),/<script>/);
});

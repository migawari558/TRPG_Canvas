const test=require('node:test'),assert=require('node:assert/strict');
test('chapters are parents of H1, move with descendants and keep flow groups and export anchors',async()=>{
 const {outline,moveSection}=await import('../src/model.mjs'),{markdown,exportHtml}=await import('../src/export.mjs'),{groupByHeadings}=await import('../src/flow-model.mjs');
 const heading=(level,text)=>({type:'heading',attrs:{level,headingId:text},content:[{type:'text',text}]}),content={type:'doc',content:[heading(0,'第一章'),heading(1,'場面'),heading(2,'詳細'),heading(0,'第二章'),heading(1,'結末')]};
 const headings=outline(content);assert.deepEqual(headings.map(h=>h.level),[0,1,2,0,1]);assert.equal(headings[1].parentId,'第一章');assert.equal(headings[4].parentId,'第二章');
 assert.deepEqual(outline(moveSection(content,0,1)).map(h=>h.text),['第二章','結末','第一章','場面','詳細']);assert.equal(moveSection(content,1,1),content);
 const flow=groupByHeadings({nodes:[],edges:[]},headings);const chapter=flow.nodes.find(n=>n.data.headingId==='第一章'),scene=flow.nodes.find(n=>n.data.headingId==='場面');assert.equal(scene.parentId,chapter.id);
 const doc={title:'Test',markdown:'#! 第一章\n\n# 場面\n\n本文\n\n## 詳細\n\n#! 第二章\n\n# 結末',content,flow};const html=exportHtml(doc);assert.match(html,/<h1 data-chapter="" class="chapter-heading" id="section-0">第一章/);assert.match(html,/<h1 id="section-1">場面/);assert.match(html,/href="#section-0"/);
 assert.match(markdown.render('```\n#! literal\n```'),/<code>#! literal/);assert.doesNotMatch(markdown.render('    #! code'),/data-chapter/);assert.match(markdown.render('#! <img src=x>'),/&lt;img/);
});

const test=require('node:test'),assert=require('node:assert/strict');
test('scene generation uses H1 groups and H2 scenes, including empty groups and chapters',async()=>{
 const {outline}=await import('../src/model.mjs'),{scenesFromHeadings,removeFlowSelection,absolutePosition}=await import('../src/flow-model.mjs');
 const heading=(id,level)=>({type:'heading',attrs:{headingId:id,level},content:[{type:'text',text:id}]}),headings=outline({content:[heading('chapter',0),heading('group',1),heading('scene',2),heading('detail',3),heading('empty',1)]});
 const flow=scenesFromHeadings({nodes:[],edges:[]},headings);assert.equal(flow.nodes.length,4);assert.equal(flow.nodes.find(n=>n.data.headingId==='empty').type,'sceneGroup');assert.equal(flow.nodes.find(n=>n.data.headingId==='scene').type,'scene');assert.deepEqual(scenesFromHeadings(flow,headings),flow);
 const scene=flow.nodes.find(n=>n.data.headingId==='scene'),parents=flow.nodes.filter(n=>n.type==='sceneGroup').map(n=>n.id),pos=absolutePosition(scene,flow.nodes);flow.edges=[{id:'edge',source:parents[0],target:scene.id}];
 const removed=removeFlowSelection(flow,parents);assert.equal(removed.nodes.length,1);assert.equal(removed.nodes[0].parentId,undefined);assert.deepEqual(removed.nodes[0].position,pos);assert.equal(removed.edges.length,0);assert.equal(flow.nodes.length,4);
});
test('export preserves explicit blank lines, limits contents to H2 and gives every heading an anchor',async()=>{
 const {markdown,exportHtml}=await import('../src/export.mjs');
 const source='#! Chapter\n\n# Group\n\n## Scene\n\nBefore\n\n<!-- trpg-blank -->\n\n<!-- trpg-blank -->\n\nAfter\n\n### Detail';
 const html=exportHtml({title:'Test',markdown:source,flow:{nodes:[],edges:[]}}),toc=html.match(/<nav[\s\S]*?<\/nav>/)[0];
 assert.equal((html.match(/<p class="blank-line">/g)||[]).length,2);assert.equal((toc.match(/<a /g)||[]).length,3);assert.ok(!toc.includes('Detail'));assert.match(html,/<h3 id="section-3">Detail/);assert.doesNotMatch(markdown.render('```\n<!-- trpg-blank -->\n```'),/class="blank-line"/);
});

const test=require('node:test'),assert=require('node:assert/strict');
test('flow-first writing preserves manuscript and reuses IDs, including duplicate scene names',async()=>{
 const {writeFlowScene}=await import('../src/flow-model.mjs');
 const flow={nodes:['a','b'].map(id=>({id,type:'scene',position:{x:0,y:0},data:{label:'同じ名前'}})),edges:[]};
 const content={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'既存本文'}]}]};
 const first=writeFlowScene(content,flow,'a');assert.deepEqual(first.content.content[0],content.content[0]);assert.equal(first.content.content.length,3);
 const again=writeFlowScene(first.content,first.flow,'a');assert.equal(again.created,false);assert.equal(again.content,first.content);
 const second=writeFlowScene(first.content,first.flow,'b');assert.notEqual(first.headingId,second.headingId);assert.equal(second.content.content.length,5);
 const restored=writeFlowScene(content,first.flow,'a');assert.equal(restored.created,true);assert.notEqual(restored.headingId,first.headingId);
});
test('manual groups prevent cycles, preserve edges and release scenes without data loss',async()=>{
 const {moveToGroup,canJoinGroup,removeFlowNode,absolutePosition}=await import('../src/flow-model.mjs');
 const flow={nodes:[{id:'s',type:'scene',position:{x:500,y:100},data:{label:'scene',headingId:'h'}},{id:'g',type:'sceneGroup',position:{x:100,y:100},style:{width:400,height:300},data:{label:'group'}},{id:'nested',type:'sceneGroup',position:{x:800,y:100},style:{width:400,height:300},data:{label:'nested'}}],edges:[{id:'edge',source:'s',target:'nested'}]};
 const original=JSON.stringify(flow);const grouped=moveToGroup(moveToGroup(flow,'nested','g'),'s','nested');
 assert.equal(JSON.stringify(flow),original);assert.equal(canJoinGroup(grouped,'g','nested'),false);assert.equal(canJoinGroup(grouped,'g','g'),false);
 assert.ok(grouped.nodes.findIndex(n=>n.id==='g')<grouped.nodes.findIndex(n=>n.id==='nested'));assert.equal(grouped.nodes.find(n=>n.id==='s').data.headingId,'h');
 const pos=absolutePosition(grouped.nodes.find(n=>n.id==='s'),grouped.nodes);const released=moveToGroup(grouped,'s','');assert.deepEqual(released.nodes.find(n=>n.id==='s').position,pos);assert.deepEqual(released.edges,flow.edges);
 assert.deepEqual(removeFlowNode(grouped,'nested').nodes.find(n=>n.id==='s').position,pos);
});
test('dropping a scene into nested groups chooses the deepest group and preserves its canvas position',async()=>{
 const {dropIntoGroup,absolutePosition}=await import('../src/flow-model.mjs');
 const flow={nodes:[
  {id:'outer',type:'sceneGroup',position:{x:100,y:80},style:{width:600,height:500},data:{label:'outer'}},
  {id:'inner',type:'sceneGroup',parentId:'outer',position:{x:180,y:120},style:{width:320,height:260},data:{label:'inner'}},
  {id:'scene',type:'scene',position:{x:340,y:250},data:{label:'scene'}}
 ],edges:[]};
 const dropped=dropIntoGroup(flow,'scene'),scene=dropped.nodes.find(node=>node.id==='scene');
 assert.equal(scene.parentId,'inner');
 assert.deepEqual(scene.position,{x:60,y:50});
 assert.deepEqual(absolutePosition(scene,dropped.nodes),{x:340,y:250});
 assert.ok(dropped.nodes.indexOf(dropped.nodes.find(node=>node.id==='inner'))<dropped.nodes.indexOf(scene));
 assert.equal(dropIntoGroup(dropped,'outer'),dropped,'a group cannot be dropped into its descendant');
 const outside={...flow,nodes:flow.nodes.map(node=>node.id==='scene'?{...node,position:{x:800,y:700}}:node)};
 assert.equal(dropIntoGroup(outside,'scene'),outside,'dropping outside a group does not change membership');
});

const test = require('node:test'), assert = require('node:assert/strict');
test('automatic nested group bounds shrink and preserve every scene position', async () => {
 const {fitFlowGroups, absolutePosition} = await import('../src/flow-model.mjs');
 const flow = {nodes:[
 {id:'outer',type:'sceneGroup',position:{x:20,y:40},style:{width:2000,height:2000}},
 {id:'inner',type:'sceneGroup',parentId:'outer',position:{x:60,y:120},style:{width:1000,height:1000}},
 {id:'a',type:'scene',parentId:'inner',position:{x:-40,y:-20},measured:{width:260,height:155}},
 {id:'b',type:'scene',parentId:'inner',position:{x:360,y:400},measured:{width:260,height:300}}
 ],edges:[]};
 const original = JSON.stringify(flow);
 const next=fitFlowGroups(flow);
 for (const id of ['a','b']) assert.deepEqual(absolutePosition(next.nodes.find(n=>n.id===id),next.nodes),absolutePosition(flow.nodes.find(n=>n.id===id),flow.nodes));
 assert.equal(JSON.stringify(flow),original);
 assert.deepEqual(fitFlowGroups(next),next);
 const small=fitFlowGroups({...next,nodes:next.nodes.filter(n=>n.id!=='b')});
 for(const id of ['inner','outer']) assert.ok(small.nodes.find(n=>n.id===id).style.height<next.nodes.find(n=>n.id===id).style.height);
 assert.ok(next.nodes.find(n=>n.id==='a').position.y>=100);
});
test('grid snapping supports negative coordinates and empty groups remain usable', async()=>{
 const {snapFlowPosition,fitFlowGroups}=await import('../src/flow-model.mjs');
 assert.deepEqual(snapFlowPosition({x:31,y:-31}),{x:40,y:-40});
 const group=fitFlowGroups({nodes:[{id:'g',type:'sceneGroup',position:{x:0,y:0},style:{width:900,height:900}}],edges:[]}).nodes[0];
 assert.deepEqual(group.style,{width:320,height:200});
});
test('collapsed groups project external branches without rewriting saved endpoints', async()=>{
 const {projectFlowGroups}=await import('../src/flow-model.mjs');
 const flow={nodes:[
 {id:'g',type:'sceneGroup',position:{x:0,y:0},style:{width:700,height:600},data:{collapsed:true}},
 {id:'nested',type:'sceneGroup',parentId:'g',position:{x:20,y:100},data:{collapsed:true}},
 {id:'a',type:'scene',parentId:'nested',position:{x:20,y:100},data:{}},
 {id:'b',type:'scene',parentId:'g',position:{x:400,y:100},data:{}},
 {id:'out',type:'scene',position:{x:900,y:0},data:{}}
 ],edges:[{id:'internal',source:'a',target:'b'},{id:'one',source:'a',target:'out',label:'成功'},{id:'two',source:'b',target:'out',label:'失敗'}]};
 const original=JSON.stringify(flow),view=projectFlowGroups(flow);
 assert.equal(JSON.stringify(flow),original);
 assert.equal(view.nodes.find(n=>n.id==='a').hidden,true);
 assert.equal(view.edges[0].hidden,true);
 assert.equal(view.edges[1].source,'g'); assert.equal(view.edges[1].label,'成功');
 assert.equal(view.edges[2].id,'two'); assert.notEqual(view.edges[1].data.offset,view.edges[2].data.offset); assert.equal(view.nodes[0].style.width,320);
 const expanded=projectFlowGroups({...flow,nodes:flow.nodes.map(n=>({...n,data:{...n.data,collapsed:false}}))});
 assert.ok(expanded.nodes.every(n=>!n.hidden));
 assert.equal(expanded.edges[1].source,'a'); assert.equal(expanded.nodes[0].style.width,700);
});
test('scene search matches normalized names, notes and tags and combines tag filters',async()=>{
 const {searchFlowNodes}=await import('../src/flow-model.mjs');
 const flow={nodes:[{id:'a',data:{label:'ＮＰＣの部屋',memo:'地図を渡す',tags:['必須情報']}},{id:'b',data:{label:'庭園',memo:'地図の断片',tags:['任意イベント']}}]};
 assert.deepEqual(searchFlowNodes(flow,'npc 地図').map(n=>n.id),['a']);
 assert.deepEqual(searchFlowNodes(flow,'地図','任意イベント').map(n=>n.id),['b']);
 assert.deepEqual(searchFlowNodes(flow,'必須情報').map(n=>n.id),['a']);
 assert.equal(searchFlowNodes(flow,'見つからない').length,0);
});
test('a single card has equal group padding without a forced minimum width',async()=>{
 const {fitFlowGroups}=await import('../src/flow-model.mjs');
 const next=fitFlowGroups({nodes:[{id:'g',type:'sceneGroup',position:{x:0,y:0},data:{}},{id:'a',type:'scene',parentId:'g',position:{x:20,y:100},measured:{width:260,height:180},data:{}}],edges:[]});
 assert.equal(next.nodes[0].style.width,300);assert.equal(next.nodes[1].position.x,20);
 assert.equal(next.nodes[0].style.width-next.nodes[1].position.x-260,20);
});
test('drag finish retains partial overlap but releases fully outside the original frame',async()=>{
 const {fitFlowGroups,finishFlowDrag,absolutePosition}=await import('../src/flow-model.mjs');
 const start=fitFlowGroups({nodes:[{id:'g',type:'sceneGroup',position:{x:0,y:0},data:{}},{id:'a',type:'scene',parentId:'g',position:{x:20,y:100},data:{}},{id:'b',type:'scene',parentId:'g',position:{x:340,y:100},data:{}}],edges:[]});
 function moved(x,y){return fitFlowGroups({...start,nodes:start.nodes.map(n=>n.id==='b'?{...n,position:{x,y},dragging:true}:n)});}
 const partial=finishFlowDrag(moved(600,100),['b'],start);assert.equal(partial.nodes.find(n=>n.id==='b').parentId,'g');
 for(const position of [{x:660,y:100},{x:-300,y:100},{x:340,y:-200},{x:340,y:400}]){
  const current=moved(position.x,position.y),expected=absolutePosition(current.nodes.find(n=>n.id==='b'),current.nodes);
  const next=finishFlowDrag(current,['b'],start),b=next.nodes.find(n=>n.id==='b');
  assert.ok(!b.parentId);assert.deepEqual(b.position,expected);assert.ok(!b.dragging);assert.equal(next.nodes.find(n=>n.id==='g').style.width,300);
 }
});
test('horizontal arrangement respects nested group connections and puts information below its owner',async()=>{
 const {arrangeFlowLeftToRight,addSceneInformation,informationEdges,isSceneNode,writeFlowScene,removeFlowNode,ungroupFlow}=await import('../src/flow-model.mjs');
 const base={nodes:[{id:'g',type:'sceneGroup',position:{x:0,y:0},data:{label:'章'}},{id:'a',type:'scene',parentId:'g',position:{x:20,y:100},data:{label:'導入'}},{id:'b',type:'scene',parentId:'g',position:{x:20,y:300},data:{label:'探索'}},{id:'c',type:'scene',position:{x:20,y:900},data:{label:'結末'}}],edges:[{id:'ab',source:'a',target:'b'},{id:'bc',source:'b',target:'c'}]};
 const withInfo=addSceneInformation(addSceneInformation(base,'a'),'a'),info=withInfo.nodes.filter(n=>n.type==='sceneInfo');
 assert.equal(info.length,2);assert.equal(informationEdges(withInfo).length,2);assert.equal(withInfo.edges.length,2);
 const arranged=arrangeFlowLeftToRight(withInfo),get=id=>arranged.nodes.find(n=>n.id===id);
 assert.ok(get('b').position.x>=get('a').position.x+260+100);assert.ok(get('c').position.x>=get('g').position.x+get('g').style.width+100);
 assert.ok(get(info[0].id).position.y>get('a').position.y);assert.ok(get(info[1].id).position.y>get(info[0].id).position.y);
 assert.deepEqual(arrangeFlowLeftToRight(arranged),arranged);
 assert.equal(writeFlowScene({type:'doc',content:[]},withInfo,info[0].id),null);
 assert.ok(ungroupFlow(withInfo).nodes.filter(n=>n.type==='sceneInfo').length===2);
 const deleted=removeFlowNode(withInfo,'a');assert.equal(deleted.nodes.filter(n=>n.type==='sceneInfo').length,2);assert.equal(informationEdges(deleted).length,0);
 assert.ok(deleted.nodes.filter(n=>n.type==='sceneInfo').every(n=>n.data.sceneId===null));
 assert.equal(withInfo.nodes.filter(isSceneNode).length,3);
});

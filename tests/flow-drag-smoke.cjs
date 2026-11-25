const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(__dirname,'../.test-output/flow-drag');
app.setPath('userData',path.join(output,`profile-${Date.now()}`));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
 let win;
 try {
  await fs.mkdir(output,{recursive:true});
  win=new BrowserWindow({width:1600,height:1100,show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
  const js=async code=>{try{return await win.webContents.executeJavaScript(code,true);}catch(error){console.error(code,errors);throw error;}};
  await win.loadFile(path.resolve(__dirname,'../dist/index.html'),{query:{testStorage:'1'}});await delay(900);
  const doc={id:'drag-test',version:1,title:'グループ追従',markdown:'',flow:{nodes:[
   {id:'g',type:'sceneGroup',position:{x:200,y:200},data:{label:'探索'},style:{width:640,height:320}},
   {id:'a',type:'scene',parentId:'g',position:{x:20,y:100},data:{label:'図書館'}},
   {id:'b',type:'scene',parentId:'g',position:{x:340,y:100},data:{label:'地下室'}}
  ],edges:[]}};
  await js(`localStorage.setItem('trpg-canvas-documents-v1',JSON.stringify({'drag-test':{doc:${JSON.stringify(doc)},revision:'r'}}));localStorage.setItem('trpg-library-initialized','true')`);
  win.webContents.reload();await delay(900);win.show();win.focus();
  await js(`document.querySelectorAll('.mode-switch button')[1].click();document.querySelector('[aria-label="目次を閉じる"]').click();document.querySelector('[aria-label="執筆メモを閉じる"]').click()`);await delay(500);
  const rects=()=>js(`Object.fromEntries(['g','a','b'].map(id=>{const r=document.querySelector('.react-flow__node[data-id="'+id+'"]').getBoundingClientRect();return [id,{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}]}))`);
  async function drag(id,dx,dy){
   const from=await js(`(()=>{const r=document.querySelector('.react-flow__node[data-id="${id}"] .node-label').getBoundingClientRect();return {x:Math.round(r.x+30),y:Math.round(r.y+r.height/2)}})()`);
   win.webContents.sendInputEvent({type:'mouseDown',...from,button:'left',clickCount:1});
   win.webContents.sendInputEvent({type:'mouseMove',x:from.x+4,y:from.y,modifiers:['leftButtonDown']});await delay(80);
   for(let i=1;i<=5;i++){win.webContents.sendInputEvent({type:'mouseMove',x:from.x+Math.round(dx*i/5),y:from.y+Math.round(dy*i/5),modifiers:['leftButtonDown']});await delay(80);}
   const during=await rects();
   win.webContents.sendInputEvent({type:'mouseUp',x:from.x+dx,y:from.y+dy,button:'left',clickCount:1});await delay(300);
   return {during,after:await rects()};
  }
  function contains(rects){for(const id of ['a','b']){assert.ok(rects[id].x>=rects.g.x,`${id} escapes left`);assert.ok(rects[id].y>=rects.g.y,`${id} escapes top`);assert.ok(rects[id].right<=rects.g.right+1,`${id} escapes right`);assert.ok(rects[id].bottom<=rects.g.bottom+1,`${id} escapes bottom`);}}
  let before=await rects();let result=await drag('b',160,30);contains(result.during);contains(result.after);
  assert.ok(result.after.g.width>before.g.width+100);assert.ok(Math.abs(result.after.a.x-before.a.x)<2,'stationary sibling must not move');
  before=result.after;result=await drag('b',-160,-30);contains(result.during);contains(result.after);assert.ok(result.after.g.width<before.g.width-100,'group must shrink');
  before=result.after;result=await drag('a',-100,-70);contains(result.during);contains(result.after);assert.ok(Math.abs(result.after.b.x-before.b.x)<2,'left/top growth must not move sibling');
  assert.ok(Math.abs(result.after.a.x-(before.a.x-100))<22,'drag follows pointer across changing parent origin');
  await delay(800);const saved=await js(`JSON.parse(localStorage.getItem('trpg-canvas-documents-v1'))['drag-test'].doc.flow`);assert.ok(saved.nodes.every(n=>!n.dragging));
  before=await rects();result=await drag('b',Math.ceil((before.g.right+40-before.b.x)/20)*20,0);await delay(800);
  let state=await js(`JSON.parse(localStorage.getItem('trpg-canvas-documents-v1'))['drag-test'].doc.flow`);
  assert.ok(!state.nodes.find(n=>n.id==='b').parentId,JSON.stringify({before,result,state}));
  assert.equal(state.nodes.find(n=>n.id==='g').style.width,260,'remaining group fits one card');
  before=await rects();await drag('b',Math.round(before.g.x+40-before.b.x),Math.round(before.g.y+120-before.b.y));await delay(800);
  state=await js(`JSON.parse(localStorage.getItem('trpg-canvas-documents-v1'))['drag-test'].doc.flow`);assert.equal(state.nodes.find(n=>n.id==='b').parentId,'g','drop can rejoin');
  const field=async(label,value)=>{await js(`(()=>{const e=document.querySelector('[aria-label="${label}"]'),p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}))})()`);await delay(100);};
  const addInfo=async()=>{await js(`document.querySelector('.react-flow__node[data-id="a"] .node-label').click();`);await delay(100);await js(`document.querySelector('.flow-inspector-actions .secondary-button').click()`);await delay(250);};
  await addInfo();await field('情報名','古い地図');await field('情報の内容','灯台へ続く地下道が記されている。');await field('情報の開示条件','目星に成功');await delay(800);
  await addInfo();await field('情報名','証言');await field('情報の内容','灯台守は昨日町を出た。');await delay(800);
  state=await js(`JSON.parse(localStorage.getItem('trpg-canvas-documents-v1'))['drag-test'].doc.flow`);
  const infos=state.nodes.filter(n=>n.type==='sceneInfo');assert.equal(infos.length,2);assert.ok(infos.every(n=>n.data.sceneId==='a'));
  assert.equal(await js(`document.querySelectorAll('.react-flow__edge[data-id^="information:"]').length`),2);
  assert.ok(!(await js(`!!document.querySelector('.flow-inspector .existing-link')`)),'information cannot create manuscript headings');
  await field('情報を提示するシーン','b');await delay(800);
  state=await js(`JSON.parse(localStorage.getItem('trpg-canvas-documents-v1'))['drag-test'].doc.flow`);assert.equal(state.nodes.find(n=>n.data.label==='証言').data.sceneId,'b');
  await js(`document.querySelector('.react-flow__node[data-id="a"] .node-label').click()`);await delay(100);
  await js(`document.querySelector('.flow-view').dispatchEvent(new KeyboardEvent('keydown',{key:'c',bubbles:true}))`);await delay(100);
  await js(`document.querySelector('.react-flow__node[data-id="b"] .node-label').click()`);await delay(100);
  await js(`Array.from(document.querySelectorAll('.flow-actions button')).find(b=>b.textContent.includes('左→右に整列')).click()`);await delay(900);
  state=await js(`JSON.parse(localStorage.getItem('trpg-canvas-documents-v1'))['drag-test'].doc.flow`);
  assert.ok(state.nodes.find(n=>n.id==='b').position.x>state.nodes.find(n=>n.id==='a').position.x+220);
  assert.ok(await js(`!!document.querySelector('.react-flow__node[data-id="a"] .react-flow__handle-right.source')`));
  const {flowSvg}=await import('../src/export.mjs');const svg=flowSvg(state);assert.ok(svg.includes('情報：古い地図'));assert.ok(svg.includes('stroke-dasharray="5 4"'));
  win.webContents.reload();await delay(900);await js(`document.querySelectorAll('.mode-switch button')[1].click()`);await delay(400);
  assert.equal(await js(`document.querySelectorAll('.information-node').length`),2);
  assert.ok(await js(`document.querySelector('.flow-view').textContent.includes('目星に成功')`));
  await fs.writeFile(path.join(output,'group-drag.png'),(await win.webContents.capturePage()).toPNG());
  assert.deepEqual(errors,[]);console.log('PASS: live group fit, full exit/rejoin, horizontal layout, one-to-many information editing/reassignment/export/persistence');win.destroy();app.exit(0);
 }catch(error){console.error(error);win?.destroy();app.exit(1);}
});

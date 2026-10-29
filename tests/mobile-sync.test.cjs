const test=require('node:test');
const assert=require('node:assert/strict');
const base={id:'scenario-1',version:1,title:'原稿',markdown:'本文',flow:{nodes:[],edges:[]}};
const entry=(doc=base)=>({key:'source',uri:'content://test/doc',hash:'old',doc,baseText:JSON.stringify(base)});
async function sync(value,remote,extra={}){
 const {synchronizeDraft}=await import('../src/mobile/sync.mjs');
 let writes=[];
 const result=await synchronizeDraft(value,{read:async()=>({uri:value.uri,hash:remote.hash,text:JSON.stringify(remote.doc)}),write:async request=>{writes.push(request);return {uri:value.uri,hash:'saved'};},parse:JSON.parse,...extra});
 return {result,writes};
}
test('unchanged linked drafts are not rewritten',async()=>{
 const {result,writes}=await sync(entry(),{doc:base,hash:'old'});assert.equal(result.action,'unchanged');assert.equal(writes.length,0);
});
test('local editing automatically writes using the last remote revision',async()=>{
 const local={...base,markdown:'スマホの本文',writingNotes:'メモ'};
 const {result,writes}=await sync(entry(local),{doc:base,hash:'old'});
 assert.equal(result.action,'pushed');assert.equal(writes[0].hash,'old');assert.equal(JSON.parse(writes[0].text).writingNotes,'メモ');assert.equal(result.entry.baseText,JSON.stringify(local));
});
test('PC-only changes are pulled without overwriting the remote file',async()=>{
 const remote={...base,markdown:'PCの本文',flow:{nodes:[],edges:[]},writingNotes:'PCのメモ'};
 const {result,writes}=await sync(entry(),{doc:remote,hash:'pc'});
 assert.equal(result.action,'pulled');assert.deepEqual(result.entry.doc,remote);assert.equal(writes.length,0);
});
test('both edited: preserve mobile as a distinct conflict copy and adopt PC original',async()=>{
 const local={...base,markdown:'スマホの編集'},remote={...base,markdown:'PCの編集'};
 const {result,writes}=await sync(entry(local),{doc:remote,hash:'pc'});
 assert.equal(result.action,'conflict');assert.equal(result.copy.doc.markdown,local.markdown);assert.match(result.copy.doc.title,/競合コピー/);assert.notEqual(result.copy.doc.id,base.id);assert.equal(result.copy.uri,undefined);assert.equal(result.entry.doc.markdown,remote.markdown);assert.equal(writes.length,0);
});
test('same content with a changed provider revision simply rebases',async()=>{
 const local={...base,markdown:'反映済み'};const {result,writes}=await sync(entry(local),{doc:local,hash:'echo'});
 assert.equal(result.action,'unchanged');assert.equal(result.entry.hash,'echo');assert.equal(result.entry.baseText,JSON.stringify(local));assert.equal(writes.length,0);
});
test('provider temporarily returning a superseded revision cannot roll back a successful save',async()=>{
 const local={...base,markdown:'保存済みの新しい本文'};
 const {result:written}=await sync(entry(local),{doc:base,hash:'old'});
 const {result,writes}=await sync(written.entry,{doc:base,hash:'old'});
 assert.equal(result.action,'postponed');assert.equal(result.entry.doc.markdown,local.markdown);assert.equal(writes.length,0);
});
test('typing or changing scenes during remote read postpones synchronization',async()=>{
 const {result,writes}=await sync(entry({...base,markdown:'入力中'}),{doc:base,hash:'old'},{canApply:()=>false});
 assert.equal(result.action,'postponed');assert.equal(writes.length,0);
});
test('offline and permission errors leave local draft and baseline intact',async()=>{
 const value=entry({...base,markdown:'オフラインの編集'}),before=JSON.stringify(value);
 await assert.rejects(sync(value,{doc:base,hash:'old'},{read:async()=>{throw new Error('offline');}}),/offline/);assert.equal(JSON.stringify(value),before);
 const {result}=await sync(value,{doc:base,hash:'old'});assert.equal(result.action,'pushed');
});
test('PC changes between read and write become a conflict copy on retry',async()=>{
 let reads=0;
 const local={...base,markdown:'スマホ'},remote={...base,markdown:'直前のPC編集'};
 const {result}=await sync(entry(local),{doc:base,hash:'old'},{read:async()=>({hash:++reads===1?'old':'pc',text:JSON.stringify(reads===1?base:remote)}),write:async()=>{throw Object.assign(new Error('changed'),{code:'CONFLICT'});}});
 assert.equal(result.action,'conflict');assert.equal(result.copy.doc.markdown,local.markdown);assert.equal(result.entry.doc.markdown,remote.markdown);
});
test('unlinked drafts never open a file picker from automatic synchronization',async()=>{
 const value={...entry(),uri:null};const {result,writes}=await sync(value,{doc:base,hash:'old'},{read:()=>{throw new Error('must not read');}});assert.equal(result.action,'unlinked');assert.equal(writes.length,0);
});

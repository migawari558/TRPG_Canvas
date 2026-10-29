const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
test('Android file names and JSON are readable by desktop storage',async()=>{
 const {scenarioFileName,parseScenario}=await import('../src/mobile/files.mjs');
 const {newDocument}=await import('../src/model.mjs');
 const storage=require('../electron/storage.cjs');
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'trpg-mobile-'));
 try{
  const doc=newDocument('新しいシナリオ','# 導入\n\nAndroidからの本文');
  await fs.writeFile(path.join(folder,scenarioFileName(doc)),JSON.stringify(doc));
  const list=await storage.list(folder);assert.deepEqual(list.errors,[]);assert.equal(list.documents[0].title,doc.title);
  const loaded=await storage.read(folder,doc.id);assert.equal(parseScenario(JSON.stringify(loaded.doc)).markdown,doc.markdown);
  assert.throws(()=>scenarioFileName({...doc,id:'新しいシナリオ'}),/ID/);
 }finally{await fs.rm(folder,{recursive:true,force:true});}
});

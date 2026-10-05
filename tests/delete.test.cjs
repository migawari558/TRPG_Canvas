const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const storage=require('../electron/storage.cjs');
test('deletion validates IDs and revision and preserves files when trash fails',async()=>{
 const folder=path.resolve('.test-output/delete-unit');await fs.mkdir(folder,{recursive:true});
 const {newDocument}=await import('../src/model.mjs');const doc=newDocument();const saved=await storage.save(folder,doc,null);
 let called=false;const trash=async file=>{called=true;assert.equal(file,storage.filePath(folder,doc.id));await fs.rename(file,file+'.trashed');};
 await assert.rejects(storage.remove(folder,'../outside',saved.revision,trash));
 await assert.rejects(storage.remove(folder,doc.id,'stale',trash));assert.equal(called,false);
 await assert.rejects(storage.remove(folder,doc.id,saved.revision,async()=>{throw Error('trash failed');}));
 assert.equal((await storage.read(folder,doc.id)).revision,saved.revision);
 await storage.remove(folder,doc.id,saved.revision,trash);assert.equal(called,true);await assert.rejects(storage.read(folder,doc.id));
});

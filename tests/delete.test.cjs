const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const storage=require('../electron/storage.cjs');
test('deletion validates revision, keeps recoverable data and restores it',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'trpg-delete-'));
 const {newDocument}=await import('../src/model.mjs');const doc=newDocument();const saved=await storage.save(folder,doc,null);
 await assert.rejects(storage.remove(folder,'../outside',saved.revision));
 await assert.rejects(storage.remove(folder,doc.id,'stale'));
 assert.equal((await storage.read(folder,doc.id)).revision,saved.revision);
 await storage.remove(folder,doc.id,saved.revision);await assert.rejects(storage.read(folder,doc.id));
 assert.equal((await storage.listTrash(folder))[0].id,doc.id);
 await storage.restore(folder,doc.id);assert.equal((await storage.read(folder,doc.id)).doc.id,doc.id);assert.equal((await storage.listTrash(folder)).length,0);
 await fs.rm(folder,{recursive:true,force:true});
});

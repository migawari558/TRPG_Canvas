const test=require('node:test'),assert=require('node:assert/strict');
test('new scenarios have no manuscript, outline or flow and retain supplied metadata',async()=>{
 const {newDocument,characterCount}=await import('../src/model.mjs');
 const doc=newDocument('白紙の物語',undefined,{systemName:'  システム  ',subtitle:'  海辺 / 2人  '});
 assert.equal(doc.markdown,''); assert.equal(characterCount(doc),0);
 assert.deepEqual(doc.flow,{nodes:[],edges:[]});
 assert.equal(doc.systemName,'システム'); assert.equal(doc.subtitle,'海辺 / 2人');
 assert.equal(newDocument('読み込み','## 導入\n\n本文').markdown,'## 導入\n\n本文');
});

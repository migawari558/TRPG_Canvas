const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {resolveWorkspace}=require('../electron/workspace.cjs');
test('unavailable saved workspace can be reselected without changing existing data',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'canvas-workspace-')),profile=path.join(root,'profile'),documents=path.join(root,'documents'),next=path.join(root,'selected');
 await fs.mkdir(profile);const blocked=path.join(root,'not-a-folder');await fs.writeFile(blocked,'keep');const settings=path.join(profile,'settings.json');await fs.writeFile(settings,JSON.stringify({folder:path.join(blocked,'scenario')}));
 const app={getPath:key=>key==='userData'?profile:documents};let warnings=0;
 const dialog={showMessageBox:async options=>{warnings++;assert.match(options.message,/保存先/);return {response:0}},showOpenDialog:async()=>({canceled:false,filePaths:[next]})};
 assert.equal((await resolveWorkspace(app,dialog)).folder,next);assert.equal(warnings,1);assert.equal(JSON.parse(await fs.readFile(settings,'utf8')).folder,next);assert.equal(await fs.readFile(blocked,'utf8'),'keep');
 const noDialog={showMessageBox:()=>{throw Error('Unexpected dialog')}};assert.equal((await resolveWorkspace(app,noDialog)).folder,next);
});
test('broken Documents path and invalid settings recover; cancel preserves settings',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'canvas-workspace-')),profile=path.join(root,'profile'),next=path.join(root,'selected');await fs.mkdir(profile);
 const settings=path.join(profile,'settings.json');await fs.writeFile(settings,JSON.stringify({folder:'relative-path'}));
 const app={getPath:key=>key==='userData'?profile:(()=>{throw Error('Documents unavailable')})()};
 assert.equal(await resolveWorkspace(app,{showMessageBox:async()=>({response:1})}),null);assert.equal(JSON.parse(await fs.readFile(settings,'utf8')).folder,'relative-path');
 await fs.writeFile(settings,'broken JSON');assert.equal((await resolveWorkspace(app,{showMessageBox:async()=>({response:0}),showOpenDialog:async()=>({canceled:false,filePaths:[next]})})).folder,next);
});

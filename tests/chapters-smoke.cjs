const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve('.test-output/chapters');app.setPath('userData',path.join(output,`profile-${Date.now()}`));const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 await fs.mkdir(output,{recursive:true});const w=new BrowserWindow({width:1280,height:1000,show:false,webPreferences:{sandbox:true,contextIsolation:true}});const errors=[];w.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 const js=async code=>{const result=await w.webContents.executeJavaScript(code,true);await delay(100);return result;};
 const importMd=text=>js(`(()=>{const dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(text)}],'章テスト.md'));const el=document.querySelector('input[accept=".md,.markdown,.txt"]');el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const data=()=>js(`Object.values(JSON.parse(localStorage.getItem('trpg-canvas-documents-v1'))).filter(v=>v.doc.title==='章テスト').at(-1).doc`);
 await w.loadFile(path.resolve('dist/index.html'));await delay(900);w.show();w.focus();await importMd('#! 第一章\n\n# 導入\n\n本文です。\n\n## 探索\n\n本文です。\n\n### 秘密\n\n本文です。\n\n#### 情報\n\n本文です。\n\n##### 補足\n\n本文です。\n\n###### 注記\n\n本文です。\n\n#! 第二章\n\n# 結末\n\n本文です。');await delay(400);
 assert.equal(await js(`document.querySelectorAll('.tiptap .chapter-heading').length`),2);assert.equal(await js(`getComputedStyle(document.querySelector('.tiptap .chapter-heading')).textAlign`),'center');
 await js(`document.querySelector('[aria-label="第一章を後へ"]').click();undefined`);assert.equal(await js(`document.querySelector('.tiptap .chapter-heading').textContent`),'第二章');
 await js(`document.querySelector('[aria-label="元に戻す（Ctrl+Z）"]').click();undefined`);assert.equal(await js(`document.querySelector('.tiptap .chapter-heading').textContent`),'第一章');
 await js(`(()=>{const p=document.querySelector('.tiptap p'),r=document.createRange();r.selectNodeContents(p);getSelection().removeAllRanges();getSelection().addRange(r);document.querySelector('.tiptap').focus();})()`);
 await js(`document.querySelector('[aria-label="章（中央揃え・H1の上位）"]').click();undefined`);assert.equal(await js(`document.querySelectorAll('.tiptap .chapter-heading').length`),3);await js(`document.querySelector('[aria-label="元に戻す（Ctrl+Z）"]').click();undefined`);
 await delay(850);const doc=await data();assert.match(doc.markdown,/#! 第一章/);assert.equal(doc.content.content[0].attrs.level,0);await importMd(doc.markdown);await delay(500);assert.equal(await js(`document.querySelectorAll('.tiptap .chapter-heading').length`),2);
 await fs.writeFile(path.join(output,'editor.png'),(await w.webContents.capturePage()).toPNG());
 await importMd('');await delay(300);await js(`document.querySelector('.tiptap').focus();undefined`);
 for(const keyCode of '#! '){w.webContents.sendInputEvent({type:'char',keyCode});await delay(60);}
 assert.equal(await js(`document.querySelectorAll('.tiptap .chapter-heading').length`),1);
 await delay(850);
 const {exportHtml}=await import('../src/export.mjs');const file=path.join(output,'chapters.html');await fs.writeFile(file,exportHtml(doc,{includeFlow:false}));await w.loadFile(file);
 assert.ok(await js(`[...document.querySelectorAll('.scenario-body :is(h1,h2,h3,h4,h5,h6)')].every(h=>{const s=getComputedStyle(h);return parseFloat(s.marginTop)>parseFloat(s.marginBottom)+parseFloat(s.paddingBottom)})`));assert.equal(await js(`getComputedStyle(document.querySelector('.chapter-heading')).textAlign`),'center');
 await fs.writeFile(path.join(output,'export.png'),(await w.webContents.capturePage()).toPNG());await fs.writeFile(path.join(output,'chapters.pdf'),await w.webContents.printToPDF({pageSize:'A4',printBackground:true}));
 assert.deepEqual(errors,[]);console.log('PASS: chapter editing, section reorder/undo, Markdown persistence, hierarchy and export spacing');app.exit(0);
}catch(e){console.error(e);app.exit(1);}});

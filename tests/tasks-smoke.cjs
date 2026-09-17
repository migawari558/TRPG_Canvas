const {app,BrowserWindow}=require('electron');const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve('.test-output/tasks');app.setPath('userData',path.join(output,`profile-${Date.now()}`));const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 await fs.mkdir(output,{recursive:true});const w=new BrowserWindow({width:1440,height:1000,show:false,webPreferences:{sandbox:true,contextIsolation:true}});const errors=[];w.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 const js=async code=>{try{const value=await w.webContents.executeJavaScript(code,true);await delay(100);return value;}catch(e){console.error(code);throw e;}};
 const importMd=text=>js(`(()=>{const dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(text)}],'チェックリスト.md'));const input=document.querySelector('input[accept=".md,.markdown,.txt"]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const data=()=>js(`Object.values(JSON.parse(localStorage.getItem('trpg-canvas-documents-v1'))).filter(v=>v.doc.title==='チェックリスト').at(-1).doc`);
 await w.loadFile(path.resolve('dist/index.html'));await delay(1000);w.show();w.focus();
 await importMd('## セッションの準備\n\n- [ ] ハンドアウトを用意する\n- [x] マップを確認する\n  - [ ] 隠し通路の確認\n- 通常の箇条書き\n\n> [!GM]\n>\n> - [x] NPCの秘密を確認する\n\n追加項目');await delay(400);
 assert.equal(await js(`document.querySelectorAll('.tiptap input[type=checkbox]').length`),4);assert.equal(await js(`document.querySelectorAll('.tiptap input:checked').length`),2);
 assert.equal(await js(`getComputedStyle(document.querySelector('.tiptap input[type=checkbox]').closest('li')).display`),'flex');
 await js(`document.querySelector('.tiptap input[type=checkbox]').click()`);await delay(850);
 let doc=await data();assert.ok(doc.markdown.includes('- [x] ハンドアウト'));assert.ok(doc.markdown.includes('- [ ] 隠し通路'));
 await js(`document.querySelector('[aria-label="元に戻す（Ctrl+Z）"]').click()`);assert.equal(await js(`document.querySelector('.tiptap input[type=checkbox]').checked`),false);
 await js(`(()=>{const p=[...document.querySelectorAll('.tiptap>p')].at(-1);const r=document.createRange();r.selectNodeContents(p);r.collapse(false);getSelection().removeAllRanges();getSelection().addRange(r);document.querySelector('.tiptap').focus();})()`);
 await js(`document.querySelector('[aria-label="チェックリスト"]').click()`);assert.equal(await js(`document.querySelectorAll('.tiptap input[type=checkbox]').length`),5);
 await delay(850);doc=await data();await importMd(doc.markdown);await delay(500);assert.equal(await js(`document.querySelectorAll('.tiptap input[type=checkbox]').length`),5);assert.equal(await js(`document.querySelectorAll('.tiptap input:checked').length`),2);assert.ok(await js(`!!document.querySelector('.gm-note input[type=checkbox]')`));
 await fs.writeFile(path.join(output,'editor.png'),(await w.webContents.capturePage()).toPNG());await delay(850);
 await importMd('## 入力の確認\n\n');await delay(350);
 await js(`(()=>{const root=document.querySelector('.tiptap');root.focus();const r=document.createRange();r.selectNodeContents(root);r.collapse(false);getSelection().removeAllRanges();getSelection().addRange(r);})()`);
 w.webContents.sendInputEvent({type:'keyDown',keyCode:'End',modifiers:['control']});w.webContents.sendInputEvent({type:'keyUp',keyCode:'End',modifiers:['control']});
 w.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});w.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'});await delay(100);
 for(const keyCode of '- [ ] '){w.webContents.sendInputEvent({type:'char',keyCode});await delay(40);}
 assert.equal(await js(`document.querySelectorAll('.tiptap input[type=checkbox]').length`),1,await js(`document.querySelector('.tiptap').innerHTML`));
 for(const keyCode of 'one'){w.webContents.sendInputEvent({type:'char',keyCode});await delay(30);}
 for(let i=0;i<2;i++){w.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});w.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'});await delay(80);}
 for(const keyCode of '- [x] '){w.webContents.sendInputEvent({type:'char',keyCode});await delay(40);}
 assert.equal(await js(`document.querySelectorAll('.tiptap input:checked').length`),1);
 await delay(850);
 const {exportHtml}=await import('../src/export.mjs');const file=path.join(output,'tasks.html');await fs.writeFile(file,exportHtml(doc,{columns:2}));await w.loadFile(file);assert.equal(await js(`document.querySelectorAll('input:checked').length`),2);await js(`document.querySelector('input[type=checkbox]').click()`);assert.equal(await js(`document.querySelector('input[type=checkbox]').checked`),true);
 await fs.writeFile(path.join(output,'tasks.pdf'),await w.webContents.printToPDF({printBackground:true,pageSize:'A4'}));assert.deepEqual(errors,[]);console.log('PASS: task import, nested and GM checklists, check/uncheck and undo, toolbar creation, Markdown roundtrip, HTML toggle and PDF');app.exit(0);
}catch(e){console.error(e);app.exit(1);}});

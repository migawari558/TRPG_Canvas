const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve('.test-output/writer');app.setPath('userData',path.join(output,`profile-${Date.now()}`));const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 await fs.mkdir(output,{recursive:true});const w=new BrowserWindow({width:1440,height:1000,show:false,webPreferences:{sandbox:true,contextIsolation:true}});const errors=[];w.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
 const js=async code=>{const result=await w.webContents.executeJavaScript(code,true);await delay(120);return result};
 await w.loadFile(path.resolve('dist/index.html'));await delay(1000);w.show();w.focus();
 assert.equal(await js(`document.querySelectorAll('.sidebar .document-list').length`),0);assert.ok(await js(`!!document.querySelector('.sidebar .outline-panel')`));
 await js(`(()=>{const el=document.querySelector('[aria-label="執筆メモ"]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,'PRIVATE_WRITING_NOTE');el.dispatchEvent(new Event('input',{bubbles:true}));})()`);await delay(850);
 assert.ok(await js(`document.querySelector('[aria-label="GMメモ（角丸・網掛け）"]').title.includes('!!!')`));
 await js(`(()=>{const root=document.querySelector('.tiptap');root.focus();const r=document.createRange();r.selectNodeContents(root);r.collapse(false);getSelection().removeAllRanges();getSelection().addRange(r);})()`);
 const key=async(keyCode,modifiers=[])=>{w.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});w.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await delay(120)};
 await key('End',['control']);await key('Enter');for(const keyCode of '!!! '){w.webContents.sendInputEvent({type:'char',keyCode});await delay(40)};
 assert.ok(await js(`!!getSelection().anchorNode.parentElement.closest('.gm-note')`));await js(`document.execCommand('insertText',false,'簡単なGMメモ');undefined`);await key('Enter',['control']);await delay(850);
 const doc=await js(`Object.values(JSON.parse(localStorage.getItem('trpg-canvas-documents-v1'))).find(v=>v.doc.writingNotes==='PRIVATE_WRITING_NOTE').doc`);assert.ok(doc.markdown.includes(':::gm'));const {exportHtml,markdown}=await import('../src/export.mjs');assert.ok(!exportHtml(doc).includes('PRIVATE_WRITING_NOTE'));assert.ok(markdown.render(doc.markdown).includes('簡単なGMメモ'));
 await fs.writeFile(path.join(output,'editor.png'),(await w.webContents.capturePage()).toPNG());w.webContents.reload();await delay(1000);assert.equal(await js(`document.querySelector('[aria-label="執筆メモ"]').value`),'PRIVATE_WRITING_NOTE');assert.deepEqual(errors,[]);
 console.log('PASS: sidebar outline, private notes persistence, hover syntax, simple GM input and Markdown roundtrip');app.exit(0);
}catch(e){console.error(e);app.exit(1)}});

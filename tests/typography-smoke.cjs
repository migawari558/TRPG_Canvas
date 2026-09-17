const {app,BrowserWindow}=require('electron');const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve('.test-output/typography');app.setPath('userData',path.join(output,`profile-${Date.now()}`));const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 await fs.mkdir(output,{recursive:true});const win=new BrowserWindow({width:1200,height:950,show:false,webPreferences:{sandbox:true,contextIsolation:true}});
 const js=code=>win.webContents.executeJavaScript(code,true);
 await win.loadFile(path.resolve('dist/index.html'));await delay(1000);win.show();win.focus();
 const markdown='*斜体の日本語と Italic English*\n\n通常改行の一行目\n\n通常改行の二行目\n\nシフト改行の一行目  \nシフト改行の二行目\n\n> 引用の一行目\n>\n> 引用の二行目\n\n> [!GM]\n>\n> メモの一行目\n>\n> メモの二行目';
 await js(`(()=>{const dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(markdown)}],'書式検証.md',{type:'text/markdown'}));const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(600);
 const inspect=selector=>`(()=>{const root=document.querySelector(${JSON.stringify(selector)}),p=[...root.querySelectorAll('p')],em=root.querySelector('em');const first=p.find(e=>e.textContent==='通常改行の一行目'),next=p.find(e=>e.textContent==='通常改行の二行目'),hard=p.find(e=>e.textContent.includes('シフト改行の一行目'));return{margins:p.map(e=>getComputedStyle(e).marginTop),distance:next.getBoundingClientRect().top-first.getBoundingClientRect().top,line:parseFloat(getComputedStyle(first).lineHeight),hard:hard.getBoundingClientRect().height,italic:getComputedStyle(em).fontStyle,synthesis:getComputedStyle(em).fontSynthesis}})()`;
 const verify=m=>{assert.ok(m.margins.every(v=>v==='0px'));assert.ok(Math.abs(m.distance-m.line)<1);assert.ok(Math.abs(m.hard-2*m.line)<1);assert.equal(m.italic,'italic');assert.equal(m.synthesis,'style');};
 verify(await js(inspect('.tiptap')));await fs.writeFile(path.join(output,'editor.png'),(await win.webContents.capturePage()).toPNG());await delay(850);
 const {exportHtml}=await import('../src/export.mjs');const {newDocument}=await import('../src/model.mjs');const html=exportHtml(newDocument('書式検証',markdown));const file=path.join(output,'typography.html');await fs.writeFile(file,html);await win.loadFile(file);verify(await js(inspect('.scenario-body')));
 await fs.writeFile(path.join(output,'typography.pdf'),await win.webContents.printToPDF({printBackground:true,pageSize:'A4'}));console.log('PASS: Japanese italic synthesis; Enter and Shift+Enter line spacing in editor and HTML/PDF');app.exit(0);
}catch(e){console.error(e);app.exit(1);}});

const {app,BrowserWindow}=require('electron');
const path=require('node:path');const assert=require('node:assert/strict');
app.setPath('userData',path.resolve(`.test-output/mobile-sync/profile-${Date.now()}`));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{try{
 const win=new BrowserWindow({width:412,height:820,show:true,webPreferences:{preload:path.resolve('tests/mobile-sync-preload.cjs'),contextIsolation:false,sandbox:true}});
 const js=code=>win.webContents.executeJavaScript(code,true);
 const until=async code=>{for(let i=0;i<70;i++){if(await js(code))return;await delay(100);}throw new Error(`timeout: ${code}`);};
 await win.loadFile(path.resolve('.test-output/mobile-dist/index.html'));await delay(500);
 await js(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Drive・端末から開く').click()`);
 await until(`!!document.querySelector('[aria-label="シナリオ本文"]')`);await delay(2200);
 async function type(text){await js(`(()=>{const instance=document.querySelector('[aria-label="シナリオ本文"]'),p=instance.querySelector('p'),range=document.createRange();instance.focus();range.selectNodeContents(p);range.collapse(false);getSelection().removeAllRanges();getSelection().addRange(range);document.execCommand('insertText',false,${JSON.stringify(text)});})()`);}
 await type('スマホで追記');
 await until(`window.mockProvider.doc.markdown.includes('スマホで追記')`);
 assert.ok(await js(`window.mockProvider.writes>0`),'保存ボタンなしで書き込まれません');
 await js(`window.mockProvider.doc={...window.mockProvider.doc,title:'PCから更新',content:null,markdown:'# PC見出し\\n\\nPCの本文'};window.mockProvider.hash='pc-change';window.dispatchEvent(new Event('focus'));`);
 await until(`document.querySelector('.mobile-title')?.value==='PCから更新'`);
 assert.ok(await js(`document.querySelector('[aria-label="シナリオ本文"]').textContent.includes('PCの本文')`));
 await type('競合するスマホ編集');
 await js(`window.mockProvider.doc={...window.mockProvider.doc,title:'PCの競合原稿',content:null,markdown:'# PC側の変更'};window.mockProvider.hash='pc-conflict';`);
 await until(`document.querySelector('.mobile-title')?.value==='PCの競合原稿'`);
 await js(`document.querySelector('[aria-label="シナリオ一覧へ戻る"]').click()`);
 await until(`Array.from(document.querySelectorAll('.mobile-document')).some(button=>button.textContent.includes('競合コピー'))`);
 assert.equal(await js(`window.mockProvider.doc.title`),'PCの競合原稿');
 console.log('PASS: actual mobile UI automatically pushes, pulls PC updates and preserves a local conflict copy without Save');app.exit(0);
}catch(error){console.error(error);app.exit(1);}});

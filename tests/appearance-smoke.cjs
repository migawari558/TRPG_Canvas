const { app, BrowserWindow, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');
const output = path.resolve(__dirname, `../.test-output/appearance-${Date.now()}`);
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(output, 'profile')); app.setPath('documents', output);
dialog.showSaveDialog = async (_win, options) => ({ canceled: false, filePath: path.join(output, options.defaultPath) });
require('../electron/main.cjs');
const delay = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
 try {
  let win;
  for (let i=0;i<40;i++) { await delay(200); win=BrowserWindow.getAllWindows()[0]; if(win && !win.webContents.isLoading()) break; }
  await delay(1300); win.setSize(1440,1000); win.show();win.focus();
  const errors=[];win.webContents.on('console-message', event => { if(event.level==='error') errors.push(event.message); });
  const js = async code => { try { return await win.webContents.executeJavaScript(code,true); } catch(e) { console.error('FAILED SCRIPT',code, errors);throw e; } };
  const click = text => js(`Array.from(document.querySelectorAll('button')).find(el=>el.textContent.trim()===${JSON.stringify(text)}).click()`);
  const label = text => js(`document.querySelector('[aria-label=${JSON.stringify(text)}]').click()`);
  const range = (name,value) => js(`(()=>{const el=document.querySelector('[aria-label=${JSON.stringify(name)}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${value});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await click('表示設定');await label('テーマ：ミッドナイト');await range('本文の文字サイズ',23);await range('メニュー・目次の文字サイズ',125);await delay(200);
  assert.equal(await js(`getComputedStyle(document.querySelector('.tiptap')).fontSize`),'23px');
  assert.equal(await js(`document.querySelector('.app').dataset.theme`),'midnight');
  await label('閉じる');await delay(100);
  fs.writeFileSync(path.join(output,'dark-editor.png'),(await win.webContents.capturePage()).toPNG());
  await delay(800);win.webContents.reload();await delay(1300);
  assert.equal(await js(`getComputedStyle(document.querySelector('.tiptap')).fontSize`),'23px');
  await click('書き出す');await label('書き出しテーマ：羊皮紙');await range('書き出しの文字サイズ',20);await delay(250);
  assert.ok(await js(`document.querySelector('iframe').srcdoc.includes('font-size:20px') && document.querySelector('iframe').srcdoc.includes('background:#fff6e5')`));
  assert.equal(await js(`document.querySelector('iframe').sandbox.length`),1);
  await delay(1000);
  const previewFrame=win.webContents.mainFrame.frames.find(frame=>frame.url==='about:srcdoc');
  assert.ok(previewFrame,'HTML preview frame loaded');
  for(let i=0;i<40;i++){if(await js(`document.querySelector('iframe').contentDocument?.body?.innerText.includes('霧の向こうの灯台')`))break;await delay(100);}
  assert.ok(await js(`document.querySelector('iframe').contentDocument?.body?.innerText.includes('霧の向こうの灯台')`));
  assert.equal(await js(`getComputedStyle(document.querySelector('iframe').contentDocument.body).fontSize`),'20px');
  fs.writeFileSync(path.join(output,'html-preview.png'),(await win.webContents.capturePage()).toPNG());
  await click('HTMLを書き出す');await delay(500);
  const htmlFile=fs.readdirSync(output).find(f=>f.endsWith('.html'));assert.ok(htmlFile);
  assert.ok(fs.readFileSync(path.join(output,htmlFile),'utf8').includes('font-size:20px'));
  await click('書き出す');await click('PDF');
  await delay(100);await click('2段組み');await click('A5');await delay(100);
  assert.equal(await js(`localStorage.getItem('trpg-pdf-columns')`),'2');
  assert.equal(await js(`localStorage.getItem('trpg-pdf-page-size')`),'"A5"');
  for(let i=0;i<100;i++){await delay(150);if(await js(`!!document.querySelector('.pdf-pages canvas:not([hidden])') && document.querySelector('.pdf-pages canvas').width>0`))break;}
  assert.ok(await js(`document.querySelector('.pdf-pages canvas').width>0`),await js(`document.querySelector('.export-preview').textContent`));
  await delay(600);
  assert.ok(await js(`document.querySelector('.pdf-navigation').textContent.includes('1 /')`));
  fs.writeFileSync(path.join(output,'pdf-preview.png'),(await win.webContents.capturePage()).toPNG());
  await click('次のページ');await delay(450);assert.ok(await js(`document.querySelector('.pdf-navigation').textContent.includes('2 /')`));
  await click('PDFを書き出す');
  for(let i=0;i<100;i++){await delay(200);if(fs.readdirSync(output).some(f=>f.endsWith('.pdf')))break;}
  const pdfFile=fs.readdirSync(output).find(f=>f.endsWith('.pdf'));assert.equal(fs.readFileSync(path.join(output,pdfFile)).subarray(0,4).toString(),'%PDF');
  const page=(await PDFDocument.load(fs.readFileSync(path.join(output,pdfFile)))).getPages()[0];
  assert.ok(Math.abs(page.getWidth()-419.5)<1 && Math.abs(page.getHeight()-595.3)<1, `A5 PDF: ${page.getWidth()} × ${page.getHeight()} pt`);
  await click('書き出す');await click('PDF');await delay(100);
  assert.ok(await js(`Array.from(document.querySelectorAll('.pdf-columns button')).find(b=>b.textContent==='2段組み').getAttribute('aria-pressed')==='true'`));
  assert.ok(await js(`Array.from(document.querySelectorAll('.pdf-page-sizes button')).find(b=>b.textContent==='A5').getAttribute('aria-pressed')==='true'`));
  await click('HTML');assert.equal(await js(`document.querySelector('.pdf-columns')`),null);
  assert.ok(await js(`!document.querySelector('iframe').srcdoc.includes('column-count:2')`));await label('閉じる');
  await click('表示設定');await label('テーマ：モノクロ');await label('閉じる');win.setSize(1000,800);await delay(200);
  assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth`));
  fs.writeFileSync(path.join(output,'small-editor.png'),(await win.webContents.capturePage()).toPNG());
  assert.deepEqual(errors,[]);
  console.log('PASS: display size/theme persistence, independent HTML export design, actual PDF rendering and page navigation, native exports, narrow window. '+output);app.exit(0);
 }catch(e){console.error(e);app.exit(1);}
});

const { app, BrowserWindow, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const JSZip = require('jszip');

const output = path.resolve('.test-output/docx');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(output, `profile-${Date.now()}`));
app.setPath('documents', output);
dialog.showSaveDialog = async (_window, options) => ({ canceled: false, filePath: path.join(output, options.defaultPath) });
require('../electron/main.cjs');

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

app.whenReady().then(async () => {
  try {
    let window;
    for (let attempt = 0; attempt < 40; attempt++) {
      await delay(200);
      window = BrowserWindow.getAllWindows()[0];
      if (window && !window.webContents.isLoading()) break;
    }
    assert.ok(window, 'アプリのウィンドウが開きませんでした');
    await delay(1200);
    window.setSize(1440, 1000);
    const errors = [];
    window.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
    const js = code => window.webContents.executeJavaScript(code, true);
    const click = text => js(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(text)}).click()`);
    const range = (label, value) => js(`(()=>{const input=document.querySelector('[aria-label=${JSON.stringify(label)}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${value});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);

    await click('書き出す');
    await click('Word');
    await range('書き出しの文字サイズ', 12);
    await click('A5');
    await click('2段組み');
    await delay(500);
    assert.equal(await js(`document.querySelector('[aria-label="書き出しの文字サイズ"]').value`), '12');
    assert.ok(await js(`document.querySelector('.preview-heading').textContent.includes('WORD・A5・2段組み')`));
    assert.equal(await js(`Array.from(document.querySelectorAll('.pdf-page-sizes button')).find(button=>button.textContent==='A5').getAttribute('aria-pressed')`), 'true');
    assert.equal(await js(`Array.from(document.querySelectorAll('.pdf-columns button')).find(button=>button.textContent==='2段組み').getAttribute('aria-pressed')`), 'true');
    fs.writeFileSync(path.join(output, 'word-export-options.png'), (await window.webContents.capturePage()).toPNG());

    for (const file of fs.readdirSync(output).filter(name => name.endsWith('.docx'))) fs.unlinkSync(path.join(output, file));
    await click('DOCXを書き出す');
    let docxPath;
    for (let attempt = 0; attempt < 100; attempt++) {
      await delay(150);
      const file = fs.readdirSync(output).find(name => name.endsWith('.docx'));
      if (file) { docxPath = path.join(output, file); break; }
    }
    if (!docxPath) fs.writeFileSync(path.join(output, 'word-export-failed.png'), (await window.webContents.capturePage()).toPNG());
    assert.ok(docxPath, `DOCXファイルが保存されませんでした: ${errors.join(' / ')} / ${await js(`document.body.innerText.slice(-500)`)}`);
    const bytes = fs.readFileSync(docxPath);
    assert.equal(bytes.subarray(0, 2).toString(), 'PK');
    const zip = await JSZip.loadAsync(bytes);
    const documentXml = await zip.file('word/document.xml').async('string');
    const stylesXml = await zip.file('word/styles.xml').async('string');
    assert.match(documentXml, /<w:pgSz[^>]*w:w="8391"[^>]*w:h="11906"/);
    assert.match(documentXml, /<w:cols[^>]*w:num="2"/);
    assert.match(stylesXml, /<w:sz[^>]*w:val="18"/);
    assert.ok(documentXml.includes('シナリオフロー'));
    assert.deepEqual(errors, []);
    console.log(`PASS: Word A5, 2-column, 12px font export with flow chart: ${docxPath}`);
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});

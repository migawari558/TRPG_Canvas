const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

const output = path.resolve('.test-output/input-performance');
app.setPath('userData', path.join(output, `profile-${Date.now()}`));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  try {
    await fs.mkdir(output, { recursive: true });
    const win = new BrowserWindow({ width: 1280, height: 800, show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    const errors = [];
    win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
    const js = code => win.webContents.executeJavaScript(code, true);
    await win.loadFile(path.resolve('dist/index.html'), { query: { testStorage: '1' } });
    await delay(900); win.show(); win.focus();

    const paragraphs = Array.from({ length: 700 }, (_, index) => `段落${index + 1}　${'長いシナリオの入力性能を確認する本文です。'.repeat(3)}`).join('\n\n');
    const ending = '削'.repeat(300);
    const source = `# 入力性能テスト\n\n${paragraphs}\n\n${ending}`;
    await js(`(()=>{const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify(source)}],'入力性能テスト.md'));const input=document.querySelector('input[accept=".md,.markdown,.txt"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await delay(700);
    await js(`(()=>{const paragraph=document.querySelector('.tiptap>p:last-child'),range=document.createRange(),selection=getSelection();range.selectNodeContents(paragraph);range.collapse(false);selection.removeAllRanges();selection.addRange(range);document.querySelector('.tiptap').focus();})()`);
    const before = await js(`document.querySelector('.tiptap>p:last-child').textContent.length`);
    const started = Date.now(), removals = 160;
    for (let index = 0; index < removals; index++) {
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Backspace' });
      win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Backspace' });
    }
    let after = before;
    for (let index = 0; index < 120; index++) {
      after = await js(`document.querySelector('.tiptap>p:last-child').textContent.length`);
      if (after <= before - removals) break;
      await delay(25);
    }
    const elapsed = Date.now() - started;
    assert.equal(after, before - removals, 'Backspace入力がすべて反映されませんでした');
    assert.ok(elapsed < 3000, `Backspace ${removals}回の反映に${elapsed}msかかりました`);
    assert.ok((await js(`document.querySelector('.save-state').textContent`)).includes('未保存'));
    await delay(1200);
    const saved = await js(`Object.values(JSON.parse(localStorage.getItem('trpg-canvas-documents-v1'))).find(value=>value.doc.title==='入力性能テスト')?.doc`);
    assert.ok(saved?.markdown.endsWith('削'.repeat(300 - removals)), '連続入力後の本文が自動保存されていません');
    assert.deepEqual(errors, []);
    console.log(`PASS: ${removals} rapid Backspaces in ${elapsed}ms; derived UI and autosave remain correct`);
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});

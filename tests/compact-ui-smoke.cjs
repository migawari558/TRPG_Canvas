const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

const output = path.resolve('.test-output/compact-ui');
app.setPath('userData', path.join(output, `profile-${Date.now()}`));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  try {
    await fs.mkdir(output, { recursive: true });
    const win = new BrowserWindow({ width: 1100, height: 650, show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    const errors = [];
    win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
    const js = async code => { const value = await win.webContents.executeJavaScript(code, true); await delay(100); return value; };
    await win.loadFile(path.resolve('dist/index.html'), { query: { testStorage: '1' } });
    await delay(1000); win.show(); win.focus();

    const topbarHeight = await js(`document.querySelector('.topbar').getBoundingClientRect().height`);
    const toolbarHeight = await js(`document.querySelector('.editor-toolbar').getBoundingClientRect().height`);
    assert.ok(topbarHeight <= 44, `topbar is ${topbarHeight}px`);
    assert.ok(toolbarHeight <= 40, `editor toolbar is ${toolbarHeight}px`);
    const expandedHeight = await js(`document.querySelector('.work-area').getBoundingClientRect().height`);
    await js(`document.querySelector('[aria-label="上部UIを折りたたむ"]').click()`);
    assert.equal(await js(`document.querySelector('.app').classList.contains('top-ui-collapsed')`), true);
    assert.ok(await js(`document.querySelector('.work-area').getBoundingClientRect().height`) > expandedHeight + 25);
    assert.equal(await js(`localStorage.getItem('trpg-top-ui-collapsed')`), 'true');

    await win.webContents.reload(); await delay(1000);
    assert.equal(await js(`document.querySelector('.app').classList.contains('top-ui-collapsed')`), true);
    await js(`document.querySelector('[aria-label="上部UIを表示"]').click()`);
    await js(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === '表示設定').click()`);
    assert.equal(await js(`document.querySelector('[aria-label="メニュー・目次の文字サイズ"]').min`), '70');
    await js(`(()=>{const input=document.querySelector('[aria-label="メニュー・目次の文字サイズ"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,75);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.equal(await js(`document.querySelector('.app').style.getPropertyValue('--ui-scale')`), '0.75');
    assert.equal(await js(`JSON.parse(localStorage.getItem('trpg-appearance')).uiScale`), 75);
    assert.deepEqual(errors, []);
    console.log('PASS: compact short-screen chrome, collapsible scenario information, persisted state, and 70% UI scale');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});

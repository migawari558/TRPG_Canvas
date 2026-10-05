const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

const output = path.resolve('.test-output/browser-drive');
app.disableHardwareAcceleration();
app.setPath('userData', path.join(output, `profile-${Date.now()}`));
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

app.whenReady().then(async () => {
  try {
    await fs.mkdir(output, { recursive: true });
    const window = new BrowserWindow({ width: 1280, height: 900, show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    const errors = [];
    window.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
    await window.loadFile(path.resolve('dist/index.html'));
    await delay(1200);
    const js = code => window.webContents.executeJavaScript(code, true);
    assert.equal(await js('window.canvas'), undefined);
    assert.ok(await js(`document.body.innerText.includes('霧の向こうの灯台')`));
    await js(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent.includes('保存・同期')).click()`);
    await delay(150);
    assert.ok(await js(`document.querySelector('[role="dialog"]').innerText.includes('Google Drive同期は準備中です')`));
    assert.ok(await js(`document.querySelector('[role="dialog"]').innerText.includes('選んだファイルだけを読み書き')`));
    await fs.writeFile(path.join(output, 'drive-settings.png'), (await window.webContents.capturePage()).toPNG());
    assert.deepEqual(errors, []);
    console.log('PASS: browser storage starts normally and shows safe Google Drive setup state');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});

const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const output = path.resolve('.test-output/design');
app.setPath('userData', path.join(output, `profile-${Date.now()}`));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  try {
    await fs.mkdir(output, { recursive: true });
    const { themes, previewCustomTheme } = await import(pathToFileURL(path.resolve('src/themes.mjs')));
    const win = new BrowserWindow({ width: 1440, height: 900, show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    const errors = [];
    win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
    const js = async code => { const result = await win.webContents.executeJavaScript(code, true); await delay(80); return result; };
    await win.loadFile(path.resolve('dist/index.html'), { query: { testStorage: '1' } });
    await delay(1000); win.showInactive();
    const custom = { id: 'custom-12345678-1234-1234-1234-123456789abc', name: 'Custom', baseId: 'mono', background: '#182332', accent: '#72cdb6', heading: '#a9c6ef' };
    await js(`localStorage.setItem('trpg-custom-themes-v1', JSON.stringify([${JSON.stringify(custom)}]))`);
    for (const theme of [...themes, previewCustomTheme(custom)]) {
      await js(`localStorage.setItem('trpg-appearance', JSON.stringify({theme:${JSON.stringify(theme.id)},fontSize:17,uiScale:100}))`);
      await win.webContents.reload(); await delay(650);
      assert.equal(await js(`document.querySelector('.app').dataset.theme`), theme.id);
      const before = await js(`document.querySelector('.editor-area').getBoundingClientRect().width`);
      await js(`document.querySelector('[aria-label="目次を閉じる"]').click()`);
      assert.equal(await js(`getComputedStyle(document.querySelector('.sidebar')).display`), 'none');
      assert.ok(await js(`document.querySelector('.brand').getBoundingClientRect().width > 0`));
      assert.ok(await js(`document.querySelector('.editor-area').getBoundingClientRect().width`) > before + 150);
      await js(`document.querySelector('[aria-label="目次を開く"]').click()`);
      assert.ok(await js(`document.querySelector('.outline-list').getBoundingClientRect().height > 0`));
      assert.ok(await js(`(()=>{const t=document.querySelector('.editor-toolbar').getBoundingClientRect(),p=document.querySelector('.editor-area').getBoundingClientRect();return t.left>p.left&&t.right<p.right&&t.height>0})()`));
      assert.equal(await js(`getComputedStyle(document.querySelector('.editor-toolbar')).backgroundColor`), await js(`getComputedStyle(document.querySelector('.paper')).backgroundColor`));
      assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth`));
      await fs.writeFile(path.join(output, `${theme.id}.png`), (await win.webContents.capturePage()).toPNG());
    }
    for (const width of [1100, 800, 640]) {
      win.setSize(width, 700); await delay(150);
      assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth`));
      await js(`document.querySelector('[aria-label="目次を閉じる"]').click()`);
      assert.ok(await js(`document.querySelector('.brand').getBoundingClientRect().left>=0`));
      await js(`document.querySelector('[aria-label="目次を開く"]').click()`);
      assert.ok(await js(`document.querySelector('.sidebar').getBoundingClientRect().width > 150`));
      if (width <= 900) {
        assert.ok(await js(`(()=>{const b=document.querySelector('.outline-panel-close'),r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()`));
        await js(`document.querySelector('.outline-panel-close').click()`);
        assert.equal(await js(`getComputedStyle(document.querySelector('.sidebar')).display`), 'none');
        await js(`document.querySelector('[aria-label="目次を開く"]').click()`);
      }
      await fs.writeFile(path.join(output, `width-${width}.png`), (await win.webContents.capturePage()).toPNG());
    }
    await js(`document.querySelector('.brand').click()`);
    assert.ok(await js(`!!document.querySelector('.dashboard')`));
    assert.ok(await js(`document.querySelector('.brand').getBoundingClientRect().width>0`));
    assert.deepEqual(errors, []);
    console.log('PASS: six built-in themes and custom theme, independent outline, persistent app rail, floating toolbar, responsive widths, dashboard navigation');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});

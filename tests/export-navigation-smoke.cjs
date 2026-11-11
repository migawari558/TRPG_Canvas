const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.resolve('.test-output/export-navigation');
app.setPath('userData', path.join(output, `profile-${Date.now()}`));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  try {
    await fs.mkdir(output, { recursive: true });
    const { exportHtml } = await import('../src/export.mjs');
    const { sampleDocument } = await import('../src/model.mjs');
    const doc = sampleDocument();
    const win = new BrowserWindow({ width: 1280, height: 900, show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    const js = async code => { const value = await win.webContents.executeJavaScript(code, true); await delay(100); return value; };
    const toggle = async () => {
      const point = await js(`(()=>{const r=document.querySelector('.export-navigation summary').getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
      win.webContents.sendInputEvent({ type: 'mouseDown', ...point, button: 'left', clickCount: 1 });
      win.webContents.sendInputEvent({ type: 'mouseUp', ...point, button: 'left', clickCount: 1 });
      await delay(150);
    };
    for (const theme of ['forest', 'tahoe-dark']) {
      const html = exportHtml(doc, { theme, copyButtons: false, interactive: false });
      assert.ok(!html.includes('<script>'), 'Native contents must work without scripts');
      const file = path.join(output, `${theme}.html`);
      await fs.writeFile(file, html);
      await win.loadFile(file); await delay(200); win.show();
      assert.ok(await js(`document.querySelector('.export-navigation').getBoundingClientRect().right <= document.querySelector('main').getBoundingClientRect().left`));
      assert.equal(await js(`document.querySelectorAll('.toc-count').length`), 0);
      assert.equal(await js(`getComputedStyle(document.querySelector('.toc-close-label')).display`), 'block');
      assert.equal(await js(`getComputedStyle(document.querySelector('.toc-open-label')).display`), 'none');
      assert.ok(await js(`Array.from(document.querySelectorAll('.toc-links a')).every(link=>document.querySelector(link.getAttribute('href')))`));
      const openLeft = await js(`document.querySelector('main').getBoundingClientRect().left`);
      await toggle();
      assert.equal(await js(`document.querySelector('.export-navigation').open`), false);
      assert.notEqual(await js(`getComputedStyle(document.querySelector('.toc-open-label')).display`), 'none');
      assert.equal(await js(`getComputedStyle(document.querySelector('.toc-close-label')).display`), 'none');
      assert.ok(await js(`document.querySelector('main').getBoundingClientRect().left`) < openLeft);
      await toggle();
      assert.equal(await js(`document.querySelector('.export-navigation').open`), true);
      await js(`document.querySelectorAll('.toc-links a')[1].click()`);
      assert.ok(await js(`location.hash.startsWith('#section-')`));
      await js(`window.scrollTo(0,0)`);
      await fs.writeFile(path.join(output, `${theme}.png`), (await win.webContents.capturePage()).toPNG());
    }
    win.setSize(640, 800); await delay(150);
    await toggle();
    assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth`));
    await toggle();
    assert.ok(await js(`document.querySelector('.export-navigation').getBoundingClientRect().right<=innerWidth`));
    console.log('PASS: standalone HTML contents without scripts, native open/close, valid anchors, light/dark themes and narrow viewport');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});

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
    const searchOutline = async value => js(`(()=>{const input=document.querySelector('[aria-label="目次を検索"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await js(`document.querySelector('[aria-label="探索：霧に沈む町を折りたたむ"]').click()`);
    assert.equal(await js(`Array.from(document.querySelectorAll('.outline-link')).some(item=>item.textContent.includes('喫茶店'))`), false);
    await searchOutline('喫茶店');
    assert.equal(await js(`document.querySelectorAll('.outline-item').length`), 2, 'Search retains matching heading and its ancestor');
    assert.ok(await js(`Array.from(document.querySelectorAll('.outline-link')).some(item=>item.textContent.includes('探索：'))`));
    await searchOutline('存在しない見出し');
    assert.ok(await js(`!!document.querySelector('.outline-empty')`));
    await js(`document.querySelector('[aria-label="目次の検索をクリア"]').click()`);
    assert.equal(await js(`Array.from(document.querySelectorAll('.outline-link')).some(item=>item.textContent.includes('喫茶店'))`), false, 'Clearing search restores collapsed state');
    await js(`document.querySelector('[aria-label="探索：霧に沈む町を展開"]').click()`);
    assert.ok(await js(`document.querySelector('.outline-flow-button').getBoundingClientRect().height>0`));
    const custom = { id: 'custom-12345678-1234-1234-1234-123456789abc', name: 'Custom', baseId: 'mono', background: '#182332', accent: '#72cdb6', heading: '#a9c6ef' };
    await js(`localStorage.setItem('trpg-custom-themes-v1', JSON.stringify([${JSON.stringify(custom)}]))`);
    for (const theme of [...themes, previewCustomTheme(custom)]) {
      await js(`localStorage.setItem('trpg-appearance', JSON.stringify({theme:${JSON.stringify(theme.id)},fontSize:17,uiScale:100}))`);
      await win.webContents.reload(); await delay(650);
      assert.equal(await js(`document.querySelector('.app').dataset.theme`), theme.id);
      assert.equal(await js(`document.querySelector('.view-tabs').contains(document.querySelector('.notes-toggle'))`), false);
      assert.ok(await js(`document.querySelector('.view-tabs').getBoundingClientRect().right < document.querySelector('.notes-toggle').getBoundingClientRect().left`));
      const before = await js(`document.querySelector('.editor-area').getBoundingClientRect().width`);
      await js(`document.querySelector('[aria-label="目次を閉じる"]').click()`);
      assert.equal(await js(`getComputedStyle(document.querySelector('.sidebar')).display`), 'none');
      assert.ok(await js(`document.querySelector('.brand').getBoundingClientRect().width > 0`));
      assert.ok(await js(`document.querySelector('.editor-area').getBoundingClientRect().width`) > before + 150);
      await js(`document.querySelector('[aria-label="目次を開く"]').click()`);
      assert.ok(await js(`document.querySelector('.outline-list').getBoundingClientRect().height > 0`));
      assert.ok(await js(`(()=>{const t=document.querySelector('.editor-toolbar').getBoundingClientRect(),p=document.querySelector('.document-stage').getBoundingClientRect(),mode=document.querySelector('.mode-switch').getBoundingClientRect();return t.left>p.left&&t.right<p.right&&t.height>0&&mode.right<=t.left&&Math.abs((mode.top+mode.bottom-t.top-t.bottom)/2)<4})()`));
      assert.equal(await js(`getComputedStyle(document.querySelector('.editor-toolbar')).backgroundColor`), await js(`getComputedStyle(document.querySelector('.paper')).backgroundColor`));
      assert.ok(await js(`(() => {
        const toolbar = document.querySelector('.editor-toolbar').getBoundingClientRect();
        const paper = document.querySelector('.paper').getBoundingClientRect();
        const content = document.querySelector('.paper').firstElementChild.getBoundingClientRect();
        const tabs = document.querySelector('.view-tabs').getBoundingClientRect();
        return paper.top <= tabs.top && toolbar.top > paper.top && toolbar.bottom < content.top;
      })()`), 'Paper extends behind the mode tabs and toolbar without covering the content');
      assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth`));
      await fs.writeFile(path.join(output, `${theme.id}.png`), (await win.webContents.capturePage()).toPNG());
    }
    await js(`localStorage.setItem('trpg-appearance', JSON.stringify({theme:'forest',fontSize:17,uiScale:100}))`);
    await win.webContents.reload(); await delay(650);
    for (const width of [1100, 980, 800, 640]) {
      win.setSize(width, 700); await delay(150);
      assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth`));
      assert.ok(await js(`(()=>{const t=document.querySelector('.editor-toolbar').getBoundingClientRect(),m=document.querySelector('.mode-switch').getBoundingClientRect(),n=document.querySelector('.notes-toggle').getBoundingClientRect(),c=document.querySelector('.paper').firstElementChild.getBoundingClientRect();return Math.abs((m.top+m.bottom-t.top-t.bottom)/2)<4&&t.right<n.left&&t.bottom<c.top})()`), `Controls must stay in one row above the text at ${width}px`);
      await js(`document.querySelector('[aria-label="目次を閉じる"]').click()`);
      assert.ok(await js(`document.querySelector('.brand').getBoundingClientRect().left>=0`));
      await js(`document.querySelector('[aria-label="目次を開く"]').click()`);
      const sidebarState = await js(`(()=>{const s=document.querySelector('.sidebar');return {width:s.getBoundingClientRect().width,hidden:s.hidden,display:getComputedStyle(s).display,grid:getComputedStyle(document.querySelector('.app')).gridTemplateColumns}})()`);
      assert.ok(sidebarState.width > 150, `Outline at ${width}px: ${JSON.stringify(sidebarState)}`);
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

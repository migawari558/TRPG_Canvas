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
    doc.markdown += '\n\n#! 追加の章\n\n# 見出し\n\n## 章の中の場面\n\n### 場面の詳細\n\n説明文\n\n#! 次の章\n';
    doc.markdown += Array.from({ length: 80 }, (_, i) => `\n\n## 追加の場面 ${i + 1}\n\n${'長いシナリオの本文です。'.repeat(30)}`).join('');
    const win = new BrowserWindow({ width: 1280, height: 900, show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    const js = async code => { const value = await win.webContents.executeJavaScript(`(()=>{const window=globalThis.document.querySelector('iframe')?.contentWindow||globalThis;const document=window.document;const location=window.location;const innerHeight=window.innerHeight;const innerWidth=window.innerWidth;const getComputedStyle=window.getComputedStyle.bind(window);return ${code}})()`, true); await delay(100); return value; };
    const toggle = async () => {
      const point = await js(`(()=>{const r=document.querySelector('.export-navigation summary').getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
      win.webContents.sendInputEvent({ type: 'mouseDown', ...point, button: 'left', clickCount: 1 });
      win.webContents.sendInputEvent({ type: 'mouseUp', ...point, button: 'left', clickCount: 1 });
      await delay(150);
    };
    const wheel = async selector => {
      const point = await js(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(Math.min(r.bottom,innerHeight)-80)}})()`);
      win.webContents.sendInputEvent({ type: 'mouseMove', ...point });
      win.webContents.sendInputEvent({ type: 'mouseWheel', ...point, deltaY: -500, deltaX: 0 });
      await delay(300);
    };
    for (const [theme, preview] of [['forest', false], ['tahoe-dark', false], ['forest', true]]) {
      const html = exportHtml(doc, { theme, copyButtons: false, interactive: false });
      assert.ok(!html.includes('<script>'), 'Native contents must work without scripts');
      const name = `${theme}${preview ? '-preview' : ''}`;
      const file = path.join(output, `${name}.html`);
      const escaped = html.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
      await fs.writeFile(file, preview ? `<!doctype html><style>html,body{margin:0;height:100%;overflow:hidden}iframe{display:block;border:0;width:100%;height:100%}</style><iframe sandbox="allow-same-origin" srcdoc="${escaped}"></iframe>` : html);
      await win.loadFile(file); await delay(200); win.show();
      const group = '.toc-group:has(.toc-group)';
      const clickGroup = async () => {
        const point = await js(`(()=>{const r=document.querySelector('${group} > summary .toc-chevron').getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
        win.webContents.sendInputEvent({ type: 'mouseDown', ...point, button: 'left', clickCount: 1 });
        win.webContents.sendInputEvent({ type: 'mouseUp', ...point, button: 'left', clickCount: 1 });
        await delay(150);
      };
      await js(`document.querySelector('${group}').scrollIntoView()`);
      await clickGroup();
      assert.equal(await js(`document.querySelector('${group}').open`), false, 'Chapter chevron must collapse its children');
      assert.ok(await js(`document.querySelector('${group} > summary a').checkVisibility()`), 'Collapsed chapter link must stay visible');
      assert.equal(await js(`document.querySelector('${group} .toc-children a').checkVisibility()`), false);
      await clickGroup();
      assert.equal(await js(`document.querySelector('${group}').open`), true);
      assert.ok(await js(`document.querySelector('${group} .toc-children a').checkVisibility()`));
      await js(`document.querySelector('.export-toc').scrollTop=0`);
      await js(`window.scrollTo(0,0)`);
      assert.ok(await js(`(()=>{const s=document.querySelector('.export-navigation summary'),r=s.getBoundingClientRect();return s.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()`), 'Contents header must receive pointer input');
      const scrollArea = await js(`(()=>{const n=document.querySelector('.export-toc');return {height:n.clientHeight,content:n.scrollHeight,bottom:n.getBoundingClientRect().bottom,viewport:innerHeight,links:n.querySelectorAll('a').length}})()`);
      assert.ok(scrollArea.height>0&&scrollArea.content>scrollArea.height&&scrollArea.bottom<=scrollArea.viewport+1, `Long contents must have a viewport-bounded scroll area: ${JSON.stringify(scrollArea)}`);
      await wheel('.export-toc');
      assert.ok(await js(`document.querySelector('.export-toc').scrollTop>0`), 'Wheel must scroll contents independently');
      assert.equal(await js(`window.scrollY`), 0);
      await js(`document.querySelector('.export-toc').scrollTop=1e6`);
      assert.ok(await js(`(()=>{const n=document.querySelector('.export-toc'),r=Array.from(n.querySelectorAll('a')).at(-1).getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=72})()`), 'Final contents link must be reachable');
      await wheel('main');
      assert.ok(await js(`window.scrollY>0`), 'Body must remain scrollable beside contents');
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
      if (!preview) {
        await js(`document.querySelectorAll('.toc-links a')[1].click()`);
        assert.ok(await js(`location.hash.startsWith('#section-')`));
      }
      await js(`window.scrollTo(0,0)`);
      await fs.writeFile(path.join(output, `${name}.png`), (await win.webContents.capturePage()).toPNG());
    }
    win.setSize(640, 800); await delay(150);
    await toggle();
    assert.ok(await js(`document.documentElement.scrollWidth<=innerWidth`));
    await toggle();
    assert.ok(await js(`document.querySelector('.export-navigation').getBoundingClientRect().right<=innerWidth`));
    console.log('PASS: standalone and sandboxed preview HTML, native open/close after scrolling, independent long contents/body wheel scrolling, final link access, light/dark and narrow viewport');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});

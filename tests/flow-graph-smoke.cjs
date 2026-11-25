const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const output = path.resolve(__dirname, '../.test-output/flow-graph');
app.setPath('userData', path.join(output, String(Date.now())));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 950, show: false, webPreferences: { backgroundThrottling: false } });
  const js = code => win.webContents.executeJavaScript(code);
  try {
    await win.loadFile(path.resolve(__dirname, '../dist/index.html'), { query: { testStorage: '1' } });
    win.show();
    win.focus();
    await wait(600);
    await js("document.querySelectorAll('.mode-switch button')[1].click()");
    await wait(500);
    const card = '.react-flow__node[data-id="intro"] .flow-node-card';
    assert.equal(await js(`document.querySelector('${card}').offsetHeight`), 58);
    assert.equal(await js(`document.querySelectorAll('${card} button, ${card} input').length`), 0);
    const pose = () => js("document.querySelector('.react-flow__viewport').style.transform");
    const start = await js(`(() => {
      const pane = document.querySelector('.react-flow__pane');
      const r = pane.getBoundingClientRect();
      for (let y = r.top + 24; y < r.bottom - 150; y += 20) {
        for (let x = r.left + 24; x < r.right - 200; x += 20) {
          if (document.elementFromPoint(x, y) === pane) return { x: Math.round(x), y: Math.round(y) };
        }
      }
    })()`);
    assert.ok(start, 'empty canvas is available');
    async function drag(from, to, modifiers = []) {
      win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...from, modifiers });
      win.webContents.sendInputEvent({ type: 'mouseMove', ...to, modifiers: ['leftButtonDown', ...modifiers] });
      await wait(100);
      win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...to, modifiers });
      await wait(120);
    }
    const before = await pose();
    await drag(start, { x: start.x + 95, y: start.y + 45 });
    assert.notEqual(await pose(), before, 'plain left drag pans');
    const shifted = await pose();
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Shift' });
    await drag(start, { x: start.x + 60, y: start.y + 30 }, ['shift']);
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Shift' });
    assert.equal(await pose(), shifted, 'shift drag does not pan');

    await js(`document.querySelector('${card} .node-label').click()`);
    await wait(150);
    assert.equal(await js("document.querySelector('.flow-inspector').tagName"), 'ASIDE');
    assert.match(await js("document.querySelector('.flow-inspector').textContent"), /本文を書く/);
    await js("document.querySelector('.flow-view').dispatchEvent(new KeyboardEvent('keydown',{key:'F2',bubbles:true}))");
    await wait(120);
    assert.equal(await js("document.activeElement === document.querySelector('.flow-inspector input')"), true);
    await js(`(() => {
      const input = document.querySelector('.flow-inspector input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '改名したシーン');
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    })()`);
    await wait(150);
    assert.equal(await js(`document.querySelector('${card} .node-label').textContent`), '改名したシーン');
    const memo = '第一行\n第二行\n第三行は詳細パネルで読む';
    assert.equal(await js("document.querySelector('.flow-inspector label:nth-of-type(2) textarea').getAttribute('aria-label')"), 'シーンメモ');
    await js(`(() => {
      const input = document.querySelector('[aria-label="シーンメモ"]');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, ${JSON.stringify(memo)});
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    })()`);
    await wait(120);
    assert.deepEqual(await js(`(() => {
      const preview = document.querySelector('${card} .flow-node-memo');
      return [preview.textContent, getComputedStyle(preview).webkitLineClamp, preview.scrollHeight > preview.clientHeight];
    })()`), [memo, '2', true]);
    await js("document.querySelector('.flow-shortcuts summary').click()");
    await wait(100);
    assert.equal(await js("document.querySelector('.flow-shortcuts').open"), true);
    assert.match(await js("document.querySelector('.flow-shortcut-list').innerText"), /Shift\+N/);
    assert.equal(await js(`(() => {
      const list = document.querySelector('.flow-shortcut-list');
      const box = list.getBoundingClientRect();
      return list.contains(document.elementFromPoint(box.right - 14, box.top + 18));
    })()`), true, 'shortcut list overlays the open inspector');
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'shortcuts.png'), (await win.webContents.capturePage()).toPNG());
    await js("document.querySelector('.flow-shortcuts summary').dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles: true}))");
    assert.equal(await js("document.querySelector('.flow-shortcuts').open"), false);
    assert.match(await js("document.querySelector('.flow-relations').textContent"), /次のシーン.*喫茶店/);
    await js("document.querySelector('.flow-inspector-actions .secondary-button').click()");
    await wait(250);
    await js(`(() => {
      const input = document.querySelector('[aria-label="情報の内容"]');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, '灯台に続く道がある');
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    })()`);
    await wait(150);
    await js("document.querySelector('.flow-inspector .jump-button').click()");
    await wait(300);
    assert.match(await js("document.querySelector('.flow-relations').textContent"), /提示する情報.*灯台に続く道がある/);
    await js("document.querySelector('.flow-relation-section button').click()");
    await wait(300);
    assert.equal(await js("document.querySelector('[aria-label=情報の内容]').value"), '灯台に続く道がある');
    await js("document.querySelector('.flow-inspector .jump-button').click()");
    await wait(300);
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'desktop.png'), (await win.webContents.capturePage()).toPNG());
    win.setSize(1000, 760);
    await wait(300);
    await fs.writeFile(path.join(output, 'compact.png'), (await win.webContents.capturePage()).toPNG());
    console.log('PASS: compact nodes, left pan, Shift selection, inspector and rename');
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});

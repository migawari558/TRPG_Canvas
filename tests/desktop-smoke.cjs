const { app, BrowserWindow, dialog, shell } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.resolve(__dirname, `../.test-output/desktop-${Date.now()}`);
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(output, 'profile'));
app.setPath('documents', output);
dialog.showSaveDialog = async (_window, options) => ({ canceled: false, filePath: path.join(output, options.defaultPath) });
dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path.join(output, 'sync-folder')] });
fs.mkdirSync(path.join(output, 'sync-folder'), { recursive: true });
require('../electron/main.cjs');
shell.trashItem = async file => { assert.ok(file.startsWith(output + path.sep)); await fsp.rename(file, file + '.trashed'); };
const delay = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  try {
    let window;
    for (let i = 0; i < 30; i++) { await delay(200); window = BrowserWindow.getAllWindows()[0]; if (window && !window.webContents.isLoading()) break; }
    await delay(1300);
    const js = code => window.webContents.executeJavaScript(code, true);
    assert.ok(await js('!!window.canvas'));
    const info = await js('window.canvas.info()');
    assert.equal(info.folder, path.join(output, 'TRPG Canvas'));
    const list = await js('window.canvas.list()');
    assert.ok(list.documents.length >= 1);
    const id = list.documents[0].id;
    const loaded = await js(`window.canvas.load(${JSON.stringify(id)})`);
    assert.equal(loaded.doc.version, 1);
    const { exportHtml } = await import('../src/export.mjs');
    const html = exportHtml(loaded.doc, { copyButtons: false });
    await js(`window.canvas.export('pdf','native-output',${JSON.stringify(html)})`);
    assert.equal(fs.readFileSync(path.join(output, 'native-output.pdf')).subarray(0, 4).toString(), '%PDF');
    await js(`window.canvas.export('html','native-output',${JSON.stringify(html)})`);
    assert.ok(fs.readFileSync(path.join(output, 'native-output.html'), 'utf8').includes('<svg'));
    const chosen = await js('window.canvas.chooseFolder()');
    assert.equal(chosen.folder, path.join(output, 'sync-folder'));
    const stored = await js(`window.canvas.save(${JSON.stringify(loaded.doc)},null)`);
    assert.equal(stored.conflict, false);
    assert.ok(fs.existsSync(path.join(chosen.folder, `${id}.trpg.json`)));
    const settings = JSON.parse(fs.readFileSync(path.join(output, 'profile/settings.json'), 'utf8'));
    assert.equal(settings.folder, chosen.folder);
    await js(`window.canvas.remove(${JSON.stringify(id)},${JSON.stringify(stored.revision)})`);
    assert.ok(!fs.existsSync(path.join(chosen.folder, `${id}.trpg.json`)));
    assert.ok(fs.existsSync(path.join(chosen.folder, `${id}.trpg.json.trashed`)));
    console.log('PASS: sandboxed preload, native file save/load, native PDF and HTML export, workspace selection and settings persistence');
    app.exit(0);
  } catch (e) { console.error(e); app.exit(1); }
});

const { app, BrowserWindow, ipcMain, dialog, session, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const storage = require('./storage.cjs');
const { renderPdf } = require('./pdf.cjs');
const { prepareFolder, saveSettings, resolveWorkspace } = require('./workspace.cjs');
let mainWindow, folder, closeReady = false;
const dev = process.argv.includes('--dev');
async function start() {
  app.setAppUserModelId('jp.trpgcanvas.app');
  const workspace = await resolveWorkspace(app, dialog);
  if (!workspace) { app.quit(); return; }
  folder = workspace.folder;
  const { configFile } = workspace;
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ipcMain.handle('workspace:info', () => ({ folder }));
  ipcMain.handle('workspace:choose', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: 'シナリオの保存先（同期する場合はDrive / Dropbox内のフォルダ）', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled) return null;
    const next = result.filePaths[0];
    await prepareFolder(next);
    await saveSettings(configFile, next);
    folder = next;
    return { folder };
  });
  ipcMain.handle('document:list', () => storage.list(folder));
  ipcMain.handle('document:remove', (_event, id, revision) => storage.remove(folder, id, revision, file => shell.trashItem(file)));
  ipcMain.handle('document:preview-pdf', async (_event, content) => (await renderPdf(content)).toString('base64'));
  ipcMain.handle('document:load', (_event, id) => storage.read(folder, id));
  ipcMain.handle('document:save', (_event, doc, revision) => storage.save(folder, doc, revision));
  ipcMain.handle('document:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }], properties: ['openFile'] });
    if (result.canceled) return null;
    const file = result.filePaths[0];
    return { title: path.basename(file, path.extname(file)), markdown: await fs.readFile(file, 'utf8') };
  });
  ipcMain.handle('document:export', async (_event, format, title, content) => {
    if (!['html', 'pdf', 'md'].includes(format) || typeof content !== 'string') throw new Error('不正な書き出し形式');
    const safeTitle = String(title).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100) || 'scenario';
    const result = await dialog.showSaveDialog(mainWindow, { defaultPath: `${safeTitle}.${format}`, filters: [{ name: format.toUpperCase(), extensions: [format] }] });
    if (result.canceled) return null;
    if (format === 'pdf') {
      await fs.writeFile(result.filePath, await renderPdf(content));
    } else await fs.writeFile(result.filePath, content, 'utf8');
    return result.filePath;
  });
  ipcMain.on('app:close-ready', () => { closeReady = true; mainWindow.close(); });
  mainWindow = new BrowserWindow({ width: 1440, height: 940, minWidth: 980, minHeight: 700, backgroundColor: '#f7f5ef', title: 'TRPG Canvas', icon: path.join(__dirname, '../assets/icon.ico'), autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  mainWindow.on('close', event => { if (!closeReady) { event.preventDefault(); mainWindow.webContents.send('app:closing'); } });
  if (dev) await mainWindow.loadURL('http://127.0.0.1:5173');
  else await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}
app.whenReady().then(start).catch(error => { dialog.showErrorBox('起動エラー', error.message); app.quit(); });
app.on('window-all-closed', () => app.quit());

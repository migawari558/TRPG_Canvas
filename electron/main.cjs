const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const storage = require('./storage.cjs');
let mainWindow, folder, closeReady = false;
const dev = process.argv.includes('--dev');
async function start() {
  const configFile = path.join(app.getPath('userData'), 'settings.json');
  try { folder = JSON.parse(await fs.readFile(configFile, 'utf8')).folder; } catch {}
  folder ||= path.join(app.getPath('documents'), 'TRPG Canvas');
  await fs.mkdir(folder, { recursive: true });
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ipcMain.handle('workspace:info', () => ({ folder }));
  ipcMain.handle('workspace:choose', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: 'シナリオの保存先（同期する場合はDrive / Dropbox内のフォルダ）', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled) return null;
    const next = result.filePaths[0];
    await fs.access(next, require('node:fs').constants.W_OK);
    await fs.writeFile(configFile, JSON.stringify({ folder: next }));
    folder = next;
    return { folder };
  });
  ipcMain.handle('document:list', () => storage.list(folder));
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
      const printWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false } });
      try {
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);
        const data = await printWindow.webContents.printToPDF({ printBackground: true, pageSize: 'A4', margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 } });
        await fs.writeFile(result.filePath, data);
      } finally { printWindow.destroy(); }
    } else await fs.writeFile(result.filePath, content, 'utf8');
    return result.filePath;
  });
  ipcMain.on('app:close-ready', () => { closeReady = true; mainWindow.close(); });
  mainWindow = new BrowserWindow({ width: 1440, height: 940, minWidth: 980, minHeight: 700, backgroundColor: '#f7f5ef', title: 'TRPG Canvas', autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  mainWindow.on('close', event => { if (!closeReady) { event.preventDefault(); mainWindow.webContents.send('app:closing'); } });
  if (dev) await mainWindow.loadURL('http://127.0.0.1:5173');
  else await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}
app.whenReady().then(start).catch(error => { dialog.showErrorBox('起動エラー', error.message); app.quit(); });
app.on('window-all-closed', () => app.quit());

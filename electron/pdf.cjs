const { BrowserWindow } = require('electron');
let queue = Promise.resolve();
function renderPdf(content) {
  if (typeof content !== 'string' || content.length > 20_000_000) return Promise.reject(new Error('PDFのデータ形式またはサイズが不正です'));
  const task = queue.catch(() => {}).then(async () => {
    const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false } });
    try {
      await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);
      return await window.webContents.printToPDF({ printBackground: true, pageSize: 'A4', margins: { top: .5, bottom: .5, left: .5, right: .5 } });
    } finally { window.destroy(); }
  });
  queue = task;
  return task;
}
module.exports = { renderPdf };

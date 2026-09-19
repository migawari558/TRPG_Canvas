const { BrowserWindow } = require('electron');
const { preparePdfLayout } = require('./pdf-layout.cjs');
const { pdfPageSize } = require('./pdf-page-size.cjs');
const { PDFDocument, rgb } = require('pdf-lib');
let queue = Promise.resolve();
function renderPdf(content, requestedPageSize) {
  if (typeof content !== 'string' || content.length > 20_000_000) return Promise.reject(new Error('PDFのデータ形式またはサイズが不正です'));
  const pageSize = pdfPageSize(requestedPageSize);
  const task = queue.catch(() => {}).then(async () => {
    const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false } });
    try {
      await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);
      window.webContents.debugger.attach('1.3');
      await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { media: 'print' });
      const evaluation = await window.webContents.debugger.sendCommand('Runtime.evaluate', { expression: `(${preparePdfLayout.toString()})(${JSON.stringify(pageSize)})`, returnByValue: true });
      if (evaluation.exceptionDetails) throw new Error(evaluation.exceptionDetails.exception?.description || 'PDFレイアウトの調整に失敗しました');
      const layout = evaluation.result.value;
      const electronPageSize = pageSize === 'B5' ? { width: 176 / 25.4, height: 250 / 25.4 } : pageSize;
      const bytes = await window.webContents.printToPDF({ printBackground: true, pageSize: electronPageSize, margins: { top: .5, bottom: .5, left: .5, right: .5 } });
      const output = await PDFDocument.load(bytes);
      const channels = (layout.background.match(/[\d.]+/g) || ['255','255','255']).slice(0,3).map(Number);
      for (const page of output.getPages()) {
        const size = page.getSize();
        page.drawRectangle({ x: 0, y: 0, width: size.width, height: size.height, color: rgb(...channels.map(value => value / 255)) });
        const streams = page.node.Contents(), last = streams.size() - 1, backdrop = streams.get(last);
        streams.remove(last); streams.insert(0, backdrop);
      }
      return Buffer.from(await output.save());
    } finally { window.destroy(); }
  });
  queue = task;
  return task;
}
module.exports = { renderPdf };

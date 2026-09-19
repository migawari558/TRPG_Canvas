const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PDFDocument } = require('pdf-lib');
const output = path.resolve('.test-output/pdf-page-sizes');
require('node:fs').mkdirSync(path.join(output, 'profile'), { recursive: true });
app.setPath('userData', path.join(output, 'profile'));

app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  try {
    const { renderPdf } = require('../electron/pdf.cjs');
    const { exportHtml } = await import('../src/export.mjs');
    const { sampleDocument } = await import('../src/model.mjs');
    await fs.mkdir(output, { recursive: true });
    const sizes = { A4: [595.3, 841.9], A5: [419.5, 595.3], B5: [516, 728.5], Letter: [612, 792] };
    const doc = sampleDocument();
    assert.ok(exportHtml(doc, { printPreview: true, pdfPageSize: 'B5' }).includes('@page{size:182mm 257mm'));
    for (const [size, expected] of Object.entries(sizes)) {
      const data = await renderPdf(exportHtml(doc, { pdfPageSize: size, columns: 2, includeFlow: false, fontSize: size === 'A5' ? 7 : 17 }), size);
      await fs.writeFile(path.join(output, `${size}.pdf`), data);
      const pdf = await PDFDocument.load(data);
      const page = pdf.getPages()[0];
      assert.ok(Math.abs(page.getWidth() - expected[0]) < 1, `${size} width: ${page.getWidth()}`);
      assert.ok(Math.abs(page.getHeight() - expected[1]) < 1, `${size} height: ${page.getHeight()}`);
    }
    assert.throws(() => renderPdf('<p>test</p>', 'A0'), /未対応/);
    console.log('PASS: A4, A5 (7px), B5, Letter PDF page dimensions and invalid-size rejection');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});

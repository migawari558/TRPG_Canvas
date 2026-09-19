const sizes = Object.freeze({
  A4: [210, 297],
  A5: [148, 210],
  B5: [176, 250],
  Letter: [215.9, 279.4]
});

function pdfPageSize(value) {
  if (value === undefined) return 'A4';
  if (!Object.hasOwn(sizes, value)) throw new Error('未対応のPDF用紙サイズです');
  return value;
}

module.exports = { sizes, pdfPageSize };

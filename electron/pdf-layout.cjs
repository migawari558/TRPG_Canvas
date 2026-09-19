// Executed in the isolated export window, never in the author's editor.
function preparePdfLayout(pageSize = 'A4') {
  const body = document.querySelector('.scenario-body');
  if (!body) return { background: '#ffffff' };
  const background = getComputedStyle(document.body).backgroundColor;
  const columns = Number(getComputedStyle(body).columnCount) || 1;
  const paper = { A4: [210, 297], A5: [148, 210], B5: [182, 257], Letter: [215.9, 279.4] }[pageSize] || [210, 297];
  const printableWidth = (paper[0] - 25.4) * 96 / 25.4;
  const printableHeight = (paper[1] - 25.4) * 96 / 25.4;
  const gap = parseFloat(getComputedStyle(body).columnGap) || 0;
  const width = (printableWidth - gap * (columns - 1)) / columns;
  const probe = document.createElement('div');
  probe.className = 'scenario-body';
  probe.style.cssText = `position:absolute;left:-10000px;top:0;width:${width}px;column-count:1!important;visibility:hidden`;
  document.body.append(probe);
  for (const block of body.querySelectorAll('.gm-note,blockquote,.copy-block')) {
    const copy = block.cloneNode(true); copy.style.breakInside = 'auto'; probe.replaceChildren(copy);
    if (copy.getBoundingClientRect().height > printableHeight - 2) {
      block.style.setProperty('break-inside', 'auto', 'important');
      block.style.setProperty('page-break-inside', 'auto', 'important');
      block.closest('.copy-block')?.style.setProperty('break-inside', 'auto', 'important');
    }
  }
  probe.remove();
  const blank = el => el.matches('p.blank-line') || (el.tagName === 'P' && !el.textContent.trim() && !el.querySelector('img'));
  let previous;
  for (const child of [...body.children]) {
    if (blank(child)) continue;
    if (child.tagName === 'H1' && previous?.tagName === 'H1') child.style.setProperty('break-before', 'auto', 'important');
    previous = child;
  }
  // Vertical margins are discarded at fragmentation boundaries, unlike empty line boxes.
  for (const parent of [body, ...body.querySelectorAll('.gm-note,blockquote')]) {
    let spaces = 0;
    for (const child of [...parent.children]) {
      if (blank(child)) {
        spaces += Math.max(1, child.querySelectorAll('br').length + (child.classList.contains('blank-line') ? 0 : 1));
        child.remove(); continue;
      }
      if (spaces && child.previousElementSibling && getComputedStyle(child).breakBefore !== 'column' && getComputedStyle(child).breakBefore !== 'page') {
        const css = getComputedStyle(child), lineHeight = parseFloat(css.lineHeight) || parseFloat(css.fontSize) * 1.95;
        child.style.marginTop = `${(parseFloat(css.marginTop) || 0) + spaces * lineHeight}px`;
      }
      spaces = 0;
    }
  }
  return { background };
}
module.exports = { preparePdfLayout };

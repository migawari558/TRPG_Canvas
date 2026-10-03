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
  // Leave room for Chromium's fragmentation rounding and the repeated speaker.
  // A segment that nearly equals the printable height can otherwise leak a few
  // final lines onto the next page without its speaker column.
  const dialogueLimit = printableHeight * .82;
  const dialogueSegment = (source, children) => {
    const segment = source.cloneNode(false); segment.classList.add('dialogue-segment');
    const speaker = source.querySelector(':scope > .dialogue-speaker')?.cloneNode(true);
    const originalBody = source.querySelector(':scope > .dialogue-body');
    const segmentBody = originalBody.cloneNode(false); children.forEach(child => segmentBody.append(child.cloneNode(true)));
    if (speaker) segment.append(speaker); segment.append(segmentBody); return segment;
  };
  const measuredHeight = element => { probe.replaceChildren(element); return element.getBoundingClientRect().height; };
  const textFragment = (element, start, end) => {
    const texts = [], walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) texts.push(node);
    const point = offset => {
      let seen = 0;
      for (const text of texts) { if (offset <= seen + text.data.length) return [text, Math.max(0, offset - seen)]; seen += text.data.length; }
      const last = texts.at(-1); return last ? [last, last.data.length] : [element, 0];
    };
    const range = document.createRange(), from = point(start), to = point(end);
    range.setStart(from[0], from[1]); range.setEnd(to[0], to[1]);
    const copy = element.cloneNode(false); copy.append(range.cloneContents()); return copy;
  };
  for (const dialogue of [...body.querySelectorAll(':scope > .dialogue')]) {
    const dialogueBody = dialogue.querySelector(':scope > .dialogue-body');
    if (!dialogueBody) continue;
    const children = [...dialogueBody.children];
    if (measuredHeight(dialogueSegment(dialogue, children)) <= dialogueLimit) { dialogue.classList.add('dialogue-segment'); continue; }
    const chunks = []; let current = [];
    const flush = () => { if (current.length) { chunks.push(dialogueSegment(dialogue, current)); current = []; } };
    for (const child of children) {
      if (measuredHeight(dialogueSegment(dialogue, [...current, child])) <= dialogueLimit) { current.push(child); continue; }
      flush();
      if (measuredHeight(dialogueSegment(dialogue, [child])) <= dialogueLimit) { current.push(child); continue; }
      const total = child.textContent.length;
      if (!total) { current.push(child); continue; }
      let start = 0;
      while (start < total) {
        let low = start + 1, high = total, best = low;
        while (low <= high) {
          const middle = Math.floor((low + high) / 2), fragment = textFragment(child, start, middle);
          if (measuredHeight(dialogueSegment(dialogue, [fragment])) <= dialogueLimit) { best = middle; low = middle + 1; } else high = middle - 1;
        }
        if (best < total) {
          const candidate = child.textContent.slice(start, best), boundary = Math.max(candidate.lastIndexOf(' '), candidate.lastIndexOf('\n'));
          if (boundary > candidate.length * .65) best = start + boundary + 1;
        }
        chunks.push(dialogueSegment(dialogue, [textFragment(child, start, best)])); start = best;
      }
    }
    flush(); chunks.forEach(chunk => dialogue.before(chunk)); dialogue.remove();
  }
  probe.replaceChildren();
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

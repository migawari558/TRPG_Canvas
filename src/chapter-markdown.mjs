// A chapter uses the explicit extension syntax '#! Chapter title'.
export function chapterPlugin(md) {
  md.block.ruler.before('heading', 'chapter', (state, startLine, _endLine, silent) => {
    if (state.sCount[startLine] - state.blkIndent >= 4) return false;
    const line = state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]);
    const match = /^#!(?:[ \t]+(.*)|$)/.exec(line);
    if (!match) return false;
    if (silent) return true;
    const open = state.push('heading_open', 'h1', 1); open.attrSet('data-chapter', ''); open.attrSet('class', 'chapter-heading'); open.map = [startLine, startLine + 1];
    const inline = state.push('inline', '', 0); inline.content = (match[1] || '').trim(); inline.children = []; inline.map = open.map;
    state.push('heading_close', 'h1', -1); state.line = startLine + 1; return true;
  }, { alt: ['paragraph', 'reference', 'blockquote'] });
}

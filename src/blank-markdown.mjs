export const blankMarker = '<!-- trpg-blank -->';
export function blankLinePlugin(md) {
  md.block.ruler.before('html_block', 'blank_line', (state, start, _end, silent) => {
    if (state.sCount[start] - state.blkIndent >= 4) return false;
    const line = state.src.slice(state.bMarks[start] + state.tShift[start], state.eMarks[start]).trim();
    if (line !== blankMarker) return false;
    if (silent) return true;
    const open = state.push('paragraph_open', 'p', 1); open.attrSet('class', 'blank-line'); open.map = [start, start + 1];
    state.push('paragraph_close', 'p', -1); state.line = start + 1; return true;
  }, { alt: ['paragraph', 'reference', 'blockquote'] });
}

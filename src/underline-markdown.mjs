// Markdown has no standard underline syntax; accept only paired, attribute-free u tags.
export function underlinePlugin(md) {
  md.inline.ruler.before('html_inline', 'scenario_underline', (state, silent) => {
    const start = state.pos;
    if (state.src.slice(start, start + 3) !== '<u>') return false;
    const end = state.src.indexOf('</u>', start + 3);
    if (end < 0 || end + 4 > state.posMax) return false;
    if (!silent) {
      state.push('underline_open', 'u', 1);
      const children = []; md.inline.parse(state.src.slice(start + 3, end), md, state.env, children);
      state.tokens.push(...children); state.push('underline_close', 'u', -1);
    }
    state.pos = end + 4; return true;
  });
}

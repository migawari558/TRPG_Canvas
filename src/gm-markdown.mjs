// A Markdown blockquote marker preserves note styling through .md round trips.
export function gmNotePlugin(md) {
  md.block.ruler.before('fence', 'gm_fence', (state, start, end, silent) => {
    const line = n => state.src.slice(state.bMarks[n] + state.tShift[n], state.eMarks[n]);
    const match = /^(\:{3,})gm\s*$/i.exec(line(start));
    if (!match || state.sCount[start] - state.blkIndent >= 4) return false;
    if (silent) return true;
    let stop = start + 1;
    while (stop < end && line(stop).trim() !== match[1]) stop++;
    const open = state.push('gm_open', 'aside', 1); open.attrSet('data-gm-note', 'true'); open.attrSet('class', 'gm-note');
    const oldParent = state.parentType; state.parentType = 'gm_note';
    state.md.block.tokenize(state, start + 1, stop); state.parentType = oldParent;
    state.push('gm_close', 'aside', -1); state.line = Math.min(stop + 1, end); return true;
  }, { alt: ['paragraph', 'blockquote'] });
  md.core.ruler.after('inline', 'gm_note', state => {
    const tokens = state.tokens;
    for (let index = 0; index < tokens.length; index++) {
      const open = tokens[index], inline = tokens[index + 2];
      if (open.type !== 'blockquote_open' || tokens[index + 1]?.type !== 'paragraph_open' || inline?.type !== 'inline' || !/^\[!GM\](?:\n|$)/i.test(inline.content)) continue;
      let depth = 1, closeIndex = index + 1;
      for (; closeIndex < tokens.length; closeIndex++) {
        if (tokens[closeIndex].type === 'blockquote_open') depth++;
        if (tokens[closeIndex].type === 'blockquote_close' && --depth === 0) break;
      }
      open.tag = 'aside'; open.attrSet('data-gm-note', 'true'); open.attrSet('class', 'gm-note');
      tokens[closeIndex].tag = 'aside';
      inline.content = inline.content.replace(/^\[!GM\](?:\n|$)/i, '');
      if (!inline.content && tokens[index + 3]?.type === 'paragraph_close') tokens.splice(index + 1, 3);
      else { inline.children = []; md.inline.parse(inline.content, md, state.env, inline.children); }
    }
  });
}

export function gmNoteToMarkdown(content) {
  const body = content.trim();
  const fence = ':'.repeat(Math.max(3, ...[...body.matchAll(/^(:+)\s*$/gm)].map(match => match[1].length + 1)));
  return `\n\n${fence}gm\n${body}\n${fence}\n\n`;
}

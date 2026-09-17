// A Markdown blockquote marker preserves note styling through .md round trips.
export function gmNotePlugin(md) {
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
  return `\n\n> [!GM]\n>${body ? `\n> ${body.replace(/\n/g, '\n> ')}` : ''}\n\n`;
}

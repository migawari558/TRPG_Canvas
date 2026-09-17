// Split mixed Markdown lists into normal/task runs so unmarked items stay normal.
export function taskListPlugin(md) {
  md.core.ruler.after('gm_note', 'scenario_tasks', state => {
    const token = (type, tag, nesting, content = '') => { const t = new state.Token(type, tag, nesting); t.content = content; return t; };
    function closing(tokens, start) {
      let depth = 0;
      for (let i = start; i < tokens.length; i++) { depth += tokens[i].nesting; if (depth === 0) return i; }
      return tokens.length - 1;
    }
    function transform(tokens) {
      const result = [];
      for (let index = 0; index < tokens.length; index++) {
        if (tokens[index].type !== 'bullet_list_open') { result.push(tokens[index]); continue; }
        const end = closing(tokens, index), items = [];
        for (let cursor = index + 1; cursor < end;) {
          const last = closing(tokens, cursor), item = transform(tokens.slice(cursor, last + 1));
          const inline = item[1]?.type === 'paragraph_open' && item[2]?.type === 'inline' ? item[2] : null;
          const match = inline?.content.match(/^\[([ xX])\](?:[ \t]+|$)/);
          if (match) {
            const checked = match[1].toLowerCase() === 'x';
            inline.content = inline.content.slice(match[0].length); inline.children = []; md.inline.parse(inline.content, md, state.env, inline.children);
            item[0].attrSet('data-type', 'taskItem'); item[0].attrSet('data-checked', String(checked));
            item[1].hidden = false; item[3].hidden = false;
            item.splice(1, 0, token('html_block', '', 0, `<label><input type="checkbox"${checked ? ' checked' : ''} aria-label="${md.utils.escapeHtml(inline.content || 'チェック項目')}"><span></span></label><div>`));
            item.splice(item.length - 1, 0, token('html_block', '', 0, '</div>'));
          }
          items.push({ task: !!match, tokens: item }); cursor = last + 1;
        }
        let previous;
        for (const item of items) {
          if (previous !== item.task) {
            if (previous !== undefined) result.push(token('bullet_list_close', 'ul', -1));
            const open = token('bullet_list_open', 'ul', 1); if (item.task) open.attrSet('data-type', 'taskList'); result.push(open); previous = item.task;
          }
          result.push(...item.tokens);
        }
        if (items.length) result.push(token('bullet_list_close', 'ul', -1));
        index = end;
      }
      return result;
    }
    state.tokens = transform(state.tokens);
  });
}

export function taskItemToMarkdown(content, node) {
  const marker = node.getAttribute('data-checked') === 'true' ? 'x' : ' ';
  const body = content.replace(/^\n+/, '').replace(/\n+$/, '').replace(/\n/g, '\n    ');
  return `- [${marker}] ${body}\n`;
}

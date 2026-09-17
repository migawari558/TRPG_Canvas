import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { closeHistory } from '@tiptap/pm/history';

export const searchKey = new PluginKey('scenarioSearch');
export function findMatches(doc, query, caseSensitive = false) {
  if (!query || query.includes('\n') || query.includes('\r')) return [];
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'gu' : 'giu');
  const matches = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    let text = '', start = pos + 1;
    const flush = () => {
      regex.lastIndex = 0;
      for (let match; (match = regex.exec(text));) matches.push({ from: start + match.index, to: start + match.index + match[0].length });
      text = '';
    };
    node.forEach((child, offset) => {
      if (child.isText) { if (!text) start = pos + 1 + offset; text += child.text; }
      else flush();
    });
    flush(); return false;
  });
  return matches;
}
export const SearchReplace = Extension.create({
  name: 'scenarioSearch',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: searchKey,
      state: {
        init: () => ({ query: '', caseSensitive: false, matches: [], active: 0 }),
        apply(tr, previous) {
          const action = tr.getMeta(searchKey);
          if (!action && !tr.docChanged) return previous;
          const next = { ...previous, ...action };
          next.matches = findMatches(tr.doc, next.query, next.caseSensitive);
          if (action?.startAt !== undefined) { const index = next.matches.findIndex(m => m.from >= action.startAt); next.active = index < 0 ? 0 : index; }
          next.active = Math.max(0, Math.min(next.active, next.matches.length - 1));
          return next;
        }
      },
      props: { decorations(state) {
        const search = searchKey.getState(state);
        return DecorationSet.create(state.doc, search.matches.map((match, index) => Decoration.inline(match.from, match.to, { class: `search-match${index === search.active ? ' search-current' : ''}` })));
      } }
    })];
  }
});

export function setSearch(editor, action) {
  editor.view.dispatch(editor.state.tr.setMeta(searchKey, action).setMeta('addToHistory', false));
}
export function showSearchMatch(editor) {
  const search = searchKey.getState(editor.state), match = search.matches[search.active];
  if (!match) return;
  // Keep focus in the find field while moving the manuscript selection into view.
  editor.commands.setTextSelection(match); editor.commands.scrollIntoView();
}
export function replaceMatches(editor, replacement, all = false) {
  const search = searchKey.getState(editor.state), matches = all ? search.matches : search.matches.slice(search.active, search.active + 1);
  if (!matches.length || !editor.isEditable) return 0;
  const tr = closeHistory(editor.state.tr);
  for (const match of [...matches].reverse()) tr.insertText(replacement, match.from, match.to);
  tr.setMeta(searchKey, { startAt: all ? 0 : matches[0].from + replacement.length });
  editor.view.dispatch(tr);
  editor.view.dispatch(closeHistory(editor.state.tr));
  return matches.length;
}

import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { uid } from './model.mjs';

// Persist identity independently of a heading's text and document position.
export const HeadingIds = Extension.create({
  name: 'headingIds',
  addGlobalAttributes() {
    return [{ types: ['heading'], attributes: {
      headingId: {
        default: null,
        parseHTML: element => element.getAttribute('data-heading-id'),
        renderHTML: attrs => attrs.headingId ? { 'data-heading-id': attrs.headingId } : {}
      }
    } }];
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      appendTransaction(transactions, _oldState, state) {
        if (!transactions.some(tr => tr.docChanged || tr.getMeta('initializeHeadingIds'))) return null;
        const seen = new Set(), tr = state.tr;
        state.doc.descendants((node, pos) => {
          if (node.type.name !== 'heading') return;
          let id = node.attrs.headingId;
          if (typeof id !== 'string' || !id || seen.has(id)) {
            id = uid();
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, headingId: id });
          }
          seen.add(id);
        });
        return tr.docChanged ? tr : null;
      }
    })];
  }
});

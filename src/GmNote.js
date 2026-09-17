import { Node, mergeAttributes } from '@tiptap/core';

export const GmNote = Node.create({
  name: 'gmNote',
  group: 'block',
  content: '(paragraph | bulletList | orderedList | codeBlock | blockquote | image)+',
  defining: true,
  parseHTML() { return [{ tag: 'aside[data-gm-note]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['aside', mergeAttributes(HTMLAttributes, { 'data-gm-note': 'true', class: 'gm-note' }), 0];
  },
  addCommands() {
    return {
      toggleGmNote: () => ({ editor, commands, chain, state }) => {
        if (editor.isActive('gmNote')) return commands.lift('gmNote');
        let hasHeading = state.selection.$from.parent.type.name === 'heading' || state.selection.$to.parent.type.name === 'heading';
        state.doc.nodesBetween(state.selection.from, state.selection.to, node => { if (node.type.name === 'heading') hasHeading = true; });
        if (!hasHeading && commands.wrapIn('gmNote')) return true;
        // A heading stays in the outline; insert a note after it rather than wrapping it.
        const position = state.selection.$to.depth ? state.selection.$to.after(1) : state.doc.content.size;
        return chain().insertContentAt(position, { type: 'gmNote', content: [{ type: 'paragraph' }] }).setTextSelection(position + 2).run();
      }
    };
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => {
        const { $from } = this.editor.state.selection;
        for (let depth = $from.depth; depth > 0; depth--) {
          if ($from.node(depth).type.name !== this.name) continue;
          const position = $from.after(depth);
          return this.editor.chain().insertContentAt(position, { type: 'paragraph' }).setTextSelection(position + 1).run();
        }
        return false;
      }
    };
  }
});

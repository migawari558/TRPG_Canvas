import { Mark, mergeAttributes } from '@tiptap/core';
export const Underline = Mark.create({
  name: 'underline',
  parseHTML() { return [{ tag: 'u' }, { style: 'text-decoration', consuming: false, getAttrs: value => value.includes('underline') ? {} : false }]; },
  renderHTML({ HTMLAttributes }) { return ['u', mergeAttributes(HTMLAttributes), 0]; },
  addCommands() { return { toggleUnderline: () => ({ commands }) => commands.toggleMark(this.name) }; },
  addKeyboardShortcuts() { return { 'Mod-u': () => this.editor.commands.toggleUnderline() }; }
});

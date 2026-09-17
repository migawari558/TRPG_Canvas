import Heading from '@tiptap/extension-heading';
import { mergeAttributes, textblockTypeInputRule } from '@tiptap/core';

// Level zero is a chapter above H1, rendered as a valid HTML heading.
export const ScenarioHeading = Heading.extend({
  parseHTML() {
    return [{ tag: 'h1[data-chapter]', priority: 60, attrs: { level: 0 } }, ...[1,2,3,4,5,6].map(level => ({ tag: `h${level}`, attrs: { level } }))];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [node.attrs.level === 0 ? 'h1' : `h${node.attrs.level}`, mergeAttributes(HTMLAttributes, node.attrs.level === 0 ? { 'data-chapter': '', class: 'chapter-heading' } : {}), 0];
  },
  addInputRules() {
    return [textblockTypeInputRule({ find: /^#!\s$/, type: this.type, getAttributes: { level: 0 } }), ...[1,2,3,4,5,6].map(level => textblockTypeInputRule({ find: new RegExp(`^(#{1,${level}})\\s$`), type: this.type, getAttributes: { level } }))];
  },
  addKeyboardShortcuts() {
    return Object.fromEntries([1,2,3,4,5,6].map(level => [`Mod-Alt-${level}`, () => this.editor.commands.toggleHeading({ level })]));
  }
}).configure({ levels: [0,1,2,3,4,5,6] });

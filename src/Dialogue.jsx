import React, { useEffect, useRef, useState } from 'react';
import { Node, mergeAttributes, wrappingInputRule } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { cleanSpeaker } from './dialogue-markdown.mjs';

function DialogueView({ node, updateAttributes, editor, getPos }) {
  const [speaker, setSpeaker] = useState(node.attrs.speaker || '');
  const composing = useRef(false), input = useRef();
  useEffect(() => { if (!composing.current) setSpeaker(node.attrs.speaker || ''); }, [node.attrs.speaker]);
  useEffect(() => { if (!node.attrs.speaker) input.current?.focus(); }, []);
  function save(value) { updateAttributes({ speaker: cleanSpeaker(value) }); }
  return <NodeViewWrapper as="section" className="dialogue" data-dialogue="true" data-speaker={node.attrs.speaker} onKeyDownCapture={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); const position = getPos() + node.nodeSize; editor.chain().insertContentAt(position, { type: 'paragraph' }).setTextSelection(position + 1).focus().run(); } }}>
    <div className="dialogue-speaker" contentEditable={false}><input ref={input} aria-label="セリフの話者名" maxLength={80} value={speaker} style={{ width: `${Math.min(14, Math.max(3, [...speaker].length))}em` }} placeholder="話者名" onCompositionStart={() => { composing.current = true; }} onCompositionEnd={event => { composing.current = false; setSpeaker(event.currentTarget.value); save(event.currentTarget.value); }} onChange={event => { setSpeaker(event.target.value); if (!composing.current && !event.nativeEvent.isComposing) save(event.target.value); }} onBlur={event => save(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); save(event.currentTarget.value); editor.chain().focus().setTextSelection(getPos() + 1).run(); } }}/></div>
    <NodeViewContent className="dialogue-body"/>
  </NodeViewWrapper>;
}

export const Dialogue = Node.create({
  name: 'dialogue', group: 'block', content: 'paragraph+', defining: true, priority: 110,
  addAttributes() { return { speaker: { default: '', parseHTML: element => cleanSpeaker(element.getAttribute('data-speaker') || element.querySelector('.dialogue-speaker')?.textContent), renderHTML: attrs => ({ 'data-speaker': cleanSpeaker(attrs.speaker) }) } }; },
  parseHTML() { return [{ tag: 'section[data-dialogue]', contentElement: '.dialogue-body' }]; },
  renderHTML({ HTMLAttributes, node }) { return ['section', mergeAttributes(HTMLAttributes, { 'data-dialogue': 'true', class: 'dialogue' }), ['div', { class: 'dialogue-speaker', 'data-dialogue-speaker': 'true' }, cleanSpeaker(node.attrs.speaker)], ['div', { class: 'dialogue-body' }, 0]]; },
  addNodeView() { return ReactNodeViewRenderer(DialogueView); },
  addInputRules() { return [wrappingInputRule({ find: /^::\s*(.{1,80}?)\s$/, type: this.type, getAttributes: match => ({ speaker: cleanSpeaker(match[1]) }) })]; },
  addCommands() { return { insertDialogue: () => ({ commands }) => commands.insertContent({ type: this.name, attrs: { speaker: '' }, content: [{ type: 'paragraph' }] }) }; },
  addKeyboardShortcuts() { return {
    'Mod-Shift-d': () => this.editor.chain().focus().insertDialogue().run(),
    'Mod-Enter': () => { const { $from } = this.editor.state.selection; for (let depth = $from.depth; depth > 0; depth--) { if ($from.node(depth).type.name !== this.name) continue; const position = $from.after(depth); return this.editor.chain().insertContentAt(position, { type: 'paragraph' }).setTextSelection(position + 1).run(); } return false; }
  }; }
});

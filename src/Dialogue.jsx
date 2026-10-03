import React, { useEffect, useRef, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { cleanSpeaker } from './dialogue-markdown.mjs';

function DialogueView({ node, updateAttributes, editor, getPos }) {
  const [speaker, setSpeaker] = useState(node.attrs.speaker || '');
  const composing = useRef(false), input = useRef();
  useEffect(() => { if (!composing.current) setSpeaker(node.attrs.speaker || ''); }, [node.attrs.speaker]);
  useEffect(() => { if (!node.attrs.speaker) input.current?.focus(); }, []);
  function save(value) { updateAttributes({ speaker: cleanSpeaker(value) }); }
  return <NodeViewWrapper as="section" className="dialogue" data-dialogue="true" data-speaker={node.attrs.speaker}>
    <div className="dialogue-speaker" contentEditable={false}><input ref={input} aria-label="セリフの話者名" maxLength={80} value={speaker} placeholder="話者名" onCompositionStart={() => { composing.current = true; }} onCompositionEnd={event => { composing.current = false; setSpeaker(event.currentTarget.value); save(event.currentTarget.value); }} onChange={event => { setSpeaker(event.target.value); if (!composing.current && !event.nativeEvent.isComposing) save(event.target.value); }} onBlur={event => save(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); save(event.currentTarget.value); editor.chain().focus().setTextSelection(getPos() + 1).run(); } }}/></div>
    <NodeViewContent className="dialogue-body"/>
  </NodeViewWrapper>;
}

export const Dialogue = Node.create({
  name: 'dialogue', group: 'block', content: 'paragraph+', defining: true,
  addAttributes() { return { speaker: { default: '', parseHTML: element => cleanSpeaker(element.getAttribute('data-speaker') || element.querySelector('.dialogue-speaker')?.textContent), renderHTML: attrs => ({ 'data-speaker': cleanSpeaker(attrs.speaker) }) } }; },
  parseHTML() { return [{ tag: 'section[data-dialogue]', contentElement: '.dialogue-body' }]; },
  renderHTML({ HTMLAttributes, node }) { return ['section', mergeAttributes(HTMLAttributes, { 'data-dialogue': 'true', class: 'dialogue' }), ['div', { class: 'dialogue-speaker', 'data-dialogue-speaker': 'true' }, cleanSpeaker(node.attrs.speaker)], ['div', { class: 'dialogue-body' }, 0]]; },
  addNodeView() { return ReactNodeViewRenderer(DialogueView); },
  addCommands() { return { insertDialogue: () => ({ commands }) => commands.insertContent({ type: this.name, attrs: { speaker: '' }, content: [{ type: 'paragraph' }] }) }; },
  addKeyboardShortcuts() { return { 'Mod-Enter': () => { const { $from } = this.editor.state.selection; for (let depth = $from.depth; depth > 0; depth--) { if ($from.node(depth).type.name !== this.name) continue; const position = $from.after(depth); return this.editor.chain().insertContentAt(position, { type: 'paragraph' }).setTextSelection(position + 1).run(); } return false; } }; }
});

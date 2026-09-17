import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TurndownService from 'turndown';
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Code2, Minus, Undo2, Redo2, StickyNote } from 'lucide-react';
import { markdown } from './export.mjs';
import { HeadingIds } from './HeadingIds.js';
import { GmNote } from './GmNote.js';
import { gmNoteToMarkdown } from './gm-markdown.mjs';
const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
converter.addRule('strikethrough', { filter: ['s', 'del'], replacement: content => `~~${content}~~` });
converter.addRule('gmNote', { filter: node => node.nodeName === 'ASIDE' && node.hasAttribute('data-gm-note'), replacement: gmNoteToMarkdown });
export default function ScenarioEditor({ doc, onChange, onReady }) {
  const editor = useEditor({
    extensions: [StarterKit, HeadingIds, GmNote, Placeholder.configure({ placeholder: '物語をつづける…  「## 」で見出し、「> 」で共有情報' })],
    content: doc.content || markdown.render(doc.markdown),
    editorProps: { attributes: { 'aria-label': 'シナリオ本文', spellcheck: 'false' } },
    onUpdate: ({ editor }) => onChange({ content: editor.getJSON(), markdown: converter.turndown(editor.getHTML()) })
  });
  useEffect(() => {
    if (editor) {
      editor.view.dispatch(editor.state.tr.setMeta('initializeHeadingIds', true).setMeta('addToHistory', false));
      onReady(editor);
    }
    return () => onReady(null);
  }, [editor]);
  if (!editor) return null;
  const controls = [
    [Bold, '太字（Ctrl+B）', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold')],
    [Italic, '斜体（Ctrl+I）', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic')],
    [Heading2, '章見出し', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 })],
    [Heading3, '小見出し', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 })],
    [List, '箇条書き', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList')],
    [ListOrdered, '番号付きリスト', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList')],
    [Quote, '共有情報（HTMLでコピー可能）', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote')],
    [StickyNote, 'GMメモ（角丸・網掛け）', () => editor.chain().focus().toggleGmNote().run(), editor.isActive('gmNote')],
    [Code2, 'コードブロック', () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock')],
    [Minus, '区切り線', () => editor.chain().focus().setHorizontalRule().run()],
    [Undo2, '元に戻す（Ctrl+Z）', () => editor.chain().focus().undo().run()],
    [Redo2, 'やり直す（Ctrl+Shift+Z）', () => editor.chain().focus().redo().run()]
  ];
  return <><div className="editor-toolbar"><span className="toolbar-label">本文</span><span className="toolbar-divider"/>{controls.map(([Icon, label, action, active]) => <button key={label} title={label} aria-label={label} aria-pressed={!!active} className={active ? 'active' : ''} onClick={action}><Icon size={16}/></button>)}<span className="markdown-badge">Markdown</span></div><div className="editor-scroll" onPaste={e => { const text = e.clipboardData.getData('text/plain'); if (!e.clipboardData.getData('text/html') && /^(#{1,6} |```|> |\- )/m.test(text)) { e.preventDefault(); editor.commands.insertContent(markdown.render(text)); } }}><article className="paper"><div className="paper-eyebrow"><span/> SCENARIO MANUSCRIPT</div><EditorContent editor={editor}/><div className="paper-end">◆</div></article></div></>;
}

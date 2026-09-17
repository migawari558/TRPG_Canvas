import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TurndownService from 'turndown';
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Code2, Minus, Undo2, Redo2, StickyNote, ImagePlus, X } from 'lucide-react';
import { markdown } from './export.mjs';
import { HeadingIds } from './HeadingIds.js';
import { GmNote } from './GmNote.js';
import { gmNoteToMarkdown } from './gm-markdown.mjs';
import { ScenarioImage, readImageFile } from './ScenarioImage.js';
import TaskList from '@tiptap/extension-task-list';
import { ScenarioTaskItem } from './ScenarioTaskItem.js';
import { ListTodo } from 'lucide-react';
import { taskItemToMarkdown } from './task-markdown.mjs';
const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
converter.addRule('strikethrough', { filter: ['s', 'del'], replacement: content => `~~${content}~~` });
converter.addRule('gmNote', { filter: node => node.nodeName === 'ASIDE' && node.hasAttribute('data-gm-note'), replacement: gmNoteToMarkdown });
converter.addRule('taskItem', { filter: node => node.nodeName === 'LI' && node.getAttribute('data-type') === 'taskItem', replacement: taskItemToMarkdown });
export default function ScenarioEditor({ doc, onChange, onReady }) {
  const imageInput = useRef(), importingImage = useRef(false);
  const [imageError, setImageError] = useState(''), [imageBusy, setImageBusy] = useState(false);
  async function insertImages(files, position) {
    if (!editor || editor.isDestroyed || importingImage.current || !files.length) return;
    importingImage.current = true; setImageBusy(true); setImageError(''); editor.setEditable(false);
    try {
      const images = [];
      let estimatedSize = JSON.stringify(editor.getJSON()).length * 2;
      for (const file of files) {
        const image = await readImageFile(file); estimatedSize += image.attrs.src.length * 2;
        if (estimatedSize > 18_000_000) throw new Error('シナリオの容量上限に近づいています。画像を縮小してから追加してください。');
        images.push(image);
      }
      if (!editor.isDestroyed) editor.chain().focus().insertContentAt(Math.min(position ?? editor.state.selection.from, editor.state.doc.content.size), images).run();
    } catch (error) { if (!editor.isDestroyed) setImageError(error.message); }
    finally { importingImage.current = false; if (!editor.isDestroyed) { editor.setEditable(true); setImageBusy(false); } }
  }
  const editor = useEditor({
    extensions: [StarterKit, HeadingIds, GmNote, ScenarioImage, TaskList, ScenarioTaskItem, Placeholder.configure({ placeholder: '物語をつづける…  「## 」で見出し、「> 」で共有情報' })],
    content: doc.content || markdown.render(doc.markdown),
    editorProps: { attributes: { 'aria-label': 'シナリオ本文', spellcheck: 'false' },
      handlePaste(view, event) { const files = [...(event.clipboardData?.files || [])]; if (!files.length) return false; insertImages(files, view.state.selection.from); return true; },
      handleDrop(view, event, _slice, moved) { const files = [...(event.dataTransfer?.files || [])]; if (moved || !files.length) return false; event.preventDefault(); insertImages(files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from); return true; }
    },
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
    [ListTodo, 'チェックリスト', () => editor.chain().focus().toggleTaskList().run(), editor.isActive('taskList')],
    [Quote, '共有情報（HTMLでコピー可能）', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote')],
    [StickyNote, 'GMメモ（角丸・網掛け）', () => editor.chain().focus().toggleGmNote().run(), editor.isActive('gmNote')],
    [ImagePlus, '画像を挿入', () => imageInput.current.click()],
    [Code2, 'コードブロック', () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock')],
    [Minus, '区切り線', () => editor.chain().focus().setHorizontalRule().run()],
    [Undo2, '元に戻す（Ctrl+Z）', () => editor.chain().focus().undo().run()],
    [Redo2, 'やり直す（Ctrl+Shift+Z）', () => editor.chain().focus().redo().run()]
  ];
  return <><div className="editor-toolbar"><span className="toolbar-label">本文</span><span className="toolbar-divider"/>{controls.map(([Icon, label, action, active]) => <button key={label} disabled={imageBusy} title={label} aria-label={label} aria-pressed={!!active} className={active ? 'active' : ''} onClick={action}><Icon size={16}/></button>)}<span className="markdown-badge">Markdown</span></div><input className="hidden" ref={imageInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple aria-label="挿入する画像" onChange={event => { const files = [...event.target.files]; event.target.value = ''; insertImages(files); }}/>{imageBusy && <div className="image-status" role="status">画像を読み込み中…</div>}{imageError && <div className="image-error" role="alert">{imageError}<button aria-label="画像エラーを閉じる" onClick={() => setImageError('')}><X size={16}/></button></div>}<div className="editor-scroll" onPaste={e => { if (e.defaultPrevented || e.clipboardData.files.length) return; const text = e.clipboardData.getData('text/plain'); if (!e.clipboardData.getData('text/html') && /^(#{1,6} |```|> |\- )/m.test(text)) { e.preventDefault(); editor.commands.insertContent(markdown.render(text)); } }}><article className="paper"><div className="paper-eyebrow"><span/> SCENARIO MANUSCRIPT</div><EditorContent editor={editor}/><div className="paper-end">◆</div></article></div></>;
}

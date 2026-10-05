import React, { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import { Bold, Heading2, Italic, List, ListTodo, Quote, Redo2, StickyNote, Undo2 } from 'lucide-react';
import { markdown } from './export.mjs';
import { ScenarioTaskItem } from './ScenarioTaskItem.js';
import { serializeWritingNotes } from './writing-notes-markdown.mjs';

export default function WritingNotes({ value, onChange, width, onWidth }) {
  const drag = useRef(null), lastEmitted = useRef(value || ''), onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const editor = useEditor({
    extensions: [StarterKit, TaskList, ScenarioTaskItem, Placeholder.configure({ placeholder: '構想やTODOを書く…' })],
    content: markdown.render(value || ''),
    editorProps: { attributes: { 'aria-label': '執筆メモ', spellcheck: 'false' } },
    onUpdate: ({ editor }) => {
      const next = serializeWritingNotes(editor);
      lastEmitted.current = next;
      onChangeRef.current(next);
    }
  });
  useEffect(() => {
    if (!editor || editor.isDestroyed || value === lastEmitted.current) return;
    lastEmitted.current = value || '';
    editor.commands.setContent(markdown.render(value || ''), false);
  }, [editor, value]);
  useEffect(() => {
    const move = event => { if (drag.current) onWidth(Math.max(190, Math.min(520, drag.current.width + drag.current.x - event.clientX))); };
    const stop = () => { drag.current = null; document.body.classList.remove('resizing-notes'); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); document.body.classList.remove('resizing-notes'); };
  }, [onWidth]);
  const controls = editor ? [
    [Bold, '執筆メモ：太字', '**文字**', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold')],
    [Italic, '執筆メモ：斜体', '*文字*', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic')],
    [Heading2, '執筆メモ：見出し', '## ＋ Space', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 })],
    [List, '執筆メモ：箇条書き', '- ＋ Space', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList')],
    [ListTodo, '執筆メモ：チェックリスト', '[] ＋ Space', () => editor.chain().focus().toggleTaskList().run(), editor.isActive('taskList')],
    [Quote, '執筆メモ：引用', '> ＋ Space', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote')],
    [Undo2, '執筆メモ：元に戻す', 'Ctrl+Z', () => editor.chain().focus().undo().run()],
    [Redo2, '執筆メモ：やり直す', 'Ctrl+Shift+Z', () => editor.chain().focus().redo().run()]
  ] : [];
  return <aside className="writing-notes" style={{ width }}>
    <div className="notes-resizer" role="separator" aria-label="執筆メモの横幅" aria-orientation="vertical" aria-valuemin="190" aria-valuemax="520" aria-valuenow={Math.round(width)} tabIndex={0} onPointerDown={event => { drag.current = { x: event.clientX, width }; event.currentTarget.setPointerCapture(event.pointerId); document.body.classList.add('resizing-notes'); }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); onWidth(Math.min(520, width + 20)); } if (event.key === 'ArrowRight') { event.preventDefault(); onWidth(Math.max(190, width - 20)); } }}/>
    <div className="writing-notes-heading"><span><StickyNote size={15}/>執筆メモ</span><small>LIVE MARKDOWN</small></div>
    <p className="writing-notes-description">構想・TODOなど。書き出しには含まれません。</p>
    <div className="writing-notes-toolbar" role="toolbar" aria-label="執筆メモの書式">{controls.map(([Icon, label, syntax, action, active]) => <button key={label} type="button" className={active ? 'active' : ''} aria-label={label} aria-pressed={!!active} title={`${label.replace('執筆メモ：', '')}\n記法: ${syntax}`} onMouseDown={event => event.preventDefault()} onClick={action}><Icon size={13}/></button>)}</div>
    <EditorContent editor={editor} className="writing-notes-editor"/>
  </aside>;
}

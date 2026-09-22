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
import { ScenarioImage, isEmbeddedImage, readImageFile } from './ScenarioImage.js';
import { imageWidths, normalizeImageWidth } from './image-size.mjs';
import TaskList from '@tiptap/extension-task-list';
import { ScenarioTaskItem } from './ScenarioTaskItem.js';
import { ListTodo } from 'lucide-react';
import { taskItemToMarkdown } from './task-markdown.mjs';
import { Underline } from './Underline.js';
import { SearchReplace } from './SearchReplace.js';
import FindBar from './FindBar.jsx';
import { ScenarioHeading } from './ScenarioHeading.js';
import { AlignCenter, Heading1 } from 'lucide-react';
import { blankMarker } from './blank-markdown.mjs';
import { Underline as UnderlineIcon, Search } from 'lucide-react';
const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', blankReplacement: (_content, node) => node.nodeName === 'P' ? `\n\n${blankMarker}\n\n` : node.isBlock ? '\n\n' : '' });
converter.addRule('emptyParagraph', { filter: node => node.nodeName === 'P' && !node.textContent && [...node.children].every(child => child.tagName === 'BR'), replacement: (_content, node) => `\n\n${Array(node.children.length + 1).fill(blankMarker).join('\n\n')}\n\n` });
converter.addRule('underline', { filter: ['u'], replacement: content => `<u>${content}</u>` });
converter.addRule('chapter', { filter: node => node.nodeName === 'H1' && node.hasAttribute('data-chapter'), replacement: content => `\n\n#! ${content}\n\n` });
converter.addRule('strikethrough', { filter: ['s', 'del'], replacement: content => `~~${content}~~` });
converter.addRule('gmNote', { filter: node => node.nodeName === 'ASIDE' && node.hasAttribute('data-gm-note'), replacement: gmNoteToMarkdown });
converter.addRule('taskItem', { filter: node => node.nodeName === 'LI' && node.getAttribute('data-type') === 'taskItem', replacement: taskItemToMarkdown });
converter.addRule('embeddedImage', { filter: node => node.nodeName === 'IMG' && isEmbeddedImage(node.getAttribute('src')), replacement: (_content, node) => {
  const alt = (node.getAttribute('alt') || '画像').replace(/([\\\[\]])/g, '\\$1'), src = node.getAttribute('src'), width = normalizeImageWidth(node.getAttribute('data-image-width'));
  return `![${alt}](${src}${width < 100 ? ` "width=${width}"` : ''})`;
} });
export default function ScenarioEditor({ doc, onChange, onReady }) {
  const imageInput = useRef(), importingImage = useRef(false);
  const [findOpen, setFindOpen] = useState(false), [findRequest, setFindRequest] = useState(0);
  function openFind() { setFindOpen(true); setFindRequest(value => value + 1); }
  const [imageError, setImageError] = useState(''), [imageBusy, setImageBusy] = useState(false), [selectedImageWidth, setSelectedImageWidth] = useState(null);
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
    extensions: [StarterKit.configure({ heading: false }), ScenarioHeading, HeadingIds, GmNote, ScenarioImage, TaskList, ScenarioTaskItem, Underline, SearchReplace, Placeholder.configure({ placeholder: '物語をつづける…  「#! 」で章、「# 」でH1見出し' })],
    content: doc.content || markdown.render(doc.markdown),
    editorProps: { attributes: { 'aria-label': 'シナリオ本文', spellcheck: 'false' },
      handlePaste(view, event) { const files = [...(event.clipboardData?.files || [])]; if (!files.length) return false; insertImages(files, view.state.selection.from); return true; },
      handleDrop(view, event, _slice, moved) { const files = [...(event.dataTransfer?.files || [])]; if (moved || !files.length) return false; event.preventDefault(); insertImages(files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from); return true; }
    },
    onSelectionUpdate: ({ editor }) => setSelectedImageWidth(editor.isActive('image') ? normalizeImageWidth(editor.getAttributes('image').width) : null),
    onUpdate: ({ editor }) => onChange({ content: editor.getJSON(), markdown: converter.turndown(editor.getHTML()) })
  });
  useEffect(() => {
    if (editor) {
      editor.view.dispatch(editor.state.tr.setMeta('initializeHeadingIds', true).setMeta('addToHistory', false));
      onReady(editor);
      const serialized = converter.turndown(editor.getHTML());
      if (!doc.content || serialized !== doc.markdown) onChange({ content: editor.getJSON(), markdown: serialized });
    }
    return () => onReady(null);
  }, [editor]);
  useEffect(() => {
    const keydown = event => {
      if (!editor || editor.isDestroyed || !editor.view.dom.getClientRects().length || document.querySelector('[role="dialog"]')) return;
      if (event.key === 'Escape' && findOpen) { event.preventDefault(); setFindOpen(false); editor.commands.focus(); }
      if ((event.ctrlKey || event.metaKey) && !event.altKey && ['f', 'h'].includes(event.key.toLowerCase())) { event.preventDefault(); openFind(); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [editor, findOpen]);
  if (!editor) return null;
  const syntax = ['**文字**', '*文字*', '<u>文字</u>', 'Ctrl+F / Ctrl+H', '#! ＋ Space', '# ＋ Space', '## ＋ Space', '### ＋ Space', '- ＋ Space', '1. ＋ Space', '[] ＋ Space（完了: [x] ＋ Space）', '> ＋ Space', '!!! ＋ Spaceで開始 / Ctrl+Enterで終了（Markdown: :::gm ～ :::）', '画像ファイルを選択・貼り付け', '\`\`\` ＋ Space', '---', 'Ctrl+Z', 'Ctrl+Shift+Z'];
  const controls = [
    [Bold, '太字（Ctrl+B）', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold')],
    [Italic, '斜体（Ctrl+I）', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic')],
    [UnderlineIcon, '下線（Ctrl+U）', () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline')],
    [Search, '検索と置換（Ctrl+F / Ctrl+H）', openFind, findOpen],
    [AlignCenter, '章（中央揃え・H1の上位）', () => editor.chain().focus().toggleHeading({ level: 0 }).run(), editor.isActive('heading', { level: 0 })],
    [Heading1, 'H1見出し', () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 })],
    [Heading2, 'H2見出し', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 })],
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
  return <><div className="editor-toolbar"><span className="toolbar-label">本文</span><span className="toolbar-divider"/>{controls.map(([Icon, label, action, active], index) => <button key={label} disabled={imageBusy} title={`${label}\n記法: ${syntax[index]}`} aria-label={label} aria-pressed={!!active} className={active ? 'active' : ''} onClick={action}><Icon size={16}/></button>)}<span className="markdown-badge">Markdown</span></div>{selectedImageWidth && <div className="image-size-toolbar" role="toolbar" aria-label="画像サイズ"><strong>画像サイズ</strong>{imageWidths.map(width => <button key={width} type="button" aria-label={`画像サイズ${width}%`} aria-pressed={selectedImageWidth === width} onMouseDown={event => event.preventDefault()} onClick={() => { if (editor.commands.updateAttributes('image', { width })) setSelectedImageWidth(width); editor.commands.focus(); }}>{({25:'小',50:'中',75:'大',100:'本文幅'})[width]} <span>{width}%</span></button>)}</div>}{findOpen && <FindBar editor={editor} request={findRequest} onClose={() => setFindOpen(false)}/>}<input className="hidden" ref={imageInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple aria-label="挿入する画像" onChange={event => { const files = [...event.target.files]; event.target.value = ''; insertImages(files); }}/>{imageBusy && <div className="image-status" role="status">画像を読み込み中…</div>}{imageError && <div className="image-error" role="alert">{imageError}<button aria-label="画像エラーを閉じる" onClick={() => setImageError('')}><X size={16}/></button></div>}<div className="editor-scroll" onPaste={e => { if (e.defaultPrevented || e.clipboardData.files.length) return; const text = e.clipboardData.getData('text/plain'); if (!e.clipboardData.getData('text/html') && /^(:::gm|#! |#{1,6} |```|> |\- |\[\] |\[[ xX]\] )/m.test(text)) { e.preventDefault(); editor.commands.insertContent(markdown.render(text)); } }}><article className="paper"><div className="paper-eyebrow"><span/> SCENARIO MANUSCRIPT</div><EditorContent editor={editor}/><div className="paper-end">◆</div></article></div></>;
}

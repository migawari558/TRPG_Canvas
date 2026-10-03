import React, { useEffect, useRef, useState } from 'react';
import { Eye, Pencil, StickyNote } from 'lucide-react';
import { markdown } from './export.mjs';

export default function WritingNotes({ value, onChange, width, onWidth }) {
  const [preview, setPreview] = useState(false), drag = useRef(null);
  useEffect(() => {
    const move = event => { if (drag.current) onWidth(Math.max(190, Math.min(520, drag.current.width + drag.current.x - event.clientX))); };
    const stop = () => { drag.current = null; document.body.classList.remove('resizing-notes'); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); document.body.classList.remove('resizing-notes'); };
  }, [onWidth]);
  return <aside className="writing-notes" style={{ width }}>
    <div className="notes-resizer" role="separator" aria-label="執筆メモの横幅" aria-orientation="vertical" aria-valuemin="190" aria-valuemax="520" aria-valuenow={Math.round(width)} tabIndex={0} onPointerDown={event => { drag.current = { x: event.clientX, width }; event.currentTarget.setPointerCapture(event.pointerId); document.body.classList.add('resizing-notes'); }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); onWidth(Math.min(520, width + 20)); } if (event.key === 'ArrowRight') { event.preventDefault(); onWidth(Math.max(190, width - 20)); } }}/>
    <div className="writing-notes-heading"><span><StickyNote size={15}/>執筆メモ</span><div><button className={!preview ? 'active' : ''} aria-pressed={!preview} onClick={() => setPreview(false)}><Pencil size={13}/>編集</button><button className={preview ? 'active' : ''} aria-pressed={preview} onClick={() => setPreview(true)}><Eye size={13}/>プレビュー</button></div></div>
    <p>構想・TODOなど。Markdown対応。書き出しには含まれません。</p>
    {preview ? <div className="writing-notes-preview" aria-label="執筆メモのMarkdownプレビュー" dangerouslySetInnerHTML={{ __html: markdown.render(value || '') }}/> : <textarea id="writing-notes" aria-label="執筆メモ" value={value || ''} onChange={event => onChange(event.target.value)} placeholder={'## 次に書くこと\n\n- 手掛かりを追加\n- NPCの動機を確認'}/>} 
  </aside>;
}

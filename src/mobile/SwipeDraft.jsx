import React,{useRef,useState} from 'react';
import {FileText,Trash2} from 'lucide-react';

export default function SwipeDraft({value,onOpen,onDelete}){
  const start=useRef(null),moved=useRef(false),[offset,setOffset]=useState(0);
  return <div className="mobile-document-row mobile-swipe-draft" onPointerDown={event=>{if(event.pointerType==='mouse'&&event.button!==0)return;start.current={x:event.clientX,y:event.clientY};moved.current=false;}} onPointerMove={event=>{
    if(!start.current)return;
    const dx=event.clientX-start.current.x,dy=event.clientY-start.current.y;
    if(!moved.current&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12){start.current=null;setOffset(0);return;}
    if(dx < -14&&Math.abs(dx)>Math.abs(dy)){moved.current=true;if(event.isTrusted)event.currentTarget.setPointerCapture(event.pointerId);setOffset(Math.max(-100,dx));}
  }} onPointerUp={event=>{if(start.current&&moved.current&&event.clientX-start.current.x < -75)onDelete();start.current=null;setOffset(0);}} onPointerCancel={()=>{start.current=null;setOffset(0);}} onClickCapture={event=>{if(moved.current){event.preventDefault();event.stopPropagation();moved.current=false;}}}>
    <span className="mobile-swipe-delete" aria-hidden="true"><Trash2 size={18}/>削除</span>
    <button className="mobile-document" style={{transform:`translateX(${offset}px)`}} aria-label={`${value.doc.title}を開く（左スワイプまたはDeleteキーで下書き削除）`} onClick={onOpen} onKeyDown={event=>{if(event.key==='Delete'){event.preventDefault();onDelete();}}}><FileText size={20}/><span><strong>{value.doc.title}</strong><small>{value.uri?'自動保存 · 開き直して更新':'この端末の下書き'}</small></span></button>
  </div>;
}

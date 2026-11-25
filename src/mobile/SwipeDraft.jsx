import React,{useRef,useState} from 'react';
import {FileText,Trash2} from 'lucide-react';

export default function SwipeDraft({value,onOpen,onDelete}){
  const start=useRef(null),moved=useRef(false),[offset,setOffset]=useState(0);
  const finish=()=>{start.current=null;setOffset(0);};
  return <div className="mobile-document-row mobile-swipe-draft" onPointerDown={event=>{if(event.pointerType==='mouse'&&event.button!==0)return;start.current={x:event.clientX,y:event.clientY};moved.current=false;}} onPointerMove={event=>{
    if(!start.current)return;
    const dx=event.clientX-start.current.x,dy=event.clientY-start.current.y;
    if(!moved.current&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12){finish();return;}
    if(dx < -14&&Math.abs(dx)>Math.abs(dy)){moved.current=true;if(event.isTrusted)event.currentTarget.setPointerCapture(event.pointerId);setOffset(Math.max(-100,dx));}
  }} onPointerUp={event=>{if(start.current&&moved.current&&event.clientX-start.current.x < -75)onDelete();finish();}} onPointerCancel={()=>{moved.current=false;finish();}} onClickCapture={event=>{if(moved.current){event.preventDefault();event.stopPropagation();moved.current=false;}}}>
    <span className="mobile-swipe-delete" hidden={offset===0} style={{width:-offset}} aria-hidden="true"><Trash2 size={20}/>削除</span>
    <div className="mobile-draft-surface" style={{transform:`translateX(${offset}px)`}}>
      <button className="mobile-document" aria-label={`${value.doc.title}を開く（左スワイプまたはDeleteキーで下書き削除）`} onClick={onOpen} onKeyDown={event=>{if(event.key==='Delete'){event.preventDefault();onDelete();}}}><FileText size={22}/><span><strong>{value.doc.title}</strong>{value.doc.systemName&&<small className="mobile-document-system">{value.doc.systemName}</small>}<small>{value.uri?'自動保存 · 開き直して更新':'この端末の下書き'}</small></span></button>
      <button className="mobile-draft-delete" aria-label={`${value.doc.title}の下書きを削除`} onClick={onDelete}><Trash2 size={20}/></button>
    </div>
  </div>;
}

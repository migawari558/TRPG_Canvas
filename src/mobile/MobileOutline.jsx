import React,{useState} from 'react';
import {ChevronDown,ChevronRight} from 'lucide-react';

export default function MobileOutline({headings,onNavigate}){
  const [collapsed,setCollapsed]=useState(new Set());
  const parents=new Set(headings.map(item=>item.parentId).filter(Boolean));
  const visible=headings.filter(item=>!item.ancestorIds.some(id=>collapsed.has(id)));
  function toggle(id){setCollapsed(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next;});}
  return <section className="mobile-outline" aria-label="シナリオの目次">
    <header className="mobile-outline-header"><h1>目次</h1><div className="mobile-outline-bulk"><button disabled={!parents.size} onClick={()=>setCollapsed(new Set(parents))}>すべて閉じる</button><button disabled={!collapsed.size} onClick={()=>setCollapsed(new Set())}>すべて開く</button></div></header>
    <div className="mobile-outline-list">{visible.map(item=><div className="mobile-outline-row" key={item.id||item.index} style={{paddingLeft:12+item.depth*12}}>{parents.has(item.id)?<button className="mobile-outline-toggle" aria-label={`${item.text}を${collapsed.has(item.id)?'展開':'折りたたむ'}`} aria-expanded={!collapsed.has(item.id)} onClick={()=>toggle(item.id)}>{collapsed.has(item.id)?<ChevronRight size={16}/>:<ChevronDown size={16}/>}</button>:<span className="mobile-outline-spacer"/>}<button className="mobile-outline-link" title={item.text} onClick={()=>onNavigate(item)}>{item.text}</button></div>)}{!headings.length&&<p>見出しを追加すると目次に表示されます。</p>}</div>
  </section>;
}

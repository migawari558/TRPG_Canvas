import React,{useState} from 'react';
import {ChevronDown,ChevronRight,Search,X} from 'lucide-react';

export default function MobileOutline({headings,onNavigate,headerAction}){
  const [collapsed,setCollapsed]=useState(new Set()),[query,setQuery]=useState('');
  const parents=new Set(headings.map(item=>item.parentId).filter(Boolean));
  const term=query.trim().toLocaleLowerCase();
  const matches=term?headings.filter(item=>item.text.toLocaleLowerCase().includes(term)):[];
  const ids=new Set(matches.flatMap(item=>[item.id,...item.ancestorIds]));
  const visible=headings.filter(item=>term?ids.has(item.id):!item.ancestorIds.some(id=>collapsed.has(id)));
  function toggle(id){setCollapsed(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next;});}
  return <section className="mobile-outline" aria-label="シナリオの目次">
    <header className="mobile-outline-header"><div className="mobile-panel-title"><h1>目次 <span className="mobile-heading-count">{headings.length}</span></h1>{headerAction}</div><div className="mobile-outline-search"><Search size={18}/><input type="search" aria-label="目次を検索" placeholder="見出しを検索" value={query} onChange={event=>setQuery(event.target.value)}/>{query&&<button aria-label="目次検索をクリア" onClick={()=>setQuery('')}><X size={18}/></button>}</div><div className="mobile-outline-bulk"><button disabled={!parents.size||!!term} onClick={()=>setCollapsed(new Set(parents))}>すべて閉じる</button><button disabled={!collapsed.size||!!term} onClick={()=>setCollapsed(new Set())}>すべて開く</button></div></header>
    <div className="mobile-outline-list">{visible.map(item=><div className="mobile-outline-row" key={item.id||item.index} style={{paddingLeft:8+item.depth*16}}>{parents.has(item.id)?<button className="mobile-outline-toggle" disabled={!!term} aria-label={`${item.text}を${collapsed.has(item.id)?'展開':'折りたたむ'}`} aria-expanded={!!term||!collapsed.has(item.id)} onClick={()=>toggle(item.id)}>{!term&&collapsed.has(item.id)?<ChevronRight size={18}/>:<ChevronDown size={18}/>}</button>:<span className="mobile-outline-spacer"/>}<button className="mobile-outline-link" title={item.text} onClick={()=>onNavigate(item)}>{item.text}</button></div>)}{!headings.length&&<p>見出しを追加すると目次に表示されます。</p>}{!!term&&!visible.length&&<p role="status">一致する見出しがありません。</p>}</div>
  </section>;
}

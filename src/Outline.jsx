import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, Link2, Layers, ChevronsUp, ChevronsDown, Search, X } from 'lucide-react';

export default function Outline({ headings, content, activeHeading, onNavigate, onReorder, flow, onShowFlow, headerAction }) {
  const [collapsed, setCollapsed] = useState(new Set());
  const [query, setQuery] = useState('');
  useEffect(() => {
    const active = headings.find(heading => heading.id === activeHeading);
    if (!active) return;
    setCollapsed(current => {
      if (!active.ancestorIds.some(id => current.has(id))) return current;
      return new Set([...current].filter(id => !active.ancestorIds.includes(id)));
    });
  }, [activeHeading]);
  const parents = new Set(headings.map(heading => heading.parentId).filter(Boolean));
  const linkedIds = new Set(flow.nodes.map(node => node.data.headingId).filter(Boolean));
  const term = query.trim().toLocaleLowerCase();
  const matches = term ? headings.filter(heading => heading.text.toLocaleLowerCase().includes(term)) : [];
  const matchingIds = new Set(matches.flatMap(heading => [heading.id, ...heading.ancestorIds]));
  const visible = headings.filter(heading => term ? matchingIds.has(heading.id) : !heading.ancestorIds.some(id => collapsed.has(id)));
  const movement = useMemo(() => {
    const groups = new Map(), result = new Map();
    for (const item of headings) {
      const group = `${item.parentId || 'root'}:${item.level}`;
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(item);
    }
    for (const siblings of groups.values()) siblings.forEach((item, index) => result.set(item.id || item.index, { previous: index > 0, next: index < siblings.length - 1 }));
    return result;
  }, [headings]);
  function toggle(id) { setCollapsed(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; }); }
  return <aside className="outline-panel" aria-label="シナリオの目次">
    <div className="outline-fixed">
      <div className="outline-title"><span>目次</span><span>{headings.length}</span>{headerAction}</div>
      <div className="outline-search"><Search size={15}/><input type="search" aria-label="目次を検索" placeholder="見出しを検索" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button aria-label="目次の検索をクリア" onClick={() => setQuery('')}><X size={14}/></button>}</div>
      <div className="outline-bulk"><button disabled={!parents.size || !!term} onClick={() => setCollapsed(new Set(parents))}><ChevronsUp size={14}/>すべて閉じる</button><button disabled={!collapsed.size || !!term} onClick={() => setCollapsed(new Set())}><ChevronsDown size={14}/>すべて開く</button></div>
    </div>
    <div className="outline-list">
      {visible.map(item => <div className={`outline-item ${item.id === activeHeading ? 'active' : ''}`} style={{ '--depth': item.depth }} key={item.id || item.index}>
        {parents.has(item.id) ? <button className="outline-toggle" disabled={!!term} aria-label={`${item.text}を${collapsed.has(item.id) ? '展開' : '折りたたむ'}`} aria-expanded={!!term || !collapsed.has(item.id)} onClick={() => toggle(item.id)}>{!term && collapsed.has(item.id) ? <ChevronRight size={15}/> : <ChevronDown size={15}/>}</button> : <span className="outline-toggle-spacer"/>}
        <button className="outline-link" onClick={() => onNavigate(item)} title={item.text}><span>{item.text}</span>{linkedIds.has(item.id) && <Link2 size={12} className="outline-linked" aria-label="フローとリンク済み"/>}</button>
        <div className="reorder-buttons">
          <button aria-label={`${item.text}を前へ`} title="節全体を前へ移動" disabled={!content || !movement.get(item.id || item.index)?.previous} onClick={() => onReorder(item, -1)}><ArrowUp size={13}/></button>
          <button aria-label={`${item.text}を後へ`} title="節全体を後へ移動" disabled={!content || !movement.get(item.id || item.index)?.next} onClick={() => onReorder(item, 1)}><ArrowDown size={13}/></button>
        </div>
      </div>)}
      {!headings.length && <p className="muted">「#! 」で章、「# 」でH1見出しを追加できます。</p>}
      {!!term && !visible.length && <p className="outline-empty" role="status">一致する見出しがありません。</p>}
    </div>
    <div className="outline-hint"><ArrowUp size={13}/><ArrowDown size={13}/><span>本文ごと並べ替え</span></div>
    <button className="outline-flow-button" onClick={onShowFlow}><Layers size={17}/>フローを開く<span>{flow.nodes.length}</span></button>
  </aside>;
}

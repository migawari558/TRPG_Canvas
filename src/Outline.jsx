import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, Link2, Layers, ChevronsUp, ChevronsDown } from 'lucide-react';
import { moveSection } from './model.mjs';

export default function Outline({ headings, content, activeHeading, onNavigate, onReorder, flow, onShowFlow }) {
  const [collapsed, setCollapsed] = useState(new Set());
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
  const visible = headings.filter(heading => !heading.ancestorIds.some(id => collapsed.has(id)));
  function toggle(id) { setCollapsed(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; }); }
  return <aside className="outline-panel" aria-label="シナリオの目次">
    <div className="outline-title"><span>目次</span><span>{headings.length.toString().padStart(2, '0')}</span></div>
    <div className="outline-bulk"><button disabled={!parents.size} onClick={() => setCollapsed(new Set(parents))}><ChevronsUp size={14}/>すべて閉じる</button><button disabled={!collapsed.size} onClick={() => setCollapsed(new Set())}><ChevronsDown size={14}/>すべて開く</button></div>
    <p className="outline-subtitle">章をひらいて、物語をたどる。</p>
    <div className="outline-list">
      {visible.map(item => <div className={`outline-item ${item.id === activeHeading ? 'active' : ''}`} style={{ '--depth': item.depth }} key={item.id || item.index}>
        {parents.has(item.id) ? <button className="outline-toggle" aria-label={`${item.text}を${collapsed.has(item.id) ? '展開' : '折りたたむ'}`} aria-expanded={!collapsed.has(item.id)} onClick={() => toggle(item.id)}>{collapsed.has(item.id) ? <ChevronRight size={15}/> : <ChevronDown size={15}/>}</button> : <span className="outline-toggle-spacer"/>}
        <button className="outline-link" onClick={() => onNavigate(item)} title={item.text}><span>{item.text}</span>{linkedIds.has(item.id) && <Link2 size={12} className="outline-linked" aria-label="フローとリンク済み"/>}</button>
        <div className="reorder-buttons">
          <button aria-label={`${item.text}を前へ`} title="節全体を前へ移動" disabled={!content || moveSection(content, item.index, -1) === content} onClick={() => onReorder(item, -1)}><ArrowUp size={13}/></button>
          <button aria-label={`${item.text}を後へ`} title="節全体を後へ移動" disabled={!content || moveSection(content, item.index, 1) === content} onClick={() => onReorder(item, 1)}><ArrowDown size={13}/></button>
        </div>
      </div>)}
      {!headings.length && <p className="muted">「#! 」で章、「# 」でH1見出しを追加できます。</p>}
    </div>
    <div className="outline-hint"><ArrowUp size={13}/><ArrowDown size={13}/><span>本文ごと並べ替え</span></div>
    <button className="outline-flow-button" onClick={onShowFlow}><Layers size={17}/>フローとの対応を見る</button>
    <div className="outline-bottom">見出しを変更してもリンクは維持されます。</div>
  </aside>;
}

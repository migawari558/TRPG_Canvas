import React, { useState } from 'react';
import { Minus, Plus, Maximize2 } from 'lucide-react';
import { flowSvg } from '../export.mjs';

export default function MobileFlow({ doc, headings, theme, onNavigate }) {
  const [zoom, setZoom] = useState(1);
  const hasScenes = doc.flow.nodes.length > 0;
  return <section className="mobile-panel mobile-flow-panel">
    <div className="mobile-panel-title"><h1>フローチャート</h1><span>閲覧専用</span></div>
    {hasScenes && <div className="mobile-flow-tools" role="toolbar" aria-label="フローの表示倍率">
      <button aria-label="フロー全体を表示" onClick={() => setZoom(1)}><Maximize2 size={18}/>全体</button>
      <output aria-live="polite">{Math.round(zoom * 100)}%</output>
      <button aria-label="フローを縮小" disabled={zoom === 1} onClick={() => setZoom(value => Math.max(1, value - 0.5))}><Minus size={18}/></button>
      <button aria-label="フローを拡大" disabled={zoom === 3} onClick={() => setZoom(value => Math.min(3, value + 0.5))}><Plus size={18}/></button>
    </div>}
    <div className="mobile-flow" tabIndex={0} aria-label="フロー図。拡大後は縦横にスクロールできます">
      {hasScenes ? <div className="mobile-flow-canvas" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
        dangerouslySetInnerHTML={{ __html: flowSvg(doc.flow, headings, theme) }}/> :
        <div className="mobile-flow-empty"><strong>シーンがありません</strong><p>PC版で作成したフローをここで確認できます</p></div>}
    </div>
    {hasScenes && <p>拡大した図は縦横にスクロールできます</p>}
    {doc.flow.nodes.some(node => node.data.headingId) && <h2>本文へ移動</h2>}
    {doc.flow.nodes.filter(node => node.data.headingId).map(node =>
      <button className="mobile-heading" key={node.id} onClick={() => onNavigate({ id: node.data.headingId })}>{node.data.label}</button>)}
  </section>;
}

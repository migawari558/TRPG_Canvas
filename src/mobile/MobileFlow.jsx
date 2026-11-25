import { mobileTheme } from './mobile-themes.mjs';
import React, { useState } from 'react';
import { Minus, Plus, Maximize2, FileText } from 'lucide-react';
import { flowSvg } from '../export.mjs';

export default function MobileFlow({ doc, headings, theme, onNavigate }) {
  const [zoom, setZoom] = useState(1);
  const hasScenes = doc.flow.nodes.length > 0;
  return <section className="mobile-panel mobile-flow-panel">
    <div className="mobile-panel-title"><h1>フローチャート</h1><span>{doc.flow.nodes.length} カード · 閲覧専用</span></div>
    {hasScenes && <div className="mobile-flow-tools" role="toolbar" aria-label="フローの表示倍率">
      <button aria-label="フロー全体を表示" onClick={() => setZoom(1)}><Maximize2 size={18}/>全体</button>
      <output aria-live="polite">{Math.round(zoom * 100)}%</output>
      <button aria-label="フローを縮小" disabled={zoom === 1} onClick={() => setZoom(value => Math.max(1, value - 0.5))}><Minus size={18}/></button>
      <button aria-label="フローを拡大" disabled={zoom === 3} onClick={() => setZoom(value => Math.min(3, value + 0.5))}><Plus size={18}/></button>
    </div>}
    <div className="mobile-flow" tabIndex={0} aria-label="フロー図。拡大後は縦横にスクロールできます">
      {hasScenes ? <div className="mobile-flow-canvas" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
        dangerouslySetInnerHTML={{ __html: flowSvg(doc.flow, headings, theme, mobileTheme(theme).colors) }}/> :
        <div className="mobile-flow-empty"><strong>シーンがありません</strong><p>PC版で作成したフローをここで確認できます</p></div>}
    </div>
    {hasScenes && <p>拡大した図は縦横にスクロールできます</p>}
    {hasScenes && <section className="mobile-flow-scene-list" aria-label="フローのカード一覧"><h2>シーンと情報</h2>{doc.flow.nodes.filter(node=>node.type!=='sceneGroup').map(node=><div className="mobile-flow-scene" key={node.id}><div><strong>{node.data.label}</strong>{node.type==='sceneInfo'&&<small>情報</small>}{node.parentId&&<small>{doc.flow.nodes.find(parent=>parent.id===node.parentId)?.data.label}</small>}</div>{headings.some(heading=>heading.id===node.data.headingId)&&<button aria-label={`${node.data.label}の本文を開く`} onClick={()=>onNavigate({id:node.data.headingId})}><FileText size={16}/>本文</button>}</div>)}</section>}
  </section>;
}

import React, { useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, addEdge, applyNodeChanges, applyEdgeChanges, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, GitBranch, Flag, Trash2, X, Pencil, Link2, Layers, Ungroup, FileText } from 'lucide-react';
import { uid } from './model.mjs';
import { groupByHeadings, ungroupFlow, removeFlowNode, absolutePosition } from './flow-model.mjs';

const kindNames = { scene: 'シーン', branch: '分岐', ending: 'エンディング' };
function EditButton({ data }) {
  return <button className="node-edit nodrag nopan" aria-label={`${data.label}を編集`} title="シーンを編集" onClick={event => { event.stopPropagation(); data.edit(); }}><Pencil size={15}/></button>;
}
function SceneNode({ data, selected }) {
  return <div className={`scene-node ${data.kind || 'scene'} ${selected ? 'selected' : ''} ${data.heading ? 'linked' : ''}`}>
    <Handle type="target" position={Position.Top}/>
    <small>{kindNames[data.kind] || 'シーン'}</small><EditButton data={data}/>
    <div className="node-label">{data.label}</div>
    <span className={`node-link ${data.headingId && !data.heading ? 'broken' : ''}`}>
      {data.heading ? <><Link2 size={12}/>{data.heading.text}</> : data.headingId ? 'リンク先の見出しがありません' : '未リンク · クリックで設定'}
    </span>
    <Handle type="source" position={Position.Bottom}/>
  </div>;
}
function SceneGroup({ data, selected }) {
  return <div className={`scene-group ${selected ? 'selected' : ''}`}>
    <Handle type="target" position={Position.Top}/>
    <div className="group-heading"><span><Layers size={15}/>章グループ</span><EditButton data={data}/>
      <button className="group-jump nodrag nopan" onClick={event => { event.stopPropagation(); data.heading ? data.navigate(data.heading) : data.edit(); }}>{data.heading?.text || data.label}<Link2 size={14}/></button>
    </div>
    <Handle type="source" position={Position.Bottom}/>
  </div>;
}
const nodeTypes = { scene: SceneNode, sceneGroup: SceneGroup };

export default function Flow({ flow, headings, onChange, onNavigate }) {
  const [selected, setSelected] = useState(null);
  const [instance, setInstance] = useState(null);
  const byHeading = new Map(headings.map(heading => [heading.id, heading]));
  const nodes = flow.nodes.map(node => ({
    ...node, type: node.type === 'sceneGroup' ? 'sceneGroup' : 'scene',
    selected: selected?.type === 'node' && selected.id === node.id,
    data: { ...node.data, heading: byHeading.get(node.data.headingId), edit: () => setSelected({ type: 'node', id: node.id }), navigate: onNavigate }
  }));
  const edges = flow.edges.map(edge => ({ ...edge, selected: selected?.type === 'edge' && selected.id === edge.id, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#799185', strokeWidth: 1.6 } }));
  const item = selected?.type === 'node' ? flow.nodes.find(node => node.id === selected.id) : flow.edges.find(edge => edge.id === selected?.id);
  function change(patch) { onChange({ ...flow, ...patch }); }
  function updateNode(patch) { change({ nodes: flow.nodes.map(node => node.id === item.id ? { ...node, data: { ...node.data, ...patch } } : node) }); }
  function fit() { setTimeout(() => instance?.fitView({ padding: 0.18, duration: 250, maxZoom: 1 }), 100); }
  function add(kind) {
    const id = uid();
    const y = flow.nodes.length ? Math.max(...flow.nodes.map(node => absolutePosition(node, flow.nodes).y + (node.style?.height || 110))) + 70 : 60;
    change({ nodes: [...flow.nodes, { id, type: 'scene', position: { x: 60, y }, data: { label: kind === 'branch' ? '新しい分岐' : kind === 'ending' ? '新しい結末' : '新しいシーン', kind } }] });
    setSelected({ type: 'node', id }); fit();
  }
  function group() { onChange(groupByHeadings(flow, headings)); setSelected(null); fit(); }
  const linkedHeading = item?.data && byHeading.get(item.data.headingId);

  return <div className="flow-view">
    <div className="flow-toolbar">
      <div><strong>目次とつながるシナリオフロー</strong><span>シーンをクリックして本文へ。鉛筆でリンクを編集。</span></div>
      <div className="flow-actions">
        <button className="group-action" disabled={!headings.some(h => h.id)} onClick={group} title="見出しごとのシーンを補い、見出し階層に沿って再配置します。既存のシーン・接続は保持します。"><Layers size={16}/>目次でグループ化</button>
        {flow.nodes.some(node => node.parentId) && <button aria-label="グループを解除" title="グループを解除（シーンと接続は保持）" onClick={() => { onChange(ungroupFlow(flow)); fit(); }}><Ungroup size={16}/></button>}
        <button onClick={() => add('scene')}><Plus size={16}/>シーン</button>
        <button onClick={() => add('branch')}><GitBranch size={16}/>分岐</button>
        <button onClick={() => add('ending')}><Flag size={16}/>結末</button>
      </div>
    </div>
    <div className="flow-canvas">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onInit={setInstance}
        onNodesChange={changes => {
          const structural = changes.filter(c => c.type !== 'select');
          if (!structural.length) return;
          const next = applyNodeChanges(structural, flow.nodes);
          if (JSON.stringify(next) !== JSON.stringify(flow.nodes)) change({ nodes: next });
        }}
        onEdgesChange={changes => { const structural = changes.filter(c => c.type !== 'select'); if (structural.length) change({ edges: applyEdgeChanges(structural, flow.edges) }); }}
        onConnect={connection => change({ edges: addEdge({ ...connection, id: uid() }, flow.edges) })}
        onNodeClick={(_, node) => { const heading = byHeading.get(node.data.headingId); if (heading && node.type !== 'sceneGroup') onNavigate(heading); else setSelected({ type: 'node', id: node.id }); }}
        onEdgeClick={(_, edge) => setSelected({ type: 'edge', id: edge.id })}
        onPaneClick={() => setSelected(null)} fitView fitViewOptions={{ padding: 0.18, maxZoom: 1 }} minZoom={0.15} maxZoom={2} deleteKeyCode={null}>
        <Background color="#cbd4c9" gap={22} size={1}/><Controls showInteractive={false}/>
        <MiniMap nodeColor={node => node.type === 'sceneGroup' ? '#dbe5d7' : node.data.kind === 'branch' ? '#d9c18f' : '#a6c2b0'} maskColor="rgba(244,246,240,.65)"/>
      </ReactFlow>
      {!nodes.length && <div className="flow-empty"><Layers size={36}/><h3>目次から、物語の道筋へ</h3><p>「目次でグループ化」で、本文とつながるフローを作れます。</p></div>}
      {item && <div className="flow-inspector">
        <div className="inspector-heading"><strong>{selected.type === 'node' ? 'シーンの編集' : 'つながりの編集'}</strong><button className="icon-button" aria-label="編集を閉じる" onClick={() => setSelected(null)}><X size={17}/></button></div>
        <label>{selected.type === 'node' ? 'シーン名' : '条件・ラベル'}<input maxLength={100} value={selected.type === 'node' ? item.data.label : item.label || ''} onChange={event => selected.type === 'node' ? updateNode({ label: event.target.value }) : change({ edges: flow.edges.map(edge => edge.id === item.id ? { ...edge, label: event.target.value } : edge) })}/></label>
        {selected.type === 'node' && <>
          <label>対応する目次<select aria-label="対応する目次" value={item.data.headingId || ''} onChange={event => updateNode({ headingId: event.target.value || null })}>
            <option value="">紐づけなし</option>
            {item.data.headingId && !linkedHeading && <option value={item.data.headingId}>見出しが削除されています</option>}
            {headings.map(heading => <option key={heading.id || heading.index} value={heading.id || ''}>{'　'.repeat(heading.depth)}{heading.text}</option>)}
          </select></label>
          {linkedHeading && <button className="jump-button" onClick={() => onNavigate(linkedHeading)}><FileText size={16}/>対応する本文へ</button>}
          <label>種類<select value={item.data.kind || 'scene'} onChange={event => updateNode({ kind: event.target.value })}>{Object.entries(kindNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
          {item.type === 'sceneGroup' && <p className="muted small">グループをドラッグすると、内側のシーンも一緒に移動します。目次の階層を変更した後は、再度グループ化してください。</p>}
        </>}
        <button className="danger-link" onClick={() => { if (selected.type === 'node') onChange(removeFlowNode(flow, item.id)); else change({ edges: flow.edges.filter(edge => edge.id !== item.id) }); setSelected(null); }}><Trash2 size={15}/>この{selected.type === 'node' ? item.type === 'sceneGroup' ? 'グループ枠' : 'シーン' : 'つながり'}を削除</button>
      </div>}
      <div className="flow-tip">クリックで本文へ · 鉛筆で編集 · ドラッグで配置 · 点どうしを結んで接続</div>
    </div>
  </div>;
}

import React, { useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, NodeResizer, addEdge, applyNodeChanges, applyEdgeChanges, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, GitBranch, Flag, Trash2, X, Pencil, Link2, Layers, Ungroup, FileText, Check } from 'lucide-react';
import { uid } from './model.mjs';
import { scenesFromHeadings, removeFlowSelection, ungroupFlow, removeFlowNode, absolutePosition, canJoinGroup, moveToGroup, moveNodesToGroup, dropIntoGroup } from './flow-model.mjs';

const kindNames = { scene: 'シーン', branch: '分岐', ending: 'エンディング' };
function EditButton({ data }) {
  return <button className="node-edit nodrag nopan" aria-label={`${data.label}を編集`} title="カード上で編集" onClick={event => { event.stopPropagation(); data.startInline(); }}><Pencil size={15}/></button>;
}
function InlineEditor({ data, group = false }) {
  return <div className="node-inline-editor nodrag nopan" onClick={event => event.stopPropagation()}>
    <label>{group ? 'グループ名' : 'シーン名'}<input autoFocus maxLength={100} aria-label={`${group ? 'グループ名' : 'シーン名'}をカードで編集`} value={data.label} onChange={event => data.update({ label: event.target.value })}/></label>
    {!group && <label>種類<select aria-label="種類をカードで編集" value={data.kind || 'scene'} onChange={event => data.update({ kind: event.target.value })}>{Object.entries(kindNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>}
    <label>所属グループ<select aria-label="所属グループをカードで編集" value={data.parentId || ''} onChange={event => data.changeGroup(event.target.value)}><option value="">グループの外</option>{data.groupOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
    <div className="node-inline-actions"><button type="button" onClick={data.openDetails}>詳細設定</button><button type="button" className="inline-done" aria-label="カードの編集を完了" onClick={data.finishInline}><Check size={14}/>完了</button></div>
  </div>;
}
function SceneNode({ data, selected }) {
  return <div className={`scene-node ${data.kind || 'scene'} ${selected ? 'selected' : ''} ${data.heading ? 'linked' : ''}`}>
    <Handle type="target" position={Position.Top}/>
    {data.inlineEditing ? <InlineEditor data={data}/> : <>
      <small>{kindNames[data.kind] || 'シーン'}</small><EditButton data={data}/>
      <div className="node-label" onDoubleClick={event => { event.stopPropagation(); data.startInline(); }}>{data.label}</div>
      <span className={`node-link ${data.headingId && !data.heading ? 'broken' : ''}`}>
        {data.heading ? <><Link2 size={12}/>{data.heading.text}</> : data.headingId ? 'リンク先なし · 本文を作り直せます' : '本文はまだありません'}
      </span>
      <button className="scene-write nodrag nopan" onClick={event => { event.stopPropagation(); data.write(); }}><FileText size={13}/>{data.heading ? '本文を開く' : '本文を書く'}</button>
    </>}
    <Handle type="source" position={Position.Bottom}/>
  </div>;
}
function SceneGroup({ data, selected }) {
  return <div className={`scene-group ${selected ? 'selected' : ''}`}>
    <NodeResizer isVisible={selected} minWidth={320} minHeight={180}/>
    <Handle type="target" position={Position.Top}/>
    <div className={`group-heading ${data.inlineEditing ? 'editing' : ''}`}>{data.inlineEditing ? <InlineEditor data={data} group/> : <><span><Layers size={15}/>グループ</span><EditButton data={data}/>
      <button className="group-jump nodrag nopan" onDoubleClick={event => { event.stopPropagation(); data.startInline(); }} onClick={event => { event.stopPropagation(); data.openDetails(); }}>{data.label}</button></>}
    </div>
    <Handle type="source" position={Position.Bottom}/>
  </div>;
}
const nodeTypes = { scene: SceneNode, sceneGroup: SceneGroup };

export default function Flow({ flow, headings, onChange, onNavigate, onWrite }) {
  const [selected, setSelected] = useState(null);
  const [selection, setSelection] = useState({ nodes: [], edges: [] });
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [instance, setInstance] = useState(null);
  const byHeading = new Map(headings.map(heading => [heading.id, heading]));
  function updateNodeById(id, patch) { onChange({ ...flow, nodes: flow.nodes.map(node => node.id === id ? { ...node, data: { ...node.data, ...patch } } : node) }); }
  const nodes = flow.nodes.map(node => ({
    ...node, type: node.type === 'sceneGroup' ? 'sceneGroup' : 'scene',
    selected: selection.nodes.includes(node.id) || editingNodeId === node.id || (selected?.type === 'node' && selected.id === node.id),
    data: { ...node.data, parentId: node.parentId || '', heading: byHeading.get(node.data.headingId), inlineEditing: editingNodeId === node.id,
      groupOptions: editingNodeId === node.id ? flow.nodes.filter(group => group.type === 'sceneGroup' && canJoinGroup(flow, node.id, group.id)).map(group => ({ id: group.id, label: group.data.label })) : [],
      startInline: () => { setEditingNodeId(node.id); setSelected(null); }, finishInline: () => setEditingNodeId(null),
      openDetails: () => { setEditingNodeId(null); setSelected({ type: 'node', id: node.id }); },
      update: patch => updateNodeById(node.id, patch), changeGroup: groupId => onChange(moveToGroup(flow, node.id, groupId)), navigate: onNavigate, write: () => onWrite(node.id) }
  }));
  const edges = flow.edges.map(edge => ({ ...edge, selected: selection.edges.includes(edge.id) || (selected?.type === 'edge' && selected.id === edge.id), markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: 'var(--theme-muted)', strokeWidth: 1.6 } }));
  const item = selected?.type === 'node' ? flow.nodes.find(node => node.id === selected.id) : flow.edges.find(edge => edge.id === selected?.id);
  function change(patch) { onChange({ ...flow, ...patch }); }
  function updateNode(patch) { change({ nodes: flow.nodes.map(node => node.id === item.id ? { ...node, data: { ...node.data, ...patch } } : node) }); }
  function fit() { setTimeout(() => instance?.fitView({ padding: 0.18, duration: 250, maxZoom: 1 }), 100); }
  function add(kind) {
    const id = uid();
    const y = flow.nodes.length ? Math.max(...flow.nodes.map(node => absolutePosition(node, flow.nodes).y + (node.style?.height || node.measured?.height || 165))) + 70 : 60;
    const created = { id, type: kind === 'group' ? 'sceneGroup' : 'scene', position: { x: 60, y }, ...(kind === 'group' ? { style: { width: 400, height: 300 } } : {}), data: { label: kind === 'group' ? '新しいグループ' : kind === 'branch' ? '新しい分岐' : kind === 'ending' ? '新しい結末' : '新しいシーン', kind: kind === 'group' ? 'scene' : kind } };
    let next = { ...flow, nodes: [...flow.nodes, created] };
    const selectedGroup = item?.type === 'sceneGroup' ? item : selection.nodes.length === 1 ? flow.nodes.find(node => node.id === selection.nodes[0] && node.type === 'sceneGroup') : null;
    if (selectedGroup) next = moveToGroup(next, id, selectedGroup.id);
    onChange(next);
    setSelected(null);
    setSelection({ nodes: [id], edges: [] });
    setEditingNodeId(id);
    const added = next.nodes.find(node => node.id === id), position = absolutePosition(added, next.nodes);
    setTimeout(() => instance?.setCenter(position.x + 130, position.y + 80, { zoom: 0.9, duration: 250 }), 100);
  }
  function group() { onChange(scenesFromHeadings(flow, headings)); setSelected(null); setSelection({ nodes: [], edges: [] }); fit(); }
  const selectedNodes = nodes.filter(n => selection.nodes.includes(n.id) || (selected?.type === 'node' && selected.id === n.id)).map(n => n.id), selectedEdges = edges.filter(e => e.selected).map(e => e.id);
  const selectionCount = selectedNodes.length + selectedEdges.length;
  const selectedCardIds = selectedNodes.filter(id => flow.nodes.some(node => node.id === id));
  const bulkGroups = selectedCardIds.length > 1 ? flow.nodes.filter(group => group.type === 'sceneGroup' && !selectedCardIds.includes(group.id) && selectedCardIds.every(id => canJoinGroup(flow, id, group.id))) : [];
  function moveSelection(groupId) { onChange(moveNodesToGroup(flow, selectedCardIds, groupId)); }
  function deleteSelection() { onChange(removeFlowSelection(flow, selectedNodes, selectedEdges)); setSelected(null); setSelection({ nodes: [], edges: [] }); }
  function selectChanges(changes, kind) {
    const updates = changes.filter(c => c.type === 'select');
    if (!updates.length) return;
    setSelected(null);
    setSelection(current => { const ids = new Set(current[kind]); updates.forEach(c => c.selected ? ids.add(c.id) : ids.delete(c.id)); return { ...current, [kind]: [...ids] }; });
  }
  const linkedHeading = item?.data && byHeading.get(item.data.headingId);

  return <div className="flow-view" onKeyDown={event => { if (['Delete', 'Backspace'].includes(event.key) && !event.target.closest('input,textarea,select,[contenteditable="true"]') && selectionCount) { event.preventDefault(); deleteSelection(); } }}>
    <div className="flow-toolbar">
      <div><strong>流れを組み立てて、シーンを書こう</strong><span>シーンをつなぎ、「本文を書く」から執筆。グループを選んで追加すると、その中に配置します。</span></div>
      <div className="flow-actions">
        {selectedCardIds.length > 1 && <label className="bulk-group">まとめて移動<select aria-label="選択したカードをグループへ移動" value="" onChange={event => { moveSelection(event.target.value === '__outside' ? '' : event.target.value); }}><option value="" disabled>グループを選択</option><option value="__outside">グループの外</option>{bulkGroups.map(group => <option key={group.id} value={group.id}>{group.data.label}</option>)}</select></label>}
        <button disabled={!selectionCount} aria-label="選択したフローを削除" onClick={deleteSelection}><Trash2 size={16}/>選択を削除{selectionCount ? `（${selectionCount}）` : ''}</button>
        <button className="group-action" onClick={() => add('group')}><Layers size={16}/>グループ</button>
        <details className="flow-legacy"><summary>既存の本文から</summary><button disabled={!headings.some(h => h.id && h.level <= 2)} onClick={group} title="章とH1をグループ、H2をシーンにします。既存のシーン・接続は保持します。">H1をグループ・H2をシーンに</button></details>
        {flow.nodes.some(node => node.parentId) && <button aria-label="グループを解除" title="グループを解除（シーンと接続は保持）" onClick={() => { onChange(ungroupFlow(flow)); fit(); }}><Ungroup size={16}/></button>}
        <button onClick={() => add('scene')}><Plus size={16}/>シーン</button>
        <button onClick={() => add('branch')}><GitBranch size={16}/>分岐</button>
        <button onClick={() => add('ending')}><Flag size={16}/>結末</button>
      </div>
    </div>
    <div className="flow-canvas">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onInit={setInstance}
        onNodesChange={changes => {
          selectChanges(changes, 'nodes');
          const structural = changes.filter(c => c.type !== 'select');
          if (!structural.length) return;
          const next = applyNodeChanges(structural, flow.nodes).map(node => {
            const resize = structural.find(change => change.id === node.id && change.type === 'dimensions' && change.resizing !== undefined);
            return node.type === 'sceneGroup' && resize?.dimensions ? { ...node, style: { ...node.style, ...resize.dimensions } } : node;
          });
          if (JSON.stringify(next) !== JSON.stringify(flow.nodes)) change({ nodes: next });
        }}
        onNodeDragStop={(_event, dragged) => {
          const positioned = { ...flow, nodes: flow.nodes.map(node => node.id === dragged.id ? { ...node, position: dragged.position } : node) };
          const next = dropIntoGroup(positioned, dragged.id);
          if (JSON.stringify(next.nodes) !== JSON.stringify(positioned.nodes)) onChange(next);
        }}
        onEdgesChange={changes => { selectChanges(changes, 'edges'); const structural = changes.filter(c => c.type !== 'select'); if (structural.length) change({ edges: applyEdgeChanges(structural, flow.edges) }); }}
        onConnect={connection => change({ edges: addEdge({ ...connection, id: uid() }, flow.edges) })}
        onNodeClick={(event, node) => { if (event.ctrlKey || event.metaKey || event.shiftKey || editingNodeId === node.id) return; const heading = byHeading.get(node.data.headingId); if (heading && node.type !== 'sceneGroup') onNavigate(heading); else setSelected({ type: 'node', id: node.id }); }}
        onEdgeClick={(event, edge) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey) setSelected({ type: 'edge', id: edge.id }); }}
        onPaneClick={() => { setSelected(null); setEditingNodeId(null); setSelection({ nodes: [], edges: [] }); }} selectionOnDrag selectionKeyCode="Shift" multiSelectionKeyCode={['Control', 'Meta', 'Shift']} panOnDrag={[1,2]} fitView fitViewOptions={{ padding: 0.18, maxZoom: 1 }} minZoom={0.15} maxZoom={2} deleteKeyCode={null}>
        <Background color="#cbd4c9" gap={22} size={1}/><Controls showInteractive={false}/>
        <MiniMap nodeColor={node => node.type === 'sceneGroup' ? '#dbe5d7' : node.data.kind === 'branch' ? '#d9c18f' : '#a6c2b0'} maskColor="rgba(244,246,240,.65)"/>
      </ReactFlow>
      {!nodes.length && <div className="flow-empty"><Layers size={36}/><h3>まずは、物語の流れから</h3><p>シーンや分岐を追加して、点どうしをつないでみましょう。<br/>本文は、流れが決まってから書き始められます。</p></div>}
      {item && <div className="flow-inspector">
        <div className="inspector-heading"><strong>{selected.type === 'node' ? 'シーンの編集' : 'つながりの編集'}</strong><button className="icon-button" aria-label="編集を閉じる" onClick={() => setSelected(null)}><X size={17}/></button></div>
        <label>{selected.type === 'node' ? 'シーン名' : '条件・ラベル'}<input maxLength={100} value={selected.type === 'node' ? item.data.label : item.label || ''} onChange={event => selected.type === 'node' ? updateNode({ label: event.target.value }) : change({ edges: flow.edges.map(edge => edge.id === item.id ? { ...edge, label: event.target.value } : edge) })}/></label>
        {selected.type === 'node' && <>
          <label>所属グループ<select aria-label="所属グループ" value={item.parentId || ''} onChange={event => onChange(moveToGroup(flow, item.id, event.target.value))}><option value="">グループの外</option>{flow.nodes.filter(node => node.type === 'sceneGroup' && canJoinGroup(flow, item.id, node.id)).map(node => <option key={node.id} value={node.id}>{node.data.label}</option>)}</select></label>
          {item.type !== 'sceneGroup' && <button className="primary-button full-width" onClick={() => onWrite(item.id)}><FileText size={16}/>{linkedHeading ? '本文を開く' : '本文を書く'}</button>}
          <details className="existing-link"><summary>既存の本文と紐づける</summary>
          <label>対応する目次<select aria-label="対応する目次" value={item.data.headingId || ''} onChange={event => updateNode({ headingId: event.target.value || null })}>
            <option value="">紐づけなし</option>
            {item.data.headingId && !linkedHeading && <option value={item.data.headingId}>見出しが削除されています</option>}
            {headings.map(heading => <option key={heading.id || heading.index} value={heading.id || ''}>{'　'.repeat(heading.depth)}{heading.text}</option>)}
          </select></label>
          {linkedHeading && <button className="jump-button" onClick={() => onNavigate(linkedHeading)}><FileText size={16}/>対応する本文へ</button>}
          </details>
          {item.type !== 'sceneGroup' && <label>種類<select value={item.data.kind || 'scene'} onChange={event => updateNode({ kind: event.target.value })}>{Object.entries(kindNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>}
          {item.type === 'sceneGroup' && <p className="muted small">選択中に「シーン」を追加するとこの中に配置します。枠の角でサイズ変更、ドラッグでまとめて移動できます。所属の変更は本文の順序・見出しを変更しません。</p>}
        </>}
        <button className="danger-link" onClick={() => { if (selected.type === 'node') onChange(removeFlowNode(flow, item.id)); else change({ edges: flow.edges.filter(edge => edge.id !== item.id) }); setSelected(null); }}><Trash2 size={15}/>この{selected.type === 'node' ? item.type === 'sceneGroup' ? 'グループ枠' : 'シーン' : 'つながり'}を削除</button>
      </div>}
      <div className="flow-tip">鉛筆または名前のダブルクリックでカードを直接編集 · Ctrl＋クリック／背景をドラッグで複数選択 · 選択カードをまとめてグループ移動 · 右ドラッグで画面移動</div>
    </div>
  </div>;
}

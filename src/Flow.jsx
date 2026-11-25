import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, BaseEdge, getBezierPath, Controls, MiniMap, Handle, Position, SelectionMode, addEdge, applyNodeChanges, applyEdgeChanges, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Trash2, X, Link2, Layers, Ungroup, FileText, Keyboard, Search, ChevronDown, ChevronRight, AlignHorizontalJustifyStart, Info } from 'lucide-react';
import { uid } from './model.mjs';
import { scenesFromHeadings, removeFlowSelection, ungroupFlow, removeFlowNode, absolutePosition, canJoinGroup, moveToGroup, moveNodesToGroup, normalizeFlowScenes, fitFlowGroups, FLOW_GRID, snapFlowPosition, projectFlowGroups, searchFlowNodes, flowTags, finishFlowDrag, arrangeFlowLeftToRight, addSceneInformation, informationEdges, isSceneNode } from './flow-model.mjs';

function InspectorField({ as: Field = 'input', inputRef, value, onValue, ...props }) {
  const [draft, setDraft] = useState(null);
  const composing = useRef(false);
  return <Field {...props} ref={inputRef} value={draft ?? value}
    onCompositionStart={event => { composing.current = true; setDraft(event.currentTarget.value); }}
    onCompositionEnd={event => { composing.current = false; setDraft(null); onValue(event.currentTarget.value); }}
    onInput={event => {
      if (composing.current || event.nativeEvent.isComposing) setDraft(event.currentTarget.value);
    }}
    onChange={event => {
      if (!composing.current && !event.nativeEvent.isComposing) onValue(event.currentTarget.value);
    }}/>;
}

function TagsEditor({ node, onChange }) {
  const [value, setValue] = useState(flowTags(node).join('、'));
  return <label>タグ<input aria-label="シーンのタグ" value={value} maxLength={200} placeholder="必須情報、任意イベント、未執筆" onChange={event => setValue(event.target.value)} onBlur={() => onChange([...new Set(value.split(/[,、]/).map(tag => tag.trim()).filter(Boolean))])}/><small>読点またはカンマで区切る · 本文には含まれません</small></label>;
}
function SceneRelations({ scene, flow, onJump }) {
  const byId = new Map(flow.nodes.map(node => [node.id, node]));
  const information = flow.nodes.filter(node => node.type === 'sceneInfo' && node.data.sceneId === scene.id);
  const outgoing = flow.edges.filter(edge => edge.source === scene.id && byId.has(edge.target));
  const incoming = flow.edges.filter(edge => edge.target === scene.id && byId.has(edge.source));

  function connections(edges, endpoint, label) {
    if (!edges.length) return null;
    return <section className="flow-relation-section">
      <h4>{label}</h4>
      {edges.map(edge => {
        const node = byId.get(edge[endpoint]);
        return <button type="button" key={edge.id} onClick={() => onJump(node)}>
          <strong>{node.data.label}</strong>
          {edge.label && <span>{edge.label}</span>}
        </button>;
      })}
    </section>;
  }

  return <div className="flow-relations">
    {information.length > 0 && <section className="flow-relation-section">
      <h4>提示する情報 · {information.length}件</h4>
      {information.map(node => <button type="button" key={node.id} onClick={() => onJump(node)}>
        <strong>{node.data.label || '無題の情報'}</strong>
        {node.data.condition && <span>開示条件 · {node.data.condition}</span>}
        {node.data.memo && <p>{node.data.memo}</p>}
      </button>)}
    </section>}
    {connections(outgoing, 'target', '次のシーン')}
    {connections(incoming, 'source', '前のシーン')}
  </div>;
}

function SceneNode({ data, selected }) {
  const manuscriptStatus = data.heading ? '本文あり' : data.headingId ? 'リンク先なし' : '本文なし';
  const memo = data.memo?.trim();
  return <div className={`scene-node flow-node-card ${memo ? 'has-memo' : ''} ${selected ? 'selected' : ''}`}>
    <Handle type="target" position={Position.Left}/>
    <FileText size={16} className="flow-node-icon" aria-label="シーン"/>
    <div className="flow-node-copy">
      <div className="node-label" title={data.label}>{data.label || '無題のシーン'}</div>
      <div className="flow-node-meta">{manuscriptStatus}{data.informationCount > 0 && ` · 情報 ${data.informationCount}件`}</div>
      {memo && <p className="flow-node-memo">{memo}</p>}
    </div>
    <Handle type="source" position={Position.Right}/>
    <Handle id="information" type="source" position={Position.Bottom} isConnectable={false} className="information-handle"/>
  </div>;
}

function InformationNode({ data, selected }) {
  return <div className={`scene-node flow-node-card information-node ${selected ? 'selected' : ''}`}>
    <Handle type="target" position={Position.Left} isConnectable={false}/>
    <Info size={16} className="flow-node-icon" aria-label="情報"/>
    <div className="flow-node-copy">
      <div className="node-label" title={data.label}>{data.label || '無題の情報'}</div>
      <div className="flow-node-meta" title={data.condition || data.ownerLabel}>{data.condition || data.ownerLabel || '提示するシーンが未設定'}</div>
    </div>
  </div>;
}

function SceneGroup({ data, selected }) {
  return <div className={`scene-group ${selected ? 'selected' : ''}`}>
    <Handle type="target" position={Position.Left}/>
    <div className="group-heading">
      <button className="group-collapse nodrag nopan" aria-label={`${data.label}を${data.collapsed ? '展開' : '折りたたむ'}`} aria-expanded={!data.collapsed} onClick={event => { event.stopPropagation(); data.toggleCollapsed(); }}>{data.collapsed ? <ChevronRight size={16}/> : <ChevronDown size={16}/>}</button>
      <Layers size={15} aria-hidden="true"/>
      <strong title={data.label}>{data.label || '無題のグループ'}</strong>
      <small>{data.childCount}件</small>
    </div>
    <Handle type="source" position={Position.Right}/>
  </div>;
}
const flowShortcuts = [
  ['N', 'シーンを追加'],
  ['Shift+N', '次のシーンを追加して接続'],
  ['G', 'グループを追加'],
  ['I', '選択したシーンに情報を追加'],
  ['C', 'カード同士を接続'],
  ['F2', '選択したカードの名前を編集'],
  ['P または /', 'シーン・情報を検索'],
  ['F', '全体を表示'],
  ['Delete / Backspace', '選択した項目を削除'],
  ['Esc', '接続や編集を閉じる'],
];

const nodeTypes = { scene: SceneNode, sceneGroup: SceneGroup, sceneInfo: InformationNode };
function ParallelBranch({ sourceX, sourceY, targetX, targetY, data, label, markerEnd, style }) {
  const x = (sourceX + targetX) / 2, y = (sourceY + targetY) / 2 + data.offset;
  const path = `M ${sourceX},${sourceY} C ${sourceX + 50},${sourceY} ${x - 40},${y} ${x},${y} C ${x + 40},${y} ${targetX - 50},${targetY} ${targetX},${targetY}`;
  return <BaseEdge path={path} label={label} labelX={x} labelY={y} markerEnd={markerEnd} style={style}/>;
}
function InformationLink({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style }) {
  // Keep a shared spine beside the cards so several information links never
  // run through the preceding information card.
  const spine = Math.min(sourceX - 110, targetX) - 10;
  const path = sourcePosition === Position.Bottom && targetPosition === Position.Left
    ? `M ${sourceX},${sourceY} L ${sourceX},${sourceY + 20} L ${spine},${sourceY + 20} L ${spine},${targetY} L ${targetX},${targetY}`
    : getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })[0];
  return <BaseEdge path={path} style={style}/>;
}
const edgeTypes = { parallelBranch: ParallelBranch, informationLink: InformationLink };

export default function Flow({ flow, headings, onChange: persistFlow, onNavigate, onWrite }) {
  const latestFlow = useRef(flow), dragStartFlow = useRef(null);
  latestFlow.current = flow;
  const onChange = useCallback(next => {
    const fitted = fitFlowGroups(next);
    latestFlow.current = fitted;
    persistFlow(fitted);
  }, [persistFlow]);
  const [connecting, setConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selection, setSelection] = useState({ nodes: [], edges: [] });
  const nameField = useRef(null);
  const [focusName, setFocusName] = useState(false);
  useEffect(() => {
    if (!focusName || !nameField.current) return;
    nameField.current.focus();
    nameField.current.select();
    setFocusName(false);
  }, [focusName, selected]);
  const [instance, setInstance] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false), [query, setQuery] = useState(''), [tagFilter, setTagFilter] = useState('');
  const [edgeEditor, setEdgeEditor] = useState(null);
  const canvasRef = useRef(null), searchRef = useRef(null);
  const normalizationChecked = useRef(false);
  useEffect(() => { if (normalizationChecked.current) return; normalizationChecked.current = true; const normalized = normalizeFlowScenes(flow); onChange(normalized); }, [flow, onChange]);
  const projected = useMemo(() => projectFlowGroups({ ...flow, edges: [...flow.edges, ...informationEdges(flow)] }), [flow]);
  const byHeading = useMemo(() => new Map(headings.map(heading => [heading.id, heading])), [headings]);
  const graphNodes = useMemo(() => {
    const byId = new Map(), infoCounts = new Map(), childCounts = new Map();
    for (const node of flow.nodes) {
      byId.set(node.id, node);
      if (node.type === 'sceneInfo') infoCounts.set(node.data.sceneId, (infoCounts.get(node.data.sceneId) || 0) + 1);
      if (node.parentId) childCounts.set(node.parentId, (childCounts.get(node.parentId) || 0) + 1);
    }
    return projected.nodes.map(node => ({
      ...node,
      type: node.type === 'sceneGroup' ? 'sceneGroup' : node.type === 'sceneInfo' ? 'sceneInfo' : 'scene',
      selected: false,
      data: {
        ...node.data,
        ownerLabel: byId.get(node.data.sceneId)?.data.label,
        informationCount: infoCounts.get(node.id) || 0,
        heading: byHeading.get(node.data.headingId),
        childCount: childCounts.get(node.id) || 0,
        toggleCollapsed: () => {
          const current = latestFlow.current;
          onChange({ ...current, nodes: current.nodes.map(item => item.id === node.id ? { ...item, data: { ...item.data, collapsed: !item.data.collapsed } } : item) });
        },
      },
    }));
  }, [byHeading, flow.nodes, onChange, projected.nodes]);
  const graphEdges = useMemo(() => projected.edges.map(edge => ({
    ...edge, selected: false,
    markerEnd: edge.data?.informationId ? undefined : { type: MarkerType.ArrowClosed },
    selectable: !edge.data?.informationId,
    style: { stroke: 'var(--theme-muted)', strokeWidth: 1.6, ...(edge.data?.informationId ? { strokeDasharray: '5 4' } : {}) },
  })), [projected.edges]);
  const nodes = useMemo(() => {
    const ids = new Set(selection.nodes);
    if (selected?.type === 'node') ids.add(selected.id);
    return graphNodes.map(node => ids.has(node.id) ? { ...node, selected: true } : node);
  }, [graphNodes, selection.nodes, selected]);
  const edges = useMemo(() => {
    const ids = new Set(selection.edges);
    if (selected?.type === 'edge') ids.add(selected.id);
    return graphEdges.map(edge => ids.has(edge.id) ? { ...edge, selected: true } : edge);
  }, [graphEdges, selection.edges, selected]);
  const item = selected?.type === 'node' ? flow.nodes.find(node => node.id === selected.id) : flow.edges.find(edge => edge.id === selected?.id);
  function change(patch) { onChange({ ...flow, ...patch }); }
  function updateNode(patch) { change({ nodes: flow.nodes.map(node => node.id === item.id ? { ...node, data: { ...node.data, ...patch } } : node) }); }
  function fit() { setTimeout(() => instance?.fitView({ padding: 0.18, duration: 250, maxZoom: 1 }), 100); }
  function add(kind, predecessorId = null) {
    const id = uid();
    const x = flow.nodes.length ? Math.max(...flow.nodes.map(node => absolutePosition(node, flow.nodes).x + (node.style?.width || node.measured?.width || 260))) + 100 : 60;
    const created = { id, type: kind === 'group' ? 'sceneGroup' : 'scene', position: snapFlowPosition({ x, y: 60 }), ...(kind === 'group' ? { style: { width: 400, height: 300 } } : {}), data: { label: kind === 'group' ? '新しいグループ' : '新しいシーン', ...(kind === 'group' ? {} : { memo: '' }) } };
    let next = { ...flow, nodes: [...flow.nodes, created] };
    const selectedGroup = item?.type === 'sceneGroup' ? item : selection.nodes.length === 1 ? flow.nodes.find(node => node.id === selection.nodes[0] && node.type === 'sceneGroup') : null;
    if (selectedGroup) { next = moveToGroup(next, id, selectedGroup.id); next.nodes = next.nodes.map(node => node.id === selectedGroup.id ? { ...node, data: { ...node.data, collapsed: false } } : node); }
    if (predecessorId) {
      const predecessor = flow.nodes.find(node => node.id === predecessorId);
      const origin = absolutePosition(predecessor, flow.nodes);
      const position = snapFlowPosition({ x: origin.x + (predecessor.style?.width || predecessor.measured?.width || 260) + 100, y: origin.y });
      const siblings = flow.nodes.filter(node => node.parentId === predecessor.parentId);
      let obstacle;
      while ((obstacle = siblings.find(node => {
        const point = absolutePosition(node, flow.nodes);
        return position.x < point.x + (node.style?.width || node.measured?.width || 260) + 20 && position.x + 240 > point.x && position.y < point.y + (node.style?.height || node.measured?.height || 165) + 40 && position.y + 100 > point.y;
      }))) {
        const point = absolutePosition(obstacle, flow.nodes);
        position.y = Math.ceil((point.y + (obstacle.style?.height || obstacle.measured?.height || 165) + 40) / FLOW_GRID) * FLOW_GRID;
      }
      const parent = flow.nodes.find(node => node.id === predecessor.parentId);
      const parentPosition = parent ? absolutePosition(parent, flow.nodes) : { x: 0, y: 0 };
      next = { ...flow, nodes: [...flow.nodes, { ...created, ...(parent ? { parentId: parent.id } : {}), position: { x: position.x - parentPosition.x, y: position.y - parentPosition.y } }], edges: addEdge({ id: uid(), source: predecessorId, target: id }, flow.edges) };
    }
    onChange(next);
    selectNode(id, true);
    const added = next.nodes.find(node => node.id === id), position = absolutePosition(added, next.nodes);
    setTimeout(() => instance?.setCenter(position.x + 110, position.y + 29, { zoom: 0.9, duration: 250 }), 100);
  }
  function selectNode(id, edit = false) {
    setSelected({ type: 'node', id });
    setSelection({ nodes: [id], edges: [] });
    if (edit) setFocusName(true);
  }
  function group() { onChange(arrangeFlowLeftToRight(scenesFromHeadings(flow, headings))); setSelected(null); setSelection({ nodes: [], edges: [] }); fit(); }
  const selectedNodes = nodes.filter(n => !n.hidden && (selection.nodes.includes(n.id) || (selected?.type === 'node' && selected.id === n.id))).map(n => n.id), selectedEdges = edges.filter(e => !e.hidden && !e.data?.informationId && e.selected).map(e => e.id);
  const selectionCount = selectedNodes.length + selectedEdges.length;
  const selectedCardIds = selectedNodes.filter(id => flow.nodes.some(node => node.id === id));
  const selectedScene = selectedCardIds.length === 1 ? flow.nodes.find(node => node.id === selectedCardIds[0] && isSceneNode(node)) : null;
  const bulkGroups = selectedCardIds.length > 1 ? flow.nodes.filter(group => group.type === 'sceneGroup' && !selectedCardIds.includes(group.id) && selectedCardIds.every(id => canJoinGroup(flow, id, group.id))) : [];
  function moveSelection(groupId) { onChange(moveNodesToGroup(flow, selectedCardIds, groupId)); }
  function deleteSelection() { onChange(removeFlowSelection(flow, selectedNodes, selectedEdges)); setSelected(null); setSelection({ nodes: [], edges: [] }); }
  function selectChanges(changes, kind) {
    const updates = changes.filter(c => c.type === 'select');
    if (!updates.length) return;
    setSelected(current => current && (current.type === 'node' ? 'nodes' : 'edges') === kind && updates.some(change => change.id === current.id && !change.selected) ? null : current);
    setSelection(current => { const ids = new Set(current[kind]); updates.forEach(c => c.selected ? ids.add(c.id) : ids.delete(c.id)); return { ...current, [kind]: [...ids] }; });
  }
  function addInformation(sceneId) {
    const next = addSceneInformation(flow, sceneId);
    if (next === flow) return;
    const info = next.nodes.at(-1);
    next.nodes = next.nodes.map(node => node.id === info.parentId ? { ...node, data: { ...node.data, collapsed: false } } : node);
    onChange(next); selectNode(info.id, true);
    const point = absolutePosition(info, next.nodes);
    setTimeout(() => instance?.setCenter(point.x + 110, point.y + 29, { zoom: 0.9, duration: 250 }), 100);
  }
  function startConnection() {
    setConnecting(true);
    setConnectionSource(selectedCardIds.length === 1 && flow.nodes.find(node => node.id === selectedCardIds[0])?.type !== 'sceneInfo' ? selectedCardIds[0] : null);
    setSelected(null);
  }
  function connectTo(id) {
    if (flow.nodes.find(node => node.id === id)?.type === 'sceneInfo') return;
    if (!connectionSource) { setConnectionSource(id); return; }
    if (connectionSource === id) return;
    change({ edges: addEdge({ id: uid(), source: connectionSource, target: id }, flow.edges) });
    setConnecting(false); setConnectionSource(null);
  }
  function handleKeyDown(event) {
    if (event.isComposing || event.nativeEvent.isComposing || event.repeat || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'escape') { setConnecting(false); setConnectionSource(null); setSelected(null); setSearchOpen(false); setEdgeEditor(null); }
    else if (key === 'c') startConnection();
    else if (key === 'n') { if (event.shiftKey && (!selectedScene)) return; add('scene', event.shiftKey ? selectedCardIds[0] : null); }
    else if (key === 'g') add('group');
    else if (key === 'i' && selectedScene) addInformation(selectedScene.id);
    else if (key === 'p' || key === '/') { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 0); }
    else if (key === 'f') fit();
    else if (key === 'f2' && selectedCardIds.length === 1) selectNode(selectedCardIds[0], true);
    else if (['delete', 'backspace'].includes(key) && selectionCount) deleteSelection();
    else return;
    event.preventDefault(); event.stopPropagation();
  }
  const tags = [...new Set(flow.nodes.flatMap(flowTags))].sort((a, b) => a.localeCompare(b, 'ja'));
  const searchResults = searchFlowNodes(flow, query, tagFilter);
  function jumpToNode(node) {
    const ancestors = new Set();
    let parent = flow.nodes.find(item => item.id === node.parentId);
    while (parent && !ancestors.has(parent.id)) { ancestors.add(parent.id); parent = flow.nodes.find(item => item.id === parent.parentId); }
    onChange({ ...flow, nodes: flow.nodes.map(item => ancestors.has(item.id) ? { ...item, data: { ...item.data, collapsed: false } } : item) });
    setSelected({ type: 'node', id: node.id }); setSelection({ nodes: [node.id], edges: [] });
    const point = absolutePosition(node, flow.nodes);
    setTimeout(() => instance?.setCenter(point.x + 110, point.y + 29, { zoom: 1, duration: 250 }), 100);
  }
  function createFromConnection(event, connection) {
    if (connection.isValid || !connection.fromNode || !instance || !event.target.closest('.react-flow__pane')) return;
    const point = 'changedTouches' in event ? event.changedTouches[0] : event;
    const position = snapFlowPosition(instance.screenToFlowPosition({ x: point.clientX, y: point.clientY }));
    const id = uid();
    const node = { id, type: 'scene', position, data: { label: '新しいシーン', memo: '' } };
    const reverse = connection.fromHandle?.type === 'target';
    const edge = { id: uid(), source: reverse ? id : connection.fromNode.id, target: reverse ? connection.fromNode.id : id };
    onChange({ ...flow, nodes: [...flow.nodes, node], edges: addEdge(edge, flow.edges) });
    selectNode(id, true);
  }
  function editEdge(event, edge) {
    if (edge.data?.informationId) { setSelected({ type: 'node', id: edge.data.informationId }); return; }
    const rect = canvasRef.current.getBoundingClientRect();
    setSelected(null); setSearchOpen(false);
    setEdgeEditor({ id: edge.id, label: edge.label || '', x: Math.max(8, Math.min(event.clientX - rect.left, rect.width - 280)), y: Math.max(8, Math.min(event.clientY - rect.top, rect.height - 150)) });
  }
  const linkedHeading = item?.data && byHeading.get(item.data.headingId);

  return <div className="flow-view" tabIndex={0} onKeyDown={handleKeyDown} onPointerDown={event => { if (!event.target.closest('input,textarea,select,button,[contenteditable="true"]')) event.currentTarget.focus({ preventScroll: true }); }}>
    <div className="flow-toolbar">
      <div><strong>フローチャート</strong><span>{flow.nodes.filter(isSceneNode).length} シーン · {flow.nodes.filter(node => node.type === 'sceneGroup').length} グループ · {flow.edges.length} つながり</span></div>
      <div className="flow-actions">
        <button title="接続の順序に合わせて左から右に配置" disabled={!flow.nodes.length} onClick={() => { onChange(arrangeFlowLeftToRight(flow)); fit(); }}><AlignHorizontalJustifyStart size={16}/>左→右に整列</button>
        <button title="シーンを探す（P / /）" aria-expanded={searchOpen} onClick={() => setSearchOpen(value => !value)}><Search size={16}/>検索</button>
        <button aria-pressed={connecting} title="線でつなぐ（C）" onClick={startConnection}><Link2 size={16}/>線でつなぐ</button>
        {selectedCardIds.length > 1 && <label className="bulk-group">まとめて移動<select aria-label="選択したカードをグループへ移動" value="" onChange={event => { moveSelection(event.target.value === '__outside' ? '' : event.target.value); }}><option value="" disabled>グループを選択</option><option value="__outside">グループの外</option>{bulkGroups.map(group => <option key={group.id} value={group.id}>{group.data.label}</option>)}</select></label>}
        <button disabled={!selectionCount} aria-label="選択したフローを削除" onClick={deleteSelection}><Trash2 size={16}/>選択を削除{selectionCount ? `（${selectionCount}）` : ''}</button>
        <button className="group-action" onClick={() => add('group')}><Layers size={16}/>グループ</button>
        <details className="flow-shortcuts" onKeyDown={event => {
          if (event.key !== 'Escape') return;
          event.stopPropagation();
          event.currentTarget.open = false;
          event.currentTarget.querySelector('summary').focus();
        }}>
          <summary><Keyboard size={16} aria-hidden="true"/>ショートカット</summary>
          <dl className="flow-shortcut-list">
            {flowShortcuts.map(([key, action]) => <React.Fragment key={key}>
              <dt><kbd>{key}</kbd></dt><dd>{action}</dd>
            </React.Fragment>)}
          </dl>
        </details>
        <details className="flow-legacy flow-more">
          <summary>その他</summary>
          <div className="flow-more-panel">
            <button disabled={!headings.some(h => h.id && h.level <= 2)} onClick={group}>H1をグループ・H2をシーンに</button>
            {flow.nodes.some(node => node.parentId) && <button aria-label="グループを解除" onClick={() => { onChange(ungroupFlow(flow)); fit(); }}>グループをすべて解除</button>}
          </div>
        </details>
        <button onClick={() => add('scene')}><Plus size={16}/>シーン</button>
      </div>
    </div>
    <div className="flow-workspace">
    <div className="flow-canvas" ref={canvasRef}>
      {searchOpen && <section className="flow-search" aria-label="シーン検索">
        <div className="inspector-heading"><strong>シーンを探す</strong><button aria-label="シーン検索を閉じる" onClick={() => setSearchOpen(false)}><X size={16}/></button></div>
        <input ref={searchRef} autoFocus aria-label="シーンを検索" placeholder="名前・メモ・タグを検索" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape' && !event.nativeEvent.isComposing) { setSearchOpen(false); event.stopPropagation(); } }}/>
        <select aria-label="タグで絞り込み" value={tagFilter} onChange={event => setTagFilter(event.target.value)}><option value="">すべてのタグ</option>{tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}</select>
        <p className="small muted" role="status">{searchResults.length}件 · 選択するとその場所へ移動</p>
        <div className="flow-search-results">{searchResults.map(node => <button key={node.id} onClick={() => jumpToNode(node)}><strong>{node.data.label}</strong><small>{node.type === 'sceneGroup' ? 'グループ' : node.type === 'sceneInfo' ? '情報' : byHeading.has(node.data.headingId) ? '本文あり' : '本文なし'}{flowTags(node).length ? ` · ${flowTags(node).join(' / ')}` : ''}</small></button>)}{!searchResults.length && <p>一致するシーンがありません。</p>}</div>
      </section>}
      {edgeEditor && <form className="flow-edge-editor nodrag nopan" style={{ left: edgeEditor.x, top: edgeEditor.y }} onPointerDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); change({ edges: flow.edges.map(edge => edge.id === edgeEditor.id ? { ...edge, label: edgeEditor.label } : edge) }); setEdgeEditor(null); }}>
        <label>分岐条件<input autoFocus aria-label="線の分岐条件" maxLength={100} placeholder="例：判定成功 / 手がかりを入手" value={edgeEditor.label} onChange={event => setEdgeEditor({ ...edgeEditor, label: event.target.value })} onKeyDown={event => { if (event.nativeEvent.isComposing && event.key === 'Enter') event.preventDefault(); if (event.key === 'Escape' && !event.nativeEvent.isComposing) { setEdgeEditor(null); event.stopPropagation(); } }}/></label>
        <div><button type="button" onClick={() => setEdgeEditor(null)}>キャンセル</button><button type="submit">保存</button></div>
      </form>}
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onInit={setInstance} snapToGrid snapGrid={[FLOW_GRID, FLOW_GRID]}
        onNodesChange={changes => {
          selectChanges(changes, 'nodes');
          const structural = changes.filter(c => c.type !== 'select' && !(c.type === 'dimensions' && flow.nodes.find(node => node.id === c.id)?.data.collapsed));
          if (!structural.length) return;
          const current = latestFlow.current;
          // The last drag event repeats the previous relative position. Fitting
          // may have moved the parent origin since then, so only clear dragging.
          const updates = structural.map(change => {
            if (change.type === 'position' && change.dragging === false && current.nodes.find(node => node.id === change.id)?.dragging) {
              const { position, ...rest } = change; return rest;
            }
            return change;
          });
          const next = applyNodeChanges(updates, current.nodes);
          if (JSON.stringify(next) !== JSON.stringify(current.nodes)) onChange({ ...current, nodes: next });
        }}
        onNodeDragStart={() => { dragStartFlow.current = latestFlow.current; }}
        onNodeDragStop={(_event, dragged, draggedNodes) => {
          const current = latestFlow.current;
          onChange(finishFlowDrag(current, (draggedNodes?.length ? draggedNodes : [dragged]).map(node => node.id), dragStartFlow.current || current));
          dragStartFlow.current = null;
        }}
        onEdgesChange={changes => { selectChanges(changes, 'edges'); const structural = changes.filter(c => c.type !== 'select'); if (structural.length) change({ edges: applyEdgeChanges(structural, flow.edges) }); }}
        isValidConnection={connection => connection.sourceHandle !== 'information' && [connection.source, connection.target].every(id => flow.nodes.find(node => node.id === id)?.type !== 'sceneInfo')}
        onConnectEnd={createFromConnection}
        onConnect={connection => change({ edges: addEdge({ ...connection, id: uid() }, flow.edges) })}
        onNodeClick={(event, node) => { if (connecting) { connectTo(node.id); return; } if (event.ctrlKey || event.metaKey || event.shiftKey) { setSelected(null); return; } selectNode(node.id); }}
        onNodeDoubleClick={(event, node) => { if (!connecting) selectNode(node.id, true); }}
        onEdgeDoubleClick={editEdge}
        onEdgeClick={(event, edge) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey) setSelected(edge.data?.informationId ? { type: 'node', id: edge.data.informationId } : { type: 'edge', id: edge.id }); }}
        onPaneClick={() => { setEdgeEditor(null); setConnecting(false); setConnectionSource(null); setSelected(null); setSelection({ nodes: [], edges: [] }); }} zoomOnDoubleClick={false} selectionMode={SelectionMode.Partial} selectionKeyCode="Shift" multiSelectionKeyCode={['Control', 'Meta', 'Shift']} panOnDrag={[0,1]} fitView fitViewOptions={{ padding: 0.18, maxZoom: 1 }} minZoom={0.15} maxZoom={2} deleteKeyCode={null}>
        <Background color="#cbd4c9" gap={FLOW_GRID} size={1}/><Controls showInteractive={false}/>
        <MiniMap pannable zoomable nodeColor={node => node.type === 'sceneGroup' ? '#dbe5d7' : '#a6c2b0'} maskColor="rgba(244,246,240,.65)"/>
      </ReactFlow>
      {!nodes.length && <div className="flow-empty"><Layers size={36}/><h3>シーンがありません</h3><p>シーンを追加し、接続点をドラッグしてつなげます。</p></div>}
      <div className="flow-tip" role="status">{connecting ? (connectionSource ? `「${flow.nodes.find(node => node.id === connectionSource)?.data.label || ''}」からつなぐ先をクリック · Escで中止` : '接続元のカードをクリック · Escで中止') : '背景ドラッグで移動 · Shift＋ドラッグで範囲選択'}</div>
    </div>
      {item && <aside className="flow-inspector" aria-label="選択項目の詳細">
        <div className="inspector-heading"><strong>{selected.type === 'node' ? item.type === 'sceneInfo' ? '情報' : item.type === 'sceneGroup' ? 'グループ' : 'シーン' : 'つながりの編集'}</strong><button className="icon-button" aria-label="編集を閉じる" onClick={() => { setSelected(null); setSelection({ nodes: [], edges: [] }); }}><X size={17}/></button></div>
        <label>{selected.type === 'node' ? item.type === 'sceneInfo' ? '情報名' : item.type === 'sceneGroup' ? 'グループ名' : 'シーン名' : '条件・ラベル'}<InspectorField key={item.id} inputRef={nameField} aria-label={selected.type === 'node' ? item.type === 'sceneInfo' ? '情報名' : item.type === 'sceneGroup' ? 'グループ名' : 'シーン名' : '条件・ラベル'} maxLength={100} value={selected.type === 'node' ? item.data.label : item.label || ''} onValue={label => selected.type === 'node' ? updateNode({ label }) : change({ edges: flow.edges.map(edge => edge.id === item.id ? { ...edge, label } : edge) })}/></label>
        {selected.type === 'node' && <>
          {isSceneNode(item) && <label>シーンメモ<InspectorField key={item.id} as="textarea" rows={4} maxLength={500} aria-label="シーンメモ" value={item.data.memo || ''} onValue={memo => updateNode({ memo })} placeholder="このシーンで起こること、出す手がかりなど"/></label>}
          {isSceneNode(item) && <div className="flow-inspector-actions">
            <button className="primary-button" onClick={() => onWrite(item.id)}><FileText size={16}/>{linkedHeading ? '本文を開く' : '本文を書く'}</button>
            <button className="secondary-button" onClick={() => addInformation(item.id)}><Info size={16}/>情報を追加</button>
          </div>}
          {isSceneNode(item) && <SceneRelations scene={item} flow={flow} onJump={jumpToNode}/>}
          {item.type === 'sceneInfo' && flow.nodes.some(node => node.id === item.data.sceneId && isSceneNode(node)) &&
            <button className="jump-button" onClick={() => jumpToNode(flow.nodes.find(node => node.id === item.data.sceneId))}>提示するシーンへ</button>}
          <TagsEditor key={item.id} node={item} onChange={tags => updateNode({ tags })}/>
          <label>所属グループ<select aria-label="所属グループ" value={item.parentId || ''} onChange={event => onChange(moveToGroup(flow, item.id, event.target.value))}><option value="">グループの外</option>{flow.nodes.filter(node => node.type === 'sceneGroup' && canJoinGroup(flow, item.id, node.id)).map(node => <option key={node.id} value={node.id}>{node.data.label}</option>)}</select></label>
          {item.type === 'sceneInfo' && <><label>提示するシーン<select aria-label="情報を提示するシーン" value={flow.nodes.some(scene => scene.id === item.data.sceneId && isSceneNode(scene)) ? item.data.sceneId : ''} onChange={event => updateNode({ sceneId: event.target.value || null })}><option value="">未設定</option>{flow.nodes.filter(isSceneNode).map(scene => <option key={scene.id} value={scene.id}>{scene.data.label}</option>)}</select></label><label>情報の内容<InspectorField key={item.id} as="textarea" rows={5} aria-label="情報の内容" maxLength={2000} value={item.data.memo || ''} onValue={memo => updateNode({ memo })}/></label><label>開示条件<input aria-label="情報の開示条件" maxLength={200} placeholder="例：目星成功 / NPCに質問する" value={item.data.condition || ''} onChange={event => updateNode({ condition: event.target.value })}/></label><p className="muted small">破線は情報の紐づけです。本文には自動挿入されません。</p></>}
          {item.type !== 'sceneInfo' && <details className="existing-link"><summary>既存の本文と紐づける</summary>
          <label>対応する目次<select aria-label="対応する目次" value={item.data.headingId || ''} onChange={event => updateNode({ headingId: event.target.value || null })}>
            <option value="">紐づけなし</option>
            {item.data.headingId && !linkedHeading && <option value={item.data.headingId}>見出しが削除されています</option>}
            {headings.map(heading => <option key={heading.id || heading.index} value={heading.id || ''}>{'　'.repeat(heading.depth)}{heading.text}</option>)}
          </select></label>
          {linkedHeading && <button className="jump-button" onClick={() => onNavigate(linkedHeading)}><FileText size={16}/>対応する本文へ</button>}
          </details>}
          {item.type === 'sceneGroup' && <p className="muted small">選択中に「シーン」を追加するとこの中に配置します。枠のサイズは中のシーンに合わせて自動調整されます。ドラッグでまとめて移動できます。所属の変更は本文の順序・見出しを変更しません。</p>}
        </>}
        <button className="danger-link" onClick={() => { if (selected.type === 'node') onChange(removeFlowNode(flow, item.id)); else change({ edges: flow.edges.filter(edge => edge.id !== item.id) }); setSelected(null); setSelection({ nodes: [], edges: [] }); }}><Trash2 size={15}/>この{selected.type === 'node' ? item.type === 'sceneGroup' ? 'グループ枠' : item.type === 'sceneInfo' ? '情報' : 'シーン' : 'つながり'}を削除</button>
      </aside>}
    </div>
  </div>;
}

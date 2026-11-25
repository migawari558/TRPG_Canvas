import { uid } from './model.mjs';
import { outline } from './model.mjs';

export const FLOW_GRID = 20;
export const snapFlowPosition = position => ({ x: Math.round(position.x / FLOW_GRID) * FLOW_GRID, y: Math.round(position.y / FLOW_GRID) * FLOW_GRID });

export function flowTags(node) {
  return Array.isArray(node.data?.tags) ? node.data.tags.filter(tag => typeof tag === 'string') : [];
}

export function isSceneNode(node) { return !!node && node.type !== 'sceneGroup' && node.type !== 'sceneInfo'; }

export function addSceneInformation(flow, sceneId) {
  const scene = flow.nodes.find(node => node.id === sceneId);
  if (!isSceneNode(scene)) return flow;
  const existing = flow.nodes.filter(node => node.type === 'sceneInfo' && node.data.sceneId === sceneId);
  const position = absolutePosition(scene, flow.nodes);
  const y = Math.max(position.y + nodeSize(scene).height + 60, ...existing.map(node => absolutePosition(node, flow.nodes).y + nodeSize(node).height + 40));
  const origin = scene.parentId ? absolutePosition(flow.nodes.find(node => node.id === scene.parentId), flow.nodes) : { x: 0, y: 0 };
  const snapped = snapFlowPosition({ x: position.x, y });
  return { ...flow, nodes: [...flow.nodes, { id: uid(), type: 'sceneInfo', ...(scene.parentId ? { parentId: scene.parentId } : {}), position: { x: snapped.x - origin.x, y: snapped.y - origin.y }, data: { label: '新しい情報', memo: '', condition: '', sceneId } }] };
}

export function informationEdges(flow) {
  return flow.nodes.filter(node => node.type === 'sceneInfo' && flow.nodes.some(scene => scene.id === node.data.sceneId && isSceneNode(scene)))
    .map(node => ({ id: `information:${node.id}`, source: node.data.sceneId, target: node.id, sourceHandle: 'information', type: 'informationLink', data: { informationId: node.id }, deletable: false }));
}

// Arrange each group independently. Edges crossing a group boundary contribute
// to the order of the corresponding group, while cycles retain a stable order.
export function arrangeFlowLeftToRight(flow) {
  const nodes = flow.nodes.map(node => ({ ...node, position: { ...node.position } }));
  const visited = new Set();
  function layout(parentId) {
    const children = nodes.filter(node => (node.parentId || null) === parentId);
    const attached = node => node.type === 'sceneInfo' && children.some(scene => scene.id === node.data.sceneId && isSceneNode(scene));
    const cards = children.filter(node => !attached(node));
    for (const node of cards) if (node.type === 'sceneGroup' && !visited.has(node.id)) { visited.add(node.id); layout(node.id); }
    const ids = new Set(cards.map(node => node.id));
    function sibling(id) {
      let node = nodes.find(item => item.id === id);
      const seen = new Set();
      while (node && !seen.has(node.id)) { if (ids.has(node.id)) return node.id; seen.add(node.id); node = nodes.find(item => item.id === node.parentId); }
      return null;
    }
    const links = flow.edges.map(edge => [sibling(edge.source), sibling(edge.target)]).filter(([a, b]) => a && b && a !== b);
    const rank = new Map(cards.map(node => [node.id, 0])), done = new Set();
    while (done.size < cards.length) {
      const ready = cards.filter(node => !done.has(node.id) && links.every(([a, b]) => b !== node.id || done.has(a)));
      if (!ready.length) ready.push(cards.find(node => !done.has(node.id)));
      for (const node of ready) {
        rank.set(node.id, Math.max(0, ...links.filter(([a, b]) => b === node.id && done.has(a)).map(([a]) => rank.get(a) + 1)));
        done.add(node.id);
      }
    }
    let x = parentId ? 20 : 40;
    for (let column = 0; column <= Math.max(0, ...rank.values()); column++) {
      const entries = cards.filter(node => rank.get(node.id) === column);
      let y = parentId ? 100 : 40, width = 0;
      for (const node of entries) {
        node.position = snapFlowPosition({ x, y });
        let bottom = node.position.y + nodeSize(node).height;
        width = Math.max(width, nodeSize(node).width);
        for (const info of children.filter(info => attached(info) && info.data.sceneId === node.id)) {
          info.position = snapFlowPosition({ x, y: bottom + 60 });
          bottom = info.position.y + nodeSize(info).height; width = Math.max(width, nodeSize(info).width);
        }
        y = Math.ceil((bottom + 80) / FLOW_GRID) * FLOW_GRID;
      }
      x += Math.ceil((width + 100) / FLOW_GRID) * FLOW_GRID;
    }
    if (parentId && children.length) {
      const parent = nodes.find(node => node.id === parentId);
      parent.style = { ...parent.style, width: Math.ceil(Math.max(...children.map(node => node.position.x + nodeSize(node).width + 20)) / FLOW_GRID) * FLOW_GRID, height: Math.ceil(Math.max(...children.map(node => node.position.y + nodeSize(node).height + 20)) / FLOW_GRID) * FLOW_GRID };
    }
  }
  layout(null);
  return fitFlowGroups({ ...flow, nodes });
}

export function searchFlowNodes(flow, query = '', tag = '') {
  const terms = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return flow.nodes.filter(node => {
    const tags = flowTags(node);
    const text = [node.data.label, node.data.memo, node.data.condition, ...tags].filter(Boolean).join(' ').normalize('NFKC').toLocaleLowerCase();
    return (!tag || tags.includes(tag)) && terms.every(term => text.includes(term));
  });
}

// Collapse is a view projection: saved endpoints and expanded geometry remain
// intact, including separate branches which happen to share a visible endpoint.
export function projectFlowGroups(flow) {
  const byId = new Map(flow.nodes.map(node => [node.id, node]));
  function representative(id) {
    let node = byId.get(id), result = id;
    const seen = new Set([id]);
    while (node?.parentId && !seen.has(node.parentId)) {
      seen.add(node.parentId); node = byId.get(node.parentId);
      if (node?.type === 'sceneGroup' && node.data?.collapsed) result = node.id;
    }
    return result;
  }
  const edges = flow.edges.map(edge => {
    const source = representative(edge.source), target = representative(edge.target);
    return { ...edge, source, target, ...(source !== edge.source ? { sourceHandle: null } : {}), hidden: source === target && (source !== edge.source || target !== edge.target) };
  });
  const bundles = new Map();
  edges.filter(edge => !edge.hidden).forEach(edge => {
    const key = JSON.stringify([edge.source, edge.target]);
    if (!bundles.has(key)) bundles.set(key, []);
    bundles.get(key).push(edge);
  });
  bundles.forEach(bundle => {
    if (bundle.length < 2) return;
    bundle.forEach((edge, index) => { edge.type = 'parallelBranch'; edge.data = { ...edge.data, offset: (index - (bundle.length - 1) / 2) * 160 }; });
  });
  return {
    ...flow,
    nodes: flow.nodes.map(node => ({ ...node, hidden: representative(node.id) !== node.id,
      ...(node.type === 'sceneGroup' && node.data?.collapsed ? { style: { ...node.style, width: 320, height: 120 } } : {}) })),
    edges
  };
}

// Work from the deepest group outward. Moving the frame must never move its
// contents on the canvas; grid-sized offsets also preserve child alignment.
export function fitFlowGroups(flow) {
  const nodes = flow.nodes.map(node => ({ ...node, position: { ...node.position } }));
  const groups = nodes.filter(node => node.type === 'sceneGroup').sort((a, b) => groupDepth(b, nodes) - groupDepth(a, nodes));
  for (const group of groups) {
    const children = nodes.filter(node => node.parentId === group.id);
    let width = 320, height = 200;
    if (children.length) {
      width = 0; height = 0;
      const dx = Math.floor((Math.min(...children.map(n => n.position.x)) - 20) / FLOW_GRID) * FLOW_GRID;
      const dy = Math.floor((Math.min(...children.map(n => n.position.y)) - 100) / FLOW_GRID) * FLOW_GRID;
      group.position.x += dx; group.position.y += dy;
      children.forEach(node => { node.position.x -= dx; node.position.y -= dy; });
      width = Math.max(width, ...children.map(n => n.position.x + nodeSize(n).width + 20));
      height = Math.max(height, ...children.map(n => n.position.y + nodeSize(n).height + 20));
    }
    group.style = { ...group.style, width: Math.ceil(width / FLOW_GRID) * FLOW_GRID, height: Math.ceil(height / FLOW_GRID) * FLOW_GRID };
  }
  return { ...flow, nodes: nodes.map(({ extent, expandParent, ...node }) => node) };
}

// Flow groups organize planning independently of manuscript heading levels.
export function writeFlowScene(content, flow, nodeId) {
  const node = flow.nodes.find(item => item.id === nodeId);
  if (!isSceneNode(node)) return null;
  const existing = outline(content).find(heading => heading.id && heading.id === node.data.headingId);
  if (existing) return { content, flow, headingId: existing.id, created: false };
  const headingId = uid();
  return {
    content: { type: 'doc', ...content, content: [...(content?.content || []), { type: 'heading', attrs: { level: 2, headingId }, content: [{ type: 'text', text: node.data.label.trim() || '新しいシーン' }] }, { type: 'paragraph' }] },
    flow: { ...flow, nodes: flow.nodes.map(item => item.id === nodeId ? { ...item, data: { ...item.data, headingId } } : item) },
    headingId, created: true
  };
}

export function canJoinGroup(flow, nodeId, groupId) {
  if (!groupId) return true;
  const byId = new Map(flow.nodes.map(node => [node.id, node]));
  let parent = byId.get(groupId);
  if (parent?.type !== 'sceneGroup') return false;
  const seen = new Set([nodeId]);
  while (parent) {
    if (seen.has(parent.id)) return false;
    seen.add(parent.id); parent = byId.get(parent.parentId);
  }
  return true;
}

export function moveToGroup(flow, nodeId, groupId) {
  if (!canJoinGroup(flow, nodeId, groupId)) return flow;
  const node = flow.nodes.find(item => item.id === nodeId), parent = flow.nodes.find(item => item.id === groupId);
  if (!node) return flow;
  const position = absolutePosition(node, flow.nodes);
  const { parentId, extent, expandParent, ...rest } = node;
  const moved = parent ? { ...rest, parentId: parent.id, expandParent: true, position: { x: Math.ceil(Math.max(20, ...flow.nodes.filter(item => item.parentId === groupId && item.id !== nodeId).map(item => item.position.x + nodeSize(item).width + 100)) / FLOW_GRID) * FLOW_GRID, y: 100 } } : { ...rest, position };
  const nodes = flow.nodes.map(item => item.id === nodeId ? moved : item.id === groupId ? { ...item } : item);
  if (parent) {
    const p = nodes.find(item => item.id === parent.id);
    p.style = { ...p.style, width: Math.max(p.style?.width || 400, moved.position.x + (moved.style?.width || 260) + 30), height: Math.max(p.style?.height || 300, moved.position.y + (moved.style?.height || 150) + 30) };
  }
  // React Flow requires every parent before its descendants.
  const sorted = [], visited = new Set();
  function visit(item) { if (visited.has(item.id)) return; visited.add(item.id); const parent = nodes.find(n => n.id === item.parentId); if (parent) visit(parent); sorted.push(item); }
  nodes.forEach(visit);
  return { ...flow, nodes: sorted };
}

export function moveNodesToGroup(flow, nodeIds, groupId) {
  const ids = [...new Set(nodeIds)].filter(id => flow.nodes.some(node => node.id === id));
  if (!ids.length || !ids.every(id => canJoinGroup(flow, id, groupId))) return flow;
  return ids.reduce((next, id) => moveToGroup(next, id, groupId), flow);
}

export function normalizeFlowScenes(flow) {
  let changed = false;
  const nodes = flow.nodes.map(node => {
    if (node.type === 'sceneGroup' || !Object.hasOwn(node.data, 'kind')) return node;
    const { kind: _legacyKind, ...data } = node.data; changed = true;
    return { ...node, data };
  });
  return changed ? { ...flow, nodes } : flow;
}

function nodeSize(node) {
  return {
    width: node.style?.width || node.measured?.width || node.width || (node.type === 'sceneGroup' ? 400 : 260),
    height: node.style?.height || node.measured?.height || node.height || (node.type === 'sceneGroup' ? 300 : 155)
  };
}

function groupDepth(node, nodes) {
  const byId = new Map(nodes.map(item => [item.id, item]));
  let depth = 0, parent = byId.get(node.parentId), seen = new Set([node.id]);
  while (parent && !seen.has(parent.id)) { seen.add(parent.id); depth++; parent = byId.get(parent.parentId); }
  return depth;
}

// Attach a dragged node to the deepest group under its center without moving it
// away from the place where the user dropped it.
export function dropIntoGroup(flow, nodeId, boundsFlow = flow, excludedGroupId = null) {
  const node = flow.nodes.find(item => item.id === nodeId);
  if (!node) return flow;
  const absolute = absolutePosition(node, flow.nodes), size = nodeSize(node);
  const center = { x: absolute.x + size.width / 2, y: absolute.y + size.height / 2 };
  const candidates = projectFlowGroups(boundsFlow).nodes.filter(group => {
    if (group.id === excludedGroupId || group.hidden || group.type !== 'sceneGroup' || !canJoinGroup(flow, nodeId, group.id)) return false;
    const position = absolutePosition(group, boundsFlow.nodes), groupSize = nodeSize(group);
    return center.x >= position.x && center.x <= position.x + groupSize.width && center.y >= position.y && center.y <= position.y + groupSize.height;
  }).sort((a, b) => groupDepth(b, flow.nodes) - groupDepth(a, flow.nodes) || nodeSize(a).width * nodeSize(a).height - nodeSize(b).width * nodeSize(b).height);
  const parent = candidates[0];
  if (!parent || parent.id === node.parentId) return flow;
  const parentPosition = absolutePosition(flow.nodes.find(item => item.id === parent.id), flow.nodes);
  const { parentId, extent, ...rest } = node;
  const moved = { ...rest, parentId: parent.id, expandParent: true, position: { x: absolute.x - parentPosition.x, y: absolute.y - parentPosition.y } };
  const nodes = flow.nodes.map(item => item.id === nodeId ? moved : item);
  // React Flow requires every parent before its descendants.
  const sorted = [], visited = new Set();
  function visit(item) { if (visited.has(item.id)) return; visited.add(item.id); const ancestor = nodes.find(candidate => candidate.id === item.parentId); if (ancestor) visit(ancestor); sorted.push(item); }
  nodes.forEach(visit);
  return { ...flow, nodes: sorted };
}

// Compare with the frame at drag start: live fitting otherwise makes it
// impossible to leave a group. Partial overlap retains membership.
export function finishFlowDrag(flow, nodeIds, startFlow) {
  const moved = new Set(nodeIds);
  let next = { ...flow, nodes: flow.nodes.map(node => ({ ...node, dragging: false })) };
  for (const id of moved) {
    const node = next.nodes.find(item => item.id === id);
    if (!node) continue;
    let ancestor = node, parentMoved = false;
    const seen = new Set([id]);
    while (ancestor.parentId && !seen.has(ancestor.parentId)) {
      seen.add(ancestor.parentId);
      if (moved.has(ancestor.parentId)) { parentMoved = true; break; }
      ancestor = next.nodes.find(item => item.id === ancestor.parentId);
      if (!ancestor) break;
    }
    if (parentMoved) continue;
    const parent = startFlow.nodes.find(item => item.id === node.parentId);
    if (parent) {
      const point = absolutePosition(node, next.nodes), size = nodeSize(node);
      const frame = absolutePosition(parent, startFlow.nodes), frameSize = nodeSize(parent);
      const overlaps = point.x < frame.x + frameSize.width && point.x + size.width > frame.x && point.y < frame.y + frameSize.height && point.y + size.height > frame.y;
      if (overlaps) continue;
      const { parentId, extent, expandParent, ...rest } = node;
      next = { ...next, nodes: next.nodes.map(item => item.id === id ? { ...rest, position: point } : item) };
    }
    next = dropIntoGroup(next, id, startFlow, parent?.id);
  }
  return fitFlowGroups(next);
}

export function absolutePosition(node, nodes) {
  const byId = new Map(nodes.map(item => [item.id, item]));
  const position = { ...node.position }, seen = new Set([node.id]);
  let parent = byId.get(node.parentId);
  while (parent && !seen.has(parent.id)) {
    seen.add(parent.id);
    position.x += parent.position.x;
    position.y += parent.position.y;
    parent = byId.get(parent.parentId);
  }
  return position;
}

function standalone(node, nodes) {
  const { parentId, extent, expandParent, measured, width, height, style, selected, dragging, ...rest } = node;
  return { ...rest, type: node.type === 'sceneInfo' ? 'sceneInfo' : 'scene', position: absolutePosition(node, nodes) };
}

export function ungroupFlow(flow) {
  return { ...flow, nodes: flow.nodes.map(node => standalone(node, flow.nodes)) };
}

// Existing connections and manually created scenes survive rebuilding the hierarchy.
// Reuse stable heading IDs; never guess links from a potentially duplicated title.
export function groupByHeadings(flow, headings, sceneLevels = false) {
  const linked = new Map();
  for (const node of flow.nodes) {
    if (node.data.headingId && !linked.has(node.data.headingId)) linked.set(node.data.headingId, node);
  }
  const entries = new Map(headings.filter(h => h.id).map(heading => {
    const existing = linked.get(heading.id);
    return [heading.id, {
      heading, children: [],
      node: { ...(existing ? standalone(existing, flow.nodes) : { id: uid(), position: { x: 0, y: 0 }, data: { label: heading.text } }), data: { ...(existing?.data || { label: heading.text }), headingId: heading.id } }
    }];
  }));
  const roots = [];
  for (const entry of entries.values()) {
    const parent = entries.get(entry.heading.parentId);
    (parent ? parent.children : roots).push(entry);
  }
  function measure(entry) {
    entry.children.forEach(measure);
    const group = entry.children.length || (sceneLevels && entry.heading.level < 2);
    entry.width = group ? Math.max(272, ...entry.children.map(child => child.width)) + 48 : 260;
    entry.height = group ? Math.max(180, 90 + entry.children.reduce((height, child) => height + child.height + 30, 0)) : 165;
  }
  roots.forEach(measure);
  const nodes = [];
  function place(entry, x, y, parentId) {
    const isGroup = entry.children.length > 0 || (sceneLevels && entry.heading.level < 2);
    nodes.push({ ...entry.node, type: isGroup ? 'sceneGroup' : 'scene', position: { x, y }, ...(parentId ? { parentId, extent: 'parent' } : {}), ...(isGroup ? { style: { width: entry.width, height: entry.height } } : {}) });
    let childY = 90;
    for (const child of entry.children) { place(child, 24, childY, entry.node.id); childY += child.height + 30; }
  }
  let x = 40, y = 40, rowHeight = 0;
  roots.forEach((entry, index) => {
    if (index > 0 && index % 3 === 0) { x = 40; y += rowHeight + 70; rowHeight = 0; }
    place(entry, x, y);
    x += entry.width + 70; rowHeight = Math.max(rowHeight, entry.height);
  });
  const used = new Set(nodes.map(node => node.id));
  const extras = flow.nodes.filter(node => !used.has(node.id));
  const extraY = roots.length ? y + rowHeight + 100 : 40;
  extras.forEach((node, index) => nodes.push({ ...standalone(node, flow.nodes), position: { x: 40 + (index % 3) * 330, y: extraY + Math.floor(index / 3) * 170 } }));
  return normalizeFlowScenes({ ...flow, nodes });
}

export function scenesFromHeadings(flow, headings) {
  const selected = headings.filter(h => h.level <= 2), ids = new Set(selected.map(h => h.id));
  return groupByHeadings(flow, selected.map(h => ({ ...h, parentId: [...h.ancestorIds].reverse().find(id => ids.has(id)) || null })), true);
}

export function removeFlowSelection(flow, nodeIds, edgeIds = []) {
  const removed = new Set(nodeIds), removedEdges = new Set(edgeIds);
  return { ...flow, nodes: flow.nodes.filter(n => !removed.has(n.id)).map(node => {
    if (!removed.has(node.parentId)) return node;
    const { parentId, extent, expandParent, ...rest } = node;
    return { ...rest, position: absolutePosition(node, flow.nodes) };
  }).map(node => node.type === 'sceneInfo' && removed.has(node.data.sceneId) ? { ...node, data: { ...node.data, sceneId: null } } : node), edges: flow.edges.filter(e => !removedEdges.has(e.id) && !removed.has(e.source) && !removed.has(e.target)) };
}

export function removeFlowNode(flow, id) {
  // Group removal releases children; scene removal keeps its information cards.
  return removeFlowSelection(flow, [id]);
}

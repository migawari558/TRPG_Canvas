import { uid } from './model.mjs';
import { outline } from './model.mjs';

// Flow groups organize planning independently of manuscript heading levels.
export function writeFlowScene(content, flow, nodeId) {
  const node = flow.nodes.find(item => item.id === nodeId);
  if (!node || node.type === 'sceneGroup') return null;
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
  const moved = parent ? { ...rest, parentId: parent.id, expandParent: true, position: { x: 30, y: Math.max(90, ...flow.nodes.filter(item => item.parentId === groupId && item.id !== nodeId).map(item => item.position.y + (item.style?.height || item.measured?.height || 150) + 30)) } } : { ...rest, position };
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
export function dropIntoGroup(flow, nodeId) {
  const node = flow.nodes.find(item => item.id === nodeId);
  if (!node) return flow;
  const absolute = absolutePosition(node, flow.nodes), size = nodeSize(node);
  const center = { x: absolute.x + size.width / 2, y: absolute.y + size.height / 2 };
  const candidates = flow.nodes.filter(group => {
    if (group.type !== 'sceneGroup' || !canJoinGroup(flow, nodeId, group.id)) return false;
    const position = absolutePosition(group, flow.nodes), groupSize = nodeSize(group);
    return center.x >= position.x && center.x <= position.x + groupSize.width && center.y >= position.y && center.y <= position.y + groupSize.height;
  }).sort((a, b) => groupDepth(b, flow.nodes) - groupDepth(a, flow.nodes) || nodeSize(a).width * nodeSize(a).height - nodeSize(b).width * nodeSize(b).height);
  const parent = candidates[0];
  if (!parent || parent.id === node.parentId) return flow;
  const parentPosition = absolutePosition(parent, flow.nodes);
  const { parentId, extent, ...rest } = node;
  const moved = { ...rest, parentId: parent.id, expandParent: true, position: { x: absolute.x - parentPosition.x, y: absolute.y - parentPosition.y } };
  const nodes = flow.nodes.map(item => item.id === nodeId ? moved : item);
  // React Flow requires every parent before its descendants.
  const sorted = [], visited = new Set();
  function visit(item) { if (visited.has(item.id)) return; visited.add(item.id); const ancestor = nodes.find(candidate => candidate.id === item.parentId); if (ancestor) visit(ancestor); sorted.push(item); }
  nodes.forEach(visit);
  return { ...flow, nodes: sorted };
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
  return { ...rest, type: 'scene', position: absolutePosition(node, nodes) };
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
      node: { ...(existing ? standalone(existing, flow.nodes) : { id: uid(), position: { x: 0, y: 0 }, data: { label: heading.text, kind: 'scene' } }), data: { ...(existing?.data || { label: heading.text, kind: 'scene' }), headingId: heading.id } }
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
  return { ...flow, nodes };
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
  }), edges: flow.edges.filter(e => !removedEdges.has(e.id) && !removed.has(e.source) && !removed.has(e.target)) };
}

export function removeFlowNode(flow, id) {
  // Deleting a group releases its immediate children instead of deleting content.
  return {
    ...flow,
    nodes: flow.nodes.filter(node => node.id !== id).map(node => {
      if (node.parentId !== id) return node;
      const { parentId, extent, ...rest } = node;
      return { ...rest, position: absolutePosition(node, flow.nodes) };
    }),
    edges: flow.edges.filter(edge => edge.source !== id && edge.target !== id)
  };
}

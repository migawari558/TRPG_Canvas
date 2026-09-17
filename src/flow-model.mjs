import { uid } from './model.mjs';

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
export function groupByHeadings(flow, headings) {
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
    entry.width = entry.children.length ? Math.max(...entry.children.map(child => child.width)) + 48 : 260;
    entry.height = entry.children.length ? 90 + entry.children.reduce((height, child) => height + child.height + 30, 0) : 110;
  }
  roots.forEach(measure);
  const nodes = [];
  function place(entry, x, y, parentId) {
    const isGroup = entry.children.length > 0;
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

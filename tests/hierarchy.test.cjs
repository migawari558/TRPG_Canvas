const { test } = require('node:test');
const assert = require('node:assert/strict');
const heading = (id, text, level) => ({ type: 'heading', attrs: { headingId: id, level }, content: [{ type: 'text', text }] });

test('outline derives real ancestry even when heading levels are skipped', async () => {
  const { outline, moveSection } = await import('../src/model.mjs');
  const doc = { type: 'doc', content: [heading('a', '同名', 2), heading('b', '子', 4), heading('c', '孫', 5), heading('d', '同名', 2)] };
  const list = outline(doc);
  assert.deepEqual(list.map(h => [h.id, h.parentId, h.depth]), [['a', null, 0], ['b', 'a', 1], ['c', 'b', 2], ['d', null, 0]]);
  assert.deepEqual(list[2].ancestorIds, ['a', 'b']);
  const moved = outline(moveSection(doc, 0, 1));
  assert.deepEqual(moved.map(h => h.id), ['d', 'a', 'b', 'c']);
  assert.equal(moved.find(h => h.id === 'b').parentId, 'a');
});

test('nested groups reuse links and preserve manual scenes and edges when regenerated', async () => {
  const { outline } = await import('../src/model.mjs');
  const { groupByHeadings, absolutePosition, ungroupFlow, removeFlowNode } = await import('../src/flow-model.mjs');
  const headings = outline({ content: [heading('a', '章', 2), heading('b', '節', 3), heading('c', '項', 4), heading('d', '結末', 2)] });
  const flow = { nodes: [
    { id: 'linked', position: { x: 5, y: 10 }, data: { label: 'カスタム名', headingId: 'c', kind: 'branch' } },
    { id: 'manual', position: { x: 500, y: 10 }, data: { label: '手動シーン', kind: 'scene' } }
  ], edges: [{ id: 'edge', source: 'manual', target: 'linked', label: '成功' }] };
  const grouped = groupByHeadings(flow, headings);
  assert.equal(grouped.nodes.length, 5);
  assert.equal(grouped.nodes.filter(n => n.type === 'sceneGroup').length, 2);
  assert.deepEqual(grouped.edges, flow.edges);
  const leaf = grouped.nodes.find(n => n.id === 'linked');
  assert.ok(!Object.hasOwn(leaf.data, 'kind'));
  assert.equal(leaf.data.label, 'カスタム名');
  assert.ok(leaf.parentId);
  const parent = grouped.nodes.find(n => n.id === leaf.parentId);
  assert.ok(parent.parentId);
  assert.ok(grouped.nodes.indexOf(parent) < grouped.nodes.indexOf(leaf));
  const repeated = groupByHeadings(grouped, headings);
  assert.deepEqual(repeated, grouped);
  const flat = ungroupFlow(grouped);
  assert.deepEqual(flat.nodes.find(n => n.id === 'linked').position, absolutePosition(leaf, grouped.nodes));
  assert.ok(flat.nodes.every(n => !n.parentId && !n.extent));
  const removed = removeFlowNode(grouped, parent.id);
  assert.ok(!removed.nodes.find(n => n.id === 'linked').parentId);
  assert.deepEqual(absolutePosition(removed.nodes.find(n => n.id === 'linked'), removed.nodes), absolutePosition(leaf, grouped.nodes));
  assert.deepEqual(removed.edges, grouped.edges);
});

test('grouped HTML uses absolute child coordinates and links to the heading after reorder', async () => {
  const { outline, newDocument } = await import('../src/model.mjs');
  const { groupByHeadings, absolutePosition } = await import('../src/flow-model.mjs');
  const { exportHtml } = await import('../src/export.mjs');
  const doc = newDocument('Test', '## 親\n\n### 子\n\n本文');
  doc.content = { type: 'doc', content: [heading('a', '親', 2), heading('b', '子', 3)] };
  doc.flow = groupByHeadings(doc.flow, outline(doc.content));
  const child = doc.flow.nodes.find(n => n.data.headingId === 'b');
  child.data.memo = 'PRIVATE_FLOW_MEMO';
  const position = absolutePosition(child, doc.flow.nodes);
  const html = exportHtml(doc);
  assert.ok(html.includes(`translate(${position.x},${position.y})`));
  assert.ok(html.includes('<a href="#section-1"><text'));
  assert.ok(html.includes('id="section-1"'));
  assert.ok(!html.includes('PRIVATE_FLOW_MEMO'));
});

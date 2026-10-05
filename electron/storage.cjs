const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const libraryName = 'trpg-canvas-library-v1.json';
const revision = text => createHash('sha256').update(text).digest('hex');
function characterCount(doc) {
  if (doc.content) {
    let text = '';
    (function visit(node) { if (typeof node?.text === 'string') text += node.text; for (const child of node?.content || []) visit(child); })(doc.content);
    return text.replace(/\s/g, '').length;
  }
  return doc.markdown
    .replace(/!\[[^\]]*\]\(\s*(?:<[^>]*>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+/gi, '')
    .replace(/[\s#*>`_\-]/g, '').length;
}
function filePath(folder, id) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw new Error('不正なシナリオIDです');
  return path.join(folder, `${id}.trpg.json`);
}
function libraryPath(folder) { return path.join(folder, libraryName); }
function validate(doc) {
  if (!doc || doc.version !== 1 || typeof doc.title !== 'string' || typeof doc.markdown !== 'string' || !doc.flow || !Array.isArray(doc.flow.nodes) || !Array.isArray(doc.flow.edges)) throw new Error('対応していないシナリオ形式です');
  if (doc.flow.nodes.some(n => !n || typeof n.id !== 'string' || !Number.isFinite(n.position?.x) || !Number.isFinite(n.position?.y) || typeof n.data?.label !== 'string') || doc.flow.edges.some(e => !e || typeof e.id !== 'string' || typeof e.source !== 'string' || typeof e.target !== 'string')) throw new Error('フローチャートのデータ形式が不正です');
  if (JSON.stringify(doc).length > 20_000_000) throw new Error('シナリオが大きすぎます（上限20MB）');
}
async function readLibrary(folder) {
  try {
    const value = JSON.parse(await fs.readFile(libraryPath(folder), 'utf8'));
    if (value.version !== 1 || !value.documents || typeof value.documents !== 'object') throw new Error('対応していない共有ライブラリ形式です');
    const library = { version: 1, updatedAt: value.updatedAt || '', documents: value.documents, deleted: value.deleted && typeof value.deleted === 'object' ? value.deleted : {}, trash: value.trash && typeof value.trash === 'object' ? value.trash : {} };
    for (const entry of Object.values(library.documents)) validate(entry?.doc);
    return library;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`共有ライブラリを読み込めません: ${error.message}`);
  }
}
async function writeAtomic(dest, text) {
  const temp = `${dest}.${randomUUID()}.tmp`;
  try { await fs.writeFile(temp, text, { flag: 'wx' }); await fs.rename(temp, dest); }
  finally { await fs.rm(temp, { force: true }).catch(() => {}); }
}
async function writeLibrary(folder, state) {
  const next = { version: 1, updatedAt: new Date().toISOString(), documents: state.documents, deleted: state.deleted || {}, trash: state.trash || {} };
  await writeAtomic(libraryPath(folder), JSON.stringify(next, null, 2));
  return next;
}
async function ensureLibrary(folder) {
  await fs.mkdir(folder, { recursive: true });
  const existing = await readLibrary(folder);
  if (existing) return { library: existing, errors: [], migrated: false };
  const library = { version: 1, updatedAt: '', documents: {}, deleted: {}, trash: {} }, errors = [];
  const names = await fs.readdir(folder);
  for (const name of names.filter(name => name.endsWith('.trpg.json'))) {
    const id = name.slice(0, -10);
    try {
      const text = await fs.readFile(filePath(folder, id), 'utf8'), doc = { ...JSON.parse(text), id };
      validate(doc); library.documents[id] = { doc, revision: revision(text) };
    } catch { errors.push(name); }
  }
  await writeLibrary(folder, library);
  return { library, errors, migrated: true };
}
async function read(folder, id) {
  const { library } = await ensureLibrary(folder), entry = library.documents[id];
  if (!entry) throw new Error('シナリオが見つかりません');
  validate(entry.doc); return entry;
}
async function list(folder) {
  const { library, errors } = await ensureLibrary(folder), documents = [];
  for (const [id, entry] of Object.entries(library.documents)) {
    try {
      validate(entry.doc);
      documents.push({ id, title: entry.doc.title, subtitle: entry.doc.subtitle || '', updatedAt: entry.doc.updatedAt, characterCount: characterCount(entry.doc), sceneCount: entry.doc.flow.nodes.length });
    } catch { errors.push(`${id}（共有ライブラリ内）`); }
  }
  return { documents: documents.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')), errors };
}
async function save(folder, doc, baseRevision) {
  validate(doc);
  const { library } = await ensureLibrary(folder);
  const current = library.documents[doc.id]?.revision || null;
  let conflict = current !== (baseRevision || null);
  if (conflict) {
    doc = { ...doc, id: randomUUID(), title: `${doc.title}（競合コピー）` };
  }
  const text = JSON.stringify(doc, null, 2);
  const saved = { doc, revision: revision(text), conflict };
  library.documents[doc.id] = { doc, revision: saved.revision };
  delete library.deleted[doc.id]; delete library.trash[doc.id];
  await writeLibrary(folder, library);
  return saved;
}
async function remove(folder, id, baseRevision) {
  const { library } = await ensureLibrary(folder), current = library.documents[id];
  if (!current) throw new Error('シナリオが見つかりません');
  if (!baseRevision || current.revision !== baseRevision) throw new Error('確認後にシナリオが変更されました。一覧を更新して、もう一度削除してください。');
  const deletedAt = new Date().toISOString();
  library.trash[id] = { ...current, deletedAt }; delete library.documents[id]; library.deleted[id] = deletedAt;
  await writeLibrary(folder, library);
}
async function listTrash(folder) {
  const { library } = await ensureLibrary(folder);
  return Object.entries(library.trash).map(([id, entry]) => ({ id, title: entry.doc?.title || '無題のシナリオ', deletedAt: entry.deletedAt || library.deleted[id] || '' })).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}
async function restore(folder, id) {
  const { library } = await ensureLibrary(folder), entry = library.trash[id];
  if (!entry) throw new Error('削除済みシナリオが見つかりません');
  const doc = { ...entry.doc, updatedAt: new Date().toISOString() }; validate(doc); const text = JSON.stringify(doc, null, 2);
  library.documents[id] = { doc, revision: revision(text) }; delete library.trash[id]; delete library.deleted[id];
  await writeLibrary(folder, library); return library.documents[id];
}
module.exports = { read, list, save, remove, listTrash, restore, validate, filePath, libraryPath, ensureLibrary };

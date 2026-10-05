const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const sharedLibraryName = 'trpg-canvas-library-v1.json';
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
function validate(doc) {
  if (!doc || doc.version !== 1 || typeof doc.title !== 'string' || typeof doc.markdown !== 'string' || !doc.flow || !Array.isArray(doc.flow.nodes) || !Array.isArray(doc.flow.edges)) throw new Error('対応していないシナリオ形式です');
  if (doc.flow.nodes.some(n => !n || typeof n.id !== 'string' || !Number.isFinite(n.position?.x) || !Number.isFinite(n.position?.y) || typeof n.data?.label !== 'string') || doc.flow.edges.some(e => !e || typeof e.id !== 'string' || typeof e.source !== 'string' || typeof e.target !== 'string')) throw new Error('フローチャートのデータ形式が不正です');
  if (JSON.stringify(doc).length > 20_000_000) throw new Error('シナリオが大きすぎます（上限20MB）');
}
async function writeAtomic(dest, text) {
  const temp = `${dest}.${randomUUID()}.tmp`;
  try { await fs.writeFile(temp, text, { flag: 'wx' }); await fs.rename(temp, dest); }
  finally { await fs.rm(temp, { force: true }).catch(() => {}); }
}
async function restoreSharedLibrary(folder) {
  const source = path.join(folder, sharedLibraryName);
  let library;
  try { library = JSON.parse(await fs.readFile(source, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw new Error(`旧共有ライブラリを読み込めません: ${error.message}`); }
  if (library?.version !== 1 || !library.documents || typeof library.documents !== 'object') throw new Error('旧共有ライブラリの形式に対応していません');
  const errors = [];
  for (const [id, entry] of Object.entries(library.documents)) {
    try {
      filePath(folder, id); validate(entry?.doc);
      const incoming = { ...entry.doc, id }, dest = filePath(folder, id);
      let existing = null;
      try { existing = JSON.parse(await fs.readFile(dest, 'utf8')); validate(existing); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (existing && (existing.updatedAt || '') >= (incoming.updatedAt || '')) continue;
      if (existing) {
        const backup = { ...existing, id: randomUUID(), title: `${existing.title}（単一ファイル移行前のバックアップ）` };
        await writeAtomic(filePath(folder, backup.id), JSON.stringify(backup, null, 2));
      }
      await writeAtomic(dest, JSON.stringify(incoming, null, 2));
    } catch { errors.push(`${id}（旧共有ライブラリ内）`); }
  }
  const deleted = new Set([...Object.keys(library.deleted || {}), ...Object.keys(library.trash || {})]);
  for (const id of deleted) {
    try {
      const sourceFile = filePath(folder, id), archived = `${sourceFile}.library-deleted`;
      await fs.rename(sourceFile, archived);
    } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'EEXIST') errors.push(`${id}（削除状態）`); }
  }
  if (errors.length) return errors;
  const archivedLibrary = path.join(folder, 'trpg-canvas-library-v1.archived.json');
  try { await fs.rename(source, archivedLibrary); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    await fs.rename(source, path.join(folder, `trpg-canvas-library-v1.archived-${Date.now()}.json`));
  }
  return [];
}
async function read(folder, id) {
  const text = await fs.readFile(filePath(folder, id), 'utf8');
  const doc = JSON.parse(text); validate(doc);
  return { doc: { ...doc, id }, revision: revision(text) };
}
async function list(folder) {
  await fs.mkdir(folder, { recursive: true });
  const migrationErrors = await restoreSharedLibrary(folder);
  const names = await fs.readdir(folder);
  const documents = [], errors = [...migrationErrors];
  for (const name of names.filter(n => n.endsWith('.trpg.json'))) {
    try {
      const result = await read(folder, name.slice(0, -10));
      documents.push({ id: result.doc.id, title: result.doc.title, subtitle: result.doc.subtitle || '', updatedAt: result.doc.updatedAt, characterCount: characterCount(result.doc), sceneCount: result.doc.flow.nodes.length });
    } catch { errors.push(name); }
  }
  return { documents: documents.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')), errors };
}
async function save(folder, doc, baseRevision) {
  validate(doc);
  let dest = filePath(folder, doc.id);
  await fs.mkdir(folder, { recursive: true });
  let current = null;
  try { current = revision(await fs.readFile(dest, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  let conflict = current !== (baseRevision || null);
  if (conflict) {
    doc = { ...doc, id: randomUUID(), title: `${doc.title}（競合コピー）` };
    dest = filePath(folder, doc.id);
  }
  const text = JSON.stringify(doc, null, 2);
  await writeAtomic(dest, text);
  return { doc, revision: revision(text), conflict };
}
async function remove(folder, id, baseRevision, trashItem) {
  const current = await read(folder, id);
  if (!baseRevision || current.revision !== baseRevision) throw new Error('確認後にシナリオが変更されました。一覧を更新して、もう一度削除してください。');
  await trashItem(filePath(folder, id));
}
module.exports = { read, list, save, remove, validate, filePath, restoreSharedLibrary };

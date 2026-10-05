import { newDocument, characterCount } from './model.mjs';
import { createGoogleDriveSync } from './google-drive.mjs';
const key = 'trpg-canvas-documents-v1';
const trashKey = 'trpg-canvas-trash-v1';
const read = () => JSON.parse(localStorage.getItem(key) || '{}');
const drive = !window.canvas ? createGoogleDriveSync({ clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '', apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '', appId: import.meta.env.VITE_GOOGLE_APP_ID || '' }) : null;
function download(title, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = title; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const isDesktop = !!window.canvas;
export const api = window.canvas || {
  info: async () => ({ folder: 'ブラウザ内に保存（デスクトップ版ではフォルダを選択できます）' }),
  list: async () => ({ documents: Object.values(read()).map(x => ({ id: x.doc.id, title: x.doc.title, subtitle: x.doc.subtitle || '', updatedAt: x.doc.updatedAt, characterCount: characterCount(x.doc), sceneCount: x.doc.flow.nodes.length })), errors: [] }),
  load: async id => { const result = read()[id]; if (!result) throw new Error('シナリオが見つかりません'); return result; },
  remove: async (id, revision) => {
    const data = read();
    if (!data[id]) throw new Error('シナリオが見つかりません');
    if (!revision || data[id].revision !== revision) throw new Error('確認後にシナリオが変更されました。一覧を更新して、もう一度削除してください。');
    const trash = JSON.parse(localStorage.getItem(trashKey) || '{}'), deletedAt = new Date().toISOString();
    trash[id] = { ...data[id], deletedAt }; delete data[id]; localStorage.setItem(key, JSON.stringify(data)); localStorage.setItem(trashKey, JSON.stringify(trash)); drive.markDeleted(id);
  },
  listTrash: async () => Object.entries(JSON.parse(localStorage.getItem(trashKey) || '{}')).map(([id, entry]) => ({ id, title: entry.doc?.title || '無題のシナリオ', deletedAt: entry.deletedAt || '' })).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)),
  restore: async id => {
    const trash = JSON.parse(localStorage.getItem(trashKey) || '{}'), entry = trash[id];
    if (!entry) throw new Error('削除済みシナリオが見つかりません');
    const data = read(), doc = { ...entry.doc, updatedAt: new Date().toISOString() }, result = { doc, revision: crypto.randomUUID() };
    data[id] = result; delete trash[id]; localStorage.setItem(key, JSON.stringify(data)); localStorage.setItem(trashKey, JSON.stringify(trash)); drive.markSaved(id); return result;
  },
  save: async (doc, revision) => {
    const data = read(); const conflict = (data[doc.id]?.revision || null) !== (revision || null);
    if (conflict) doc = { ...doc, id: newDocument().id, title: `${doc.title}（競合コピー）` };
    const result = { doc, revision: crypto.randomUUID(), conflict }; data[doc.id] = result;
    localStorage.setItem(key, JSON.stringify(data)); drive.markSaved(doc.id); return result;
  },
  export: async (format, title, content) => {
    if (format === 'pdf') { const win = window.open('', '_blank'); if (!win) throw new Error('印刷ウィンドウを開けませんでした'); win.document.write(content); win.document.close(); win.onload = () => win.print(); return '印刷画面'; }
    download(`${title}.${format}`, content, format === 'html' ? 'text/html;charset=utf-8' : format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/markdown;charset=utf-8'); return 'ダウンロード';
  },
  googleDriveStatus: async () => drive.status(),
  googleDriveConnect: async () => drive.connect(),
  googleDriveChooseFile: async () => drive.chooseFile(),
  googleDriveSync: async () => drive.sync(),
  googleDriveDisconnect: async () => drive.disconnect()
};

import { newDocument, characterCount } from './model.mjs';
const key = 'trpg-canvas-documents-v1';
const read = () => JSON.parse(localStorage.getItem(key) || '{}');
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
    delete data[id]; localStorage.setItem(key, JSON.stringify(data));
  },
  save: async (doc, revision) => {
    const data = read(); const conflict = (data[doc.id]?.revision || null) !== (revision || null);
    if (conflict) doc = { ...doc, id: newDocument().id, title: `${doc.title}（競合コピー）` };
    const result = { doc, revision: crypto.randomUUID(), conflict }; data[doc.id] = result;
    localStorage.setItem(key, JSON.stringify(data)); return result;
  },
  export: async (format, title, content) => {
    if (format === 'pdf') { const win = window.open('', '_blank'); if (!win) throw new Error('印刷ウィンドウを開けませんでした'); win.document.write(content); win.document.close(); win.onload = () => win.print(); return '印刷画面'; }
    download(`${title}.${format}`, content, format === 'html' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8'); return 'ダウンロード';
  }
};

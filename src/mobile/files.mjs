import { registerPlugin } from '@capacitor/core';
export const ScenarioFiles = registerPlugin('ScenarioFiles');

export function parseScenario(text) {
  if (text.length > 20_000_000) throw new Error('ファイルが大きすぎます（20MBまで）');
  const doc = JSON.parse(text);
  if (!doc || typeof doc.id !== 'string' || typeof doc.title !== 'string' || typeof doc.markdown !== 'string' || !Array.isArray(doc.flow?.nodes) || !Array.isArray(doc.flow?.edges)) throw new Error('TRPG Canvasのシナリオファイルを選んでください');
  return doc;
}

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('trpg-canvas-mobile', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function draftStore(action, value) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', action === 'list' ? 'readonly' : 'readwrite');
      const store = tx.objectStore('drafts');
      const request = action === 'list' ? store.getAll() : action === 'delete' ? store.delete(value) : store.put(value);
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('下書き保存が中断されました'));
    });
  } finally { db.close(); }
}

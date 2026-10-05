export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const DRIVE_FOLDER_NAME = 'TRPG Canvas';
export const DRIVE_FILE_NAME = 'trpg-canvas-library-v1.json';
export const DRIVE_MIME = 'application/json';

const deletedKey = 'trpg-canvas-deleted-v1';
const trashKey = 'trpg-canvas-trash-v1';
const lastSyncKey = 'trpg-google-drive-last-sync';
const authorizedKey = 'trpg-google-drive-authorized';
const fileIdKey = 'trpg-google-drive-file-id';
const fileNameKey = 'trpg-google-drive-file-name';
const time = value => Number.isFinite(Date.parse(value || '')) ? Date.parse(value) : 0;
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export function mergeDriveLibraries(local, remote) {
  const left = { documents: object(local?.documents), deleted: object(local?.deleted), trash: object(local?.trash) };
  const right = { documents: object(remote?.documents), deleted: object(remote?.deleted), trash: object(remote?.trash) };
  const documents = {}, deleted = {}, trash = {};
  const ids = new Set([...Object.keys(left.documents), ...Object.keys(right.documents), ...Object.keys(left.deleted), ...Object.keys(right.deleted)]);
  for (const id of ids) {
    const choices = [
      left.documents[id] && { kind: 'document', value: left.documents[id], at: time(left.documents[id]?.doc?.updatedAt) },
      right.documents[id] && { kind: 'document', value: right.documents[id], at: time(right.documents[id]?.doc?.updatedAt) },
      left.deleted[id] && { kind: 'deleted', value: left.deleted[id], at: time(left.deleted[id]) },
      right.deleted[id] && { kind: 'deleted', value: right.deleted[id], at: time(right.deleted[id]) }
    ].filter(Boolean).sort((a, b) => b.at - a.at || (a.kind === 'deleted' ? -1 : 1));
    const newest = choices[0];
    if (!newest) continue;
    if (newest.kind === 'deleted') {
      deleted[id] = newest.value;
      const deletedCopies = [left.trash[id], right.trash[id]].filter(Boolean).sort((a, b) => time(b.deletedAt) - time(a.deletedAt));
      if (deletedCopies[0]) trash[id] = deletedCopies[0];
    }
    else documents[id] = newest.value;
  }
  return { version: 1, updatedAt: new Date().toISOString(), documents, deleted, trash };
}

function loadScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity]');
    if (existing) { existing.addEventListener('load', resolve, { once: true }); existing.addEventListener('error', () => reject(new Error('Google認証を読み込めませんでした')), { once: true }); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; script.dataset.googleIdentity = 'true';
    script.onload = resolve; script.onerror = () => reject(new Error('Google認証を読み込めませんでした'));
    document.head.appendChild(script);
  });
}

function loadPickerScript() {
  if (window.gapi) return new Promise(resolve => window.gapi.load('picker', resolve));
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-picker]');
    if (existing) { existing.addEventListener('load', () => window.gapi.load('picker', resolve), { once: true }); existing.addEventListener('error', () => reject(new Error('Google Driveのファイル選択を読み込めませんでした')), { once: true }); return; }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js'; script.async = true; script.defer = true; script.dataset.googlePicker = 'true';
    script.onload = () => window.gapi.load('picker', resolve);
    script.onerror = () => reject(new Error('Google Driveのファイル選択を読み込めませんでした'));
    document.head.appendChild(script);
  });
}

export function createGoogleDriveSync({ clientId, apiKey = '', appId = '', storage = localStorage, fetcher = fetch }) {
  let accessToken = '', expiresAt = 0, folderId = '', fileId = '', timer = 0, syncing = null;
  const configured = Boolean(String(clientId || '').trim());
  const pickerConfigured = Boolean(String(apiKey || '').trim() && String(appId || '').trim());
  const readJson = (key, fallback = {}) => { try { return object(JSON.parse(storage.getItem(key) || '')); } catch { return fallback; } };
  const localState = () => ({ documents: readJson('trpg-canvas-documents-v1'), deleted: readJson(deletedKey), trash: readJson(trashKey) });
  const writeLocal = state => { storage.setItem('trpg-canvas-documents-v1', JSON.stringify(state.documents)); storage.setItem(deletedKey, JSON.stringify(state.deleted)); storage.setItem(trashKey, JSON.stringify(state.trash || {})); };
  const connected = () => Boolean(accessToken && Date.now() < expiresAt - 30000);
  const status = () => ({ configured, pickerConfigured, connected: connected(), linkedFile: fileId || storage.getItem(fileIdKey) || '', fileName: storage.getItem(fileNameKey) || '', lastSync: storage.getItem(lastSyncKey) || '', reconnectRequired: Boolean(accessToken && !connected()) });
  const request = async (url, options = {}) => {
    if (!connected()) throw new Error('Google Driveへ再接続してください');
    const response = await fetcher(url, { ...options, headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) } });
    if (response.status === 401) { accessToken = ''; expiresAt = 0; throw new Error('Google Driveの接続期限が切れました。再接続してください'); }
    if (!response.ok) { const detail = await response.text().catch(() => ''); throw new Error(`Google Driveとの通信に失敗しました（${response.status}）${detail ? `: ${detail.slice(0, 160)}` : ''}`); }
    return response;
  };
  const findFolder = async () => {
    const query = encodeURIComponent(`name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const fields = encodeURIComponent('files(id,name,modifiedTime)');
    const response = await request(`https://www.googleapis.com/drive/v3/files?spaces=drive&q=${query}&orderBy=modifiedTime%20desc&pageSize=10&fields=${fields}`);
    const result = await response.json(); folderId = result.files?.[0]?.id || '';
    return folderId;
  };
  const ensureFolder = async () => {
    if (folderId || await findFolder()) return folderId;
    const result = await (await request('https://www.googleapis.com/drive/v3/files?fields=id%2Cname', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
    })).json();
    folderId = result.id;
    return folderId;
  };
  const findFile = async () => {
    const parent = await ensureFolder();
    const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and '${parent}' in parents and trashed = false`);
    const fields = encodeURIComponent('files(id,name,modifiedTime)');
    const response = await request(`https://www.googleapis.com/drive/v3/files?spaces=drive&q=${query}&orderBy=modifiedTime%20desc&pageSize=10&fields=${fields}`);
    const result = await response.json(); fileId = result.files?.[0]?.id || '';
    if (fileId) { storage.setItem(fileIdKey, fileId); storage.setItem(fileNameKey, DRIVE_FILE_NAME); }
    return fileId;
  };
  const downloadRemote = async () => {
    if (!fileId && !await findFile()) return { documents: {}, deleted: {}, trash: {} };
    try {
      const value = object(await (await request(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`)).json());
      if (value.version !== 1 || !value.documents || typeof value.documents !== 'object') throw new Error('選択したファイルはTRPG Canvasの共有ライブラリではありません');
      return value;
    }
    catch (error) { if (/（404）/.test(error.message)) { fileId = ''; storage.removeItem?.(fileIdKey); storage.removeItem?.(fileNameKey); return { documents: {}, deleted: {}, trash: {} }; } throw error; }
  };
  const upload = async state => {
    const content = JSON.stringify(state);
    if (fileId) {
      await request(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id%2CmodifiedTime`, { method: 'PATCH', headers: { 'Content-Type': DRIVE_MIME }, body: content });
      return;
    }
    const boundary = `trpg_canvas_${crypto.randomUUID().replaceAll('-', '')}`;
    const metadata = JSON.stringify({ name: DRIVE_FILE_NAME, mimeType: DRIVE_MIME, parents: [await ensureFolder()] });
    const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${DRIVE_MIME}\r\n\r\n${content}\r\n--${boundary}--`]);
    const result = await (await request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id%2CmodifiedTime', { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body })).json();
    fileId = result.id; storage.setItem(fileIdKey, fileId); storage.setItem(fileNameKey, DRIVE_FILE_NAME);
  };
  const sync = async () => {
    if (syncing) return syncing;
    syncing = (async () => {
      const local = localState(), remote = await downloadRemote(), merged = mergeDriveLibraries(local, remote);
      writeLocal(merged);
      if (!same({ documents: remote.documents || {}, deleted: remote.deleted || {}, trash: remote.trash || {} }, { documents: merged.documents, deleted: merged.deleted, trash: merged.trash })) await upload(merged);
      const completedAt = new Date().toISOString(); storage.setItem(lastSyncKey, completedAt);
      return { ...status(), documentCount: Object.keys(merged.documents).length, changedLocal: !same(local.documents, merged.documents) || !same(local.deleted, merged.deleted) };
    })().finally(() => { syncing = null; });
    return syncing;
  };
  const connect = async () => {
    if (!configured) throw new Error('Google OAuthクライアントIDが設定されていません');
    await loadScript();
    const response = await new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId, scope: DRIVE_SCOPE,
        callback: token => token.error ? reject(new Error(token.error_description || token.error)) : resolve(token),
        error_callback: detail => reject(new Error(detail?.message || 'Google Driveへの接続をキャンセルしました'))
      });
      client.requestAccessToken({ prompt: storage.getItem(authorizedKey) ? '' : 'consent' });
    });
    accessToken = response.access_token; expiresAt = Date.now() + Number(response.expires_in || 3600) * 1000; storage.setItem(authorizedKey, 'true');
    fileId = storage.getItem(fileIdKey) || '';
    return status();
  };
  const chooseFile = async () => {
    if (!connected()) throw new Error('先にGoogleへログインしてください');
    if (!pickerConfigured) throw new Error('Google Driveのファイル選択が設定されていません');
    await loadPickerScript();
    const picked = await new Promise((resolve, reject) => {
      const view = new window.google.picker.DocsView().setIncludeFolders(true).setSelectFolderEnabled(false).setQuery(DRIVE_FILE_NAME);
      const picker = new window.google.picker.PickerBuilder().addView(view).setOAuthToken(accessToken).setDeveloperKey(apiKey).setAppId(appId)
        .setTitle('TRPG Canvasの共有ライブラリを選択')
        .setCallback(data => {
          if (data.action === window.google.picker.Action.PICKED) resolve(data.docs?.[0]);
          else if (data.action === window.google.picker.Action.CANCEL) resolve(null);
          else if (data.action === window.google.picker.Action.ERROR) reject(new Error('Google Driveのファイル選択に失敗しました'));
        }).build();
      picker.setVisible(true);
    });
    if (!picked) return status();
    if (picked.name !== DRIVE_FILE_NAME) throw new Error(`${DRIVE_FILE_NAME}を選択してください`);
    fileId = picked.id; folderId = '';
    storage.setItem(fileIdKey, fileId); storage.setItem(fileNameKey, picked.name || DRIVE_FILE_NAME);
    return status();
  };
  const disconnect = () => {
    if (timer) clearTimeout(timer); timer = 0;
    if (accessToken && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(accessToken, () => {});
    accessToken = ''; expiresAt = 0; folderId = ''; fileId = '';
    return status();
  };
  const schedule = () => {
    if (!connected()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = 0; sync().catch(error => console.warn('Google Drive sync:', error)); }, 5000);
  };
  const markDeleted = id => { const deleted = readJson(deletedKey); deleted[id] = new Date().toISOString(); storage.setItem(deletedKey, JSON.stringify(deleted)); schedule(); };
  const markSaved = id => { const deleted = readJson(deletedKey); if (deleted[id]) { delete deleted[id]; storage.setItem(deletedKey, JSON.stringify(deleted)); } schedule(); };
  return { status, connect, chooseFile, disconnect, sync, schedule, markDeleted, markSaved };
}

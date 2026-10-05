const test = require('node:test');
const assert = require('node:assert/strict');

const entry = (id, title, updatedAt) => ({ revision: `${id}-${title}`, doc: { id, title, updatedAt, subtitle: '', flow: { nodes: [], edges: [] } } });

test('Google Drive merge keeps the newest document and propagates deletions', async () => {
  const { mergeDriveLibraries } = await import('../src/google-drive.mjs');
  const local = { documents: {
    local: entry('local', 'ローカル更新', '2026-10-05T01:00:00Z'),
    remote: entry('remote', '古いローカル', '2026-10-05T01:00:00Z'),
    deleted: entry('deleted', '削除前', '2026-10-05T01:00:00Z')
  }, deleted: {} };
  const remote = { documents: {
    local: entry('local', '古いDrive', '2026-10-04T01:00:00Z'),
    remote: entry('remote', 'Drive更新', '2026-10-06T01:00:00Z')
  }, deleted: { deleted: '2026-10-07T01:00:00Z' } };
  const merged = mergeDriveLibraries(local, remote);
  assert.equal(merged.documents.local.doc.title, 'ローカル更新');
  assert.equal(merged.documents.remote.doc.title, 'Drive更新');
  assert.equal(merged.documents.deleted, undefined);
  assert.equal(merged.deleted.deleted, '2026-10-07T01:00:00Z');
});

test('browser Drive client authorizes, creates appData file and records sync time', async () => {
  const { createGoogleDriveSync, DRIVE_SCOPE } = await import('../src/google-drive.mjs');
  const values = new Map([['trpg-canvas-documents-v1', JSON.stringify({ one: entry('one', '同期テスト', '2026-10-05T01:00:00Z') })]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const requests = [];
  const fetcher = async (url, options = {}) => {
    requests.push({ url, options });
    if (url.includes('/drive/v3/files?')) return new Response(JSON.stringify({ files: [] }), { status: 200 });
    if (url.includes('/upload/drive/v3/files?')) return new Response(JSON.stringify({ id: 'drive-file-1', modifiedTime: '2026-10-05T01:01:00Z' }), { status: 200 });
    throw new Error(`Unexpected request: ${url}`);
  };
  global.window = { google: { accounts: { oauth2: {
    initTokenClient: options => ({ requestAccessToken: () => options.callback({ access_token: 'token', expires_in: 3600 }) }),
    revoke: (_token, done) => done()
  } } } };
  const drive = createGoogleDriveSync({ clientId: 'test.apps.googleusercontent.com', storage, fetcher });
  await drive.connect();
  const result = await drive.sync();
  assert.equal(result.connected, true);
  assert.equal(result.documentCount, 1);
  assert.ok(result.lastSync);
  assert.ok(requests.some(request => request.url.includes('spaces=appDataFolder')));
  assert.ok(requests.some(request => request.options.method === 'POST'));
  assert.equal(DRIVE_SCOPE, 'https://www.googleapis.com/auth/drive.appdata');
  delete global.window;
});

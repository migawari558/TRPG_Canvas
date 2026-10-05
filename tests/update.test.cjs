const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { isNewerVersion, selectAsset, checkForUpdate, downloadUpdate } = require('../electron/update.cjs');

const assets = [
  { name: 'TRPG-Canvas-0.12.24-windows-x64-portable.exe', browser_download_url: 'https://github.com/example/portable', size: 8 },
  { name: 'TRPG-Canvas-0.12.24-windows-x64-setup.exe', browser_download_url: 'https://github.com/example/setup', size: 8 },
  { name: 'TRPG-Canvas-0.12.24-mac-arm64.dmg', browser_download_url: 'https://github.com/example/arm', size: 8 },
  { name: 'TRPG-Canvas-0.12.24-mac-x64.dmg', browser_download_url: 'https://github.com/example/x64', size: 8 }
];

test('update check compares semantic versions and selects the correct platform package', async () => {
  assert.equal(isNewerVersion('v0.12.24', '0.12.23'), true);
  assert.equal(isNewerVersion('0.12.23', '0.12.23'), false);
  assert.equal(selectAsset(assets, 'win32', 'x64').name.endsWith('-setup.exe'), true);
  assert.equal(selectAsset(assets, 'darwin', 'arm64').name.endsWith('-arm64.dmg'), true);
  const net = { fetch: async () => new Response(JSON.stringify({ tag_name: 'v0.12.24', name: 'Update', body: '変更内容', html_url: 'https://github.com/example/release', assets }), { status: 200 }) };
  const result = await checkForUpdate({ net, currentVersion: '0.12.23', platform: 'win32', arch: 'x64' });
  assert.equal(result.available, true); assert.equal(result.latestVersion, '0.12.24'); assert.ok(result.asset.name.endsWith('-setup.exe'));
});

test('update download writes the selected release asset and reports progress', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-update-')), progress = [];
  try {
    const net = { fetch: async () => new Response(new Uint8Array([1, 2, 3, 4]), { headers: { 'content-length': '4' } }) };
    const file = await downloadUpdate({ net, downloadsFolder: folder, asset: { name: 'TRPG-Canvas-0.12.24-windows-x64-setup.exe', url: 'https://github.com/example/setup', size: 4 }, onProgress: value => progress.push(value) });
    assert.deepEqual([...await fs.readFile(file)], [1, 2, 3, 4]); assert.equal(progress.at(-1).percent, 100);
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
});

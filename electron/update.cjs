const fs = require('node:fs/promises');
const path = require('node:path');

const releasesApi = 'https://api.github.com/repos/migawari558/TRPG_Canvas/releases/latest';

function versionParts(value) {
  const match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}

function isNewerVersion(candidate, current) {
  const next = versionParts(candidate), installed = versionParts(current);
  if (!next || !installed) return false;
  for (let index = 0; index < 3; index++) {
    if (next[index] !== installed[index]) return next[index] > installed[index];
  }
  return false;
}

function selectAsset(assets, platform, arch) {
  const values = Array.isArray(assets) ? assets : [];
  const names = values.map(asset => ({ ...asset, lower: String(asset.name || '').toLowerCase() }));
  if (platform === 'win32') {
    const matching = names.filter(asset => asset.lower.endsWith('.exe') && asset.lower.includes('windows') && asset.lower.includes(arch));
    return matching.find(asset => asset.lower.includes('setup')) || matching.find(asset => asset.lower.includes('portable')) || matching[0] || null;
  }
  if (platform === 'darwin') {
    const matching = names.filter(asset => asset.lower.includes('mac') && asset.lower.includes(arch));
    return matching.find(asset => asset.lower.endsWith('.dmg')) || matching.find(asset => asset.lower.endsWith('.zip')) || null;
  }
  return null;
}

async function checkForUpdate({ net, currentVersion, platform = process.platform, arch = process.arch }) {
  const response = await net.fetch(releasesApi, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': `TRPG-Canvas/${currentVersion}` } });
  if (!response.ok) throw new Error(`GitHub Releasesを確認できませんでした（${response.status}）`);
  const release = await response.json(), latestVersion = String(release.tag_name || '').replace(/^v/, '');
  const available = isNewerVersion(latestVersion, currentVersion);
  const asset = available ? selectAsset(release.assets, platform, arch) : null;
  return {
    available,
    currentVersion,
    latestVersion: latestVersion || currentVersion,
    releaseName: release.name || release.tag_name || '',
    notes: String(release.body || '').slice(0, 4000),
    pageUrl: release.html_url,
    asset: asset ? { name: asset.name, url: asset.browser_download_url, size: asset.size || 0 } : null
  };
}

async function availablePath(folder, fileName) {
  const parsed = path.parse(path.basename(fileName));
  for (let index = 0; index < 100; index++) {
    const candidate = path.join(folder, `${parsed.name}${index ? ` (${index})` : ''}${parsed.ext}`);
    try { await fs.access(candidate); } catch (error) { if (error.code === 'ENOENT') return candidate; throw error; }
  }
  throw new Error('ダウンロード先のファイル名を決められませんでした');
}

async function downloadUpdate({ net, downloadsFolder, asset, onProgress = () => {} }) {
  if (!asset?.url || !/^https:\/\/github\.com\//.test(asset.url)) throw new Error('更新ファイルのURLが不正です');
  const response = await net.fetch(asset.url, { redirect: 'follow', headers: { 'User-Agent': 'TRPG-Canvas-Updater' } });
  if (!response.ok || !response.body) throw new Error(`更新ファイルを取得できませんでした（${response.status}）`);
  const destination = await availablePath(downloadsFolder, asset.name), file = await fs.open(destination, 'wx');
  const total = Number(response.headers.get('content-length')) || Number(asset.size) || 0;
  let received = 0;
  try {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await file.write(value); received += value.byteLength;
      onProgress({ received, total, percent: total ? Math.min(100, Math.round(received / total * 100)) : null });
    }
  } catch (error) {
    await file.close(); await fs.rm(destination, { force: true }); throw error;
  }
  await file.close();
  return destination;
}

module.exports = { releasesApi, versionParts, isNewerVersion, selectAsset, checkForUpdate, downloadUpdate };

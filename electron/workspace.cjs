const fs = require('node:fs/promises');
const path = require('node:path');

async function prepareFolder(folder) {
  if (typeof folder !== 'string' || !path.isAbsolute(folder) || (process.platform === 'win32' && !/^(?:[a-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/i.test(folder))) {
    throw new Error('保存先が有効な絶対パスではありません。');
  }
  await fs.mkdir(folder, { recursive: true });
  await fs.access(folder, require('node:fs').constants.W_OK);
  if (!(await fs.stat(folder)).isDirectory()) throw new Error('保存先がフォルダではありません。');
}

async function saveSettings(configFile, folder) {
  await fs.mkdir(path.dirname(configFile), { recursive: true });
  await fs.writeFile(configFile, JSON.stringify({ folder }), 'utf8');
}

async function resolveWorkspace(app, dialog) {
  const configFile = path.join(app.getPath('userData'), 'settings.json');
  let folder;
  try { folder = JSON.parse(await fs.readFile(configFile, 'utf8')).folder; } catch {}
  let error;
  try {
    folder ||= path.join(app.getPath('documents'), 'TRPG Canvas');
    await prepareFolder(folder);
    return { folder, configFile };
  } catch (failure) { error = failure; }
  // A disconnected drive or redirected Documents folder must not prevent recovery.
  for (;;) {
    const choice = await dialog.showMessageBox({ type: 'warning', title: '保存先を確認してください',
      message: 'シナリオの保存先を利用できません。別のフォルダを選択すると起動できます。',
      detail: `保存先: ${typeof folder === 'string' ? folder : '未設定'}\n\n${error.message}\n\n既存のシナリオは移動・削除しません。同期ドライブを利用していた場合は、接続を確認してそのフォルダを選択してください。`,
      buttons: ['保存先を選ぶ', '終了'], defaultId: 0, cancelId: 1 });
    if (choice.response !== 0) return null;
    const result = await dialog.showOpenDialog({ title: 'シナリオを保存するフォルダを選択', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths[0]) return null;
    folder = result.filePaths[0];
    try { await prepareFolder(folder); await saveSettings(configFile, folder); return { folder, configFile }; }
    catch (failure) { error = failure; }
  }
}
module.exports = { prepareFolder, saveSettings, resolveWorkspace };

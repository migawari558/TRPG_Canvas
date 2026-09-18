const { spawnSync } = require('node:child_process');

function buildOptions(sourceEnv = process.env, hostArch = process.arch) {
  const env = { ...sourceEnv };
  // Missing GitHub secrets are empty strings. electron-builder interprets
  // an empty CSC_LINK as the working directory, rather than no certificate.
  for (const key of ['CSC_LINK', 'CSC_KEY_PASSWORD', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']) {
    if (!env[key]) delete env[key];
  }
  const arch = env.RELEASE_ARCH || hostArch;
  if (!['arm64', 'x64'].includes(arch)) throw Error('Unsupported architecture');
  const signed = !!env.CSC_LINK;
  if (signed && !['CSC_KEY_PASSWORD', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'].every(key => env[key])) {
    throw Error('署名用証明書を設定した場合は、証明書パスワードとApple公証用のSecretsも設定してください。');
  }
  const args = [require.resolve('electron-builder/cli.js'), '--mac', 'dmg', 'zip', `--${arch}`, '--publish', 'never'];
  if (!signed) {
    args.push('-c.mac.identity=-', '-c.mac.hardenedRuntime=false');
    env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
  }
  return { args, env, signed };
}

if (require.main === module) {
  if (process.platform !== 'darwin') throw Error('Mac版はmacOS上でビルドしてください。GitHub Actionsが利用できます。');
  const { args, env, signed } = buildOptions();
  if (!signed) console.log('Building a trial app with ad-hoc signing; Apple notarization is not configured.');
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

module.exports = { buildOptions };

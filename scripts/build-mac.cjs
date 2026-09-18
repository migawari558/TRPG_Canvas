const {spawnSync}=require('node:child_process');
if(process.platform!=='darwin')throw Error('Mac版はmacOS上でビルドしてください。GitHub Actionsが利用できます。');
const arch=process.env.RELEASE_ARCH||process.arch;
if(!['arm64','x64'].includes(arch))throw Error('Unsupported architecture');
const signed=!!process.env.CSC_LINK;
if(signed&& !['CSC_KEY_PASSWORD','APPLE_ID','APPLE_APP_SPECIFIC_PASSWORD','APPLE_TEAM_ID'].every(key=>process.env[key]))throw Error('署名用証明書を設定した場合は、証明書パスワードとApple公証用のSecretsも設定してください。');
const args=[require.resolve('electron-builder/cli.js'),'--mac','dmg','zip',`--${arch}`,'--publish','never'];
if(!signed){args.push('-c.mac.identity=-','-c.mac.hardenedRuntime=false');console.log('Building a trial app with ad-hoc signing; Apple notarization is not configured.');}
const result=spawnSync(process.execPath,args,{stdio:'inherit',env:{...process.env,...(!signed?{CSC_IDENTITY_AUTO_DISCOVERY:'false'}:{})}});
if(result.error)throw result.error;process.exit(result.status??1);

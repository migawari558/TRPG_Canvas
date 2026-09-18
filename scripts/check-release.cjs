const {version}=require('../package.json');
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Release version must be X.Y.Z');
if(process.env.GITHUB_REF_TYPE==='tag'&&process.env.GITHUB_REF_NAME!==`v${version}`)throw Error(`Tag must match v${version}`);
console.log(`Release version: ${version}`);

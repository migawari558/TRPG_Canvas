const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('release workflow builds Windows and both Mac architectures and only drafts releases',()=>{
 const yaml=require('js-yaml'),workflow=yaml.load(fs.readFileSync('.github/workflows/release.yml','utf8'));
 assert.deepEqual(workflow.jobs.build.strategy.matrix.include.map(row=>[row.platform,row.arch]),[['windows','x64'],['mac','arm64'],['mac','x64']]);
 assert.equal(workflow.permissions.contents,'read');assert.equal(workflow.jobs.release.permissions.contents,'write');assert.equal(workflow.jobs.release.needs,'build');
 const release=workflow.jobs.release.steps.find(step=>step.name==='Create draft release').run;assert.ok(release.includes('--draft'));assert.ok(release.includes('already published'));
 const pkg=require('../package.json');assert.ok(pkg.build.mac.target.includes('dmg'));assert.ok(pkg.build.mac.target.includes('zip'));assert.ok(pkg.build.mac.artifactName.includes('${arch}'));
});
test('release tag validation rejects mismatches and Mac icon has complete PNG representations',()=>{
 const run=tag=>spawnSync(process.execPath,['scripts/check-release.cjs'],{env:{...process.env,GITHUB_REF_TYPE:'tag',GITHUB_REF_NAME:tag},encoding:'utf8'});
 assert.equal(run('v'+require('../package.json').version).status,0);assert.notEqual(run('v0.0.0').status,0);
 const icon=fs.readFileSync('assets/icon.icns');assert.equal(icon.subarray(0,4).toString(),'icns');assert.equal(icon.readUInt32BE(4),icon.length);let pos=8;const types=[];while(pos<icon.length){types.push(icon.subarray(pos,pos+4).toString());const length=icon.readUInt32BE(pos+4);assert.ok(length>8);assert.equal(icon.subarray(pos+8,pos+16).toString('hex'),'89504e470d0a1a0a');pos+=length}assert.equal(pos,icon.length);assert.deepEqual(types,['ic07','ic08','ic09','ic10']);
});

// In-process document provider for exercising the actual Android UI path.
const doc={id:'sync-document',version:1,title:'同期元',markdown:'# 導入\n\n元の本文',updatedAt:new Date().toISOString(),flow:{nodes:[],edges:[]}};
window.androidBridge={};
window.mockProvider={doc,hash:'initial',writes:0,offline:false};
window.Capacitor={PluginHeaders:[{name:'ScenarioFiles',methods:['setSystemBars','open','readFile','write'].map(name=>({name,rtype:'promise'}))}],nativePromise:async(_plugin,method,options)=>{
 const remote=window.mockProvider;
 if(method==='setSystemBars')return {};
 if(remote.offline)throw new Error('offline');
 if(method==='open'||method==='readFile')return {uri:'content://test/document',name:'sync-document.trpg.json',hash:remote.hash,text:JSON.stringify(remote.doc)};
 if(method==='write'){
  if(options.hash!==remote.hash)throw Object.assign(new Error('changed'),{code:'CONFLICT'});
  remote.doc=JSON.parse(options.text);remote.hash=`write-${++remote.writes}`;
  return {uri:'content://test/document',hash:remote.hash,verified:true};
 }
 throw new Error(`unexpected method ${method}`);
}};

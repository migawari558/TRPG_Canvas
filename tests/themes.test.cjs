const test=require('node:test');
const assert=require('node:assert/strict');
test('all themes apply to standalone exports; invalid preferences cannot inject CSS',async()=>{
 const {themes,normalizeAppearance,normalizeDesign,resolvedFonts}=await import('../src/themes.mjs');
 const {exportHtml}=await import('../src/export.mjs');const {sampleDocument}=await import('../src/model.mjs');
 for(const theme of themes){const html=exportHtml(sampleDocument(),{theme:theme.id,fontSize:23,interactive:false});assert.ok(html.includes(`background:${theme.colors.paper}`));assert.ok(html.includes(`fill="${theme.colors.text}"`));assert.ok(html.includes('font-size:23px'));assert.ok(!html.includes('<script>'));}
 const fontDefaults={fontAdvanced:false,headingFontFamily:'system',chapterFontFamily:'system',dialogueFontFamily:'body'};
 assert.deepEqual(normalizeAppearance({theme:'</style><script>',fontSize:999,uiScale:-1,fontFamily:'</style>'}),{theme:'forest',fontSize:28,fontFamily:'system',uiScale:90,...fontDefaults});
 assert.deepEqual(normalizeAppearance(null),{theme:'forest',fontSize:17,fontFamily:'system',uiScale:100,...fontDefaults});
 assert.equal(normalizeDesign({fontSize:5}).fontSize,7);
 assert.equal(normalizeAppearance({fontSize:5}).fontSize,12);
 assert.ok(exportHtml(sampleDocument(),{fontSize:7}).includes('font-size:7px'));
 assert.ok(exportHtml(sampleDocument(),{theme:'tahoe-light',fontFamily:'BIZ UDPGothic'}).includes('font-family:"BIZ UDPGothic"'));
 assert.equal(normalizeDesign({fontFamily:'Bad;font'}).fontFamily,'system');
 const detailed={theme:'forest',fontFamily:'Meiryo',fontAdvanced:true,headingFontFamily:'Yu Gothic',chapterFontFamily:'BIZ UDPMincho',dialogueFontFamily:'body'};
 assert.match(resolvedFonts(detailed).heading,/Yu Gothic/);
 assert.match(resolvedFonts(detailed).chapter,/BIZ UDPMincho/);
 assert.match(resolvedFonts(detailed).dialogue,/Meiryo/);
 const detailedHtml=exportHtml(sampleDocument(),detailed);
 assert.ok(detailedHtml.includes('.scenario-body .chapter-heading{font-family:"BIZ UDPMincho"'));
 assert.ok(detailedHtml.includes('.dialogue-speaker{font-family:"Meiryo"'));
});

test('custom themes persist three safe colors and keep readable text in HTML exports',async()=>{
 const {loadCustomThemes,saveCustomTheme,removeCustomTheme,getTheme,previewCustomTheme}=await import('../src/themes.mjs');
 const {exportHtml}=await import('../src/export.mjs');const {sampleDocument}=await import('../src/model.mjs');
 const stored=new Map(), storage={getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)};
 loadCustomThemes(storage);
 const saved=saveCustomTheme({name:'夜明け',baseId:'forest',background:'#fff8e4',accent:'#facf98',heading:'#faf0dd'},storage);
 assert.ok(saved.id.startsWith('custom-'));
 assert.equal(saved.colors.paper,'#fff8e4');
 const contrast=(a,b)=>{const brightness=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);const [light,dark]=[brightness(a),brightness(b)].sort((x,y)=>y-x);return(light+.05)/(dark+.05)};
 for(const color of [saved.colors.text,saved.colors.heading,saved.colors.accent]) assert.ok(contrast(color,saved.colors.paper)>=4.45,color);
 assert.ok(exportHtml(sampleDocument(),{theme:saved.id}).includes('background:#fff8e4'));
 loadCustomThemes(storage);assert.equal(getTheme(saved.id).name,'夜明け');
 const edited=saveCustomTheme({...saved,heading:'#3a4f80'},storage);assert.equal(edited.id,saved.id);assert.equal(edited.heading,'#3a4f80');
 assert.throws(()=>saveCustomTheme({...saved,name:'bad',accent:'red'},storage),/不正/);
 assert.throws(()=>previewCustomTheme({...saved,background:'</style>'}),/不正/);
 removeCustomTheme(saved.id,storage);assert.equal(getTheme(saved.id).id,'forest');
 loadCustomThemes(storage);
});

const test=require('node:test');
const assert=require('node:assert/strict');
test('all themes apply to standalone exports; invalid preferences cannot inject CSS',async()=>{
 const {themes,normalizeAppearance,normalizeDesign}=await import('../src/themes.mjs');
 const {exportHtml}=await import('../src/export.mjs');const {sampleDocument}=await import('../src/model.mjs');
 for(const theme of themes){const html=exportHtml(sampleDocument(),{theme:theme.id,fontSize:23,interactive:false});assert.ok(html.includes(`background:${theme.colors.paper}`));assert.ok(html.includes(`fill="${theme.colors.text}"`));assert.ok(html.includes('font-size:23px'));assert.ok(!html.includes('<script>'));}
 assert.deepEqual(normalizeAppearance({theme:'</style><script>',fontSize:999,uiScale:-1}),{theme:'forest',fontSize:28,uiScale:90});
 assert.deepEqual(normalizeAppearance(null),{theme:'forest',fontSize:17,uiScale:100});
 assert.equal(normalizeDesign({fontSize:5}).fontSize,7);
 assert.equal(normalizeAppearance({fontSize:5}).fontSize,12);
 assert.ok(exportHtml(sampleDocument(),{fontSize:7}).includes('font-size:7px'));
});

const test=require('node:test'),assert=require('node:assert/strict');

test('image widths are constrained and rendered safely in Markdown and exports',async()=>{
 const {normalizeImageWidth,imageSizePlugin}=await import('../src/image-size.mjs');
 const {contentHtml}=await import('../src/content-html.mjs');
 const MarkdownIt=(await import('markdown-it')).default,md=new MarkdownIt({html:false}).use(imageSizePlugin);
 assert.equal(normalizeImageWidth(50),50);assert.equal(normalizeImageWidth('75'),75);assert.equal(normalizeImageWidth(63),100);assert.equal(normalizeImageWidth('100;display:none'),100);
 const src='data:image/png;base64,AAAA',rendered=md.render(`![map](${src} "width=50")`);
 assert.match(rendered,/data-image-width="50"/);assert.match(rendered,/style="width:50%"/);assert.ok(!rendered.includes('title='));
 const html=contentHtml({type:'doc',content:[{type:'image',attrs:{src,alt:'map',width:75}},{type:'image',attrs:{src,alt:'safe',width:'10;position:fixed'}}]});
 assert.match(html,/data-image-width="75" style="width:75%"/);assert.match(html,/data-image-width="100" style="width:100%"/);assert.ok(!html.includes('position'));
});

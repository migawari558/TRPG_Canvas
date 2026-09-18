const {app}=require('electron'),fs=require('node:fs/promises'),path=require('node:path');
const out=path.resolve('.test-output/pdf-writer');app.setPath('userData',path.join(out,'profile'));app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{try{
 const {renderPdf}=require('../electron/pdf.cjs'),{exportHtml}=await import('../src/export.mjs');await fs.mkdir(out,{recursive:true});
 const t=(text,marks)=>({type:'text',text,marks}),p=(...content)=>({type:'paragraph',content}),h=(text,level)=>({type:'heading',attrs:{level},content:[t(text)]});
 const content={type:'doc',content:[p(),p(),h('CHAPTER_A',0),p(),h('HEADING_A',1),p(t('ITALIC_A',[{type:'italic'}]),{type:'hardBreak'},{type:'hardBreak'},t('UPRIGHT_B')),p(),p(),p(t('AFTER_BLANKS')),h('CHAPTER_B',0),p(),h('HEADING_B',1),p(t('BODY_B')), ...Array.from({length:22},(_,i)=>p(t('FILL_'+i))),p(),p(),p(),p(),p(),p(t('COLUMN_START')),p(t('END_ALL'))]};
 const doc={title:'執筆・空行テスト',content,markdown:'',flow:{nodes:[],edges:[]}};
 await fs.writeFile(path.join(out,'writer.pdf'),await renderPdf(exportHtml(doc,{columns:2,fontSize:15,theme:'midnight',copyButtons:false})));
 console.log('PASS: generated consecutive headings, italic breaks, blank lines and full-page background fixture');app.exit(0);
}catch(e){console.error(e);app.exit(1)}});

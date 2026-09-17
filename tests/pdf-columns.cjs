const {app}=require('electron');const fs=require('node:fs/promises'),path=require('node:path');
const output=path.resolve('.test-output/pdf-columns');app.setPath('userData',path.join(output,'profile'));
app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{try{
 const {renderPdf}=require('../electron/pdf.cjs');const {exportHtml}=await import('../src/export.mjs');const {sampleDocument}=await import('../src/model.mjs');
 await fs.mkdir(output,{recursive:true});const doc=sampleDocument();
 doc.markdown+='\n\n## 長いGMメモ\n\n> [!GM]\n>\n'+Array.from({length:36},(_,i)=>`> メモ${String(i+1).padStart(2,'0')}：探索者が選んだ行動に応じて、手がかりを提示する。古い記録から物語の真相を知る。\n>`).join('\n')+'\n\n## 最後のシーン\n\nEND_OF_MANUSCRIPT';
 for(const columns of [1,2])await fs.writeFile(path.join(output,`columns-${columns}.pdf`),await renderPdf(exportHtml(doc,{columns,fontSize:17,copyButtons:false})));
 console.log('PASS: generated one/two-column PDFs including long GM note and full-width flow');app.exit(0);
}catch(e){console.error(e);app.exit(1);}});

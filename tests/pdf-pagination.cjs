const {app}=require('electron'),fs=require('node:fs/promises'),path=require('node:path');
const output=path.resolve('.test-output/pdf-pagination');app.setPath('userData',path.join(output,'profile'));app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{try{
 const {renderPdf}=require('../electron/pdf.cjs'),{exportHtml}=await import('../src/export.mjs');await fs.mkdir(output,{recursive:true});
 const make=markdown=>({title:'段組みの確認',markdown,flow:{nodes:[],edges:[]}});
 const headings=make('序文です。\n\n# FIRST_HEADING\n\n最初の見出しは序文に続きます。\n\n## H2_STAYS\n\n同じ段の本文です。\n\n# SECOND_HEADING\n\n次の段から始まります。\n\n#! CHAPTER_C\n\n章も次の段から始まります。\n\n# FOURTH_HEADING\n\nEND_HEADINGS');
 for(const columns of [1,2])await fs.writeFile(path.join(output,`headings-${columns}.pdf`),await renderPdf(exportHtml(headings,{columns,fontSize:15,copyButtons:false})));
 for(const kind of ['GM','QUOTE']){
 const filler=Array.from({length:18},(_,i)=>`FILLER_${i} 本文の一行です。`).join('\n\n');
 const note=(kind==='GM'?'> [!GM]\n>\n':'')+Array.from({length:6},(_,i)=>`> ${kind}_${i} この枠は一段に収まる長さです。\n>`).join('\n');
 const long=(kind==='GM'?'> [!GM]\n>\n':'')+Array.from({length:36},(_,i)=>`> LONG_${kind}_${String(i).padStart(2,'0')} 長い情報は段をまたいで続きます。\n>`).join('\n');
 await fs.writeFile(path.join(output,`blocks-${kind}.pdf`),await renderPdf(exportHtml(make(`# START\n\n${filler}\n\n${note}\n\n本文に戻ります。\n\n${long}\n\nEND_${kind}`),{columns:2,fontSize:15,copyButtons:true})));
 }
 console.log('PASS: generated heading breaks and short/oversized GM and information blocks');app.exit(0);
}catch(e){console.error(e);app.exit(1)}});

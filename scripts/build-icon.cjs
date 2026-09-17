const {app,BrowserWindow,nativeImage}=require('electron'),fs=require('node:fs/promises'),path=require('node:path');
app.whenReady().then(async()=>{try{
 const svg=await fs.readFile(path.resolve('assets/icon.svg'),'utf8'),w=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true}});
 await w.loadURL('data:text/html,<html></html>');
 const url=await w.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=256;canvas.getContext('2d').drawImage(img,0,0,256,256);resolve(canvas.toDataURL('image/png'))};img.onerror=reject;img.src=${JSON.stringify('data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'))}})`);
 const image=nativeImage.createFromDataURL(url);await fs.writeFile('assets/icon.png',image.toPNG());
 const sizes=[16,24,32,48,64,128,256],images=sizes.map(size=>image.resize({width:size,height:size,quality:'best'}).toPNG()),header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
 sizes.forEach((size,index)=>{const entry=6+index*16;header[entry]=header[entry+1]=size===256?0:size;header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);header.writeUInt32LE(images[index].length,entry+8);header.writeUInt32LE(offset,entry+12);offset+=images[index].length});
 await fs.writeFile('assets/icon.ico',Buffer.concat([header,...images]));console.log('Built 7-size ICO and PNG from icon.svg');app.exit(0);
}catch(error){console.error(error);app.exit(1)}});

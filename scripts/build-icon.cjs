const {app,BrowserWindow,nativeImage}=require('electron'),fs=require('node:fs/promises'),path=require('node:path');
app.whenReady().then(async()=>{try{
 const svg=await fs.readFile(path.resolve('assets/icon.svg'),'utf8'),w=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true}});
 await w.loadURL('data:text/html,<html></html>');
 const dice = svg.match(/<g id="dice">([\s\S]*?)<\/g>/)?.[1];
 if (!dice) throw new Error('Missing dice layer in assets/icon.svg');
 const rasterize = async markup => {
   const src = 'data:image/svg+xml;base64,' + Buffer.from(markup).toString('base64');
   const png = await w.webContents.executeJavaScript(`(async () => {
     const img = new Image();
     img.src = ${JSON.stringify(src)};
     await img.decode();
     const canvas = document.createElement('canvas');
     canvas.width = canvas.height = 1024;
     canvas.getContext('2d').drawImage(img, 0, 0, 1024, 1024);
     return canvas.toDataURL('image/png');
   })()`);
   return nativeImage.createFromDataURL(png);
 };
 const image = await rasterize(svg);
 await fs.writeFile('assets/icon.png', image.toPNG());
 const sizes=[16,24,32,48,64,128,256],images=sizes.map(size=>image.resize({width:size,height:size,quality:'best'}).toPNG()),header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
 sizes.forEach((size,index)=>{const entry=6+index*16;header[entry]=header[entry+1]=size===256?0:size;header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);header.writeUInt32LE(images[index].length,entry+8);header.writeUInt32LE(offset,entry+12);offset+=images[index].length});
 await fs.writeFile('assets/icon.ico',Buffer.concat([header,...images]));
 const chunks = [['ic07',128],['ic08',256],['ic09',512],['ic10',1024]].map(([type,size])=>{const png=image.resize({width:size,height:size,quality:'best'}).toPNG(),part=Buffer.alloc(8);part.write(type);part.writeUInt32BE(png.length+8,4);return Buffer.concat([part,png])});
 const icns=Buffer.alloc(8);icns.write('icns');icns.writeUInt32BE(8+chunks.reduce((n,b)=>n+b.length,0),4);await fs.writeFile('assets/icon.icns',Buffer.concat([icns,...chunks]));
 const wrap = content => '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">' + content + '</svg>';
 const round = await rasterize(wrap('<circle cx="128" cy="128" r="120" fill="#171615"/><circle cx="128" cy="128" r="112" fill="none" stroke="#806735" stroke-width="2"/>' + dice));
 // Keep the die inside Android's 66dp safe zone on the 108dp adaptive layer.
 const foreground = await rasterize(wrap('<g transform="translate(128 128) scale(.8) translate(-128 -128)">' + dice + '</g>'));
 const densities = [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]];
 for (const [density, scale] of densities) {
   const target = path.join('android/app/src/main/res', 'mipmap-' + density);
   for (const [name, source, size] of [
     ['ic_launcher', image, 48],
     ['ic_launcher_round', round, 48],
     ['ic_launcher_foreground', foreground, 108],
   ]) {
     const width = size * scale;
     const png = source.resize({ width, height: width, quality: 'best' }).toPNG();
     await fs.writeFile(path.join(target, name + '.png'), png);
   }
 }
 console.log('Built desktop and Android launcher icons from assets/icon.svg');app.exit(0);
}catch(error){console.error(error);app.exit(1)}});

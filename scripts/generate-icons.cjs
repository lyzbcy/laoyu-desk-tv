const path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..');
const sharp=require(process.env.SHARP_MODULE||'sharp');
(async()=>{await sharp(path.join(root,'assets/icon.svg')).resize(1024,1024).png().toFile(path.join(root,'assets/icon.png'));await sharp(path.join(root,'assets/trayTemplate.svg')).resize(32,32).png().toFile(path.join(root,'assets/trayTemplate.png'));console.log('Original app and Mac tray icons generated');})().catch(e=>{console.error(e);process.exitCode=1;});

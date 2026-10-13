const {BrowserWindow}=require('electron'),path=require('node:path');
let window;
function openControls(snapshot,options={}){
  if(window&&!window.isDestroyed()){if(options.show!==false){window.show();window.focus();}return window;}
  window=new BrowserWindow({show:options.show!==false,width:570,height:740,minWidth:430,minHeight:540,frame:false,title:'捞鱼桌脚看电视 · 设置与反馈',autoHideMenuBar:true,webPreferences:{offscreen:options.show===false,backgroundThrottling:options.show!==false,preload:path.join(__dirname,'../preload/controlsPreload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.setMenu(null);window.loadFile(path.join(__dirname,'../renderer/controls.html'));
  window.webContents.on('did-finish-load',()=>sendControls(snapshot()));window.on('closed',()=>{window=null;});return window;
}
function sendControls(state){if(window&&!window.isDestroyed())window.webContents.send('control-state',state);}
module.exports={openControls,sendControls};

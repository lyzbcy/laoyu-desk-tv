const {BrowserWindow}=require('electron'),path=require('node:path');
let window;
function revealFeedback(){
 const panel=window;if(!panel||panel.isDestroyed())return;
 const reveal=()=>{if(!panel.isDestroyed())panel.webContents.executeJavaScript("document.getElementById('feedbackSection')?.scrollIntoView({block:'start'});document.getElementById('note')?.focus();").catch(()=>{});};
 if(panel.webContents.getURL().includes('/about.html'))panel.loadFile(path.join(__dirname,'../renderer/controls.html'),{hash:'feedbackSection'}).then(reveal).catch(()=>{});
 else if(panel.webContents.isLoading())panel.webContents.once('did-finish-load',reveal);
 else reveal();
}
function openControls(snapshot,options={}){
  if(window&&!window.isDestroyed()){if(options.show!==false){window.show();window.focus();}if(options.feedback)revealFeedback();return window;}
  window=new BrowserWindow({show:options.show!==false,width:570,height:740,minWidth:430,minHeight:540,frame:false,title:'捞鱼桌脚看电视 · 设置与反馈',autoHideMenuBar:true,webPreferences:{offscreen:options.show===false,backgroundThrottling:options.show!==false,preload:path.join(__dirname,'../preload/controlsPreload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.setMenu(null);window.loadFile(path.join(__dirname,'../renderer/controls.html'),options.feedback?{hash:'feedbackSection'}:undefined);
  if(options.feedback)revealFeedback();
  window.webContents.on('did-finish-load',()=>sendControls(snapshot()));window.on('closed',()=>{window=null;});return window;
}
function sendControls(state){if(window&&!window.isDestroyed())window.webContents.send('control-state',state);}
module.exports={openControls,sendControls};

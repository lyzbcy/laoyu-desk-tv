const {app,ipcMain,dialog,globalShortcut,BrowserView,shell,clipboard}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const {createMainWindow,currentBounds,presentWindow}=require('./window');
const {createTray,refreshTray}=require('./tray');
const {openHotkeyWindow}=require('./hotkeyWindow');
const {loadConfig,saveConfig}=require('./store');
const {scanFolder}=require('../core/videoScanner');
const {initialState,transition,viewState}=require('../core/playerState');
const {displayAccelerator}=require('../core/hotkey');
const {createLogger}=require('../core/logger');
const {createUpdater,RELEASE_PAGE,confirmRestart}=require('./updater');
const {openControls,sendControls}=require('./controls');
const {createPrivacy}=require('./privacy');
const smoke=process.argv.includes('--paid-to-watch-smoke');
if(smoke){app.disableHardwareAcceleration();const dir=fs.mkdtempSync(path.join(os.tmpdir(),'paid-to-watch-smoke-'));app.setPath('userData',dir);}
else app.setPath('userData',path.join(app.getPath('appData'),'paid-to-watch'));
const ownsInstance=smoke||app.requestSingleInstanceLock();
if(!ownsInstance)app.quit();
let mainWindow,tray,liveView,config,state,logger,updater,callbacks,privacy;
let setupMode=false,savedBounds=null,liveLoaded=false,phase='idle',statusMessage='默认静音，可点击声音开关开启';
const AD_H=70,TITLE_H=22,ADDR_H=32;
const safeWindow=()=>mainWindow&&!mainWindow.isDestroyed();
const record=(level,event,fields)=>logger?.log(level,event,fields);
function controlState(){const message=['loading','error'].includes(phase)?statusMessage:(state.liveOn?'网页播放：'+(state.liveMuted?'静音':'声音已开启'):'本地视频：'+(state.localMuted?'静音':'声音已开启'));return {version:app.getVersion(),platform:process.platform,architecture:process.arch,player:viewState(state),hotkey:displayAccelerator(config.hotkey),phase,message,updater:updater?.snapshot(),privacy:privacy?.snapshot()};}
function updateView(){
  if(liveView){const s=viewState(state);liveView.webContents.setAudioMuted(s.effectiveLiveMuted);liveView.setBounds(s.liveVisible?stageBounds():{x:0,y:0,width:0,height:0});}
  if(safeWindow())mainWindow.webContents.send('player-state',controlState());
  if(tray)refreshTray(tray,callbacks,{...viewState(state),setupMode,favoriteSites:config.favoriteSites,version:app.getVersion()});
  sendControls(controlState());
}
function dispatch(action){state=transition(state,action);updateView();}
function stageBounds(){const {width,height}=mainWindow.getContentBounds();const addr=setupMode?ADDR_H:0;return {x:0,y:AD_H+addr,width,height:Math.max(0,height-2*AD_H-TITLE_H-addr)};}
function setPreference(action,key,value){
  const next={...config,[key]:value};
  if(!saveConfig(next)){statusMessage='设置保存失败，请重试';record('error','config.save-failed');updateView();return false;}
  config=next;dispatch(action);record('info','audio.preference',{source:key==='muted'?'local':'live',ok:!value});return true;
}
function toggleSound(){return state.liveOn?setPreference({type:'live-sound',value:state.liveMuted},'liveMuted',!state.liveMuted):setPreference({type:'local-sound',value:state.localMuted},'muted',!state.localMuted);}
function toggleBoss(){if(config.privacyEnabled!==false&&privacy?.snapshot().level==='fail'&&state.bossOn){statusMessage='无感自检未通过，请先在设置中重试或关闭保护';phase='error';updateView();return;}dispatch({type:'toggle-boss'});record('info','player.boss',{ok:state.bossOn});}
function registerHotkey(accel){return smoke?true:globalShortcut.register(accel,()=>{if(safeWindow())toggleBoss();});}
function openPanel(){return openControls(controlState,{show:!smoke});}
ipcMain.handle('get-config',()=>config);
ipcMain.handle('get-player-state',()=>controlState());
ipcMain.handle('get-control-state',()=>controlState());
ipcMain.handle('set-privacy',(_event,key,value)=>{if(!['privacyEnabled','autoPrivacyCheck'].includes(key)||typeof value!=='boolean')throw Error('无感设置参数无效');const next={...config,[key]:value};if(!saveConfig(next))throw Error('设置保存失败');config=next;privacy.refresh();return controlState();});
ipcMain.handle('privacy-check',async()=>{await privacy.run();return controlState();});
ipcMain.handle('toggle-sound',()=>{toggleSound();return controlState();});
ipcMain.handle('open-controls',()=>{openPanel();return true;});
ipcMain.handle('set-sound',(_e,source,on)=>{
  if(typeof on!=='boolean'||!['local','live'].includes(source))throw Error('声音参数无效');
  setPreference({type:source==='live'?'live-sound':'local-sound',value:on},source==='live'?'liveMuted':'muted',!on);return controlState();
});
ipcMain.handle('pick-folder',async()=>{const r=await dialog.showOpenDialog(mainWindow,{properties:['openDirectory']});return r.canceled?null:r.filePaths[0];});
ipcMain.handle('scan-videos',(_e,dir)=>typeof dir==='string'?scanFolder(dir).map(v=>({...v,url:pathToFileURL(v.path).href})):[]);
ipcMain.handle('set-folder',(_e,dir)=>{
  if(typeof dir!=='string'||!fs.statSync(dir).isDirectory())throw Error('请选择有效的视频文件夹');
  const next={...config,videoFolder:dir};if(!saveConfig(next))throw Error('视频目录保存失败');config=next;dispatch({type:'live',value:false});record('info','player.folder-selected');return true;
});
ipcMain.on('fake-close',()=>{if(!safeWindow())return;mainWindow.hide();setTimeout(()=>{if(safeWindow())mainWindow.show();},150);});
ipcMain.on('video-ended',()=>dispatch({type:'ended'}));
ipcMain.on('media-error',(_e,name)=>{phase='error';statusMessage='视频播放失败，可到“遇到问题反馈”查看诊断';record('warn','player.media-error',{code:/^[A-Za-z_]{1,50}$/.test(name||'')?name:'Unknown'});updateView();});
ipcMain.handle('set-hotkey',(_e,accel)=>{
  if(typeof accel!=='string'||accel.length>80)return {success:false,message:'组合键无效'};
  if(!smoke)globalShortcut.unregister(config.hotkey);
  if(!registerHotkey(accel)){registerHotkey(config.hotkey);record('warn','hotkey.rejected');return {success:false,message:'该组合键已被占用或无效，请换一个'};}
  const next={...config,hotkey:accel};
  if(!saveConfig(next)){if(!smoke)globalShortcut.unregister(accel);registerHotkey(config.hotkey);return {success:false,message:'保存失败，请重试'};}
  config=next;record('info','hotkey.saved');updateView();return {success:true};
});
ipcMain.handle('check-update',()=>updater.check(true));
ipcMain.handle('install-update',()=>updater.install());
ipcMain.handle('open-release',()=>shell.openExternal(RELEASE_PAGE));
ipcMain.handle('export-logs',async()=>{
  const result=await dialog.showSaveDialog({title:'导出技术日志',defaultPath:'捞鱼小窗-诊断.txt',filters:[{name:'文本',extensions:['txt']}]});
  if(result.canceled)return false;fs.writeFileSync(result.filePath,logger.summary(),'utf8');return true;
});
ipcMain.handle('feedback',async(_event,payload)=>{
  const note=String(payload?.note||'').slice(0,4000),category=String(payload?.category||'其他').slice(0,50);
  const body=`软件：捞鱼小窗\n版本：${app.getVersion()}\n平台：${process.platform}/${process.arch}\n分类：${category}\n\n${note}\n`+(payload?.includeLogs?'\n技术日志（不含媒体路径、网址或登录信息）：\n'+logger.summary():'');
  clipboard.writeText(body);await shell.openExternal('https://github.com/lyzbcy/paid-to-watch/issues/new');return true;
});
function goToUrl(value){
  if(typeof value!=='string'||value.length>4096)return;
  let url;try{url=new URL(/^https?:\/\//i.test(value)?value:'https://'+value);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('invalid');}
  catch{statusMessage='请输入有效的网页地址';phase='error';updateView();return;}
  config={...config,liveUrl:url.toString()};saveConfig(config);
  dispatch({type:'live',value:true});liveLoaded=true;phase='loading';statusMessage='正在加载网页…';updateView();
  liveView.webContents.loadURL(url.toString()).catch(()=>{});
}
ipcMain.on('navigate-live',(_event,url)=>goToUrl(url));
app.on('second-instance',()=>{if(safeWindow()){mainWindow.show();mainWindow.focus();}});
app.on('activate',()=>{if(safeWindow())mainWindow.show();});
if(ownsInstance)app.whenReady().then(async()=>{
  config=loadConfig();state=initialState(config);
  logger=createLogger(path.join(app.getPath('userData'),'logs'),{version:app.getVersion(),platform:process.platform});record('info','app.start');
  privacy=createPrivacy({app,config:()=>config,mainWindow:()=>mainWindow,hotkeyReady:()=>!smoke&&globalShortcut.isRegistered(config.hotkey),logger,smoke,notify:()=>{if(privacy?.snapshot().level==='fail'&&config.privacyEnabled!==false){state=transition(state,{type:'privacy-failure'});phase='error';statusMessage='无感自检未通过，已遮挡并静音。请到设置查看。';}else if(phase==='error'&&statusMessage.startsWith('无感自检')){phase='idle';}updateView();}});
  if(process.platform==='win32')app.setAppUserModelId('com.laoyu.paidtowatch');
  mainWindow=createMainWindow(config,{show:!smoke});privacy.apply(mainWindow);
  updater=createUpdater({app,config:()=>config,save:value=>{if(!saveConfig(value))return false;config=value;return true;},logger,notify:()=>updateView(),smoke});
  mainWindow.webContents.on('did-finish-load',updateView);mainWindow.webContents.on('render-process-gone',()=>record('error','renderer.gone'));
  let persistTimer;const persist=()=>{if(setupMode)return;clearTimeout(persistTimer);persistTimer=setTimeout(()=>{if(safeWindow()){config={...config,window:mainWindow.getBounds()};if(!saveConfig(config))record('warn','window.save-failed');}},200);};
  mainWindow.on('moved',persist);mainWindow.on('resized',persist);mainWindow.on('resize',()=>updateView());
  liveView=new BrowserView({webPreferences:{contextIsolation:true,sandbox:true,partition:smoke?'smoke-live':'persist:live'}});
  liveView.webContents.setAudioMuted(true);mainWindow.addBrowserView(liveView);liveView.setBounds({x:0,y:0,width:0,height:0});
  liveView.webContents.on('enter-html-full-screen',updateView);liveView.webContents.on('leave-html-full-screen',updateView);
  liveView.webContents.on('did-start-loading',()=>{phase='loading';statusMessage='正在加载网页…';updateView();});
  liveView.webContents.on('did-finish-load',()=>{phase='ready';statusMessage='网页已就绪';liveView.webContents.setZoomFactor(setupMode?1:0.6);record('info','live.ready');updateView();});
  liveView.webContents.on('did-fail-load',(_e,code)=>{if(code===-3)return;phase='error';statusMessage='网页加载失败，可重试或更换网址';record('warn','live.failed',{code});updateView();});
  if(!registerHotkey(config.hotkey)){statusMessage='老板键注册失败，请到设置换一个组合';record('warn','hotkey.start-failed');}
  callbacks={
    onPickFolder:()=>mainWindow.webContents.send('pick-folder-from-tray'),onToggleShow:()=>mainWindow.isVisible()?mainWindow.hide():mainWindow.show(),onSetHotkey:()=>openHotkeyWindow(),onOpenControls:openPanel,
    onToggleLocalSound:()=>setPreference({type:'local-sound',value:state.localMuted},'muted',!state.localMuted),onToggleLiveSound:()=>setPreference({type:'live-sound',value:state.liveMuted},'liveMuted',!state.liveMuted),
    onToggleLive:()=>{if(!state.liveOn&&!liveLoaded)goToUrl(config.liveUrl);else dispatch({type:'live',value:!state.liveOn});},
    onToggleSetupMode:()=>{setupMode=!setupMode;if(setupMode){savedBounds=mainWindow.getBounds();presentWindow(mainWindow,true,config.privacyEnabled!==false);mainWindow.setBounds(currentBounds(savedBounds,true));}else{presentWindow(mainWindow,false,config.privacyEnabled!==false);if(savedBounds)mainWindow.setBounds(currentBounds(savedBounds));}privacy.apply(mainWindow);mainWindow.webContents.send('setup-mode',setupMode);liveView.webContents.setZoomFactor(setupMode?1:0.6);updateView();},onSelectFavorite:goToUrl,
  };
  tray=createTray(callbacks,{...viewState(state),setupMode,favoriteSites:config.favoriteSites,version:app.getVersion()});updateView();
  if(!smoke){let visible=false;for(let i=0;i<300;i++){if(safeWindow()&&mainWindow.isVisible()&&!mainWindow.webContents.isLoading()){visible=true;break;}await new Promise(r=>setTimeout(r,100));}if(!visible)throw Error('window-not-visible');}
  await confirmRestart(app,logger).catch(()=>record('warn','updater.receipt-failed'));if(!smoke)updater.check(false).catch(()=>{});
  privacy.schedule();
  if(smoke)require('../../scripts/ui-smoke').run({app,mainWindow,liveView,callbacks,dispatch,getState:controlState}).catch(e=>{console.error(e.stack);app.exit(2);});
}).catch(error=>{record('error','app.start-failed',{code:error.code||'Startup'});if(smoke){console.error(error);app.exit(2);}else dialog.showErrorBox('捞鱼小窗启动失败','请重新打开或到发布页下载完整软件包。');});
app.on('window-all-closed',()=>app.quit());app.on('will-quit',()=>{privacy?.dispose();globalShortcut.unregisterAll();});

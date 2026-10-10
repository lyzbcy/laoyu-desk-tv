// src/main/window.js
const { BrowserWindow, screen } = require('electron');
const path = require('node:path');
const { windowBounds } = require('../core/windowGeometry');

function currentBounds(saved,setup=false){return windowBounds(saved,screen.getAllDisplays(),screen.getPrimaryDisplay().id,setup);}
function presentWindow(win,setup=false,privacy=true){
  win.__setupMode=setup;
  win.setAlwaysOnTop(!setup,'screen-saver');
  win.setSkipTaskbar(privacy&&!setup);
  win.setFocusable(!privacy||setup);
  win.setContentProtection(privacy);
  if(process.platform==='darwin')win.setVisibleOnAllWorkspaces(!setup,{visibleOnFullScreen:!setup});
}

// 依据配置在主屏右下角创建窗口。config.window 提供尺寸/可选坐标。
function createMainWindow(config,options={}) {
  const {width,height,x,y}=currentBounds(config.window);

  const win = new BrowserWindow({
    width,
    show: false,
    height,
    x,
    y,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: config.privacyEnabled!==false,
    focusable: config.privacyEnabled===false,
    fullscreenable: false, // 网页里的播放器点"全屏"时,不让伪装窗口被拉成真全屏
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload 需要 require 项目内的 core 模块,沙盒模式下 require 被限制为内置模块
      offscreen: options.show === false,
    },
  });
  presentWindow(win,false,config.privacyEnabled!==false);
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  if(options.show!==false)win.once('ready-to-show',()=>config.privacyEnabled===false?win.show():win.showInactive());
  return win;
}

module.exports = { createMainWindow,currentBounds,presentWindow };

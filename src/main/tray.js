// src/main/tray.js
const { Tray, Menu, app } = require('electron');
const path = require('node:path');

// callbacks: { onPickFolder, onToggleShow, onSetHotkey, onToggleLive, onToggleLiveSound, onToggleSetupMode, onSelectFavorite }
// state: { liveOn, liveMuted, setupMode, favoriteSites }
function buildMenu(callbacks, state) {
  return Menu.buildFromTemplate([
    { label: '选择视频文件夹', click: () => callbacks.onPickFolder() },
    { label: '显示 / 隐藏', click: () => callbacks.onToggleShow() },
    { label: '恢复推荐卡片大小', click: () => callbacks.onResetCardSize() },
    { label: '设置老板键', click: () => callbacks.onSetHotkey() },
    { label: '本地视频声音', type: 'checkbox', checked: !state.localMuted, click: () => callbacks.onToggleLocalSound() },
    { type: 'separator' },
    { label: '网页直播', type: 'checkbox', checked: state.liveOn, click: () => callbacks.onToggleLive() },
    { label: '直播声音', type: 'checkbox', checked: !state.liveMuted, click: () => callbacks.onToggleLiveSound() },
    {
      label: '直播设置模式(放大窗口便于操作)',
      type: 'checkbox',
      checked: state.setupMode,
      click: () => callbacks.onToggleSetupMode(),
    },
    {
      label: '收藏网站',
      submenu: state.favoriteSites.map((site) => ({
        label: site.name,
        click: () => callbacks.onSelectFavorite(site.url),
      })),
    },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
    { label: state.updateAvailable ? '设置 · 发现新版' : '设置', click: () => callbacks.onOpenControls() },
    { label: '遇到问题反馈', click: () => callbacks.onOpenFeedback() },
    { label: `捞鱼桌脚看电视 ${state.version || ''}`, enabled: false },
  ]);
}

function createTray(callbacks, state) {
  const tray = new Tray(path.join(__dirname, process.platform === 'darwin' ? '../../assets/trayTemplate.png' : '../../assets/icon.ico'));
  tray.setToolTip('捞鱼桌脚看电视');
  tray.setContextMenu(buildMenu(callbacks, state));
  return tray;
}

function refreshTray(tray, callbacks, state) {
  tray.setContextMenu(buildMenu(callbacks, state));
}

module.exports = { createTray, refreshTray };

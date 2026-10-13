// src/preload/preload.js
const { contextBridge, ipcRenderer } = require('electron');
const { AD_TEMPLATES } = require('../core/ads');
const { nextIndex, randomOtherIndex } = require('../core/adRotator');

contextBridge.exposeInMainWorld('api', {
  ads: () => ({ AD_TEMPLATES }),
  rotator: { nextIndex, randomOtherIndex },
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  scanVideos: (dir) => ipcRenderer.invoke('scan-videos', dir),
  getConfig: () => ipcRenderer.invoke('get-config'),
  getPlayerState: () => ipcRenderer.invoke('get-player-state'),
  toggleSound: () => ipcRenderer.invoke('toggle-sound'),
  openControls: () => ipcRenderer.invoke('open-controls'),
  openFeedback: () => ipcRenderer.invoke('open-feedback'),
  onPlayerState: (cb) => ipcRenderer.on('player-state', (_event,state) => cb(state)),
  videoEnded: () => ipcRenderer.send('video-ended'),
  mediaError: (name) => ipcRenderer.send('media-error', name),
  setFolder: (dir) => ipcRenderer.invoke('set-folder', dir),
  onBossKey: (cb) => ipcRenderer.on('toggle-boss-key', () => cb()),
  closeCard: () => ipcRenderer.send('close-card'),
  onPickFolderFromTray: (cb) => ipcRenderer.on('pick-folder-from-tray', () => cb()),
  onToggleLive: (cb) => ipcRenderer.on('toggle-live', (_e, on) => cb(on)),
  navigateLive: (url) => ipcRenderer.send('navigate-live', url),
  onSetupMode: (cb) => ipcRenderer.on('setup-mode', (_e, on) => cb(on)),
});

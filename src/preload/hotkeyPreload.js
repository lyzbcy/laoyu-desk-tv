// src/preload/hotkeyPreload.js
const { contextBridge, ipcRenderer } = require('electron');
const { buildAccelerator, displayAccelerator } = require('../core/hotkey');

contextBridge.exposeInMainWorld('api', {
  buildAccelerator,
  displayAccelerator,
  getCurrentHotkey: () => ipcRenderer.invoke('get-config').then((c) => c.hotkey),
  setHotkey: (accel) => ipcRenderer.invoke('set-hotkey', accel),
});

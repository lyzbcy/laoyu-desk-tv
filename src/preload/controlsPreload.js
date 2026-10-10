const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('controls',{
 state:()=>ipcRenderer.invoke('get-control-state'),
 sound:(source,on)=>ipcRenderer.invoke('set-sound',source,on),
 check:()=>ipcRenderer.invoke('check-update'),install:()=>ipcRenderer.invoke('install-update'),release:()=>ipcRenderer.invoke('open-release'),
 exportLogs:()=>ipcRenderer.invoke('export-logs'),feedback:payload=>ipcRenderer.invoke('feedback',payload),
 onState:callback=>ipcRenderer.on('control-state',(_event,state)=>callback(state)),
});

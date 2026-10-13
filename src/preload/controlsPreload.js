const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('controls',{
 state:()=>ipcRenderer.invoke('get-control-state'),
 sound:(source,on)=>ipcRenderer.invoke('set-sound',source,on),
 check:()=>ipcRenderer.invoke('check-update'),install:()=>ipcRenderer.invoke('install-update'),release:()=>ipcRenderer.invoke('open-release'),
 exportLogs:()=>ipcRenderer.invoke('export-logs'),prepareFeedback:payload=>ipcRenderer.invoke('prepare-feedback',payload),feedback:token=>ipcRenderer.invoke('feedback',token),
 cancelFeedback:token=>ipcRenderer.invoke('cancel-feedback',token),
 onState:callback=>ipcRenderer.on('control-state',(_event,state)=>callback(state)),
 privacy:(key,value)=>ipcRenderer.invoke('set-privacy',key,value),selfCheck:()=>ipcRenderer.invoke('privacy-check'),
 dismissInvite:()=>ipcRenderer.invoke('dismiss-feedback-invite'),project:()=>ipcRenderer.invoke('open-project'),
 authorHome:()=>ipcRenderer.invoke('open-author-home'),
});

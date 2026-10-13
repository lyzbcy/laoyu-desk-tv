const fs=require('node:fs'),path=require('node:path');
const KEYS=new Set(['version','platform','code','phase','source','ok','count','width','height']);
const LEVELS=new Set(['info','warn','error']);
const EVENTS=new Set(['app.start','app.start-failed','config.save-failed','config.usage-save-failed','audio.preference','player.boss','player.folder-selected','player.media-error','player.scan-complete','player.scan-failed','hotkey.rejected','hotkey.saved','hotkey.start-failed','renderer.gone','window.save-failed','live.ready','live.failed','privacy.checked','updater.checked','updater.check-failed','updater.handoff','updater.install-failed','updater.restarted','updater.receipt-failed']);
const CODES=new Set(['Startup','Unknown','AbortError','NotAllowedError','NotSupportedError','NetworkError','EncodingError','SecurityError','InvalidStateError','Error']);
function safeFields(fields){return Object.fromEntries(Object.entries(fields||{}).filter(([k,v])=>{if(!KEYS.has(k))return false;if(k==='ok')return typeof v==='boolean';if(['count','width','height'].includes(k))return Number.isFinite(v)&&v>=0;if(k==='code')return Number.isFinite(v)||(typeof v==='string'&&(CODES.has(v)||/^(?:ERR_[A-Z0-9_]{1,60}|E[A-Z]{2,24})$/.test(v)));if(k==='version')return typeof v==='string'&&/^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(v);if(k==='platform')return ['win32','darwin','linux'].includes(v);if(k==='source')return ['local','live'].includes(v);if(k==='phase')return ['idle','loading','ready','error','checking','current','available','downloading','installing','pass','warning','fail'].includes(v);return false;}));}
function sanitizeSummary(text){return String(text||'').split('\n').flatMap(line=>{try{const row=JSON.parse(line);if(!LEVELS.has(row.level)||!EVENTS.has(row.event)||!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(row.at)||!Number.isFinite(Date.parse(row.at)))return [];return [JSON.stringify({at:row.at,level:row.level,event:row.event,...safeFields(row)})];}catch{return [];}}).slice(-200).join('\n');}
function createLogger(directory,common={}){
  function log(level,event,fields={}){
    if(!LEVELS.has(level)||!EVENTS.has(event))return;
    try{
      fs.mkdirSync(directory,{recursive:true});
      const date=new Date().toISOString().slice(0,10),file=path.join(directory,`app-${date}.jsonl`);
      if(fs.existsSync(file)&&fs.statSync(file).size>2*1024*1024)fs.renameSync(file,file+'.previous');
      fs.appendFileSync(file,JSON.stringify({at:new Date().toISOString(),level,event,...safeFields(common),...safeFields(fields)})+'\n');
      const files=fs.readdirSync(directory).filter(f=>/^app-\d{4}-\d{2}-\d{2}\.jsonl(?:\.previous)?$/.test(f)).sort().reverse();
      for(const name of files.slice(14))fs.unlinkSync(path.join(directory,name));
    }catch{/* Logging must not break playback. */}
  }
  function summary(){
    try{return sanitizeSummary(fs.readdirSync(directory).filter(f=>/^app-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort().reverse().slice(0,2).reverse().map(f=>{const file=path.join(directory,f),stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)return '';const fd=fs.openSync(file,'r');try{const bytes=Buffer.alloc(Math.min(24000,stat.size));fs.readSync(fd,bytes,0,bytes.length,Math.max(0,stat.size-bytes.length));return bytes.toString('utf8');}finally{fs.closeSync(fd);}}).join('\n'));}catch{return '';}
  }
  return {log,summary};
}
module.exports={createLogger,safeFields,sanitizeSummary};

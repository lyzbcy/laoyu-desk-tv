const fs=require('node:fs'),path=require('node:path');
const KEYS=new Set(['version','platform','code','phase','source','ok','count','width','height']);
function safeFields(fields){return Object.fromEntries(Object.entries(fields||{}).filter(([k,v])=>KEYS.has(k)&&(typeof v==='boolean'||Number.isFinite(v)||(typeof v==='string'&&/^[a-zA-Z0-9_. -]{1,80}$/.test(v)))));}
function createLogger(directory,common={}){
  function log(level,event,fields={}){
    if(!/^[a-z0-9._-]{1,80}$/.test(event))return;
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
    try{return fs.readdirSync(directory).filter(f=>/^app-.*\.jsonl$/.test(f)).sort().reverse().slice(0,2).reverse().map(f=>fs.readFileSync(path.join(directory,f),'utf8').slice(-24000)).join('\n').split('\n').filter(Boolean).slice(-200).join('\n');}catch{return '';}
  }
  return {log,summary};
}
module.exports={createLogger,safeFields};

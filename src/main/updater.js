const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {REPO,RELEASE_PAGE,selectRelease,compareVersions,day}=require('../core/updateRelease');
const {startHandoff,confirmRestart}=require('./updateHandoff');
async function hashFile(file){const hash=crypto.createHash('sha256');for await(const bytes of fs.createReadStream(file))hash.update(bytes);return hash.digest('hex');}
async function fetchRelease(fetcher,platform,arch){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetcher(`https://api.github.com/repos/${REPO}/releases/latest`,{signal:controller.signal,redirect:'error',cache:'no-store',headers:{'User-Agent':'paid-to-watch'}});if(!response.ok)throw Error('发布信息暂不可用');const text=await response.text();if(text.length>1024*1024)throw Error('发布信息异常');return selectRelease(JSON.parse(text),platform,arch);}finally{clearTimeout(timer);}
}
async function download(release,directory,fetcher,progress){
 fs.mkdirSync(directory,{recursive:true});const target=path.join(directory,release.name);
 if(fs.existsSync(target)&&await hashFile(target)===release.sha256)return target;
 const temporary=target+'.'+crypto.randomUUID()+'.part',controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10*60*1000);
 let file;
 try{const response=await fetcher(release.url,{signal:controller.signal,cache:'no-store'});if(!response.ok||!response.body||/text\/html/i.test(response.headers.get('content-type')||''))throw Error('更新包下载失败');file=await fs.promises.open(temporary,'wx');let bytes=0;const hash=crypto.createHash('sha256');
  for await(const chunk of response.body){bytes+=chunk.length;if(bytes>release.size)throw Error('更新包大小异常');hash.update(chunk);let offset=0;while(offset<chunk.length){const written=await file.write(chunk,offset,chunk.length-offset);if(!written.bytesWritten)throw Error('更新包写入失败');offset+=written.bytesWritten;}progress({bytes,total:release.size});}
  await file.close();file=null;if(bytes!==release.size||hash.digest('hex')!==release.sha256)throw Error('更新包校验失败，旧版本未改变');fs.renameSync(temporary,target);return target;
 }finally{clearTimeout(timer);if(file)await file.close();try{fs.unlinkSync(temporary);}catch{}}
}
function createUpdater({app,config,save,logger,notify,smoke,fetcher=(url,options)=>require('electron').net.fetch(url,options),now=()=>new Date(),handoff=startHandoff}){
 let phase='idle',error='',release=null,progress=null,checkPromise,installPromise;
 const snapshot=()=>({phase,error,currentVersion:app.getVersion(),version:release?.version,available:!!release,progress,notes:release?.notes||''});
 const emit=()=>notify?.(snapshot());
 async function check(force=false){
  if(checkPromise)return checkPromise;if(['downloading','installing'].includes(phase))return snapshot();
  if(!force&&config().update?.lastAttemptDay===day(now()))return snapshot();
  checkPromise=(async()=>{phase='checking';error='';emit();
   try{if(save({...config(),update:{...config().update,lastAttemptDay:day(now())}})===false)throw Error('update record failed');const latest=await fetchRelease(fetcher,process.platform,process.arch);release=compareVersions(latest.version,app.getVersion())>0?latest:null;if(save({...config(),update:{...config().update,lastSuccessDay:day(now())}})===false)throw Error('update record failed');phase=release?'available':'current';logger?.log('info','updater.checked',{ok:true});}
   catch{phase='error';release=null;error='暂时无法检查新版，请重试或打开发布页。';logger?.log('warn','updater.check-failed');}emit();return snapshot();})();
  try{return await checkPromise;}finally{checkPromise=null;}
 }
 async function install(){
  if(installPromise)return installPromise;
  if(smoke||!app.isPackaged)throw Error('请在安装版中更新，测试模式不会执行安装');
  installPromise=(async()=>{await check(true);if(!release)throw Error(error||'没有可用更新');const target=release;
   phase='downloading';progress={bytes:0,total:target.size};emit();
   try{const file=await download(target,path.join(app.getPath('userData'),'updates','packages'),fetcher,value=>{progress=value;emit();});phase='installing';emit();await handoff({app,file,release:target});logger?.log('info','updater.handoff');app.quit();return true;}
   catch{phase='error';error='更新未完成，旧版本保留。请重试或打开发布页。';logger?.log('error','updater.install-failed');emit();throw Error(error);}
  })();try{return await installPromise;}finally{installPromise=null;}
 }
 return {snapshot,check,install};
}
module.exports={createUpdater,fetchRelease,download,hashFile,RELEASE_PAGE,confirmRestart};

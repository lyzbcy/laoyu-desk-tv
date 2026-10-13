const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const {EXECUTABLE,NAME,LEGACY_EXECUTABLE,APP_ID}=require('../core/branding');
const psQuote=value=>"'"+value.replaceAll("'","''")+"'";
function appLocation(executable,platform=process.platform){
 if(platform==='win32'){if(path.basename(executable)!==EXECUTABLE)throw Error('请安装正式版后再更新');const root=path.dirname(executable);if(root===path.parse(root).root)throw Error('无效安装目录');return {root,exe:executable};}
 if(platform==='darwin'){const match=/^(.*\.app)\/Contents\/MacOS\/[^/]+$/.exec(executable);if(!match)throw Error('请从应用程序包运行');return {root:match[1],exe:executable};}
 throw Error('此平台请手动更新');
}
async function startHandoff({app,file,release},{executable=process.execPath,platform=process.platform,execFile=cp.execFile,spawn=cp.spawn}={}){
 const location=appLocation(executable,platform),token=crypto.randomUUID(),directory=path.join(app.getPath('userData'),'updates','install-'+token);
 fs.mkdirSync(directory,{recursive:true});
 const data={token,pid:process.pid,file,sha256:release.sha256,version:release.version,...location,directory,appId:'com.laoyu.paidtowatch',desktopRequired:platform==='win32'&&fs.existsSync(path.join(app.getPath('desktop'),NAME+'.lnk'))};
 const payload=path.join(directory,'payload.json');fs.writeFileSync(payload,JSON.stringify(data));
 const helper=path.join(directory,platform==='win32'?'install.ps1':'install.sh');
 const original=fs.readFileSync(path.join(__dirname,'../helpers',path.basename(helper)),'utf8');
 fs.writeFileSync(helper,(platform==='win32'?'\uFEFF':'')+original.replace(/^\uFEFF/,''),'utf8');
 if(platform==='win32'){const module=fs.readFileSync(path.join(__dirname,'../helpers/windows-install.ps1'),'utf8');fs.writeFileSync(path.join(directory,'windows-install.ps1'),'\uFEFF'+module.replace(/^\uFEFF/,''),'utf8');}
 fs.writeFileSync(path.join(app.getPath('userData'),'updates','pending.json'),JSON.stringify({token,version:release.version}));
 try{
  let helperPid,launchError;
  if(platform==='win32'){
   const command=`& ${psQuote(helper)}`;
   const bootstrap=`$child=Start-Process -FilePath powershell.exe -WindowStyle Hidden -PassThru -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand','${Buffer.from(command,'utf16le').toString('base64')}');$child.Id`;
   const output=await new Promise((resolve,reject)=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(bootstrap,'utf16le').toString('base64')],{windowsHide:true,timeout:20000},(e,out)=>e?reject(e):resolve(out)));
   if(!/^\s*\d+\s*$/.test(output||''))throw Error('更新助手PID未确认');helperPid=Number(output.trim());
  }else{
   fs.accessSync(path.dirname(location.root),fs.constants.W_OK);
   const child=spawn('/bin/sh',[helper,directory,String(data.pid),file,release.sha256,release.version,location.root,location.exe,token],{detached:true,stdio:'ignore'});helperPid=child.pid;child.once('error',error=>{launchError=error});child.unref();
  }
  const end=Date.now()+60000;
  while(Date.now()<end){
   if(launchError)throw Error('更新助手未能启动，旧软件保留');
   try{const ready=JSON.parse(fs.readFileSync(path.join(directory,'ready.json'),'utf8').replace(/^\uFEFF/,''));if(ready.token!==token||ready.status!=='ready'||ready.version!==release.version||!Number.isSafeInteger(ready.pid)||ready.pid<=0||ready.pid!==helperPid)throw Error('更新助手回执错误');fs.writeFileSync(path.join(directory,'commit.json'),JSON.stringify({token}));return {token,directory,helperPid};}catch(e){if(e.message==='更新助手回执错误')throw e;}
   if(fs.existsSync(path.join(directory,'result.json'))){const result=JSON.parse(fs.readFileSync(path.join(directory,'result.json'),'utf8').replace(/^\uFEFF/,''));if(result.status==='failed')throw Error('更新助手准备失败');}
   await sleep(100);
  }
  throw Error('更新助手未就绪，旧软件保留');
 }catch(error){fs.writeFileSync(path.join(directory,'abort.json'),JSON.stringify({token}));throw error;}
}
async function readWindowsInstallation(data){
 const moduleFile=path.join(data.directory,'restart-validation.ps1'),source=fs.readFileSync(path.join(__dirname,'../helpers/windows-install.ps1'),'utf8');
 fs.writeFileSync(moduleFile,'\uFEFF'+source.replace(/^\uFEFF/,''),'utf8');
 const request={root:data.root||path.dirname(data.exe),version:data.version,desktopRequired:data.desktopRequired===true};
 const script=`$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';[Console]::OutputEncoding=New-Object Text.UTF8Encoding $false;. ${psQuote(moduleFile)}; $p=ConvertFrom-Json ${psQuote(JSON.stringify(request))};Test-DeskTvInstallation $p.root $p.version ([bool]$p.desktopRequired)|ConvertTo-Json -Depth 5 -Compress`;
 const stdout=await new Promise((resolve,reject)=>cp.execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:20000,maxBuffer:8192},(error,out)=>error?reject(error):resolve(out)));
 return JSON.parse(stdout.trim());
}
async function confirmRestart(app,logger,{verifyWindows=readWindowsInstallation}={}){
 const root=path.join(app.getPath('userData'),'updates');let pointer;
 try{pointer=JSON.parse(fs.readFileSync(path.join(root,'pending.json'),'utf8'));}catch{return false;}
 if(!/^[a-f0-9-]{36}$/.test(pointer.token||'')||pointer.version!==app.getVersion())return false;
 const directory=path.join(root,'install-'+pointer.token),file=path.join(directory,'result.json');
 let result,data;try{result=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));data=JSON.parse(fs.readFileSync(path.join(directory,'payload.json'),'utf8'));}catch{return false;}
 const exactPath=path.resolve(data.exe)===path.resolve(process.execPath);
 const legacyWindows=process.platform==='win32'&&path.basename(data.exe)===LEGACY_EXECUTABLE&&path.basename(process.execPath)===EXECUTABLE&&path.resolve(path.dirname(data.exe))===path.resolve(path.dirname(process.execPath))&&path.resolve(data.root)===path.resolve(path.dirname(process.execPath));
 const oldMacRoot=process.platform==='darwin'?/^(.*\.app)\/Contents\/MacOS\/带薪看片$/.exec(data.exe)?.[1]:null;
 const legacyMac=oldMacRoot&&path.basename(process.execPath)===NAME&&path.resolve(oldMacRoot)===path.resolve(appLocation(process.execPath,'darwin').root)&&path.resolve(data.root)===path.resolve(oldMacRoot);
 if(result.status!=='installed'||result.token!==pointer.token||result.version!==pointer.version||data.token!==pointer.token||data.version!==pointer.version||data.appId!==APP_ID||(!exactPath&&!legacyWindows&&!legacyMac))return false;
 let installation=result.installation;if(process.platform==='win32'&&app.isPackaged){try{installation=await verifyWindows({...data,directory});if(installation.version!==app.getVersion()||path.resolve(installation.exe)!==path.resolve(process.execPath)||!Array.isArray(installation.shortcuts)||!installation.shortcuts.length)return false;}catch{return false;}}
 fs.writeFileSync(file,JSON.stringify({...result,status:'restarted',version:app.getVersion(),runningExe:process.execPath,installation}));logger?.log('info','updater.restarted');return true;
}
module.exports={startHandoff,confirmRestart,appLocation,readWindowsInstallation};

// Real installed UI + immutable candidate installer. Staging URLs exist only in the inspected process.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function rpc(url){const ws=new WebSocket(url),pending=new Map();let id=0;await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});ws.addEventListener('message',e=>{const data=JSON.parse(e.data),p=pending.get(data.id);if(p){pending.delete(data.id);data.error?p.reject(Error(JSON.stringify(data.error))):p.resolve(data.result);}});ws.addEventListener('close',()=>{for(const p of pending.values())p.reject(Error('closed'));pending.clear();});return {call(method,params={}){const key=++id;return new Promise((resolve,reject)=>{pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});},close(){ws.close();}};}
async function endpoint(port,filter=''){for(let i=0;i<100;i++){try{const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();const page=pages.find(p=>p.webSocketDebuggerUrl&&!p.url?.startsWith('devtools:')&&p.url?.includes(filter));if(page)return page.webSocketDebuggerUrl;}catch{}await sleep(100);}throw Error('Inspector unavailable');}
async function main(){
 const [exe,installer,version,output]=process.argv.slice(2),name=path.basename(installer),bytes=fs.readFileSync(installer),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 const userData=path.join(process.env.APPDATA,'paid-to-watch'),configFile=path.join(userData,'config.json'),before=JSON.parse(fs.readFileSync(configFile)),publicUrl=`https://github.com/lyzbcy/paid-to-watch/releases/download/v${version}/${name}`;
 const release={tag_name:'v'+version,body:'Staged exact candidate validation',assets:[{name,size:bytes.length,digest:'sha256:'+sha256,browser_download_url:publicUrl}]};
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/release'?'application/json':'application/octet-stream');res.end(req.url==='/release'?JSON.stringify(release):bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const old=cp.spawn(exe,['--inspect=127.0.0.1:19328','--remote-debugging-port=19329'],{stdio:'ignore',windowsHide:true});let exited=false;old.on('exit',()=>exited=true);let debug,ui;
 const evalAt=async(client,expression)=>{const r=await client.call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 try{
  debug=await rpc(await endpoint(19328));ui=await rpc(await endpoint(19329,'index.html'));console.log('INSPECTORS_READY');
  await evalAt(debug,`(()=>{const n=process.mainModule.require('electron').net,o=n.fetch.bind(n);n.fetch=(url,options)=>o(String(url).includes('api.github.com/repos/lyzbcy/paid-to-watch/releases/latest')?${JSON.stringify(base+'/release')}:String(url)===${JSON.stringify(publicUrl)}?${JSON.stringify(base+'/package')}:url,options);return true;})()`);
  await evalAt(ui,"window.api.openControls()");let checked;for(let i=0;i<100;i++){try{checked=await evalAt(debug,"process.mainModule.require('electron').ipcMain._invokeHandlers.get('check-update')()");if(checked.available)break;}catch{}await sleep(100);}assert.equal(checked.version,version);
  const pages=await(await fetch('http://127.0.0.1:19329/json/list')).json(),control=pages.find(p=>p.url.includes('controls.html'));assert(control);ui.close();ui=await rpc(control.webSocketDebuggerUrl);
  for(let i=0;i<100;i++){if(await evalAt(ui,"!document.querySelector('#install').hidden"))break;await sleep(100);}
  assert(await evalAt(ui,"!document.querySelector('#install').hidden"));debug.close();debug=null;
  await evalAt(ui,"document.querySelector('#install').click();true");let receipt,pointer;
  for(let i=0;i<1800;i++){try{pointer=JSON.parse(fs.readFileSync(path.join(userData,'updates/pending.json')));receipt=JSON.parse(fs.readFileSync(path.join(userData,'updates','install-'+pointer.token,'result.json'),'utf8').replace(/^\uFEFF/,''));if(receipt.status==='restarted'&&receipt.version===version)break;if(receipt.status==='failed')throw Error('Update helper failed');}catch(e){if(e.message==='Update helper failed')throw e;}await sleep(100);}
  assert(exited,'old process exit');assert.equal(receipt?.status,'restarted');assert.equal(receipt.runningExe,exe);const after=JSON.parse(fs.readFileSync(configFile));
  for(const key of ['videoFolder','hotkey','muted','liveMuted','liveUrl','favoriteSites'])assert.deepEqual(after[key],before[key],key+' preserved');
  const report={status:'passed',version,source:'real installed controls button/IPC and exact locally staged release bytes',installerSha256:sha256,oldExited:exited,settingsPreserved:true,receipt};fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{debug?.close();ui?.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

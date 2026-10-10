const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run({app,mainWindow,liveView,callbacks,dispatch,getState}){
 const watchdog=setTimeout(()=>{console.error('SMOKE_TIMEOUT');app.exit(2);},60000);
 const evaluate=expression=>mainWindow.webContents.executeJavaScript(expression,true);
 const waitFor=async(expression)=>{for(let i=0;i<100;i++){try{if(await evaluate(expression))return;}catch{}await sleep(50);}throw Error('UI not ready: '+expression);};
 const output=process.env.PAID_SMOKE_OUTPUT||process.cwd();fs.mkdirSync(output,{recursive:true});
 let server;
 try{
  await waitFor('typeof window.api!=="undefined" && document.querySelector("#sound-toggle").textContent.includes("静音")');
  assert(await evaluate('document.querySelector("#video").muted'));
  await evaluate('document.querySelector("#sound-toggle").click();true');await waitFor('document.querySelector("#sound-toggle").textContent.includes("开声")');
  assert.equal(await evaluate('document.querySelector("#video").muted'),false);
  dispatch({type:'toggle-boss'});await waitFor('!document.querySelector("#boss-overlay").hidden');assert.equal(await evaluate('document.querySelector("#video").muted'),true);
  dispatch({type:'toggle-boss'});await waitFor('document.querySelector("#boss-overlay").hidden');assert.equal(await evaluate('document.querySelector("#video").muted'),false);
  // The fixture is local, deliberately silent, and has no user account/session.
  server=http.createServer((req,res)=>{if(req.url==='/fixture.webm'){res.setHeader('Content-Type','video/webm');fs.createReadStream(path.join(__dirname,'../tests/fixtures/silent.webm')).pipe(res);}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local playback fixture</title><video autoplay muted loop src="/fixture.webm"></video>');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  callbacks.onSelectFavorite('http://127.0.0.1:'+server.address().port);
  for(let i=0;i<100&&getState().phase!=='ready';i++)await sleep(50);
  assert.equal(getState().phase,'ready');assert.equal(liveView.webContents.isAudioMuted(),true);
  let decoded=false;for(let i=0;i<100;i++){decoded=await liveView.webContents.executeJavaScript('document.querySelector("video")?.readyState>=2 && document.querySelector("video")?.currentTime>0');if(decoded)break;await sleep(50);}assert(decoded,'native BrowserView media did not decode/play fixture');
  callbacks.onToggleLiveSound();assert.equal(liveView.webContents.isAudioMuted(),false);
  dispatch({type:'toggle-boss'});assert.equal(liveView.webContents.isAudioMuted(),true);assert.equal(liveView.getBounds().height,0);
  dispatch({type:'toggle-boss'});assert.equal(liveView.webContents.isAudioMuted(),false);assert(liveView.getBounds().height>0);
  callbacks.onToggleLive();assert.equal(liveView.webContents.isAudioMuted(),true);
  const panel=callbacks.onOpenControls();
  let panelReady=false;
  for(let i=0;i<200;i++){try{panelReady=await panel.webContents.executeJavaScript('typeof window.controls!=="undefined" && document.querySelector("#localSound").checked && !!document.querySelector("#version").textContent');if(panelReady)break;}catch{}await sleep(50);}
  assert(panelReady,'controls did not initialize: '+await panel.webContents.executeJavaScript('document.querySelector("#message").textContent'));
  await panel.webContents.executeJavaScript('document.querySelector("#localSound").click();true');
  for(let i=0;i<100&&!getState().player.localMuted;i++)await sleep(50);assert(getState().player.localMuted,'controls sound IPC must change main state');
  await panel.webContents.executeJavaScript('document.querySelector("#localSound").click();true');
  for(let i=0;i<100&&getState().player.localMuted;i++)await sleep(50);assert.equal(getState().player.localMuted,false);
  assert(await panel.webContents.executeJavaScript('document.querySelector("#includeLogs").checked && document.querySelector("#feedback").textContent.includes("GitHub")'));
  fs.writeFileSync(path.join(output,'controls.png'),(await panel.webContents.capturePage()).toPNG());panel.close();
  fs.writeFileSync(path.join(output,'player.png'),(await mainWindow.webContents.capturePage()).toPNG());
  const report={version:app.getVersion(),platform:process.platform,arch:process.arch,status:'passed',bounds:mainWindow.getBounds(),checks:['default mute','local toggle','boss forced mute and preference restore','real local BrowserView fixture','live sound toggle','hidden live mute','boss prevents live view resurfacing','feedback and diagnostic controls'],scope:'isolated userData; no global keys, user media, external web or outgoing feedback'};
  fs.writeFileSync(path.join(output,'ui-smoke.json'),JSON.stringify(report,null,2));console.log('SMOKE_OK '+JSON.stringify(report));
 }finally{clearTimeout(watchdog);server?.close();app.quit();}
}
module.exports={run};

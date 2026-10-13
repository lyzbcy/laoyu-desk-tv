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
  assert.equal(getState().privacy.enabled,true);assert.equal(getState().privacy.autoCheck,true);
  for(const id of ['privacyEnabled','autoPrivacyCheck']){await panel.webContents.executeJavaScript(`document.querySelector('#${id}').click();true`);for(let i=0;i<100;i++){if((id==='privacyEnabled'?getState().privacy.enabled:getState().privacy.autoCheck)===false)break;await sleep(50);}assert.equal(id==='privacyEnabled'?getState().privacy.enabled:getState().privacy.autoCheck,false);}
  assert.equal(mainWindow.isFocusable(),true);
  for(const id of ['privacyEnabled','autoPrivacyCheck']){await panel.webContents.executeJavaScript(`document.querySelector('#${id}').click();true`);for(let i=0;i<100;i++){if((id==='privacyEnabled'?getState().privacy.enabled:getState().privacy.autoCheck)===true)break;await sleep(50);}assert.equal(id==='privacyEnabled'?getState().privacy.enabled:getState().privacy.autoCheck,true);}
  assert.equal(mainWindow.isFocusable(),false);
  assert(await panel.webContents.executeJavaScript('document.querySelector("#includeLogs").checked && document.querySelector("#feedback").hidden && !document.querySelector("#previewFeedback").hidden'));
  await panel.webContents.executeJavaScript("document.querySelector('#note').value='隔离回归：本地测试媒体出现问题';document.querySelector('#note').dispatchEvent(new Event('input'));document.querySelector('#previewFeedback').click();true");
  let preview;for(let i=0;i<100;i++){preview=await panel.webContents.executeJavaScript("!document.querySelector('#feedbackPreview').hidden && document.querySelector('#feedbackBody').textContent.includes('Laoyu Desk TV')");if(preview)break;await sleep(50);}assert(preview,'actual feedback preview IPC failed');
  assert.equal(await panel.webContents.executeJavaScript("document.querySelector('#feedback').hidden"),false);
  const retiredToken=await panel.webContents.executeJavaScript('draft.token');
  await panel.webContents.executeJavaScript("document.querySelector('#note').value='隔离回归：修改后的建议';document.querySelector('#note').dispatchEvent(new Event('input'));true");await sleep(100);
  assert(await panel.webContents.executeJavaScript("document.querySelector('#feedback').hidden && document.querySelector('#feedbackBody').textContent==='' && document.querySelector('#feedbackLogs').textContent===''") ,'edited preview must clear its old DOM');
  assert(await panel.webContents.executeJavaScript("(async()=>{try{await window.controls.feedback("+JSON.stringify(retiredToken)+");return false}catch{return true}})()"),'actual IPC must reject retired feedback token');
  await panel.webContents.executeJavaScript("document.querySelector('#previewFeedback').click();true");for(let i=0;i<100;i++){if(await panel.webContents.executeJavaScript("!document.querySelector('#feedback').hidden"))break;await sleep(50);}
  await panel.webContents.executeJavaScript("document.querySelector('#feedback').click();true");for(let i=0;i<100;i++){if(await panel.webContents.executeJavaScript("document.querySelector('#message').textContent.includes('ZIP 已保存')"))break;await sleep(50);}
  const downloads=path.join(app.getPath('userData'),'test-downloads');assert.equal(fs.readdirSync(downloads).filter(name=>name.endsWith('.zip')).length,1,'default diagnostic archive must be saved only to isolated test directory');
  await panel.webContents.executeJavaScript("document.querySelector('#includeLogs').click();document.querySelector('#previewFeedback').click();true");for(let i=0;i<100;i++){if(await panel.webContents.executeJavaScript("!document.querySelector('#feedbackPreview').hidden && document.querySelector('#feedbackAttachment').textContent.includes('不附加')"))break;await sleep(50);}
  assert(await panel.webContents.executeJavaScript("document.querySelector('#feedbackAttachment').textContent.includes('不附加')"));
  await panel.webContents.executeJavaScript("document.querySelector('#feedback').click();true");await sleep(150);assert.equal(fs.readdirSync(downloads).filter(name=>name.endsWith('.zip')).length,1);
  await panel.webContents.executeJavaScript("document.querySelector('#dismissInvite').click();true");await sleep(150);assert(JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'config.json'),'utf8')).engagement.lastDismissDay,'dismissal must persist to real isolated configuration');
  assert(JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'config.json'),'utf8')).engagement.lastDismissAt,'full fifteen-day cooldown timestamp must persist');
  await panel.webContents.executeJavaScript("document.querySelector('#aboutAuthor').click();true");
  for(let i=0;i<100;i++){try{if(await panel.webContents.executeJavaScript("location.pathname.endsWith('/about.html') && document.querySelector('#version').textContent.includes('"+app.getVersion()+"') && [...document.querySelectorAll('.author-codes img,.author-avatar')].every(img=>img.complete&&img.naturalWidth>0)"))break;}catch{}await sleep(50);}
  assert(await panel.webContents.executeJavaScript("location.pathname.endsWith('/about.html') && document.querySelectorAll('.author-codes img').length===3 && [...document.querySelectorAll('.author-codes img,.author-avatar')].every(img=>img.complete&&img.naturalWidth>0) && document.documentElement.scrollWidth<=innerWidth"),'internal author page and packaged offline QR images must work');
  assert.equal(panel.isVisible(),false);await sleep(200);fs.writeFileSync(path.join(output,'author.png'),(await panel.webContents.capturePage()).toPNG());
  await panel.webContents.executeJavaScript("document.querySelectorAll('.qr-open')[2].click();true");await sleep(150);assert(await panel.webContents.executeJavaScript("document.querySelector('#qrPreview').open && document.querySelector('#qrImage').naturalWidth>0 && document.querySelector('#qrImage').alt==='加入QQ群二维码'"),'QR enlargement must remain within the author page');fs.writeFileSync(path.join(output,'author-qr.png'),(await panel.webContents.capturePage()).toPNG());await panel.webContents.executeJavaScript("document.querySelector('#closeQr').click();true");assert(await panel.webContents.executeJavaScript("!document.querySelector('#qrPreview').open"));
  await panel.webContents.executeJavaScript("document.querySelector('#authorHome').click();true");await sleep(100);assert(await panel.webContents.executeJavaScript("document.querySelector('#message').textContent.includes('已打开')"),'fixed author-home IPC must succeed in isolated smoke without opening a browser');
  await panel.webContents.executeJavaScript("document.querySelector('#backToSettings').click();true");for(let i=0;i<100;i++){try{if(await panel.webContents.executeJavaScript("location.pathname.endsWith('/controls.html') && !!document.querySelector('#version').textContent"))break;}catch{}await sleep(50);}assert(await panel.webContents.executeJavaScript("location.pathname.endsWith('/controls.html') && document.querySelector('#feedbackInvite').hidden && !document.querySelector('#localSound').checked===current.player.localMuted"),'returning from author page must retain settings and invitation cooldown');
  await sleep(300);assert.equal(panel.isVisible(),false,'isolated UI test must keep its panel hidden');
  fs.writeFileSync(path.join(output,'controls.png'),(await panel.webContents.capturePage()).toPNG());panel.close();
  fs.writeFileSync(path.join(output,'player.png'),(await mainWindow.webContents.capturePage()).toPNG());
  const report={version:app.getVersion(),platform:process.platform,arch:process.arch,status:'passed',bounds:mainWindow.getBounds(),checks:['default mute','local toggle','boss forced mute and preference restore','real local BrowserView fixture','live sound toggle','hidden live mute','boss prevents live view resurfacing','feedback and diagnostic controls','internal author page, offline QR images and return navigation'],scope:'isolated userData; no global keys, user media, external web or outgoing feedback'};
  fs.writeFileSync(path.join(output,'ui-smoke.json'),JSON.stringify(report,null,2));console.log('SMOKE_OK '+JSON.stringify(report));
 }finally{clearTimeout(watchdog);server?.close();app.quit();}
}
module.exports={run};

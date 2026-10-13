const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run({app,mainWindow,liveView,callbacks,dispatch,getState}){
 const watchdog=setTimeout(()=>{console.error('SMOKE_TIMEOUT');app.exit(2);},60000);
 const evaluate=expression=>mainWindow.webContents.executeJavaScript(expression,true);
 const waitFor=async(expression)=>{for(let i=0;i<100;i++){try{if(await evaluate(expression))return;}catch{}await sleep(50);}throw Error('UI not ready: '+expression);};
 const output=process.env.PAID_SMOKE_OUTPUT||process.cwd();fs.mkdirSync(output,{recursive:true});
 let server,closeListener,completed=false;
 try{
  await waitFor('typeof window.api!=="undefined" && document.querySelector("#ad-brand").textContent && [...document.querySelectorAll(".cover-image")].every(i=>i.complete&&i.naturalWidth>0)');
  const noDisclosure=async()=>assert(await evaluate('!/(本地|静音|开声|设置|反馈|文件夹|默认|捞鱼)/.test(document.body.innerText) && !document.querySelector("#open-controls,#open-feedback,#sound-toggle,#play-status")'),'card must not disclose software controls or diagnostics');
  await noDisclosure();
  await sleep(250);
  fs.writeFileSync(path.join(output,'player-empty.png'),(await mainWindow.webContents.capturePage()).toPNG());
  assert(await evaluate('document.querySelector("#video").muted'));
  callbacks.onToggleLocalSound();await waitFor('!document.querySelector("#video").muted');
  const fixtureFolder=path.join(app.getPath('userData'),'fixture-media');fs.mkdirSync(fixtureFolder);fs.copyFileSync(path.join(__dirname,'../tests/fixtures/silent.webm'),path.join(fixtureFolder,'silent.webm'));
  await evaluate('document.querySelector("#video").loop=true;openFolder('+JSON.stringify(fixtureFolder)+')');await waitFor('document.querySelector("#video").readyState>=2 && document.querySelector("#video").currentTime>0');
  await noDisclosure();fs.writeFileSync(path.join(output,'player-playing.png'),(await mainWindow.webContents.capturePage()).toPNG());
  assert.equal(await evaluate('document.querySelector("#video").muted'),false);
  dispatch({type:'toggle-boss'});await waitFor('!document.querySelector("#boss-overlay").hidden');assert.equal(await evaluate('document.querySelector("#video").muted'),true);
  await noDisclosure();fs.writeFileSync(path.join(output,'player-boss.png'),(await mainWindow.webContents.capturePage()).toPNG());
  dispatch({type:'toggle-boss'});await waitFor('document.querySelector("#boss-overlay").hidden');assert.equal(await evaluate('document.querySelector("#video").muted'),false);
  await evaluate('openFolder('+JSON.stringify(path.join(fixtureFolder,'missing'))+')');assert.equal(getState().phase,'error');await noDisclosure();
  await evaluate('openFolder('+JSON.stringify(fixtureFolder)+')');
  // The fixture is local, deliberately silent, and has no user account/session.
  server=http.createServer((req,res)=>{if(req.url==='/fail'){req.socket.destroy();return;}if(req.url==='/fixture.webm'){res.setHeader('Content-Type','video/webm');fs.createReadStream(path.join(__dirname,'../tests/fixtures/silent.webm')).pipe(res);}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local playback fixture</title><video autoplay muted loop src="/fixture.webm"></video>');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  callbacks.onSelectFavorite('http://127.0.0.1:'+server.address().port);
  for(let i=0;i<100&&getState().phase!=='ready';i++)await sleep(50);
  assert.equal(getState().phase,'ready');assert.equal(liveView.webContents.isAudioMuted(),true);
  const aligned=async(setup=false)=>{const dom=await evaluate('(()=>{const r=document.querySelector("#stage").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()');if(setup){dom.y+=32;dom.height-=32;}const native=liveView.getBounds();for(const key of ['x','y','width','height'])assert(Math.abs(native[key]-dom[key])<=1,'native live view must align at fractional display scale: '+JSON.stringify({dom,native}));};
  await aligned();callbacks.onToggleSetupMode();await sleep(100);await aligned(true);callbacks.onToggleSetupMode();
  let decoded=false;for(let i=0;i<100;i++){decoded=await liveView.webContents.executeJavaScript('document.querySelector("video")?.readyState>=2 && document.querySelector("video")?.currentTime>0');if(decoded)break;await sleep(50);}assert(decoded,'native BrowserView media did not decode/play fixture');
  callbacks.onToggleLiveSound();assert.equal(liveView.webContents.isAudioMuted(),false);
  dispatch({type:'toggle-boss'});assert.equal(liveView.webContents.isAudioMuted(),true);assert.equal(liveView.getBounds().height,0);
  dispatch({type:'toggle-boss'});assert.equal(liveView.webContents.isAudioMuted(),false);assert(liveView.getBounds().height>0);
  callbacks.onSelectFavorite('http://127.0.0.1:'+server.address().port+'/fail');for(let i=0;i<100&&getState().phase!=='error';i++)await sleep(50);assert.equal(getState().phase,'error');assert.equal(liveView.webContents.isAudioMuted(),true);assert.equal(liveView.getBounds().height,0);await waitFor('!document.querySelector("#video-empty").hidden');await noDisclosure();
  await callbacks.onSelectFavorite('http://127.0.0.1:'+server.address().port+'/retry');assert.equal(getState().phase,'ready');assert.equal(liveView.webContents.isAudioMuted(),false);
  callbacks.onToggleLive();assert.equal(liveView.webContents.isAudioMuted(),true);
  callbacks.onOpenFeedback();await sleep(100);const panel=callbacks.onOpenControls();
  let panelReady=false;
  for(let i=0;i<200;i++){try{panelReady=await panel.webContents.executeJavaScript('typeof window.controls!=="undefined" && document.querySelector("#localSound").checked && !!document.querySelector("#version").textContent');if(panelReady)break;}catch{}await sleep(50);}
  assert(panelReady,'controls did not initialize: '+await panel.webContents.executeJavaScript('document.querySelector("#message").textContent'));
  assert(await panel.webContents.executeJavaScript("document.activeElement.id==='note' && document.querySelector('#feedbackSection').getBoundingClientRect().top>=0 && document.querySelector('#feedbackSection').getBoundingClientRect().top<innerHeight"),'first-level feedback entry must directly reveal the form');
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
  callbacks.onOpenFeedback();for(let i=0;i<100;i++){try{if(await panel.webContents.executeJavaScript("location.pathname.endsWith('/controls.html') && document.activeElement.id==='note'"))break;}catch{}await sleep(50);}assert(await panel.webContents.executeJavaScript("location.pathname.endsWith('/controls.html') && document.activeElement.id==='note' && document.querySelector('#feedbackInvite').hidden"),'feedback entry must work while the existing window shows the author page');
  await panel.webContents.executeJavaScript("document.querySelector('#aboutAuthor').click();true");for(let i=0;i<100;i++){try{if(await panel.webContents.executeJavaScript("location.pathname.endsWith('/about.html') && !!document.querySelector('#backToSettings')"))break;}catch{}await sleep(50);}
  await panel.webContents.executeJavaScript("document.querySelector('#backToSettings').click();true");for(let i=0;i<100;i++){try{if(await panel.webContents.executeJavaScript("location.pathname.endsWith('/controls.html') && !!document.querySelector('#version').textContent"))break;}catch{}await sleep(50);}assert(await panel.webContents.executeJavaScript("location.pathname.endsWith('/controls.html') && document.querySelector('#feedbackInvite').hidden && !document.querySelector('#localSound').checked===current.player.localMuted"),'returning from author page must retain settings and invitation cooldown');
  await sleep(300);assert.equal(panel.isVisible(),false,'isolated UI test must keep its panel hidden');
  fs.writeFileSync(path.join(output,'controls.png'),(await panel.webContents.capturePage()).toPNG());panel.close();
  fs.writeFileSync(path.join(output,'player.png'),(await mainWindow.webContents.capturePage()).toPNG());
  await noDisclosure();assert.equal(mainWindow.isVisible(),false);
  const report={version:app.getVersion(),platform:process.platform,arch:process.arch,status:'passed',bounds:mainWindow.getBounds(),checks:['default mute','local tray toggle and real silent local media decoding','boss forced mute and preference restore','offline coherent cover without player controls in empty/playing/boss/error states','real local BrowserView fixture','native webpage alignment including setup and fractional DPI','live sound toggle','failed webpage hides and mutes then restores preference on successful retry','hidden live mute','boss prevents live view resurfacing','feedback and diagnostic controls','internal author page, offline QR images and return navigation','tray first-level feedback entry, including from author page'],scope:'isolated userData; all windows hidden; no global keys, user media, external web or outgoing feedback; actual close reported separately in close-card.json'};
  fs.writeFileSync(path.join(output,'ui-smoke.json'),JSON.stringify(report,null,2));console.log('SMOKE_OK '+JSON.stringify(report));
  server.closeAllConnections();server.close();server=null;
  closeListener=()=>{completed=true;fs.writeFileSync(path.join(output,'close-card.json'),JSON.stringify({status:'passed',action:'actual renderer close button triggered app.quit; parent process must return zero'}));console.log('CARD_CLOSE_OK');};app.once('before-quit',closeListener);
  await evaluate('document.querySelector("#close-card").click();true');await sleep(300);throw Error('Close button did not quit the application');
 }finally{if(closeListener)app.removeListener('before-quit',closeListener);clearTimeout(watchdog);server?.closeAllConnections();server?.close();if(!completed)app.exit(2);else app.quit();}
}
module.exports={run};

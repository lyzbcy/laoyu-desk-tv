const $=id=>document.getElementById(id);let current,draft,busyFeedback=false,draftRevision=0;
function render(state){
 current=state;$('version').textContent=`${state.version} · ${state.platform}/${state.architecture}`;
 $('feedbackInvite').hidden=state.engagement?.invite!==true;
 const privacy=state.privacy||{};$('privacyEnabled').checked=privacy.enabled!==false;$('autoPrivacyCheck').checked=privacy.autoCheck!==false;$('privacyStatus').textContent=privacy.running?'正在静默自检…':privacy.summary||'保护状态尚未读取';$('privacyCheck').disabled=privacy.running||privacy.enabled===false;
 $('privacyItems').replaceChildren(...(privacy.items||[]).map(item=>{const li=document.createElement('li');li.textContent=({pass:'通过',warning:'未完整验证',fail:'未通过'}[item.level]||'未验证')+' · '+item.label+'：'+item.detail;return li;}));
 $('localSound').checked=!state.player.localMuted;$('liveSound').checked=!state.player.liveMuted;
 $('playStatus').textContent=state.player.bossOn?'当前广告模式，所有声音已静音':state.message;
 $('hotkey').textContent='老板键：'+state.hotkey;
 const update=state.updater||{},labels={idle:'每天首次打开自动检查',checking:'正在检查新版…',current:'已是最新正式版',available:'发现新版 '+update.version,downloading:'正在下载并校验…',installing:'正在更新，请等待自动重启',error:'更新暂未完成'};
 $('updateStatus').textContent=update.cached&&update.phase==='available'?'上次确认的新版 '+update.version+'（更新前重新核实）':labels[update.phase]||'尚未检查';$('updateHint').textContent=update.error||update.previousFailure||update.notes||'下载后验证完整性，更新保留声音设置和视频目录。国内访问 GitHub 较慢时可以使用已有代理。';
 const busy=['checking','downloading','installing'].includes(update.phase);$('check').disabled=busy;$('install').disabled=busy;$('install').hidden=!update.available;
 $('progress').hidden=!update.progress;if(update.progress){$('progress').value=update.progress.total?update.progress.bytes/update.progress.total*100:0;}
}
async function action(fn){try{return await fn();}catch(e){$('message').textContent=e.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/,'');}}
for(const [id,source] of [['localSound','local'],['liveSound','live']])$(id).addEventListener('change',async()=>{const result=await action(()=>window.controls.sound(source,$(id).checked));if(result)render(result);else if(current)render(current);});
$('check').onclick=()=>action(()=>window.controls.check());$('install').onclick=()=>action(()=>window.controls.install());$('release').onclick=()=>action(()=>window.controls.release());
$('export').onclick=async()=>{if(await action(()=>window.controls.exportLogs()))$('message').textContent='诊断 ZIP 已导出';};
function invalidateDraft(){draftRevision++;const token=draft?.token;draft=null;if(token)window.controls.cancelFeedback(token).catch(()=>{});$('feedbackBody').textContent='';$('feedbackLogs').textContent='';$('feedbackAttachment').textContent='';$('feedbackPreview').hidden=true;$('feedback').hidden=true;}
function feedbackBusy(value){busyFeedback=value;for(const id of ['previewFeedback','feedback','note','category','includeLogs'])$(id).disabled=value;}
for(const id of ['category','note','includeLogs'])$(id).addEventListener(id==='note'?'input':'change',invalidateDraft);
$('previewFeedback').onclick=async()=>{if(busyFeedback)return;const revision=draftRevision;feedbackBusy(true);try{const next=await action(()=>window.controls.prepareFeedback({category:$('category').value,note:$('note').value,includeLogs:$('includeLogs').checked}));if(!next)return;if(revision!==draftRevision){await window.controls.cancelFeedback(next.token);$('message').textContent='备注已修改，请重新预览';return;}draft=next;$('feedbackBody').textContent=next.body;$('feedbackLogs').textContent=next.logs||'本次不附加日志。';$('feedbackAttachment').textContent=next.attachmentName?'附件：'+next.attachmentName+' · '+next.attachmentBytes+' 字节':'本次不附加诊断 ZIP';$('feedbackPreview').hidden=false;$('feedback').hidden=false;$('message').textContent=next.needsPaste?'备注较长，打开反馈页时会复制内容，需你粘贴后确认提交。':'请检查内容；打开反馈页不会自动替你提交。';}finally{feedbackBusy(false);}};
$('feedback').onclick=async()=>{if(busyFeedback||!draft)return;feedbackBusy(true);try{const result=await action(()=>window.controls.feedback(draft.token));if(result){$('message').textContent=(result.needsPaste?'长备注已复制，请粘贴并确认提交。':'反馈页已填好，请确认后提交。')+(result.attachment?'诊断 ZIP 已保存到下载目录，可拖入 GitHub 附件。':'');invalidateDraft();}}finally{feedbackBusy(false);}};
window.controls.onState(render);window.controls.state().then(render).catch(e=>$('message').textContent=e.message);
$('closeWindow').onclick=()=>window.close();
$('aboutAuthor').onclick=()=>location.assign('about.html');
for(const id of ['privacyEnabled','autoPrivacyCheck'])$(id).onchange=async()=>{const result=await action(()=>window.controls.privacy(id,$(id).checked));if(result)render(result);else if(current)render(current);};
$('privacyCheck').onclick=async()=>{const result=await action(()=>window.controls.selfCheck());if(result)render(result);};
$('dismissInvite').onclick=async()=>{const result=await action(()=>window.controls.dismissInvite());if(result)render(result);};
$('openProject').onclick=()=>action(()=>window.controls.project());
$('writeReview').onclick=()=>{$('category').value='建议与真实评价';invalidateDraft();$('note').scrollIntoView({block:'center'});$('note').focus();};

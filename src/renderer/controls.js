const $=id=>document.getElementById(id);let current;
function render(state){
 current=state;$('version').textContent=`${state.version} · ${state.platform}/${state.architecture}`;
 $('localSound').checked=!state.player.localMuted;$('liveSound').checked=!state.player.liveMuted;
 $('playStatus').textContent=state.player.bossOn?'当前广告模式，所有声音已静音':state.message;
 $('hotkey').textContent='老板键：'+state.hotkey;
 const update=state.updater||{},labels={idle:'每天首次打开自动检查',checking:'正在检查新版…',current:'已是最新正式版',available:'发现新版 '+update.version,downloading:'正在下载并校验…',installing:'正在更新，请等待自动重启',error:'更新暂未完成'};
 $('updateStatus').textContent=labels[update.phase]||'尚未检查';$('updateHint').textContent=update.error||update.notes||'下载后验证完整性，更新保留声音设置和视频目录。国内访问 GitHub 较慢时可以使用已有代理。';
 const busy=['checking','downloading','installing'].includes(update.phase);$('check').disabled=busy;$('install').disabled=busy;$('install').hidden=!update.available;
 $('progress').hidden=!update.progress;if(update.progress){$('progress').value=update.progress.total?update.progress.bytes/update.progress.total*100:0;}
}
async function action(fn){try{return await fn();}catch(e){$('message').textContent=e.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/,'');}}
for(const [id,source] of [['localSound','local'],['liveSound','live']])$(id).addEventListener('change',async()=>{const result=await action(()=>window.controls.sound(source,$(id).checked));if(result)render(result);else if(current)render(current);});
$('check').onclick=()=>action(()=>window.controls.check());$('install').onclick=()=>action(()=>window.controls.install());$('release').onclick=()=>action(()=>window.controls.release());
$('export').onclick=async()=>{if(await action(()=>window.controls.exportLogs()))$('message').textContent='技术日志已导出';};
$('feedback').onclick=async()=>{if(await action(()=>window.controls.feedback({category:$('category').value,note:$('note').value,includeLogs:$('includeLogs').checked})))$('message').textContent='内容已复制，请在打开的 GitHub 页面粘贴并确认提交。';};
window.controls.onState(render);window.controls.state().then(render).catch(e=>$('message').textContent=e.message);

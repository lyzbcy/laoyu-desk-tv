const $=id=>document.getElementById(id);
$('closeWindow').onclick=()=>window.close();
$('backToSettings').onclick=()=>location.replace('controls.html');
for(const button of document.querySelectorAll('.qr-open'))button.onclick=()=>{const source=button.querySelector('img');$('qrTitle').textContent=source.alt;$('qrImage').src=source.src;$('qrImage').alt=source.alt;$('qrPreview').showModal();};
$('closeQr').onclick=()=>{$('qrPreview').close();$('qrImage').removeAttribute('src');};
$('qrPreview').addEventListener('cancel',()=>{$('qrImage').removeAttribute('src');});
$('authorHome').onclick=async()=>{try{await window.controls.authorHome();$('message').textContent='个人主页已打开';}catch{$('message').textContent='暂时无法打开个人主页，请重试。'}};
window.controls.state().then(state=>{$('version').textContent='捞鱼桌脚看电视 '+state.version+' · '+state.platform+'/'+state.architecture;}).catch(()=>{$('version').textContent='捞鱼桌脚看电视';});

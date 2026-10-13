// Browser visual regression only. Native playback/update checks run separately.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),{initialState,transition,viewState}=require('../src/core/playerState');
const {createFeedback}=require('../src/main/feedback'),{shouldInvite}=require('../src/core/engagement'),{day}=require('../src/core/updateRelease');
const {AD_TEMPLATES}=require('../src/core/ads');
let player=initialState({}),phase='idle',message='默认静音，可点击声音开关开启',privacyEnabled=true,autoPrivacyCheck=true;
let engagement={activeDays:3,lastDismissDay:''},previewUpdate={phase:'idle',available:false};const previewFeedback=createFeedback({version:require('../package.json').version,platform:'win32',architecture:'x64',summary:()=>JSON.stringify({at:new Date().toISOString(),level:'info',event:'app.start',version:require('../package.json').version}),saveArchive:async()=>{},openExternal:async()=>{},copyText:()=>{}});
const snapshot=()=>({version:require('../package.json').version,platform:'win32',architecture:'x64',player:viewState(player),phase,message,hotkey:'Ctrl+Alt+Q',updater:previewUpdate,engagement:{invite:shouldInvite(engagement)},privacy:{enabled:privacyEnabled,autoCheck:autoPrivacyCheck,running:false,level:'warning',items:[],summary:'隔离预览：不执行真实防捕获，自检结果未验证'}});
const bridge=`
(() => {
const callbacks=[];const emit=s=>callbacks.forEach(f=>f(s));
async function state(){return (await fetch('/state.json')).json();}
async function action(type,data={}){const s=await(await fetch('/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,...data})})).json();emit(s);return s;}
async function feedbackRequest(url,data){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),value=await response.json();if(!response.ok)throw Error(value.error);return value;}
window.api={ads:()=>({AD_TEMPLATES:${JSON.stringify(AD_TEMPLATES)}}),rotator:{nextIndex:(i,n)=>(i+1)%n,randomOtherIndex:(i,n)=>(i+1)%n},getConfig:async()=>({videoFolder:null}),getPlayerState:state,onPlayerState:f=>callbacks.push(f),toggleSound:()=>action('toggle-sound'),openCatalog:async()=>{window.previewCatalogOpened=true;return true;},openControls:()=>window.open('/controls.html'),openFeedback:()=>location.assign('/controls.html#feedbackSection'),scanVideos:async()=>[{name:'silent',url:'/silent.webm'}],pickFolder:async()=>null,setFolder:async()=>true,videoEnded:()=>{},mediaError:()=>{},closeCard:()=>document.querySelector('#app').remove(),onPickFolderFromTray:()=>{},onSetupMode:()=>{},navigateLive:()=>{}};
window.controls={state,sound:(source,on)=>action('sound',{source,on}),privacy:(key,value)=>action('privacy',{key,value}),selfCheck:state,check:()=>action('check'),install:()=>Promise.reject(Error('视觉夹具不会执行安装')),release:async()=>true,exportLogs:async()=>true,prepareFeedback:payload=>feedbackRequest('/feedback-preview',payload),feedback:token=>feedbackRequest('/feedback-submit',{token}),cancelFeedback:token=>feedbackRequest('/feedback-cancel',{token}),dismissInvite:()=>action('dismiss-invite'),project:async()=>true,authorHome:async()=>true,onState:f=>callbacks.push(f)};
setInterval(()=>state().then(emit),300);
document.addEventListener('DOMContentLoaded',()=>{const v=document.querySelector('video');if(v)v.loop=true;});
document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.altKey&&e.key.toLowerCase()==='q'){e.preventDefault();action('boss');}});
window.refreshPreviewState=()=>state().then(emit);
})();
`;
const server=http.createServer((req,res)=>{
 req.setEncoding('utf8');
 if(/^\/assets\/promotion\/(airpods-buddy|laoyu-screen-switch|nettools)\.png$/.test(req.url)){res.setHeader('Content-Type','image/png');fs.createReadStream(path.join(root,'src/renderer',req.url.slice(1))).pipe(res);return;}
 const asset=/^\/assets\/(icon\.png|author\/(?:pZmPZPH\.png|sticker-qr\.png|reward-qr\.jpg|qq-group\.jpg))$/.exec(req.url);if(asset){res.setHeader('Content-Type',asset[1].endsWith('.png')?'image/png':'image/jpeg');fs.createReadStream(path.join(root,'assets',asset[1])).pipe(res);return;}
 if(['/feedback-preview','/feedback-submit','/feedback-cancel'].includes(req.url)&&req.method==='POST'){let body='';req.on('data',b=>{body+=b;if(body.length>48000)req.destroy();});req.on('end',async()=>{res.setHeader('Content-Type','application/json');try{const value=JSON.parse(body),result=req.url==='/feedback-preview'?previewFeedback.prepare(value,1):req.url==='/feedback-cancel'?previewFeedback.cancel(value.token,1):await previewFeedback.submit(value.token,1);res.end(JSON.stringify(result));}catch{res.statusCode=400;res.end(JSON.stringify({error:'隔离预览请求未完成，请检查备注并重新预览'}));}});return;}
 if(req.url==='/preview.css'){res.setHeader('Content-Type','text/css');res.end('html,body{margin:0;padding:0;background:#ececec}body:has(#app){padding:32px 16px}#app{width:360px;height:320px}body:not(:has(#app)){max-width:570px;margin:32px auto}');return;}
 if(req.url==='/state.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(snapshot()));return;}
 if(req.url==='/action'&&req.method==='POST'){let body='';req.on('data',b=>{body+=b;if(body.length>4096)req.destroy();});req.on('end',()=>{try{const a=JSON.parse(body);if(a.type==='dismiss-invite')engagement={...engagement,lastDismissDay:day()};if(a.type==='check')previewUpdate={phase:'available',available:true,cached:true,version:'0.3.5'};if(a.type==='privacy'&&typeof a.value==='boolean'){if(a.key==='privacyEnabled')privacyEnabled=a.value;if(a.key==='autoPrivacyCheck')autoPrivacyCheck=a.value;}if(a.type==='boss')player=transition(player,{type:'toggle-boss'});if(a.type==='toggle-sound')player=transition(player,{type:player.liveOn?'live-sound':'local-sound',value:player.liveOn?player.liveMuted:player.localMuted});if(a.type==='sound')player=transition(player,{type:a.source==='live'?'live-sound':'local-sound',value:a.on});res.setHeader('Content-Type','application/json');res.end(JSON.stringify(snapshot()));}catch{res.writeHead(400);res.end('{}')}});return;}
 if(req.url==='/preview-api.js'){res.setHeader('Content-Type','application/javascript');res.end(bridge);return;}
 if(req.url==='/silent.webm'){const file=path.join(root,'tests/fixtures/silent.webm'),size=fs.statSync(file).size;const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');const start=match?Number(match[1]):0,end=match&&match[2]?Math.min(Number(match[2]),size-1):size-1;res.setHeader('Content-Type','video/webm');res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Length',end-start+1);if(match){res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);}fs.createReadStream(file,{start,end}).pipe(res);return;}
 const file=req.url==='/'||req.url==='/player.html'?'index.html':req.url.slice(1).split('?')[0];
 if(!/^[a-zA-Z0-9.-]+$/.test(file)){res.writeHead(404);res.end();return;}
 const target=path.join(root,'src/renderer',file);if(!fs.existsSync(target)){res.writeHead(404);res.end();return;}
 let text=fs.readFileSync(target);const ext=path.extname(file);res.setHeader('Content-Type',ext==='.html'?'text/html; charset=utf-8':ext==='.js'?'application/javascript':'text/css');
 if(ext==='.html')text=text.toString().replace("connect-src 'none'","connect-src 'self'").replace('</head>','<script src="/preview-api.js"></script><link rel="stylesheet" href="/preview.css"></head>').replace('<body>','<body><div style="position:fixed;left:0;top:0;padding:4px;font-size:10px;background:#eee;color:#333">隔离视觉预览：主进程为回归夹具，不证明真实播放或更新。</div>');
 res.end(text);
});
const port=Number(process.argv[2]||process.env.PAID_PREVIEW_PORT||49835);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid preview port');server.listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port+'/player.html'));

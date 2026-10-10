// Browser visual regression only. Native playback/update checks run separately.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),{initialState,transition,viewState}=require('../src/core/playerState');
let player=initialState({}),phase='idle',message='默认静音，可点击声音开关开启';
const snapshot=()=>({version:require('../package.json').version,platform:'win32',architecture:'x64',player:viewState(player),phase,message,hotkey:'Ctrl+Alt+Q',updater:{phase:'idle',available:false}});
const bridge=`
(() => {
const callbacks=[];const emit=s=>callbacks.forEach(f=>f(s));
async function state(){return (await fetch('/state.json')).json();}
async function action(type,data={}){const s=await(await fetch('/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,...data})})).json();emit(s);return s;}
window.api={ads:()=>({AD_TEMPLATES:[{title:'假广告示例',subtitle:'视觉回归预览',button:'查看详情',bg:'#b42c37'},{title:'仅为回归夹具',subtitle:'无真实广告投放',button:'查看详情',bg:'#3457a5'}]}),rotator:{nextIndex:(i,n)=>(i+1)%n,randomOtherIndex:(i,n)=>(i+1)%n},getConfig:async()=>({videoFolder:'fixture'}),getPlayerState:state,onPlayerState:f=>callbacks.push(f),toggleSound:()=>action('toggle-sound'),openControls:()=>window.open('/controls.html'),scanVideos:async()=>[{name:'silent',url:'/silent.webm'}],pickFolder:async()=>null,setFolder:async()=>true,videoEnded:()=>{},mediaError:()=>{},fakeClose:()=>{},onPickFolderFromTray:()=>{},onSetupMode:()=>{},navigateLive:()=>{}};
window.controls={state,sound:(source,on)=>action('sound',{source,on}),check:()=>action('check'),install:()=>Promise.reject(Error('视觉夹具不会执行安装')),release:async()=>true,exportLogs:async()=>true,feedback:async()=>true,onState:f=>callbacks.push(f)};
setInterval(()=>state().then(emit),300);
document.addEventListener('DOMContentLoaded',()=>{const v=document.querySelector('video');if(v)v.loop=true;});
document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.altKey&&e.key.toLowerCase()==='q'){e.preventDefault();action('boss');}});
window.refreshPreviewState=()=>state().then(emit);
})();
`;
const server=http.createServer((req,res)=>{
 if(req.url==='/preview.css'){res.setHeader('Content-Type','text/css');res.end('html,body{margin:0;padding:0;background:#ececec}body:has(#app){padding:32px 16px}#app{width:360px;height:640px}body:not(:has(#app)){max-width:570px;margin:32px auto}');return;}
 if(req.url==='/state.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(snapshot()));return;}
 if(req.url==='/action'&&req.method==='POST'){let body='';req.on('data',b=>{body+=b;if(body.length>4096)req.destroy();});req.on('end',()=>{const a=JSON.parse(body);if(a.type==='boss')player=transition(player,{type:'toggle-boss'});if(a.type==='toggle-sound')player=transition(player,{type:player.liveOn?'live-sound':'local-sound',value:player.liveOn?player.liveMuted:player.localMuted});if(a.type==='sound')player=transition(player,{type:a.source==='live'?'live-sound':'local-sound',value:a.on});res.setHeader('Content-Type','application/json');res.end(JSON.stringify(snapshot()));});return;}
 if(req.url==='/preview-api.js'){res.setHeader('Content-Type','application/javascript');res.end(bridge);return;}
 if(req.url==='/silent.webm'){const file=path.join(root,'tests/fixtures/silent.webm'),size=fs.statSync(file).size;const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');const start=match?Number(match[1]):0,end=match&&match[2]?Math.min(Number(match[2]),size-1):size-1;res.setHeader('Content-Type','video/webm');res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Length',end-start+1);if(match){res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);}fs.createReadStream(file,{start,end}).pipe(res);return;}
 const file=req.url==='/'||req.url==='/player.html'?'index.html':req.url.slice(1).split('?')[0];
 if(!/^[a-zA-Z0-9.-]+$/.test(file)){res.writeHead(404);res.end();return;}
 const target=path.join(root,'src/renderer',file);if(!fs.existsSync(target)){res.writeHead(404);res.end();return;}
 let text=fs.readFileSync(target);const ext=path.extname(file);res.setHeader('Content-Type',ext==='.html'?'text/html; charset=utf-8':ext==='.js'?'application/javascript':'text/css');
 if(ext==='.html')text=text.toString().replace("connect-src 'none'","connect-src 'self'").replace('</head>','<script src="/preview-api.js"></script><link rel="stylesheet" href="/preview.css"></head>').replace('<body>','<body><div style="position:fixed;left:0;top:0;padding:4px;font-size:10px;background:#eee;color:#333">隔离视觉预览：主进程为回归夹具，不证明真实播放或更新。</div>');
 res.end(text);
});
server.listen(49835,'127.0.0.1',()=>console.log('http://127.0.0.1:49835/player.html'));

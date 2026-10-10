const {BrowserWindow,screen,powerMonitor}=require('electron'),cp=require('node:child_process');
const native=require('./nativePrivacy'),{summarize,captureResult}=require('../core/privacyResult');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const probes=new Set();
async function capture(win,roi){
 const handle=win.getNativeWindowHandle(),hwnd=handle.length===8?handle.readBigUInt64LE():BigInt(handle.readUInt32LE());
 const crop=roi?`$sx=$w/${roi.viewportWidth};$sy=$h/${roi.viewportHeight};$p.X+=[int][Math]::Round(${roi.x}*$sx);$p.Y+=[int][Math]::Round(${roi.y}*$sy);$w=[int][Math]::Round(${roi.width}*$sx);$h=[int][Math]::Round(${roi.height}*$sy);`:'';
 // Only the tiny, controlled probe rectangle is sampled. No screenshot file is produced.
 const script=`$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Drawing;Add-Type @'
using System;using System.Runtime.InteropServices;
public class ProbeRect { [StructLayout(LayoutKind.Sequential)] public struct Rect {public int L,T,R,B;} [StructLayout(LayoutKind.Sequential)] public struct Point {public int X,Y;} [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c); [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h,out Rect r); [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h,ref Point p); [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr h); [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr h,IntPtr dc); [DllImport("gdi32.dll")] public static extern bool BitBlt(IntPtr d,int x,int y,int w,int h,IntPtr s,int sx,int sy,uint op); }
'@;
[void][ProbeRect]::SetThreadDpiAwarenessContext([IntPtr]::new(-4));
$r=New-Object ProbeRect+Rect;$p=New-Object ProbeRect+Point;$hwnd=[IntPtr]::new([Int64]${hwnd});if(-not[ProbeRect]::GetClientRect($hwnd,[ref]$r) -or -not[ProbeRect]::ClientToScreen($hwnd,[ref]$p)){throw 'probe unavailable'};$w=$r.R-$r.L;$h=$r.B-$r.T;${crop}if($w -lt 4 -or $h -lt 4 -or $w -gt 192 -or $h -gt 192){throw 'invalid probe'};
$b=New-Object Drawing.Bitmap $w,$h;$g=[Drawing.Graphics]::FromImage($b);try{$dst=$g.GetHdc();$src=[ProbeRect]::GetDC([IntPtr]::Zero);try{if(-not[ProbeRect]::BitBlt($dst,0,0,$w,$h,$src,$p.X,$p.Y,0x00CC0020)){throw 'capture unavailable'}}finally{$g.ReleaseHdc($dst);[void][ProbeRect]::ReleaseDC([IntPtr]::Zero,$src)};$sampled=0;$leaked=0;for($y=0;$y -lt $h;$y++){for($x=0;$x -lt $w;$x++){$c=$b.GetPixel($x,$y);$sampled++;if($c.R -gt 230 -and $c.G -lt 20 -and $c.B -gt 210){$leaked++}}};@{sampled=$sampled;leaked=$leaked}|ConvertTo-Json -Compress}finally{$g.Dispose();$b.Dispose()}`;
 const output=await new Promise((resolve,reject)=>cp.execFile('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:10000,maxBuffer:4096},(e,out)=>e?reject(e):resolve(out)));
 return JSON.parse(output.trim());
}
async function actualWindow(win){
 try{
  const roi=await win.webContents.executeJavaScript(`(()=>{const mark=document.createElement('div');mark.id='paid-privacy-check-marker';Object.assign(mark.style,{position:'fixed',left:'12px',bottom:'4px',width:'16px',height:'16px',background:'#ff00ee',zIndex:'2147483647',pointerEvents:'none'});document.body.append(mark);const r=mark.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight};})()`);
  if(!Object.values(roi).every(Number.isFinite)||roi.width<=0||roi.height<=0)throw Error('marker unavailable');await sleep(180);
  const image=await win.webContents.capturePage({x:Math.round(roi.x),y:Math.round(roi.y),width:16,height:16}),bytes=image.toBitmap();let marked=0;for(let i=0;i<bytes.length;i+=4)if(bytes[i+2]>230&&bytes[i+1]<20&&bytes[i]>210)marked++;
  if(!bytes.length||marked/(bytes.length/4)<0.8)return {level:'warning',detail:'真实播放器标记没有完成绘制，本轮不能判定捕获结果。'};
  const sampled=await capture(win,roi);return {...captureResult({...sampled,foregroundSame:true,baselineVisible:true}),...sampled};
 }catch{return {level:'warning',detail:'真实播放器捕获校验未完成，不记为通过。'};}
 finally{if(!win.isDestroyed())await win.webContents.executeJavaScript("document.getElementById('paid-privacy-check-marker')?.remove()").catch(()=>{});}
}
async function probe(main){
 if(process.platform!=='win32')return {level:'warning',detail:'Mac的ScreenCaptureKit可能绕过窗口保护，请在目标共享软件预览中确认。'};
 if(!main||main.isDestroyed()||!main.isVisible())return {level:'warning',detail:'播放器尚未显示，本轮外部捕获未验证。'};
 const b=main.getBounds(),area=screen.getDisplayMatching(b).workArea;
 const options={title:'paid-to-watch-privacy-probe',width:8,height:8,x:Math.max(area.x,Math.min(b.x+b.width+8,area.x+area.width-8)),y:Math.max(area.y,Math.min(b.y+b.height-8,area.y+area.height-8)),show:false,frame:false,hasShadow:false,thickFrame:false,backgroundColor:'#ff00ee',focusable:false,skipTaskbar:true,resizable:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}};
 const create=()=>{const win=new BrowserWindow(options);probes.add(win.id);win.setAlwaysOnTop(true,'screen-saver');native.toolWindow(win,true);return win;};
 let win=create();const before=native.foreground();
 try{
  await win.loadURL('data:text/html,<html style="background:%23ff00ee"><body></body></html>');win.showInactive();win.moveTop();await sleep(120);native.apply(win,false);await sleep(100);const baseline=await capture(win);
  probes.delete(win.id);win.destroy();await sleep(300);win=create();win.setPosition(b.x+12,b.y+12,false);native.apply(win,true);await win.loadURL('data:text/html,<html style="background:%23ff00ee"><body></body></html>');win.showInactive();win.moveTop();await sleep(150);native.apply(win,true);await sleep(150);
  const protectedSample=await capture(win),actual=await actualWindow(main),after=native.foreground(),result=captureResult({...protectedSample,baselineVisible:baseline.sampled>=16&&baseline.leaked/baseline.sampled>0.8,foregroundSame:!!before&&before===after,focusWasProbe:native.isForeground(win)});
  const overall=result.level==='fail'?result:actual.level==='fail'?actual:result.level==='warning'?result:actual;
  return {...overall,baseline,protectedSample,protectedNative:native.inspect(win),actualWindow:actual};
 }catch{return {level:'warning',detail:'外部捕获探针未能完成，不能把API调用成功当作捕获验证通过。'};}
 finally{probes.delete(win.id);if(!win.isDestroyed())win.destroy();}
}
function createPrivacy({app,config,mainWindow,hotkeyReady,notify,logger,smoke}){
 let result={level:'warning',items:[],summary:'正在准备无感自检'},running,timer,revision=0,closed=false;
 const enabled=()=>config().privacyEnabled!==false,auto=()=>config().autoPrivacyCheck!==false;
 function apply(win){if(probes.has(win.id)||win.isDestroyed())return;if(win===mainWindow()){const interactive=win.__setupMode===true;win.setFocusable(!enabled()||interactive);win.setSkipTaskbar(enabled()&&!interactive);native.toolWindow(win,enabled()&&!interactive);}native.apply(win,enabled());if(process.platform==='darwin'){if(enabled())app.dock?.hide();else app.dock?.show();}}
 function attach(win){apply(win);for(const event of ['show','restore','ready-to-show'])win.on(event,()=>{apply(win);setTimeout(()=>{if(!closed)apply(win);},150);});}
 function changed(){if(closed)return;revision++;result={level:'warning',items:[],summary:enabled()?'窗口发生变化，等待核对保护状态':'无感保护已关闭，窗口可被捕获'};notify?.();schedule();}
 const onWindow=(_event,win)=>{if(win.getTitle()==='paid-to-watch-privacy-probe')return;attach(win);win.once('closed',changed);changed();};app.on('browser-window-created',onWindow);
 const snapshot=()=>({enabled:enabled(),autoCheck:auto(),running:!!running,...result});
 async function run({captureProbe=true}={}){
  if(running)return running;const generation=revision;
  running=(async()=>{
   if(!enabled()){result={level:'warning',items:[],summary:'无感保护已关闭，窗口可被捕获',ranAt:new Date().toISOString()};notify?.();return snapshot();}
   const items=[];for(const win of BrowserWindow.getAllWindows().filter(w=>!probes.has(w.id))){apply(win);const check=native.inspect(win),isMain=win===mainWindow();items.push({id:'window-'+win.id,label:isMain?'播放器保护':'设置窗口保护',level:process.platform==='win32'?(check?.protected?'pass':'fail'):'warning',detail:process.platform==='win32'?(check?.protected?'已回读原生防捕获标志。':'原生防捕获未能确认。'):'已请求Mac窗口保护；现代捕获路径仍需预览确认。'});if(isMain&&!win.__setupMode)items.push({id:'focus',label:'浮窗不抢焦点',level:process.platform==='win32'?(check?.noActivate?'pass':'fail'):(win.isFocusable()?'fail':'pass'),detail:win.isFocusable()?'播放器仍可获取焦点。':'播放器不可激活；设置模式可主动输入。'});}
   items.push({id:'hotkey',label:'老板键',level:hotkeyReady()?'pass':'warning',detail:hotkeyReady()?'全局快捷键已注册。':'快捷键未注册，请更换组合键。'});
   const captureItem=captureProbe&&!smoke?await probe(mainWindow()):{level:'warning',detail:smoke?'隔离回归未执行外部桌面捕获。':'本轮仅核对原生状态，外部捕获未重新验证。'};items.push({id:'capture',label:'外部捕获与焦点探针',...captureItem});
   if(generation!==revision||!enabled())return snapshot();result=summarize(items);logger?.log(result.level==='fail'?'warn':'info','privacy.checked',{phase:result.level});notify?.();return snapshot();
  })();try{return await running;}finally{running=null;notify?.();}
 }
 function schedule(){clearTimeout(timer);if(enabled()&&auto()&&!smoke)timer=setTimeout(()=>run({captureProbe:false}).catch(()=>{}),1500);}
 function refresh(){revision++;for(const win of BrowserWindow.getAllWindows())apply(win);result={level:'warning',items:[],summary:enabled()?'无感保护已开启，等待自检':'无感保护已关闭，窗口可被捕获'};notify?.();schedule();}
 const resume=()=>refresh();powerMonitor.on('resume',resume);
 function dispose(){closed=true;revision++;clearTimeout(timer);app.removeListener('browser-window-created',onWindow);powerMonitor.removeListener('resume',resume);}
 return {snapshot,run,refresh,schedule,dispose,apply};
}
module.exports={createPrivacy,probe};

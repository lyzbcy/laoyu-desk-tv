let api;
function native(){if(process.platform!=='win32')return null;if(!api){const koffi=require('koffi'),lib=koffi.load('user32.dll');api={set:lib.func('bool __stdcall SetWindowDisplayAffinity(uintptr_t hwnd, uint32_t affinity)'),get:lib.func('bool __stdcall GetWindowDisplayAffinity(uintptr_t hwnd, _Out_ uint32_t *affinity)'),foreground:lib.func('uintptr_t __stdcall GetForegroundWindow()'),style:lib.func('intptr_t __stdcall GetWindowLongPtrW(uintptr_t hwnd, int index)'),setStyle:lib.func('intptr_t __stdcall SetWindowLongPtrW(uintptr_t hwnd, int index, intptr_t style)')};}return api;}
function handle(win){const bytes=win.getNativeWindowHandle();return bytes.length===8?bytes.readBigUInt64LE():BigInt(bytes.readUInt32LE());}
function apply(win,enabled){if(win.isDestroyed())return false;try{win.setContentProtection(enabled);if(process.platform==='win32'){const ok=Boolean(native().set(handle(win),enabled?0x11:0));win.__privacyErrorCode=ok?0:lastError();return ok;}return true;}catch{return false;}}
let getError;function lastError(){if(!getError)getError=require('koffi').load('kernel32.dll').func('uint32_t __stdcall GetLastError()');return getError();}
function inspect(win){try{const n=native(),affinity=[0],hwnd=handle(win);if(!n||!n.get(hwnd,affinity))return null;const style=BigInt(n.style(hwnd,-20));return {protected:affinity[0]===0x11,affinity:affinity[0],noActivate:(style&0x08000000n)!==0n,toolWindow:(style&0x80n)!==0n,errorCode:win.__privacyErrorCode||0};}catch{return null;}}
function foreground(){try{return String(native()?.foreground()??'');}catch{return '';}}
function toolWindow(win,enabled){try{const n=native();if(!n)return;const h=handle(win),current=BigInt(n.style(h,-20));n.setStyle(h,-20,enabled?(current|0x80n)&~0x40000n:current&~0x80n);}catch{}}
function isForeground(win){try{return foreground()===String(handle(win));}catch{return false;}}
module.exports={apply,inspect,foreground,toolWindow,isForeground};

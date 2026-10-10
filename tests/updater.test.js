import {it,expect} from 'vitest';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import updater from '../src/main/updater.js';
function fixture(version,bytes=Buffer.from('installer')){const name=`laoyu-desk-tv-${version}-${process.platform==='darwin'?'mac':'win'}-${process.arch}${process.platform==='darwin'?'-update':''}.${process.platform==='darwin'?'zip':'exe'}`;return {tag_name:'v'+version,assets:[{name,digest:'sha256:'+crypto.createHash('sha256').update(bytes).digest('hex'),size:bytes.length,browser_download_url:`https://github.com/lyzbcy/laoyu-desk-tv/releases/download/v${version}/${name}`}]};}
it('concurrent checks and installations share work, and quit only after the helper commits',async()=>{
 let config={},queries=0,downloads=0,handovers=0,quits=0;const bytes=Buffer.from('installer'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'paid-concurrent-'));
 const app={getVersion:()=> '0.3.0',getPath:()=>directory,isPackaged:true,quit:()=>quits++};
 const u=updater.createUpdater({app,config:()=>config,save:c=>{config=c;return true;},fetcher:async url=>{await new Promise(r=>setTimeout(r,10));if(url.includes('api.github')){queries++;return Response.json(fixture('0.3.1',bytes));}downloads++;return new Response(bytes);},handoff:async()=>{expect(quits).toBe(0);handovers++;}});
 await Promise.all([u.check(true),u.check(true)]);expect(queries).toBe(1);
 await Promise.all([u.install(),u.install()]);expect(queries).toBe(2);expect(downloads).toBe(1);expect(handovers).toBe(1);expect(quits).toBe(1);
});
it('equal and older releases never download or hand off',async()=>{
 for(const version of ['0.2.1','0.3.0']){let config={},handoffs=0;const u=updater.createUpdater({app:{getVersion:()=> '0.3.0',isPackaged:true},config:()=>config,save:c=>{config=c;return true;},fetcher:async()=>Response.json(fixture(version)),handoff:async()=>handoffs++});await u.check(true);expect(u.snapshot().available).toBe(false);await expect(u.install()).rejects.toThrow('没有可用更新');expect(handoffs).toBe(0);}
});
it('helper readiness failure preserves the running app',async()=>{
 let config={},quits=0;const bytes=Buffer.from('installer'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'paid-helper-'));
 const u=updater.createUpdater({app:{getVersion:()=> '0.3.0',getPath:()=>directory,isPackaged:true,quit:()=>quits++},config:()=>config,save:c=>{config=c;return true;},fetcher:async url=>url.includes('api.github')?Response.json(fixture('0.3.1',bytes)):new Response(bytes),handoff:async()=>{throw Error('not ready');}});
 await expect(u.install()).rejects.toThrow('旧版本保留');expect(quits).toBe(0);expect(u.snapshot().phase).toBe('error');
});
it('failed automatic check records attempt, not success; same-day opening does not retry but manual check does',async()=>{
 let config={},calls=0;const app={getVersion:()=> '0.3.0',getPath:()=>os.tmpdir(),isPackaged:true};
 const u=updater.createUpdater({app,config:()=>config,save:c=>{config=c;return true;},fetcher:async()=>{calls++;throw Error('offline');},now:()=>new Date('2026-10-10T08:00:00Z')});
 await u.check(false);expect(config.update.lastAttemptDay).toBe('2026-10-10');expect(config.update.lastSuccessDay).toBeUndefined();await u.check(false);expect(calls).toBe(1);await u.check(true);expect(calls).toBe(2);expect(u.snapshot().phase).toBe('error');
});
it('wrong hash removes temporary bytes and never replaces a pre-existing package',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'paid-hash-')),target=path.join(directory,'test.exe');fs.writeFileSync(target,'old');
 const bytes=Buffer.from('new'),release={name:'test.exe',url:'https://example.invalid',sha256:'a'.repeat(64),size:bytes.length};
 await expect(updater.download(release,directory,async()=>new Response(bytes),()=>{})).rejects.toThrow('校验');expect(fs.readFileSync(target,'utf8')).toBe('old');expect(fs.readdirSync(directory)).toEqual(['test.exe']);
});
it('complete download returns a verified file and progress, and reuses only exact hash match',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'paid-download-')),bytes=Buffer.from('valid'),progress=[];let calls=0;
 const release={name:'test.exe',url:'https://example.invalid',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),size:bytes.length};
 const fetcher=async()=>{calls++;return new Response(bytes)};const file=await updater.download(release,directory,fetcher,p=>progress.push(p));await updater.download(release,directory,fetcher,p=>progress.push(p));expect(calls).toBe(1);expect(await updater.hashFile(file)).toBe(release.sha256);expect(progress.at(-1).bytes).toBe(bytes.length);
});

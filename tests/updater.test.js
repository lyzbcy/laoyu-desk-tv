import {it,expect} from 'vitest';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import updater from '../src/main/updater.js';
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

import {it,expect} from 'vitest';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import handoff from '../src/main/updateHandoff.js';
it('restart receipts require installed status, matching version, token and actual executable',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'paid-receipt-')),root=path.join(directory,'updates'),token=crypto.randomUUID(),job=path.join(root,'install-'+token);fs.mkdirSync(job,{recursive:true});
 const payload={token,version:'0.3.2',appId:'com.laoyu.paidtowatch',exe:process.execPath};fs.writeFileSync(path.join(root,'pending.json'),JSON.stringify({token,version:'0.3.2'}));fs.writeFileSync(path.join(job,'payload.json'),JSON.stringify(payload));const result=path.join(job,'result.json'),app={getPath:()=>directory,getVersion:()=> '0.3.2'};
 for(const status of ['ready','failed','restarted']){fs.writeFileSync(result,JSON.stringify({token,status}));expect(await handoff.confirmRestart(app)).toBe(false);}
 fs.writeFileSync(result,JSON.stringify({token,status:'installed',version:'0.3.2'}));expect(await handoff.confirmRestart({...app,getVersion:()=> '0.3.1'})).toBe(false);
 fs.writeFileSync(path.join(job,'payload.json'),JSON.stringify({...payload,exe:path.join(directory,'wrong.exe')}));expect(await handoff.confirmRestart(app)).toBe(false);
 fs.writeFileSync(path.join(job,'payload.json'),JSON.stringify(payload));expect(await handoff.confirmRestart(app)).toBe(true);expect(JSON.parse(fs.readFileSync(result)).status).toBe('restarted');
});
it('invalid pending tokens cannot reach unrelated folders',async()=>{const directory=fs.mkdtempSync(path.join(os.tmpdir(),'paid-pointer-'));fs.mkdirSync(path.join(directory,'updates'));fs.writeFileSync(path.join(directory,'updates/pending.json'),JSON.stringify({token:'../../elsewhere',version:'0.3.2'}));expect(await handoff.confirmRestart({getPath:()=>directory,getVersion:()=> '0.3.2'})).toBe(false);});

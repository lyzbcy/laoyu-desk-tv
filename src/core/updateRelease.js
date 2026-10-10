const REPO='lyzbcy/paid-to-watch';const RELEASE_PAGE=`https://github.com/${REPO}/releases/latest`;
function parts(value){if(!/^\d+\.\d+\.\d+$/.test(value||''))throw Error('只接受正式版本');return value.split('.').map(BigInt);}
function compareVersions(a,b){const x=parts(a),y=parts(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;return 0;}
function selectRelease(raw,platform,arch){
 if(raw?.draft||raw?.prerelease||!/^v\d+\.\d+\.\d+$/.test(raw?.tag_name||''))throw Error('没有可用的正式更新');
 const version=raw.tag_name.slice(1);parts(version);
 if(!(['win32','darwin'].includes(platform))||!['x64','arm64'].includes(arch)||(platform==='win32'&&arch!=='x64'))throw Error('此平台请到发布页手动下载');
 const name=`paid-to-watch-${version}-${platform==='darwin'?'mac':'win'}-${arch}.${platform==='darwin'?'zip':'exe'}`;
 const assets=(raw.assets||[]).filter(a=>a.name===name);if(assets.length!==1)throw Error('当前平台更新包未发布');
 const asset=assets[0],hash=/^sha256:([a-f0-9]{64})$/i.exec(asset.digest||'');
 const url=`https://github.com/${REPO}/releases/download/v${version}/${name}`;
 if(!hash||asset.browser_download_url!==url||!Number.isSafeInteger(asset.size)||asset.size<=0||asset.size>1024*1024*1024)throw Error('更新包来源或校验值无效');
 return {version,name,url,sha256:hash[1].toLowerCase(),size:asset.size,notes:String(raw.body||'').slice(0,800),page:RELEASE_PAGE};
}
function day(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
module.exports={REPO,RELEASE_PAGE,compareVersions,selectRelease,day};

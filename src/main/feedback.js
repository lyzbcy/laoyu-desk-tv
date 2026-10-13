const crypto=require('node:crypto'),{createDiagnosticArchive}=require('../core/diagnosticArchive'),{sanitizeSummary}=require('../core/logger');
const CATEGORIES=new Set(['播放或声音','网页直播','窗口或老板键','更新','其他','建议与真实评价']);
function createFeedback({version,platform,architecture,summary,saveArchive,openExternal,copyText,now=()=>Date.now()}){
 const drafts=new Map();
 function prepare(payload,owner){
  const note=typeof payload?.note==='string'?payload.note.trim():'';if(note.length>4000)throw Error('补充说明最多4000字');if(!note)throw Error('请说明遇到的问题或建议，便于我们处理');
  const category=CATEGORIES.has(payload.category)?payload.category:'其他',includeLogs=payload.includeLogs===true,logs=includeLogs?sanitizeSummary(summary()):'',archive=includeLogs?createDiagnosticArchive({version,platform,architecture,logs}):null;
  const filename=`Laoyu-Desk-TV-${version}-diagnostics-${crypto.randomUUID()}.zip`,body=`软件：捞鱼桌脚看电视 / Laoyu Desk TV\n版本：${version}\n平台：${platform}/${architecture}\n分类：${category}\n\n${note}\n`+(includeLogs?`\n默认附加已按字段过滤的诊断 ZIP：${filename}\n日志条目：${logs?logs.split('\n').length:0}\n请将保存到下载目录的 ZIP 拖入本反馈附件。\n`:'\n本次不附加诊断日志。\n');
  const url='https://github.com/lyzbcy/laoyu-desk-tv/issues/new?'+new URLSearchParams({title:`[${category}] Laoyu Desk TV ${version}`,body}).toString(),token=crypto.randomBytes(24).toString('hex');
  for(const [key,draft]of drafts)if(draft.owner===owner||now()-draft.created>600000)drafts.delete(key);
  drafts.set(token,{owner,created:now(),body,url,archive,filename,promise:null});return {token,body,logs,attachmentName:archive?filename:null,attachmentBytes:archive?.length||0,public:true,needsPaste:url.length>7500};
 }
 async function submit(token,owner){
  const draft=drafts.get(token);if(!draft||draft.owner!==owner||now()-draft.created>600000)throw Error('反馈预览已过期，请重新预览后提交');if(draft.promise)return draft.promise;
  draft.promise=(async()=>{let attachment=false;if(draft.archive){if(!draft.archiveSaved){await saveArchive(draft.filename,draft.archive);draft.archiveSaved=true;}attachment=true;}const needsPaste=draft.url.length>7500;if(needsPaste)copyText(draft.body);await openExternal(needsPaste?'https://github.com/lyzbcy/laoyu-desk-tv/issues/new':draft.url);drafts.delete(token);return {attachment,needsPaste};})();
  try{return await draft.promise;}catch{draft.promise=null;throw Error('反馈页未能打开，备注已保留；请重试或导出诊断包后自行提交');}
 }
 function cancel(token,owner){const draft=drafts.get(token);if(!draft||draft.owner!==owner||draft.promise)return false;drafts.delete(token);return true;}
 return {prepare,submit,cancel};
}
module.exports={createFeedback};

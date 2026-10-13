// src/main/store.js
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { mergeConfig } = require('../core/config');

const file = () => path.join(require('electron').app.getPath('userData'), 'config.json');
let writeBlocked=false,warning='';
function readConfig(target){
 try{const value=JSON.parse(fs.readFileSync(target,'utf8').replace(/^\uFEFF/,''));if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid configuration');return {config:mergeConfig(value),warning:'',blocked:false};}
 catch(error){if(error.code==='ENOENT')return {config:mergeConfig(null),warning:'',blocked:false};try{const backup=path.join(path.dirname(target),'config-recovery-'+crypto.randomUUID()+'.json');fs.copyFileSync(target,backup,fs.constants.COPYFILE_EXCL);return {config:mergeConfig(null),warning:'原配置无法读取，已保留恢复副本；当前使用默认设置。',blocked:false,backup};}catch{return {config:mergeConfig(null),warning:'原配置无法读取，恢复副本未能保存；已停止写入设置，避免覆盖原文件。',blocked:true};}}
}

function loadConfig() {
  const result=readConfig(file());writeBlocked=result.blocked;warning=result.warning;return result.config;
}

function saveConfig(cfg) {
  if(writeBlocked)return false;
  const target=file(),temporary=target+'.'+process.pid+'.tmp';
  try{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(temporary,JSON.stringify(cfg,null,2),'utf8');fs.renameSync(temporary,target);return true;}
  catch{try{fs.unlinkSync(temporary);}catch{}return false;}
}

module.exports = { loadConfig, saveConfig,readConfig,configWarning:()=>warning };

// src/main/store.js
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const { mergeConfig } = require('../core/config');

const file = () => path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    return mergeConfig(JSON.parse(fs.readFileSync(file(), 'utf-8')));
  } catch {
    return mergeConfig(null); // 文件不存在或损坏 → 默认配置
  }
}

function saveConfig(cfg) {
  const target=file(),temporary=target+'.'+process.pid+'.tmp';
  try{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(temporary,JSON.stringify(cfg,null,2),'utf8');fs.renameSync(temporary,target);return true;}
  catch{try{fs.unlinkSync(temporary);}catch{}return false;}
}

module.exports = { loadConfig, saveConfig };

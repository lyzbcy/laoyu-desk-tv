// src/core/videoScanner.js
const fs = require('node:fs');
const path = require('node:path');

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.ogv', '.m4v']);

function isVideoFile(name) {
  return VIDEO_EXTS.has(path.extname(name).toLowerCase());
}

function filterVideos(names) {
  return names.filter(isVideoFile);
}

// readdir 可注入以便测试,默认同步读取目录。
function scanFolder(dir, readdir = fs.readdirSync) {
  return filterVideos(readdir(dir)).map((name) => ({
    name,
    path: path.join(dir, name),
  }));
}

async function scanFolderAsync(dir){const entries=await fs.promises.readdir(dir,{withFileTypes:true}),videos=[];for(const entry of entries){if(!isVideoFile(entry.name))continue;let file=entry.isFile();if(entry.isSymbolicLink())try{file=(await fs.promises.stat(path.join(dir,entry.name))).isFile();}catch{}if(file)videos.push({name:entry.name,path:path.join(dir,entry.name)});}return videos;}
module.exports = { isVideoFile, filterVideos, scanFolder,scanFolderAsync, VIDEO_EXTS };

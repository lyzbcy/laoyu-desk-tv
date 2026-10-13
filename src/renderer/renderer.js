// src/renderer/renderer.js
const { AD_TEMPLATES } = window.api.ads();
const recommendation = AD_TEMPLATES[0];
for (const [id, value] of Object.entries({ 'ad-brand': recommendation.brand,
  'ad-category': recommendation.category, 'ad-title': recommendation.title,
  'ad-subtitle': recommendation.subtitle })) document.getElementById(id).textContent = value;
document.querySelectorAll('.cover-image').forEach(img => { img.src = recommendation.cover; });

const videoEl = document.getElementById('video');
const emptyEl = document.getElementById('video-empty');

let videos = [];
let currentIndex = 0;
let folderRevision=0;

async function loadFolder() {
  const dir = await window.api.pickFolder();
  if (!dir) return;
  await window.api.setFolder(dir);
  await openFolder(dir);
}

async function openFolder(dir) {
  const revision=++folderRevision;let scanned;
  try { scanned=await window.api.scanVideos(dir); }
  catch { if(revision===folderRevision && !videoEl.src) emptyEl.hidden=false; return; }
  if(revision!==folderRevision)return;videos=scanned;
  emptyEl.hidden = videos.length > 0;
  if (!videos.length) { videoEl.pause(); videoEl.removeAttribute('src'); videoEl.load(); videoEl.classList.remove('playing'); }
  if (videos.length) play(videos[0], 0);
}

function play(video, index) {
  currentIndex = index;
  videoEl.src = video.url;
  videoEl.classList.add('playing');
  if(!bossOn&&!liveOn)videoEl.play().catch(e=>window.api.mediaError(e.name));
}

// 播完当前视频 → 切到下一个(循环);多个视频靠这个顺序播放,不展示文件名列表
function playNext() {
  if (!videos.length) return;
  play(videos[(currentIndex + 1) % videos.length], (currentIndex + 1) % videos.length);
}

// Also keep the discreet double-click shortcut; normal controls are in the tray.
document.getElementById('stage').addEventListener('dblclick', loadFolder);

// 暴露给托盘任务复用
window.__loadFolder = loadFolder;

const overlay = document.getElementById('boss-overlay');
let bossOn = false;
let liveOn = false;

function showAd() {
  bossOn = true;
  overlay.hidden = false;
  videoEl.pause();
}

function applyState(payload) {
  const state=payload.player,wasBoss=bossOn,wasLive=liveOn;
  bossOn=state.bossOn;liveOn=state.liveOn;videoEl.muted=state.effectiveLocalMuted;
  emptyEl.hidden = payload.phase !== 'error' && (liveOn || !!videos.length);
  if (!bossOn) {
    overlay.hidden = true;
    if (liveOn) {videoEl.pause();videoEl.classList.remove('playing');return;}
    if (videoEl.ended) {
      if(wasBoss)playNext();
    } else if(videoEl.src && (wasBoss || wasLive)) {
      videoEl.classList.add('playing');videoEl.play().catch(e=>window.api.mediaError(e.name));
    }
  } else {
    showAd();
  }
}
window.api.onPlayerState(applyState);

// 视频自然播完 → 自动切到全屏假广告(和按老板键效果一样)
videoEl.addEventListener('ended', () => {
  if (!bossOn && !liveOn) window.api.videoEnded();
});

document.getElementById('close-card').addEventListener('click', () => {
  window.api.closeCard();
});

window.api.onPickFolderFromTray(() => window.__loadFolder());

// 网页直播由主进程的 BrowserView 叠加在 .stage 区域上方显示,
// 这里只需要在切换时暂停/恢复本地视频,避免两边同时占用这块区域。
// 直播设置模式:放大窗口时显示地址栏,可跳转到任意网页(B站、网页游戏等)
const addrBar = document.getElementById('addr-bar');
const addrInput = document.getElementById('addr-input');
function navigateLive() {
  const url = addrInput.value.trim();
  if (url) window.api.navigateLive(url);
}
document.getElementById('addr-go').addEventListener('click', navigateLive);
addrInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') navigateLive();
});
window.api.onSetupMode((on) => {
  addrBar.hidden = !on;
});

// 启动时:有记住的文件夹就直接加载
(async () => {
  const cfg = await window.api.getConfig();
  applyState(await window.api.getPlayerState());
  if (cfg.videoFolder) await openFolder(cfg.videoFolder);
})();

// src/core/hotkey.js
const KEY_RE = /^[A-Z0-9]$|^F([1-9]|1[0-2])$/;

function normalizeKey(key) {
  return key.length === 1 ? key.toUpperCase() : key;
}

// 根据按键状态构造 Electron accelerator 字符串;至少需要一个修饰键 + 一个普通键,否则返回 null
function buildAccelerator({ ctrl, meta, alt, shift, key }, platform = process.platform) {
  if (!key) return null;
  const normalized = normalizeKey(key);
  if (!KEY_RE.test(normalized)) return null;
  if (!ctrl && !meta && !alt && !shift) return null;

  const parts = [];
  if (meta) parts.push('Command');
  if (ctrl) parts.push(platform === 'darwin' ? 'Control' : 'CommandOrControl');
  if (alt) parts.push('Alt');
  if (shift) parts.push('Shift');
  parts.push(normalized);
  return parts.join('+');
}

function displayAccelerator(value, platform=process.platform){return value.replace('CommandOrControl',platform==='darwin'?'Command':'Ctrl').replace('Control','Ctrl').replace('Alt',platform==='darwin'?'Option':'Alt');}
module.exports = { buildAccelerator, displayAccelerator };

const DEFAULT_CARD = { width: 360, height: 320 };
// Header/footer include the outer border. Match native webpages to local video.
function stageBounds(width, height, setup = false) {
  const addressHeight = setup ? 32 : 0;
  return { x: 1, y: 40 + addressHeight, width: Math.max(0, width - 2),
    height: Math.max(0, height - 116 - addressHeight) };
}
module.exports = { DEFAULT_CARD, stageBounds };

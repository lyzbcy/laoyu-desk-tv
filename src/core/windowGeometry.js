const { DEFAULT_CARD } = require('./cardLayout');
function validArea(a) { return a && ['x','y','width','height'].every(k=>Number.isFinite(a[k])) && a.width>0 && a.height>0; }
function overlap(a,b){return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));}
function windowBounds(saved, displays, primaryId, setup=false) {
  const all=displays.filter(d=>validArea(d.workArea));
  if(!all.length)throw Error('No usable display');
  let display=all.find(d=>d.id===primaryId)||all[0];
  if(saved && Number.isFinite(saved.x)&&Number.isFinite(saved.y)){
    const prior={x:saved.x,y:saved.y,width:Number.isFinite(saved.width)?saved.width:DEFAULT_CARD.width,height:Number.isFinite(saved.height)?saved.height:DEFAULT_CARD.height};
    const match=all.map(d=>({d,area:overlap(prior,d.workArea)})).sort((a,b)=>b.area-a.area)[0];
    if(match.area>0)display=match.d;
  }
  const a=display.workArea;
  const width=Math.min(a.width,Math.max(Math.min(240,a.width),Number.isFinite(saved?.width)&&!setup?saved.width:setup?1200:DEFAULT_CARD.width));
  const height=Math.min(a.height,Math.max(Math.min(240,a.height),Number.isFinite(saved?.height)&&!setup?saved.height:setup?800:DEFAULT_CARD.height));
  const x=setup?a.x+(a.width-width)/2:Number.isFinite(saved?.x)?saved.x:a.x+a.width-width-20;
  const y=setup?a.y+(a.height-height)/2:Number.isFinite(saved?.y)?saved.y:a.y+a.height-height-20;
  return {x:Math.round(Math.max(a.x,Math.min(x,a.x+a.width-width))),y:Math.round(Math.max(a.y,Math.min(y,a.y+a.height-height))),width:Math.round(width),height:Math.round(height)};
}
module.exports={windowBounds};

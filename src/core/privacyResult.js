function summarize(items){const level=items.some(x=>x.level==='fail')?'fail':items.some(x=>x.level==='warning')?'warning':'pass';return {level,items,ranAt:new Date().toISOString(),summary:level==='fail'?'无感自检未通过，请先遮挡并静音':level==='warning'?'无感保护有未验证项，请查看详情':'当前机器的无感自检通过'};}
function captureResult({sampled,leaked,foregroundSame,baselineVisible,focusWasProbe}){
 if(!Number.isInteger(sampled)||sampled<16||!Number.isInteger(leaked)||leaked<0||leaked>sampled||baselineVisible!==true)return {level:'warning',detail:'外部捕获基线不可验证，不能判断是否防捕获。'};
 if(leaked/sampled>=0.05)return {level:'fail',detail:'独立GDI探针检测到标记泄露，请先遮挡并静音。'};
 if(foregroundSame!==true)return focusWasProbe===true?{level:'fail',detail:'探针获取了前台焦点。'}:{level:'warning',detail:'自检期间前台窗口改变，无法区分外部操作，本次焦点不记为通过。'};
 return {level:'pass',detail:'独立GDI探针未泄露标记且前台窗口未变；仅证明当前捕获路径。'};
}
module.exports={summarize,captureResult};

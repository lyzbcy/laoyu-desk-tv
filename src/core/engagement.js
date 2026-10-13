const {day}=require('./updateRelease');
function validDay(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
function validTime(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value)&&Number.isFinite(Date.parse(value));}
function recordUse(saved={},date=new Date()){
 const today=day(date),count=Number.isSafeInteger(saved.activeDays)&&saved.activeDays>=0?Math.min(saved.activeDays,36500):0,last=validDay(saved.lastUseDay)?saved.lastUseDay:'';
 return {activeDays:last&&today<=last?count:Math.min(count+1,36500),lastUseDay:last&&today<last?last:today,lastDismissDay:validDay(saved.lastDismissDay)?saved.lastDismissDay:'',lastDismissAt:validTime(saved.lastDismissAt)?saved.lastDismissAt:''};
}
function shouldInvite(saved={},date=new Date()){
 if(!Number.isSafeInteger(saved.activeDays)||saved.activeDays<3)return false;
 if(saved.lastDismissAt)return validTime(saved.lastDismissAt)&&date.getTime()-Date.parse(saved.lastDismissAt)>=15*86400000;
 if(!saved.lastDismissDay)return true;if(!validDay(saved.lastDismissDay))return false;
 // A legacy date has no time; conservatively wait through the fifteenth full day.
 return (Date.parse(day(date)+'T00:00:00Z')-Date.parse(saved.lastDismissDay+'T00:00:00Z'))/86400000>=16;
}
module.exports={recordUse,shouldInvite};

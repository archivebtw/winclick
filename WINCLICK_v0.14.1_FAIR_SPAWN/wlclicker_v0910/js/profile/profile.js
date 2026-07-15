(()=>{'use strict';
function achievements(){const s=WLState.data;return[['100 кликов',s.totalClicks>=100],['10 купонов',s.tickets.length>=10],['Золотая лига',s.rating>=300],['CR7',s.redeemed.includes('CR7')]];}
function exportSave(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(WLState.data,null,2)],{type:'application/json'}));a.download='wlclicker-v0.3.0-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function importSave(file,done){const reader=new FileReader();reader.onload=()=>{try{Object.assign(WLState.data,JSON.parse(reader.result));WLState.save();done(true);}catch{done(false);}};reader.readAsText(file);}
window.WLProfile={achievements,exportSave,importSave};
})();

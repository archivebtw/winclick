(()=>{'use strict';
const fallback=(team)=>({team,updatedAt:null,formation:'4-3-3',players:{GK:['GK'],DF:['DF(1)','DF(2)','DF(3)','DF(4)'],MF:['MF(1)','MF(2)','MF(3)'],FW:['FW(1)','FW(2)','FW(3)']}});
const db=window.WL_TEAM_FILES||{};
const order={GK:0,DF:1,MF:2,FW:3};
function team(name){return db[name]||fallback(name);}
function shortName(full){if(!full)return '';const parts=String(full).trim().split(/\s+/);return parts.length===1?parts[0]:parts[parts.length-1];}
function slot(name,role,index){const t=team(name),list=t.players?.[role]||[];const full=list[Math.max(0,index-1)]||`${role}${role==='GK'?'':`(${index})`}`;return{fullName:full,shortName:shortName(full),role,index,label:role==='GK'?'GK':`${role}(${index})`,team:name};}
function lineup(name){const t=team(name);return['GK','DF','MF','FW'].flatMap(role=>(t.players?.[role]||[]).map((_,i)=>slot(name,role,i+1))).sort((a,b)=>order[a.role]-order[b.role]||a.index-b.index);}
function display(player,compact=true){if(!player)return '';return compact?`${player.shortName} · ${player.label}`:`${player.fullName} (${player.label}, ${player.team})`;}
window.WLTeamDB={db,team,slot,lineup,display,shortName};
})();

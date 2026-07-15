(()=>{'use strict';
const now=()=>Date.now();
const fresh=()=>({
  version:'0.11.0',saveVersion:8,scheduleVersion:2,energy:0,tokens:1000,clickBase:1,passive:0,totalClicks:0,totalEnergy:0,totalEnergyRun:0,critClicks:0,bestCombo:1,hype:0,feverUntil:0,lastClickAt:0,
  level:1,xp:0,combo:1,comboExpires:0,boostUntil:0,cr7Until:0,lastSave:now(),lastDaily:0,
  redeemed:[],badges:['Modular Founder'],upgrades:{gloves:0,fans:0,stadium:0,drums:0,captain:0,ultras:0},quests:{clicks:0,buys:0,predictions:0},
  claimed:{},prestige:{count:0,fame:0,lifetimeFame:0,bestRunEnergy:0,lastAt:0,talents:{}},clickerEvent:{nextAt:0,activeUntil:0,type:'',multiplier:1},rhythm:{hits:0,misses:0,perfect:0,good:0,late:0,sliders:0,holds:0},rating:0,tickets:[],matches:[],selections:{},feedMatchId:'',stats:{won:0,lost:0,bestWin:0}
});
window.WLCore={now,fresh};
})();

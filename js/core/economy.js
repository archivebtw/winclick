(()=>{'use strict';
function xpNeed(){return 100+(WLState.data.level-1)*55;}
function addXp(value){const s=WLState.data;value*=window.WLPrestige?WLPrestige.bonus('experience',.08):1;s.xp+=value;while(s.xp>=xpNeed()){s.xp-=xpNeed();s.level++;s.energy+=100*s.level;s.tokens+=50;}}
function multiplier(){const s=WLState.data,now=Date.now(),event=s.clickerEvent?.activeUntil>now?Number(s.clickerEvent.multiplier||1):1,prestige=window.WLPrestige?WLPrestige.bonus('power',.10):1;return(s.boostUntil>now?2:1)*(s.cr7Until>now?7:1)*(s.feverUntil>now?3:1)*event*prestige;}
function critChance(){const s=WLState.data;return Math.min(.50,.05+(s.upgrades.captain||0)*.025+(window.WLPrestige?WLPrestige.level('critical')*.01:0));}
function clickValue(){const s=WLState.data;return Math.floor(s.clickBase*s.combo*multiplier());}
function passiveValue(){const s=WLState.data;return s.passive*(window.WLPrestige?WLPrestige.bonus('income',.10):1);}
function league(){const r=WLState.data.rating,levels=[['Бронза',0],['Серебро',100],['Золото',300],['Платина',650],['Легенда',1100]];let current=levels[0],next=levels[1];for(let i=0;i<levels.length;i++)if(r>=levels[i][1]){current=levels[i];next=levels[i+1]||null;}return{current,next};}
window.WLEconomy={xpNeed,addXp,multiplier,clickValue,critChance,passiveValue,league};
})();

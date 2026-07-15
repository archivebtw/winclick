(()=>{'use strict';
const talents=[
{id:'power',icon:'⚡',name:'Сила легенды',description:'+10% ко всей энергии за клики',base:1,max:20},
{id:'income',icon:'🏟️',name:'Наследие клуба',description:'+10% к пассивному и офлайн-доходу',base:1,max:20},
{id:'critical',icon:'🎯',name:'Хладнокровие',description:'+1% к шансу критического клика',base:2,max:15},
{id:'experience',icon:'📚',name:'Академия',description:'+8% к получаемому опыту',base:1,max:15},
{id:'fever',icon:'🔥',name:'Голос трибун',description:'+8% к заполнению ажиотажа',base:1,max:15},
{id:'fortune',icon:'👑',name:'Клубная удача',description:'+10% к наградам случайных событий',base:2,max:10}
];
function normalized(){const s=WLState.data;s.prestige=Object.assign({count:0,fame:0,lifetimeFame:0,bestRunEnergy:0,lastAt:0,talents:{}},s.prestige||{});s.prestige.talents=Object.assign({},s.prestige.talents||{});return s.prestige;}
function level(id){return Number(normalized().talents[id]||0);}
function bonus(id,per){return 1+level(id)*per;}
function requirement(){const p=normalized();return Math.floor(250000*Math.pow(2.15,p.count));}
function runScore(){const s=WLState.data;return Math.max(Number(s.totalEnergyRun||0),Number(s.energy||0));}
function reward(){const req=requirement(),score=runScore();if(score<req)return 0;return Math.max(1,Math.floor(Math.sqrt(score/req)*3));}
function canRebirth(){return reward()>0;}
function talentCost(item){return Math.ceil(item.base*Math.pow(1.55,level(item.id)));}
function buyTalent(id){const p=normalized(),item=talents.find(x=>x.id===id);if(!item)return{ok:false,message:'Талант не найден'};const current=level(id);if(current>=item.max)return{ok:false,message:'Достигнут максимальный уровень'};const cost=talentCost(item);if(p.fame<cost)return{ok:false,message:'Недостаточно очков славы'};p.fame-=cost;p.talents[id]=current+1;return{ok:true,message:`${item.name}: уровень ${current+1}`};}
function rebirth(){const s=WLState.data,p=normalized(),gain=reward();if(gain<1)return{ok:false,message:'Нужно накопить больше энергии'};
 p.count++;p.fame+=gain;p.lifetimeFame+=gain;p.bestRunEnergy=Math.max(p.bestRunEnergy||0,runScore());p.lastAt=Date.now();
 s.energy=0;s.clickBase=1;s.passive=0;s.totalEnergyRun=0;s.level=1;s.xp=0;s.combo=1;s.comboExpires=0;s.hype=0;s.feverUntil=0;s.boostUntil=0;s.cr7Until=0;s.lastClickAt=0;s.upgrades={gloves:0,fans:0,stadium:0,drums:0,captain:0,ultras:0};s.quests={clicks:0,buys:0,predictions:s.quests?.predictions||0};s.claimed={};s.rhythm=Object.assign({hits:0,misses:0,perfect:0,good:0,late:0,sliders:0,holds:0},s.rhythm||{});
 return{ok:true,gain,message:`Перерождение завершено. Получено ${gain} очк. славы`};}
function eventRewardMultiplier(){return bonus('fortune',.10);}
window.WLPrestige={talents,normalized,level,bonus,requirement,runScore,reward,canRebirth,talentCost,buyTalent,rebirth,eventRewardMultiplier};
})();

(()=>{'use strict';
const PROMOS={CR7:{energy:7777,tokens:777,clickBase:7,multiplierMinutes:7,badge:'CR7 Founder'}};
function redeem(code){const s=WLState.data,key=String(code||'').trim().toUpperCase();if(!key)return{ok:false,message:'Введите промокод.'};if(s.redeemed.includes(key))return{ok:false,message:'Код уже использован.'};const reward=PROMOS[key];if(!reward)return{ok:false,message:'Промокод не найден.'};s.redeemed.push(key);s.energy+=reward.energy;s.tokens+=reward.tokens;s.clickBase+=reward.clickBase;s.cr7Until=Date.now()+reward.multiplierMinutes*60000;if(!s.badges.includes(reward.badge))s.badges.push(reward.badge);return{ok:true,message:`${key} активирован!`};}
window.WLPromo={PROMOS,redeem};
})();

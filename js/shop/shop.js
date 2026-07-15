(()=>{'use strict';
const upgrades=[
{id:'gloves',icon:'🧤',name:'Фанатские перчатки',description:'+1 к базовой силе клика',base:50},
{id:'drums',icon:'🥁',name:'Барабанный сектор',description:'Комбо держится дольше и растёт быстрее',base:240},
{id:'captain',icon:'🎯',name:'Капитан трибуны',description:'+2.5% к шансу критического клика',base:420},
{id:'fans',icon:'📣',name:'Сектор болельщиков',description:'+3 энергии в секунду',base:180},
{id:'stadium',icon:'🏟️',name:'Стадион',description:'+12 энергии в секунду',base:850},
{id:'ultras',icon:'🔥',name:'Ультрас',description:'Быстрее заполняет шкалу ажиотажа',base:1100}
];
function cost(item){return Math.floor(item.base*Math.pow(1.62,WLState.data.upgrades[item.id]||0));}
function buy(id){const s=WLState.data,item=upgrades.find(x=>x.id===id);if(!item)return{ok:false,message:'Улучшение не найдено'};const price=cost(item);if(s.energy<price)return{ok:false,message:'Недостаточно энергии'};s.energy-=price;s.upgrades[id]=(s.upgrades[id]||0)+1;if(id==='gloves')s.clickBase++;if(id==='fans')s.passive+=3;if(id==='stadium')s.passive+=12;s.quests.buys++;WLEconomy.addXp(8);return{ok:true};}
window.WLShop={upgrades,cost,buy};
})();
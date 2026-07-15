(()=>{'use strict';
const KEY='wlclicker_main_save_v2';
const LEGACY_KEYS=['wlclicker_main_save_v1','wlclicker_v7_save','projectStadiumAlpha01'];
const {fresh}=WLCore;
function mergeDefaults(raw){const base=fresh();const merged=Object.assign(base,raw||{}, {
  stats:Object.assign(base.stats,raw?.stats||{}),upgrades:Object.assign(base.upgrades,raw?.upgrades||{}),
  quests:Object.assign(base.quests,raw?.quests||{}),claimed:Object.assign({},raw?.claimed||{}),
  tickets:Array.isArray(raw?.tickets)?raw.tickets:[],matches:Array.isArray(raw?.matches)?raw.matches:[],
  redeemed:Array.isArray(raw?.redeemed)?raw.redeemed:[],badges:Array.isArray(raw?.badges)?raw.badges:base.badges,
  selections:raw?.selections&&typeof raw.selections==='object'?raw.selections:{},
  prestige:Object.assign(base.prestige,raw?.prestige||{}, {talents:Object.assign({},raw?.prestige?.talents||{})}),
  clickerEvent:Object.assign(base.clickerEvent,raw?.clickerEvent||{}),
  rhythm:Object.assign(base.rhythm,raw?.rhythm||{})
});if(raw&&raw.totalEnergyRun==null)merged.totalEnergyRun=Number(raw.energy||0);return merged;}
function migrateLegacy(raw){const n=fresh();n.energy=raw.energy??n.energy;n.tokens=raw.tokens??n.tokens;n.level=raw.level??n.level;n.xp=raw.xp??n.xp;n.clickBase=raw.clickBase??raw.clickPower??n.clickBase;n.passive=raw.passive??n.passive;n.totalClicks=raw.totalClicks??0;n.totalEnergy=raw.totalEnergy??n.energy;n.totalEnergyRun=raw.totalEnergyRun??raw.totalEnergy??n.energy;n.boostUntil=raw.boostUntil??0;n.cr7Until=raw.cr7Until??0;n.lastDaily=raw.lastDaily??0;n.redeemed=raw.redeemed??raw.usedPromos??[];n.badges=[...new Set([...(raw.badges||[]),...(raw.profileBadge?[raw.profileBadge]:[]),'Modular Founder'])];n.upgrades=Object.assign(n.upgrades,raw.upgrades||{});n.quests=Object.assign(n.quests,raw.quests||{});n.claimed=raw.claimed??raw.achievements??{};n.rating=raw.rating??0;n.tickets=Array.isArray(raw.tickets)?raw.tickets:[];n.matches=Array.isArray(raw.matches)?raw.matches:[];n.stats={won:raw.totalWon??raw.stats?.won??(raw.history||[]).filter(h=>h.won).length,lost:raw.totalLost??raw.stats?.lost??(raw.history||[]).filter(h=>!h.won).length,bestWin:raw.bestWin??raw.stats?.bestWin??Math.max(0,...(raw.history||[]).map(h=>h.payout||0))};return n;}
function load(){try{const current=JSON.parse(localStorage.getItem(KEY)||'null');if(current)return mergeDefaults(current);}catch{}
for(const key of LEGACY_KEYS){try{const raw=JSON.parse(localStorage.getItem(key)||'null');if(raw){const migrated=migrateLegacy(raw);localStorage.setItem(KEY,JSON.stringify(migrated));return migrated;}}catch{}}
return fresh();}
window.WLState={KEY,data:load(),save(){this.data.lastSave=Date.now();localStorage.setItem(KEY,JSON.stringify(this.data));},reset(){this.data=fresh();this.save();}};
})();

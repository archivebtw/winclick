(()=>{'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const styles={
 'Liverpool':{style:'high_press',press:.88,tempo:.84,width:.70,risk:.68},'Manchester City':{style:'possession',press:.75,tempo:.72,width:.82,risk:.55},
 'Barcelona':{style:'possession',press:.72,tempo:.68,width:.86,risk:.58},'Inter':{style:'compact_counter',press:.61,tempo:.64,width:.48,risk:.48},
 'Real Madrid':{style:'vertical',press:.70,tempo:.83,width:.76,risk:.70},'Arsenal':{style:'possession_press',press:.79,tempo:.76,width:.78,risk:.61},
 'PSG':{style:'counter',press:.64,tempo:.86,width:.73,risk:.72},'Milan':{style:'balanced',press:.69,tempo:.70,width:.65,risk:.56},
 'Bayern':{style:'high_press',press:.84,tempo:.82,width:.79,risk:.66},'Chelsea':{style:'balanced',press:.73,tempo:.72,width:.68,risk:.56},
 'Juventus':{style:'compact',press:.60,tempo:.61,width:.52,risk:.45},'Dortmund':{style:'vertical',press:.80,tempo:.85,width:.76,risk:.69},
 'Napoli':{style:'possession_press',press:.76,tempo:.79,width:.74,risk:.62}
};
const defaults={style:'balanced',press:.68,tempo:.70,width:.66,risk:.56};
function profile(name){return {...defaults,...(styles[name]||{})};}
function minute(match,ts=Date.now()){return Math.max(0,Math.min(90,Math.floor((ts-match.start)/(match.end-match.start)*90)));}
function scoreGap(match,side){return side==='home'?match.scoreH-match.scoreA:match.scoreA-match.scoreH;}
function createSide(name){const p=profile(name);return{name,mode:'BALANCED',phase:'MID_BLOCK',pressIntensity:p.press,width:p.width,lineHeight:.50,risk:p.risk,tempo:p.tempo,style:p.style,desperation:0,compactness:.70,counterReady:false,lastReason:'Стартовая структура'};}
function ensure(match){if(!match.teamBrain||typeof match.teamBrain!=='object')match.teamBrain={};if(!match.teamBrain.home)match.teamBrain.home=createSide(match.home);if(!match.teamBrain.away)match.teamBrain.away=createSide(match.away);return match.teamBrain;}
function decide(match,side,ts=Date.now()){
 const brain=ensure(match)[side],p=profile(brain.name),m=minute(match,ts),gap=scoreGap(match,side),hasBall=match.flow?.possession===side;
 const late=m>=78,veryLate=m>=86;let mode='BALANCED',phase='MID_BLOCK',reason='Команда сохраняет структуру';
 if(hasBall){
   if(gap<0&&late){mode='DESPERATION';phase='FINAL_THIRD';reason='Команда рискует ради камбэка';}
   else if(p.style.includes('possession')){mode='CONTROL';phase='BUILD_UP';reason='Команда контролирует темп через владение';}
   else if(p.style==='counter'||p.style==='compact_counter'){mode='COUNTER_ATTACK';phase='TRANSITION';reason='Команда ищет быстрый вертикальный выход';}
   else{mode='ATTACK';phase=m<18?'BUILD_UP':'FINAL_THIRD';reason='Команда развивает атаку по своему стилю';}
 }else{
   const trigger=(match.flow?.danger||0)>45||match.flow?.phase==='build_up';
   if(gap<0&&late){mode='HIGH_PRESS';phase='PRESS';reason='Проигрывающая команда включает высокий прессинг';}
   else if(trigger&&p.press>.72){mode='PRESS';phase='PRESS';reason='Сработал триггер коллективного прессинга';}
   else if(p.style.includes('compact')){mode='LOW_BLOCK';phase='LOW_BLOCK';reason='Команда защищается компактным блоком';}
   else{mode='DEFEND';phase='MID_BLOCK';reason='Команда удерживает оборонительную структуру';}
 }
 brain.mode=mode;brain.phase=phase;brain.lastReason=reason;brain.desperation=gap<0?clamp((late?.35:0)+(veryLate?.28:0)+Math.abs(gap)*.16,0,1):0;
 brain.pressIntensity=clamp(p.press+(mode==='HIGH_PRESS'?.18:mode==='PRESS'?.09:mode==='LOW_BLOCK'?-.12:0)+brain.desperation*.12,.32,1);
 brain.lineHeight=clamp(mode==='HIGH_PRESS'?.72:mode==='PRESS'?.63:mode==='LOW_BLOCK'?.34:hasBall?.58:.46,.25,.78);
 brain.width=clamp(p.width+(hasBall?.06:-.08)+(mode==='LOW_BLOCK'?-.08:0),.38,.90);brain.risk=clamp(p.risk+brain.desperation*.25,.25,.92);
 brain.compactness=clamp(mode==='LOW_BLOCK'?.88:mode==='PRESS'?.76:hasBall?.62:.72,.50,.92);brain.counterReady=!hasBall&&(p.style==='counter'||p.style==='compact_counter'||mode==='LOW_BLOCK');
 return brain;
}
function update(match,ts=Date.now()){ensure(match);decide(match,'home',ts);decide(match,'away',ts);return match.teamBrain;}
function pressureThreshold(brain){return .17-brain.pressIntensity*.065;}
function label(brain){const names={ATTACK:'Атака',CONTROL:'Контроль',COUNTER_ATTACK:'Контратака',DEFEND:'Средний блок',LOW_BLOCK:'Низкий блок',PRESS:'Прессинг',HIGH_PRESS:'Высокий прессинг',DESPERATION:'Финальный штурм',BALANCED:'Баланс'};return names[brain?.mode]||'Баланс';}
window.WLTeamBrain={ensure,update,decide,profile,label,pressureThreshold,minute};
})();
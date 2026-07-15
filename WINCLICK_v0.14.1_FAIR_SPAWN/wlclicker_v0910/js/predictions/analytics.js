(()=>{'use strict';
const KEYS=['P1','X','P2'];
const LABELS={P1:'П1',X:'Ничья',P2:'П2'};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function normalize(obj){const total=KEYS.reduce((a,k)=>a+Math.max(.001,Number(obj[k])||0),0);const out={};KEYS.forEach(k=>out[k]=Math.max(.001,Number(obj[k])||0)/total);return out;}
function baseProbabilities(m){
 const homePower=(Number(m.homeAttack)||80)*1.05+(Number(m.homeDefense)||80)*.92+5;
 const awayPower=(Number(m.awayAttack)||80)+(Number(m.awayDefense)||80)*.92;
 const diff=(homePower-awayPower)/42;
 let draw=.27-Math.min(.08,Math.abs(diff)*.055);
 let p1=(1-draw)/(1+Math.exp(-diff));
 let p2=1-draw-p1;
 if(m.status==='LIVE'){
  const minute=clamp(((Date.now()-Number(m.start))/(Number(m.end)-Number(m.start)))*90,0,90);
  const scoreDiff=(Number(m.scoreH)||0)-(Number(m.scoreA)||0);
  const weight=.15+.62*(minute/90);
  p1=p1*(1-weight)+(scoreDiff>0?.78:scoreDiff<0?.08:.31)*weight;
  p2=p2*(1-weight)+(scoreDiff<0?.78:scoreDiff>0?.08:.31)*weight;
  draw=draw*(1-weight)+(scoreDiff===0?.38:.14)*weight;
 }
 return normalize({P1:p1,X:draw,P2:p2});
}
function styleInfo(name){return window.WLTeamDB?.team?.(name)||{};}
function reasons(m,probs,key){const home=styleInfo(m.home),away=styleInfo(m.away),r=[];const hA=Number(m.homeAttack)||80,hD=Number(m.homeDefense)||80,aA=Number(m.awayAttack)||80,aD=Number(m.awayDefense)||80;
 if(key==='P1'){if(hA>aD)r.push('Атака хозяев сильнее обороны соперника');if(hD>=aA)r.push('Хозяева устойчивее без мяча');r.push('Фактор домашнего поля');}
 if(key==='P2'){if(aA>hD)r.push('Гости имеют преимущество в атакующей мощи');if(aD>=hA)r.push('Гости способны нейтрализовать лидера хозяев');r.push('Коэффициент учитывает риск выездного матча');}
 if(key==='X'){r.push('Силы команд близки');r.push('Оборонительный баланс повышает шанс ничьей');}
 const hs=home.style||home.tacticalStyle||'',as=away.style||away.tacticalStyle||'';if(hs||as)r.push(`Тактическое сочетание: ${hs||'сбалансированный стиль'} против ${as||'сбалансированного стиля'}`);
 if(m.status==='LIVE'){const d=(m.scoreH||0)-(m.scoreA||0);if(d===0)r.push('Текущий счёт сохраняет равновесие');else if((key==='P1'&&d>0)||(key==='P2'&&d<0))r.push('Текущий счёт подтверждает сценарий');else r.push('Для прогноза потребуется камбэк');}
 return r.slice(0,3);
}
function generate(m){
 const random=rng(hash(m.id+'|analytics-v1'));
 const trueP=baseProbabilities(m);
 const noise=()=> (random()-.5)*.09;
 const scoutP=normalize({P1:trueP.P1+noise(),X:trueP.X+noise(),P2:trueP.P2+noise()});
 const crowdRaw=normalize({P1:Math.pow(trueP.P1,1.18)*(1+random()*.28),X:Math.pow(trueP.X,.88)*(1+random()*.18),P2:Math.pow(trueP.P2,1.18)*(1+random()*.28)});
 let crowd={};let remainder=100;KEYS.forEach((k,i)=>{crowd[k]=i===2?remainder:Math.round(crowdRaw[k]*100);remainder-=crowd[k];});
 const moneyBias=KEYS.map(k=>({k,v:trueP[k]*(Number(m.odds?.[k])||1)})).sort((a,b)=>b.v-a.v)[0].k;
 const crowdTop=KEYS.slice().sort((a,b)=>crowd[b]-crowd[a])[0];
 const smartKey=random()<.68?moneyBias:KEYS[Math.floor(random()*3)];
 const sorted=KEYS.slice().sort((a,b)=>scoutP[b]-scoutP[a]);
 const top=sorted[0],gap=scoutP[top]-scoutP[sorted[1]];
 const confidence=Math.round(clamp(48+gap*115+Math.abs(trueP.P1-trueP.P2)*24+(random()-.5)*9,42,94));
 const entropy=-KEYS.reduce((s,k)=>s+trueP[k]*Math.log(trueP[k]),0)/Math.log(3);
 const difficulty=entropy>.93?'НЕПРЕДСКАЗУЕМЫЙ':entropy>.84?'ОПАСНЫЙ':entropy>.72?'СРЕДНИЙ':'ПОНЯТНЫЙ';
 const value={};KEYS.forEach(k=>value[k]=Math.round(((trueP[k]*(Number(m.odds?.[k])||1))-1)*100));
 const bestValue=KEYS.slice().sort((a,b)=>value[b]-value[a])[0];
 const analystDefs=[
  ['Скаут',top,confidence],
  ['Статистик',KEYS.slice().sort((a,b)=>(trueP[b]/Math.max(.01,1/(m.odds?.[b]||1)))-(trueP[a]/Math.max(.01,1/(m.odds?.[a]||1))))[0],Math.round(clamp(confidence-5+random()*9,40,91))],
  ['Экс-игрок',random()<.62?top:KEYS[Math.floor(random()*3)],Math.round(clamp(45+random()*36,40,86))]
 ];
 const analysts=analystDefs.map((a,i)=>({name:a[0],pick:a[1],confidence:a[2],accuracy:Math.round(57+random()*18),streak:Math.floor(random()*6),id:i}));
 const flags=[];if(smartKey!==crowdTop)flags.push('Крупные ставки расходятся с мнением большинства');if(value[bestValue]>8)flags.push(`Обнаружена потенциальная ценность на ${LABELS[bestValue]}`);if(difficulty==='НЕПРЕДСКАЗУЕМЫЙ')flags.push('Высокая вероятность нестандартного сценария');
 return{probabilities:scoutP,scoutPick:top,confidence,difficulty,crowd,smartMoney:smartKey,crowdTop,value,bestValue,analysts,reasons:reasons(m,scoutP,top),flags,updatedAt:Date.now()};
}
function ensure(m){if(!m.analytics||m.analytics.version!==1){m.analytics=Object.assign({version:1},generate(m));}else if(m.status==='LIVE'&&Date.now()-(m.analytics.updatedAt||0)>30000){m.analytics=Object.assign({version:1},generate(m));}return m.analytics;}
function stars(n){return'★'.repeat(clamp(Math.round(n/20),1,5))+'☆'.repeat(5-clamp(Math.round(n/20),1,5));}
window.WLAnalytics={ensure,generate,baseProbabilities,stars,LABELS,KEYS};
})();

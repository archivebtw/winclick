(()=>{'use strict';
const markets=['P1','X','P2'];
const choose=a=>a[Math.floor(Math.random()*a.length)];
const minuteText=m=>`${m}'`;
const opposite=s=>s==='home'?'away':'home';

function ensureMatchMemory(match){
  if(window.WLTeamBrain)WLTeamBrain.ensure(match);
  if(window.WLLivingMatch)WLLivingMatch.ensure(match);
  match.eventStats=Object.assign({
    homeAttacks:0,awayAttacks:0,homeShots:0,awayShots:0,
    homeSaves:0,awaySaves:0,homeCards:0,awayCards:0
  },match.eventStats||{});
  if(!Array.isArray(match.goalLog))match.goalLog=[];
  if(typeof match.summary!=='string')match.summary='';
  if(!match.flow||typeof match.flow!=='object')match.flow={};
  const f=match.flow;
  if(f.possession!=='home'&&f.possession!=='away')f.possession=Math.random()<.5?'home':'away';
  if(!['kickoff','possession','build_up','final_third','restart'].includes(f.phase))f.phase='possession';
  if(typeof f.restartType!=='string')f.restartType='';
  if(!Number.isFinite(f.danger))f.danger=10;
  if(!Number.isFinite(f.lastGoalMinute))f.lastGoalMinute=-99;
  if(!Number.isFinite(f.lastShotMinute))f.lastShotMinute=-99;
  if(!Number.isFinite(f.lastMajorMinute))f.lastMajorMinute=-99;
  if(!Number.isFinite(f.sequence))f.sequence=0;
  if(!['left','center','right'].includes(f.lane))f.lane='center';
  if(!Number.isFinite(f.momentumHome))f.momentumHome=.5;
  if(!Number.isFinite(f.momentumAway))f.momentumAway=.5;
  if(typeof f.lastEventMeta!=='object'||!f.lastEventMeta)f.lastEventMeta={};if(!Number.isFinite(f.lastMicroEvent))f.lastMicroEvent=0;
  if(!match.market||typeof match.market!=='object')match.market={};
  const market=match.market;
  if(!Number.isFinite(market.homeSupport))market.homeSupport=.5;
  if(!Number.isFinite(market.awaySupport))market.awaySupport=.5;
  if(!Number.isFinite(market.homeMomentum))market.homeMomentum=0;
  if(!Number.isFinite(market.awayMomentum))market.awayMomentum=0;
  if(!Number.isFinite(market.lastUpdate))market.lastUpdate=Date.now();
  if(typeof market.label!=='string')market.label='⚖️ Рынок сбалансирован';
  if(!Number.isFinite(market.homeComebackBelief))market.homeComebackBelief=.5;
  if(!Number.isFinite(market.awayComebackBelief))market.awayComebackBelief=.5;
}

function teamStrength(match,side){
  return side==='home'?(match.homeAttack+match.homeDefense)/2:(match.awayAttack+match.awayDefense)/2;
}
function pressureScore(match,side){
  const stats=match.eventStats||{},prefix=side==='home'?'home':'away';
  return (stats[prefix+'Attacks']||0)*.35+(stats[prefix+'Shots']||0)*.8;
}
function calculateComebackBelief(match,side,ts){
  const remaining=Math.max(0,(match.end-ts)/WLMatches.MATCH_DURATION),gap=Math.max(0,rivalScore(match,side)-sideScore(match,side));
  const strength=teamStrength(match,side)/100,m=match.market,momentum=m[side+'Momentum']||0;
  const own=pressureScore(match,side),opp=pressureScore(match,opposite(side));
  const recentPressure=Math.max(0,Math.min(1,.5+(own-opp)/12));
  return WLMatches.clamp(.12+strength*.28+remaining*.24+momentum*.20+recentPressure*.18-gap*.18,0,.92);
}
function updateMarketSentiment(match,ts){
  ensureMatchMemory(match);const m=match.market,elapsed=Math.max(0,ts-m.lastUpdate),decay=Math.pow(.965,elapsed/3000);m.homeMomentum*=decay;m.awayMomentum*=decay;m.lastUpdate=ts;
  const hp=pressureScore(match,'home'),ap=pressureScore(match,'away');if(hp>ap+1)m.homeMomentum=Math.min(1,m.homeMomentum+.035);if(ap>hp+1)m.awayMomentum=Math.min(1,m.awayMomentum+.035);
  m.homeComebackBelief=calculateComebackBelief(match,'home',ts);m.awayComebackBelief=calculateComebackBelief(match,'away',ts);
  const diff=match.scoreH-match.scoreA,losing=diff<0?'home':diff>0?'away':null;
  if(losing){const belief=m[losing+'ComebackBelief'],name=losing==='home'?match.home:match.away;m[losing+'Support']=Math.min(.95,m[losing+'Support']*.82+belief*.18);m.label=belief>=.68?`💪 Рынок активно верит в камбэк ${name}`:belief>=.48?`⚖️ Часть игроков продолжает поддерживать ${name}`:`📉 Поддержка ${name} заметно снижается`;}
  else{const delta=Math.abs(hp-ap);if(delta>3){const side=hp>ap?'home':'away',name=side==='home'?match.home:match.away;m.label=`📈 Давление рынка в пользу ${name}`;}else m.label='⚖️ Рынок сбалансирован';}
}
function applySentimentResistance(match,raw,ts){
  updateMarketSentiment(match,ts);const result={...raw},diff=match.scoreH-match.scoreA,losing=diff<0?'home':diff>0?'away':null;if(!losing)return result;
  const key=losing==='home'?'P1':'P2',belief=match.market[losing+'ComebackBelief']||0,support=match.market[losing+'Support']||.5,momentum=match.market[losing+'Momentum']||0;
  const resistance=Math.min(.58,.08+belief*.32+support*.10+momentum*.08),current=Number(match.odds[key])||result[key];
  const rawRise=Math.max(0,result[key]-current),maxRise=.22+.55*(1-belief);result[key]=current+Math.min(rawRise*(1-resistance),maxRise);
  const leaderKey=key==='P1'?'P2':'P1';result[leaderKey]=result[leaderKey]*(1+.02*resistance);result.X=result.X*(1-.035*resistance);
  for(const k of markets)result[k]=Math.round(WLMatches.clamp(result[k],1.05,12)*100)/100;return result;
}

function probabilityOdds(match,ts){
  const remaining=Math.max(0,(match.end-ts)/WLMatches.MATCH_DURATION),diff=match.scoreH-match.scoreA;
  let home=(match.homeAttack*1.05+match.homeDefense)/(match.homeAttack+match.homeDefense+match.awayAttack+match.awayDefense);
  let away=(match.awayAttack+match.awayDefense)/(match.homeAttack+match.homeDefense+match.awayAttack+match.awayDefense);
  let draw=.29*(.25+.75*remaining),scoreWeight=.18+.42*(1-remaining);
  home+=diff*scoreWeight;away-=diff*scoreWeight;
  if(diff===0)draw+=.13*(1-remaining);else draw-=Math.abs(diff)*.08*(1-remaining);
  home=Math.max(.035,home);away=Math.max(.035,away);draw=Math.max(.035,draw);
  const sum=home+away+draw;
  return{P1:WLMatches.oddFromProbability(home/sum),X:WLMatches.oddFromProbability(draw/sum),P2:WLMatches.oddFromProbability(away/sum)};
}
function setTargets(match,targets,activityMs=16000){markets.forEach(k=>{const old=Number(match.odds[k]),next=Number(targets[k]);match.oddsTrend[k]=next<old?-1:next>old?1:0;match.oddsTarget[k]=next;});match.marketActivityUntil=Date.now()+activityMs;match.nextMarketPulse=Date.now()+1800+Math.random()*1800;}
function onGoal(match,ts){if(window.WLMarkets)WLMarkets.suspend(match,'Гол — пересчёт коэффициентов',2600,ts);setTargets(match,applySentimentResistance(match,probabilityOdds(match,ts),ts),18000);}
function marketPressure(match,ts){
  updateMarketSentiment(match,ts);
  if(!Number.isFinite(match.nextAmbientPulse))match.nextAmbientPulse=ts+1200+Math.random()*2600;
  if(ts>=match.nextAmbientPulse&&match.status==='LIVE'){
    match.nextAmbientPulse=ts+2200+Math.random()*4200;
    const base=probabilityOdds(match,ts),targets={...match.oddsTarget};
    markets.forEach((k,i)=>{const crowd=(Math.random()-.5)*(.035+(i*.004));targets[k]=WLMatches.clamp(base[k]*(1+crowd),1.05,12);});
    setTargets(match,targets,4200);
  }
  if(ts>match.marketActivityUntil||ts<match.nextMarketPulse)return;
  match.nextMarketPulse=ts+1800+Math.random()*2200;
  const leader=match.scoreH>match.scoreA?'P1':match.scoreA>match.scoreH?'P2':null;if(!leader)return;
  const losingSide=leader==='P1'?'away':'home',oppositeMarket=leader==='P1'?'P2':'P1';
  const support=match.market[losingSide+'Support']||.5,momentum=match.market[losingSide+'Momentum']||0,belief=match.market[losingSide+'ComebackBelief']||0;
  const comebackFlow=Math.min(.92,.15+support*.28+momentum*.20+belief*.42);
  const step=.008+Math.random()*.018,targets={...match.oddsTarget};
  targets[leader]=WLMatches.clamp(targets[leader]-step*(1-comebackFlow*.35),1.05,12);
  targets[oppositeMarket]=WLMatches.clamp(targets[oppositeMarket]+step*(1.15-comebackFlow*.85),1.05,12);
  targets.X=WLMatches.clamp(targets.X+step*(.28-comebackFlow*.22),1.05,12);
  if(momentum>.35)targets[oppositeMarket]=WLMatches.clamp(targets[oppositeMarket]-step*.45*momentum,1.05,12);
  setTargets(match,targets,Math.max(2500,match.marketActivityUntil-ts));
}
function animateOdds(match){markets.forEach(k=>{const current=Number(match.odds[k]),target=Number(match.oddsTarget[k]);if(!Number.isFinite(current)||!Number.isFinite(target))return;const delta=target-current;if(Math.abs(delta)<.005){match.odds[k]=Math.round(target*100)/100;match.oddsTrend[k]=0;return;}match.odds[k]=Math.round((current+delta*.18)*100)/100;match.oddsTrend[k]=delta<0?-1:1;});}

function teamNames(match,side){return side==='home'?{team:match.home,rival:match.away}:{team:match.away,rival:match.home};}
function tacticalPlayer(team,role,number=1){const slot=window.WLTeamDB?.slot(team,role,number);return slot?.shortName||slot?.fullName||`${role}(${number})`;}
function bump(match,side,key){const prefix=side==='home'?'home':'away';match.eventStats[prefix+key]=(match.eventStats[prefix+key]||0)+1;}
function pushEvent(match,text){
  const meta=match.flow.lastEventMeta||{};
  const living=window.WLLivingMatch?WLLivingMatch.process(match,text,meta):{main:text,extra:'',meta};
  const lines=[living.main];if(living.extra)lines.push(living.extra);
  for(let i=lines.length-1;i>=0;i--)match.events.unshift(lines[i]);
  match.events=match.events.slice(0,36);
  if(window.WLTimeline){WLTimeline.record(match,living.main,living.meta||meta);if(living.extra)WLTimeline.record(match,living.extra,{...(living.meta||meta),eventKind:'narrative',micro:true});}
  match.flow.lastEventMeta={};
}
function sideScore(match,side){return side==='home'?match.scoreH:match.scoreA;}
function rivalScore(match,side){return side==='home'?match.scoreA:match.scoreH;}

function choosePossession(match){
  let home=match.homeAttack+match.homeDefense*.35,away=match.awayAttack+match.awayDefense*.35;
  if(match.scoreH<match.scoreA)home*=1.12+(match.market?.homeComebackBelief||.5)*.28;
  if(match.scoreA<match.scoreH)away*=1.12+(match.market?.awayComebackBelief||.5)*.28;
  return Math.random()<home/(home+away)?'home':'away';
}

function restartEvent(match,minute){
  const side=match.flow.possession,n=teamNames(match,side),kind=match.flow.restartType||'kickoff';
  match.flow.lane='center';match.flow.phase='possession';match.flow.danger=4;match.flow.sequence++;
  if(kind==='keeper'){
    match.flow.lastEventMeta={lane:'center',carrierRole:'GK',receiverRole:'DF',eventKind:'keeper_restart'};
    match.flow.restartType='';
    return `${minuteText(minute)} 🧤 Вратарь ${n.team} вводит мяч в игру короткой передачей защитнику после сейва`;
  }
  if(kind==='goal_kick'){
    match.flow.lastEventMeta={lane:'center',carrierRole:'GK',receiverRole:'DF',eventKind:'goal_kick'};
    match.flow.restartType='';
    return `${minuteText(minute)} 🥅 ${n.team} начинает новую атаку розыгрышем от ворот`;
  }
  if(kind==='corner'){
    match.flow.lastEventMeta={lane:match.flow.lane||'center',carrierRole:'MF',receiverRole:'FW',eventKind:'corner_restart'};
    match.flow.restartType='';
    return `${minuteText(minute)} 🚩 ${n.team} подаёт угловой в штрафную ${n.rival}`;
  }
  match.flow.lastEventMeta={lane:'center',carrierRole:'MF',receiverRole:'MF',eventKind:'kickoff'};
  match.flow.restartType='';
  return `${minuteText(minute)} 🔄 ${n.team} разыгрывает мяч с центра поля после пропущенного гола`;
}

function possessionEvent(match,minute){
  const side=match.flow.possession,n=teamNames(match,side),info=window.WLTeamData?.get(n.team)||{style:'начинает позиционную атаку',attackSide:'через центр',profile:'balanced'};
  const lane=info.attackSide.includes('лев')?'left':info.attackSide.includes('прав')?'right':Math.random()<.22?(Math.random()<.5?'left':'right'):'center';match.flow.lane=lane;
  match.flow.lastEventMeta={lane,carrierRole:Math.random()<.22?'DF':'MF',receiverRole:'FW',teamStyle:info.profile||'balanced',eventKind:'possession'};
  match.flow.phase='build_up';
  match.flow.danger=Math.max(5,match.flow.danger*.55)+6+Math.random()*7;
  bump(match,side,'Attacks');
  match.market[side+'Momentum']=Math.min(1,(match.market[side+'Momentum']||0)+.045);
  return `${minuteText(minute)} ⚽ ${n.team} контролирует мяч и ${info.style} ${info.attackSide} против ${n.rival}`;
}

function buildUpEvent(match,minute){
  const side=match.flow.possession,other=opposite(side),n=teamNames(match,side),lane=match.flow.lane||'center';
  match.flow.lastEventMeta={lane,carrierRole:'MF',receiverRole:'FW',eventKind:'build_up'};
  const loseChance=.15+(sideScore(match,side)>rivalScore(match,side)?.045:0)+(match.flow.danger<12?.025:0);
  if(Math.random()<loseChance){
    match.flow.possession=other;
    match.flow.phase='possession';
    match.flow.danger=6;
    match.flow.lastEventMeta={lane,carrierRole:'MF',receiverRole:'DF',eventKind:'interception',attackingSide:other,sourceSide:side,interceptorSide:other};
    return `${minuteText(minute)} 🛡️ DF ${n.rival} читает передачу MF ${n.team}, перехватывает мяч и начинает контратаку`;
  }
  if(Math.random()<.14&&minute-match.flow.lastMajorMinute>=4){
    bump(match,other,'Cards');
    match.flow.lastMajorMinute=minute;
    match.flow.danger+=7;
    return `${minuteText(minute)} 🟨 Игрок ${n.rival} получает предупреждение, останавливая перспективную атаку ${n.team}`;
  }
  match.flow.phase='final_third';
  match.flow.danger+=12+Math.random()*14;
  const oneOnOne=Math.random()<(.10+Math.max(0,(side==='home'?match.homeAttack:match.awayAttack)-(side==='home'?match.awayDefense:match.homeDefense))/420);
  match.flow.oneOnOne=oneOnOne;
  if(oneOnOne){match.flow.danger=Math.max(match.flow.danger,72);match.flow.lastEventMeta={lane,carrierRole:'FW',receiverRole:'GK',eventKind:'one_on_one',attackingSide:side};return `${minuteText(minute)} ⚡ Нападающий ${n.team} вырывается один на один с вратарём ${n.rival}`;}
  return `${minuteText(minute)} 🔥 ${n.team} продвигает мяч к штрафной ${n.rival} и усиливает давление`;
}

function resolveShot(match,minute,ts){
  const side=match.flow.possession,other=opposite(side),n=teamNames(match,side),lane=match.flow.lane||'center';
  match.flow.lastEventMeta={lane,carrierRole:'MF',receiverRole:'FW',eventKind:'shot'};
  bump(match,side,'Shots');
  match.market[side+'Momentum']=Math.min(1,(match.market[side+'Momentum']||0)+.12);
  match.market[opposite(side)+'Momentum']=Math.max(0,(match.market[opposite(side)+'Momentum']||0)-.025);
  match.flow.lastShotMinute=minute;
  const attack=side==='home'?match.homeAttack:match.awayAttack;
  const defense=side==='home'?match.awayDefense:match.homeDefense;
  const canScore=minute-match.flow.lastGoalMinute>=6;
  const oneOnOne=Boolean(match.flow.oneOnOne);
  let goalChance=.085+(attack-defense)/390+Math.min(.095,match.flow.danger/620)+(oneOnOne?.145:0);
  if(sideScore(match,side)<rivalScore(match,side))goalChance+=.025;
  if(minute>75)goalChance+=.015;
  goalChance=Math.max(.045,Math.min(.23,goalChance));
  const roll=Math.random();
  match.flow.oneOnOne=false;

  if(canScore&&roll<goalChance){
    if(side==='home')match.scoreH++;else match.scoreA++;
    bump(match,side,'Attacks');
    const scorer=tacticalPlayer(n.team,'FW',1+Math.floor(Math.random()*3));
    match.goalLog.push({minute,team:n.team,against:n.rival,scoreH:match.scoreH,scoreA:match.scoreA,player:scorer});
    match.flow.lastGoalMinute=minute;
    match.flow.lastMajorMinute=minute;
    match.flow.possession=other;
    match.flow.phase='kickoff';
    match.flow.restartType='kickoff';
    match.flow.lastEventMeta={lane,carrierRole:'FW',receiverRole:'GK',eventKind:'goal',actorName:scorer,scorer};
    match.flow.danger=0;
    match.market[other+'Support']=Math.min(.95,(match.market[other+'Support']||.5)+.10);
    match.market[other+'Momentum']=Math.min(1,(match.market[other+'Momentum']||0)+.08);
    match.market[side+'Momentum']=Math.max(0,(match.market[side+'Momentum']||0)-.18);
    onGoal(match,ts);
    return `${minuteText(minute)} ⚽ ГОЛ! ${scorer} ${oneOnOne?'хладнокровно реализует выход один на один':'завершает последовательную атаку '+n.team} — счёт ${match.scoreH}:${match.scoreA}`;
  }

  match.flow.danger=5;
  if(roll<.57){
    match.flow.possession=other;match.flow.phase='restart';match.flow.restartType='keeper';
    match.flow.lastEventMeta={lane,carrierRole:'FW',receiverRole:'GK',eventKind:'save'};
    bump(match,other,'Saves');
    return `${minuteText(minute)} 🧤 Вратарь ${n.rival} отражает удар ${n.team}, фиксирует мяч и готовит ввод в игру`;
  }
  if(roll<.84){
    match.flow.possession=other;match.flow.phase='restart';match.flow.restartType='goal_kick';
    match.flow.lastEventMeta={lane,carrierRole:'FW',receiverRole:'GK',eventKind:'miss'};
    return `${minuteText(minute)} 💥 ${n.team} пробивает рядом со штангой ворот ${n.rival}; мяч покидает поле`;
  }
  match.flow.possession=side;match.flow.phase='restart';match.flow.restartType='corner';
  match.flow.lastEventMeta={lane,carrierRole:'FW',receiverRole:'DF',eventKind:'blocked_shot'};
  return `${minuteText(minute)} 🚩 Защитник ${n.rival} блокирует удар ${n.team}, мяч уходит на угловой`;
}


function matchPhase(match,minute){
  if(minute<18)return 'cautious';
  if(minute<60)return 'structured';
  if(minute<78)return Math.abs(match.scoreH-match.scoreA)<=1?'intense':'controlled';
  return 'finale';
}
function microEvent(match,minute){
  const error=window.WLLivingMatch?WLLivingMatch.humanError(match,minute):null;if(error){match.flow.lastEventMeta=error.meta;return error.text;}
  const side=match.flow.possession,other=opposite(side),n=teamNames(match,side),lane=match.flow.lane||'center';
  const phase=match.flow.phase,gamePhase=matchPhase(match,minute),brains=window.WLTeamBrain?WLTeamBrain.update(match):match.teamBrain;
  const defendingBrain=brains?.[other]||{pressIntensity:.65,mode:'DEFEND'},attackingBrain=brains?.[side]||{risk:.55,mode:'ATTACK'};
  const pressRole=Math.random()<.62?'MF':'FW',pressNo=1+Math.floor(Math.random()*3),coverNo=1+Math.floor(Math.random()*4),supportNo=1+Math.floor(Math.random()*3);
  const pressure=WLMatches.clamp(defendingBrain.pressIntensity*(phase==='build_up'?1.08:phase==='final_third'?.92:.84),0,1);
  const recoveryChance=.07+pressure*.14+(defendingBrain.mode==='HIGH_PRESS'?.065:0)+(phase==='build_up'?.02:0);
  const escapeQuality=.46+(attackingBrain.risk||.55)*.12;
  const successChance=.30+pressure*.23-escapeQuality*.10;
  if(Math.random()<recoveryChance){
    const method=Math.random()<.56?'intercept':'tackle',success=Math.random()<successChance;
    const text=window.WLCommentary2?.recovery({minute,defendingTeam:n.rival,attackingTeam:n.team,presserRole:pressRole,presserIndex:pressNo,coverIndex:coverNo,method,success})||`${minuteText(minute)} ${n.rival} пытается вернуть мяч`;
    if(success){match.flow.possession=other;match.flow.phase='possession';match.flow.danger=Math.max(5,match.flow.danger*.35);match.flow.lastEventMeta={lane,carrierRole:method==='intercept'?'DF':pressRole,receiverRole:'MF',eventKind:'interception',attackingSide:other,recoveryMethod:method,success:true};bump(match,other,'Interceptions');}
    else {match.flow.danger=Math.min(92,(match.flow.danger||0)+4);match.flow.lastEventMeta={lane,carrierRole:phase==='final_third'?'FW':'MF',receiverRole:'MF',micro:true,eventKind:'escape_pressure',attackingSide:side,recoveryMethod:method,success:false};}
    return success?text:`${minuteText(minute)} 🧠 ${n.team} замечает давление: игрок уходит от опеки и быстро переводит мяч на свободного партнёра`;
  }
  if(Math.random()<.36){
    const text=window.WLCommentary2?.support({minute,team:n.team,ownerRole:phase==='possession'?'DF':'MF',runnerRole:phase==='final_third'?'FW':'MF',runnerIndex:supportNo,lane});
    match.flow.lastEventMeta={lane,carrierRole:phase==='possession'?'DF':'MF',receiverRole:phase==='final_third'?'FW':'MF',micro:true,eventKind:'support',attackingSide:side};return text;
  }
  const label=window.WLTeamBrain?.label(attackingBrain)||'атака';
  const tactical=window.WLCommentary2?.teamState({minute,team:n.team,label,reason:attackingBrain.lastReason||'Команда перестраивается'})||`${minuteText(minute)} ${n.team} перестраивается`;
  match.flow.lastEventMeta={lane,carrierRole:'MF',receiverRole:'FW',micro:true,eventKind:'shape',attackingSide:side,teamMode:attackingBrain.mode,gamePhase};return tactical;
}
function advanceMatchFlow(match,minute,ts){
  ensureMatchMemory(match);
  if(match.flow.phase==='kickoff'||match.flow.phase==='restart')return restartEvent(match,minute);
  if(match.flow.phase==='possession')return possessionEvent(match,minute);
  if(match.flow.phase==='build_up')return buildUpEvent(match,minute);
  if(match.flow.phase==='final_third')return resolveShot(match,minute,ts);
  match.flow.phase='possession';
  return possessionEvent(match,minute);
}

function buildSummary(match){
  ensureMatchMemory(match);
  const h=match.home,a=match.away,sh=match.scoreH,sa=match.scoreA,stats=match.eventStats;
  let first='';
  if(sh>sa)first=`${h} побеждает ${a} со счётом ${sh}:${sa}.`;
  else if(sa>sh)first=`${a} побеждает ${h} со счётом ${sa}:${sh}.`;
  else first=`${h} и ${a} завершают матч вничью — ${sh}:${sa}.`;
  let story='';
  if(match.goalLog.length){
    const opener=match.goalLog[0],last=match.goalLog[match.goalLog.length-1];
    const hadComeback=match.goalLog.some((g,i)=>i>0&&g.scoreH===g.scoreA);
    if(hadComeback&&sh!==sa)story=`После равного счёта решающий гол забила команда ${last.team} на ${last.minute}-й минуте.`;
    else if(hadComeback)story=`${opener.team} открыла счёт, но соперник сумел отыграться.`;
    else if(match.goalLog.length===1)story=`Единственный гол забила команда ${opener.team} на ${opener.minute}-й минуте.`;
    else story=`Счёт открыла команда ${opener.team}, а последней отличилась ${last.team} на ${last.minute}-й минуте.`;
  }else story='Команды создавали атаки последовательно, но вратари и защита сохранили нули на табло.';
  const homePressure=(stats.homeAttacks||0)+(stats.homeShots||0)*1.5,awayPressure=(stats.awayAttacks||0)+(stats.awayShots||0)*1.5;
  let flow='';
  if(Math.abs(homePressure-awayPressure)<3)flow='Игра проходила в равной борьбе, с регулярной сменой владения.';
  else {const dominant=homePressure>awayPressure?h:a,defending=homePressure>awayPressure?a:h;flow=`${dominant} чаще развивал завершённые атаки, однако ${defending} долго сохранял интригу.`;}
  const base=`${first} ${story} ${flow}`;return window.WLLivingMatch?WLLivingMatch.summary(match,base):base;
}

function buildFinalStats(match){
  const s=match.eventStats||{};
  const homeShots=Number(s.homeShots||0),awayShots=Number(s.awayShots||0);
  const homeSaves=Number(s.homeSaves||0),awaySaves=Number(s.awaySaves||0);
  const homeAttacks=Number(s.homeAttacks||0),awayAttacks=Number(s.awayAttacks||0);
  const totalPressure=Math.max(1,homeAttacks+awayAttacks+homeShots+awayShots);
  const homePoss=Math.round(WLMatches.clamp(50+((homeAttacks+homeShots)-(awayAttacks+awayShots))/totalPressure*22,32,68));
  return {
    homeShots,awayShots,
    homeOnTarget:Math.max(match.scoreH,Math.min(homeShots,match.scoreH+awaySaves)),
    awayOnTarget:Math.max(match.scoreA,Math.min(awayShots,match.scoreA+homeSaves)),
    homePossession:homePoss,awayPossession:100-homePoss,
    homeCards:Number(s.homeCards||0),awayCards:Number(s.awayCards||0)
  };
}
function choosePlayerOfMatch(match){
  const livingHero=window.WLLivingMatch?.hero(match);if(livingHero)return livingHero;
  const winner=match.scoreH>match.scoreA?'home':match.scoreA>match.scoreH?'away':null;
  const team=winner==='home'?match.home:winner==='away'?match.away:(match.eventStats?.homeSaves||0)>=(match.eventStats?.awaySaves||0)?match.home:match.away;
  const role=match.scoreH+match.scoreA===0?'GK':'FW';const number=match.scoreH+match.scoreA===0?1:1+Math.floor(Math.random()*3);const slot=window.WLTeamDB?.slot(team,role,number);
  return {team,name:slot?.fullName||slot?.shortName||`${role}(${number})`,shortName:slot?.shortName||slot?.fullName||`${role}(${number})`,role};
}
function finishMatch(match,ts){
  match.status='FINISHED';match.result=match.scoreH>match.scoreA?'P1':match.scoreH<match.scoreA?'P2':'X';
  match.summary=buildSummary(match);
  match.finalStats=buildFinalStats(match);
  match.playerOfMatch=choosePlayerOfMatch(match);
  match.fullTimeAt=ts;
  match.marketActivityUntil=0;
  match.flow.phase='finished';
  match.flow.lastEventMeta={eventKind:'finish',attackingSide:match.scoreH>=match.scoreA?'home':'away',fullTime:true};
  pushEvent(match,`90' 🏁 Финальный свисток — ${match.home} ${match.scoreH}:${match.scoreA} ${match.away}`);
  setTargets(match,probabilityOdds(match,ts),0);
}

function simulate(match,ts){
  ensureMatchMemory(match);
  if(window.WLTeamBrain)WLTeamBrain.update(match,ts);
  if(match.status==='FINISHED')return;
  if(ts<match.start){match.status='UPCOMING';if(window.WLMarkets)WLMarkets.update(match,ts);return;}
  if(match.status==='UPCOMING'){
    match.status='LIVE';match.lastEvent=ts;match.events=[`0' ⚽ Матч ${match.home} — ${match.away} начался`];match.summary='';
    match.flow={possession:choosePossession(match),phase:'possession',restartType:'',danger:5,lastGoalMinute:-99,lastShotMinute:-99,lastMajorMinute:-99,sequence:0,lane:'center',momentumHome:.5,momentumAway:.5,lastEventMeta:{}};
  }
  const elapsed=ts-match.start,minute=Math.min(90,Math.floor(elapsed/WLMatches.MATCH_DURATION*90));
  if(elapsed>=WLMatches.MATCH_DURATION){finishMatch(match,ts);return;}
  const interval=7000+Math.random()*6500;
  const microInterval=2300+Math.random()*2200;
  if(ts-match.lastEvent>interval){
    match.lastEvent=ts;match.flow.lastMicroEvent=ts;
    pushEvent(match,advanceMatchFlow(match,minute,ts));
  }else if(ts-(match.flow.lastMicroEvent||0)>microInterval&&ts-match.lastEvent>1800){
    match.flow.lastMicroEvent=ts;
    const micro=microEvent(match,minute);
    if(micro)pushEvent(match,micro);
  }
  marketPressure(match,ts);animateOdds(match);if(window.WLMarkets)WLMarkets.update(match,ts);
}

function settleTickets(){const s=WLState.data;s.tickets.filter(t=>t.status==='ACTIVE').forEach(t=>{const related=t.picks.map(p=>s.matches.find(m=>m.id===p.matchId));if(related.some(m=>!m||m.status!=='FINISHED'))return;const won=t.picks.every((p,i)=>window.WLMarkets?WLMarkets.won(related[i],p.market):related[i].result===p.market);t.status=won?'WON':'LOST';if(won){t.payout=Math.floor(t.stake*t.totalOdds);s.tokens+=t.payout;s.rating+=t.picks.length>1?35:12;s.stats.won++;s.stats.bestWin=Math.max(s.stats.bestWin,t.payout);WLEconomy.addXp(Math.min(250,Math.floor(t.payout/10)+20));}else{s.rating=Math.max(0,s.rating-4);s.stats.lost++;WLEconomy.addXp(8);}});}
function tick(){WLMatches.ensure();const s=WLState.data,ts=Date.now();s.matches.forEach(m=>simulate(m,ts));settleTickets();const passive=window.WLEconomy?.passiveValue?WLEconomy.passiveValue():s.passive;if(passive){s.energy+=passive;s.totalEnergy+=passive;s.totalEnergyRun=(s.totalEnergyRun||0)+passive;}for(let i=0;i<s.matches.length;i++){const m=s.matches[i];if(m.status==='FINISHED'&&ts-m.end>45000){const active=s.tickets.some(t=>t.status==='ACTIVE'&&t.picks.some(p=>p.matchId===m.id));if(!active)s.matches[i]=WLMatches.createMatch(i,WLMatches.nextScheduledStart(s.matches),s.matches.filter((_,index)=>index!==i));}}if(!s.matches.some(m=>m.id===s.feedMatchId))s.feedMatchId=(s.matches.find(m=>m.status==='LIVE')||s.matches[0])?.id||'';}
window.WLSimulator={tick,simulate,settleTickets,probabilityOdds,buildSummary,ensureMatchMemory,advanceMatchFlow,updateMarketSentiment,applySentimentResistance,microEvent};
})();

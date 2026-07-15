(()=>{'use strict';
const canvas=document.getElementById('matchCanvas'),ctx=canvas?.getContext('2d');
if(!canvas||!ctx||!window.WLBall){window.WLVisualizer={select(){},render(){}};return;}
const ROLE_INDEX=['GK','DF','DF','DF','DF','MF','MF','MF','FW','FW','FW'];
const FORM={
 home:[[.07,.50],[.23,.17],[.25,.38],[.25,.62],[.23,.83],[.43,.25],[.45,.50],[.43,.75],[.65,.20],[.69,.50],[.65,.80]],
 away:[[.93,.50],[.77,.17],[.75,.38],[.75,.62],[.77,.83],[.57,.25],[.55,.50],[.57,.75],[.35,.20],[.31,.50],[.35,.80]]
};
const state={matchId:'',home:[],away:[],last:0,cssWidth:0,cssHeight:0,dpr:0,eventText:'',momentum:{home:.5,away:.5},highlight:null,possession:'home',lane:'center',lastEventAt:0,logicalOwner:null,lastBallComment:'',lastMajorEventId:'',phase:'possession',tactical:null,crowdEnergy:0,fullTime:{active:false,startedAt:0,stage:'',result:'draw'},pressRecovery:{ownerId:null,defendSide:null,startedAt:0,lastAttemptAt:0,cooldownUntil:0}};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function resize(){const r=canvas.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height),d=Math.min(2,window.devicePixelRatio||1);if(w<2||h<2)return false;const bw=Math.round(w*d),bh=Math.round(h*d);if(canvas.width!==bw||canvas.height!==bh||state.dpr!==d){canvas.width=bw;canvas.height=bh;ctx.setTransform(d,0,0,d,0,0);}state.cssWidth=w;state.cssHeight=h;state.dpr=d;return true;}
function ensureSize(){const r=canvas.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height),d=Math.min(2,window.devicePixelRatio||1);if(w!==state.cssWidth||h!==state.cssHeight||d!==state.dpr)resize();return w>1&&h>1;}
function createPlayers(side,teamName){const counts={GK:0,DF:0,MF:0,FW:0};return FORM[side].map((p,i)=>{const role=ROLE_INDEX[i],number=++counts[role],slot=window.WLTeamDB?.slot(teamName,role,number)||{fullName:role,shortName:role,label:role==='GK'?'GK':`${role}(${number})`,team:teamName};return{id:`${side}_${role.toLowerCase()}_${number}`,side,index:i,role,number,label:slot.label,fullName:slot.fullName,shortName:slot.shortName,teamName,baseX:p[0],baseY:p[1],x:p[0],y:p[1],tx:p[0],ty:p[1],speed:i===0?.045:i<5?.07:i<8?.085:.10,phase:Math.random()*Math.PI*2,idleSpeed:.55+Math.random()*.45,visible:true,labelX:null,labelY:null,labelTargetX:null,labelTargetY:null,labelOpacity:1,labelTargetOpacity:1,labelLockUntil:0,labelAnchor:'bottom'};});}
function reset(match){state.matchId=match?.id||'';state.home=createPlayers('home',match?.home||'Home');state.away=createPlayers('away',match?.away||'Away');state.highlight=null;state.momentum={home:.5,away:.5};state.possession=match?.flow?.possession||'home';state.lane=match?.flow?.lane||'center';state.lastEventAt=performance.now();state.logicalOwner=null;state.fullTime={active:match?.status==='FINISHED',startedAt:performance.now(),stage:match?.status==='FINISHED'?'result':'',result:match?.scoreH>match?.scoreA?'home':match?.scoreA>match?.scoreH?'away':'draw'};state.pressRecovery={ownerId:null,defendSide:null,startedAt:0,lastAttemptAt:0,cooldownUntil:0};WLBall.snap(.5,.5);document.getElementById('visualMatchTitle').textContent=match?`${match.home} — ${match.away}`:'Выберите матч';updateBroadcast(match);}
function select(id){const m=WLState.data.matches.find(x=>x.id===id);if(m&&m.id!==state.matchId)reset(m);}
function players(side){return side==='home'?state.home:state.away;}
function player(side,index){return players(side)[index]||players(side)[6];}
function findPlayerById(id){return [...state.home,...state.away].find(p=>p.id===id)||null;}
function laneY(lane){return lane==='left'?.24:lane==='right'?.76:.50;}
function attackDir(side){return side==='home'?1:-1;}
function mirrorX(side,x){return side==='home'?x:1-x;}
function setTarget(p,x,y){p.tx=clamp(x,.035,.965);p.ty=clamp(y,.07,.93);}
function formationShift(side,attacking,lane,momentum=.5){const dir=attackDir(side),push=(attacking?.055:-.035)+(momentum-.5)*.05,focus=laneY(lane);players(side).forEach(p=>{let rolePush=p.role==='FW'?.065:p.role==='MF'?.035:p.role==='DF'?.012:0;if(!attacking)rolePush*=.25;const lanePull=p.role==='FW'?.12:p.role==='MF'?.08:.035;const naturalWidth=(p.baseY-.5)*(attacking?1.04:.94);const targetY=.5+naturalWidth+(focus-.5)*lanePull;setTarget(p,p.baseX+dir*(push+rolePush),targetY);});}
function defensiveShape(side,lane){const dir=attackDir(side),focus=laneY(lane);players(side).forEach(p=>{if(p.role==='GK')return setTarget(p,p.baseX,p.baseY+(focus-.5)*.05);const retreat=p.role==='DF'?.025:p.role==='MF'?.045:.02;const compact=p.role==='DF'?.90:p.role==='MF'?.84:.78;setTarget(p,p.baseX-dir*retreat,.5+(p.baseY-.5)*compact+(focus-.5)*.07);});}
function chooseActor(side,role,lane){const list=players(side).filter(p=>p.role===role);if(!list.length)return player(side,6);const target=laneY(lane);return list.reduce((a,b)=>Math.abs(a.baseY-target)<Math.abs(b.baseY-target)?a:b);}
function showBallComment(text){if(!text||text===state.lastBallComment)return;state.lastBallComment=text;document.getElementById('visualEventText').textContent=text;}
function attachTo(p,reason='control',{forceSnap=false}={}){if(!p)return;state.logicalOwner=p;state.highlight=p;const d=WLBall.distanceTo(p);if(!forceSnap&&d>.12&&!WLBall.isBusy()){WLBall.transition({x:WLBall.state.x,y:WLBall.state.y},p,{duration:Math.min(950,420+d*900),kind:'recovery',reason:`continuity-${reason}`,onDone:()=>WLBall.attach(p,reason,{snap:false})});}else WLBall.attach(p,reason,{snap:forceSnap||d<=.12});}
function transferTo(target,{kind='pass',duration=700,comment='',force=false}={}){
 if(!target)return;
 if(WLBall.isBusy()&&!force)return false;
 const current=state.logicalOwner||WLBall.state.owner;
 if(current===target){attachTo(target,'keep-control');return true;}
 const from=current||(()=>({x:WLBall.state.x,y:WLBall.state.y}));
 state.logicalOwner=target;state.highlight=target;if(comment)showBallComment(comment);
 const done=()=>attachTo(target,kind);
 if(kind==='interception')WLBall.intercept(from,target,duration,done);
 else if(kind==='recovery')WLBall.rebound(from,target,duration,done);
 else WLBall.pass(from,target,duration,done);
 return true;
}
function queuePass(from,to,duration=700,comment=''){
 if(!from||!to)return;state.logicalOwner=to;state.highlight=to;if(comment)showBallComment(comment);
 WLBall.pass(from,to,duration,()=>attachTo(to,'pass-complete'));
}
function applyEvent(match,event){
 const meta=event.meta||{},attack=event.attackingSide||'home',def=attack==='home'?'away':'home',lane=meta.lane||'center';
 const isMicro=!!meta.micro;
 const type=meta.eventKind||event.type;
 if(isMicro&&WLBall.isBusy())return;
 state.possession=attack;state.lane=lane;state.phase=type==='attack'?'build_up':type==='shot'||type==='save'||type==='miss'||type==='goal'?'final_third':type==='kickoff'?'kickoff':type;state.lastEventAt=performance.now();
 const mom=match.market||{};state.momentum={home:clamp(.5+(mom.homeMomentum||0)*.35-(mom.awayMomentum||0)*.18,.1,.9),away:0};state.momentum.away=1-state.momentum.home;
 formationShift(attack,true,lane,state.momentum[attack]);defensiveShape(def,lane);
 const carrier=chooseActor(attack,meta.carrierRole||'MF',lane),receiver=chooseActor(attack,meta.receiverRole||'FW',lane),defender=chooseActor(def,'DF',lane),keeper=chooseActor(def,'GK',lane);
 const finalX=mirrorX(attack,.78),shotX=mirrorX(attack,.93),ly=laneY(lane);
 state.crowdEnergy=Number(match.living?.crowdEnergy||event.meta?.crowdEnergy||0);state.eventText=event.text;document.getElementById('visualEventText').textContent=event.text;
 if(type==='kickoff'){
   players(attack).forEach(p=>setTarget(p,p.baseX,p.baseY));
   transferTo(chooseActor(attack,'MF','center'),{kind:state.logicalOwner&&state.logicalOwner.side!==attack?'interception':'pass',duration:650,comment:event.text,force:true});
 }
 else if(type==='keeper_restart'||type==='goal_kick'){
   const gk=chooseActor(attack,'GK','center'),df=chooseActor(attack,'DF',lane);
   attachTo(gk,'restart');setTarget(df,mirrorX(attack,.30),ly);queuePass(gk,df,760,event.text);
 }
 else if(type==='corner_restart'){
   const taker=chooseActor(attack,'MF',lane),target=chooseActor(attack,'FW','center');attachTo(taker,'corner');queuePass(taker,target,900,event.text);
 }
 else if(type==='possession'){
   setTarget(carrier,mirrorX(attack,.49),ly);
   const mode=state.logicalOwner&&state.logicalOwner.side!==attack?'interception':'pass';
   transferTo(carrier,{kind:mode,duration:mode==='interception'?620:720,comment:event.text,force:true});
 }
 else if(type==='build_up'||type==='attack'){
   setTarget(carrier,mirrorX(attack,.60),ly);setTarget(receiver,finalX,clamp(ly+(Math.random()-.5)*.12,.12,.88));setTarget(defender,mirrorX(def,.25),receiver.ty);
   if(!state.logicalOwner||state.logicalOwner.side!==attack)transferTo(carrier,{kind:'interception',duration:620,comment:`${carrier.fullName} (${carrier.label}) возвращает владение для ${attack==='home'?match.home:match.away}`,force:true});
   else if(state.logicalOwner!==carrier)queuePass(state.logicalOwner,carrier,520);
   queuePass(carrier,receiver,820,event.text);
 }
 else if(type==='interception'){
   const interceptor=findPlayerById(meta.actorId)||chooseActor(attack,meta.actorRole||'DF',lane),source=findPlayerById(meta.sourceId)||(state.logicalOwner&&state.logicalOwner.side!==attack?state.logicalOwner:chooseActor(def,'MF',lane));
   setTarget(interceptor,mirrorX(attack,.48),ly);setTarget(source,mirrorX(def,.54),ly);state.logicalOwner=interceptor;state.highlight=interceptor;
   showBallComment(`🛡️ ${interceptor.fullName} (${interceptor.label}) перехватывает передачу ${source.fullName} (${source.label}) — владение получает ${attack==='home'?match.home:match.away}`);
   WLBall.intercept(source,interceptor,720,()=>attachTo(interceptor,'interception-complete'));
 }
 else if(type==='short_pass'){
   const from=state.logicalOwner&&state.logicalOwner.side===attack?state.logicalOwner:chooseActor(attack,meta.carrierRole||'DF',lane),to=chooseActor(attack,meta.receiverRole||'MF',lane);
   setTarget(from,mirrorX(attack,.42),laneY(lane));setTarget(to,mirrorX(attack,.53),clamp(laneY(lane)+(Math.random()-.5)*.10,.12,.88));
   if(!state.logicalOwner||state.logicalOwner.side!==attack)attachTo(from,'micro-control');queuePass(from,to,700,event.text);
 }
 else if(['shot','save','miss','goal','blocked_shot'].includes(type)){
   const shooter=state.logicalOwner&&state.logicalOwner.side===attack?state.logicalOwner:receiver;
   setTarget(shooter,mirrorX(attack,.76),ly);setTarget(defender,mirrorX(def,.20),ly);setTarget(keeper,keeper.baseX,clamp(ly,.32,.68));
   if(state.logicalOwner!==shooter){if(state.logicalOwner&&state.logicalOwner.side===attack)queuePass(state.logicalOwner,shooter,430);else transferTo(shooter,{kind:'recovery',duration:620,comment:`${shooter.fullName} (${shooter.label}) выходит к мячу перед ударом`,force:true});}
   const target={x:shotX,y:type==='miss'?(Math.random()<.5?.08:.92):clamp(keeper.ty+(Math.random()-.5)*.12,.25,.75)};
   state.logicalOwner=null;state.highlight=shooter;WLBall.shot(shooter,target,type==='goal'?1050:820,()=>{
     if(type==='save'){attachTo(keeper,'save');showBallComment(`🧤 Вратарь ${def==='home'?match.home:match.away} контролирует мяч после сейва`);}
     else if(type==='miss'){state.logicalOwner=null;WLBall.rebound(target,{x:mirrorX(def,.12),y:.5},420,()=>{const gk=keeper;attachTo(gk,'goal-kick-ready');});}
     else if(type==='blocked_shot'){state.logicalOwner=null;WLBall.rebound(target,defender,420,()=>attachTo(defender,'block-recovery'));}
     else if(type==='goal'){state.logicalOwner=null;WLBall.snap(shotX,.5);}
   });
 }
 else if(type==='support'||type==='pressing'||type==='shape'){
   formationShift(attack,true,lane,state.momentum[attack]);defensiveShape(def,lane);
   if(!state.logicalOwner){const owner=chooseActor(attack,meta.carrierRole||'MF',lane);attachTo(owner,'support-control');}
 }
 else if(type==='finish'){
   state.logicalOwner=null;state.highlight=null;WLBall.clear();WLBall.snap(.5,.5);
   state.fullTime={active:true,startedAt:performance.now(),stage:'slowdown',result:match.scoreH>match.scoreA?'home':match.scoreA>match.scoreH?'away':'draw'};
   state.phase='finished';
   showBallComment(`🏁 Матч завершён — ${match.home} ${match.scoreH}:${match.scoreA} ${match.away}`);
 }
}
function field(w,h){ctx.clearRect(0,0,w,h);ctx.fillStyle='#0b7a3b';ctx.fillRect(0,0,w,h);if(state.crowdEnergy>.35){ctx.fillStyle=`rgba(255,145,45,${Math.min(.12,state.crowdEnergy*.10)})`;ctx.fillRect(0,0,w,h);}ctx.strokeStyle='rgba(255,255,255,.84)';ctx.lineWidth=2;ctx.strokeRect(10,10,w-20,h-20);ctx.beginPath();ctx.moveTo(w/2,10);ctx.lineTo(w/2,h-10);ctx.stroke();ctx.beginPath();ctx.arc(w/2,h/2,Math.min(w,h)*.12,0,Math.PI*2);ctx.stroke();ctx.strokeRect(10,h*.27,w*.14,h*.46);ctx.strokeRect(w-10-w*.14,h*.27,w*.14,h*.46);}
function drawMarker(p,color,w,h){
 if(p.visible===false)return;
 const px=p.x*w,py=p.y*h,owns=WLBall.state.owner===p||state.logicalOwner===p;
 if(state.highlight===p||owns){ctx.beginPath();ctx.strokeStyle=owns?'#fff6a8':'rgba(255,255,255,.9)';ctx.lineWidth=owns?2.6:1.8;ctx.arc(px,py,owns?11.5:10,0,Math.PI*2);ctx.stroke();}
 ctx.beginPath();ctx.fillStyle=color;ctx.arc(px,py,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.4;ctx.stroke();
}
function boxesOverlap(a,b,pad=2){return !(a.right+pad<b.left||a.left-pad>b.right||a.bottom+pad<b.top||a.top-pad>b.bottom);}
function labelPriority(p,w,h){
 const owns=WLBall.state.owner===p||state.logicalOwner===p;
 if(owns)return 1000;
 if(state.highlight===p)return 900;
 const bx=WLBall.state.x*w,by=WLBall.state.y*h,px=p.x*w,py=p.y*h;
 return 500-Math.hypot(px-bx,py-by)+(p.role==='GK'?-80:0);
}
function updateLabelMotion(p,targetX,targetY,targetOpacity,now,dt){
 if(!Number.isFinite(p.labelX)){p.labelX=targetX;p.labelY=targetY;p.labelTargetX=targetX;p.labelTargetY=targetY;p.labelOpacity=targetOpacity;p.labelTargetOpacity=targetOpacity;}
 const targetMoved=Math.hypot((p.labelTargetX??targetX)-targetX,(p.labelTargetY??targetY)-targetY)>5;
 if(targetMoved&&now>=(p.labelLockUntil||0)){
   p.labelTargetX=targetX;p.labelTargetY=targetY;p.labelLockUntil=now+420;
 }else if(!Number.isFinite(p.labelTargetX)){p.labelTargetX=targetX;p.labelTargetY=targetY;}
 p.labelTargetOpacity=targetOpacity;
 const moveFactor=1-Math.exp(-10*Math.max(.001,dt));
 const fadeFactor=1-Math.exp(-8*Math.max(.001,dt));
 p.labelX+=(p.labelTargetX-p.labelX)*moveFactor;
 p.labelY+=(p.labelTargetY-p.labelY)*moveFactor;
 p.labelOpacity+=(p.labelTargetOpacity-p.labelOpacity)*fadeFactor;
}
function drawSmartLabels(players,w,h,now,dt){
 const occupied=[];
 const markerBoxes=players.filter(p=>p.visible!==false).map(p=>({left:p.x*w-10,right:p.x*w+10,top:p.y*h-10,bottom:p.y*h+10}));
 const offsets=[
  {name:'bottom',x:0,y:18},{name:'top',x:0,y:-19},{name:'right',x:25,y:0},{name:'left',x:-25,y:0},
  {name:'bottomRight',x:22,y:16},{name:'bottomLeft',x:-22,y:16},{name:'topRight',x:22,y:-16},{name:'topLeft',x:-22,y:-16},
  {name:'farBottom',x:0,y:31},{name:'farTop',x:0,y:-31},{name:'farRight',x:36,y:0},{name:'farLeft',x:-36,y:0}
 ];
 const sorted=players.filter(p=>p.visible!==false).slice().sort((a,b)=>labelPriority(b,w,h)-labelPriority(a,w,h));
 for(const p of sorted){
  const surname=String(p.shortName||p.fullName||p.label).split(/\s+/).slice(-1)[0];
  ctx.font='8.5px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  const padX=4,labelH=13,textW=ctx.measureText(surname).width,labelW=textW+padX*2;
  const px=p.x*w,py=p.y*h;
  let chosen=null;
  const currentAnchor=p.labelAnchor;
  const ordered=currentAnchor?[...offsets.filter(o=>o.name===currentAnchor),...offsets.filter(o=>o.name!==currentAnchor)]:offsets;
  for(const off of ordered){
   const cx=px+off.x,cy=py+off.y;
   const box={left:cx-labelW/2,right:cx+labelW/2,top:cy-labelH/2,bottom:cy+labelH/2};
   if(box.left<3||box.right>w-3||box.top<38||box.bottom>h-3)continue;
   if(occupied.some(o=>boxesOverlap(box,o,2)))continue;
   if(markerBoxes.some(m=>boxesOverlap(box,m,1)))continue;
   chosen={cx,cy,box,off};break;
  }
  const important=labelPriority(p,w,h)>=850;
  if(!chosen&&important){
   for(const off of ordered){
    const cx=px+off.x,cy=py+off.y;
    const box={left:cx-labelW/2,right:cx+labelW/2,top:cy-labelH/2,bottom:cy+labelH/2};
    if(box.left<3||box.right>w-3||box.top<38||box.bottom>h-3)continue;
    if(!occupied.some(o=>boxesOverlap(box,o,1))){chosen={cx,cy,box,off};break;}
   }
  }
  const fallbackX=px,fallbackY=py+18;
  updateLabelMotion(p,chosen?.cx??fallbackX,chosen?.cy??fallbackY,chosen?1:0,now,dt);
  if(chosen){p.labelAnchor=chosen.off.name;occupied.push(chosen.box);}
  if(p.labelOpacity<.04)continue;
  const cx=p.labelX,cy=p.labelY;
  const box={left:cx-labelW/2,right:cx+labelW/2,top:cy-labelH/2,bottom:cy+labelH/2};
  const shifted=Math.hypot(cx-px,cy-py)>21;
  ctx.globalAlpha=clamp(p.labelOpacity,0,1);
  if(shifted){ctx.beginPath();ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=.8;ctx.moveTo(px,py);ctx.lineTo(cx,cy);ctx.stroke();}
  ctx.fillStyle='rgba(5,10,12,.76)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(box.left,box.top,labelW,labelH,3);else ctx.rect(box.left,box.top,labelW,labelH);ctx.fill();
  ctx.fillStyle='#fff';ctx.fillText(surname,cx,cy);ctx.globalAlpha=1;
 }
 ctx.textAlign='left';ctx.textBaseline='alphabetic';
}

function postMatchTargets(now){
 const ft=state.fullTime,age=(now-ft.startedAt)/1000;
 ft.stage=age<1.5?'slowdown':age<4.3?'reaction':age<7.3?'handshake':age<10.5?'lineup':age<15.5?'home_exit':age<20.5?'away_exit':'cleared';
 const winner=ft.result;
 for(const p of [...state.home,...state.away]){
   p.visible=true;
   const isWinner=winner!=='draw'&&p.side===winner;
   if(ft.stage==='slowdown'){
     setTarget(p,p.x,p.y);
   }else if(ft.stage==='reaction'){
     if(isWinner&&p.role!=='GK')setTarget(p,p.side==='home'?.49:.51,.34+(p.index%6)*.055);
     else if(winner==='draw'&&p.role!=='GK')setTarget(p,p.side==='home'?.46:.54,.22+(p.index%7)*.085);
     else setTarget(p,p.baseX+(p.side==='home'?-0.015:.015),p.baseY);
   }else if(ft.stage==='handshake'){
     const row=p.index%11;
     setTarget(p,p.side==='home'?.47:.53,.12+row*.076);
   }else if(ft.stage==='lineup'){
     const row=p.index%11;
     setTarget(p,p.side==='home'?.47:.53,.12+row*.076);
   }else if(ft.stage==='home_exit'){
     const row=p.index%11;
     if(p.side==='home')setTarget(p,.47,-.12-row*.035);
     else setTarget(p,.53,.12+row*.076);
     if(p.side==='home'&&p.y<-.05)p.visible=false;
   }else if(ft.stage==='away_exit'){
     const row=p.index%11;
     if(p.side==='home'){p.visible=false;setTarget(p,.47,-.25);}
     else setTarget(p,.53,1.12+row*.035);
     if(p.side==='away'&&p.y>1.05)p.visible=false;
   }else{
     p.visible=false;
   }
   p.liveTx=p.tx;p.liveTy=p.ty;
 }
}
function resolvePlayerCollisions(){
 const all=[...state.home,...state.away].filter(p=>p.visible!==false);
 const min=state.fullTime.active?.038:.032;
 for(let pass=0;pass<2;pass++){
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
   const a=all[i],b=all[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
   if(d<=0||d>=min)continue;
   const overlap=(min-d)*.52,nx=dx/d,ny=dy/d;
   const aFixed=a.role==='GK'&&!state.fullTime.active,bFixed=b.role==='GK'&&!state.fullTime.active;
   if(!aFixed){a.x=clamp(a.x-nx*overlap,.025,.975);a.y=clamp(a.y-ny*overlap,-.3,1.3);}
   if(!bFixed){b.x=clamp(b.x+nx*overlap,.025,.975);b.y=clamp(b.y+ny*overlap,-.3,1.3);}
  }
 }
}
function pressureRecoveryTick(now,match,tactical){
 if(!match||state.fullTime.active||!tactical||WLBall.isBusy())return;
 const owner=state.logicalOwner||WLBall.state.owner;
 if(!owner||owner.side!==tactical.attack)return;
 const pressers=[...(tactical.pressers||[])].filter(p=>p.visible!==false).sort((a,b)=>Math.hypot(a.x-owner.x,a.y-owner.y)-Math.hypot(b.x-owner.x,b.y-owner.y));
 const close=pressers.filter(p=>Math.hypot(p.x-owner.x,p.y-owner.y)<.066);
 const defend=tactical.defend,pr=state.pressRecovery;
 if(close.length<1||tactical.ballPressure<.44){pr.ownerId=null;pr.defendSide=null;pr.startedAt=0;pr.escapeAttempts=0;return;}
 if(pr.ownerId!==owner.id||pr.defendSide!==defend){pr.ownerId=owner.id;pr.defendSide=defend;pr.startedAt=now;pr.escapeAttempts=0;return;}
 if(now<pr.cooldownUntil)return;
 const held=(now-pr.startedAt)/1000,prof=window.WLTacticalAI?.profile(owner)||{footballIQ:78,vision:76,decisions:76,confidence:.65,risk:.5};
 const pressureBonus=Math.max(0,close.length-1)*.20+(tactical.ballPressure-.44)*.9;
 const threshold=clamp(1.35-prof.decisions/260-pressureBonus,.38,1.05);
 if(held<threshold)return;
 pr.lastAttemptAt=now;pr.escapeAttempts=(pr.escapeAttempts||0)+1;
 const pass=tactical.passOptions?.find(o=>o.player&&o.player.visible!==false&&o.risk<(.70+prof.vision/900)&&o.space>.035);
 const passChance=clamp(.26+prof.vision/210+prof.decisions/360-(close.length-1)*.12-tactical.ballPressure*.13,.28,.88);
 if(pass&&Math.random()<passChance){
   const receiver=pass.player,teamName=owner.side==='home'?match.home:match.away;
   pr.cooldownUntil=now+1450;pr.startedAt=now;pr.ownerId=receiver.id;pr.escapeAttempts=0;
   match.flow=match.flow||{};match.flow.possession=owner.side;match.flow.danger=Math.min(94,(match.flow.danger||0)+5);
   queuePass(owner,receiver,560,`${Math.max(1,window.WLTeamBrain?.minute(match)||0)}' ⚡ ${owner.shortName} замечает прессинг и в одно касание отдаёт свободному ${receiver.shortName}; ${teamName} сохраняет атаку`);
   return;
 }
 const escape=tactical.escapeTarget||window.WLTacticalAI?.escapeTarget?.(owner,players(defend));
 const evadeChance=clamp(.30+prof.decisions/260+prof.confidence*.20+prof.risk*.10-(close.length-1)*.16-tactical.ballPressure*.16,.24,.82);
 if(escape&&Math.random()<evadeChance&&pr.escapeAttempts<3){
   owner.tx=escape.x;owner.ty=escape.y;owner.liveTx=escape.x;owner.liveTy=escape.y;
   pr.cooldownUntil=now+950;pr.startedAt=now;
   match.flow.danger=Math.min(92,(match.flow.danger||0)+3);
   showBallComment(`${Math.max(1,window.WLTeamBrain?.minute(match)||0)}' 🌀 ${owner.shortName} закрывает мяч корпусом, меняет направление и уходит из-под прессинга`);
   return;
 }
 const winner=close[0],second=close[1]||winner,winnerIQ=window.WLTacticalAI?.profile(winner)?.footballIQ||78;
 const successChance=clamp(.34+(close.length-1)*.16+tactical.ballPressure*.19+winnerIQ/760-prof.footballIQ/920,.28,.86);
 const forced=pr.escapeAttempts>=3&&held>threshold+.65,success=Math.random()<successChance||forced;
 pr.cooldownUntil=now+1750;pr.startedAt=now;
 if(success){
   match.flow=match.flow||{};match.flow.possession=defend;match.flow.phase='possession';match.flow.danger=Math.max(0,(match.flow.danger||0)-14);pr.escapeAttempts=0;
   const teamName=defend==='home'?match.home:match.away;
   const text=`${Math.max(1,window.WLTeamBrain?.minute(match)||0)}' ⚔️ ${winner.shortName}${second!==winner?` и ${second.shortName}`:''} перекрывают варианты; ${winner.shortName} отбирает мяч, и ${teamName} получает владение`;
   window.WLTimeline?.record(match,text,{eventKind:'interception',attackingSide:defend,actorId:winner.id,actorRole:winner.role,sourceId:owner.id,pressingRecovery:true,micro:false});
 }else{
   const text=`${Math.max(1,window.WLTeamBrain?.minute(match)||0)}' 🧱 ${winner.shortName} идёт в отбор, но ${owner.shortName} сохраняет мяч и ищет продолжение`;
   showBallComment(text);
 }
}
function updateBroadcast(match){
 if(!match)return;
 const byId=id=>document.getElementById(id), now=Date.now();
 const h=byId('visualHomeName'),a=byId('visualAwayName'),sh=byId('visualScoreH'),sa=byId('visualScoreA'),clock=byId('visualClock'),phase=byId('visualMatchPhase');
 if(h)h.textContent=match.home;if(a)a.textContent=match.away;if(sh)sh.textContent=match.scoreH||0;if(sa)sa.textContent=match.scoreA||0;
 let label='00:00',phaseText='Ожидание матча';
 if(match.status==='UPCOMING'){const sec=Math.max(0,Math.ceil((match.start-now)/1000));label=`-${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;phaseText='Предматчевый эфир';}
 else if(match.status==='LIVE'){const progress=clamp((now-match.start)/Math.max(1,match.end-match.start),0,1),minute=Math.min(90,Math.floor(progress*90)),seconds=Math.floor((progress*90-minute)*60);label=`${String(minute).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;phaseText=minute<45?'1 тайм':minute<90?'2 тайм':'Добавленное время';}
 else {label='90:00';phaseText='Матч завершён';}
 if(clock)clock.textContent=label;if(phase)phase.textContent=phaseText;
 const st=match.eventStats||{},ha=st.homeAttacks||0,aa=st.awayAttacks||0,total=Math.max(1,ha+aa),hp=Math.round(100*ha/total),ap=100-hp;
 const shotsH=st.homeShots||0,shotsA=st.awayShots||0,onH=Math.max(match.scoreH||0,shotsH-(st.awaySaves||0)),onA=Math.max(match.scoreA||0,shotsA-(st.homeSaves||0));
 const xgH=((match.scoreH||0)*.42+shotsH*.105+ha*.018).toFixed(2),xgA=((match.scoreA||0)*.42+shotsA*.105+aa*.018).toFixed(2);
 const put=(id,val)=>{const el=byId(id);if(el)el.textContent=val};put('visualPossession',`${hp}% : ${ap}%`);put('visualShots',`${shotsH} : ${shotsA}`);put('visualOnTarget',`${onH} : ${onA}`);put('visualXg',`${xgH} : ${xgA}`);
 const living=window.WLLivingMatch?.ensure(match),personality=String(living?.personality||'сбалансированный');
 const characterMap={динамичным:'⚡ Динамичный',тактическим:'🧠 Тактический',жёстким:'⚔️ Жёсткий',закрытым:'🛡️ Закрытый',нервным:'🔥 Нервный',сбалансированным:'⚖️ Сбалансированный'};
 put('visualMatchCharacter',characterMap[personality]||personality.charAt(0).toUpperCase()+personality.slice(1));
 const side=match.flow?.possession==='away'?'away':'home',danger=clamp(Number(match.flow?.danger)||0,0,100),phaseName=String(match.flow?.phase||'');
 const phaseBoost=phaseName==='shot'?18:phaseName==='final_third'?12:phaseName==='attack'?8:0;
 const pressureBoost=Math.round((state.tactical?.ballPressure||0)*22),threat=match.status==='LIVE'?clamp(Math.round(danger*.72+phaseBoost+pressureBoost),0,100):0;
 put('threatTeam',threat>8?`${side==='home'?match.home:match.away} развивает атаку`:'Ожидание опасной атаки');put('threatValue',`${threat}%`);
 const threatBar=byId('threatBar'),threatBox=byId('attackThreat');if(threatBar)threatBar.style.width=`${threat}%`;if(threatBox){threatBox.classList.toggle('hot',threat>=65);threatBox.classList.toggle('warm',threat>=35&&threat<65);}
}
function stabilizeTeamShape(side){
 const team=players(side).filter(p=>p.visible!==false&&p.role!=='GK');
 const ordered=team.slice().sort((a,b)=>(a.liveTy??a.ty)-(b.liveTy??b.ty));
 const minGap=.042;
 for(let i=1;i<ordered.length;i++){const prev=ordered[i-1],cur=ordered[i],py=prev.liveTy??prev.ty,cy=cur.liveTy??cur.ty;if(cy-py<minGap)cur.liveTy=clamp(py+minGap,.08,.92);}
 const bx=WLBall.state.x,by=WLBall.state.y,near=team.map(p=>({p,d:Math.hypot((p.liveTx??p.tx)-bx,(p.liveTy??p.ty)-by)})).sort((a,b)=>a.d-b.d);
 near.slice(4).forEach(({p,d})=>{if(d<.105){p.liveTx+=(p.baseX-p.liveTx)*.38;p.liveTy+=(p.baseY-p.liveTy)*.45;}});
}
function continuousTargets(now){if(state.fullTime.active){postMatchTargets(now);return;}const lane=state.lane||'center',poss=state.possession||'home';if(window.WLTacticalAI){const match=WLState.data.matches.find(m=>m.id===state.matchId);const brains=match&&window.WLTeamBrain?WLTeamBrain.update(match):match?.teamBrain;state.tactical=WLTacticalAI.update({home:state.home,away:state.away,possession:poss,ball:WLBall.state,logicalOwner:state.logicalOwner,momentum:state.momentum,phase:state.phase,teamBrain:brains});pressureRecoveryTick(now,match,state.tactical);for(const p of [...state.home,...state.away]){if(p.aiTarget){p.tx=p.aiTarget.x;p.ty=p.aiTarget.y;}}}else{const other=poss==='home'?'away':'home',idleAge=Math.max(0,(now-state.lastEventAt)/1000);if(idleAge>.9){formationShift(poss,true,lane,state.momentum[poss]);defensiveShape(other,lane);}}for(const p of [...state.home,...state.away]){const roleAmp=p.role==='GK'?.002:p.role==='DF'?.004:p.role==='MF'?.006:.008,breathe=Math.sin(now/1000*p.idleSpeed+p.phase)*roleAmp,sway=Math.cos(now/1150*p.idleSpeed+p.phase)*roleAmp*.65;p.liveTx=clamp(p.tx+breathe,.035,.965);p.liveTy=clamp(p.ty+sway,.07,.93);}stabilizeTeamShape('home');stabilizeTeamShape('away');}
function movePlayers(dt,now){continuousTargets(now);for(const p of [...state.home,...state.away]){const k=Math.min(1,dt*p.speed*(state.fullTime.active?2.8:5)),tx=Number.isFinite(p.liveTx)?p.liveTx:p.tx,ty=Number.isFinite(p.liveTy)?p.liveTy:p.ty;p.x+=(tx-p.x)*k;p.y+=(ty-p.y)*k;}resolvePlayerCollisions();}
function drawBall(w,h,ts){const b=WLBall.update(ts);for(let i=0;i<b.trail.length;i++){const p=b.trail[i],alpha=(i+1)/b.trail.length*.28;ctx.beginPath();ctx.fillStyle=`rgba(255,255,255,${alpha})`;ctx.arc(p.x*w,p.y*h,2.5,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.fillStyle='#fff';ctx.arc(b.x*w,b.y*h,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#111';ctx.lineWidth=1;ctx.stroke();}
function drawFullTimeOverlay(w,h){
 if(!state.fullTime.active)return;
 const age=(performance.now()-state.fullTime.startedAt)/1000;
 const alpha=clamp((age-1.1)/1.2,0,.82);
 if(alpha<=0)return;
 ctx.fillStyle=`rgba(0,0,0,${alpha*.62})`;ctx.fillRect(0,0,w,h);
 ctx.textAlign='center';ctx.fillStyle=`rgba(255,255,255,${alpha})`;ctx.font='800 22px sans-serif';ctx.fillText('МАТЧ ЗАВЕРШЁН',w/2,h/2-8);
 const stageText={slowdown:'Финальный свисток',reaction:state.fullTime.result==='draw'?'Команды завершают встречу вничью':'Игроки реагируют на результат',handshake:'Команды благодарят друг друга за матч',lineup:'Игроки выстраиваются перед уходом',home_exit:'Первая команда покидает поле',away_exit:'Вторая команда покидает поле',cleared:'Поле свободно — доступны итоги встречи'};ctx.font='12px sans-serif';ctx.fillStyle=`rgba(255,210,160,${alpha})`;ctx.fillText(stageText[state.fullTime.stage]||'Матч завершён',w/2,h/2+17);ctx.textAlign='left';
}
let rafId=0,lastFrameAt=performance.now(),consecutiveFrameErrors=0,recoveryCount=0;
function sanitizeVisualizerState(){
 const all=[...state.home,...state.away];
 for(const p of all){
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y)){p.x=p.baseX;p.y=p.baseY;}
  if(!Number.isFinite(p.tx)||!Number.isFinite(p.ty)){p.tx=p.baseX;p.ty=p.baseY;}
  if(!Number.isFinite(p.liveTx)||!Number.isFinite(p.liveTy)){p.liveTx=p.tx;p.liveTy=p.ty;}
  p.x=clamp(p.x,.025,.975);p.y=clamp(p.y,-.3,1.3);p.tx=clamp(p.tx,.035,.965);p.ty=clamp(p.ty,.07,.93);
 }
 if(!Number.isFinite(state.momentum.home))state.momentum.home=.5;
 state.momentum.home=clamp(state.momentum.home,.05,.95);state.momentum.away=1-state.momentum.home;
 if(!Number.isFinite(WLBall.state.x)||!Number.isFinite(WLBall.state.y)){WLBall.clear();WLBall.snap(.5,.5);state.logicalOwner=null;}
}
function recoverVisualizer(reason,error){
 recoveryCount++;consecutiveFrameErrors=0;state.last=performance.now();
 sanitizeVisualizerState();
 const currentMatch=WLState.data.matches.find(m=>m.id===state.matchId)||WLState.data.matches.find(m=>m.id===WLState.data.feedMatchId);
 if(currentMatch&&(!state.home.length||!state.away.length||state.matchId!==currentMatch.id))reset(currentMatch);
 console.warn(`[WLVisualizer] auto-recovery #${recoveryCount}: ${reason}`,error||'');
}
function drawFrame(now){
 const currentMatch=WLState.data.matches.find(m=>m.id===state.matchId);
 updateBroadcast(currentMatch);
 if(!ensureSize())return;
 let dt=(now-(state.last||now))/1000;
 if(!Number.isFinite(dt)||dt<0||dt>.35)dt=1/60;
 dt=Math.min(.05,dt);state.last=now;
 movePlayers(dt,now);sanitizeVisualizerState();
 const w=state.cssWidth,h=state.cssHeight;field(w,h);
 state.home.forEach(p=>drawMarker(p,'#ff5a36',w,h));state.away.forEach(p=>drawMarker(p,'#2f7cff',w,h));
 drawBall(w,h,now);drawSmartLabels([...state.home,...state.away],w,h,now,dt);drawFullTimeOverlay(w,h);
}
function loop(now){
 lastFrameAt=performance.now();
 try{drawFrame(now);consecutiveFrameErrors=0;}
 catch(error){
  consecutiveFrameErrors++;console.error('[WLVisualizer] frame error',error);
  if(consecutiveFrameErrors>=2)recoverVisualizer('ошибка кадра',error);
 }finally{rafId=requestAnimationFrame(loop);}
}
function ensureLoopAlive(){
 const age=performance.now()-lastFrameAt;
 if(document.visibilityState==='visible'&&age>1800){
  if(rafId)cancelAnimationFrame(rafId);recoverVisualizer('watchdog: цикл отрисовки не отвечал');rafId=requestAnimationFrame(loop);
 }
}
window.addEventListener('resize',resize);
window.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){state.last=performance.now();ensureLoopAlive();}});
window.addEventListener('error',event=>{if(String(event?.filename||'').includes('visualizer.js'))recoverVisualizer('глобальная ошибка визуализатора',event.error);});
if('ResizeObserver'in window)new ResizeObserver(()=>{try{resize();}catch(error){recoverVisualizer('ошибка ResizeObserver',error);}}).observe(canvas);
resize();rafId=requestAnimationFrame(loop);setInterval(ensureLoopAlive,1000);
WLTimeline.on('match-event',({match,event})=>{if(match.id===state.matchId){try{applyEvent(match,event);}catch(error){recoverVisualizer('ошибка обработки события матча',error);}}});
window.WLVisualizer={select,reset,render(){try{resize();select(WLState.data.feedMatchId);ensureLoopAlive();}catch(error){recoverVisualizer('ошибка внешнего render()',error);}},applyEvent,recover:()=>recoverVisualizer('ручное восстановление')};
})();

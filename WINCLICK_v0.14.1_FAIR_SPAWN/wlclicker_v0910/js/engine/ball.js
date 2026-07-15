(()=>{'use strict';
const now=()=>performance.now(),lerp=(a,b,t)=>a+(b-a)*t,ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const state={x:.5,y:.5,status:'free',owner:null,action:null,queue:[],trail:[],lockedUntil:0,lastTransition:'initial',transitionId:0,history:[]};
function pointOf(target){if(!target)return{x:state.x,y:state.y};if(typeof target==='function')return pointOf(target());return{x:Number(target.x)||0,y:Number(target.y)||0};}
function remember(from,to,reason,id){state.history.unshift({at:Date.now(),id,from:from||'free',to:to||'free',reason});state.history=state.history.slice(0,20);console.debug(`[BALL#${id}] ${from||'free'} -> ${to||'free'} via ${reason}`);}
function invalidate(){state.transitionId++;state.action=null;state.queue.length=0;state.lockedUntil=0;return state.transitionId;}
function begin(action){const id=++state.transitionId,start=pointOf(action.from||state.owner||state);state.owner=null;state.status=action.kind||'moving';state.action={...action,id,start,startedAt:now()};state.lockedUntil=state.action.startedAt+(action.duration||700);state.lastTransition=action.reason||action.kind||'move';}
function pump(){if(!state.action&&state.queue.length)begin(state.queue.shift());}
function enqueue(action){state.queue.push(action);pump();}
function attach(player,reason='control',{snap=true}={}){const old=state.owner?.id||null;state.owner=player||null;state.status=player?'carried':'free';state.lastTransition=reason;if(player&&snap){state.x=player.x;state.y=player.y;}remember(old,player?.id||null,reason,state.transitionId);}
function carry(player,reason='control'){invalidate();attach(player,reason);}
function transition(from,to,{duration=700,kind='passing',reason='pass',onDone=null,keepTrail=true}={}){const fromRef=from||state.owner||{x:state.x,y:state.y};enqueue({from:fromRef,to,duration,kind,reason,onDone,keepTrail,fromId:from?.id||state.owner?.id||null,toId:to?.id||null});}
function pass(from,to,duration=700,onDone){transition(from,to,{duration,kind:'passing',reason:'pass',onDone});}
function intercept(from,to,duration=620,onDone){transition(from,to,{duration,kind:'intercepted',reason:'interception',onDone});}
function shot(from,to,duration=850,onDone){transition(from,to,{duration,kind:'shot',reason:'shot',onDone});}
function rebound(from,to,duration=480,onDone){transition(from,to,{duration,kind:'loose',reason:'rebound',onDone});}
function clear(){invalidate();state.owner=null;state.status='free';state.trail.length=0;}
function snap(x=.5,y=.5){clear();state.x=x;state.y=y;}
function isBusy(){return !!state.action||state.queue.length>0||now()<state.lockedUntil;}
function distanceTo(target){const q=pointOf(target);return Math.hypot(q.x-state.x,q.y-state.y);}
function update(ts=now()){
 if(state.owner&&!state.action){state.x=state.owner.x;state.y=state.owner.y;}
 const a=state.action;if(a){const target=pointOf(a.to),duration=Math.max(1,a.duration||700),t=Math.min(1,(ts-a.startedAt)/duration),k=ease(t);state.x=lerp(a.start.x,target.x,k);state.y=lerp(a.start.y,target.y,k);if(a.keepTrail!==false){state.trail.push({x:state.x,y:state.y,at:ts});state.trail=state.trail.filter(p=>ts-p.at<190).slice(-8);}if(t>=1){const id=a.id,old=a.fromId||null,next=a.toId||null,done=a.onDone;state.action=null;state.lockedUntil=0;state.x=target.x;state.y=target.y;remember(old,next,a.reason||a.kind,id);if(id===state.transitionId&&done)done(id);pump();}}
 else state.trail=state.trail.filter(p=>ts-p.at<150);return state;
}
window.WLBall={state,attach,carry,pass,intercept,shot,rebound,transition,enqueue,update,isBusy,clear,snap,distanceTo,invalidate};
})();

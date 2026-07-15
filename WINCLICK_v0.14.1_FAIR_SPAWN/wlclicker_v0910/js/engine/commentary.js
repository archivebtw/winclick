(()=>{'use strict';
const name=(team,role,index=1)=>window.WLTeamDB?.slot(team,role,index)?.shortName||`${role}(${index})`;
function recovery({minute,defendingTeam,attackingTeam,presserRole='MF',presserIndex=1,coverIndex=1,method='press',success=false}){
 const p=name(defendingTeam,presserRole,presserIndex),c=name(defendingTeam,'DF',coverIndex);
 if(method==='intercept'&&success)return `${minute}' 🛡️ ${p} читает передачу ${attackingTeam}, выходит в линию мяча и возвращает владение ${defendingTeam}`;
 if(method==='tackle'&&success)return `${minute}' ⚔️ ${p} выбирает момент для отбора, а ${c} страхует эпизод — мяч переходит к ${defendingTeam}`;
 if(method==='tackle')return `${minute}' ⚔️ ${p} вступает в отбор, но игрок ${attackingTeam} укрывает мяч; ${c} сохраняет страховку`;
 return `${minute}' 🧱 ${p} оказывает давление на владельца мяча ${attackingTeam}, а ${c} закрывает пространство за его спиной`;
}
function support({minute,team,ownerRole='MF',runnerRole='FW',runnerIndex=1,lane='center'}){const r=name(team,runnerRole,runnerIndex),o=name(team,ownerRole,1),where=lane==='left'?'слева':lane==='right'?'справа':'между линиями';return `${minute}' 🧠 ${r} замечает свободную зону ${where} и предлагает вариант для ${o}; ${team} сохраняет несколько направлений продолжения атаки`;}
function teamState({minute,team,label,reason}){return `${minute}' 🎛️ ${team}: ${label.toLowerCase()}. ${reason}.`;}
window.WLCommentary2={recovery,support,teamState,name};
})();
(()=>{'use strict';
const data={
  'Real Madrid':{profile:'balanced',style:'быстро переводит мяч вперёд',attackSide:'через центр'},
  'Liverpool':{profile:'pressing',style:'включает высокий прессинг',attackSide:'через правый фланг'},
  'Barcelona':{profile:'possession',style:'долго контролирует мяч',attackSide:'через короткий пас'},
  'Inter':{profile:'defensive',style:'плотно обороняется и ищет контратаку',attackSide:'через левый фланг'},
  'Bayern':{profile:'pressing',style:'наращивает темп атаки',attackSide:'через центр'},
  'Arsenal':{profile:'balanced',style:'разыгрывает позиционную атаку',attackSide:'через полуфланг'},
  'PSG':{profile:'counter',style:'ускоряет атаку индивидуальными действиями',attackSide:'через левый фланг'},
  'Milan':{profile:'balanced',style:'спокойно продвигает мяч',attackSide:'через центр'},
  'Juventus':{profile:'defensive',style:'бережно строит атаку',attackSide:'через правый фланг'},
  'Dortmund':{profile:'counter',style:'резко убегает в переходную фазу',attackSide:'через центр'},
  'Chelsea':{profile:'balanced',style:'пытается вскрыть оборону передачами',attackSide:'через левый фланг'},
  'Napoli':{profile:'balanced',style:'активно комбинирует у штрафной',attackSide:'через короткий пас'}
};
function get(name){return data[name]||{profile:'balanced',style:'развивает атаку',attackSide:'через центр'};}
window.WLTeamData={data,get};
})();

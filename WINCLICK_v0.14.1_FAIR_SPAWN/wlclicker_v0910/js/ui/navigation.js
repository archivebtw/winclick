(()=>{'use strict';
function go(screen){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));document.getElementById(`screen-${screen}`)?.classList.add('active');document.querySelector(`.nav[data-screen="${screen}"]`)?.classList.add('active');}
window.WLNavigation={go};
})();

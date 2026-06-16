/* game-sounds.js — sons e haptics para todos os jogos
   Inclua ANTES do fechamento </body> em cada jogo */
(function(){
"use strict";
let _ac=null;
function ac(){if(!_ac)_ac=new(window.AudioContext||window.webkitAudioContext)();return _ac;}

function tone(freq,dur,vol,type,delay){
  try{
    const c=ac(),t0=c.currentTime+(delay||0);
    const o=c.createOscillator(),g=c.createGain();
    o.type=type||'sine';o.frequency.setValueAtTime(freq,t0);
    g.gain.setValueAtTime(vol||.08,t0);
    g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    o.connect(g);g.connect(c.destination);
    o.start(t0);o.stop(t0+dur);
  }catch(e){}
}

function vib(pat){try{navigator.vibrate&&navigator.vibrate(pat);}catch(e){}}

// Public API
window.GS={
  pop:  ()=>{tone(660,.07,.09);},
  good: ()=>{tone(880,.06,.1);setTimeout(()=>tone(1100,.1,.09),55);},
  bad:  ()=>{tone(220,.18,.09,'sawtooth');},
  win:  ()=>{[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.15,.1),i*80));},
  lose: ()=>{[392,330,262,196].forEach((f,i)=>setTimeout(()=>tone(f,.3,.08),i*120));},
  move: ()=>{tone(440,.05,.06);},
  tick: ()=>{tone(880,.04,.05);},
  eat:  ()=>{tone(700,.08,.1);setTimeout(()=>tone(900,.06,.08),60);},
  combo:(n)=>{for(let i=0;i<Math.min(n,5);i++)setTimeout(()=>tone(500+i*90,.09,.09,'triangle'),i*45);},
  hint: ()=>{tone(660,.1,.07);},
  seat: ()=>{tone(660,.07,.09);},
  place:()=>{tone(520,.09,.08);},
  flip: ()=>{tone(550,.06,.07);},
  // Haptics
  hTap:  ()=>vib(12),
  hGood: ()=>vib(20),
  hBad:  ()=>vib([15,40,15]),
  hWin:  ()=>vib(50),
  hLose: ()=>vib([30,50,30]),
  hMove: ()=>vib(8),
};
})();

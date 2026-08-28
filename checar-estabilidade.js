/* Cada fase é montada e deixada QUIETA por 4 segundos de física, sem tiro
   nenhum. No fim, mede o que se mexeu sozinho:
     · blocos que tombaram (mudança de ângulo além do limite do jogo);
     · maior deslocamento de um corpo;
     · presentes que se destruíram sozinhos.
   Estrutura bonita que desaba antes do jogador encostar na tela é um bug,
   não um detalhe de física. */
const fs=require("fs"), Matter=require("matter-js");
const src=fs.readFileSync(process.argv[2],"utf8");
let seed=7; Math.random=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
const noop=()=>{};
function el(){const h={};return{hidden:false,textContent:"",innerHTML:"",style:{cssText:"",setProperty:noop},
  classList:{add:noop,remove:noop,toggle:noop},addEventListener:(t,f)=>{(h[t]=h[t]||[]).push(f)},
  appendChild:noop,getBoundingClientRect:()=>({left:0,top:0,width:1600,height:900}),
  getContext:()=>new Proxy({},{get:()=>()=>({addColorStop:noop})}),_h:h};}
const els={};
global.document={readyState:"complete",getElementById:id=>els[id]=els[id]||el(),querySelectorAll:()=>[],
  createElement:el,addEventListener:noop,body:el()};
global.window={addEventListener:noop,devicePixelRatio:1,visualViewport:null};
global.navigator={vibrate:noop}; global.localStorage={getItem:()=>null,setItem:noop};
global.Image=function(){}; global.performance={now:()=>0}; global.requestAnimationFrame=()=>1;
let ENGINE=null; const rc=Matter.Engine.create;
Matter.Engine.create=function(o){const e=rc.call(Matter.Engine,o);ENGINE=e;return e;};
global.Matter=Matter;

const patched=src.replace('if (document.readyState === "loading") {',
 'window.__probe={levels:LEVELS,load:loadLevelIntoWorld,gen:generateLevel,blocks:()=>activeBlocks,gifts:()=>activeGifts,cfg:CFG};\nif (document.readyState === "loading") {');
new Function("window","document","navigator","localStorage","Matter","performance","requestAnimationFrame","Image","console",patched)
 (global.window,global.document,global.navigator,global.localStorage,Matter,global.performance,global.requestAnimationFrame,global.Image,console);

const P=global.window.__probe, STEP=1000/60;
let ruins=0;
function test(L,label){
  P.load(L);
  const blocks=P.blocks(), gifts=P.gifts();
  const antes=blocks.map(b=>({b,x:b.position.x,y:b.position.y,a:b.angle}));
  const nGifts=gifts.length;
  for(let i=0;i<240;i++) Matter.Engine.update(ENGINE,STEP);
  let tombados=0,maxD=0;
  antes.forEach(o=>{
    if(Math.abs(o.b.angle-o.a)>P.cfg.BLOCK_FALL_ANGLE) tombados++;
    const d=Math.hypot(o.b.position.x-o.x,o.b.position.y-o.y);
    if(d>maxD) maxD=d;
  });
  const perdidos=nGifts-P.gifts().filter(g=>!g.wglGift.destroyed).length;
  if(process.env.WGL_QUEM){
    const mov=antes.map(o=>({k:o.b.wglBlock.kind,d:Math.hypot(o.b.position.x-o.x,o.b.position.y-o.y),
      da:Math.abs(o.b.angle-o.a),x:Math.round(o.x),y:Math.round(o.y)}))
      .filter(m=>m.d>10).sort((a,b)=>b.d-a.d).slice(0,10);
    mov.forEach(m=>console.log("    "+m.k+" ("+m.x+","+m.y+") andou "+Math.round(m.d)+"px, girou "+m.da.toFixed(2)));
  }
  if(tombados>0||maxD>26||perdidos>0){
    ruins++;
    console.log(label+": "+tombados+" blocos tombaram, maior deslocamento "+Math.round(maxD)+"px"+
      (perdidos?", "+perdidos+" presentes se destruíram sozinhos":""));
  }
  return {tombados,maxD,perdidos};
}
P.levels.forEach(L=>test(L,"fase "+String(L.id).padStart(2)));
console.log("-- fases geradas --");
[51,55,60,70,90,120,200,500].forEach(n=>test(P.gen(n),"gerada "+n));
console.log(ruins?("\n"+ruins+" fases desabam sozinhas"):"\nNenhuma fase se mexe sozinha");

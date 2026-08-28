/* Confere, fase a fase:
   1. tudo está dentro do alcance real do estilingue (2201px no chão, topo y=-397);
   2. nenhum corpo nasce sobreposto a outro (no Matter, dois corpos criados um
      dentro do outro se repelem violentamente e a fase "explode sozinha").
   Roda o próprio construtor de fases do jogo, num DOM falso. */
const fs=require("fs"), Matter=require("matter-js");
const src=fs.readFileSync(process.argv[2],"utf8");

let seed=99; Math.random=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
const noop=()=>{};
function el(){const h={};return{hidden:false,textContent:"",innerHTML:"",style:{cssText:"",setProperty:noop},
  classList:{add:noop,remove:noop,toggle:noop},addEventListener:(t,f)=>{(h[t]=h[t]||[]).push(f)},
  appendChild:noop,getBoundingClientRect:()=>({left:0,top:0,width:1600,height:900}),
  getContext:()=>new Proxy({},{get:()=>()=>({addColorStop:noop})}),_h:h};}
const els={};
global.document={readyState:"complete",getElementById:id=>els[id]=els[id]||el(),
  querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()};
global.window={addEventListener:noop,devicePixelRatio:1,visualViewport:null};
global.navigator={vibrate:noop};
global.localStorage={getItem:()=>null,setItem:noop};
global.Image=function(){};
global.performance={now:()=>0};
global.requestAnimationFrame=()=>1;

let ENGINE=null; const rc=Matter.Engine.create;
Matter.Engine.create=function(o){const e=rc.call(Matter.Engine,o);ENGINE=e;return e;};
global.Matter=Matter;

/* Expõe o construtor interno só pra este teste, sem tocar no jogo. */
const patched = src.replace("if (document.readyState === \"loading\") {",
  "window.__probe = { levels: LEVELS, load: loadLevelIntoWorld, gen: (typeof generateLevel==='function'?generateLevel:null), all: allDynamicBodies, stars: function(){return activeStars;} };\nif (document.readyState === \"loading\") {");
new Function("window","document","navigator","localStorage","Matter","performance","requestAnimationFrame","Image","console",patched)
  (global.window,global.document,global.navigator,global.localStorage,Matter,global.performance,global.requestAnimationFrame,global.Image,console);

const P=global.window.__probe;
const REACH=2201;
/* Envelope de alcance medido simulando a física de verdade (ver envelope.js):
   quanto mais longe, mais baixo é o ponto mais alto que o arremesso toca. */
const REACH_TOP=[-396,-396,-391,-381,-366,-345,-321,-292,-257,-217,-172,
                 -123,-67,-10,55,125,199,279,363,452,547,647,756,862];
function topAt(dist){
  const d=dist/100; if(d<=0) return REACH_TOP[0];
  const i=Math.floor(d); if(i>=REACH_TOP.length-1) return 900;
  return REACH_TOP[i]+(REACH_TOP[i+1]-REACH_TOP[i])*(d-i);
}
let bad=0;

/* Sobreposição REAL (SAT), não caixa envolvente: estacas inclinadas do
   "castelo de cartas" têm caixas que se cruzam sem os corpos se tocarem. */
function overlap(a,b){
  const c = Matter.Collision.collides(a,b,null);
  return (c && c.collided) ? c.depth : 0;
}

function check(L, label){
  P.load(L);
  const bodies = P.all().filter(b=>!b.isStatic);
  let maxX=0,minY=810;
  bodies.concat(P.stars()).forEach(b=>{
    if(b.bounds.max.x>maxX) maxX=b.bounds.max.x;
    if(b.bounds.min.y<minY) minY=b.bounds.min.y;
  });
  const limX=L.slingX+REACH-60;
  const msgs=[];
  if(maxX>limX) msgs.push("longe demais: X="+Math.round(maxX)+" > "+Math.round(limX));
  /* Cada alvo precisa caber no envelope: não basta estar perto OU baixo,
     precisa das duas coisas ao mesmo tempo. */
  let worstAlvo=null;
  bodies.concat(P.stars()).forEach(b=>{
    if(!(b.wglGift||b.wglStar||b.wglBalloon)) return;
    const lim=topAt(b.bounds.max.x-L.slingX)+40;
    if(b.bounds.max.y<lim){
      const folga=lim-b.bounds.max.y;
      if(!worstAlvo||folga>worstAlvo.folga)
        worstAlvo={folga,x:Math.round(b.position.x),y:Math.round(b.position.y),lim:Math.round(lim)};
    }
  });
  if(worstAlvo) msgs.push("alvo fora do envelope: ("+worstAlvo.x+","+worstAlvo.y+") precisa de y>="+worstAlvo.lim);
  const kindOf=b=>b.wglBlock?b.wglBlock.kind:(b.wglBalloon?"balao":b.label.replace("wgl-",""));
  const hits=[];
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    const ka=kindOf(bodies[i]), kb=kindOf(bodies[j]);
    // as duas pernas do "castelo de cartas" se cruzam no ápice de propósito
    if(ka==="stake"&&kb==="stake") continue;
    const o=overlap(bodies[i],bodies[j]);
    if(o>6) hits.push(ka+"("+Math.round(bodies[i].position.x)+","+Math.round(bodies[i].position.y)+")/"+kb+"("+Math.round(bodies[j].position.x)+","+Math.round(bodies[j].position.y)+") "+Math.round(o)+"px");
  }
  if(hits.length) msgs.push("sobrepostos: "+hits.slice(0,6).join(", "));
  if(msgs.length){bad++;console.log(label+": "+msgs.join(" | "));
    if(process.env.WGL_VERBOSE){
      console.log("   balões: "+P.all().filter(b=>b.wglBalloon).map(b=>Math.round(b.position.x)).join(", "));
      console.log("   avulsos: "+P.all().filter(b=>b.wglBlock&&["tnt","cake","glass","champagne","rocket"].includes(b.wglBlock.kind))
        .map(b=>b.wglBlock.kind+"@"+Math.round(b.position.x)).join(", "));
    }
  }
}

if(process.env.WGL_DUMP){
  const L=P.gen(Number(process.env.WGL_DUMP));
  console.log("torres:", L.frameTowers.map(f=>f.x+"("+f.levels.length+"a)").join(" "));
  console.log("muros:", L.walls.map(w=>w.x).join(" "));
  console.log("balões:", L.balloons.map(b=>b.x+"@"+b.y).join(" "));
  console.log("estrelas:", L.stars.map(s=>s.x+"@"+s.y).join(" "));
  process.exit(0);
}
P.levels.forEach(L=>check(L,"fase "+String(L.id).padStart(2)));
if(P.gen){
  console.log("\n-- fases geradas --");
  [51,52,53,55,58,60,65,70,80,85,90,100,120,150,200,250,400,999].forEach(n=>check(P.gen(n),"gerada "+n));
}
console.log(bad?("\n"+bad+" fases com problema"):"\nTodas as fases OK: dentro do alcance e sem corpos sobrepostos");

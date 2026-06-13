/* ═══════════════════════════════════════════════════════════
   GIAN & TIAGO — jogos.js v3
   Snake • Empilha o Bolo • Pega os Docinhos • Monte o Look
═══════════════════════════════════════════════════════════ */
"use strict";

const JOGOS_API = typeof API_URL !== "undefined"
  ? API_URL
  : "https://script.google.com/macros/s/AKfycbyYyCrT2oNLYDLcXDWq8X2b9Y0u0EbmQ7pUnpdRA3g0wZNUDtX0VTNrHq26wIngBwHn/exec";

/* ══════════════════════════════════════════════════════════
   NAVEGAÇÃO
══════════════════════════════════════════════════════════ */
function entrarJogo(jogo) {
  ["menu","snake","flappy","bolo","docinhos","look"].forEach(id => {
    const el = document.getElementById("arena-" + id);
    if (el) el.style.display = "none";
  });
  const target = document.getElementById("arena-" + jogo);
  if (target) target.style.display = "block";
  window.scrollTo({ top: 0, behavior: "instant" });

  if (jogo === "snake")    { resetSnake(); }
  if (jogo === "flappy")   { resetFlappy(); }
  if (jogo === "bolo")     { resetBolo(); }
  if (jogo === "docinhos") { resetDocinhos(); }
  if (jogo === "look")     { initLook(); }
}

function voltarMenu(jogo) {
  pararSnake(); pararFlappy(); pararBolo(); pararDocinhos();
  ["snake","flappy","bolo","docinhos","look"].forEach(id => {
    const el = document.getElementById("arena-" + id);
    if (el) el.style.display = "none";
    const pg = document.getElementById(id + "-postgame");
    if (pg) pg.style.display = "none";
  });
  const menu = document.getElementById("arena-menu");
  if (menu) menu.style.display = "block";
  window.scrollTo({ top: 0, behavior: "instant" });
}

/* ══════════════════════════════════════════════════════════
   IMAGENS DAS CARAS (Snake)
══════════════════════════════════════════════════════════ */
let imgTiagoOk = false, imgGianOk = false;
const IMG_TIAGO = new Image();
IMG_TIAGO.onload = () => { imgTiagoOk = true; };
IMG_TIAGO.src = "assets/img/tiago-face.png";
const IMG_GIAN = new Image();
IMG_GIAN.onload = () => { imgGianOk = true; };
IMG_GIAN.src = "assets/img/gian-face.png";

/* ══════════════════════════════════════════════════════════
   SNAKE DO TIAGO — Visual renovado
══════════════════════════════════════════════════════════ */
const SNAKE_COLS = 20, SNAKE_ROWS = 20, SNAKE_CELL = 26;
const PAL_SNAKE = {
  bg:"#F0F5E8", grid:"rgba(160,185,140,.18)",
  headFill:"#506B45", headStroke:"#2A3E22",
  body1:"#7A9B6E", body2:"#A8C49A",
  overlayBg:"rgba(240,245,232,.94)", overlayText:"#2A3E22",
  btnBg:"#506B45", accent:"#B87B3E"
};

let snakeRafId=null, snakeScore=0, snakeDir={x:1,y:0}, snakeNext={x:1,y:0};
let snakeBody=[], snakeFood={x:10,y:10}, snakeAlive=false, snakeSpeed=160, snakeLast=0;

function resetSnake() {
  snakeAlive = false;
  if (snakeRafId) { cancelAnimationFrame(snakeRafId); snakeRafId = null; }
  snakeScore=0; snakeSpeed=160; snakeLast=0;
  snakeDir={x:1,y:0}; snakeNext={x:1,y:0};
  snakeBody=[{x:5,y:10},{x:4,y:10},{x:3,y:10}];
  const sc = document.getElementById("snake-score");
  if (sc) sc.textContent = "0";
  const pg = document.getElementById("snake-postgame");
  if (pg) pg.style.display = "none";
  snakeNovaComida(); desenharSnake();
  mostrarOverlay("snake","Snake do Tiago 🐍","Guie o Tiago pelos hambúrgueres!",[
    {label:"Começar",fn:"iniciarSnake()"}
  ]);
}

function iniciarSnake() {
  snakeAlive=false;
  if (snakeRafId) { cancelAnimationFrame(snakeRafId); snakeRafId=null; }
  snakeScore=0; snakeSpeed=160; snakeLast=0;
  snakeDir={x:1,y:0}; snakeNext={x:1,y:0};
  snakeBody=[{x:5,y:10},{x:4,y:10},{x:3,y:10}];
  snakeNovaComida();
  const sc = document.getElementById("snake-score");
  if (sc) sc.textContent = "0";
  const pg = document.getElementById("snake-postgame");
  if (pg) pg.style.display = "none";
  ocultarOverlay("snake");
  snakeAlive=true;
  document.getElementById("snake-canvas")?.focus();
  snakeRafId = requestAnimationFrame(snakeFrame);
}

function pararSnake() { snakeAlive=false; if (snakeRafId){cancelAnimationFrame(snakeRafId);snakeRafId=null;} }

function snakeFrame(ts) {
  if (!snakeAlive) return;
  snakeRafId = requestAnimationFrame(snakeFrame);
  if (!snakeLast) snakeLast=ts;
  if (ts-snakeLast < snakeSpeed) return;
  snakeLast=ts;
  snakeDir={...snakeNext};
  const head={x:snakeBody[0].x+snakeDir.x, y:snakeBody[0].y+snakeDir.y};
  if (head.x<0||head.x>=SNAKE_COLS||head.y<0||head.y>=SNAKE_ROWS||snakeBody.some(s=>s.x===head.x&&s.y===head.y))
    return snakeGameOver();
  snakeBody.unshift(head);
  if (head.x===snakeFood.x&&head.y===snakeFood.y) {
    snakeScore++;
    const sc=document.getElementById("snake-score"); if(sc) sc.textContent=snakeScore;
    snakeNovaComida();
    if (snakeScore%4===0) snakeSpeed=Math.max(65,snakeSpeed-10);
  } else snakeBody.pop();
  desenharSnake();
}

function snakeNovaComida() {
  let p;
  do { p={x:Math.floor(Math.random()*SNAKE_COLS),y:Math.floor(Math.random()*SNAKE_ROWS)}; }
  while(snakeBody.some(s=>s.x===p.x&&s.y===p.y));
  snakeFood=p;
}

function desenharSnake() {
  const canvas=document.getElementById("snake-canvas"); if(!canvas)return;
  const ctx=canvas.getContext("2d");
  const C=SNAKE_CELL, W=canvas.width, H=canvas.height;
  ctx.fillStyle=PAL_SNAKE.bg; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle=PAL_SNAKE.grid; ctx.lineWidth=0.5;
  for(let c=0;c<=SNAKE_COLS;c++){ctx.beginPath();ctx.moveTo(c*C,0);ctx.lineTo(c*C,H);ctx.stroke();}
  for(let r=0;r<=SNAKE_ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*C);ctx.lineTo(W,r*C);ctx.stroke();}
  // Food
  ctx.save(); ctx.translate(snakeFood.x*C+C/2, snakeFood.y*C+C/2);
  ctx.fillStyle="#D4935A"; ctx.beginPath(); ctx.ellipse(0,-3,C*.36,C*.2,0,Math.PI,0); ctx.fill();
  ctx.fillStyle="#F5E6C8"; ctx.beginPath(); ctx.ellipse(-3,-5,2,1,0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3,-5,2,1,-0.3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#7A4A2A"; ctx.fillRect(-C*.32,-1,C*.64,C*.14);
  ctx.fillStyle="#6A9B50"; ctx.fillRect(-C*.34,C*.1,C*.68,C*.1);
  ctx.fillStyle="#E0A870"; ctx.beginPath(); ctx.ellipse(0,C*.22,C*.36,C*.14,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
  // Body
  snakeBody.forEach((seg,i)=>{
    const x=seg.x*C+2, y=seg.y*C+2, w=C-4;
    if(i===0){
      ctx.fillStyle=PAL_SNAKE.headFill; ctx.beginPath(); ctx.roundRect(x,y,w,w,6); ctx.fill();
      ctx.strokeStyle=PAL_SNAKE.headStroke; ctx.lineWidth=1.5; ctx.stroke();
      if(imgTiagoOk){
        ctx.save(); ctx.beginPath(); ctx.roundRect(x,y,w,w,6); ctx.clip();
        ctx.drawImage(IMG_TIAGO,x,y,w,w); ctx.restore();
      } else {
        // Eyes
        const ex=seg.x*C+C/2, ey=seg.y*C+C/2;
        const eyo=snakeDir.x===1?[[4,-4],[4,4]]:snakeDir.x===-1?[[-4,-4],[-4,4]]:snakeDir.y===-1?[[-4,-4],[4,-4]]:[[-4,4],[4,4]];
        ctx.fillStyle="#fff";
        eyo.forEach(([ox,oy])=>{
          ctx.beginPath();ctx.arc(ex+ox,ey+oy,3.5,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#1A2C15";ctx.beginPath();ctx.arc(ex+ox+snakeDir.x,ey+oy+snakeDir.y,1.8,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#fff";
        });
        ctx.strokeStyle="#fff";ctx.lineWidth=1.5;ctx.beginPath();
        ctx.arc(seg.x*C+C/2+snakeDir.x*2,seg.y*C+C/2+snakeDir.y*2,4,0.2,Math.PI-0.2);ctx.stroke();
      }
    } else {
      const t=i/snakeBody.length;
      ctx.fillStyle=i%2===0?PAL_SNAKE.body1:PAL_SNAKE.body2;
      ctx.globalAlpha=Math.max(0.35,1-t*.5);
      ctx.beginPath();ctx.roundRect(x,y,w,w,5);ctx.fill();
      ctx.globalAlpha=1;
    }
  });
}

function snakeGameOver() {
  snakeAlive=false; if(snakeRafId){cancelAnimationFrame(snakeRafId);snakeRafId=null;}
  const msgs = snakeScore>=20?["Tiago está satisfeito. 🏆","O Gian que veja esse recorde."]:
               snakeScore>=10?["Bom apetite!",snakeScore+" hambúrgueres. Impressionante."]:
               snakeScore>=5 ?["Quase cheio...",snakeScore+" hambúrgueres desta vez."]:
                              ["O Tiago ficou com fome.","Tenta de novo!"];
  mostrarOverlay("snake","Game Over! 🐍",`${snakeScore} hambúrguer${snakeScore!==1?"es":""} · ${msgs[0]}`,[
    {label:"Jogar de novo",fn:"iniciarSnake()"},{label:"Voltar",fn:"voltarMenu('snake')"}
  ]);
  setTimeout(()=>{
    const pg=document.getElementById("snake-postgame"); if(pg)pg.style.display="block";
    carregarTop10("snake");
  },300);
}

document.addEventListener("keydown",(e)=>{
  if(document.getElementById("arena-snake")?.style.display==="none") return;
  const dirs={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},
    w:{x:0,y:-1},s:{x:0,y:1},a:{x:-1,y:0},d:{x:1,y:0},
    W:{x:0,y:-1},S:{x:0,y:1},A:{x:-1,y:0},D:{x:1,y:0}};
  if(dirs[e.key]){const d=dirs[e.key];if(d.x!==-snakeDir.x||d.y!==-snakeDir.y)snakeNext=d;e.preventDefault();}
});
function snakeDirInput(dir){
  const dirs={UP:{x:0,y:-1},DOWN:{x:0,y:1},LEFT:{x:-1,y:0},RIGHT:{x:1,y:0}};
  const d=dirs[dir]; if(d&&(d.x!==-snakeDir.x||d.y!==-snakeDir.y))snakeNext=d;
}

/* ══════════════════════════════════════════════════════════
   FLAPPY GIAN
══════════════════════════════════════════════════════════ */
const FW=480,FH=600,GRAVITY=0.45,FLAP_FORCE=-9,PIPE_W=70,PIPE_GAP=160,PIPE_SPD=3,PIPE_INTV=90;
let flappyRafId=null,flappyAlive=false,flappyStarted=false,flappyScore=0;
let birdY=FH/2,birdVY=0,flappyPipes=[],flappyTick=0;

function resetFlappy(){
  flappyAlive=false;flappyStarted=false;
  if(flappyRafId){cancelAnimationFrame(flappyRafId);flappyRafId=null;}
  flappyScore=0;birdY=FH/2;birdVY=0;flappyPipes=[];flappyTick=0;
  const sc=document.getElementById("flappy-score");if(sc)sc.textContent="0";
  const pg=document.getElementById("flappy-postgame");if(pg)pg.style.display="none";
  mostrarOverlay("flappy","Flappy Gian 🐦","Toque / espaço para voar!",[{label:"Começar",fn:"iniciarFlappy()"}]);
  desenharFlappy();
}

function iniciarFlappy(){
  flappyAlive=false;if(flappyRafId){cancelAnimationFrame(flappyRafId);flappyRafId=null;}
  flappyScore=0;birdY=FH/2;birdVY=0;flappyPipes=[];flappyTick=0;
  const sc=document.getElementById("flappy-score");if(sc)sc.textContent="0";
  const pg=document.getElementById("flappy-postgame");if(pg)pg.style.display="none";
  ocultarOverlay("flappy");
  flappyAlive=true;flappyStarted=true;
  document.getElementById("flappy-canvas")?.focus();
  flappyRafId=requestAnimationFrame(flappyLoopFn);
}

function pararFlappy(){flappyAlive=false;flappyStarted=false;if(flappyRafId){cancelAnimationFrame(flappyRafId);flappyRafId=null;}}

function flappyTap(){if(!flappyStarted){iniciarFlappy();return;}if(flappyAlive)birdVY=FLAP_FORCE;}

function flappyLoopFn(){
  if(!flappyAlive)return;
  flappyRafId=requestAnimationFrame(flappyLoopFn);
  birdVY+=GRAVITY;birdY+=birdVY;flappyTick++;
  if(flappyTick%PIPE_INTV===0){
    const topH=60+Math.random()*(FH-PIPE_GAP-120);
    flappyPipes.push({x:FW+PIPE_W,topH,scored:false});
  }
  flappyPipes.forEach(p=>{p.x-=PIPE_SPD;});
  flappyPipes=flappyPipes.filter(p=>p.x>-PIPE_W);
  flappyPipes.forEach(p=>{
    if(!p.scored&&p.x+PIPE_W<100){p.scored=true;flappyScore++;
      const sc=document.getElementById("flappy-score");if(sc)sc.textContent=flappyScore;}
  });
  const birdR=22,birdX=100;
  if(birdY+birdR>FH-32||birdY-birdR<0)return flappyGameOver();
  for(const p of flappyPipes){
    if(birdX+birdR>p.x&&birdX-birdR<p.x+PIPE_W){
      if(birdY-birdR<p.topH||birdY+birdR>p.topH+PIPE_GAP)return flappyGameOver();
    }
  }
  desenharFlappy();
}

function desenharFlappy(){
  const canvas=document.getElementById("flappy-canvas");if(!canvas)return;
  const ctx=canvas.getContext("2d");
  const sky=ctx.createLinearGradient(0,0,0,FH);
  sky.addColorStop(0,"#C8DDB8");sky.addColorStop(.65,"#EBF0E6");sky.addColorStop(1,"#D5E8C8");
  ctx.fillStyle=sky;ctx.fillRect(0,0,FW,FH);
  ctx.fillStyle="rgba(255,255,255,.75)";
  [[60,80,60,18],[210,110,80,14],[380,65,70,16]].forEach(([x,y,w,h])=>{
    ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+28,y-8,w*.65,h*.65,0,0,Math.PI*2);ctx.fill();
  });
  flappyPipes.forEach(p=>{
    const g=ctx.createLinearGradient(p.x,0,p.x+PIPE_W,0);
    g.addColorStop(0,"#506B45");g.addColorStop(.45,"#7A9B6E");g.addColorStop(1,"#3A5035");
    ctx.fillStyle=g;
    ctx.fillRect(p.x,0,PIPE_W,p.topH);
    ctx.fillStyle="#3A5035";ctx.fillRect(p.x-5,p.topH-18,PIPE_W+10,18);
    const botY=p.topH+PIPE_GAP;
    ctx.fillStyle=g;ctx.fillRect(p.x,botY,PIPE_W,FH-botY);
    ctx.fillStyle="#3A5035";ctx.fillRect(p.x-5,botY,PIPE_W+10,18);
  });
  ctx.fillStyle="#7A9B6E";ctx.fillRect(0,FH-32,FW,32);
  ctx.fillStyle="#506B45";ctx.fillRect(0,FH-32,FW,5);
  const birdX=100,birdSize=44;
  ctx.save();ctx.translate(birdX,birdY);
  ctx.rotate(Math.min(Math.max(birdVY*.04,-.5),1.0));
  if(imgGianOk){
    ctx.beginPath();ctx.arc(0,0,birdSize/2,0,Math.PI*2);ctx.clip();
    ctx.drawImage(IMG_GIAN,-birdSize/2,-birdSize/2,birdSize,birdSize);
  } else {
    ctx.fillStyle="#B87B3E";ctx.beginPath();ctx.arc(0,0,birdSize/2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="22px serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("😊",0,0);
  }
  ctx.fillStyle="rgba(156,102,49,.7)";ctx.beginPath();
  const wf=Math.sin(flappyTick*.25)*5;
  ctx.ellipse(-8,8+wf,13,6,0.3,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function flappyGameOver(){
  flappyAlive=false;if(flappyRafId){cancelAnimationFrame(flappyRafId);flappyRafId=null;}
  mostrarOverlay("flappy","Game Over! 🐦",`${flappyScore} cano${flappyScore!==1?"s":""}!`,[
    {label:"Jogar de novo",fn:"iniciarFlappy()"},{label:"Voltar",fn:"voltarMenu('flappy')"}
  ]);
  setTimeout(()=>{const pg=document.getElementById("flappy-postgame");if(pg)pg.style.display="block";carregarTop10("flappy");},300);
}

document.addEventListener("keydown",(e)=>{
  if(document.getElementById("arena-flappy")?.style.display==="none")return;
  if(["Space","ArrowUp","w","W"].includes(e.code||e.key)){
    e.preventDefault();if(!flappyStarted)iniciarFlappy();else if(flappyAlive)birdVY=FLAP_FORCE;
  }
});
document.addEventListener("DOMContentLoaded",()=>{
  const fc=document.getElementById("flappy-canvas");
  if(!fc)return;
  fc.addEventListener("touchstart",e=>{e.preventDefault();flappyTap();},{passive:false});
  fc.addEventListener("click",()=>flappyTap());
});

/* ══════════════════════════════════════════════════════════
   EMPILHA O BOLO
══════════════════════════════════════════════════════════ */
const BOLO_LAYER_H=36, BOLO_BASE_W=300;
const BOLO_COLORS=[
  {fill:"#F2D4C0",stroke:"#C8885A"},{fill:"#E8C8D8",stroke:"#B86080"},
  {fill:"#F5E8C0",stroke:"#C8A840"},{fill:"#D8E8D0",stroke:"#689858"},
  {fill:"#E0D0F0",stroke:"#8060B8"},{fill:"#F0D8C0",stroke:"#B87840"},
];
let boloLayers=[],boloMoving=null,boloSpeed=0,boloScore=0,boloState="start";
let boloRafId=null,boloParticles=[];

function resetBolo(){
  pararBolo();
  const canvas=document.getElementById("bolo-canvas");if(!canvas)return;
  const W=canvas.width,H=canvas.height;
  const FLOOR=H-60;
  boloLayers=[{x:W/2-BOLO_BASE_W/2,w:BOLO_BASE_W,y:FLOOR,ci:0}];
  boloMoving={x:0,w:BOLO_BASE_W,dir:1,ci:1};
  boloSpeed=2.2;boloScore=0;boloState="start";boloParticles=[];
  const sc=document.getElementById("bolo-score");if(sc)sc.textContent="0 andares";
  const pg=document.getElementById("bolo-postgame");if(pg)pg.style.display="none";
  desenharBolo();boloDrawOverlay("start");
}

function iniciarBolo(){
  const canvas=document.getElementById("bolo-canvas");if(!canvas)return;
  const W=canvas.width,H=canvas.height,FLOOR=H-60;
  boloLayers=[{x:W/2-BOLO_BASE_W/2,w:BOLO_BASE_W,y:FLOOR,ci:0}];
  boloMoving={x:0,w:BOLO_BASE_W,dir:1,ci:1};
  boloSpeed=2.2;boloScore=0;boloParticles=[];boloState="playing";
  const sc=document.getElementById("bolo-score");if(sc)sc.textContent="0 andares";
  const pg=document.getElementById("bolo-postgame");if(pg)pg.style.display="none";
  boloRafId=requestAnimationFrame(boloLoop);
}

function pararBolo(){boloState="idle";if(boloRafId){cancelAnimationFrame(boloRafId);boloRafId=null;}}

function boloAction(){
  if(boloState==="start"||boloState==="over"){iniciarBolo();return;}
  if(boloState!=="playing")return;
  const canvas=document.getElementById("bolo-canvas");if(!canvas)return;
  const H=canvas.height,FLOOR=H-60;
  const top=boloLayers[boloLayers.length-1];
  const newY=top.y-BOLO_LAYER_H;
  const left=Math.max(boloMoving.x,top.x);
  const right=Math.min(boloMoving.x+boloMoving.w,top.x+top.w);
  const overlap=right-left;
  if(overlap<=4){
    boloState="over";
    boloSpawnParts(boloMoving.x,newY,boloMoving.w,BOLO_COLORS[boloMoving.ci%BOLO_COLORS.length]);
    desenharBolo();boloDrawOverlay("over");
    setTimeout(()=>{const pg=document.getElementById("bolo-postgame");if(pg)pg.style.display="block";carregarTop10("bolo");},300);
    return;
  }
  if(boloMoving.w-overlap>2) boloSpawnParts(boloMoving.x<top.x?boloMoving.x:boloMoving.x+overlap,newY,Math.abs(boloMoving.w-overlap),BOLO_COLORS[boloMoving.ci%BOLO_COLORS.length]);
  boloLayers.push({x:left,w:overlap,y:newY,ci:boloMoving.ci});
  boloScore++;
  const sc=document.getElementById("bolo-score");if(sc)sc.textContent=boloScore+(boloScore===1?" andar":" andares");
  const nextW=overlap;
  const startX=boloScore%2===0?-nextW:canvas.width+nextW;
  boloMoving={x:startX,w:nextW,dir:boloScore%2===0?1:-1,ci:boloMoving.ci+1};
  boloSpeed=Math.min(5.5,2.2+boloScore*.15);
  if(boloScore>=6) boloLayers.forEach(l=>{l.y+=BOLO_LAYER_H;});
}

function boloSpawnParts(x,y,w,col){
  for(let i=0;i<10;i++) boloParticles.push({x:x+Math.random()*w,y,vx:(Math.random()-.5)*4,vy:Math.random()*-3-1,alpha:1,fill:col.fill,r:4+Math.random()*5});
}

function boloLoop(){
  if(boloState!=="playing")return;
  boloMoving.x+=boloMoving.dir*boloSpeed;
  const canvas=document.getElementById("bolo-canvas");if(!canvas)return;
  if(boloMoving.x+boloMoving.w>canvas.width+20)boloMoving.dir=-1;
  if(boloMoving.x<-20)boloMoving.dir=1;
  boloParticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.18;p.alpha-=.04;});
  boloParticles=boloParticles.filter(p=>p.alpha>0);
  desenharBolo();
  boloRafId=requestAnimationFrame(boloLoop);
}

function desenharBolo(){
  const canvas=document.getElementById("bolo-canvas");if(!canvas)return;
  const ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height,FLOOR=H-60;
  ctx.fillStyle="#F8F4EE";ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="rgba(180,140,100,.07)";ctx.lineWidth=1;
  for(let x=40;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  ctx.fillStyle="#C8A878";ctx.strokeStyle="#A08858";ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(W/2,FLOOR+28,BOLO_BASE_W/2+20,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle="#D8B888";ctx.beginPath();ctx.ellipse(W/2,FLOOR+24,BOLO_BASE_W/2+18,13,0,0,Math.PI*2);ctx.fill();
  boloLayers.forEach((l,i)=>boloDrawLayer(ctx,l.x,l.y,l.w,BOLO_LAYER_H,BOLO_COLORS[l.ci%BOLO_COLORS.length],i===boloLayers.length-1));
  if(boloState==="playing"&&boloMoving){
    const topY=boloLayers[boloLayers.length-1].y-BOLO_LAYER_H;
    boloDrawLayer(ctx,boloMoving.x,topY,boloMoving.w,BOLO_LAYER_H,BOLO_COLORS[boloMoving.ci%BOLO_COLORS.length],false);
    const top=boloLayers[boloLayers.length-1];
    ctx.strokeStyle="rgba(107,39,55,.15)";ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(top.x,topY-2);ctx.lineTo(top.x,topY-18);ctx.stroke();
    ctx.beginPath();ctx.moveTo(top.x+top.w,topY-2);ctx.lineTo(top.x+top.w,topY-18);ctx.stroke();
    ctx.setLineDash([]);
  }
  boloParticles.forEach(p=>{ctx.globalAlpha=p.alpha;ctx.fillStyle=p.fill;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});
  ctx.globalAlpha=1;
  if(boloScore>=8&&boloLayers.length>=2){
    const top=boloLayers[boloLayers.length-1];
    ctx.font="20px serif";ctx.textAlign="center";ctx.fillText("💍",top.x+top.w/2,top.y-22);
  }
}

function boloDrawLayer(ctx,x,y,w,h,col,isTop){
  if(w<=0)return;
  ctx.fillStyle=col.fill;ctx.strokeStyle=col.stroke;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(x,y,w,h,isTop?[6,6,2,2]:2);ctx.fill();ctx.stroke();
  ctx.fillStyle="#FFF8F4";ctx.beginPath();ctx.roundRect(x+2,y+1,w-4,8,[4,4,0,0]);ctx.fill();
  if(w>40){ctx.fillStyle=col.stroke;const sp=Math.min(28,w/4);for(let fx=x+sp;fx<x+w-8;fx+=sp){ctx.beginPath();ctx.arc(fx,y+h/2+4,2,0,Math.PI*2);ctx.fill();}}
}

function boloDrawOverlay(type){
  const canvas=document.getElementById("bolo-canvas");if(!canvas)return;
  const ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
  ctx.fillStyle="rgba(248,244,238,.94)";ctx.fillRect(0,0,W,H);ctx.textAlign="center";
  if(type==="start"){
    ctx.font="44px serif";ctx.fillText("🎂",W/2,H/2-80);
    ctx.fillStyle="#6B2737";ctx.font="500 24px Georgia";ctx.fillText("Empilha o Bolo",W/2,H/2-28);
    ctx.fillStyle="#8B5060";ctx.font="14px Georgia";
    ctx.fillText("Clique no momento certo e monte",W/2,H/2+8);
    ctx.fillText("o bolo mais alto da festa.",W/2,H/2+28);
    ctx.fillStyle="#6B2737";ctx.beginPath();ctx.roundRect(W/2-75,H/2+52,150,44,8);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="500 14px Georgia";ctx.fillText("Começar",W/2,H/2+80);
  } else {
    const msgs=boloScore>=15?["A confeiteira está emocionada.","Esse bolo já pode entrar na recepção."]:
                boloScore>=8?["Quase um bolo real.","Mas ainda cabe mais glacê."]:
                boloScore>=4?["Um bolo razoável.","A tia aprovou."]:["A confeiteira está chorando.","Mas tudo bem. É de casamento."];
    ctx.font="36px serif";ctx.fillText("🎂",W/2,H/2-90);
    ctx.fillStyle="#6B2737";ctx.font="500 22px Georgia";ctx.fillText("Fim!",W/2,H/2-46);
    ctx.fillStyle="#C8885A";ctx.font="19px Georgia";ctx.fillText(boloScore+" andar"+(boloScore!==1?"es":""),W/2,H/2-12);
    ctx.fillStyle="#6B2737";ctx.font="14px Georgia";ctx.fillText(msgs[0],W/2,H/2+20);
    ctx.fillStyle="#8B5060";ctx.font="13px Georgia";ctx.fillText(msgs[1],W/2,H/2+42);
    ctx.fillStyle="#6B2737";ctx.beginPath();ctx.roundRect(W/2-90,H/2+68,180,44,8);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="500 14px Georgia";ctx.fillText("Jogar de novo",W/2,H/2+96);
  }
}

/* ══════════════════════════════════════════════════════════
   PEGA OS DOCINHOS
══════════════════════════════════════════════════════════ */
const DOCES=[
  {e:"🍫",pts:2},{e:"🧁",pts:3},{e:"🍬",pts:3},{e:"🥐",pts:2},
  {e:"🍋",pts:4},{e:"🍡",pts:3},{e:"🍩",pts:2},{e:"✨",pts:5},
];
const VILOES=[{e:"🧾",pts:-3},{e:"👵",pts:-2},{e:"🥂",pts:-1},{e:"😤",pts:-3}];
const BASKET_W=72,BASKET_H=28;

let docItems=[],docBasket={x:200},docScore=0,docTime=45,docState="start";
let docRafId=null,docLastTs=0,docSpawnTimer=0,docSecTimer=0,docPopups=[],docMouseX=200;

function resetDocinhos(){
  pararDocinhos();
  docItems=[];docBasket={x:200};docScore=0;docTime=45;docState="start";
  docPopups=[];docMouseX=200;docSpawnTimer=0;docSecTimer=0;
  const sc=document.getElementById("docinhos-score");if(sc)sc.textContent="0 pts";
  const tm=document.getElementById("docinhos-time");if(tm)tm.textContent="45s";
  const pg=document.getElementById("docinhos-postgame");if(pg)pg.style.display="none";
  desenharDocinhos();docDrawOverlay("start");
}

function iniciarDocinhos(){
  docItems=[];docScore=0;docTime=45;docPopups=[];docSpawnTimer=0;docSecTimer=0;docLastTs=0;
  docState="playing";
  const sc=document.getElementById("docinhos-score");if(sc)sc.textContent="0 pts";
  const tm=document.getElementById("docinhos-time");if(tm)tm.textContent="45s";
  const pg=document.getElementById("docinhos-postgame");if(pg)pg.style.display="none";
  docRafId=requestAnimationFrame(docLoop);
}

function pararDocinhos(){docState="idle";if(docRafId){cancelAnimationFrame(docRafId);docRafId=null;}}

function docLoop(ts){
  if(docState!=="playing")return;
  docRafId=requestAnimationFrame(docLoop);
  if(!docLastTs)docLastTs=ts;
  const dt=Math.min(ts-docLastTs,50);docLastTs=ts;
  docSecTimer+=dt;
  if(docSecTimer>=1000){docSecTimer-=1000;docTime--;const tm=document.getElementById("docinhos-time");if(tm)tm.textContent=docTime+"s";}
  if(docTime<=0){docState="over";desenharDocinhos();docDrawOverlay("over");setTimeout(()=>{const pg=document.getElementById("docinhos-postgame");if(pg)pg.style.display="block";carregarTop10("docinhos");},300);return;}
  docSpawnTimer+=dt;
  const spawnRate=Math.max(600,1400-(45-docTime)*18);
  if(docSpawnTimer>spawnRate){
    docSpawnTimer=0;
    const isV=Math.random()<.22;
    const pool=isV?VILOES:DOCES;
    const item=pool[Math.floor(Math.random()*pool.length)];
    const canvas=document.getElementById("docinhos-canvas");
    const W=canvas?canvas.width:420;
    docItems.push({...item,x:24+Math.random()*(W-48),y:-20,vy:1.8+Math.random()*1.4+(45-docTime)*.04,isV});
  }
  docBasket.x+=(docMouseX-BASKET_W/2-docBasket.x)*.22;
  const canvas=document.getElementById("docinhos-canvas");
  const W=canvas?canvas.width:420,H=canvas?canvas.height:520,FLOOR=H-20;
  docBasket.x=Math.max(0,Math.min(W-BASKET_W,docBasket.x));
  const bL=docBasket.x,bR=docBasket.x+BASKET_W,bTop=FLOOR-BASKET_H;
  docItems=docItems.filter(item=>{
    item.y+=item.vy;
    if(item.y+14>=bTop&&item.y-14<FLOOR&&item.x>bL-8&&item.x<bR+8){
      docScore+=item.pts;
      const sc=document.getElementById("docinhos-score");if(sc)sc.textContent=docScore+" pts";
      docPopups.push({x:item.x,y:bTop-8,text:(item.pts>0?"+":"")+item.pts,color:item.pts>0?"#3A7A28":"#9B2828",alpha:1,vy:-1.2});
      return false;
    }
    return item.y<H+30;
  });
  docPopups=docPopups.filter(p=>{p.y+=p.vy;p.alpha-=.025;return p.alpha>0;});
  desenharDocinhos();
}

function desenharDocinhos(){
  const canvas=document.getElementById("docinhos-canvas");if(!canvas)return;
  const ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height,FLOOR=H-20;
  ctx.fillStyle="#F8F4EE";ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#E8DFD0";ctx.fillRect(0,FLOOR-4,W,H-FLOOR+4);
  ctx.fillStyle="#D4C8B0";ctx.fillRect(0,FLOOR-4,W,4);
  docItems.forEach(item=>{
    ctx.globalAlpha=1;ctx.font="26px serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(item.e,item.x,item.y);
    if(item.isV){ctx.fillStyle="rgba(180,50,50,.12)";ctx.beginPath();ctx.arc(item.x,item.y,14,0,Math.PI*2);ctx.fill();}
  });
  const bx=docBasket.x,by=FLOOR-BASKET_H;
  ctx.fillStyle="rgba(80,60,40,.1)";ctx.beginPath();ctx.ellipse(bx+BASKET_W/2,FLOOR+4,BASKET_W/2,5,0,0,Math.PI*2);ctx.fill();
  const g=ctx.createLinearGradient(bx,by,bx,by+BASKET_H);
  g.addColorStop(0,"#E8D8A8");g.addColorStop(1,"#C8B080");
  ctx.fillStyle=g;ctx.strokeStyle="#A89060";ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(bx+8,by);ctx.lineTo(bx+BASKET_W-8,by);
  ctx.quadraticCurveTo(bx+BASKET_W,by,bx+BASKET_W,by+10);
  ctx.lineTo(bx+BASKET_W-4,by+BASKET_H);ctx.lineTo(bx+4,by+BASKET_H);
  ctx.lineTo(bx,by+10);ctx.quadraticCurveTo(bx,by,bx+8,by);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle="rgba(255,248,220,.5)";ctx.fillRect(bx+8,by+3,BASKET_W-16,5);
  ctx.fillStyle="#A89060";ctx.font="10px serif";ctx.textAlign="center";ctx.fillText("✿",bx+BASKET_W/2,by+BASKET_H/2+2);
  docPopups.forEach(p=>{ctx.globalAlpha=p.alpha;ctx.fillStyle=p.color;ctx.font="bold 15px Georgia";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(p.text,p.x,p.y);});
  ctx.globalAlpha=1;
  if(docTime<=10&&docState==="playing"){ctx.fillStyle=`rgba(155,40,40,${.1+Math.sin(Date.now()/200)*.05})`;ctx.fillRect(0,0,W,H);}
}

function docDrawOverlay(type){
  const canvas=document.getElementById("docinhos-canvas");if(!canvas)return;
  const ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
  ctx.fillStyle="rgba(248,244,238,.94)";ctx.fillRect(0,0,W,H);ctx.textAlign="center";
  if(type==="start"){
    ctx.font="40px serif";ctx.fillText("🍬🍫",W/2,H/2-80);
    ctx.fillStyle="#2A3E22";ctx.font="500 22px Georgia";ctx.fillText("Pega os Docinhos",W/2,H/2-28);
    ctx.fillStyle="#506B45";ctx.font="14px Georgia";
    ctx.fillText("Salve os docinhos antes que os",W/2,H/2+8);ctx.fillText("convidados cheguem. 45 segundos.",W/2,H/2+28);
    ctx.fillStyle="#2A3E22";ctx.beginPath();ctx.roundRect(W/2-75,H/2+52,150,44,8);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="500 14px Georgia";ctx.fillText("Começar",W/2,H/2+80);
  } else {
    const msgs=docScore>=50?["Pati Piva teria orgulho.","A mesa de doces está impoluta."]:
                docScore>=30?["Você salvou a confeitaria inteira.","Os convidados ficaram felizes."]:
                docScore>=15?["A mesa de doces sobreviveu.","Quase tudo salvo."]:
                             ["Você deixou os convidados com fome.","Os brigadeiros pediram demissão."];
    ctx.font="36px serif";ctx.fillText("🎉",W/2,H/2-90);
    ctx.fillStyle="#2A3E22";ctx.font="500 22px Georgia";ctx.fillText("Tempo esgotado!",W/2,H/2-46);
    ctx.fillStyle="#506B45";ctx.font="19px Georgia";ctx.fillText(docScore+" pontos",W/2,H/2-14);
    ctx.fillStyle="#2A3E22";ctx.font="14px Georgia";ctx.fillText(msgs[0],W/2,H/2+18);
    ctx.fillStyle="#506B45";ctx.font="13px Georgia";ctx.fillText(msgs[1],W/2,H/2+42);
    ctx.fillStyle="#2A3E22";ctx.beginPath();ctx.roundRect(W/2-85,H/2+66,170,44,8);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="500 14px Georgia";ctx.fillText("Jogar de novo",W/2,H/2+94);
  }
}

/* ══════════════════════════════════════════════════════════
   MONTE O LOOK
══════════════════════════════════════════════════════════ */
const LOOK_ITEMS={
  head:[{e:"👑",n:"coroa"},{e:"🎩",n:"cartola"},{e:"💎",n:"tiara de cristal"},{e:"🌸",n:"flores"},{e:"🕶️",n:"óculos dramáticos"},{e:"🎀",n:"laço gigante"}],
  top:[{e:"✨",n:"cropped de paetê"},{e:"🦚",n:"capa de plumas"},{e:"🃏",n:"blazer exagerado"},{e:"🌹",n:"camisa transparente"},{e:"🎭",n:"corselet"},{e:"💫",n:"top brilhante"}],
  bottom:[{e:"🪩",n:"saia volumosa"},{e:"✦",n:"calça flare"},{e:"💜",n:"short brilhante"},{e:"🌊",n:"pantalona"},{e:"🩰",n:"saia assimétrica"},{e:"🖤",n:"calça couro"}],
  shoes:[{e:"👢",n:"bota over"},{e:"👠",n:"salto plataforma"},{e:"🥿",n:"mocassim"},{e:"⭐",n:"sandália joia"},{e:"🩴",n:"tamanco"}],
  acc:[{e:"🪭",n:"leque"},{e:"🥂",n:"taça"},{e:"💐",n:"buquê roubado"},{e:"👜",n:"clutch"},{e:"🧤",n:"luvas"},{e:"📿",n:"colar"}],
};
const LOOK_AVAL=["Madrinha que roubou a cena.","Acabou de sair de um editorial da Vogue Noivos.","Proibido sentar perto da tia conservadora.","Mais brilho que a pista de dança.","O vestido da noiva quem? Esse é o look.","Categoria: chegou depois dos noivos e ninguém reclamou.","Stylist da volta da lua de mel já ligou.","Categoria: velas que apagam, look que fica."];
let lookSelected={head:null,top:null,bottom:null,shoes:null,acc:[]};

function initLook(){
  lookSelected={head:null,top:null,bottom:null,shoes:null,acc:[]};
  const panels=document.getElementById("look-panels");
  if(!panels)return;
  panels.innerHTML="";
  Object.entries(LOOK_ITEMS).forEach(([cat,items])=>{
    const catNames={head:"Cabeça",top:"Parte de cima",bottom:"Parte de baixo",shoes:"Sapatos",acc:"Acessórios"};
    const catDiv=document.createElement("div");catDiv.className="look-cat-group";
    catDiv.innerHTML=`<div class="look-cat-label">${catNames[cat]}</div><div class="look-items-row" id="look-${cat}"></div>`;
    panels.appendChild(catDiv);
    const row=catDiv.querySelector(".look-items-row");
    items.forEach(item=>{
      const btn=document.createElement("button");
      btn.className="look-item-btn";btn.textContent=item.e;btn.title=item.n;
      btn.dataset.cat=cat;btn.dataset.e=item.e;
      btn.addEventListener("click",()=>lookToggle(btn,cat,item.e));
      row.appendChild(btn);
    });
  });
  renderLookChar();
}

function lookToggle(el,cat,e){
  if(cat==="acc"){
    const idx=lookSelected.acc.indexOf(e);
    if(idx>=0){lookSelected.acc.splice(idx,1);el.classList.remove("active");}
    else if(lookSelected.acc.length<3){lookSelected.acc.push(e);el.classList.add("active");}
  } else {
    const was=lookSelected[cat]===e;
    document.querySelectorAll(`.look-item-btn[data-cat="${cat}"]`).forEach(b=>b.classList.remove("active"));
    lookSelected[cat]=was?null:e;
    if(!was)el.classList.add("active");
  }
  renderLookChar();
}

function renderLookChar(){
  const svg=document.getElementById("look-svg");if(!svg)return;
  const TOP_COLORS={"✨":"#9B70C8","🦚":"#2D7A5A","🃏":"#1A1A2E","🌹":"rgba(220,220,255,.4)","🎭":"#4A1A28","💫":"#C8A830"};
  const BOT_COLORS={"🪩":"#6B2D7A","✦":"#1A1A3A","💜":"#7B2D9A","🌊":"#2D5A8A","🩰":"#8A2D6A","🖤":"#111"};
  const SHOE_COLORS={"👢":"#3A1A0A","👠":"#9B2737","🥿":"#8A6040","⭐":"#C8A030","🩴":"#C87830"};
  const tc=TOP_COLORS[lookSelected.top]||null;
  const bc=BOT_COLORS[lookSelected.bottom]||null;
  const sc2=SHOE_COLORS[lookSelected.shoes]||null;
  svg.innerHTML=`
    <defs><radialGradient id="sg" cx="50%" cy="40%"><stop offset="0%" stop-color="#D4A882"/><stop offset="100%" stop-color="#B8856A"/></radialGradient></defs>
    <rect x="52" y="185" width="14" height="70" rx="5" fill="url(#sg)"/>
    <rect x="74" y="185" width="14" height="70" rx="5" fill="url(#sg)"/>
    ${bc?`<rect x="44" y="183" width="52" height="78" rx="4" fill="${bc}" opacity=".94"/><text x="70" y="225" text-anchor="middle" font-size="18">${lookSelected.bottom}</text>`:''}
    <rect x="45" y="115" width="50" height="75" rx="8" fill="url(#sg)"/>
    <rect x="28" y="118" width="13" height="55" rx="6" fill="url(#sg)"/>
    <rect x="99" y="118" width="13" height="55" rx="6" fill="url(#sg)"/>
    ${tc?`<rect x="38" y="112" width="64" height="78" rx="10" fill="${tc}" opacity=".92"/><text x="70" y="155" text-anchor="middle" font-size="18">${lookSelected.top}</text><rect x="26" y="115" width="16" height="58" rx="7" fill="${tc}" opacity=".88"/><rect x="98" y="115" width="16" height="58" rx="7" fill="${tc}" opacity=".88"/>`:''}
    <rect x="62" y="98" width="16" height="22" rx="4" fill="url(#sg)"/>
    <ellipse cx="70" cy="82" rx="24" ry="26" fill="url(#sg)"/>
    <ellipse cx="70" cy="62" rx="24" ry="14" fill="#2A1A0A"/>
    <ellipse cx="62" cy="80" rx="4" ry="4.5" fill="#fff"/><ellipse cx="78" cy="80" rx="4" ry="4.5" fill="#fff"/>
    <circle cx="62" cy="80" r="2.5" fill="#1A1010"/><circle cx="78" cy="80" r="2.5" fill="#1A1010"/>
    <circle cx="63" cy="79" r="1" fill="#fff"/><circle cx="79" cy="79" r="1" fill="#fff"/>
    <path d="M57 74 Q62 71 67 74" stroke="#2A1A0A" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M73 74 Q78 71 83 74" stroke="#2A1A0A" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M64 90 Q70 94 76 90" stroke="#B87060" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    ${sc2?`<rect x="46" y="250" width="22" height="14" rx="4" fill="${sc2}"/><rect x="72" y="250" width="22" height="14" rx="4" fill="${sc2}"/><text x="57" y="261" text-anchor="middle" font-size="10">${lookSelected.shoes}</text><text x="83" y="261" text-anchor="middle" font-size="10">${lookSelected.shoes}</text>`:`<rect x="48" y="252" width="18" height="10" rx="3" fill="#2A1A0A"/><rect x="74" y="252" width="18" height="10" rx="3" fill="#2A1A0A"/>`}
    ${lookSelected.head?`<text x="70" y="52" text-anchor="middle" font-size="26">${lookSelected.head}</text>`:''}
    ${lookSelected.acc.map((a,i)=>{const pos=[[22,142],[116,142],[70,178]][i]||[22,142];return `<text x="${pos[0]}" y="${pos[1]}" text-anchor="middle" font-size="22">${a}</text>`;}).join("")}
  `;
}

function lookAvaliar(){
  const total=[lookSelected.head,lookSelected.top,lookSelected.bottom,lookSelected.shoes,...lookSelected.acc].filter(Boolean).length;
  const el=document.getElementById("look-result");
  if(!el)return;
  if(total<3){el.textContent="Adicione pelo menos 3 peças para avaliar o look.";return;}
  el.textContent="Categoria: "+LOOK_AVAL[Math.floor(Math.random()*LOOK_AVAL.length)];
}

function lookReset(){
  lookSelected={head:null,top:null,bottom:null,shoes:null,acc:[]};
  document.querySelectorAll(".look-item-btn").forEach(b=>b.classList.remove("active"));
  const el=document.getElementById("look-result");
  if(el)el.textContent="Escolha um look digno de entrar depois dos noivos.";
  renderLookChar();
}

/* ══════════════════════════════════════════════════════════
   OVERLAY HELPERS
══════════════════════════════════════════════════════════ */
function mostrarOverlay(jogo,titulo,msg,acoes){
  const wrap=document.querySelector(`#arena-${jogo} .canvas-wrap`);if(!wrap)return;
  let ov=wrap.querySelector(".overlay");
  if(!ov){ov=document.createElement("div");ov.className="overlay";wrap.appendChild(ov);}
  const icon=jogo==="snake"?"🐍":jogo==="flappy"?"🐦":jogo==="bolo"?"🎂":"🍬";
  ov.innerHTML=`<div class="overlay__icon">${icon}</div><div class="overlay__title">${titulo}</div><div class="overlay__score">${msg}</div><div class="overlay__actions">${acoes.map(a=>`<button class="btn btn--primary" onclick="${a.fn}">${a.label}</button>`).join("")}</div>`;
  ov.classList.remove("hidden");
}
function ocultarOverlay(jogo){const ov=document.querySelector(`#arena-${jogo} .overlay`);if(ov)ov.classList.add("hidden");}

/* ══════════════════════════════════════════════════════════
   CONTROLES BOLO & DOCINHOS
══════════════════════════════════════════════════════════ */
document.addEventListener("click",e=>{
  const boloCanvas=document.getElementById("bolo-canvas");
  if(boloCanvas&&boloCanvas.contains(e.target))boloAction();
  const docCanvas=document.getElementById("docinhos-canvas");
  if(docCanvas&&docCanvas.contains(e.target)&&(docState==="start"||docState==="over"))iniciarDocinhos();
});
document.addEventListener("keydown",e=>{
  if(e.key===" "){
    if(document.getElementById("arena-bolo")?.style.display!=="none"){e.preventDefault();boloAction();}
    if(document.getElementById("arena-docinhos")?.style.display!=="none"){e.preventDefault();if(docState==="start"||docState==="over")iniciarDocinhos();}
  }
  if(document.getElementById("arena-docinhos")?.style.display!=="none"&&docState==="playing"){
    if(e.key==="ArrowLeft")docMouseX=Math.max(0,docMouseX-30);
    if(e.key==="ArrowRight"){const c=document.getElementById("docinhos-canvas");docMouseX=Math.min(c?c.width:420,docMouseX+30);}
  }
});

document.addEventListener("DOMContentLoaded",()=>{
  const dc=document.getElementById("docinhos-canvas");
  if(dc){
    dc.addEventListener("mousemove",e=>{const r=dc.getBoundingClientRect();docMouseX=(e.clientX-r.left)*(dc.width/r.width);});
    dc.addEventListener("touchmove",e=>{e.preventDefault();const r=dc.getBoundingClientRect();docMouseX=(e.touches[0].clientX-r.left)*(dc.width/r.width);},{passive:false});
    dc.addEventListener("touchend",e=>{e.preventDefault();if(docState==="start"||docState==="over")iniciarDocinhos();},{passive:false});
  }
  const bc=document.getElementById("bolo-canvas");
  if(bc){
    bc.addEventListener("touchend",e=>{e.preventDefault();boloAction();},{passive:false});
  }
});

/* ══════════════════════════════════════════════════════════
   PLACAR
══════════════════════════════════════════════════════════ */
async function salvarScore(jogo){
  const nomeInput=document.getElementById(`${jogo}-nome`);
  const msgEl=document.getElementById(`${jogo}-save-msg`);
  const btn=nomeInput?.nextElementSibling;
  const nome=(nomeInput?.value||"").trim();
  const ptMap={snake:snakeScore,flappy:flappyScore,bolo:boloScore,docinhos:docScore};
  const pontos=ptMap[jogo]||0;
  if(!nome){if(msgEl){msgEl.style.color="var(--terracotta)";msgEl.textContent="Informe seu nome para salvar.";}if(nomeInput)nomeInput.focus();return;}
  if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span>';}
  try{
    const resp=await fetch(JOGOS_API,{method:"POST",body:JSON.stringify({action:"score",jogo,nome,pontos})});
    const json=await resp.json();
    if(json.sucesso){
      if(msgEl){msgEl.style.color="var(--sage-dark)";msgEl.textContent="Recorde salvo! 🏆";}
      if(btn){btn.disabled=true;btn.textContent="Salvo ✓";}
      if(nomeInput)nomeInput.disabled=true;
      carregarTop10(jogo);
    } else throw new Error();
  } catch{
    if(btn){btn.disabled=false;btn.textContent="Salvar";}
    if(msgEl){msgEl.style.color="var(--terracotta)";msgEl.textContent="Não conseguimos salvar. Tente novamente.";}
  }
}

async function carregarTop10(jogo){
  const container=document.getElementById(`${jogo}-top10`);if(!container)return;
  const nomes={snake:"🏆 Top 10 — Snake",flappy:"🏆 Top 10 — Flappy Gian",bolo:"🏆 Top 10 — Empilha o Bolo",docinhos:"🏆 Top 10 — Pega os Docinhos"};
  container.innerHTML=`<h3 class="top10__title">${nomes[jogo]||"Top 10"}</h3><p class="top10__loading">Carregando…</p>`;
  try{
    const resp=await fetch(`${JOGOS_API}?action=top10&jogo=${jogo}`);
    const dados=await resp.json();
    if(!dados?.lista?.length){container.innerHTML=`<h3 class="top10__title">${nomes[jogo]}</h3><p class="top10__empty">Nenhum recorde ainda. Seja o primeiro!</p>`;return;}
    const m=["🥇","🥈","🥉"],cs=["top10__item--gold","top10__item--silver","top10__item--bronze"];
    container.innerHTML=`<h3 class="top10__title">${nomes[jogo]}</h3><ul class="top10__list">${dados.lista.map((it,i)=>`<li class="top10__item ${cs[i]||""}"><span class="top10__pos">${m[i]||(i+1)}</span><span class="top10__name">${escHtmlJ(it.nome)}</span><span class="top10__pts">${it.pontos} pts</span></li>`).join("")}</ul>`;
  } catch{container.innerHTML=`<h3 class="top10__title">${nomes[jogo]}</h3><p class="top10__empty">Não foi possível carregar o placar.</p>`;}
}

async function carregarPreviewRecorde(){
  for(const jogo of["snake","flappy","bolo","docinhos"]){
    const el=document.getElementById(`record-${jogo}-preview`);if(!el)continue;
    try{
      const resp=await fetch(`${JOGOS_API}?action=top10&jogo=${jogo}`);
      const dados=await resp.json();
      if(dados?.lista?.length){const t=dados.lista[0];el.textContent=`🥇 ${t.nome} — ${t.pontos} pts`;}
      else el.textContent="Seja o primeiro a pontuar!";
    } catch{el.textContent="Placar disponível após jogar";}
  }
}

function escHtmlJ(str){return String(str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

carregarPreviewRecorde();

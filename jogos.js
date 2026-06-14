/* ═══════════════════════════════════════════════════════════
   TIAGO E GIAN — jogos.js v4
   Snake · Flappy · Empilha o Bolo · Pega os Docinhos · Monte o Look
   Canvas com devicePixelRatio para nitidez em Retina/HDPI
═══════════════════════════════════════════════════════════ */
"use strict";

const JOGOS_API = typeof API_URL !== "undefined"
  ? API_URL
  : "https://script.google.com/macros/s/AKfycbyYyCrT2oNLYDLcXDWq8X2b9Y0u0EbmQ7pUnpdRA3g0wZNUDtX0VTNrHq26wIngBwHn/exec";

const DPR = Math.min(window.devicePixelRatio || 1, 3);

/* Trava/destrava rolagem da página (mobile) durante o jogo. */
function lockScroll() {
  document.documentElement.classList.add("game-locked");
  document.body.classList.add("game-locked");
}
function unlockScroll() {
  document.documentElement.classList.remove("game-locked");
  document.body.classList.remove("game-locked");
}

/* helper: configura canvas para alta resolução */
function setupCanvas(id, w, h) {
  const c = document.getElementById(id);
  if (!c) return null;
  c.width  = w * DPR;
  c.height = h * DPR;
  c.style.width  = w + "px";
  c.style.height = h + "px";
  const ctx = c.getContext("2d");
  ctx.scale(DPR, DPR);
  return ctx;
}

/* helper: largura lógica de um canvas pelo id */
function cw(id) {
  const c = document.getElementById(id);
  return c ? c.width / DPR : 0;
}
function ch(id) {
  const c = document.getElementById(id);
  return c ? c.height / DPR : 0;
}

/* ══════════════════════════════════════════════════════════
   NAVEGAÇÃO
══════════════════════════════════════════════════════════ */
const ARENAS = ["menu","flappy","bolo","docinhos","look"];

function entrarJogo(jogo) {
  ARENAS.forEach(id => {
    const el = document.getElementById("arena-" + id);
    if (el) el.style.display = "none";
  });
  const target = document.getElementById("arena-" + jogo);
  if (target) target.style.display = "block";
  window.scrollTo({ top: 0, behavior: "instant" });
  if (jogo === "flappy")   resetFlappy();
  if (jogo === "bolo")     resetBolo();
  if (jogo === "docinhos") resetDocinhos();
  if (jogo === "look")     initLook();
}

function voltarMenu() {
  pararFlappy(); pararBolo(); pararDocinhos();
  ARENAS.forEach(id => {
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
   IMAGENS DAS CARAS
══════════════════════════════════════════════════════════ */
let imgGianOk = false;
const GIAN_FACES = [];
for (let i = 1; i <= 7; i++) {
  const img = new Image();
  img.loaded = false;
  img.onload = () => { img.loaded = true; if (i === 1) imgGianOk = true; };
  img.src = `assets/img/gian${String(i).padStart(2,"0")}.png`;
  GIAN_FACES.push(img);
}
let flFaceIdx = 0;

function drawFace(ctx, img, ok, x, y, size, fallbackColor, fallbackEmoji) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  if (ok) {
    ctx.drawImage(img, x, y, size, size);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.font = Math.round(size * 0.55) + "px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fallbackEmoji, x + size / 2, y + size / 2);
  }
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   OVERLAY HELPERS
══════════════════════════════════════════════════════════ */
function showOverlay(jogo, icon, title, sub, btns) {
  const wrap = document.querySelector("#arena-" + jogo + " .canvas-wrap");
  if (!wrap) return;
  let ov = wrap.querySelector(".game-overlay");
  if (!ov) { ov = document.createElement("div"); ov.className = "game-overlay"; wrap.appendChild(ov); }
  ov.innerHTML = `
    <div class="go-icon">${icon}</div>
    <div class="go-title">${title}</div>
    <div class="go-sub">${sub}</div>
    <div class="go-btns">${btns.map(b => `<button class="btn btn--primary" onclick="${b.fn}">${b.label}</button>`).join("")}</div>`;
  ov.style.display = "flex";
}
function hideOverlay(jogo) {
  const ov = document.querySelector("#arena-" + jogo + " .game-overlay");
  if (ov) ov.style.display = "none";
}

/* ══════════════════════════════════════════════════════════
   FLAPPY GIAN
══════════════════════════════════════════════════════════ */
let flCtx=null, flW=0, flH=0;
let flRaf=null, flAlive=false, flStarted=false, flScore=0;
let flBirdY=0, flBirdVY=0, flPipes=[], flTick=0;
const FL_GRAVITY=0.42, FL_FLAP=-8.5, FL_PIPE_W=58, FL_GAP=155, FL_SPD=2.8, FL_INTV=95;

function resetFlappy() {
  flAlive=false; flStarted=false;
  if (flRaf){cancelAnimationFrame(flRaf);flRaf=null;}

  const canvas = document.getElementById("flappy-canvas");
  if (!canvas) return;
  const W = canvas.parentElement.clientWidth || 480;
  flW = Math.min(W, 480); flH = Math.round(flW * 1.2);
  flCtx = setupCanvas("flappy-canvas", flW, flH);
  if (!flCtx) return;

  flScore=0; flBirdY=flH/2; flBirdVY=0; flPipes=[]; flTick=0;
  const sc=document.getElementById("flappy-score"); if(sc) sc.textContent="0";
  const pg=document.getElementById("flappy-postgame"); if(pg) pg.style.display="none";
  flDraw();
  showOverlay("flappy","🐦","Flappy Gian","Toque ou espaço para voar",[{label:"Começar",fn:"startFlappy()"}]);
}

function startFlappy() {
  flAlive=false;
  if(flRaf){cancelAnimationFrame(flRaf);flRaf=null;}
  flScore=0; flBirdY=flH/2; flBirdVY=0; flPipes=[]; flTick=0;
  flFaceIdx = Math.floor(Math.random()*GIAN_FACES.length);
  const sc=document.getElementById("flappy-score"); if(sc) sc.textContent="0";
  const pg=document.getElementById("flappy-postgame"); if(pg) pg.style.display="none";
  hideOverlay("flappy");
  flAlive=true; flStarted=true;
  lockScroll();
  flRaf=requestAnimationFrame(flLoop);
}

function pararFlappy(){flAlive=false;flStarted=false;if(flRaf){cancelAnimationFrame(flRaf);flRaf=null;}unlockScroll();}

function flTap(){if(!flStarted){startFlappy();return;}if(flAlive)flBirdVY=FL_FLAP;}

function flLoop() {
  if(!flAlive) return;
  flRaf=requestAnimationFrame(flLoop);
  flBirdVY+=FL_GRAVITY; flBirdY+=flBirdVY; flTick++;
  if (flTick%FL_INTV===0) {
    const topH = 55 + Math.random()*(flH-FL_GAP-110);
    flPipes.push({x:flW+FL_PIPE_W,topH,scored:false});
  }
  flPipes.forEach(p=>{p.x-=FL_SPD;});
  flPipes=flPipes.filter(p=>p.x>-FL_PIPE_W);
  flPipes.forEach(p=>{
    if(!p.scored&&p.x+FL_PIPE_W<flW*.22){p.scored=true;flScore++;
      const sc=document.getElementById("flappy-score");if(sc)sc.textContent=flScore;
      let novoIdx; do { novoIdx = Math.floor(Math.random()*GIAN_FACES.length); } while(novoIdx===flFaceIdx && GIAN_FACES.length>1);
      flFaceIdx = novoIdx;
    }
  });
  const bR=20, bX=flW*.22;
  if(flBirdY+bR>flH-28||flBirdY-bR<0) return flGameOver();
  for(const p of flPipes){
    if(bX+bR>p.x&&bX-bR<p.x+FL_PIPE_W){
      if(flBirdY-bR<p.topH||flBirdY+bR>p.topH+FL_GAP) return flGameOver();
    }
  }
  flDraw();
}

function flDraw() {
  const ctx=flCtx; if(!ctx) return;
  // Sky
  ctx.fillStyle="#C8DDB8"; ctx.fillRect(0,0,flW,flH*.6);
  ctx.fillStyle="#EBF0E6"; ctx.fillRect(0,flH*.6,flW,flH*.4);
  // Clouds
  ctx.fillStyle="rgba(255,255,255,.72)";
  [[flW*.12,flH*.1,48,14],[flW*.45,flH*.07,66,16],[flW*.78,flH*.13,54,13]].forEach(([cx,cy,rw,rh])=>{
    ctx.beginPath();ctx.ellipse(cx,cy,rw,rh,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(cx+rw*.4,cy-rh*.5,rw*.55,rh*.55,0,0,Math.PI*2);ctx.fill();
  });
  // Pipes
  flPipes.forEach(p=>{
    const g=ctx.createLinearGradient(p.x,0,p.x+FL_PIPE_W,0);
    g.addColorStop(0,"#506B45");g.addColorStop(.5,"#7A9B6E");g.addColorStop(1,"#3A5035");
    ctx.fillStyle=g;
    ctx.fillRect(p.x,0,FL_PIPE_W,p.topH);
    ctx.fillStyle="#3A5035";ctx.fillRect(p.x-4,p.topH-16,FL_PIPE_W+8,16);
    const bY=p.topH+FL_GAP;
    ctx.fillStyle=g;ctx.fillRect(p.x,bY,FL_PIPE_W,flH-bY);
    ctx.fillStyle="#3A5035";ctx.fillRect(p.x-4,bY,FL_PIPE_W+8,16);
  });
  // Ground
  ctx.fillStyle="#7A9B6E";ctx.fillRect(0,flH-28,flW,28);
  ctx.fillStyle="#506B45";ctx.fillRect(0,flH-28,flW,4);
  // Bird
  const bX=flW*.22, bSize=42;
  ctx.save();
  ctx.translate(bX,flBirdY);
  ctx.rotate(Math.min(Math.max(flBirdVY*.038,-.5),.9));
  const face = GIAN_FACES[flFaceIdx];
  drawFace(ctx,face,face.loaded,-bSize/2,-bSize/2,bSize,"#B87B3E","😊");
  ctx.fillStyle="rgba(156,102,49,.65)";
  ctx.beginPath();ctx.ellipse(-7,7+Math.sin(flTick*.25)*4,11,5,.3,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function flGameOver(){
  flAlive=false;if(flRaf){cancelAnimationFrame(flRaf);flRaf=null;}
  unlockScroll();
  flDraw();
  const msgs=flScore>=15?["O Gian virou pombo de competição!","Recorde lendário."]:
              flScore>=8?["O Gian voou bem hoje.","Consegue bater esse recorde?"]:
              flScore>=3?["Quase...","Tenta mais uma vez!"]:["O Gian bateu logo de cara.","Cuidado com os canos!"];
  showOverlay("flappy","💥","Game Over!",`${flScore} cano${flScore!==1?"s":""} · ${msgs[0]}`,[
    {label:"Jogar de novo",fn:"startFlappy()"},{label:"Voltar",fn:"voltarMenu()"}
  ]);
  setTimeout(()=>{const pg=document.getElementById("flappy-postgame");if(pg)pg.style.display="block";carregarTop10("flappy");},300);
}

document.addEventListener("keydown",e=>{
  if(document.getElementById("arena-flappy")?.style.display==="none")return;
  if([" ","ArrowUp","w","W"].includes(e.key)){e.preventDefault();flTap();}
});
document.addEventListener("DOMContentLoaded",()=>{
  const fc=document.getElementById("flappy-canvas");
  if(!fc)return;
  fc.addEventListener("touchstart",e=>{e.preventDefault();flTap();},{passive:false});
  fc.addEventListener("click",()=>flTap());
});

/* ══════════════════════════════════════════════════════════
   EMPILHA O BOLO
══════════════════════════════════════════════════════════ */
let boCtx=null, boW=0, boH=0;
let boRaf=null, boState="idle", boScore=0, boSpeed=0;
let boLayers=[], boMoving=null, boParts=[];
const BO_LH=34, BO_BASE=280;
const BO_COLS=[
  {f:"#F2D4C0",s:"#C8885A"},{f:"#E8C8D8",s:"#B86080"},
  {f:"#F5E8C0",s:"#C8A840"},{f:"#D8E8D0",s:"#689858"},
  {f:"#E0D0F0",s:"#8060B8"},{f:"#F0D8C0",s:"#B87840"},
];

function resetBolo(){
  pararBolo();
  const canvas=document.getElementById("bolo-canvas"); if(!canvas) return;
  const W=canvas.parentElement.clientWidth||440;
  boW=Math.min(W,440); boH=Math.round(boW*1.15);
  boCtx=setupCanvas("bolo-canvas",boW,boH); if(!boCtx) return;
  const FLOOR=boH-52;
  boLayers=[{x:boW/2-BO_BASE/2,w:BO_BASE,y:FLOOR,ci:0}];
  boMoving={x:0,w:BO_BASE,dir:1,ci:1};
  boSpeed=2.0;boScore=0;boParts=[];boState="start";
  const sc=document.getElementById("bolo-score");if(sc)sc.textContent="0 andares";
  const pg=document.getElementById("bolo-postgame");if(pg)pg.style.display="none";
  boDraw();
  showOverlay("bolo","🎂","Empilha o Bolo","Toque no momento certo · Espaço ou clique",[{label:"Começar",fn:"startBolo()"}]);
}

function startBolo(){
  const canvas=document.getElementById("bolo-canvas"); if(!canvas) return;
  lockScroll();
  const FLOOR=boH-52;
  boLayers=[{x:boW/2-BO_BASE/2,w:BO_BASE,y:FLOOR,ci:0}];
  boMoving={x:0,w:BO_BASE,dir:1,ci:1};
  boSpeed=2.0;boScore=0;boParts=[];boState="playing";
  const sc=document.getElementById("bolo-score");if(sc)sc.textContent="0 andares";
  const pg=document.getElementById("bolo-postgame");if(pg)pg.style.display="none";
  hideOverlay("bolo");
  boRaf=requestAnimationFrame(boLoop);
}

function pararBolo(){boState="idle";if(boRaf){cancelAnimationFrame(boRaf);boRaf=null;}unlockScroll();}

function boAction(){
  if(boState==="start"||boState==="over"){startBolo();return;}
  if(boState!=="playing") return;
  const top=boLayers[boLayers.length-1];
  const newY=top.y-BO_LH;
  const left=Math.max(boMoving.x,top.x);
  const right=Math.min(boMoving.x+boMoving.w,top.x+top.w);
  const overlap=right-left;
  if(overlap<=3){
    boState="over";
    unlockScroll();
    boSpawnParts(boMoving.x,newY,boMoving.w,BO_COLS[boMoving.ci%BO_COLS.length]);
    boDraw();
    const msgs=boScore>=15?["A confeiteira está emocionada.","Esse bolo já pode entrar na recepção."]:
                boScore>=8?["Quase um bolo real.","Mas ainda cabe mais glacê."]:
                boScore>=4?["Um bolo razoável.","A tia aprovou."]:["A confeiteira está chorando.","Mas de casamento é assim."];
    showOverlay("bolo","🎂","Fim!",`${boScore} andar${boScore!==1?"es":""} · ${msgs[0]}`,[
      {label:"Jogar de novo",fn:"startBolo()"},{label:"Voltar",fn:"voltarMenu()"}
    ]);
    setTimeout(()=>{const pg=document.getElementById("bolo-postgame");if(pg)pg.style.display="block";carregarTop10("bolo");},300);
    return;
  }
  const cut=boMoving.w-overlap;
  if(cut>2) boSpawnParts(boMoving.x<top.x?boMoving.x:boMoving.x+overlap,newY,Math.abs(cut),BO_COLS[boMoving.ci%BO_COLS.length]);
  boLayers.push({x:left,w:overlap,y:newY,ci:boMoving.ci});
  boScore++;
  const sc=document.getElementById("bolo-score");if(sc)sc.textContent=boScore+(boScore===1?" andar":" andares");
  const nw=overlap;
  const sx=boScore%2===0?-nw:boW+nw;
  boMoving={x:sx,w:nw,dir:boScore%2===0?1:-1,ci:boMoving.ci+1};
  boSpeed=Math.min(5.2,2.0+boScore*.14);
  if(boScore>=6) boLayers.forEach(l=>{l.y+=BO_LH;});
}

function boSpawnParts(x,y,w,col){
  for(let i=0;i<10;i++) boParts.push({x:x+Math.random()*w,y,vx:(Math.random()-.5)*3.5,vy:Math.random()*-2.5-1,a:1,f:col.f,r:3+Math.random()*5});
}

function boLoop(){
  if(boState!=="playing") return;
  boMoving.x+=boMoving.dir*boSpeed;
  if(boMoving.x+boMoving.w>boW+18) boMoving.dir=-1;
  if(boMoving.x<-18) boMoving.dir=1;
  boParts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.16;p.a-=.038;});
  boParts=boParts.filter(p=>p.a>0);
  boDraw();
  boRaf=requestAnimationFrame(boLoop);
}

function boDraw(){
  const ctx=boCtx; if(!ctx) return;
  ctx.fillStyle="#F8F4EE"; ctx.fillRect(0,0,boW,boH);
  ctx.strokeStyle="rgba(180,140,100,.07)"; ctx.lineWidth=1;
  for(let x=40;x<boW;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,boH);ctx.stroke();}
  // Plate
  const FLOOR=boH-52;
  ctx.fillStyle="#C8A878"; ctx.strokeStyle="#A08858"; ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(boW/2,FLOOR+26,BO_BASE/2+18,14,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle="#D8B888";ctx.beginPath();ctx.ellipse(boW/2,FLOOR+22,BO_BASE/2+16,11,0,0,Math.PI*2);ctx.fill();
  // Layers
  boLayers.forEach((l,i)=>boDrawLayer(ctx,l.x,l.y,l.w,BO_LH,BO_COLS[l.ci%BO_COLS.length],i===boLayers.length-1));
  if(boState==="playing"&&boMoving){
    const ty=boLayers[boLayers.length-1].y-BO_LH;
    boDrawLayer(ctx,boMoving.x,ty,boMoving.w,BO_LH,BO_COLS[boMoving.ci%BO_COLS.length],false);
    const top=boLayers[boLayers.length-1];
    ctx.strokeStyle="rgba(107,39,55,.12)";ctx.lineWidth=1;ctx.setLineDash([3,4]);
    ctx.beginPath();ctx.moveTo(top.x,ty-2);ctx.lineTo(top.x,ty-16);ctx.stroke();
    ctx.beginPath();ctx.moveTo(top.x+top.w,ty-2);ctx.lineTo(top.x+top.w,ty-16);ctx.stroke();
    ctx.setLineDash([]);
  }
  boParts.forEach(p=>{ctx.globalAlpha=p.a;ctx.fillStyle=p.f;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});
  ctx.globalAlpha=1;
  if(boScore>=8&&boLayers.length>=2){
    const top=boLayers[boLayers.length-1];
    ctx.font=Math.round(boW*.045)+"px serif";ctx.textAlign="center";
    ctx.fillText("💍",top.x+top.w/2,top.y-18);
  }
}

function boDrawLayer(ctx,x,y,w,h,col,top){
  if(w<=0)return;
  ctx.fillStyle=col.f;ctx.strokeStyle=col.s;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.roundRect(x,y,w,h,top?[5,5,2,2]:2);ctx.fill();ctx.stroke();
  ctx.fillStyle="#FFF8F4";ctx.beginPath();ctx.roundRect(x+2,y+1,w-4,7,[3,3,0,0]);ctx.fill();
  if(w>36){ctx.fillStyle=col.s;const sp=Math.min(26,w/4);for(let fx=x+sp;fx<x+w-7;fx+=sp){ctx.beginPath();ctx.arc(fx,y+h/2+3,1.8,0,Math.PI*2);ctx.fill();}}
}

document.addEventListener("DOMContentLoaded",()=>{
  const bc=document.getElementById("bolo-canvas");
  if(!bc)return;
  bc.addEventListener("click",()=>boAction());
  bc.addEventListener("touchend",e=>{e.preventDefault();boAction();},{passive:false});
});
document.addEventListener("keydown",e=>{
  if(document.getElementById("arena-bolo")?.style.display==="none")return;
  if(e.key===" "){e.preventDefault();boAction();}
});

/* ══════════════════════════════════════════════════════════
   PEGA OS DOCINHOS
══════════════════════════════════════════════════════════ */
let dcCtx=null, dcW=0, dcH=0, dcFloor=0;
let dcRaf=null, dcState="idle", dcScore=0, dcTime=0;
let dcItems=[], dcPopups=[], dcBasket={x:0}, dcMouseX=0;
let dcLastTs=0, dcSpawnT=0, dcSecT=0;
const DC_BW=70, DC_BH=26;
const DC_DOCES=[{e:"🍫",p:2},{e:"🧁",p:3},{e:"🍬",p:3},{e:"🥐",p:2},{e:"🍡",p:4},{e:"🍩",p:2},{e:"✨",p:5}];
const DC_BAD=[{e:"🧾",p:-3},{e:"👵",p:-2},{e:"🥂",p:-1},{e:"😤",p:-3}];

function resetDocinhos(){
  pararDocinhos();
  const canvas=document.getElementById("docinhos-canvas"); if(!canvas) return;
  const W=canvas.parentElement.clientWidth||440;
  dcW=Math.min(W,440); dcH=Math.round(dcW*1.1);
  dcCtx=setupCanvas("docinhos-canvas",dcW,dcH); if(!dcCtx) return;
  dcFloor=dcH-18;
  dcScore=0;dcTime=45;dcItems=[];dcPopups=[];dcBasket={x:dcW/2-DC_BW/2};dcMouseX=dcW/2;
  dcSpawnT=0;dcSecT=0;dcLastTs=0;dcState="start";
  const sc=document.getElementById("docinhos-score");if(sc)sc.textContent="0 pts";
  const tm=document.getElementById("docinhos-time");if(tm)tm.textContent="45s";
  const pg=document.getElementById("docinhos-postgame");if(pg)pg.style.display="none";
  dcDraw();
  showOverlay("docinhos","🍬","Pega os Docinhos","45 segundos · Salve os docinhos!",[{label:"Começar",fn:"startDocinhos()"}]);
}

function startDocinhos(){
  lockScroll();
  dcScore=0;dcTime=45;dcItems=[];dcPopups=[];dcSpawnT=0;dcSecT=0;dcLastTs=0;dcState="playing";
  const sc=document.getElementById("docinhos-score");if(sc)sc.textContent="0 pts";
  const tm=document.getElementById("docinhos-time");if(tm)tm.textContent="45s";
  const pg=document.getElementById("docinhos-postgame");if(pg)pg.style.display="none";
  hideOverlay("docinhos");
  dcRaf=requestAnimationFrame(dcLoop);
}

function pararDocinhos(){dcState="idle";if(dcRaf){cancelAnimationFrame(dcRaf);dcRaf=null;}unlockScroll();}

function dcLoop(ts){
  if(dcState!=="playing") return;
  dcRaf=requestAnimationFrame(dcLoop);
  if(!dcLastTs) dcLastTs=ts;
  const dt=Math.min(ts-dcLastTs,50); dcLastTs=ts;
  dcSecT+=dt;
  if(dcSecT>=1000){dcSecT-=1000;dcTime--;const tm=document.getElementById("docinhos-time");if(tm)tm.textContent=dcTime+"s";}
  if(dcTime<=0){
    dcState="over"; unlockScroll(); dcDraw();
    const msgs=dcScore>=50?["Pati Piva teria orgulho.","A mesa de doces está impoluta."]:
                dcScore>=30?["Você salvou a confeitaria!","Os convidados ficaram felizes."]:
                dcScore>=14?["A mesa sobreviveu.","Quase tudo salvo."]:
                            ["Os brigadeiros pediram demissão.","Tenta de novo!"];
    showOverlay("docinhos","🎉","Tempo!",`${dcScore} pts · ${msgs[0]}`,[
      {label:"Jogar de novo",fn:"startDocinhos()"},{label:"Voltar",fn:"voltarMenu()"}
    ]);
    setTimeout(()=>{const pg=document.getElementById("docinhos-postgame");if(pg)pg.style.display="block";carregarTop10("docinhos");},300);
    return;
  }
  dcSpawnT+=dt;
  const rate=Math.max(550,1350-(45-dcTime)*16);
  if(dcSpawnT>rate){
    dcSpawnT=0;
    const bad=Math.random()<.22;
    const pool=bad?DC_BAD:DC_DOCES;
    const item=pool[Math.floor(Math.random()*pool.length)];
    const spd=1.6+Math.random()*1.2+(45-dcTime)*.035;
    dcItems.push({...item,x:22+Math.random()*(dcW-44),y:-24,vy:spd,bad});
  }
  dcBasket.x+=(dcMouseX-DC_BW/2-dcBasket.x)*.2;
  dcBasket.x=Math.max(0,Math.min(dcW-DC_BW,dcBasket.x));
  const bL=dcBasket.x, bR=dcBasket.x+DC_BW, bT=dcFloor-DC_BH;
  dcItems=dcItems.filter(it=>{
    it.y+=it.vy;
    if(it.y+13>=bT&&it.y-13<dcFloor&&it.x>bL-10&&it.x<bR+10){
      dcScore+=it.p;
      const sc=document.getElementById("docinhos-score");if(sc)sc.textContent=dcScore+" pts";
      dcPopups.push({x:it.x,y:bT-10,t:(it.p>0?"+":"")+it.p,c:it.p>0?"#3A7A28":"#9B2828",a:1,vy:-1.1});
      return false;
    }
    return it.y<dcH+30;
  });
  dcPopups=dcPopups.filter(p=>{p.y+=p.vy;p.a-=.024;return p.a>0;});
  dcDraw();
}

function dcDraw(){
  const ctx=dcCtx; if(!ctx) return;
  ctx.fillStyle="#F8F4EE"; ctx.fillRect(0,0,dcW,dcH);
  ctx.fillStyle="#E8DFD0"; ctx.fillRect(0,dcFloor-3,dcW,dcH-dcFloor+3);
  ctx.fillStyle="#D4C8B0"; ctx.fillRect(0,dcFloor-3,dcW,3);
  const fs=Math.round(dcW*.062);
  ctx.font=fs+"px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  dcItems.forEach(it=>{
    ctx.globalAlpha=1; ctx.fillText(it.e,it.x,it.y);
    if(it.bad){ctx.fillStyle="rgba(180,50,50,.1)";ctx.beginPath();ctx.arc(it.x,it.y,fs*.6,0,Math.PI*2);ctx.fill();}
  });
  const bx=dcBasket.x, by=dcFloor-DC_BH;
  ctx.globalAlpha=.1; ctx.fillStyle="#504030";
  ctx.beginPath();ctx.ellipse(bx+DC_BW/2,dcFloor+3,DC_BW/2,5,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  const gr=ctx.createLinearGradient(bx,by,bx,by+DC_BH);
  gr.addColorStop(0,"#E8D8A8");gr.addColorStop(1,"#C8B080");
  ctx.fillStyle=gr; ctx.strokeStyle="#A89060"; ctx.lineWidth=1.2;
  ctx.beginPath();
  ctx.moveTo(bx+7,by);ctx.lineTo(bx+DC_BW-7,by);
  ctx.quadraticCurveTo(bx+DC_BW,by,bx+DC_BW,by+9);
  ctx.lineTo(bx+DC_BW-3,by+DC_BH);ctx.lineTo(bx+3,by+DC_BH);
  ctx.lineTo(bx,by+9);ctx.quadraticCurveTo(bx,by,bx+7,by);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle="rgba(255,248,220,.5)"; ctx.fillRect(bx+7,by+3,DC_BW-14,5);
  ctx.fillStyle="#A89060"; ctx.font=Math.round(dcW*.024)+"px serif";
  ctx.fillText("✿",bx+DC_BW/2,by+DC_BH/2+1);
  dcPopups.forEach(p=>{ctx.globalAlpha=p.a;ctx.fillStyle=p.c;ctx.font="bold "+Math.round(dcW*.036)+"px Georgia";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(p.t,p.x,p.y);});
  ctx.globalAlpha=1;
  if(dcTime<=10&&dcState==="playing"){ctx.fillStyle=`rgba(155,40,40,${.08+Math.sin(Date.now()/180)*.04})`;ctx.fillRect(0,0,dcW,dcH);}
}

document.addEventListener("DOMContentLoaded",()=>{
  const dc=document.getElementById("docinhos-canvas");
  if(!dc) return;
  dc.addEventListener("mousemove",e=>{const r=dc.getBoundingClientRect();dcMouseX=(e.clientX-r.left)*(dcW/r.width);});
  dc.addEventListener("touchmove",e=>{e.preventDefault();const r=dc.getBoundingClientRect();dcMouseX=(e.touches[0].clientX-r.left)*(dcW/r.width);},{passive:false});
  dc.addEventListener("touchend",e=>{e.preventDefault();if(dcState==="start"||dcState==="over")startDocinhos();},{passive:false});
  dc.addEventListener("click",()=>{if(dcState==="start"||dcState==="over")startDocinhos();});
});
document.addEventListener("keydown",e=>{
  if(document.getElementById("arena-docinhos")?.style.display==="none")return;
  if(e.key==="ArrowLeft") dcMouseX=Math.max(DC_BW/2,dcMouseX-28);
  if(e.key==="ArrowRight") dcMouseX=Math.min(dcW-DC_BW/2,dcMouseX+28);
});

/* ══════════════════════════════════════════════════════════
   MONTE O LOOK — SVG editorial com rosto real
══════════════════════════════════════════════════════════ */
let lookChar = "T";
const lookSel = {head:null,makeup:null,top:null,bottom:null,shoes:null,acc:[]};
const LOOK_VERDICTS=["Categoria: madrinha que roubou a cena inteira.","Acabou de sair de um editorial da Vogue Noivos.","Proibido sentar perto da tia conservadora.","Mais brilho que a pista de dança às 3h.","O vestido da noiva quem? Esse look é o centro.","Chegou depois dos noivos. Ninguém reclamou.","Stylist da lua de mel já mandou mensagem.","Velas apagam, look fica.","A confeiteira tirou foto do look, não do bolo.","Convidado do ano, todo ano, todo casamento."];

function makeSVGItem(content){return `<svg viewBox="0 0 72 56" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;}

const LOOK_ITEMS = {
  head:[
    {id:"crown",label:"Coroa",svg:()=>makeSVGItem(`<g transform="translate(12,8)"><polygon points="24,30 4,30 8,14 14,22 24,6 34,22 40,14 44,30" fill="#C8A030" stroke="#A07820" stroke-width="1"/><circle cx="24" cy="6" r="3" fill="#D04060"/><circle cx="8" cy="14" r="2.5" fill="#4080D0"/><circle cx="40" cy="14" r="2.5" fill="#4080D0"/></g>`)},
    {id:"hat",label:"Cartola",svg:()=>makeSVGItem(`<g transform="translate(36,28)"><rect x="-20" y="-24" width="40" height="24" rx="2" fill="#1A1A2A" stroke="#2A2A3A" stroke-width="1"/><rect x="-25" y="0" width="50" height="6" rx="3" fill="#1A1A2A" stroke="#2A2A3A" stroke-width="1"/><rect x="-14" y="-22" width="28" height="3" fill="#C8A030" opacity=".8"/></g>`)},
    {id:"tiara",label:"Tiara",svg:()=>makeSVGItem(`<g transform="translate(36,34)"><path d="M-20,0 Q-10,-18 0,-8 Q10,-18 20,0" fill="none" stroke="#C8A030" stroke-width="2.5"/><circle cx="0" cy="-8" r="4" fill="#D04060" stroke="#C8A030" stroke-width="1"/><circle cx="-10" cy="-3" r="2.5" fill="#fff" opacity=".8"/><circle cx="10" cy="-3" r="2.5" fill="#fff" opacity=".8"/><circle cx="-18" cy="0" r="2" fill="#C8A030"/><circle cx="18" cy="0" r="2" fill="#C8A030"/></g>`)},
    {id:"feathers",label:"Plumas",svg:()=>makeSVGItem(`<g transform="translate(36,32)"><path d="M0,0 Q-12,-28 -6,-38 Q0,-28 0,0" fill="#D04070" stroke="#B03050" stroke-width="1"/><path d="M0,0 Q-3,-30 5,-38 Q5,-26 0,0" fill="#E070B0" stroke="#C04090" stroke-width="1"/><path d="M0,0 Q6,-28 14,-36 Q10,-24 0,0" fill="#D04070" stroke="#B03050" stroke-width="1"/><path d="M0,0 Q15,-20 20,-30 Q13,-18 0,0" fill="#C030A0" stroke="#A01080" stroke-width="1"/></g>`)},
    {id:"veil",label:"Véu Dramático",svg:()=>makeSVGItem(`<path d="M20,8 Q36,4 52,8 L58,52 Q36,44 14,52 Z" fill="rgba(255,255,255,.22)" stroke="rgba(255,255,255,.45)" stroke-width="1"/><path d="M24,8 Q36,2 48,8" fill="none" stroke="#C8A030" stroke-width="2"/><circle cx="36" cy="8" r="3" fill="#D04060"/>`)},
    {id:"beret",label:"Boina",svg:()=>makeSVGItem(`<g transform="translate(36,30)"><ellipse cx="0" cy="-4" rx="22" ry="16" fill="#6B2040" stroke="#4A1428" stroke-width="1"/><ellipse cx="0" cy="-12" rx="14" ry="10" fill="#8B3060"/><circle cx="8" cy="-14" r="3" fill="#C8A030"/><ellipse cx="0" cy="6" rx="18" ry="4" fill="#4A1428"/></g>`)},
  ],
  makeup:[
    {id:"natural",label:"Natural",svg:()=>makeSVGItem(`<ellipse cx="36" cy="32" rx="22" ry="24" fill="#C8956A"/><path d="M26 24 Q32 20 38 24" stroke="#8A4020" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M34 24 Q40 20 46 24" stroke="#8A4020" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="28" cy="30" rx="4" ry="2" fill="rgba(220,120,100,.28)"/><ellipse cx="44" cy="30" rx="4" ry="2" fill="rgba(220,120,100,.28)"/><path d="M30 38 Q36 42 42 38" stroke="#B06050" stroke-width="1.5" fill="none" stroke-linecap="round"/>`)},
    {id:"glam",label:"Glam Dourado",svg:()=>makeSVGItem(`<ellipse cx="36" cy="32" rx="22" ry="24" fill="#C8956A"/><path d="M24 24 L37 22 L37 25 L24 26 Z" fill="rgba(200,160,40,.7)"/><path d="M35 22 L48 24 L48 26 L35 25 Z" fill="rgba(200,160,40,.7)"/><ellipse cx="25" cy="32" rx="6" ry="3" fill="rgba(230,100,80,.45)"/><ellipse cx="47" cy="32" rx="6" ry="3" fill="rgba(230,100,80,.45)"/><path d="M28 38 Q36 44 44 38" stroke="#B04040" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M24 23 Q30 18 38 23" stroke="#8A5020" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M34 23 Q42 18 50 23" stroke="#8A5020" stroke-width="1.8" fill="none" stroke-linecap="round"/>`)},
    {id:"smokey",label:"Smokey Eye",svg:()=>makeSVGItem(`<ellipse cx="36" cy="32" rx="22" ry="24" fill="#C8956A"/><path d="M22 26 L38 24 L37 30 L22 30 Z" fill="rgba(20,10,30,.82)"/><path d="M34 24 L50 26 L50 30 L35 30 Z" fill="rgba(20,10,30,.82)"/><path d="M22 24 Q30 18 39 24" stroke="#050310" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M33 24 Q41 18 52 24" stroke="#050310" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M29 38 Q36 43 43 38" stroke="#7A0818" stroke-width="2.5" fill="none" stroke-linecap="round"/>`)},
    {id:"drag",label:"Drag Completa",svg:()=>makeSVGItem(`<ellipse cx="36" cy="32" rx="22" ry="24" fill="#C8956A"/><path d="M20 26 L37 22 L37 28 L20 30 Z" fill="rgba(200,40,140,.88)"/><path d="M35 22 L52 26 L52 30 L36 28 Z" fill="rgba(200,40,140,.88)"/><path d="M20 24 Q28 14 38 22 L40 17 Q28 10 18 23 Z" fill="rgba(70,10,70,.95)"/><path d="M34 22 Q44 14 54 24 L54 21 Q44 11 33 18 Z" fill="rgba(70,10,70,.95)"/><ellipse cx="23" cy="34" rx="7" ry="3.5" fill="rgba(255,70,70,.55)"/><ellipse cx="49" cy="34" rx="7" ry="3.5" fill="rgba(255,70,70,.55)"/><path d="M26 38 Q36 46 46 38 L44 41 Q36 49 28 41 Z" fill="#B80828"/><path d="M18 22 L13 16" stroke="#C8A030" stroke-width="1.5" stroke-linecap="round"/><path d="M54 22 L59 16" stroke="#C8A030" stroke-width="1.5" stroke-linecap="round"/>`)},
    {id:"graphic",label:"Delineado Gráfico",svg:()=>makeSVGItem(`<ellipse cx="36" cy="32" rx="22" ry="24" fill="#C8956A"/><path d="M22 27 L37 25" stroke="#050510" stroke-width="4" stroke-linecap="round"/><path d="M37 25 L43 19" stroke="#050510" stroke-width="3" stroke-linecap="round"/><path d="M35 25 L50 27" stroke="#050510" stroke-width="4" stroke-linecap="round"/><path d="M35 25 L29 19" stroke="#050510" stroke-width="3" stroke-linecap="round"/><path d="M22 27 L16 23" stroke="#050510" stroke-width="3" stroke-linecap="round"/><path d="M50 27 L56 23" stroke="#050510" stroke-width="3" stroke-linecap="round"/><path d="M29 38 Q36 43 43 38" stroke="#C8A030" stroke-width="2.5" fill="none" stroke-linecap="round"/>`)},
    {id:"rouge",label:"Blush Rouge",svg:()=>makeSVGItem(`<ellipse cx="36" cy="32" rx="22" ry="24" fill="#C8956A"/><path d="M22 24 Q29 20 36 24" stroke="#7A3018" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M36 24 Q43 20 50 24" stroke="#7A3018" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="22" cy="33" rx="8" ry="4.5" fill="rgba(220,70,70,.5)" transform="rotate(-12,22,33)"/><ellipse cx="50" cy="33" rx="8" ry="4.5" fill="rgba(220,70,70,.5)" transform="rotate(12,50,33)"/><path d="M28 38 Q36 44 44 38 Q36 41 28 38 Z" fill="#C02840"/>`)},
  ],
  top:[
    {id:"blazer",label:"Blazer Paetê",svg:()=>makeSVGItem(`<g transform="translate(36,30)"><path d="M-18,22 L-18,-14 Q0,-6 18,-14 L18,22 Z" fill="#2A1A40" stroke="#1A0A30" stroke-width="1"/><path d="M-18,-14 L0,0 L0,22 L-18,22 Z" fill="#3A2A50"/><path d="M18,-14 L0,0 L0,22 L18,22 Z" fill="#3A2A50"/><circle cx="-5" cy="6" r="2.2" fill="#C8A030"/><circle cx="-5" cy="14" r="2.2" fill="#C8A030"/><rect x="-18" y="-1" width="6" height="11" rx="1" fill="#C8A030" opacity=".45"/><rect x="12" y="-1" width="6" height="11" rx="1" fill="#C8A030" opacity=".45"/><path d="M-18,22 L-22,22 L-22,-18 L-18,-14" fill="#1A0A30" stroke="#0A0020" stroke-width="1"/><path d="M18,22 L22,22 L22,-18 L18,-14" fill="#1A0A30" stroke="#0A0020" stroke-width="1"/></g>`)},
    {id:"crop",label:"Cropped Preto",svg:()=>makeSVGItem(`<g transform="translate(36,34)"><rect x="-15" y="-19" width="30" height="19" rx="3" fill="#1A1A1A" stroke="#111" stroke-width="1"/><line x1="-15" y1="-15" x2="15" y2="-15" stroke="#333" stroke-width="1"/><path d="M-15,-19 L-22,-19 L-22,-8 L-15,-8" fill="none" stroke="#1A1A1A" stroke-width="7" stroke-linecap="round"/><path d="M15,-19 L22,-19 L22,-8 L15,-8" fill="none" stroke="#1A1A1A" stroke-width="7" stroke-linecap="round"/></g>`)},
    {id:"cape",label:"Capa de Plumas",svg:()=>makeSVGItem(`<g transform="translate(36,14)"><path d="M0,-5 Q-30,8 -26,44 Q-12,36 0,40 Q12,36 26,44 Q30,8 0,-5 Z" fill="#6B0A28" stroke="#4A0818" stroke-width="1"/><path d="M-26,44 Q-16,42 -8,44 L-10,48 Q-18,46 -30,48 Z" fill="#D04070" opacity=".6"/><path d="M26,44 Q16,42 8,44 L10,48 Q18,46 30,48 Z" fill="#D04070" opacity=".6"/><path d="M0,-5 Q-7,8 0,14 Q7,8 0,-5 Z" fill="#8B1A38"/><circle cx="0" cy="-2" r="4" fill="#C8A030"/></g>`)},
    {id:"corselet",label:"Corselet",svg:()=>makeSVGItem(`<g transform="translate(36,30)"><path d="M-13,22 L-15,-12 Q-7,-18 0,-17 Q7,-18 15,-12 L13,22 Z" fill="#3A0A20" stroke="#2A0818" stroke-width="1"/><line x1="-3" y1="-17" x2="-2" y2="22" stroke="#C8A030" stroke-width="1"/><line x1="3" y1="-17" x2="2" y2="22" stroke="#C8A030" stroke-width="1"/><line x1="-9" y1="-5" x2="9" y2="-5" stroke="#C8A030" stroke-width=".8"/><line x1="-9" y1="3" x2="9" y2="3" stroke="#C8A030" stroke-width=".8"/><line x1="-9" y1="11" x2="9" y2="11" stroke="#C8A030" stroke-width=".8"/></g>`)},
    {id:"suit",label:"Terno Slim",svg:()=>makeSVGItem(`<g transform="translate(36,30)"><path d="M-18,22 L-18,-14 L0,-4 L18,-14 L18,22 Z" fill="#1A2840" stroke="#0A1830" stroke-width="1"/><path d="M-18,-14 L-8,-6 L0,-4 L0,22 L-18,22 Z" fill="#243050"/><path d="M18,-14 L8,-6 L0,-4 L0,22 L18,22 Z" fill="#243050"/><path d="M-6,-12 L-1,-6 L1,-6 L6,-12" fill="#F0E8D8" stroke="#D0C8B0" stroke-width=".5"/><circle cx="-4" cy="4" r="2" fill="#C8A030"/><circle cx="-4" cy="12" r="2" fill="#C8A030"/><path d="M-18,-14 L-22,-12 L-22,22 L-18,22" fill="#0A1830"/><path d="M18,-14 L22,-12 L22,22 L18,22" fill="#0A1830"/></g>`)},
    {id:"sheer",label:"Camisa Transparente",svg:()=>makeSVGItem(`<g transform="translate(36,30)"><path d="M-15,22 L-15,-14 L0,-8 L15,-14 L15,22 Z" fill="rgba(180,180,220,.2)" stroke="rgba(180,180,220,.5)" stroke-width="1"/><line x1="0" y1="-8" x2="0" y2="22" stroke="rgba(180,180,220,.4)" stroke-width="1"/><circle cx="-2" cy="4" r="1.5" fill="rgba(200,160,80,.8)"/><circle cx="-2" cy="12" r="1.5" fill="rgba(200,160,80,.8)"/><path d="M-15,-14 L-22,-14 L-22,10 L-15,10" fill="none" stroke="rgba(180,180,220,.5)" stroke-width="7" stroke-linecap="round"/><path d="M15,-14 L22,-14 L22,10 L15,10" fill="none" stroke="rgba(180,180,220,.5)" stroke-width="7" stroke-linecap="round"/></g>`)},
  ],
  bottom:[
    {id:"flare",label:"Calça Flare",svg:()=>makeSVGItem(`<g transform="translate(36,10)"><path d="M-11,0 L-17,46 L-27,46 L-11,0 Z" fill="#1A1A2E" stroke="#111" stroke-width="1"/><path d="M11,0 L17,46 L27,46 L11,0 Z" fill="#1A1A2E" stroke="#111" stroke-width="1"/><rect x="-11" y="0" width="22" height="14" rx="1" fill="#242438"/><rect x="-11" y="-5" width="22" height="6" rx="2" fill="#141428"/><line x1="0" y1="0" x2="0" y2="14" stroke="#C8A030" stroke-width=".8"/><circle cx="0" cy="-2" r="2" fill="#C8A030"/></g>`)},
    {id:"skirt",label:"Saia Volumosa",svg:()=>makeSVGItem(`<g transform="translate(36,12)"><path d="M-11,0 Q-34,14 -32,44 Q-14,38 0,42 Q14,38 32,44 Q34,14 11,0 Z" fill="#6B1030" stroke="#4A0820" stroke-width="1"/><rect x="-11" y="-5" width="22" height="7" rx="2" fill="#5A0828"/><path d="M-32,44 Q-18,50 0,48 Q18,50 32,44" fill="none" stroke="rgba(200,160,80,.4)" stroke-width="1.5"/></g>`)},
    {id:"palazzo",label:"Palazzo",svg:()=>makeSVGItem(`<g transform="translate(36,10)"><path d="M-11,0 L-18,46 L-7,46 L0,24 L7,46 L18,46 L11,0 Z" fill="#183040" stroke="#0E1E2A" stroke-width="1"/><rect x="-11" y="-5" width="22" height="7" rx="2" fill="#102030"/><path d="M-18,46 Q-12,48 -7,46" fill="none" stroke="#C8A030" stroke-width="1.2"/><path d="M7,46 Q12,48 18,46" fill="none" stroke="#C8A030" stroke-width="1.2"/></g>`)},
    {id:"leather",label:"Calça Couro",svg:()=>makeSVGItem(`<g transform="translate(36,10)"><path d="M-11,0 L-12,46 L-4,46 L0,26 L4,46 L12,46 L11,0 Z" fill="#181818" stroke="#0A0A0A" stroke-width="1.5"/><rect x="-11" y="-4" width="22" height="6" rx="1" fill="#101010"/><path d="M-11,8 Q0,10 11,8" fill="none" stroke="#333" stroke-width="1"/><line x1="0" y1="0" x2="0" y2="46" stroke="#282828" stroke-width="1"/><circle cx="0" cy="-1" r="2.5" fill="#C8A030"/></g>`)},
    {id:"shorts",label:"Short Brilhante",svg:()=>makeSVGItem(`<g transform="translate(36,20)"><path d="M-13,-1 L-15,30 L-3,30 L0,14 L3,30 L15,30 L13,-1 Z" fill="#2A1A40"/><rect x="-13" y="-7" width="26" height="7" rx="2" fill="#1A0A30"/><path d="M-13,-1 L13,-1 L13,-7 L-13,-7" fill="none" stroke="#C8A030" stroke-width="1.5"/><line x1="0" y1="-7" x2="0" y2="30" stroke="#C8A030" stroke-width=".5" opacity=".6"/></g>`)},
    {id:"asymskirt",label:"Saia Assimétrica",svg:()=>makeSVGItem(`<g transform="translate(36,12)"><path d="M-11,0 Q-29,8 -30,46 Q-9,40 0,42 Q15,38 28,18 Q22,6 11,0 Z" fill="#4A1060" stroke="#300A48" stroke-width="1"/><rect x="-11" y="-5" width="22" height="7" rx="2" fill="#3A0850"/><path d="M-30,46 Q-16,50 0,48" fill="none" stroke="rgba(200,160,80,.5)" stroke-width="1.5"/></g>`)},
  ],
  shoes:[
    {id:"platform",label:"Plataforma",svg:()=>makeSVGItem(`<g transform="translate(36,36)"><rect x="-17" y="-19" width="34" height="12" rx="2" fill="#1A0A20"/><path d="M-17,-7 L-17,0 L17,0 L17,-7" fill="#3A1A40" stroke="#2A0A30" stroke-width="1"/><rect x="-17" y="0" width="34" height="7" rx="1" fill="#C8A030"/><path d="M-7,-19 L-7,-28 L7,-28 L7,-19" fill="#1A0A20" stroke="#0A0010" stroke-width="1"/></g>`)},
    {id:"boot",label:"Bota Over",svg:()=>makeSVGItem(`<g transform="translate(36,16)"><rect x="-12" y="0" width="24" height="28" rx="3" fill="#1A1A2A" stroke="#111" stroke-width="1"/><path d="M-12,28 L-14,40 L14,40 L12,28 Z" fill="#141422"/><rect x="-10" y="4" width="6" height="4" rx="1" fill="#C8A030" opacity=".7"/><line x1="-10" y1="11" x2="-4" y2="11" stroke="#C8A030" stroke-width=".9" opacity=".7"/><line x1="-10" y1="17" x2="-4" y2="17" stroke="#C8A030" stroke-width=".9" opacity=".7"/><line x1="-10" y1="23" x2="-4" y2="23" stroke="#C8A030" stroke-width=".9" opacity=".7"/></g>`)},
    {id:"loafer",label:"Mocassim Fashionista",svg:()=>makeSVGItem(`<g transform="translate(36,36)"><path d="M-20,-7 Q-20,-16 -8,-17 L12,-17 Q22,-17 22,-7 L22,0 L-20,0 Z" fill="#3A2810" stroke="#2A1808" stroke-width="1"/><rect x="-20" y="0" width="42" height="6" rx="1" fill="#2A1808"/><path d="M-4,-13 L4,-13 L4,-9 L-4,-9 Z" fill="#C8A030"/><path d="M4,-11 L10,-11" stroke="#C8A030" stroke-width="1.5"/></g>`)},
    {id:"strappy",label:"Sandália Joia",svg:()=>makeSVGItem(`<g transform="translate(36,32)"><path d="M-18,-3 L-16,16 L16,16 L18,-3" fill="none" stroke="#C8A030" stroke-width="2"/><rect x="-18" y="16" width="36" height="6" rx="1" fill="#C8A030" opacity=".6"/><path d="M-18,-3 L-8,-14" stroke="#C8A030" stroke-width="2"/><path d="M18,-3 L8,-14" stroke="#C8A030" stroke-width="2"/><path d="M-8,-14 L8,-14" stroke="#C8A030" stroke-width="2"/><circle cx="-12" cy="-9" r="2.2" fill="#D04060"/><circle cx="12" cy="-9" r="2.2" fill="#D04060"/></g>`)},
    {id:"sneaker",label:"Tênis Chunky",svg:()=>makeSVGItem(`<g transform="translate(36,34)"><path d="M-20,-10 Q-20,-20 -6,-22 L16,-20 Q22,-17 22,-9 L22,4 L-20,4 Z" fill="#E8E8E8" stroke="#CCC" stroke-width="1"/><path d="M-20,4 L22,4 L22,8 L-20,8 Z" fill="#1A1A1A"/><path d="M-4,-19 Q4,-13 14,-13" fill="none" stroke="#3060D0" stroke-width="2.5"/><circle cx="-10" cy="-5" r="2.2" fill="#3060D0"/><circle cx="-10" cy="1" r="2.2" fill="#3060D0"/></g>`)},
  ],
  acc:[
    {id:"fan",label:"Leque",svg:()=>makeSVGItem(`<g transform="translate(40,36)"><path d="M0,0 L-28,-22 Q-20,-32 -8,-27 Z" fill="#C8A030" stroke="#A07820" stroke-width="1"/><path d="M0,0 L-20,-28 Q-7,-36 3,-29 Z" fill="#D4B040" stroke="#A07820" stroke-width="1"/><path d="M0,0 L-9,-31 Q5,-37 13,-27 Z" fill="#C8A030" stroke="#A07820" stroke-width="1"/><path d="M0,0 L3,-31 Q17,-31 21,-21 Z" fill="#D4B040" stroke="#A07820" stroke-width="1"/><circle cx="0" cy="0" r="4" fill="#8A6010"/></g>`)},
    {id:"clutch",label:"Clutch",svg:()=>makeSVGItem(`<g transform="translate(14,18)"><rect x="0" y="0" width="44" height="28" rx="6" fill="#2A1A40" stroke="#1A0A30" stroke-width="1"/><rect x="6" y="4" width="32" height="20" rx="4" fill="rgba(200,160,80,.12)"/><circle cx="22" cy="14" r="4.5" fill="#C8A030"/><circle cx="22" cy="14" r="2.2" fill="#A07820"/></g>`)},
    {id:"gloves",label:"Luvas Longas",svg:()=>makeSVGItem(`<path d="M16,8 L16,50 Q10,54 6,50 L4,30 Q2,30 2,19 Q2,13 8,13 L8,8 Q8,4 12,4 Q16,4 16,8 Z" fill="#1A0A20" stroke="#0A0010" stroke-width="1"/><path d="M56,8 L56,50 Q62,54 66,50 L68,30 Q70,30 70,19 Q70,13 64,13 L64,8 Q64,4 60,4 Q56,4 56,8 Z" fill="#1A0A20" stroke="#0A0010" stroke-width="1"/>`)},
    {id:"necklace",label:"Colar Maxi",svg:()=>makeSVGItem(`<g transform="translate(36,30)"><path d="M-22,-6 Q-20,-22 0,-24 Q20,-22 22,-6" fill="none" stroke="#C8A030" stroke-width="2"/><path d="M-22,-6 Q-18,6 0,10 Q18,6 22,-6" fill="none" stroke="#C8A030" stroke-width="2"/><circle cx="0" cy="10" r="5.5" fill="#D04060" stroke="#C8A030" stroke-width="1"/><circle cx="-12" cy="4" r="3" fill="#C8A030"/><circle cx="12" cy="4" r="3" fill="#C8A030"/><circle cx="-20" cy="-5" r="2.5" fill="#C8A030"/><circle cx="20" cy="-5" r="2.5" fill="#C8A030"/></g>`)},
    {id:"bouquet",label:"Buquê Roubado",svg:()=>makeSVGItem(`<g transform="translate(36,28)"><rect x="-4" y="5" width="8" height="18" rx="2" fill="#8B6040"/><circle cx="0" cy="-1" r="9" fill="#E06090"/><circle cx="-8" cy="-3" r="7" fill="#D05080"/><circle cx="8" cy="-3" r="7" fill="#D05080"/><circle cx="-4" cy="-10" r="6" fill="#E06090"/><circle cx="4" cy="-10" r="6" fill="#C04070"/><path d="M-4,5 Q0,1 4,5" fill="none" stroke="#C8A030" stroke-width="1.2"/></g>`)},
    {id:"glass",label:"Taça de Cristal",svg:()=>makeSVGItem(`<g transform="translate(36,30)"><path d="M-8,-22 L-12,2 L12,2 L8,-22 Z" fill="rgba(200,220,255,.28)" stroke="rgba(180,200,240,.55)" stroke-width="1"/><ellipse cx="0" cy="-22" rx="8" ry="3" fill="rgba(200,220,255,.22)" stroke="rgba(180,200,240,.55)" stroke-width="1"/><rect x="-1" y="2" width="2" height="14" fill="rgba(180,200,240,.65)"/><ellipse cx="0" cy="16" rx="10" ry="3" fill="rgba(180,200,240,.3)" stroke="rgba(180,200,240,.55)" stroke-width="1"/><ellipse cx="0" cy="-26" rx="6" ry="2" fill="rgba(200,240,255,.45)"/></g>`)},
  ],
};

function initLook(){
  lookSel.head=null;lookSel.makeup=null;lookSel.top=null;lookSel.bottom=null;lookSel.shoes=null;lookSel.acc=[];
  const panels=document.getElementById("look-panels");
  if(!panels) return;
  panels.innerHTML="";
  const catNames={head:"Cabeça",makeup:"Maquiagem",top:"Parte de cima",bottom:"Parte de baixo",shoes:"Sapatos",acc:"Acessórios"};
  Object.entries(LOOK_ITEMS).forEach(([cat,items])=>{
    const sec=document.createElement("div");
    sec.innerHTML=`<div class="look-cat-label">${catNames[cat]}</div><div class="look-items-row" id="look-cat-${cat}"></div>`;
    panels.appendChild(sec);
    const row=sec.querySelector(".look-items-row");
    items.forEach(item=>{
      const div=document.createElement("div");
      div.className="look-item-btn";div.title=item.label;
      div.dataset.cat=cat;div.dataset.id=item.id;
      div.innerHTML=item.svg()+`<div class="look-item-label">${item.label}</div>`;
      div.addEventListener("click",()=>lookToggle(div,cat,item.id));
      row.appendChild(div);
    });
  });
  lookRenderChar();
}

function lookToggle(el,cat,id){
  if(cat==="acc"){
    const idx=lookSel.acc.indexOf(id);
    if(idx>=0){lookSel.acc.splice(idx,1);el.classList.remove("active");}
    else if(lookSel.acc.length<2){lookSel.acc.push(id);el.classList.add("active");}
  } else {
    const was=lookSel[cat]===id;
    document.querySelectorAll(`.look-item-btn[data-cat="${cat}"]`).forEach(b=>b.classList.remove("active"));
    lookSel[cat]=was?null:id;
    if(!was)el.classList.add("active");
  }
  lookRenderChar();
}

function setLookChar(c){
  lookChar=c;
  document.querySelectorAll(".char-pick").forEach(b=>{
    b.classList.toggle("active",(c==="T"&&b.textContent.trim()==="Tiago")||(c==="G"&&b.textContent.trim()==="Gian"));
  });
  lookRenderChar();
}

function lookRenderChar(){
  const svg=document.getElementById("look-svg"); if(!svg) return;
  const skin=lookChar==="T"?"#C8956A":"#D4A878";
  const hair=lookChar==="T"?"#1A0E08":"#2A1808";
  const topItem=lookSel.top?LOOK_ITEMS.top.find(i=>i.id===lookSel.top):null;
  const botItem=lookSel.bottom?LOOK_ITEMS.bottom.find(i=>i.id===lookSel.bottom):null;
  const shoeItem=lookSel.shoes?LOOK_ITEMS.shoes.find(i=>i.id===lookSel.shoes):null;
  const headItem=lookSel.head?LOOK_ITEMS.head.find(i=>i.id===lookSel.head):null;
  const mkItem=lookSel.makeup?LOOK_ITEMS.makeup.find(i=>i.id===lookSel.makeup):null;
  const accItems=lookSel.acc.map(id=>LOOK_ITEMS.acc.find(i=>i.id===id)).filter(Boolean);

  // Build makeup face SVG inline
  const mkSVG = mkItem ? (() => {
    const m=lookSel.makeup;
    return m==="natural"?`<path d="M82 66 Q88 62 94 66" stroke="#8A4020" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M106 66 Q112 62 118 66" stroke="#8A4020" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="84" cy="76" rx="6" ry="3" fill="rgba(220,120,100,.28)"/><ellipse cx="116" cy="76" rx="6" ry="3" fill="rgba(220,120,100,.28)"/>`:
           m==="glam"?`<path d="M80 65 L96 63 L96 67 L80 68 Z" fill="rgba(200,160,40,.72)"/><path d="M104 63 L120 65 L120 68 L104 67 Z" fill="rgba(200,160,40,.72)"/><ellipse cx="82" cy="77" rx="8" ry="3.5" fill="rgba(230,100,80,.48)"/><ellipse cx="118" cy="77" rx="8" ry="3.5" fill="rgba(230,100,80,.48)"/><path d="M88 85 Q100 91 112 85" stroke="#B04040" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M79 64 Q88 58 97 64" stroke="#8A5020" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M103 64 Q112 58 121 64" stroke="#8A5020" stroke-width="2" fill="none" stroke-linecap="round"/>`:
           m==="smokey"?`<path d="M79 67 L97 64 L96 71 L79 72 Z" fill="rgba(15,8,25,.85)"/><path d="M103 64 L121 67 L121 72 L103 71 Z" fill="rgba(15,8,25,.85)"/><path d="M79 64 Q88 57 98 64" stroke="#040210" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M102 64 Q111 57 123 64" stroke="#040210" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M88 85 Q100 91 112 85" stroke="#7A0818" stroke-width="2.5" fill="none" stroke-linecap="round"/>`:
           m==="drag"?`<path d="M77 67 L97 63 L97 70 L77 72 Z" fill="rgba(200,40,140,.9)"/><path d="M103 63 L123 67 L123 72 L103 70 Z" fill="rgba(200,40,140,.9)"/><path d="M77 65 Q86 53 99 63 L102 57 Q86 47 75 64 Z" fill="rgba(65,8,65,.96)"/><path d="M101 63 Q114 53 125 65 L125 63 Q115 50 98 58 Z" fill="rgba(65,8,65,.96)"/><ellipse cx="80" cy="78" rx="9" ry="4" fill="rgba(255,60,60,.55)"/><ellipse cx="120" cy="78" rx="9" ry="4" fill="rgba(255,60,60,.55)"/><path d="M85 85 Q100 95 115 85 L113 88 Q100 99 87 88 Z" fill="#B80828"/><path d="M75 63 L68 55" stroke="#C8A030" stroke-width="1.8" stroke-linecap="round"/><path d="M125 63 L132 55" stroke="#C8A030" stroke-width="1.8" stroke-linecap="round"/>`:
           m==="graphic"?`<path d="M79 69 L97 66" stroke="#030310" stroke-width="4.5" stroke-linecap="round"/><path d="M97 66 L104 59" stroke="#030310" stroke-width="3.5" stroke-linecap="round"/><path d="M103 66 L121 69" stroke="#030310" stroke-width="4.5" stroke-linecap="round"/><path d="M103 66 L96 59" stroke="#030310" stroke-width="3.5" stroke-linecap="round"/><path d="M79 69 L71 64" stroke="#030310" stroke-width="3" stroke-linecap="round"/><path d="M121 69 L129 64" stroke="#030310" stroke-width="3" stroke-linecap="round"/><path d="M88 85 Q100 91 112 85" stroke="#C8A030" stroke-width="3" fill="none" stroke-linecap="round"/>`:
           `<path d="M80 67 Q88 61 96 67" stroke="#7A3018" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M104 67 Q112 61 120 67" stroke="#7A3018" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="80" cy="76" rx="9" ry="5" fill="rgba(220,70,70,.52)" transform="rotate(-12,80,76)"/><ellipse cx="120" cy="76" rx="9" ry="5" fill="rgba(220,70,70,.52)" transform="rotate(12,120,76)"/><path d="M86 85 Q100 92 114 85 Q100 89 86 85 Z" fill="#C02840"/>`;
  })() : `<path d="M82 66 Q88 62 94 66" stroke="${hair==='#1A0E08'?'#2A1208':'#3A1A08'}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M106 66 Q112 62 118 66" stroke="${hair==='#1A0E08'?'#2A1208':'#3A1A08'}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M90 85 Q100 90 110 85" stroke="#A06050" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;

  svg.innerHTML=`
    <defs><clipPath id="hc"><ellipse cx="100" cy="74" rx="36" ry="40"/></clipPath></defs>
    ${botItem?`<g transform="translate(-2,154) scale(1.5)">${botItem.svg()}</g>`:`<rect x="76" y="168" width="22" height="92" rx="5" fill="${skin}"/><rect x="102" y="168" width="22" height="92" rx="5" fill="${skin}"/>`}
    ${topItem?`<g transform="translate(-2,88) scale(1.5)">${topItem.svg()}</g>`:`<rect x="66" y="124" width="68" height="50" rx="7" fill="${skin}"/><rect x="42" y="128" width="22" height="42" rx="9" fill="${skin}"/><rect x="136" y="128" width="22" height="42" rx="9" fill="${skin}"/>`}
    ${shoeItem?`<g transform="translate(-2,238) scale(1.5)">${shoeItem.svg()}</g>`:`<rect x="72" y="258" width="24" height="13" rx="3" fill="#2A1A0A"/><rect x="104" y="258" width="24" height="13" rx="3" fill="#2A1A0A"/>`}
    <rect x="86" y="108" width="28" height="24" rx="4" fill="${skin}"/>
    <ellipse cx="100" cy="74" rx="36" ry="40" fill="${skin}"/>
    ${lookChar==="T"?`<ellipse cx="100" cy="46" rx="36" ry="20" fill="${hair}"/><ellipse cx="76" cy="55" rx="11" ry="16" fill="${hair}"/><ellipse cx="124" cy="55" rx="11" ry="16" fill="${hair}"/>`:`<ellipse cx="100" cy="46" rx="36" ry="18" fill="${hair}"/><path d="M64,56 Q57,74 62,88" stroke="${hair}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M136,56 Q143,74 138,88" stroke="${hair}" stroke-width="10" fill="none" stroke-linecap="round"/>`}
    <ellipse cx="88" cy="74" rx="7.5" ry="8.5" fill="#fff"/>
    <ellipse cx="112" cy="74" rx="7.5" ry="8.5" fill="#fff"/>
    <circle cx="88" cy="75" r="4.5" fill="#2A1A10"/>
    <circle cx="112" cy="75" r="4.5" fill="#2A1A10"/>
    <circle cx="90" cy="73" r="1.8" fill="#fff"/>
    <circle cx="114" cy="73" r="1.8" fill="#fff"/>
    ${mkSVG}
    ${headItem?`<g transform="translate(-5,-30) scale(1.4)">${headItem.svg()}</g>`:""}
    ${accItems.map((item,i)=>{const pos=[[2,52],[142,62]][i]||[2,52];return `<g transform="translate(${pos[0]},${pos[1]}) scale(.95)">${item.svg()}</g>`;}).join("")}
  `;
}

function lookAvaliar(){
  const total=[lookSel.head,lookSel.makeup,lookSel.top,lookSel.bottom,lookSel.shoes,...lookSel.acc].filter(Boolean).length;
  const el=document.getElementById("look-result"); if(!el) return;
  if(total<3){el.textContent="Monte mais o look antes de avaliar...";return;}
  el.textContent=LOOK_VERDICTS[Math.floor(Math.random()*LOOK_VERDICTS.length)];
}

function lookReset(){
  Object.assign(lookSel,{head:null,makeup:null,top:null,bottom:null,shoes:null,acc:[]});
  document.querySelectorAll(".look-item-btn").forEach(b=>b.classList.remove("active"));
  const el=document.getElementById("look-result");
  if(el)el.textContent="Escolha um look digno de entrar depois dos noivos.";
  lookRenderChar();
}

/* ══════════════════════════════════════════════════════════
   PLACAR
══════════════════════════════════════════════════════════ */
async function salvarScore(jogo){
  const ni=document.getElementById(jogo+"-nome");
  const me=document.getElementById(jogo+"-save-msg");
  const btn=ni?.nextElementSibling;
  const nome=(ni?.value||"").trim();
  const ptMap={flappy:flScore,bolo:boScore,docinhos:dcScore};
  const pts=ptMap[jogo]||0;
  if(!nome){if(me){me.style.color="var(--terracotta)";me.textContent="Informe seu nome.";}if(ni)ni.focus();return;}
  if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span>';}
  try{
    const r=await fetch(JOGOS_API,{method:"POST",body:JSON.stringify({action:"score",jogo,nome,pontos:pts})});
    const j=await r.json();
    if(j.sucesso){
      if(me){me.style.color="var(--sage-dark)";me.textContent="Recorde salvo! 🏆";}
      if(btn){btn.disabled=true;btn.textContent="Salvo ✓";}
      if(ni)ni.disabled=true;
      carregarTop10(jogo);
    } else throw new Error();
  } catch{
    if(btn){btn.disabled=false;btn.textContent="Salvar";}
    if(me){me.style.color="var(--terracotta)";me.textContent="Não conseguimos salvar. Tente novamente.";}
  }
}

async function carregarTop10(jogo){
  const el=document.getElementById(jogo+"-top10"); if(!el) return;
  const nomes={snake:"🏆 Top 10 — Snake",flappy:"🏆 Top 10 — Flappy Gian",bolo:"🏆 Top 10 — Empilha o Bolo",docinhos:"🏆 Top 10 — Pega os Docinhos"};
  el.innerHTML=`<h3 class="top10__title">${nomes[jogo]||"Top 10"}</h3><p class="top10__loading">Carregando…</p>`;
  try{
    const r=await fetch(`${JOGOS_API}?action=top10&jogo=${jogo}`);
    const d=await r.json();
    if(!d?.lista?.length){el.innerHTML=`<h3 class="top10__title">${nomes[jogo]}</h3><p class="top10__empty">Nenhum recorde. Seja o primeiro!</p>`;return;}
    const m=["🥇","🥈","🥉"],cs=["top10__item--gold","top10__item--silver","top10__item--bronze"];
    el.innerHTML=`<h3 class="top10__title">${nomes[jogo]}</h3><ul class="top10__list">${d.lista.map((it,i)=>`<li class="top10__item ${cs[i]||""}"><span class="top10__pos">${m[i]||(i+1)}</span><span class="top10__name">${escJ(it.nome)}</span><span class="top10__pts">${it.pontos} pts</span></li>`).join("")}</ul>`;
  } catch{el.innerHTML=`<h3 class="top10__title">${nomes[jogo]}</h3><p class="top10__empty">Não foi possível carregar.</p>`;}
}

async function carregarPreviewRecorde(){
  for(const j of["flappy","bolo","docinhos"]){
    const el=document.getElementById("record-"+j+"-preview"); if(!el) continue;
    try{
      const r=await fetch(`${JOGOS_API}?action=top10&jogo=${j}`);
      const d=await r.json();
      if(d?.lista?.length){const t=d.lista[0];el.textContent=`🥇 ${t.nome} — ${t.pontos} pts`;}
      else el.textContent="Seja o primeiro!";
    } catch{el.textContent="Placar disponível após jogar";}
  }
}

function escJ(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

carregarPreviewRecorde();

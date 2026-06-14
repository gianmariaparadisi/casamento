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
const ARENAS = ["menu","flappy","look"];

function entrarJogo(jogo) {
  ARENAS.forEach(id => {
    const el = document.getElementById("arena-" + id);
    if (el) el.style.display = "none";
  });
  const target = document.getElementById("arena-" + jogo);
  if (target) target.style.display = "block";
  window.scrollTo({ top: 0, behavior: "instant" });
  if (jogo === "flappy")   resetFlappy();
  if (jogo === "look")     initLook();
}

function voltarMenu() {
  pararFlappy();
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
  img.src = `assets/img/gianface${String(i).padStart(2,"0")}.png`;
  GIAN_FACES.push(img);
}

let imgTiagoOk = false;
const TIAGO_FACES = [];
for (let i = 1; i <= 7; i++) {
  const img = new Image();
  img.loaded = false;
  img.onload = () => { img.loaded = true; if (i === 1) imgTiagoOk = true; };
  img.src = `assets/img/tiagoface${String(i).padStart(2,"0")}.png`;
  TIAGO_FACES.push(img);
}

let flPersonagem = "gian";
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
  const _faces0 = flPersonagem === "tiago" ? TIAGO_FACES : GIAN_FACES;
  flFaceIdx = Math.floor(Math.random()*_faces0.length);
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
      const _faceArr = flPersonagem === "tiago" ? TIAGO_FACES : GIAN_FACES;
      let novoIdx; do { novoIdx = Math.floor(Math.random()*_faceArr.length); } while(novoIdx===flFaceIdx && _faceArr.length>1);
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
  const _flFaces = flPersonagem === "tiago" ? TIAGO_FACES : GIAN_FACES;
  const _flOk = flPersonagem === "tiago" ? imgTiagoOk : imgGianOk;
  const face = _flFaces[flFaceIdx];
  drawFace(ctx,face,face.loaded,-bSize/2,-bSize/2,bSize,"#B87B3E","😊");
  ctx.fillStyle="rgba(156,102,49,.65)";
  ctx.beginPath();ctx.ellipse(-7,7+Math.sin(flTick*.25)*4,11,5,.3,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function setFlappyPersonagem(p) {
  flPersonagem = p;
  document.querySelectorAll(".fl-char-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.char === p);
  });
  resetFlappy();
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
   MONTE O LOOK — SVG editorial com rosto real
══════════════════════════════════════════════════════════ */
let lookChar = "T";
const lookSel = {head:null,makeup:null,top:null,bottom:null,shoes:null,acc:[]};
const LOOK_VERDICTS=["Categoria: madrinha que roubou a cena inteira.","Acabou de sair de um editorial da Vogue Noivos.","Proibido sentar perto da tia conservadora.","Mais brilho que a pista de dança às 3h.","O vestido da noiva quem? Esse look é o centro.","Chegou depois dos noivos. Ninguém reclamou.","Stylist da lua de mel já mandou mensagem.","Velas apagam, look fica.","A confeiteira tirou foto do look, não do bolo.","Convidado do ano, todo ano, todo casamento."];


function salvarScore(jogo){
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
  for(const j of["flappy","bolo"]){
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

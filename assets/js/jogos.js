/* ═══════════════════════════════════════════════════════════
   TIAGO E GIAN — jogos.js v5
   Flappy · com faces gian/tiago grandes e goofy
═══════════════════════════════════════════════════════════ */
"use strict";

const JOGOS_API = typeof API_URL !== "undefined"
  ? API_URL
  : "https://script.google.com/macros/s/AKfycbyM4Z8xwYYEDRLaofBISOQJKKsn_tCeUuIl1wbLlQRmfjnK5E2DE94tv7HTAQvfwXQ7kg/exec";

const DPR = Math.min(window.devicePixelRatio || 1, 3);

/* ── Scroll lock: só trava o scroll, não toca em height/position ── */
let _scrollY = 0;
function lockScroll() {
  _scrollY = window.scrollY;
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";
}
function unlockScroll() {
  document.body.style.overflow = "";
  document.body.style.touchAction = "";
  window.scrollTo(0, _scrollY);
}

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

/* ══════════════════════════════════════════════════════════
   FACES — carrega gianface01-07 e tiagoface01-07
══════════════════════════════════════════════════════════ */
const GIAN_FACES = [];
const TIAGO_FACES = [];
for (let i = 1; i <= 7; i++) {
  const gi = new Image(); gi.loaded = false;
  gi.onload = () => { gi.loaded = true; };
  gi.src = `assets/img/gianface${String(i).padStart(2,"0")}.png`;
  GIAN_FACES.push(gi);

  const ti = new Image(); ti.loaded = false;
  ti.onload = () => { ti.loaded = true; };
  ti.src = `assets/img/tiagoface${String(i).padStart(2,"0")}.png`;
  TIAGO_FACES.push(ti);
}

function facesFor(personagem) {
  return personagem === "tiago" ? TIAGO_FACES : GIAN_FACES;
}
function faceOk(personagem) {
  return facesFor(personagem).some(f => f.loaded);
}

/* ══════════════════════════════════════════════════════════
   ASSETS VISUAIS — flappy, jogos em geral
══════════════════════════════════════════════════════════ */
function loadImg(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// Flappy
const FL_SKY      = loadImg("assets/img/flappy-sky-bg.png");
const FL_CLOUD    = [
  loadImg("assets/img/flappy-cloud-01.png"),
  loadImg("assets/img/flappy-cloud-02.png"),
  loadImg("assets/img/flappy-cloud-03.png"),
];
const FL_SUN      = loadImg("assets/img/flappy-sun.png");
const FL_GROUND   = loadImg("assets/img/flappy-ground-hill.png");
const FL_GRASS    = loadImg("assets/img/flappy-grass-tuft.png");
const FL_FLOWERS  = loadImg("assets/img/flappy-flowers.png");
const FL_PIPE_TOP = loadImg("assets/img/flappy-pipe-top-sage.png");
const FL_PIPE_BOT = loadImg("assets/img/flappy-pipe-bottom-sage.png");
const FL_PIPE_ALT = loadImg("assets/img/flappy-pipe-terracota.png");
const FL_BIRD_BG  = loadImg("assets/img/flappy-bird-bg.png");
const FL_BURST    = loadImg("assets/img/icon-collision-burst.png");
const FL_SPARKLE  = loadImg("assets/img/fx-sparkle-burst.png");

// Cross-game reutilizados
const FX_GOLD     = loadImg("assets/img/fx-gold-sparkles.png");
const ICON_TROPHY = loadImg("assets/img/icon-trophy.png");
const ICON_BIRD   = loadImg("assets/img/icon-bird.png");

// Offset de scroll de nuvens (parallax)
let flCloudOffsets = [0, 60, 140];


/* Desenha rosto circular — grande e goofy */
function drawFaceCircle(ctx, personagem, faceIdx, cx, cy, radius) {
  const faces = facesFor(personagem);
  const img   = faces[faceIdx % faces.length];
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  if (img && img.loaded) {
    ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = personagem === "tiago" ? "#B87B3E" : "#7A9B6E";
    ctx.fill();
    ctx.font = `${Math.round(radius * 1.1)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(personagem === "tiago" ? "😄" : "😊", cx, cy);
  }
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   NAVEGAÇÃO (Flappy está inline no jogos.html)
══════════════════════════════════════════════════════════ */
const ARENAS = ["menu","flappy"];

function entrarJogo(jogo) {
  ARENAS.forEach(id => {
    const el = document.getElementById("arena-" + id);
    if (el) el.style.display = "none";
  });
  const target = document.getElementById("arena-" + jogo);
  if (target) target.style.display = "flex";
  window.scrollTo({ top: 0, behavior: "instant" });
  if (jogo === "flappy") resetFlappy();
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
   FLAPPY GIAN / TIAGO
   - personagem selecionável
   - rosto GRANDE e goofy (radius = 32px)
   - canvas centralizado, sem scroll lock agressivo
══════════════════════════════════════════════════════════ */
let flCtx=null, flW=0, flH=0;
let flRaf=null, flAlive=false, flStarted=false, flScore=0;
let flBirdY=0, flBirdVY=0, flPipes=[], flTick=0;
let flPersonagem = "gian";
let flFaceIdx = 0;

const FL_GRAVITY=0.42, FL_FLAP=-8.5, FL_PIPE_W=58, FL_GAP=160, FL_SPD=2.8, FL_INTV=95;
const FL_BIRD_R = 32; // raio grande e goofy!

function resetFlappy() {
  flAlive=false; flStarted=false;
  if (flRaf){cancelAnimationFrame(flRaf);flRaf=null;}

  const canvas = document.getElementById("flappy-canvas");
  if (!canvas) return;

  /* Canvas ocupa toda a largura disponível */
  const wrap = canvas.parentElement;
  const W = wrap ? wrap.clientWidth : 340;
  flW = Math.min(W, 420);
  flH = Math.round(flW * 1.35);

  flCtx = setupCanvas("flappy-canvas", flW, flH);
  if (!flCtx) return;

  flScore=0; flBirdY=flH/2; flBirdVY=0; flPipes=[]; flTick=0;
  flFaceIdx = Math.floor(Math.random() * facesFor(flPersonagem).length);
  const sc=document.getElementById("flappy-score"); if(sc) sc.textContent="0";
  const pg=document.getElementById("flappy-postgame"); if(pg) pg.style.display="none";

  const nome = flPersonagem === "tiago" ? "Tiago" : "Gian";
  flDraw();
  showOverlay("flappy","🐦",`Flappy ${nome}`,`Toque para o ${nome} voar!`,[{label:"Começar",fn:"startFlappy()"}]);
}

function startFlappy() {
  flAlive=false;
  if(flRaf){cancelAnimationFrame(flRaf);flRaf=null;}
  flScore=0; flBirdY=flH/2; flBirdVY=0; flPipes=[]; flTick=0;
  flFaceIdx = Math.floor(Math.random() * facesFor(flPersonagem).length);
  const sc=document.getElementById("flappy-score"); if(sc) sc.textContent="0";
  const pg=document.getElementById("flappy-postgame"); if(pg) pg.style.display="none";
  hideOverlay("flappy");
  flAlive=true; flStarted=true;
  lockScroll();
  flRaf=requestAnimationFrame(flLoop);
}

function pararFlappy(){
  flAlive=false; flStarted=false;
  if(flRaf){cancelAnimationFrame(flRaf);flRaf=null;}
  unlockScroll();
}

window.flTap = function(){
  if(!flStarted){startFlappy();return;}
  if(flAlive)flBirdVY=FL_FLAP;
};
window.startFlappy = startFlappy;
window.voltarMenu  = voltarMenu;
window.entrarJogo  = entrarJogo;

function flLoop() {
  if(!flAlive) return;
  flRaf=requestAnimationFrame(flLoop);
  flBirdVY+=FL_GRAVITY; flBirdY+=flBirdVY; flTick++;

  if (flTick%FL_INTV===0) {
    const topH = 60 + Math.random()*(flH-FL_GAP-120);
    flPipes.push({x:flW+FL_PIPE_W, topH, scored:false});
  }
  flPipes.forEach(p=>{p.x-=FL_SPD;});
  flPipes=flPipes.filter(p=>p.x>-FL_PIPE_W-10);

  flPipes.forEach(p=>{
    if(!p.scored && p.x+FL_PIPE_W < flW*.22-FL_BIRD_R) {
      p.scored=true; flScore++;
      const sc=document.getElementById("flappy-score"); if(sc) sc.textContent=flScore;
      /* Troca a cara a cada cano — efeito goofy */
      const faces = facesFor(flPersonagem);
      let ni; do { ni=Math.floor(Math.random()*faces.length); } while(ni===flFaceIdx && faces.length>1);
      flFaceIdx=ni;
    }
  });

  const bX=flW*.22;
  if(flBirdY+FL_BIRD_R>flH-30||flBirdY-FL_BIRD_R<0) return flGameOver();
  for(const p of flPipes){
    if(bX+FL_BIRD_R>p.x && bX-FL_BIRD_R<p.x+FL_PIPE_W){
      if(flBirdY-FL_BIRD_R<p.topH || flBirdY+FL_BIRD_R>p.topH+FL_GAP) return flGameOver();
    }
  }
  flDraw();
}

function flDraw() {
  const ctx = flCtx; if (!ctx) return;
  const W = flW, H = flH;

  /* ── Fundo / céu ── */
  if (FL_SKY.complete && FL_SKY.naturalWidth > 0) {
    ctx.drawImage(FL_SKY, 0, 0, W, H * .65);
  } else {
    const sky = ctx.createLinearGradient(0,0,0,H*.65);
    sky.addColorStop(0,"#89CFF0"); sky.addColorStop(1,"#C8DDB8");
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H*.65);
  }

  /* ── Chão (cor base) ── */
  ctx.fillStyle = "#EBF0E6"; ctx.fillRect(0, H*.6, W, H*.4);

  /* ── Sol ── */
  if (FL_SUN.complete && FL_SUN.naturalWidth > 0) {
    ctx.drawImage(FL_SUN, W*.74, H*.03, W*.18, W*.18);
  }

  /* ── Nuvens com parallax ── */
  flCloudOffsets = flCloudOffsets || [0,60,140];
  if (flAlive) flCloudOffsets = flCloudOffsets.map((x,i) => (x - (0.35+i*.12)) % (W + 100));
  FL_CLOUD.forEach((img, i) => {
    const x = ((flCloudOffsets[i] + W + 100) % (W + 100)) - 50;
    const y = [H*.06, H*.04, H*.10][i];
    const sz = [90, 110, 70][i];
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x, y, sz, sz * .55);
    } else {
      ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.beginPath(); ctx.ellipse(x+sz/2, y+sz*.2, sz*.5, sz*.2, 0,0,Math.PI*2); ctx.fill();
    }
  });

  /* ── Canos com imagens ── */
  flPipes.forEach((p, pi) => {
    const useAlt = (pi % 3 === 2);
    const pipeTop = useAlt ? FL_PIPE_ALT : FL_PIPE_TOP;
    const pipeBot = useAlt ? FL_PIPE_ALT : FL_PIPE_BOT;
    const pw = FL_PIPE_W + 12; // ligeiramente mais largo para a imagem
    const px = p.x - 6;

    if (pipeTop.complete && pipeTop.naturalWidth > 0) {
      // Cano de cima: estica da borda até o fundo do cap
      ctx.drawImage(pipeTop, px, 0, pw, p.topH + 20);
    } else {
      const g = ctx.createLinearGradient(p.x,0,p.x+FL_PIPE_W,0);
      g.addColorStop(0,"#3A5035"); g.addColorStop(.4,"#7A9B6E"); g.addColorStop(1,"#3A5035");
      ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect(p.x,0,FL_PIPE_W,p.topH,4); ctx.fill();
      ctx.fillStyle="#2A3E22"; ctx.fillRect(p.x-5,p.topH-18,FL_PIPE_W+10,18);
    }

    const bY = p.topH + FL_GAP;
    if (pipeBot.complete && pipeBot.naturalWidth > 0) {
      ctx.drawImage(pipeBot, px, bY - 16, pw, H - bY + 16);
    } else {
      const g2 = ctx.createLinearGradient(p.x,0,p.x+FL_PIPE_W,0);
      g2.addColorStop(0,"#3A5035"); g2.addColorStop(.4,"#7A9B6E"); g2.addColorStop(1,"#3A5035");
      ctx.fillStyle=g2; ctx.beginPath(); ctx.roundRect(p.x,bY,FL_PIPE_W,H-bY,4); ctx.fill();
      ctx.fillStyle="#2A3E22"; ctx.fillRect(p.x-5,bY,FL_PIPE_W+10,18);
    }
  });

  /* ── Chão com imagem ── */
  if (FL_GROUND.complete && FL_GROUND.naturalWidth > 0) {
    ctx.drawImage(FL_GROUND, 0, H - 42, W, 42);
  } else {
    ctx.fillStyle="#7A9B6E"; ctx.fillRect(0,H-30,W,30);
    ctx.fillStyle="#506B45"; ctx.fillRect(0,H-30,W,5);
  }

  /* Grama e flores no chão */
  if (FL_GRASS.complete && FL_GRASS.naturalWidth > 0)
    ctx.drawImage(FL_GRASS, W*.02, H-48, 56, 22);
  if (FL_FLOWERS.complete && FL_FLOWERS.naturalWidth > 0)
    ctx.drawImage(FL_FLOWERS, W*.62, H-52, 48, 26);

  /* ── Pássaro (rosto goofy grande) ── */
  const bX = W * .22;
  ctx.save();
  ctx.translate(bX, flBirdY);
  ctx.rotate(Math.min(Math.max(flBirdVY * .04, -.5), .9));

  // Sombra
  ctx.fillStyle = "rgba(0,0,0,.12)";
  ctx.beginPath();
  ctx.ellipse(0, FL_BIRD_R*.7, FL_BIRD_R*.9, FL_BIRD_R*.25, 0, 0, Math.PI*2);
  ctx.fill();

  // Asinha
  ctx.fillStyle = flPersonagem === "tiago" ? "#C8A060" : "#90B870";
  ctx.beginPath();
  ctx.ellipse(-FL_BIRD_R*.7, FL_BIRD_R*.1, FL_BIRD_R*.45, FL_BIRD_R*.22, -.5, 0, Math.PI*2);
  ctx.fill();

  // Rosto
  drawFaceCircle(ctx, flPersonagem, flFaceIdx, 0, 0, FL_BIRD_R);

  // Biquinho
  ctx.fillStyle = "#E8901A";
  ctx.beginPath();
  ctx.moveTo(FL_BIRD_R*.7, 0);
  ctx.lineTo(FL_BIRD_R*1.1, FL_BIRD_R*.1);
  ctx.lineTo(FL_BIRD_R*.7, FL_BIRD_R*.22);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function setFlappyPersonagem(p) {
  flPersonagem = p;
  document.querySelectorAll(".fl-char-btn").forEach(b => {
    const isActive = b.dataset.char === p;
    b.style.background    = isActive ? "var(--sage)" : "var(--white)";
    b.style.color         = isActive ? "white" : "var(--sage-dark)";
    b.style.borderColor   = isActive ? "var(--sage)" : "var(--line-green)";
    b.style.fontWeight    = isActive ? "600" : "400";
  });
  const nome = p === "tiago" ? "Tiago" : "Gian";
  const title = document.getElementById("flappy-title");
  if (title) title.innerHTML = `Flappy ${nome} <img src='assets/img/icon-bird.png' alt='' style='width:1.1em;height:1.1em;object-fit:contain;vertical-align:middle'>`;
  resetFlappy();
}
window.setFlappyPersonagem = setFlappyPersonagem;

function flGameOver(){
  flAlive=false; if(flRaf){cancelAnimationFrame(flRaf);flRaf=null;}
  unlockScroll();
  flDraw();
  const nome = flPersonagem === "tiago" ? "Tiago" : "Gian";
  const msgs = flScore>=15 ? [`O ${nome} virou pombo de competição!`,"Recorde lendário."] :
               flScore>=8  ? [`O ${nome} voou bem hoje.`,"Consegue bater esse recorde?"] :
               flScore>=3  ? ["Quase...","Tenta mais uma vez!"] :
                             [`O ${nome} bateu logo de cara.`,"Cuidado com os canos!"];
  if(FL_BURST.complete && FL_BURST.naturalWidth>0){ flCtx.drawImage(FL_BURST, flW*.22-40, flBirdY-40, 80, 80); }
  showOverlay("flappy","<img src='assets/img/icon-collision-burst.png' alt='' style='width:3rem;height:3rem;object-fit:contain'>","Game Over!",`${flScore} cano${flScore!==1?"s":""} · ${msgs[0]}`,
    [{label:"Jogar de novo",fn:"startFlappy()"},{label:"Voltar",fn:"voltarMenu()"}]);
  setTimeout(()=>{
    const pg=document.getElementById("flappy-postgame"); if(pg) pg.style.display="block";
    carregarTop10("flappy");
  },300);
}

document.addEventListener("keydown",e=>{
  const arena = document.getElementById("arena-flappy");
  if(!arena || arena.style.display==="none") return;
  if([" ","ArrowUp","w","W"].includes(e.key)){e.preventDefault();flTap();}
});

document.addEventListener("DOMContentLoaded",()=>{
  const fc=document.getElementById("flappy-canvas");
  if(!fc) return;
  fc.addEventListener("touchstart",e=>{e.preventDefault();flTap();},{passive:false});
  fc.addEventListener("click",()=>flTap());
});

/* ══════════════════════════════════════════════════════════
   PLACAR
══════════════════════════════════════════════════════════ */
function salvarScore(jogo){
  const ni=document.getElementById(jogo+"-nome");
  const me=document.getElementById(jogo+"-save-msg");
  const btn=ni?.nextElementSibling;
  const nome=(ni?.value||"").trim();
  const ptMap={flappy:flScore};
  const pts=ptMap[jogo]||0;
  if(!nome){if(me){me.style.color="var(--terracotta)";me.textContent="Informe seu nome.";}if(ni)ni.focus();return;}
  if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span>';}
  fetch(JOGOS_API,{method:"POST",body:JSON.stringify({action:"score",jogo,nome,pontos:pts})})
    .then(r=>r.json()).then(j=>{
      if(j.sucesso){
        if(me){me.style.color="var(--sage-dark)";me.textContent="Recorde salvo! 🏆";}
        if(btn){btn.disabled=true;btn.textContent="Salvo ✓";}
        if(ni)ni.disabled=true;
        carregarTop10(jogo);
      } else throw new Error();
    }).catch(()=>{
      if(btn){btn.disabled=false;btn.textContent="Salvar";}
      if(me){me.style.color="var(--terracotta)";me.textContent="Não conseguimos salvar.";}
    });
}
window.salvarScore = salvarScore;

async function carregarTop10(jogo){
  const el=document.getElementById(jogo+"-top10"); if(!el) return;
  const nomes={flappy:"🏆 Top 10 — Flappy"};
  el.innerHTML=`<h3 class="top10__title">${nomes[jogo]||"Top 10"}</h3><p class="top10__loading">Carregando…</p>`;
  try{
    const r=await fetch(`${JOGOS_API}?action=top10&jogo=${jogo}`);
    const d=await r.json();
    if(!d?.lista?.length){el.innerHTML=`<h3 class="top10__title">${nomes[jogo]}</h3><p class="top10__empty">Nenhum recorde ainda!</p>`;return;}
    const m=["🥇","🥈","🥉"],cs=["top10__item--gold","top10__item--silver","top10__item--bronze"];
    el.innerHTML=`<h3 class="top10__title">${nomes[jogo]}</h3><ul class="top10__list">${d.lista.map((it,i)=>`<li class="top10__item ${cs[i]||""}"><span class="top10__pos">${m[i]||(i+1)}</span><span class="top10__name">${escJ(it.nome)}</span><span class="top10__pts">${it.pontos} pts</span></li>`).join("")}</ul>`;
  } catch{el.innerHTML=`<h3 class="top10__title">${nomes[jogo]||"Top 10"}</h3><p class="top10__empty">Não foi possível carregar.</p>`;}
}

async function carregarPreviewRecorde(){
  for(const j of["flappy"]){
    const el=document.getElementById("record-"+j+"-preview"); if(!el) continue;
    try{
      const r=await fetch(`${JOGOS_API}?action=top10&jogo=${j}`);
      const d=await r.json();
      if(d?.lista?.length){const t=d.lista[0];el.textContent=`🥇 ${t.nome} · ${t.pontos} pts`;}
      else el.textContent="Seja o primeiro!";
    } catch{el.textContent="Placar disponível";}
  }
}

function escJ(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

carregarPreviewRecorde();

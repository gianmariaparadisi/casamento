/* ═══════════════════════════════════════════════════════════
   GIAN & TIAGO — jogos.js v2
   Correções: restart limpo, imagens com onload callback
═══════════════════════════════════════════════════════════ */
"use strict";

const JOGOS_API = typeof API_URL !== "undefined"
  ? API_URL
  : "https://script.google.com/macros/s/AKfycbyYyCrT2oNLYDLcXDWq8X2b9Y0u0EbmQ7pUnpdRA3g0wZNUDtX0VTNrHq26wIngBwHn/exec";

/* ══════════════════════════════════════════════════════════
   IMAGENS — carregadas uma vez, reutilizadas sempre
══════════════════════════════════════════════════════════ */
let imgTiagoOk = false;
let imgGianOk  = false;

const IMG_TIAGO = new Image();
IMG_TIAGO.onload = () => { imgTiagoOk = true; };
IMG_TIAGO.onerror = () => { imgTiagoOk = false; };
IMG_TIAGO.src = "assets/img/tiago-face.png";

const IMG_GIAN = new Image();
IMG_GIAN.onload = () => { imgGianOk = true; };
IMG_GIAN.onerror = () => { imgGianOk = false; };
IMG_GIAN.src = "assets/img/gian-face.png";

/* Desenha cara circular — usa imagem se carregou, senão fallback emoji */
function desenharCara(ctx, img, imgOk, x, y, size, emoji, corBg) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  if (imgOk) {
    ctx.drawImage(img, x, y, size, size);
  } else {
    // Fallback: círculo colorido + emoji
    ctx.fillStyle = corBg;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.font = `${Math.round(size * 0.55)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, x + size / 2, y + size / 2);
  }
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   NAVEGAÇÃO
══════════════════════════════════════════════════════════ */
function entrarJogo(jogo) {
  document.getElementById("arena-menu").style.display   = "none";
  document.getElementById("arena-snake").style.display  = jogo === "snake"  ? "block" : "none";
  document.getElementById("arena-flappy").style.display = jogo === "flappy" ? "block" : "none";
  window.scrollTo({ top: 0, behavior: "instant" });
  if (jogo === "snake")  resetSnake();
  if (jogo === "flappy") resetFlappy();
}

function voltarMenu(jogo) {
  pararSnake();
  pararFlappy();
  document.getElementById("arena-snake").style.display   = "none";
  document.getElementById("arena-flappy").style.display  = "none";
  document.getElementById("arena-menu").style.display    = "block";
  document.getElementById("snake-postgame").style.display  = "none";
  document.getElementById("flappy-postgame").style.display = "none";
  window.scrollTo({ top: 0, behavior: "instant" });
}

/* ══════════════════════════════════════════════════════════
   SNAKE DO TIAGO
══════════════════════════════════════════════════════════ */
const SNAKE_CELL      = 24;
const SNAKE_COLS      = 20;
const SNAKE_ROWS      = 20;
const SNAKE_SPEED_INIT = 150;

let snakeRafId  = null;
let snakeScore  = 0;
let snakeDir    = { x: 1, y: 0 };
let snakeNext   = { x: 1, y: 0 };
let snakeBody   = [];
let snakeFood   = { x: 10, y: 10 };
let snakeAlive  = false;
let snakeSpeed  = SNAKE_SPEED_INIT;
let snakeLast   = 0;

function resetSnake() {
  // Para qualquer loop anterior sem misericórdia
  snakeAlive = false;
  if (snakeRafId) { cancelAnimationFrame(snakeRafId); snakeRafId = null; }

  snakeScore = 0;
  snakeSpeed = SNAKE_SPEED_INIT;
  snakeDir   = { x: 1, y: 0 };
  snakeNext  = { x: 1, y: 0 };
  snakeLast  = 0;
  snakeBody  = [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];

  const scoreEl = document.getElementById("snake-score");
  if (scoreEl) scoreEl.textContent = "0";

  const pg = document.getElementById("snake-postgame");
  if (pg) pg.style.display = "none";

  const sm = document.getElementById("snake-save-msg");
  if (sm) sm.textContent = "";

  snakeNovaComida();

  mostrarOverlay("snake", "Snake do Tiago 🐍", "Guie o Tiago pelos hambúrgueres!", [
    { label: "Começar", fn: "iniciarSnake()" }
  ]);

  desenharSnake();
}

function iniciarSnake() {
  // Se já tinha um loop rodando (restart), garante que está morto antes
  snakeAlive = false;
  if (snakeRafId) { cancelAnimationFrame(snakeRafId); snakeRafId = null; }

  // Reseta estado do jogo mas mantém overlay oculto
  snakeScore = 0;
  snakeSpeed = SNAKE_SPEED_INIT;
  snakeDir   = { x: 1, y: 0 };
  snakeNext  = { x: 1, y: 0 };
  snakeLast  = 0;
  snakeBody  = [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
  snakeNovaComida();

  const scoreEl = document.getElementById("snake-score");
  if (scoreEl) scoreEl.textContent = "0";

  const pg = document.getElementById("snake-postgame");
  if (pg) pg.style.display = "none";

  ocultarOverlay("snake");

  snakeAlive = true;
  document.getElementById("snake-canvas")?.focus();
  snakeRafId = requestAnimationFrame(snakeFrame);
}

function pararSnake() {
  snakeAlive = false;
  if (snakeRafId) { cancelAnimationFrame(snakeRafId); snakeRafId = null; }
}

function snakeFrame(ts) {
  if (!snakeAlive) return;
  snakeRafId = requestAnimationFrame(snakeFrame);

  if (!snakeLast) snakeLast = ts;
  if (ts - snakeLast < snakeSpeed) return;
  snakeLast = ts;

  snakeDir = { ...snakeNext };
  const head = { x: snakeBody[0].x + snakeDir.x, y: snakeBody[0].y + snakeDir.y };

  if (head.x < 0 || head.x >= SNAKE_COLS || head.y < 0 || head.y >= SNAKE_ROWS) {
    return snakeGameOver();
  }
  if (snakeBody.some(s => s.x === head.x && s.y === head.y)) {
    return snakeGameOver();
  }

  snakeBody.unshift(head);

  if (head.x === snakeFood.x && head.y === snakeFood.y) {
    snakeScore++;
    const scoreEl = document.getElementById("snake-score");
    if (scoreEl) scoreEl.textContent = snakeScore;
    snakeNovaComida();
    if (snakeScore % 5 === 0) snakeSpeed = Math.max(60, snakeSpeed - 12);
  } else {
    snakeBody.pop();
  }

  desenharSnake();
}

function snakeNovaComida() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * SNAKE_COLS),
      y: Math.floor(Math.random() * SNAKE_ROWS)
    };
  } while (snakeBody.some(s => s.x === pos.x && s.y === pos.y));
  snakeFood = pos;
}

function desenharSnake() {
  const canvas = document.getElementById("snake-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const C   = SNAKE_CELL;

  ctx.fillStyle = "#F0F5EC";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grade
  ctx.strokeStyle = "rgba(180,200,170,.3)";
  ctx.lineWidth = .5;
  for (let c = 0; c <= SNAKE_COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * C, 0); ctx.lineTo(c * C, canvas.height); ctx.stroke();
  }
  for (let r = 0; r <= SNAKE_ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * C); ctx.lineTo(canvas.width, r * C); ctx.stroke();
  }

  // Comida
  ctx.font = `${C - 2}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🍔", snakeFood.x * C + C / 2, snakeFood.y * C + C / 2);

  // Corpo
  snakeBody.forEach((seg, i) => {
    if (i === 0) {
      // Cabeça = cara do Tiago
      desenharCara(ctx, IMG_TIAGO, imgTiagoOk,
        seg.x * C + 1, seg.y * C + 1, C - 2,
        "😄", "#506B45");
    } else {
      const alpha = Math.max(0.35, 1 - i * 0.04);
      ctx.fillStyle = `rgba(80,107,69,${alpha})`;
      ctx.beginPath();
      ctx.roundRect(seg.x * C + 2, seg.y * C + 2, C - 4, C - 4, 4);
      ctx.fill();
    }
  });
}

function snakeGameOver() {
  snakeAlive = false;
  if (snakeRafId) { cancelAnimationFrame(snakeRafId); snakeRafId = null; }

  mostrarOverlay("snake", "Game Over! 🐍", `Pontuação: ${snakeScore} pts`, [
    { label: "Jogar de novo", fn: "iniciarSnake()" },
    { label: "Voltar",        fn: "voltarMenu('snake')" }
  ]);

  setTimeout(() => {
    const pg = document.getElementById("snake-postgame");
    if (pg) pg.style.display = "block";
    carregarTop10("snake");
  }, 300);
}

// Teclado Snake
document.addEventListener("keydown", (e) => {
  if (document.getElementById("arena-snake")?.style.display === "none") return;
  const dirs = {
    ArrowUp: { x:0,y:-1 }, ArrowDown: { x:0,y:1 },
    ArrowLeft: { x:-1,y:0 }, ArrowRight: { x:1,y:0 },
    w: { x:0,y:-1 }, s: { x:0,y:1 }, a: { x:-1,y:0 }, d: { x:1,y:0 },
    W: { x:0,y:-1 }, S: { x:0,y:1 }, A: { x:-1,y:0 }, D: { x:1,y:0 },
  };
  if (dirs[e.key]) {
    const d = dirs[e.key];
    if (d.x !== -snakeDir.x || d.y !== -snakeDir.y) snakeNext = d;
    e.preventDefault();
  }
});

function snakeDirInput(dir) {
  const dirs = {
    UP:{x:0,y:-1}, DOWN:{x:0,y:1}, LEFT:{x:-1,y:0}, RIGHT:{x:1,y:0}
  };
  const d = dirs[dir];
  if (d && (d.x !== -snakeDir.x || d.y !== -snakeDir.y)) snakeNext = d;
}

/* ══════════════════════════════════════════════════════════
   FLAPPY GIAN
══════════════════════════════════════════════════════════ */
const FW           = 480;
const FH           = 600;
const GRAVITY      = 0.45;
const FLAP_FORCE   = -9;
const PIPE_W       = 70;
const PIPE_GAP     = 160;
const PIPE_SPD     = 3;
const PIPE_INTV    = 90;

let flappyRafId   = null;
let flappyAlive   = false;
let flappyStarted = false;
let flappyScore   = 0;
let birdY         = FH / 2;
let birdVY        = 0;
let flappyPipes   = [];
let flappyTick    = 0;

function resetFlappy() {
  flappyAlive   = false;
  flappyStarted = false;
  if (flappyRafId) { cancelAnimationFrame(flappyRafId); flappyRafId = null; }

  flappyScore = 0;
  birdY       = FH / 2;
  birdVY      = 0;
  flappyPipes = [];
  flappyTick  = 0;

  const scoreEl = document.getElementById("flappy-score");
  if (scoreEl) scoreEl.textContent = "0";

  const pg = document.getElementById("flappy-postgame");
  if (pg) pg.style.display = "none";

  const sm = document.getElementById("flappy-save-msg");
  if (sm) sm.textContent = "";

  mostrarOverlay("flappy", "Flappy Gian 🐦", "Toque / espaço para voar!", [
    { label: "Começar", fn: "iniciarFlappy()" }
  ]);

  desenharFlappy();
}

function iniciarFlappy() {
  // Garante estado limpo a cada start/restart
  flappyAlive   = false;
  if (flappyRafId) { cancelAnimationFrame(flappyRafId); flappyRafId = null; }

  flappyScore = 0;
  birdY       = FH / 2;
  birdVY      = 0;
  flappyPipes = [];
  flappyTick  = 0;

  const scoreEl = document.getElementById("flappy-score");
  if (scoreEl) scoreEl.textContent = "0";

  const pg = document.getElementById("flappy-postgame");
  if (pg) pg.style.display = "none";

  ocultarOverlay("flappy");

  flappyAlive   = true;
  flappyStarted = true;
  document.getElementById("flappy-canvas")?.focus();
  flappyRafId = requestAnimationFrame(flappyLoopFn);
}

function pararFlappy() {
  flappyAlive   = false;
  flappyStarted = false;
  if (flappyRafId) { cancelAnimationFrame(flappyRafId); flappyRafId = null; }
}

function flappyTap() {
  if (!flappyStarted) { iniciarFlappy(); return; }
  if (flappyAlive) birdVY = FLAP_FORCE;
}

function flappyLoopFn() {
  if (!flappyAlive) return;
  flappyRafId = requestAnimationFrame(flappyLoopFn);

  birdVY += GRAVITY;
  birdY  += birdVY;
  flappyTick++;

  // Spawn canos
  if (flappyTick % PIPE_INTV === 0) {
    const topH = 60 + Math.random() * (FH - PIPE_GAP - 120);
    flappyPipes.push({ x: FW + PIPE_W, topH, scored: false });
  }

  flappyPipes.forEach(p => { p.x -= PIPE_SPD; });
  flappyPipes = flappyPipes.filter(p => p.x > -PIPE_W);

  // Score
  flappyPipes.forEach(p => {
    if (!p.scored && p.x + PIPE_W < 100) {
      p.scored = true;
      flappyScore++;
      const scoreEl = document.getElementById("flappy-score");
      if (scoreEl) scoreEl.textContent = flappyScore;
    }
  });

  // Colisões
  const birdR = 22;
  const birdX = 100;

  if (birdY + birdR > FH - 32 || birdY - birdR < 0) return flappyGameOver();

  for (const p of flappyPipes) {
    if (birdX + birdR > p.x && birdX - birdR < p.x + PIPE_W) {
      if (birdY - birdR < p.topH || birdY + birdR > p.topH + PIPE_GAP) {
        return flappyGameOver();
      }
    }
  }

  desenharFlappy();
}

function desenharFlappy() {
  const canvas = document.getElementById("flappy-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Céu
  const sky = ctx.createLinearGradient(0, 0, 0, FH);
  sky.addColorStop(0,   "#C8DDB8");
  sky.addColorStop(.65, "#EBF0E6");
  sky.addColorStop(1,   "#D5E8C8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FW, FH);

  // Nuvens estáticas
  ctx.fillStyle = "rgba(255,255,255,.75)";
  [[60,80,60,18],[210,110,80,14],[380,65,70,16]].forEach(([x,y,w,h]) => {
    ctx.beginPath(); ctx.ellipse(x,y,w,h,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+28,y-8,w*.65,h*.65,0,0,Math.PI*2); ctx.fill();
  });

  // Canos
  flappyPipes.forEach(p => {
    const g = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
    g.addColorStop(0,   "#506B45");
    g.addColorStop(.45, "#7A9B6E");
    g.addColorStop(1,   "#3A5035");
    ctx.fillStyle = g;
    // Cano cima
    ctx.fillRect(p.x, 0, PIPE_W, p.topH);
    ctx.fillStyle = "#3A5035";
    ctx.fillRect(p.x - 5, p.topH - 18, PIPE_W + 10, 18);
    // Cano baixo
    const botY = p.topH + PIPE_GAP;
    ctx.fillStyle = g;
    ctx.fillRect(p.x, botY, PIPE_W, FH - botY);
    ctx.fillStyle = "#3A5035";
    ctx.fillRect(p.x - 5, botY, PIPE_W + 10, 18);
  });

  // Chão
  ctx.fillStyle = "#7A9B6E";
  ctx.fillRect(0, FH - 32, FW, 32);
  ctx.fillStyle = "#506B45";
  ctx.fillRect(0, FH - 32, FW, 5);

  // Pássaro (cara do Gian) com rotação
  const birdX   = 100;
  const birdSize = 44;
  ctx.save();
  ctx.translate(birdX, birdY);
  ctx.rotate(Math.min(Math.max(birdVY * 0.04, -0.5), 1.0));
  desenharCara(ctx, IMG_GIAN, imgGianOk,
    -birdSize / 2, -birdSize / 2, birdSize,
    "😊", "#B87B3E");
  // Asinha animada
  ctx.fillStyle = "rgba(156,102,49,.7)";
  ctx.beginPath();
  const wingFlap = Math.sin(flappyTick * 0.25) * 5;
  ctx.ellipse(-8, 8 + wingFlap, 13, 6, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function flappyGameOver() {
  flappyAlive = false;
  if (flappyRafId) { cancelAnimationFrame(flappyRafId); flappyRafId = null; }

  mostrarOverlay("flappy", "Game Over! 🐦", `Pontuação: ${flappyScore} pts`, [
    { label: "Jogar de novo", fn: "iniciarFlappy()" },
    { label: "Voltar",        fn: "voltarMenu('flappy')" }
  ]);

  setTimeout(() => {
    const pg = document.getElementById("flappy-postgame");
    if (pg) pg.style.display = "block";
    carregarTop10("flappy");
  }, 300);
}

// Teclado Flappy
document.addEventListener("keydown", (e) => {
  if (document.getElementById("arena-flappy")?.style.display === "none") return;
  if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    e.preventDefault();
    if (!flappyStarted) { iniciarFlappy(); return; }
    if (flappyAlive) birdVY = FLAP_FORCE;
  }
});

// Touch e click no canvas Flappy
document.addEventListener("DOMContentLoaded", () => {
  const fc = document.getElementById("flappy-canvas");
  if (!fc) return;
  fc.addEventListener("touchstart", (e) => {
    e.preventDefault();
    flappyTap();
  }, { passive: false });
  fc.addEventListener("click", () => flappyTap());
});

/* ══════════════════════════════════════════════════════════
   OVERLAY HELPERS
══════════════════════════════════════════════════════════ */
function mostrarOverlay(jogo, titulo, msg, acoes) {
  const wrap = document.querySelector(`#arena-${jogo} .canvas-wrap`);
  if (!wrap) return;

  let overlay = wrap.querySelector(".overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "overlay";
    wrap.appendChild(overlay);
  }

  const icon = jogo === "snake" ? "🐍" : "🐦";
  overlay.innerHTML = `
    <div class="overlay__icon">${icon}</div>
    <div class="overlay__title">${titulo}</div>
    <div class="overlay__score">${msg}</div>
    <div class="overlay__actions">
      ${acoes.map(a => `<button class="btn btn--primary" onclick="${a.fn}">${a.label}</button>`).join("")}
    </div>`;
  overlay.classList.remove("hidden");
}

function ocultarOverlay(jogo) {
  const overlay = document.querySelector(`#arena-${jogo} .overlay`);
  if (overlay) overlay.classList.add("hidden");
}

/* ══════════════════════════════════════════════════════════
   PLACAR
══════════════════════════════════════════════════════════ */
async function salvarScore(jogo) {
  const nomeInput = document.getElementById(`${jogo}-nome`);
  const msgEl     = document.getElementById(`${jogo}-save-msg`);
  const btn       = nomeInput?.nextElementSibling;
  const nome      = (nomeInput?.value || "").trim();
  const pontos    = jogo === "snake" ? snakeScore : flappyScore;

  if (!nome) {
    msgEl.style.color = "var(--terracotta)";
    msgEl.textContent = "Informe seu nome para salvar.";
    nomeInput?.focus();
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }

  try {
    const resp = await fetch(JOGOS_API, {
      method: "POST",
      body: JSON.stringify({ action: "score", jogo, nome, pontos })
    });
    const json = await resp.json();

    if (json.sucesso) {
      msgEl.style.color = "var(--sage-dark)";
      msgEl.textContent = "Recorde salvo! 🏆";
      if (btn) { btn.disabled = true; btn.textContent = "Salvo ✓"; }
      if (nomeInput) nomeInput.disabled = true;
      carregarTop10(jogo);
    } else { throw new Error(json.erro); }
  } catch {
    if (btn) { btn.disabled = false; btn.textContent = "Salvar"; }
    msgEl.style.color = "var(--terracotta)";
    msgEl.textContent = "Não conseguimos salvar. Tente novamente.";
  }
}

async function carregarTop10(jogo) {
  const container = document.getElementById(`${jogo}-top10`);
  if (!container) return;

  const titulo = jogo === "snake" ? "🏆 Top 10 — Snake" : "🏆 Top 10 — Flappy Gian";
  container.innerHTML = `<h3 class="top10__title">${titulo}</h3><p class="top10__loading">Carregando…</p>`;

  try {
    const resp  = await fetch(`${JOGOS_API}?action=top10&jogo=${jogo}`);
    const dados = await resp.json();

    if (!dados?.lista?.length) {
      container.innerHTML = `<h3 class="top10__title">${titulo}</h3>
        <p class="top10__empty">Nenhum recorde ainda. Seja o primeiro!</p>`;
      return;
    }

    const medalhas = ["🥇","🥈","🥉"];
    const classes  = ["top10__item--gold","top10__item--silver","top10__item--bronze"];

    const itens = dados.lista.map((item, i) => `
      <li class="top10__item ${classes[i] || ""}">
        <span class="top10__pos">${medalhas[i] || (i + 1)}</span>
        <span class="top10__name">${escHtmlJ(item.nome)}</span>
        <span class="top10__pts">${item.pontos} pts</span>
      </li>`).join("");

    container.innerHTML = `<h3 class="top10__title">${titulo}</h3>
      <ul class="top10__list">${itens}</ul>`;

  } catch {
    container.innerHTML = `<h3 class="top10__title">${titulo}</h3>
      <p class="top10__empty">Não foi possível carregar o placar.</p>`;
  }
}

async function carregarPreviewRecorde() {
  for (const jogo of ["snake","flappy"]) {
    const el = document.getElementById(`record-${jogo}-preview`);
    if (!el) continue;
    try {
      const resp  = await fetch(`${JOGOS_API}?action=top10&jogo=${jogo}`);
      const dados = await resp.json();
      if (dados?.lista?.length) {
        const top = dados.lista[0];
        el.textContent = `🥇 Recorde: ${top.nome} — ${top.pontos} pts`;
      } else {
        el.textContent = "Seja o primeiro a pontuar!";
      }
    } catch {
      el.textContent = "Placar disponível após jogar";
    }
  }
}

function escHtmlJ(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

carregarPreviewRecorde();

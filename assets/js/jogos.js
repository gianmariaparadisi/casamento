/* ═══════════════════════════════════════════════════════════
   GIAN & TIAGO — jogos.js
   Snake do Tiago + Flappy Gian
   Placar salvo via Apps Script → Google Sheets (aba PLACAR)
═══════════════════════════════════════════════════════════ */
"use strict";

const JOGOS_API = typeof API_URL !== "undefined"
  ? API_URL
  : "https://script.google.com/macros/s/AKfycbyYyCrT2oNLYDLcXDWq8X2b9Y0u0EbmQ7pUnpdRA3g0wZNUDtX0VTNrHq26wIngBwHn/exec";

/* ══════════════════════════════════════════════════════════
   NAVEGAÇÃO ENTRE ARENAS
══════════════════════════════════════════════════════════ */
function entrarJogo(jogo) {
  document.getElementById("arena-menu").style.display   = "none";
  document.getElementById("arena-snake").style.display  = jogo === "snake"  ? "block" : "none";
  document.getElementById("arena-flappy").style.display = jogo === "flappy" ? "block" : "none";
  window.scrollTo({ top: 0, behavior: "instant" });

  if (jogo === "snake")  { resetSnake();  }
  if (jogo === "flappy") { resetFlappy(); }
}

function voltarMenu(jogo) {
  if (jogo === "snake")  { pararSnake();  }
  if (jogo === "flappy") { pararFlappy(); }
  document.getElementById("arena-snake").style.display  = "none";
  document.getElementById("arena-flappy").style.display = "none";
  document.getElementById("arena-menu").style.display   = "block";
  document.getElementById("snake-postgame").style.display  = "none";
  document.getElementById("flappy-postgame").style.display = "none";
  window.scrollTo({ top: 0, behavior: "instant" });
}

/* ══════════════════════════════════════════════════════════
   IMAGENS DAS CARAS
══════════════════════════════════════════════════════════ */
const IMG_TIAGO = new Image();
IMG_TIAGO.src = "assets/img/tiago-face.png";

const IMG_GIAN = new Image();
IMG_GIAN.src = "assets/img/gian-face.png";

/* helper: desenha cara ou fallback colorido */
function desenharCara(ctx, img, x, y, size, cor) {
  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI*2);
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  } else {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI*2);
    ctx.fill();
  }
}

/* ══════════════════════════════════════════════════════════
   SNAKE DO TIAGO
══════════════════════════════════════════════════════════ */
const SNAKE_CELL  = 24;
const SNAKE_COLS  = 20; // 480 / 24
const SNAKE_ROWS  = 20;
const SNAKE_SPEED_INIT = 150; // ms por frame

let snakeLoop   = null;
let snakeScore  = 0;
let snakeDir    = { x: 1, y: 0 };
let snakeNext   = { x: 1, y: 0 };
let snakeBody   = [];
let snakeFood   = { x: 10, y: 10 };
let snakeAlive  = false;
let snakeSpeed  = SNAKE_SPEED_INIT;
let snakeLast   = 0;

function resetSnake() {
  pararSnake();
  snakeScore = 0;
  snakeDir   = { x: 1, y: 0 };
  snakeNext  = { x: 1, y: 0 };
  snakeBody  = [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
  snakeAlive = false;
  snakeSpeed = SNAKE_SPEED_INIT;
  document.getElementById("snake-score").textContent = "0";
  document.getElementById("snake-postgame").style.display = "none";
  document.getElementById("snake-save-msg").textContent = "";
  mostrarOverlay("snake", "Snake do Tiago 🐍", "Guie o Tiago pelos hambúrgueres!", [
    { label: "Começar", fn: "iniciarSnake()" }
  ]);
  snakeNovaComida();
  desenharSnake();
}

function iniciarSnake() {
  ocultarOverlay("snake");
  snakeAlive = true;
  document.getElementById("snake-canvas").focus();
  snakeLast = 0;
  requestAnimationFrame(snakeFrame);
}

function pararSnake() {
  snakeAlive = false;
  if (snakeLoop) { cancelAnimationFrame(snakeLoop); snakeLoop = null; }
}

function snakeFrame(ts) {
  if (!snakeAlive) return;
  snakeLoop = requestAnimationFrame(snakeFrame);
  if (!snakeLast) { snakeLast = ts; }
  if (ts - snakeLast < snakeSpeed) return;
  snakeLast = ts;

  // Avança direção
  snakeDir = { ...snakeNext };
  const head = { x: snakeBody[0].x + snakeDir.x, y: snakeBody[0].y + snakeDir.y };

  // Colisão com parede
  if (head.x < 0 || head.x >= SNAKE_COLS || head.y < 0 || head.y >= SNAKE_ROWS) {
    return snakeGameOver();
  }
  // Colisão com o próprio corpo
  if (snakeBody.some(s => s.x === head.x && s.y === head.y)) {
    return snakeGameOver();
  }

  snakeBody.unshift(head);

  // Comeu?
  if (head.x === snakeFood.x && head.y === snakeFood.y) {
    snakeScore++;
    document.getElementById("snake-score").textContent = snakeScore;
    snakeNovaComida();
    // Aumenta velocidade a cada 5 pontos (mínimo 60ms)
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
  const ctx    = canvas.getContext("2d");
  const C = SNAKE_CELL;

  // Fundo
  ctx.fillStyle = "#F0F5EC";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grade sutil
  ctx.strokeStyle = "rgba(180,200,170,.35)";
  ctx.lineWidth = .5;
  for (let c = 0; c <= SNAKE_COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c*C, 0); ctx.lineTo(c*C, canvas.height); ctx.stroke();
  }
  for (let r = 0; r <= SNAKE_ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r*C); ctx.lineTo(canvas.width, r*C); ctx.stroke();
  }

  // Comida (hambúrguer emoji)
  ctx.font = `${C - 4}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🍔", snakeFood.x*C + C/2, snakeFood.y*C + C/2);

  // Corpo da snake (verde)
  snakeBody.forEach((seg, i) => {
    if (i === 0) {
      // Cabeça = cara do Tiago
      desenharCara(ctx, IMG_TIAGO, seg.x*C + 1, seg.y*C + 1, C - 2, "#506B45");
    } else {
      // Corpo com gradiente verde
      const alpha = Math.max(0.4, 1 - i * 0.04);
      ctx.fillStyle = `rgba(80,107,69,${alpha})`;
      ctx.beginPath();
      ctx.roundRect(seg.x*C + 2, seg.y*C + 2, C - 4, C - 4, 4);
      ctx.fill();
    }
  });
}

function snakeGameOver() {
  snakeAlive = false;
  mostrarOverlay("snake", "Game Over!", `Pontuação: ${snakeScore}`, [
    { label: "Jogar de novo", fn: "iniciarSnake()" },
    { label: "Voltar", fn: "voltarMenu('snake')" }
  ]);
  setTimeout(() => {
    document.getElementById("snake-postgame").style.display = "block";
    carregarTop10("snake");
  }, 400);
}

// Controles teclado
document.addEventListener("keydown", (e) => {
  const arena = document.getElementById("arena-snake");
  if (!arena || arena.style.display === "none") return;
  const mapa = {
    ArrowUp:    { x: 0,  y: -1 },
    ArrowDown:  { x: 0,  y: 1  },
    ArrowLeft:  { x: -1, y: 0  },
    ArrowRight: { x: 1,  y: 0  },
    w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
    s: { x: 0, y:  1 }, S: { x: 0, y:  1 },
    a: { x: -1,y:  0 }, A: { x: -1,y:  0 },
    d: { x: 1, y:  0 }, D: { x: 1, y:  0 },
  };
  if (mapa[e.key]) {
    const d = mapa[e.key];
    // Impede inverter direção
    if (d.x !== -snakeDir.x || d.y !== -snakeDir.y) snakeNext = d;
    e.preventDefault();
  }
  if (e.key === " " && !snakeAlive) iniciarSnake();
});

function snakeDirInput(dir) {
  const mapa = {
    UP:    { x: 0, y: -1 }, DOWN:  { x: 0, y: 1 },
    LEFT:  { x: -1,y:  0 }, RIGHT: { x: 1, y: 0 }
  };
  const d = mapa[dir];
  if (d && (d.x !== -snakeDir.x || d.y !== -snakeDir.y)) snakeNext = d;
}

/* ══════════════════════════════════════════════════════════
   FLAPPY GIAN
══════════════════════════════════════════════════════════ */
const FW = 480;
const FH = 600;
const GRAVITY      = 0.45;
const FLAP_FORCE   = -9;
const PIPE_WIDTH   = 70;
const PIPE_GAP     = 160;
const PIPE_SPEED   = 3;
const PIPE_INTERVAL= 90; // frames

let flappyLoop   = null;
let flappyAlive  = false;
let flappyScore  = 0;
let birdY        = FH / 2;
let birdVY       = 0;
let pipes        = [];
let flappyFrame  = 0;
let flappyStarted = false;

function resetFlappy() {
  pararFlappy();
  flappyScore   = 0;
  birdY         = FH / 2;
  birdVY        = 0;
  pipes         = [];
  flappyFrame   = 0;
  flappyAlive   = false;
  flappyStarted = false;
  document.getElementById("flappy-score").textContent = "0";
  document.getElementById("flappy-postgame").style.display = "none";
  document.getElementById("flappy-save-msg").textContent = "";
  mostrarOverlay("flappy", "Flappy Gian 🐦", "Toque / espaço para voar!", [
    { label: "Começar", fn: "iniciarFlappy()" }
  ]);
  desenharFlappy();
}

function iniciarFlappy() {
  ocultarOverlay("flappy");
  flappyAlive   = true;
  flappyStarted = true;
  document.getElementById("flappy-canvas").focus();
  flappyLoopFn();
}

function pararFlappy() {
  flappyAlive = false;
  if (flappyLoop) { cancelAnimationFrame(flappyLoop); flappyLoop = null; }
}

function flappyTap() {
  if (!flappyStarted) { iniciarFlappy(); return; }
  if (flappyAlive) birdVY = FLAP_FORCE;
}

function flappyLoopFn() {
  if (!flappyAlive) return;
  flappyLoop = requestAnimationFrame(flappyLoopFn);

  // Física
  birdVY += GRAVITY;
  birdY  += birdVY;
  flappyFrame++;

  // Spawn canos
  if (flappyFrame % PIPE_INTERVAL === 0) {
    const topH = 60 + Math.random() * (FH - PIPE_GAP - 120);
    pipes.push({ x: FW, topH, scored: false });
  }

  // Move canos
  pipes.forEach(p => { p.x -= PIPE_SPEED; });
  pipes = pipes.filter(p => p.x > -PIPE_WIDTH);

  // Score
  pipes.forEach(p => {
    if (!p.scored && p.x + PIPE_WIDTH < 100) {
      p.scored = true;
      flappyScore++;
      document.getElementById("flappy-score").textContent = flappyScore;
    }
  });

  // Colisões
  const birdR = 22;
  const birdX = 100;

  if (birdY + birdR > FH || birdY - birdR < 0) return flappyGameOver();

  for (const p of pipes) {
    if (birdX + birdR > p.x && birdX - birdR < p.x + PIPE_WIDTH) {
      if (birdY - birdR < p.topH || birdY + birdR > p.topH + PIPE_GAP) {
        return flappyGameOver();
      }
    }
  }

  desenharFlappy();
}

function desenharFlappy() {
  const canvas = document.getElementById("flappy-canvas");
  const ctx    = canvas.getContext("2d");

  // Céu gradiente
  const sky = ctx.createLinearGradient(0, 0, 0, FH);
  sky.addColorStop(0,   "#C8DDB8");
  sky.addColorStop(.6,  "#EBF0E6");
  sky.addColorStop(1,   "#D5E8C8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FW, FH);

  // Chão
  ctx.fillStyle = "#7A9B6E";
  ctx.fillRect(0, FH - 32, FW, 32);
  ctx.fillStyle = "#506B45";
  ctx.fillRect(0, FH - 32, FW, 5);

  // Nuvens decorativas (estáticas)
  ctx.fillStyle = "rgba(255,255,255,.7)";
  [[60,80,60,18],[200,120,80,14],[380,60,70,16]].forEach(([x,y,w,h]) => {
    ctx.beginPath(); ctx.ellipse(x,y,w,h,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+30,y-8,w*.7,h*.7,0,0,Math.PI*2); ctx.fill();
  });

  // Canos
  pipes.forEach(p => {
    // Cano de cima
    const pGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
    pGrad.addColorStop(0, "#506B45");
    pGrad.addColorStop(.4,"#7A9B6E");
    pGrad.addColorStop(1, "#3A5035");
    ctx.fillStyle = pGrad;
    ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topH);
    // Borda do cano
    ctx.fillStyle = "#3A5035";
    ctx.fillRect(p.x - 6, p.topH - 20, PIPE_WIDTH + 12, 20);

    // Cano de baixo
    const botY = p.topH + PIPE_GAP;
    ctx.fillStyle = pGrad;
    ctx.fillRect(p.x, botY, PIPE_WIDTH, FH - botY);
    ctx.fillStyle = "#3A5035";
    ctx.fillRect(p.x - 6, botY, PIPE_WIDTH + 12, 20);
  });

  // Pássaro (cara do Gian)
  const birdX = 100;
  const birdSize = 44;
  // Rotação conforme velocidade
  ctx.save();
  ctx.translate(birdX, birdY);
  ctx.rotate(Math.min(Math.max(birdVY * 0.04, -0.5), 1.0));
  desenharCara(ctx, IMG_GIAN, -birdSize/2, -birdSize/2, birdSize, "#B87B3E");
  // Asinha
  ctx.fillStyle = "#9C6631";
  ctx.beginPath();
  const wingFlap = Math.sin(flappyFrame * 0.25) * 5;
  ctx.ellipse(-8, 8 + wingFlap, 14, 7, 0.3, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function flappyGameOver() {
  flappyAlive = false;
  mostrarOverlay("flappy", "Game Over!", `Pontuação: ${flappyScore}`, [
    { label: "Jogar de novo", fn: "iniciarFlappy()" },
    { label: "Voltar", fn: "voltarMenu('flappy')" }
  ]);
  setTimeout(() => {
    document.getElementById("flappy-postgame").style.display = "block";
    carregarTop10("flappy");
  }, 400);
}

// Controles teclado Flappy
document.addEventListener("keydown", (e) => {
  const arena = document.getElementById("arena-flappy");
  if (!arena || arena.style.display === "none") return;
  if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    e.preventDefault();
    if (!flappyStarted) { iniciarFlappy(); return; }
    if (flappyAlive) birdVY = FLAP_FORCE;
  }
});

// Toque no canvas Flappy
document.getElementById("flappy-canvas")?.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (!flappyStarted) { iniciarFlappy(); return; }
  if (flappyAlive) birdVY = FLAP_FORCE;
}, { passive: false });

document.getElementById("flappy-canvas")?.addEventListener("click", () => {
  if (!flappyStarted) { iniciarFlappy(); return; }
  if (flappyAlive) birdVY = FLAP_FORCE;
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

  overlay.innerHTML = `
    <div class="overlay__icon">${jogo === "snake" ? "🐍" : "🐦"}</div>
    <div class="overlay__title">${titulo}</div>
    <div class="overlay__score">${msg}</div>
    <div class="overlay__actions">
      ${acoes.map(a => `<button class="btn btn--primary" onclick="${a.fn}">${a.label}</button>`).join("")}
    </div>
  `;
  overlay.classList.remove("hidden");
}

function ocultarOverlay(jogo) {
  const overlay = document.querySelector(`#arena-${jogo} .overlay`);
  if (overlay) overlay.classList.add("hidden");
}

/* ══════════════════════════════════════════════════════════
   PLACAR — SALVAR E CARREGAR
══════════════════════════════════════════════════════════ */
async function salvarScore(jogo) {
  const nomeInput = document.getElementById(`${jogo}-nome`);
  const msgEl     = document.getElementById(`${jogo}-save-msg`);
  const btn       = nomeInput.nextElementSibling;
  const nome      = (nomeInput.value || "").trim();
  const pontos    = jogo === "snake" ? snakeScore : flappyScore;

  if (!nome) {
    msgEl.style.color = "var(--terracotta)";
    msgEl.textContent = "Informe seu nome para salvar.";
    nomeInput.focus();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const resp = await fetch(JOGOS_API, {
      method: "POST",
      body: JSON.stringify({ action: "score", jogo, nome, pontos })
    });
    const json = await resp.json();

    if (json.sucesso) {
      msgEl.style.color = "var(--sage-dark)";
      msgEl.textContent = "Recorde salvo! 🏆";
      btn.disabled = true;
      btn.textContent = "Salvo ✓";
      nomeInput.disabled = true;
      carregarTop10(jogo);
    } else {
      throw new Error(json.erro);
    }
  } catch {
    btn.disabled = false;
    btn.textContent = "Salvar";
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

    if (!dados || !dados.lista || dados.lista.length === 0) {
      container.innerHTML = `
        <h3 class="top10__title">${titulo}</h3>
        <p class="top10__empty">Nenhum recorde ainda. Seja o primeiro!</p>`;
      return;
    }

    const medalhas = ["🥇","🥈","🥉"];
    const classes  = ["top10__item--gold","top10__item--silver","top10__item--bronze"];

    const itens = dados.lista.map((item, i) => {
      const cls = classes[i] || "";
      const med = medalhas[i] || (i + 1);
      return `
        <li class="top10__item ${cls}">
          <span class="top10__pos">${med}</span>
          <span class="top10__name">${escHtmlJ(item.nome)}</span>
          <span class="top10__pts">${item.pontos} pts</span>
        </li>`;
    }).join("");

    container.innerHTML = `
      <h3 class="top10__title">${titulo}</h3>
      <ul class="top10__list">${itens}</ul>`;

  } catch {
    container.innerHTML = `
      <h3 class="top10__title">${titulo}</h3>
      <p class="top10__empty">Não foi possível carregar o placar.</p>`;
  }
}

/* Carrega preview do recorde no menu */
async function carregarPreviewRecorde() {
  for (const jogo of ["snake","flappy"]) {
    try {
      const resp  = await fetch(`${JOGOS_API}?action=top10&jogo=${jogo}`);
      const dados = await resp.json();
      const el    = document.getElementById(`record-${jogo}-preview`);
      if (!el) continue;

      if (dados && dados.lista && dados.lista.length > 0) {
        const top = dados.lista[0];
        el.textContent = `🥇 Recorde: ${top.nome} — ${top.pontos} pts`;
      } else {
        el.textContent = "Sem recordes ainda — seja o primeiro!";
      }
    } catch {
      const el = document.getElementById(`record-${jogo}-preview`);
      if (el) el.textContent = "Placar disponível após jogar";
    }
  }
}

function escHtmlJ(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Inicia previews ao carregar
carregarPreviewRecorde();

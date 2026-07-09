/* ═══════════════════════════════════════════════════════════
   PIZZA DE MEMÓRIA — pizza-memory.js
   Arcade de memória visual · vanilla JS · sem dependências
   Estrutura: CONFIG, INGREDIENTS, LEVELS, PATTERNS, gameState,
   ciclo de fases, scoring, HUD, som/vibração, high score.
═══════════════════════════════════════════════════════════ */
"use strict";

/* ══════════════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════════════ */
const CONFIG = {
  TOTAL_LEVELS: 50,
  DUAL_PIZZA_LEVELS: [10, 20, 30, 40, 50], // só nesses níveis aparecem 2 pizzas
  UNLOCK_EVERY: 5, // novo ingrediente a cada N níveis
  START_LIVES: 3,
  MAX_R: 0.86,          // raio normalizado máximo (0..1) dentro da pizza
  RADIUS_PCT: 40,       // conversão de coordenada normalizada -> % de posição
  CLOSE_DIST: 0.18,     // distância normalizada considerada "perto o suficiente"
  FAR_DIST: 0.55,       // distância normalizada considerada "longe demais"
  HIGH_SCORE_KEY: "pizzaMemoriaHighScore",
  SOUND_KEY: "pizzaMemoriaSom",
};

/* ══════════════════════════════════════════════════════════
   INGREDIENTS — ordem também define ordem de desbloqueio
══════════════════════════════════════════════════════════ */
const INGREDIENTS = [
  { id: "queijo",     nome: "Queijo",      cls: "queijo" },
  { id: "pepperoni",  nome: "Pepperoni",   cls: "pepperoni" },
  { id: "azeitona",   nome: "Azeitona",    cls: "azeitona" },
  { id: "cogumelo",   nome: "Cogumelo",    cls: "cogumelo" },
  { id: "manjericao", nome: "Manjericão",  cls: "manjericao" },
  { id: "cebola",     nome: "Cebola roxa", cls: "cebola" },
  { id: "tomate",     nome: "Tomate",      cls: "tomate" },
  { id: "pimentao",   nome: "Pimentão",    cls: "pimentao" },
  { id: "milho",      nome: "Milho",       cls: "milho" },
  { id: "abacaxi",    nome: "Abacaxi",     cls: "abacaxi" },
];
const ING_BY_ID = Object.fromEntries(INGREDIENTS.map(i => [i.id, i]));

function ingredientCountForLevel(level) {
  // +1 ingrediente a cada 5 níveis, começando com 2, até os 10 disponíveis
  const count = 2 + Math.floor(level / CONFIG.UNLOCK_EVERY);
  return Math.max(2, Math.min(INGREDIENTS.length, count));
}

/* ══════════════════════════════════════════════════════════
   LEVELS — toppings por pizza / número de pizzas (calculado)
   Duas pizzas só nos níveis marcos (10, 20, 30, 40, 50).
   A quantidade de toppings cresce progressivamente com o nível;
   nos níveis de 2 pizzas, reduz um pouco por pizza para não poluir.
══════════════════════════════════════════════════════════ */
function getLevelConfig(level) {
  const isDual = CONFIG.DUAL_PIZZA_LEVELS.includes(level);
  const raw = Math.min(14, 4 + Math.floor((level - 1) / 3));
  const toppings = isDual ? Math.max(4, raw - 2) : raw;
  return { toppings, pizzas: isDual ? 2 : 1 };
}

function memorizeTimeForLevel(level) {
  const t = 5 - (level - 1) * (1.5 / (CONFIG.TOTAL_LEVELS - 1));
  return Math.max(3.5, +t.toFixed(2));
}

function buildBudgetSeconds(toppingsCount) {
  return toppingsCount * 3.5 + 12;
}

/* ══════════════════════════════════════════════════════════
   PATTERNS — 10 padrões plausíveis de distribuição
   Cada função devolve um candidato {x,y} (normalizado -1..1)
   para o i-ésimo topping de um total de `count`.
══════════════════════════════════════════════════════════ */
function rand(min, max) { return min + Math.random() * (max - min); }

const PATTERNS = {
  // 1. Círculo externo — toppings distribuídos perto da borda
  circuloExterno(i, count) {
    const ang = (i / count) * Math.PI * 2 + rand(-0.15, 0.15);
    const r = rand(0.6, 0.8);
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  },
  // 2. Centro + borda — metade no centro, metade na borda
  centroBorda(i, count) {
    const ang = rand(0, Math.PI * 2);
    const r = i % 2 === 0 ? rand(0, 0.25) : rand(0.62, 0.82);
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  },
  // 3. Metade / metade — todos de um lado (esquerdo ou direito)
  metadeMetade(i, count, ctx) {
    ctx.side = ctx.side || (Math.random() < 0.5 ? -1 : 1);
    ctx.axis = ctx.axis || (Math.random() < 0.5 ? "x" : "y");
    const ang = rand(0, Math.PI * 2);
    const r = rand(0.15, 0.78);
    let x = Math.cos(ang) * r, y = Math.sin(ang) * r;
    if (ctx.axis === "x") x = Math.abs(x) * ctx.side;
    else y = Math.abs(y) * ctx.side;
    return { x, y };
  },
  // 4. Quadrantes — cada topping cai num dos 4 quadrantes, ciclando
  quadrantes(i, count) {
    const q = i % 4;
    const sx = q === 0 || q === 3 ? -1 : 1;
    const sy = q < 2 ? -1 : 1;
    return { x: sx * rand(0.2, 0.7), y: sy * rand(0.2, 0.7) };
  },
  // 5. Diagonal — ao longo de uma diagonal com leve espalhamento
  diagonal(i, count, ctx) {
    ctx.sign = ctx.sign || (Math.random() < 0.5 ? 1 : -1);
    const t = count <= 1 ? 0 : (i / (count - 1)) * 2 - 1; // -1..1
    const base = t * 0.75;
    const jitter = rand(-0.12, 0.12);
    return { x: base + jitter, y: ctx.sign * base + jitter };
  },
  // 6. Espiral leve
  espiral(i, count) {
    const goldenAngle = 2.399963;
    const ang = i * goldenAngle;
    const r = Math.sqrt((i + 0.5) / count) * 0.78;
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  },
  // 7. Distribuição balanceada — uniforme dentro do disco
  balanceada() {
    const ang = rand(0, Math.PI * 2);
    const r = Math.sqrt(Math.random()) * 0.78;
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  },
  // 8. Agrupamentos pequenos — 2 ou 3 clusters
  agrupamentos(i, count, ctx) {
    if (!ctx.clusters) {
      const n = Math.random() < 0.5 ? 2 : 3;
      ctx.clusters = Array.from({ length: n }, () => {
        const ang = rand(0, Math.PI * 2);
        const r = rand(0.2, 0.55);
        return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
      });
    }
    const c = ctx.clusters[i % ctx.clusters.length];
    return { x: c.x + rand(-0.14, 0.14), y: c.y + rand(-0.14, 0.14) };
  },
  // 9. Pizza mais cheia no centro — densidade maior perto do meio
  cheiaCentro() {
    const ang = rand(0, Math.PI * 2);
    const r = Math.pow(Math.random(), 1.6) * 0.72;
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  },
  // 10. Ingrediente principal + secundários espalhados
  principalSecundarios(i, count) {
    if (i === 0) return { x: 0, y: 0 };
    const ang = rand(0, Math.PI * 2);
    const r = rand(0.35, 0.8);
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  },
};
const PATTERN_NAMES = Object.keys(PATTERNS);

/* ══════════════════════════════════════════════════════════
   GERAÇÃO DA PIZZA-MODELO
══════════════════════════════════════════════════════════ */
function minDistForCount(count) {
  return Math.max(0.14, 0.34 - count * 0.012);
}

// Gera `count` posições dentro do disco, respeitando distância mínima
function generatePositions(patternName, count) {
  const gen = PATTERNS[patternName];
  const minDist = minDistForCount(count);
  const ctx = {};
  const points = [];
  for (let i = 0; i < count; i++) {
    let best = null, bestScore = -1;
    for (let tries = 0; tries < 24; tries++) {
      const p = gen(i, count, ctx);
      // garante que o ponto fica dentro do raio máximo
      const d0 = Math.hypot(p.x, p.y);
      if (d0 > CONFIG.MAX_R) {
        const k = CONFIG.MAX_R / (d0 || 1);
        p.x *= k; p.y *= k;
      }
      const nearest = points.reduce((min, q) => Math.min(min, Math.hypot(p.x - q.x, p.y - q.y)), Infinity);
      if (nearest >= minDist) { best = p; break; }
      if (nearest > bestScore) { bestScore = nearest; best = p; }
    }
    points.push(best);
  }
  return points;
}

// Escolhe tipos de ingrediente para os toppings: 1 ingrediente principal
// (mais frequente) + variação entre os demais desbloqueados
function assignIngredientTypes(count, unlockedIds) {
  const pool = unlockedIds.slice();
  const main = pool[Math.floor(Math.random() * pool.length)];
  const types = [];
  const mainShare = Math.max(1, Math.round(count * rand(0.35, 0.5)));
  for (let i = 0; i < mainShare; i++) types.push(main);
  while (types.length < count) {
    const t = pool[Math.floor(Math.random() * pool.length)];
    types.push(t);
  }
  // garante ao menos 2 tipos distintos quando possível
  if (pool.length > 1 && new Set(types).size === 1) {
    types[types.length - 1] = pool.find(p => p !== main) || main;
  }
  // embaralha para não ficar previsível (principal sempre nas primeiras posições)
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types;
}

function generateTargetPizza(toppingsCount, unlockedIds, avoidPattern) {
  let pattern;
  do { pattern = PATTERN_NAMES[Math.floor(Math.random() * PATTERN_NAMES.length)]; }
  while (pattern === avoidPattern && PATTERN_NAMES.length > 1);

  const positions = generatePositions(pattern, toppingsCount);
  const types = assignIngredientTypes(toppingsCount, unlockedIds);
  const toppings = positions.map((p, i) => ({
    type: types[i],
    x: +p.x.toFixed(3),
    y: +p.y.toFixed(3),
    rot: Math.round(rand(-15, 15)),
    scale: +rand(0.92, 1.08).toFixed(2),
  }));
  return { pattern, toppings };
}

/* ══════════════════════════════════════════════════════════
   ESTADO DO JOGO
══════════════════════════════════════════════════════════ */
const gameState = {
  level: 1,
  score: 0,
  lives: CONFIG.START_LIVES,
  highScore: 0,
  unlockedCount: 2,
  phase: "start", // start | unlocking | memorize | build | result | angry | gameover | victory
  pattern: null,
  pizzas: [],       // [{target:[], player:[], boardEl, pizzaEl, toppingsEl, cloche}]
  activePizza: 0,
  selectedIngredient: null,
  usedUndoOrClear: false,
  undoStack: [],    // {pizzaIndex, toppingId}
  buildStartTime: 0,
  memorizeTimer: null,
  memorizeDeadline: 0,
  soundOn: true,
  stats: { perfeitas: 0, completas: 0, ingredientUsage: {} },
  audioCtx: null,
};

function loadHighScore() {
  const v = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || "0", 10);
  gameState.highScore = isNaN(v) ? 0 : v;
}
function saveHighScoreIfNeeded() {
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem(CONFIG.HIGH_SCORE_KEY, String(gameState.highScore));
    return true;
  }
  return false;
}

/* ══════════════════════════════════════════════════════════
   SOM (Web Audio API sintetizado) + VIBRAÇÃO
══════════════════════════════════════════════════════════ */
function getAudioCtx() {
  if (!gameState.audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) gameState.audioCtx = new AC();
  }
  return gameState.audioCtx;
}

function tone(freq, dur, type, gainStart, delay) {
  const ctx = getAudioCtx();
  if (!ctx || !gameState.soundOn) return;
  const t0 = ctx.currentTime + (delay || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(gainStart != null ? gainStart : 0.18, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SOUND_RECIPES = {
  select:      () => tone(520, 0.08, "sine"),
  place:       () => tone(700, 0.09, "triangle"),
  remove:      () => tone(320, 0.09, "triangle"),
  serve:       () => { tone(440, 0.12, "sine"); tone(660, 0.14, "sine", 0.15, 0.08); },
  excelente:   () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, "sine", 0.18, i * 0.09)); },
  bravo:       () => { tone(180, 0.3, "sawtooth", 0.16); tone(140, 0.35, "sawtooth", 0.14, 0.1); },
  desbloqueio: () => { tone(660, 0.1, "square", 0.12); tone(880, 0.14, "square", 0.12, 0.1); },
  gameover:    () => { [300, 260, 220, 180].forEach((f, i) => tone(f, 0.22, "sawtooth", 0.15, i * 0.14)); },
  vitoria:     () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, "sine", 0.18, i * 0.11)); },
};

function playSound(name) {
  const fn = SOUND_RECIPES[name];
  if (fn) fn();
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

/* ══════════════════════════════════════════════════════════
   REFERÊNCIAS DOM
══════════════════════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);
const dom = {
  stage: $("pz-stage"),
  hud: $("pz-hud"),
  hudScore: $("hud-score"),
  hudBest: $("hud-best"),
  hudStateText: $("hud-state-text"),
  hudLivesWrap: $("hud-lives-wrap"),
  hudTimerFill: $("hud-timer-fill"),
  btnSound: $("btn-sound"),
  iconSound: $("icon-sound"),
  customerAvatar: $("customer-avatar"),
  customerMouth: $("customer-mouth"),
  customerMsg: $("customer-msg"),
  pizzasWrap: $("pz-pizzas"),
  ingredientBoxes: $("ingredient-boxes"),
  actions: $("pz-actions"),
  btnUndo: $("btn-undo"),
  btnClear: $("btn-clear"),
  btnServe: $("btn-serve"),
  dragGhost: $("pz-drag-ghost"),
  ovStart: $("ov-start"),
  btnPlay: $("btn-play"),
  startBest: $("start-best"),
  ovResult: $("ov-result"),
  resultKicker: $("result-kicker"),
  resultTitle: $("result-title"),
  resultNote: $("result-note"),
  resultRingFill: $("result-ring-fill"),
  resultBreakdown: $("result-breakdown"),
  resultPoints: $("result-points"),
  btnNext: $("btn-next"),
  ovAngry: $("ov-angry"),
  angryTitle: $("angry-title"),
  angryLives: $("angry-lives"),
  btnRetry: $("btn-retry"),
  toastUnlock: $("toast-unlock"),
  toastUnlockBox: $("toast-unlock-box"),
  toastUnlockName: $("toast-unlock-name"),
  ovGameover: $("ov-gameover"),
  gameoverScore: $("gameover-score"),
  gameoverBest: $("gameover-best"),
  gameoverNewbest: $("gameover-newbest"),
  btnPlayagain: $("btn-playagain"),
  ovVictory: $("ov-victory"),
  victoryScore: $("victory-score"),
  victoryNewbest: $("victory-newbest"),
  victoryStats: $("victory-stats"),
  btnPlayagain2: $("btn-playagain2"),
  confettiLayer: $("confetti-layer"),
};

/* ══════════════════════════════════════════════════════════
   RENDER — CAIXAS DE INGREDIENTES
══════════════════════════════════════════════════════════ */
function renderIngredientBoxes() {
  dom.ingredientBoxes.innerHTML = "";
  INGREDIENTS.forEach((ing, idx) => {
    const locked = idx >= gameState.unlockedCount;
    const box = document.createElement("button");
    box.type = "button";
    box.className = "pz-ibox" + (locked ? " is-locked" : "");
    box.dataset.ing = ing.id;
    box.innerHTML = `
      <div class="pz-ibox__icon"><div class="pz-topping pz-topping--${ing.cls}" style="position:static;transform:none;width:100%;height:100%"><div class="pz-shape"></div></div></div>
      <div class="pz-ibox__name">${ing.nome}</div>
      ${locked ? '<div class="pz-ibox__lock"></div>' : ""}
    `;
    if (!locked) {
      box.addEventListener("pointerdown", (e) => startDrag(e, ing.id, box));
    }
    dom.ingredientBoxes.appendChild(box);
  });
  syncSelectedBoxUI();
}

function syncSelectedBoxUI() {
  dom.ingredientBoxes.querySelectorAll(".pz-ibox").forEach((b) => {
    b.classList.toggle("is-selected", b.dataset.ing === gameState.selectedIngredient);
  });
}

/* ══════════════════════════════════════════════════════════
   RENDER — PIZZAS / BANCADA
══════════════════════════════════════════════════════════ */
function buildPizzasDom(count) {
  dom.pizzasWrap.innerHTML = "";
  dom.pizzasWrap.className = "pz-pizzas" + (count > 1 ? " pz-pizzas--dual" : "");
  gameState.pizzas = [];
  for (let p = 0; p < count; p++) {
    const board = document.createElement("div");
    board.className = "pz-board";
    board.dataset.idx = String(p);
    board.innerHTML = `
      <div class="pz-board__wood"></div>
      <div class="pz-pizza is-empty">
        <div class="pz-pizza__sauce"></div>
        <div class="pz-pizza__cheese"></div>
        <div class="pz-pizza__toppings"></div>
      </div>
      <div class="pz-cloche pz-cloche--hidden"><div class="pz-cloche__handle"></div></div>
    `;
    dom.pizzasWrap.appendChild(board);
    const pizzaEl = board.querySelector(".pz-pizza");
    const toppingsEl = board.querySelector(".pz-pizza__toppings");
    const cloche = board.querySelector(".pz-cloche");

    pizzaEl.addEventListener("click", (e) => onPizzaClick(e, p));
    board.addEventListener("click", () => setActivePizza(p));

    gameState.pizzas.push({ target: [], player: [], boardEl: board, pizzaEl, toppingsEl, cloche });
  }
  setActivePizza(0);
}

function setActivePizza(idx) {
  gameState.activePizza = idx;
  gameState.pizzas.forEach((pz, i) => pz.boardEl.classList.toggle("is-selected", i === idx && gameState.pizzas.length > 1));
}

function toppingCoordsToPct(x, y) {
  return {
    left: 50 + x * CONFIG.RADIUS_PCT,
    top: 50 + y * CONFIG.RADIUS_PCT,
  };
}

function createToppingEl(t, opts) {
  opts = opts || {};
  const ing = ING_BY_ID[t.type];
  const el = document.createElement("div");
  el.className = `pz-topping pz-topping--${ing.cls}` + (opts.placing ? " pz-topping--placing" : "");
  const pct = toppingCoordsToPct(t.x, t.y);
  el.style.left = pct.left + "%";
  el.style.top = pct.top + "%";
  el.style.transform = `translate(-50%,-50%) rotate(${t.rot || 0}deg) scale(${t.scale || 1})`;
  el.innerHTML = '<div class="pz-shape"></div>';
  if (t.id) el.dataset.toppingId = t.id;
  return el;
}

function renderTargetPizza(pizzaIndex) {
  const pz = gameState.pizzas[pizzaIndex];
  pz.toppingsEl.innerHTML = "";
  pz.pizzaEl.classList.remove("is-empty");
  pz.target.forEach((t) => pz.toppingsEl.appendChild(createToppingEl(t)));
}

function renderPlayerPizza(pizzaIndex) {
  const pz = gameState.pizzas[pizzaIndex];
  pz.toppingsEl.innerHTML = "";
  if (pz.player.length === 0) pz.pizzaEl.classList.add("is-empty");
  else pz.pizzaEl.classList.remove("is-empty");
  pz.player.forEach((t) => {
    const el = createToppingEl(t);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      removeTopping(pizzaIndex, t.id);
    });
    pz.toppingsEl.appendChild(el);
  });
}

/* ══════════════════════════════════════════════════════════
   HUD
══════════════════════════════════════════════════════════ */
function updateHUD() {
  // O nível atual não é exibido de propósito — o jogador não deve saber em que fase está.
  dom.hudScore.textContent = String(gameState.score);
  dom.hudBest.textContent = String(gameState.highScore);
  dom.hudLivesWrap.querySelectorAll(".pz-life").forEach((life, i) => {
    life.classList.toggle("is-lost", i >= gameState.lives);
  });
}

function setHudState(text) {
  dom.hudStateText.textContent = text;
}

function setTimerFill(fraction, low) {
  dom.hudTimerFill.style.width = Math.max(0, Math.min(100, fraction * 100)) + "%";
  dom.hudTimerFill.classList.toggle("is-low", !!low);
}

/* ══════════════════════════════════════════════════════════
   CLIENTE — reações e mensagens
══════════════════════════════════════════════════════════ */
const CUSTOMER_MESSAGES = {
  waiting: ["Bem-vindo à pizzaria!", "Cliente aguardando...", "Cliente confuso."],
  memorize: ["Memorize a pizza!", "Presta atenção nos ingredientes!"],
  build: ["Agora monta igual!", "Capricha na montagem!"],
  excelente: ["Perfeita!", "Isso é arte.", "Mamma mia!", "Essa ficou linda."],
  boa: ["Boa, passou!", "Ficou bem gostosa.", "A cozinha sobreviveu."],
  neutra: ["Hmm... ficou bom.", "Quase...", "Podia caprichar mais."],
  brava: ["Isso não era o que eu pedi.", "Cadê o pepperoni?", "Eu pedi outra coisa."],
};
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function setCustomerState(state, msg) {
  dom.customerAvatar.className = "pz-customer__avatar" +
    (state === "great" ? " is-great" : state === "happy" ? " is-happy" : state === "angry" ? " is-angry" : state === "neutral" ? " is-neutral" : "");
  dom.customerMsg.textContent = msg;
}

/* ══════════════════════════════════════════════════════════
   CONFETE
══════════════════════════════════════════════════════════ */
const CONFETTI_COLORS = ["#D8503D", "#FFE38A", "#8EAD7B", "#D9B7D8", "#F3A6A6", "#C7653A", "#3F8A4C"];
function launchConfetti(amount) {
  const layer = dom.confettiLayer;
  for (let i = 0; i < amount; i++) {
    const piece = document.createElement("div");
    piece.className = "pz-confetti-piece";
    piece.style.left = rand(0, 100) + "%";
    piece.style.background = pick(CONFETTI_COLORS);
    piece.style.animationDuration = rand(1.4, 2.6) + "s";
    piece.style.animationDelay = rand(0, 0.4) + "s";
    piece.style.borderRadius = Math.random() < 0.5 ? "50%" : "2px";
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), 3200);
  }
}

/* ══════════════════════════════════════════════════════════
   CICLO DO JOGO
══════════════════════════════════════════════════════════ */
let toppingIdCounter = 1;

function initGame() {
  loadHighScore();
  gameState.soundOn = localStorage.getItem(CONFIG.SOUND_KEY) !== "off";
  dom.btnSound.classList.toggle("is-muted", !gameState.soundOn);
  dom.startBest.textContent = String(gameState.highScore);
  bindStaticEvents();
}

function bindStaticEvents() {
  dom.btnPlay.addEventListener("click", () => {
    getAudioCtx(); // desbloqueia áudio no primeiro toque
    dom.ovStart.hidden = true;
    resetRun();
  });
  dom.btnSound.addEventListener("click", () => {
    gameState.soundOn = !gameState.soundOn;
    dom.btnSound.classList.toggle("is-muted", !gameState.soundOn);
    localStorage.setItem(CONFIG.SOUND_KEY, gameState.soundOn ? "on" : "off");
  });
  dom.btnUndo.addEventListener("click", undoLast);
  dom.btnClear.addEventListener("click", clearPizza);
  dom.btnServe.addEventListener("click", servePizza);
  dom.btnNext.addEventListener("click", () => {
    dom.ovResult.hidden = true;
    advanceLevel();
  });
  dom.btnRetry.addEventListener("click", () => {
    dom.ovAngry.hidden = true;
    startLevel(gameState.level);
  });
  dom.btnPlayagain.addEventListener("click", () => { dom.ovGameover.hidden = true; resetRun(); });
  dom.btnPlayagain2.addEventListener("click", () => { dom.ovVictory.hidden = true; resetRun(); });

  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragEnd);
}

function resetRun() {
  gameState.level = 1;
  gameState.score = 0;
  gameState.lives = CONFIG.START_LIVES;
  gameState.unlockedCount = 2;
  gameState.stats = { perfeitas: 0, completas: 0, ingredientUsage: {} };
  gameState.pattern = null;
  dom.hud.hidden = false;
  updateHUD();
  startLevel(1);
}

function startLevel(level) {
  gameState.level = level;
  gameState.selectedIngredient = null;
  gameState.usedUndoOrClear = false;
  gameState.undoStack = [];
  updateHUD();

  const requiredCount = ingredientCountForLevel(level);
  if (requiredCount > gameState.unlockedCount) {
    const newIds = INGREDIENTS.slice(gameState.unlockedCount, requiredCount).map(i => i.id);
    gameState.unlockedCount = requiredCount;
    renderIngredientBoxes();
    showUnlockSequence(newIds, () => beginLevelSetup(level));
  } else {
    renderIngredientBoxes();
    beginLevelSetup(level);
  }
}

function showUnlockSequence(ids, done) {
  if (ids.length === 0) return done();
  let i = 0;
  function next() {
    if (i >= ids.length) return done();
    const id = ids[i++];
    const ing = ING_BY_ID[id];
    dom.toastUnlockBox.className = `pz-toast__box pz-topping--${ing.cls}`;
    dom.toastUnlockBox.style.cssText = "position:static;transform:none;width:34px;height:34px;border-radius:50%;";
    dom.toastUnlockBox.innerHTML = '<div class="pz-shape" style="width:100%;height:100%"></div>';
    dom.toastUnlockName.textContent = ing.nome;
    dom.toastUnlock.hidden = false;
    requestAnimationFrame(() => dom.toastUnlock.classList.add("is-visible"));
    const box = dom.ingredientBoxes.querySelector(`[data-ing="${id}"]`);
    if (box) box.classList.add("is-unlocking", "is-highlight");
    playSound("desbloqueio");
    vibrate(30);
    setTimeout(() => {
      dom.toastUnlock.classList.remove("is-visible");
      setTimeout(() => {
        dom.toastUnlock.hidden = true;
        if (box) box.classList.remove("is-unlocking", "is-highlight");
        next();
      }, 300);
    }, 1400);
  }
  next();
}

function beginLevelSetup(level) {
  const cfg = getLevelConfig(level);
  buildPizzasDom(cfg.pizzas);
  const target = generateTargetPizza(cfg.toppings, INGREDIENTS.slice(0, gameState.unlockedCount).map(i => i.id), gameState.pattern);
  gameState.pattern = target.pattern;

  // pizza 2 (quando existir) usa um padrão/ingredientes independentes
  gameState.pizzas[0].target = target.toppings.map(t => ({ ...t, id: toppingIdCounter++ }));
  if (cfg.pizzas > 1) {
    const target2 = generateTargetPizza(cfg.toppings, INGREDIENTS.slice(0, gameState.unlockedCount).map(i => i.id), target.pattern);
    gameState.pizzas[1].target = target2.toppings.map(t => ({ ...t, id: toppingIdCounter++ }));
  }
  gameState.pizzas.forEach((pz) => { pz.player = []; });

  dom.actions.hidden = true;
  showMemoryPhase();
}

/* ── FASE 1: MEMORIZAR ─────────────────────────────────── */
function showMemoryPhase() {
  gameState.phase = "memorize";
  setHudState("Memorize!");
  setCustomerState("waiting", pick(CUSTOMER_MESSAGES.memorize));
  gameState.pizzas.forEach((_, i) => {
    renderTargetPizza(i);
    gameState.pizzas[i].cloche.classList.add("pz-cloche--hidden");
  });

  const duration = memorizeTimeForLevel(gameState.level);
  gameState.memorizeDeadline = performance.now() + duration * 1000;
  clearInterval(gameState.memorizeTimer);
  gameState.memorizeTimer = setInterval(() => {
    const remain = gameState.memorizeDeadline - performance.now();
    const frac = Math.max(0, remain / (duration * 1000));
    setTimerFill(frac, frac < 0.25);
    if (remain <= 0) {
      clearInterval(gameState.memorizeTimer);
      startBuildPhase();
    }
  }, 50);
}

/* ── FASE 2: MONTAR ────────────────────────────────────── */
// A tampa aparece só como uma transição rápida (cobrindo a troca da
// pizza-modelo pela pizza vazia) e depois é levantada — ela NUNCA fica
// sobre a pizza durante a montagem, senão o jogador não consegue tocar
// nos ingredientes já colocados nem colocar novos.
function startBuildPhase() {
  gameState.phase = "covering"; // trava temporária durante a transição da tampa
  setHudState("Monte!");
  setCustomerState("waiting", pick(CUSTOMER_MESSAGES.build));
  setTimerFill(1, false);

  gameState.pizzas.forEach((pz) => {
    pz.cloche.classList.remove("pz-cloche--hidden"); // tampa desce
  });

  setTimeout(() => {
    gameState.pizzas.forEach((pz, i) => {
      pz.player = [];
      renderPlayerPizza(i);
      pz.cloche.classList.add("pz-cloche--hidden"); // tampa sobe e some
    });
    setActivePizza(0);
    dom.actions.hidden = false;
    gameState.buildStartTime = performance.now();
    gameState.phase = "build";
  }, 500);
}

/* ── SELEÇÃO / COLOCAÇÃO DE INGREDIENTES ──────────────── */
function selectIngredient(id) {
  if (gameState.phase !== "build") return;
  gameState.selectedIngredient = gameState.selectedIngredient === id ? null : id;
  syncSelectedBoxUI();
  playSound("select");
}

function onPizzaClick(e, pizzaIndex) {
  if (gameState.phase !== "build") return;
  if (e.target.closest(".pz-topping")) return; // clique num topping já tratado no próprio elemento
  setActivePizza(pizzaIndex);
  if (!gameState.selectedIngredient) return;

  const pz = gameState.pizzas[pizzaIndex];
  const rect = pz.pizzaEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const nx = (e.clientX - cx) / (rect.width / 2);
  const ny = (e.clientY - cy) / (rect.height / 2);
  placeTopping(pizzaIndex, gameState.selectedIngredient, nx, ny);
}

function clampToDisk(x, y) {
  const d = Math.hypot(x, y);
  if (d <= CONFIG.MAX_R) return { x, y };
  const k = CONFIG.MAX_R / d;
  return { x: x * k, y: y * k };
}

function placeTopping(pizzaIndex, type, nx, ny) {
  const { x, y } = clampToDisk(nx, ny);
  const t = { id: toppingIdCounter++, type, x: +x.toFixed(3), y: +y.toFixed(3), rot: Math.round(rand(-12, 12)), scale: 1 };
  gameState.pizzas[pizzaIndex].player.push(t);
  gameState.undoStack.push({ pizzaIndex, toppingId: t.id });
  gameState.stats.ingredientUsage[type] = (gameState.stats.ingredientUsage[type] || 0) + 1;
  renderPlayerPizza(pizzaIndex);
  const el = gameState.pizzas[pizzaIndex].toppingsEl.querySelector(`[data-topping-id="${t.id}"]`);
  if (el) el.classList.add("pz-topping--placing");
  playSound("place");
  vibrate(15);
}

function removeTopping(pizzaIndex, toppingId) {
  if (gameState.phase !== "build") return;
  const pz = gameState.pizzas[pizzaIndex];
  pz.player = pz.player.filter(t => t.id !== toppingId);
  gameState.undoStack = gameState.undoStack.filter(u => !(u.pizzaIndex === pizzaIndex && u.toppingId === toppingId));
  renderPlayerPizza(pizzaIndex);
  playSound("remove");
}

function undoLast() {
  if (gameState.phase !== "build" || gameState.undoStack.length === 0) return;
  const last = gameState.undoStack.pop();
  const pz = gameState.pizzas[last.pizzaIndex];
  pz.player = pz.player.filter(t => t.id !== last.toppingId);
  gameState.usedUndoOrClear = true;
  renderPlayerPizza(last.pizzaIndex);
  playSound("remove");
}

function clearPizza() {
  if (gameState.phase !== "build") return;
  const pz = gameState.pizzas[gameState.activePizza];
  if (pz.player.length === 0) return;
  const ids = new Set(pz.player.map(t => t.id));
  gameState.undoStack = gameState.undoStack.filter(u => !(u.pizzaIndex === gameState.activePizza && ids.has(u.toppingId)));
  pz.player = [];
  gameState.usedUndoOrClear = true;
  renderPlayerPizza(gameState.activePizza);
  playSound("remove");
}

/* ── ARRASTAR (drag) — pointer events, funciona em touch e mouse ──
   Um toque curto sem movimento = seleciona o ingrediente (clique).
   Um toque com movimento acima do limiar = arrasta até a pizza.   */
const DRAG_THRESHOLD = 6; // px
let dragState = null;
function startDrag(e, ingId) {
  if (gameState.phase !== "build") return;
  dragState = { ingId, startX: e.clientX, startY: e.clientY, moved: false };
}
function onDragMove(e) {
  if (!dragState) return;
  const dx = e.clientX - dragState.startX, dy = e.clientY - dragState.startY;
  if (!dragState.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    dragState.moved = true;
    const ghost = dom.dragGhost;
    const ing = ING_BY_ID[dragState.ingId];
    ghost.className = `pz-drag-ghost pz-topping pz-topping--${ing.cls}`;
    ghost.innerHTML = '<div class="pz-shape" style="width:100%;height:100%"></div>';
    ghost.hidden = false;
  }
  if (dragState.moved) {
    dom.dragGhost.style.left = e.clientX + "px";
    dom.dragGhost.style.top = e.clientY + "px";
  }
}
function onDragEnd(e) {
  if (!dragState) return;
  const { ingId, moved } = dragState;
  dragState = null;
  dom.dragGhost.hidden = true;
  if (gameState.phase !== "build") return;

  if (!moved) {
    // toque simples = seleciona/desseleciona ingrediente
    selectIngredient(ingId);
    return;
  }
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const board = el && el.closest(".pz-board");
  if (!board) return;
  const idx = parseInt(board.dataset.idx, 10);
  const pz = gameState.pizzas[idx];
  const rect = pz.pizzaEl.getBoundingClientRect();
  const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
  const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
  setActivePizza(idx);
  placeTopping(idx, ingId, nx, ny);
}

/* ══════════════════════════════════════════════════════════
   SCORING — comparação pizza-modelo x pizza do jogador
══════════════════════════════════════════════════════════ */
function positionScoreForDist(d) {
  if (d <= CONFIG.CLOSE_DIST) return 100;
  if (d >= CONFIG.FAR_DIST) return 0;
  return 100 * (1 - (d - CONFIG.CLOSE_DIST) / (CONFIG.FAR_DIST - CONFIG.CLOSE_DIST));
}

function countByType(list) {
  const m = {};
  list.forEach(t => { m[t.type] = (m[t.type] || 0) + 1; });
  return m;
}

function scorePizza(target, player, elapsedSec, budgetSec) {
  const modelTypes = new Set(target.map(t => t.type));
  const playerTypes = new Set(player.map(t => t.type));
  const unionTypes = new Set([...modelTypes, ...playerTypes]);

  // 1. ingredientes corretos (35%) — similaridade de conjuntos (Jaccard)
  let inter = 0;
  modelTypes.forEach(t => { if (playerTypes.has(t)) inter++; });
  const ingredientScore = unionTypes.size === 0 ? 100 : (inter / unionTypes.size) * 100;

  // 2. quantidade correta por ingrediente (25%)
  const cm = countByType(target), cp = countByType(player);
  let qtySum = 0, qtyN = 0;
  unionTypes.forEach(t => {
    const a = cm[t] || 0, b = cp[t] || 0;
    qtySum += 1 - Math.min(1, Math.abs(a - b) / Math.max(a, b, 1));
    qtyN++;
  });
  const quantityScore = qtyN === 0 ? 100 : (qtySum / qtyN) * 100;

  // 3. posição aproximada (30%) — casamento guloso do topping mais próximo do mesmo tipo
  const usedPlayer = new Set();
  let posSum = 0, matchedCount = 0;
  target.forEach(mt => {
    let best = null, bestD = Infinity;
    player.forEach(pt => {
      if (pt.type !== mt.type || usedPlayer.has(pt.id)) return;
      const d = Math.hypot(mt.x - pt.x, mt.y - pt.y);
      if (d < bestD) { bestD = d; best = pt; }
    });
    if (best) {
      usedPlayer.add(best.id);
      posSum += positionScoreForDist(bestD);
      matchedCount++;
    } else {
      posSum += 0;
    }
  });
  const positionScore = target.length === 0 ? 100 : posSum / target.length;

  // 4. tempo restante / eficiência (10%)
  const ratio = budgetSec > 0 ? elapsedSec / budgetSec : 1;
  let timeScore;
  if (ratio <= 0.5) timeScore = 100;
  else if (ratio >= 1.5) timeScore = 0;
  else timeScore = 100 * (1 - (ratio - 0.5) / 1.0);

  let raw = ingredientScore * 0.35 + quantityScore * 0.25 + positionScore * 0.30 + timeScore * 0.10;

  // Toppings extras (colocados sem corresponder a nenhum alvo) reduzem a nota
  const extraCount = Math.max(0, player.length - matchedCount);
  const penalty = Math.min(30, extraCount * 5);
  const nota = Math.max(0, Math.min(100, Math.round(raw - penalty)));

  return { nota, ingredientScore, quantityScore, positionScore, timeScore, extraCount };
}

/* ══════════════════════════════════════════════════════════
   SERVIR / RESULTADO
══════════════════════════════════════════════════════════ */
function servePizza() {
  if (gameState.phase !== "build") return;
  gameState.phase = "result";
  clearInterval(gameState.memorizeTimer);
  playSound("serve");
  vibrate(35);

  const elapsedSec = (performance.now() - gameState.buildStartTime) / 1000;
  const cfg = getLevelConfig(gameState.level);
  const budgetSec = buildBudgetSeconds(cfg.toppings * cfg.pizzas);

  const results = gameState.pizzas.map(pz => scorePizza(pz.target, pz.player, elapsedSec, budgetSec));
  let nota = Math.round(results.reduce((s, r) => s + r.nota, 0) / results.length);
  const minNota = Math.min(...results.map(r => r.nota));
  if (results.length > 1 && minNota < 40) nota = Math.max(0, nota - 10);

  showResult(nota, results, elapsedSec, budgetSec);
}

function showResult(nota, results, elapsedSec, budgetSec) {
  const passed = nota >= 60;
  const excelente = nota >= 90;
  const perfeita = nota >= 95;

  let pointsEarned = 0, bonusBreakdown = [];
  if (passed) {
    const base = nota * 100;
    const bonusLevel = gameState.level * 250;
    const bonusTier = perfeita ? 5000 : excelente ? 2500 : 0;
    const bonusNoUndo = gameState.usedUndoOrClear ? 0 : 500;
    const leftoverFrac = Math.max(0, Math.min(1, 1 - elapsedSec / budgetSec));
    const bonusSpeed = Math.round(leftoverFrac * 1500);
    pointsEarned = base + bonusLevel + bonusTier + bonusNoUndo + bonusSpeed;
    gameState.score += pointsEarned;
    gameState.stats.completas++;
    if (perfeita) gameState.stats.perfeitas++;

    bonusBreakdown = [
      { label: "Nota da pizza", value: base },
      { label: "Bônus de nível", value: bonusLevel },
      bonusTier ? { label: perfeita ? "Bônus perfeito" : "Bônus excelente", value: bonusTier, bonus: true } : null,
      bonusNoUndo ? { label: "Sem desfazer/limpar", value: bonusNoUndo, bonus: true } : null,
      bonusSpeed ? { label: "Bônus de velocidade", value: bonusSpeed, bonus: true } : null,
    ].filter(Boolean);
  }

  updateHUD();

  if (!passed) {
    gameState.lives--;
    updateHUD();
    playSound("bravo");
    vibrate([60, 40, 60]);
    dom.stage.classList.add("is-shaking");
    setTimeout(() => dom.stage.classList.remove("is-shaking"), 400);
    setCustomerState("angry", pick(CUSTOMER_MESSAGES.brava));
    dom.angryTitle.textContent = pick(CUSTOMER_MESSAGES.brava);
    dom.angryLives.innerHTML = Array.from({ length: CONFIG.START_LIVES })
      .map((_, i) => `<span class="pz-life${i >= gameState.lives ? " is-lost" : ""}"></span>`).join("");
    dom.actions.hidden = true;
    if (gameState.lives <= 0) {
      setTimeout(showGameOver, 900);
    } else {
      dom.ovAngry.hidden = false;
    }
    return;
  }

  // Passou de nível
  const tier = nota >= 90 ? "excelente" : nota >= 70 ? "boa" : "neutra";
  const mood = nota >= 90 ? "great" : nota >= 70 ? "happy" : "neutral";
  setCustomerState(mood, pick(CUSTOMER_MESSAGES[tier]));

  if (excelente) {
    launchConfetti(perfeita ? 60 : 34);
    gameState.pizzas.forEach(pz => pz.pizzaEl.classList.toggle("is-glow", perfeita));
    playSound("excelente");
    vibrate(perfeita ? [30, 30, 30, 30] : [40, 30]);
  }

  dom.resultKicker.textContent = perfeita ? "Perfeita!" : excelente ? "Excelente!" : nota >= 70 ? "Boa pizza!" : "Passou raspando";
  dom.resultTitle.textContent = perfeita ? "Uma obra de arte!" : excelente ? "Uau, que capricho!" : nota >= 70 ? "Ficou gostosa!" : "Quase não deu...";
  dom.resultNote.textContent = String(nota);
  const circumference = 327;
  dom.resultRingFill.style.strokeDashoffset = String(circumference * (1 - nota / 100));
  dom.resultRingFill.style.stroke = perfeita ? "#FFD54A" : excelente ? "#3F8A4C" : nota >= 70 ? "#8EAD7B" : "#C7653A";

  dom.resultBreakdown.innerHTML = bonusBreakdown.map(b =>
    `<div class="pz-score-breakdown__row"><span>${b.label}</span><strong class="${b.bonus ? "pz-score-breakdown__bonus" : ""}">${b.bonus ? "+" : ""}${b.value}</strong></div>`
  ).join("");
  dom.resultPoints.textContent = String(pointsEarned);

  dom.actions.hidden = true;
  dom.ovResult.hidden = false;

  if (gameState.level >= CONFIG.TOTAL_LEVELS) {
    dom.btnNext.textContent = "Ver resultado final";
  } else {
    dom.btnNext.textContent = "Próxima pizza";
  }
}

function advanceLevel() {
  if (gameState.level >= CONFIG.TOTAL_LEVELS) {
    showVictory();
    return;
  }
  startLevel(gameState.level + 1);
}

/* ══════════════════════════════════════════════════════════
   GAME OVER / VITÓRIA
══════════════════════════════════════════════════════════ */
function showGameOver() {
  gameState.phase = "gameover";
  playSound("gameover");
  vibrate([80, 50, 80, 50, 120]);
  const isNew = saveHighScoreIfNeeded();
  dom.gameoverScore.textContent = String(gameState.score);
  dom.gameoverBest.textContent = String(gameState.highScore);
  dom.gameoverNewbest.hidden = !isNew;
  dom.ovAngry.hidden = true;
  dom.ovGameover.hidden = false;
  updateHUD();
}

function favoriteIngredient() {
  const usage = gameState.stats.ingredientUsage;
  const ids = Object.keys(usage);
  if (ids.length === 0) return "—";
  ids.sort((a, b) => usage[b] - usage[a]);
  return ING_BY_ID[ids[0]] ? ING_BY_ID[ids[0]].nome : "—";
}

function showVictory() {
  gameState.phase = "victory";
  playSound("vitoria");
  vibrate([40, 30, 40, 30, 40, 30, 80]);
  launchConfetti(90);
  const isNew = saveHighScoreIfNeeded();
  dom.victoryScore.textContent = String(gameState.score);
  dom.victoryNewbest.hidden = !isNew;
  dom.victoryStats.innerHTML = `
    <div class="pz-final-stats__row"><span>Recorde</span><strong>${gameState.highScore}</strong></div>
    <div class="pz-final-stats__row"><span>Pizzas completadas</span><strong>${gameState.stats.completas}</strong></div>
    <div class="pz-final-stats__row"><span>Pizzas perfeitas</span><strong>${gameState.stats.perfeitas}</strong></div>
    <div class="pz-final-stats__row"><span>Vidas restantes</span><strong>${gameState.lives}</strong></div>
    <div class="pz-final-stats__row"><span>Ingrediente favorito</span><strong>${favoriteIngredient()}</strong></div>
  `;
  dom.ovVictory.hidden = false;
  updateHUD();
}

/* ══════════════════════════════════════════════════════════
   START
══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", initGame);

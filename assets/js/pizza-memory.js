/* ═══════════════════════════════════════════════════════════
   PIZZA DE MEMÓRIA — pizza-memory.js
   Arcade de memória visual · vanilla JS · sem dependências

   Ideia central: a BANDEJA já entrega a quantidade exata de cada
   ingrediente. O jogador não precisa decorar QUANTOS — só ONDE.
   Por isso a pontuação é 100% posicional, com tolerância bem
   generosa: a graça é o caos crescente, não a dificuldade.
═══════════════════════════════════════════════════════════ */
"use strict";

const IMG = "assets/img/pizza/";

/* ══════════════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════════════ */
const CONFIG = {
  START_LIVES: 5,
  MAX_LIVES: 6,

  MAX_R: 0.82,          // raio normalizado máximo dentro da pizza
  RADIUS_PCT: 37,       // coordenada normalizada -> % de posição no container

  // ── Tolerância de posição (bem folgada de propósito) ──
  CLOSE_DIST: 0.14,     // até aqui = 100 pontos de posição
  FAR_DIST:   0.62,     // a partir daqui = 0
  FALLOFF:    1.0,      // queda linear entre os dois
  SCORE_BOOST_MUL: 1.06,
  SCORE_BOOST_ADD: 4,

  PASS_NOTE: 40,        // abaixo disso o cliente fica bravo
  GREAT_NOTE: 78,
  PERFECT_NOTE: 92,

  // ── Power-ups ──
  POWERUP_START: { peek: 3, coringa: 2, extraTime: 3 },
  POWERUP_REPLENISH_EVERY: 6,
  PEEK_DURATION_MS: 1600,
  EXTRA_TIME_SECONDS: 3,

  GREAT_STREAK_FOR_LIFE: 3,

  HIGH_SCORE_KEY: "pizzaMemoriaHighScore",
  SOUND_KEY: "pizzaMemoriaSom",
};

/* ══════════════════════════════════════════════════════════
   INGREDIENTES — a ordem define a ordem de entrada no jogo
══════════════════════════════════════════════════════════ */
const INGREDIENTS = [
  { id: "queijo",     nome: "Queijo",     cls: "queijo",     img: "ingredient-queijo.png" },
  { id: "pepperoni",  nome: "Pepperoni",  cls: "pepperoni",  img: "ingredient-pepperoni.png" },
  { id: "azeitona",   nome: "Azeitona",   cls: "azeitona",   img: "ingredient-azeitona.png" },
  { id: "manjericao", nome: "Manjericão", cls: "manjericao", img: "ingredient-manjericao.png" },
  { id: "cogumelo",   nome: "Cogumelo",   cls: "cogumelo",   img: "ingredient-cogumelo.png" },
  { id: "tomate",     nome: "Tomate",     cls: "tomate",     img: "ingredient-tomate.png" },
  { id: "cebola",     nome: "Cebola",     cls: "cebola",     img: "ingredient-cebola-roxa.png" },
  { id: "pimentao",   nome: "Pimentão",   cls: "pimentao",   img: "ingredient-pimentao.png" },
  { id: "milho",      nome: "Milho",      cls: "milho",      img: "ingredient-milho.png" },
  { id: "abacaxi",    nome: "Abacaxi",    cls: "abacaxi",    img: "ingredient-abacaxi.png" },
];
const ING_BY_ID = Object.fromEntries(INGREDIENTS.map(i => [i.id, i]));

/* ══════════════════════════════════════════════════════════
   TURNOS DE CAOS — o jogo não fica mais difícil de propósito,
   fica mais BARULHENTO. A dificuldade sobe devagar; o caos sobe
   rápido, porque é ele que dá a sensação de progressão.
══════════════════════════════════════════════════════════ */
const SHIFTS = [
  { from: 1,  chaos: 0, name: "Abrindo a pizzaria",  desc: "Forno quente, salão vazio." },
  { from: 4,  chaos: 1, name: "Chegou movimento",    desc: "A fila começou a formar." },
  { from: 8,  chaos: 2, name: "Hora do rush",        desc: "Todo mundo quer pizza. Agora." },
  { from: 13, chaos: 3, name: "Cozinha em chamas",   desc: "O forno não tá dando conta!" },
  { from: 19, chaos: 4, name: "Caos total",          desc: "Ninguém entende mais nada." },
  { from: 26, chaos: 5, name: "Pizzaria possuída",   desc: "A bancada ganhou vida própria." },
  { from: 34, chaos: 5, name: "Lenda da pizzaria",   desc: "Isso já não é mais um trabalho." },
  { from: 44, chaos: 5, name: "Além do caos",        desc: "As leis da física pediram demissão." },
];
function getShift(round) {
  let s = SHIFTS[0];
  for (const sh of SHIFTS) if (round >= sh.from) s = sh;
  return s;
}

/* ══════════════════════════════════════════════════════════
   CONFIGURAÇÃO DE CADA RODADA
══════════════════════════════════════════════════════════ */
function poolSizeForRound(round) {
  return Math.max(2, Math.min(INGREDIENTS.length, 2 + Math.floor((round - 1) / 2)));
}

function isDualRound(round) {
  return round >= 8 && round % 8 === 0;
}

function getRoundConfig(round) {
  const dual = isDualRound(round);
  const raw = Math.min(12, 3 + Math.floor((round - 1) / 2.2));
  const toppings = dual ? Math.max(3, raw - 3) : raw;
  return { toppings, pizzas: dual ? 2 : 1 };
}

// Tempo de memorização: cresce com o número de toppings (justo) e
// encolhe devagar com o caos (nunca abaixo de 2.8s).
function memorizeTimeFor(round, toppings) {
  const chaos = getShift(round).chaos;
  const chaosFactor = 1 - chaos * 0.056; // 1.00 → 0.72
  return Math.max(2.8, +(( 2.6 + toppings * 0.55) * chaosFactor).toFixed(2));
}

// Paciência do cliente na montagem — folgada, serve mais como bônus
// de velocidade do que como ameaça real.
function buildBudgetFor(round, totalToppings) {
  const chaos = getShift(round).chaos;
  return Math.max(12, (12 + totalToppings * 4) * (1 - chaos * 0.05));
}

/* ══════════════════════════════════════════════════════════
   NÍVEIS ESPECIAIS
══════════════════════════════════════════════════════════ */
const VARIANTS = {
  relampago: { label: "Pedido relâmpago", img: "badge-relampago.png", bonus: 1.0, desc: "Memorize rápido!" },
  giratoria: { label: "Pizza giratória",  img: "badge-surpresa.png",  bonus: 0.5, desc: "Ela não para quieta." },
  neblina:   { label: "Névoa na cozinha", img: "badge-neblina.png",   bonus: 0.6, desc: "Uma parte fica escondida." },
  surpresa:  { label: "Sabotagem",        img: "badge-surpresa.png",  bonus: 0.4, desc: "Tem algo que não devia estar aí." },
  exigente:  { label: "Cliente exigente", img: "badge-exigente.png",  bonus: 0.8, desc: "Ele repara em tudo." },
};
const VARIANT_UNLOCK = [
  { chaos: 1, ids: ["relampago", "giratoria"] },
  { chaos: 2, ids: ["neblina", "surpresa"] },
  { chaos: 3, ids: ["exigente"] },
];

function pickVariant(round, lastVariant) {
  if (round < 5 || round % 4 !== 1) return null;
  if (isDualRound(round)) return null;
  const chaos = getShift(round).chaos;
  const pool = [];
  VARIANT_UNLOCK.forEach(u => { if (chaos >= u.chaos) pool.push(...u.ids); });
  if (pool.length === 0) return null;
  const filtered = pool.filter(v => v !== lastVariant);
  const use = filtered.length ? filtered : pool;
  return use[Math.floor(Math.random() * use.length)];
}

/* ══════════════════════════════════════════════════════════
   PADRÕES DE DISTRIBUIÇÃO DOS TOPPINGS
══════════════════════════════════════════════════════════ */
function rand(min, max) { return min + Math.random() * (max - min); }

const PATTERNS = {
  circuloExterno(i, count) {
    const ang = (i / count) * Math.PI * 2 + rand(-0.15, 0.15);
    const r = rand(0.58, 0.78);
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  },
  centroBorda(i) {
    const ang = rand(0, Math.PI * 2);
    const r = i % 2 === 0 ? rand(0, 0.25) : rand(0.6, 0.8);
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  },
  metadeMetade(i, count, ctx) {
    if (ctx.side === undefined) ctx.side = Math.random() < 0.5 ? -1 : 1;
    if (ctx.axis === undefined) ctx.axis = Math.random() < 0.5 ? "x" : "y";
    const ang = rand(0, Math.PI * 2);
    const r = rand(0.15, 0.76);
    let x = Math.cos(ang) * r, y = Math.sin(ang) * r;
    if (ctx.axis === "x") x = Math.abs(x) * ctx.side;
    else y = Math.abs(y) * ctx.side;
    return { x, y };
  },
  quadrantes(i) {
    const q = i % 4;
    const sx = q === 0 || q === 3 ? -1 : 1;
    const sy = q < 2 ? -1 : 1;
    return { x: sx * rand(0.2, 0.68), y: sy * rand(0.2, 0.68) };
  },
  diagonal(i, count, ctx) {
    if (ctx.sign === undefined) ctx.sign = Math.random() < 0.5 ? 1 : -1;
    const t = count <= 1 ? 0 : (i / (count - 1)) * 2 - 1;
    const base = t * 0.7;
    return { x: base + rand(-0.12, 0.12), y: ctx.sign * base + rand(-0.12, 0.12) };
  },
  espiral(i, count) {
    const ang = i * 2.399963;
    const r = Math.sqrt((i + 0.5) / count) * 0.76;
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  },
  balanceada() {
    const ang = rand(0, Math.PI * 2);
    const r = Math.sqrt(Math.random()) * 0.76;
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  },
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
  cheiaCentro() {
    const ang = rand(0, Math.PI * 2);
    const r = Math.pow(Math.random(), 1.6) * 0.7;
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  },
  principalSecundarios(i) {
    if (i === 0) return { x: 0, y: 0 };
    const ang = rand(0, Math.PI * 2);
    const r = rand(0.34, 0.78);
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  },
};
const PATTERN_NAMES = Object.keys(PATTERNS);

/* ══════════════════════════════════════════════════════════
   GERAÇÃO DA PIZZA-MODELO
══════════════════════════════════════════════════════════ */
function minDistForCount(count) {
  return Math.max(0.17, 0.36 - count * 0.012);
}

function generatePositions(patternName, count) {
  const gen = PATTERNS[patternName];
  const minDist = minDistForCount(count);
  const ctx = {};
  const points = [];
  for (let i = 0; i < count; i++) {
    let best = null, bestScore = -1;
    for (let tries = 0; tries < 30; tries++) {
      const p = gen(i, count, ctx);
      const d0 = Math.hypot(p.x, p.y);
      if (d0 > CONFIG.MAX_R) {
        const k = CONFIG.MAX_R / (d0 || 1);
        p.x *= k; p.y *= k;
      }
      const nearest = points.reduce((m, q) => Math.min(m, Math.hypot(p.x - q.x, p.y - q.y)), Infinity);
      if (nearest >= minDist) { best = p; break; }
      if (nearest > bestScore) { bestScore = nearest; best = p; }
    }
    points.push(best);
  }
  return points;
}

// Distribui tipos: 1 ingrediente "principal" + variação, sempre com
// pelo menos 2 tipos distintos quando o pool permite.
function assignIngredientTypes(count, pool) {
  const main = pool[Math.floor(Math.random() * pool.length)];
  const types = [];
  const mainShare = Math.max(1, Math.round(count * rand(0.32, 0.48)));
  for (let i = 0; i < mainShare; i++) types.push(main);
  while (types.length < count) types.push(pool[Math.floor(Math.random() * pool.length)]);
  types.length = count;
  if (pool.length > 1 && new Set(types).size === 1) {
    types[types.length - 1] = pool.find(p => p !== main) || main;
  }
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types;
}

function generateTargetPizza(count, pool, avoidPattern) {
  let pattern;
  do { pattern = PATTERN_NAMES[Math.floor(Math.random() * PATTERN_NAMES.length)]; }
  while (pattern === avoidPattern && PATTERN_NAMES.length > 1);

  const positions = generatePositions(pattern, count);
  const types = assignIngredientTypes(count, pool);
  const toppings = positions.map((p, i) => ({
    type: types[i],
    x: +p.x.toFixed(3),
    y: +p.y.toFixed(3),
    rot: Math.round(rand(-18, 18)),
    scale: +rand(0.93, 1.07).toFixed(2),
  }));
  return { pattern, toppings };
}

/* ══════════════════════════════════════════════════════════
   ESTADO
══════════════════════════════════════════════════════════ */
const gameState = {
  round: 1,
  score: 0,
  lives: CONFIG.START_LIVES,
  highScore: 0,
  seenIngredients: new Set(),
  phase: "start",
  pattern: null,
  pizzas: [],
  activePizza: 0,
  selectedIngredient: null,
  tray: {},              // { tipo: quantidade restante }
  trayTotal: 0,          // total original da rodada
  undoStack: [],
  usedUndo: false,
  buildStart: 0,
  buildBudget: 0,
  timer: null,
  deadline: 0,
  duration: 0,
  timerMode: null,       // "memorize" | "build"
  soundOn: true,
  audioCtx: null,
  peeking: false,
  usedExtraTime: false,
  powerups: { peek: 0, coringa: 0, extraTime: 0 },
  combo: 0,
  greatStreak: 0,
  variant: null,
  lastVariant: null,
  shift: SHIFTS[0],
  flyerTimer: null,
  stats: { servidas: 0, perfeitas: 0, otimas: 0, usage: {}, bestRound: 1 },
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
   SOM + VIBRAÇÃO
══════════════════════════════════════════════════════════ */
function getAudioCtx() {
  if (!gameState.audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) gameState.audioCtx = new AC();
  }
  if (gameState.audioCtx && gameState.audioCtx.state === "suspended") gameState.audioCtx.resume();
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
  gain.gain.setValueAtTime(gainStart != null ? gainStart : 0.16, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SOUND_RECIPES = {
  select:   () => tone(560, 0.07, "sine", 0.12),
  place:    () => { tone(720, 0.07, "triangle", 0.15); tone(1080, 0.05, "sine", 0.07, 0.03); },
  remove:   () => tone(300, 0.09, "triangle", 0.13),
  serve:    () => { tone(440, 0.12, "sine"); tone(660, 0.14, "sine", 0.14, 0.08); tone(880, 0.16, "sine", 0.1, 0.16); },
  otima:    () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, "sine", 0.16, i * 0.08)),
  perfeita: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.18, "sine", 0.16, i * 0.07)),
  bravo:    () => { tone(180, 0.3, "sawtooth", 0.14); tone(135, 0.36, "sawtooth", 0.12, 0.1); },
  magico:   () => [880, 1174, 1568].forEach((f, i) => tone(f, 0.13, "triangle", 0.13, i * 0.05)),
  novo:     () => { tone(660, 0.1, "square", 0.1); tone(990, 0.14, "square", 0.1, 0.09); },
  turno:    () => { tone(220, 0.2, "sawtooth", 0.1); tone(330, 0.24, "square", 0.09, 0.1); tone(440, 0.3, "sine", 0.12, 0.2); },
  combo:    () => { tone(784, 0.1, "square", 0.1); tone(1046, 0.12, "square", 0.1, 0.07); },
  vida:     () => [659, 880, 1174].forEach((f, i) => tone(f, 0.16, "sine", 0.15, i * 0.09)),
  gameover: () => [330, 280, 235, 175].forEach((f, i) => tone(f, 0.26, "sawtooth", 0.14, i * 0.15)),
  tick:     () => tone(1100, 0.04, "square", 0.05),
};
function playSound(name) { const fn = SOUND_RECIPES[name]; if (fn) fn(); }
function vibrate(p) { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

/* ══════════════════════════════════════════════════════════
   DOM
══════════════════════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);
const dom = {
  stage: $("pz-stage"),
  flyers: $("pz-flyers"),
  hud: $("pz-hud"),
  hudScore: $("hud-score"),
  hudScorePill: null,
  hudBest: $("hud-best"),
  hudStateText: $("hud-state-text"),
  hudLivesWrap: $("hud-lives-wrap"),
  hudTimerFill: $("hud-timer-fill"),
  chaosLabel: $("chaos-label"),
  chaosFill: $("chaos-fill"),
  pizzaCount: $("pizza-count"),
  combo: $("hud-combo"),
  comboMult: $("combo-mult"),
  comboLabel: $("combo-label"),
  btnSound: $("btn-sound"),
  iconSound: $("icon-sound"),
  customerAvatar: $("customer-avatar"),
  customerImg: $("customer-img"),
  customerMsg: $("customer-msg"),
  queue: $("pz-queue"),
  pizzasWrap: $("pz-pizzas"),
  popups: $("pz-popups"),
  ingredientBoxes: $("ingredient-boxes"),
  trayHint: $("tray-hint"),
  actions: $("pz-actions"),
  btnUndo: $("btn-undo"),
  btnServe: $("btn-serve"),
  serveLabel: $("serve-label"),
  btnPeek: $("btn-peek"),
  badgePeek: $("badge-peek"),
  btnCoringa: $("btn-coringa"),
  badgeCoringa: $("badge-coringa"),
  btnExtratime: $("btn-extratime"),
  badgeExtratime: $("badge-extratime"),
  variantBadge: $("variant-badge"),
  variantBadgeImg: $("variant-badge-img"),
  variantBadgeText: $("variant-badge-text"),
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
  angrySub: $("angry-sub"),
  angryLives: $("angry-lives"),
  btnRetry: $("btn-retry"),
  toastUnlock: $("toast-unlock"),
  toastUnlockBox: $("toast-unlock-box"),
  toastUnlockName: $("toast-unlock-name"),
  toastShift: $("toast-shift"),
  toastShiftName: $("toast-shift-name"),
  toastShiftDesc: $("toast-shift-desc"),
  ovGameover: $("ov-gameover"),
  gameoverScore: $("gameover-score"),
  gameoverStats: $("gameover-stats"),
  gameoverNewbest: $("gameover-newbest"),
  btnPlayagain: $("btn-playagain"),
  confettiLayer: $("confetti-layer"),
};
dom.hudScorePill = dom.hudScore ? dom.hudScore.closest(".pz-pill") : null;

/* ══════════════════════════════════════════════════════════
   BANDEJA (o coração da nova mecânica)
   A bandeja mostra exatamente quantos de cada ingrediente
   ainda faltam. Zero decoreba de quantidade.
══════════════════════════════════════════════════════════ */
function buildTrayFromTargets() {
  const tray = {};
  gameState.pizzas.forEach(pz => {
    pz.target.forEach(t => { tray[t.type] = (tray[t.type] || 0) + 1; });
  });
  gameState.tray = tray;
  gameState.trayTotal = Object.values(tray).reduce((a, b) => a + b, 0);
}

function trayRemaining() {
  return Object.values(gameState.tray).reduce((a, b) => a + b, 0);
}

function renderTray() {
  dom.ingredientBoxes.innerHTML = "";
  // ordem estável = ordem canônica dos ingredientes
  INGREDIENTS.filter(ing => gameState.tray[ing.id] !== undefined).forEach((ing) => {
    const left = gameState.tray[ing.id];
    const box = document.createElement("button");
    box.type = "button";
    box.className = "pz-ibox" + (left <= 0 ? " is-empty" : "");
    box.dataset.ing = ing.id;
    box.innerHTML = `
      <span class="pz-ibox__qty">${left}</span>
      <span class="pz-ibox__icon" style="background-image:url('${IMG}${ing.img}')"></span>
      <span class="pz-ibox__name">${ing.nome}</span>
    `;
    box.addEventListener("pointerdown", (e) => startDrag(e, ing.id));
    dom.ingredientBoxes.appendChild(box);
  });
  syncTrayUI();
}

// Atualiza só os números/estados, sem recriar o DOM (mantém animações)
function syncTrayUI(tickedId) {
  dom.ingredientBoxes.querySelectorAll(".pz-ibox").forEach((b) => {
    const id = b.dataset.ing;
    const left = gameState.tray[id] || 0;
    const qty = b.querySelector(".pz-ibox__qty");
    if (qty && qty.textContent !== String(left)) {
      qty.textContent = String(left);
      if (id === tickedId) {
        qty.classList.remove("is-ticking");
        void qty.offsetWidth;
        qty.classList.add("is-ticking");
      }
    }
    b.classList.toggle("is-empty", left <= 0);
    b.classList.toggle("is-selected", id === gameState.selectedIngredient && left > 0);
  });
  updateServeButton();
}

// Seleciona automaticamente o próximo ingrediente que ainda tem peça —
// assim o jogador só precisa tocar nos lugares, sem ficar trocando à mão.
function autoSelectNext(preferId) {
  if (preferId && (gameState.tray[preferId] || 0) > 0) {
    gameState.selectedIngredient = preferId;
    return;
  }
  const next = INGREDIENTS.find(i => (gameState.tray[i.id] || 0) > 0);
  gameState.selectedIngredient = next ? next.id : null;
}

function updateServeButton() {
  const left = trayRemaining();
  const ready = left === 0;
  dom.serveLabel.textContent = ready ? "Servir!" : `Servir (faltam ${left})`;
  dom.btnServe.classList.toggle("is-ready", ready && gameState.phase === "build");
}

function setIngredientsInteractive(active) {
  dom.ingredientBoxes.classList.toggle("is-waiting", !active);
  if (!active) {
    gameState.selectedIngredient = null;
    dom.ingredientBoxes.querySelectorAll(".pz-ibox").forEach(b => b.classList.remove("is-selected"));
  }
}
function setActionsInteractive(active) {
  dom.actions.classList.toggle("is-waiting", !active);
}

/* ══════════════════════════════════════════════════════════
   PIZZAS / BANCADA
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
        <div class="pz-pizza__toppings"></div>
        <div class="pz-fog"></div>
      </div>
      <div class="pz-cloche pz-cloche--hidden"></div>
    `;
    dom.pizzasWrap.appendChild(board);
    const pizzaEl = board.querySelector(".pz-pizza");
    pizzaEl.addEventListener("click", (e) => onPizzaClick(e, p));
    gameState.pizzas.push({
      target: [], player: [], boardEl: board, pizzaEl,
      toppingsEl: board.querySelector(".pz-pizza__toppings"),
      cloche: board.querySelector(".pz-cloche"),
      fogEl: board.querySelector(".pz-fog"),
    });
  }
  setActivePizza(0);
}

function setActivePizza(idx) {
  gameState.activePizza = idx;
  const multi = gameState.pizzas.length > 1;
  gameState.pizzas.forEach((pz, i) => pz.boardEl.classList.toggle("is-selected", multi && i === idx));
}

function toppingPct(x, y) {
  return { left: 50 + x * CONFIG.RADIUS_PCT, top: 50 + y * CONFIG.RADIUS_PCT };
}

function createToppingEl(t, extraClass) {
  const ing = ING_BY_ID[t.type];
  const el = document.createElement("div");
  el.className = `pz-topping pz-topping--${ing.cls}` + (extraClass ? " " + extraClass : "");
  const pct = toppingPct(t.x, t.y);
  el.style.left = pct.left + "%";
  el.style.top = pct.top + "%";
  el.style.transform = `translate(-50%,-50%) rotate(${t.rot || 0}deg) scale(${t.scale || 1})`;
  if (t.id != null) el.dataset.toppingId = t.id;
  return el;
}

function renderTargetPizza(i) {
  const pz = gameState.pizzas[i];
  pz.toppingsEl.innerHTML = "";
  pz.pizzaEl.classList.remove("is-empty");
  pz.target.forEach(t => pz.toppingsEl.appendChild(createToppingEl(t)));
}

function renderPlayerPizza(i) {
  const pz = gameState.pizzas[i];
  pz.toppingsEl.innerHTML = "";
  pz.pizzaEl.classList.toggle("is-empty", pz.player.length === 0);
  pz.player.forEach(t => {
    const el = createToppingEl(t);
    el.addEventListener("click", (e) => { e.stopPropagation(); removeTopping(i, t.id); });
    pz.toppingsEl.appendChild(el);
  });
}

/* ══════════════════════════════════════════════════════════
   HUD
══════════════════════════════════════════════════════════ */
function updateHUD(bump) {
  dom.hudScore.textContent = gameState.score.toLocaleString("pt-BR");
  dom.hudBest.textContent = gameState.highScore.toLocaleString("pt-BR");
  if (bump && dom.hudScorePill) {
    dom.hudScorePill.classList.remove("is-bumping");
    void dom.hudScorePill.offsetWidth;
    dom.hudScorePill.classList.add("is-bumping");
  }

  const slots = Math.max(CONFIG.START_LIVES, gameState.lives);
  const prev = dom.hudLivesWrap.children.length;
  dom.hudLivesWrap.innerHTML = Array.from({ length: slots })
    .map((_, i) => `<span class="pz-life${i < gameState.lives ? "" : " is-lost"}"></span>`).join("");
  if (slots > prev && prev > 0) {
    const last = dom.hudLivesWrap.lastElementChild;
    if (last) last.classList.add("is-new");
  }

  dom.pizzaCount.textContent = `Pizza ${gameState.round}`;
  dom.chaosLabel.textContent = gameState.shift.name;

  // O medidor cresce de forma monotônica: 20% por patamar de caos + o
  // progresso dentro do turno atual.
  const sh = gameState.shift;
  const idx = SHIFTS.indexOf(sh);
  const next = SHIFTS[idx + 1];
  const span = next ? next.from - sh.from : 10;
  const within = Math.min(1, (gameState.round - sh.from) / span);
  dom.chaosFill.style.width = Math.min(100, sh.chaos * 20 + within * 20) + "%";
  dom.stage.dataset.chaos = String(sh.chaos);

  // combo
  const mult = comboMultiplier();
  if (mult > 1) {
    dom.combo.hidden = false;
    dom.comboMult.textContent = "x" + (Number.isInteger(mult) ? mult : mult.toFixed(1));
    dom.comboLabel.textContent = comboName();
  } else {
    dom.combo.hidden = true;
  }

  renderQueue();
}

function renderQueue() {
  const n = Math.min(4, gameState.shift.chaos);
  if (dom.queue.children.length === n) return;
  const faces = ["customer-waiting.png", "customer-neutral.png", "customer-angry.png", "customer-happy.png"];
  dom.queue.innerHTML = Array.from({ length: n })
    .map((_, i) => `<img src="${IMG}${faces[i % faces.length]}" alt=""/>`).join("");
}

function setHudState(text) { dom.hudStateText.textContent = text; }

function setTimerFill(frac) {
  const f = Math.max(0, Math.min(1, frac));
  dom.hudTimerFill.style.width = (f * 100) + "%";
  dom.hudTimerFill.classList.toggle("is-mid", f < 0.5 && f >= 0.22);
  dom.hudTimerFill.classList.toggle("is-low", f < 0.22);
}

function applyVariantBadge() {
  const v = gameState.variant;
  if (!v) { dom.variantBadge.hidden = true; return; }
  dom.variantBadgeImg.src = IMG + VARIANTS[v].img;
  dom.variantBadgeText.textContent = VARIANTS[v].label;
  dom.variantBadge.hidden = false;
}

/* ══════════════════════════════════════════════════════════
   COMBO
══════════════════════════════════════════════════════════ */
function comboMultiplier() {
  if (gameState.combo < 2) return 1;
  return Math.min(4, 1 + (gameState.combo - 1) * 0.5);
}
function comboName() {
  const c = gameState.combo;
  if (c >= 8) return "Lendário";
  if (c >= 6) return "Em chamas";
  if (c >= 4) return "Fornada quente";
  return "Combo";
}

/* ══════════════════════════════════════════════════════════
   POWER-UPS
══════════════════════════════════════════════════════════ */
function updatePowerupButtons() {
  const pw = gameState.powerups;
  dom.badgePeek.textContent = String(pw.peek);
  dom.badgeCoringa.textContent = String(pw.coringa);
  dom.badgeExtratime.textContent = String(pw.extraTime);
  const inBuild = gameState.phase === "build";
  dom.btnPeek.disabled = !inBuild || pw.peek <= 0 || gameState.peeking;
  dom.btnCoringa.disabled = !inBuild || pw.coringa <= 0 || trayRemaining() === 0;
  dom.btnExtratime.hidden = !(gameState.phase === "memorize" && pw.extraTime > 0 && !gameState.usedExtraTime);
}

function usePeek() {
  if (gameState.phase !== "build" || gameState.peeking || gameState.powerups.peek <= 0) return;
  gameState.powerups.peek--;
  gameState.peeking = true;
  updatePowerupButtons();
  setActionsInteractive(false);
  setIngredientsInteractive(false);
  playSound("select");
  vibrate(20);
  setHudState("Espiando...");

  gameState.pizzas.forEach((pz, i) => {
    renderTargetPizza(i);
    pz.pizzaEl.classList.add("is-peeking");
  });

  setTimeout(() => {
    gameState.pizzas.forEach((pz, i) => {
      pz.pizzaEl.classList.remove("is-peeking");
      renderPlayerPizza(i);
    });
    gameState.peeking = false;
    setActionsInteractive(true);
    setIngredientsInteractive(true);
    autoSelectNext(gameState.selectedIngredient);
    syncTrayUI();
    setHudState("Monte!");
    updatePowerupButtons();
  }, CONFIG.PEEK_DURATION_MS);
}

// Coringa: coloca UM ingrediente no lugar exato, de graça.
// Gratificação instantânea > mecânica complicada.
function useCoringa() {
  if (gameState.phase !== "build" || gameState.powerups.coringa <= 0) return;
  const spot = findBestCoringaSpot();
  if (!spot) return;
  gameState.powerups.coringa--;

  const t = {
    id: toppingIdCounter++, type: spot.target.type,
    x: spot.target.x, y: spot.target.y,
    rot: spot.target.rot, scale: spot.target.scale, magic: true,
  };
  const pz = gameState.pizzas[spot.pizzaIndex];
  pz.player.push(t);
  gameState.undoStack.push({ pizzaIndex: spot.pizzaIndex, toppingId: t.id, type: t.type });
  gameState.tray[t.type] = Math.max(0, (gameState.tray[t.type] || 0) - 1);
  gameState.stats.usage[t.type] = (gameState.stats.usage[t.type] || 0) + 1;

  renderPlayerPizza(spot.pizzaIndex);
  const el = pz.toppingsEl.querySelector(`[data-topping-id="${t.id}"]`);
  if (el) el.classList.add("pz-topping--magic");
  autoSelectNext(gameState.selectedIngredient);
  syncTrayUI(t.type);
  updatePowerupButtons();
  playSound("magico");
  vibrate([12, 25, 12]);
  floatPopup("no ponto!", spot.pizzaIndex, spot.target, false);
}

// Escolhe um alvo cujo tipo ainda tem peça na bandeja e que ainda não
// tem nenhum topping do jogador por perto.
function findBestCoringaSpot() {
  let best = null, bestD = -1;
  gameState.pizzas.forEach((pz, pi) => {
    pz.target.forEach(mt => {
      if ((gameState.tray[mt.type] || 0) <= 0) return;
      const nearest = pz.player.reduce((m, pt) =>
        pt.type === mt.type ? Math.min(m, Math.hypot(mt.x - pt.x, mt.y - pt.y)) : m, Infinity);
      const d = nearest === Infinity ? 99 : nearest;
      if (d > bestD) { bestD = d; best = { pizzaIndex: pi, target: mt }; }
    });
  });
  return best;
}

function useExtraTime() {
  if (gameState.phase !== "memorize" || gameState.usedExtraTime) return;
  if (gameState.powerups.extraTime <= 0) return;
  gameState.powerups.extraTime--;
  gameState.usedExtraTime = true;
  gameState.deadline += CONFIG.EXTRA_TIME_SECONDS * 1000;
  gameState.duration += CONFIG.EXTRA_TIME_SECONDS;
  playSound("novo");
  vibrate(20);
  updatePowerupButtons();
}

/* ══════════════════════════════════════════════════════════
   CLIENTE
══════════════════════════════════════════════════════════ */
const CUSTOMER_MESSAGES = {
  memorize: ["Olha bem onde tá cada coisa!", "Guarda esse desenho aí.", "Foto mental, vai!", "Presta atenção nos lugares."],
  build: ["Agora monta igual!", "Capricha, hein.", "Tô com fome...", "Manda ver."],
  hurry: ["Tô esperando...", "Alguém aí?", "A fome não espera!", "Vai demorar muito?"],
  perfeita: ["Isso é arte!", "Mamma mia!", "Idêntica!", "Chef, você é um gênio."],
  otima: ["Perfeita!", "Que capricho!", "Essa ficou linda.", "Uau."],
  boa: ["Boa, passou!", "Ficou gostosa.", "Serviu.", "A cozinha sobreviveu."],
  neutra: ["Hmm... ficou bom.", "Quase...", "Podia caprichar mais.", "Vai dar pro gasto."],
  brava: ["Isso não era o que eu pedi!", "Cadê o pepperoni?", "Eu pedi OUTRA coisa.", "Tá de brincadeira?"],
};
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const CUSTOMER_FACES = {
  waiting: "customer-waiting.png",
  happy: "customer-happy.png",
  great: "customer-great.png",
  neutral: "customer-neutral.png",
  angry: "customer-angry.png",
};

function setCustomerState(state, msg) {
  dom.customerImg.src = IMG + (CUSTOMER_FACES[state] || CUSTOMER_FACES.waiting);
  dom.customerAvatar.className = "pz-customer__avatar" + (state === "waiting" ? "" : " is-" + state);
  if (msg != null) {
    dom.customerMsg.textContent = msg;
    dom.customerMsg.parentElement.style.animation = "none";
    void dom.customerMsg.parentElement.offsetWidth;
    dom.customerMsg.parentElement.style.animation = "";
  }
}

/* ══════════════════════════════════════════════════════════
   PARTÍCULAS: confete, popups e "voadores" de caos
══════════════════════════════════════════════════════════ */
function launchConfetti(amount) {
  for (let i = 0; i < amount; i++) {
    const ing = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
    const size = rand(16, 32);
    const piece = document.createElement("div");
    piece.className = "pz-confetti-piece";
    piece.style.backgroundImage = `url('${IMG}${ing.img}')`;
    piece.style.left = rand(0, 100) + "%";
    piece.style.width = size + "px";
    piece.style.height = size + "px";
    piece.style.animationDuration = rand(1.6, 3.4) + "s";
    piece.style.animationDelay = rand(0, 0.6) + "s";
    dom.confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), 4400);
  }
}

// Ingredientes atravessando a tela — puro tempero visual do caos
function spawnFlyer() {
  const ing = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
  const el = document.createElement("div");
  el.className = "pz-flyer";
  el.style.backgroundImage = `url('${IMG}${ing.img}')`;
  el.style.top = rand(8, 82) + "%";
  const size = rand(24, 46);
  el.style.width = size + "px";
  el.style.height = size + "px";
  el.style.animationDuration = rand(2.2, 4.2) + "s";
  dom.flyers.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

function restartFlyers() {
  clearInterval(gameState.flyerTimer);
  const chaos = gameState.shift.chaos;
  if (chaos < 2) return;
  const every = [0, 0, 4200, 2800, 1700, 1000][chaos];
  gameState.flyerTimer = setInterval(spawnFlyer, every);
}

function floatPopup(text, pizzaIndex, coords, big) {
  const pz = gameState.pizzas[pizzaIndex];
  if (!pz) return;
  const benchRect = dom.popups.getBoundingClientRect();
  const pizzaRect = pz.pizzaEl.getBoundingClientRect();
  const pct = coords ? toppingPct(coords.x, coords.y) : { left: 50, top: 40 };
  const x = pizzaRect.left - benchRect.left + (pct.left / 100) * pizzaRect.width;
  const y = pizzaRect.top - benchRect.top + (pct.top / 100) * pizzaRect.height;
  const el = document.createElement("div");
  el.className = "pz-popup" + (big ? " pz-popup--big" : "");
  el.textContent = text;
  el.style.left = x + "px";
  el.style.top = y + "px";
  dom.popups.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

/* ══════════════════════════════════════════════════════════
   CICLO DO JOGO
══════════════════════════════════════════════════════════ */
let toppingIdCounter = 1;

let initialized = false;
function initGame() {
  if (initialized) return; // nunca liga os eventos duas vezes
  initialized = true;
  loadHighScore();
  gameState.soundOn = localStorage.getItem(CONFIG.SOUND_KEY) !== "off";
  dom.iconSound.src = IMG + (gameState.soundOn ? "icon-sound-on.png" : "icon-sound-off.png");
  dom.startBest.textContent = gameState.highScore.toLocaleString("pt-BR");
  bindStaticEvents();
}

function bindStaticEvents() {
  dom.btnPlay.addEventListener("click", () => {
    getAudioCtx();
    dom.ovStart.hidden = true;
    resetRun();
  });
  dom.btnSound.addEventListener("click", () => {
    gameState.soundOn = !gameState.soundOn;
    dom.iconSound.src = IMG + (gameState.soundOn ? "icon-sound-on.png" : "icon-sound-off.png");
    localStorage.setItem(CONFIG.SOUND_KEY, gameState.soundOn ? "on" : "off");
    if (gameState.soundOn) playSound("select");
  });
  dom.btnUndo.addEventListener("click", undoLast);
  dom.btnServe.addEventListener("click", () => servePizza(false));
  dom.btnPeek.addEventListener("click", usePeek);
  dom.btnCoringa.addEventListener("click", useCoringa);
  dom.btnExtratime.addEventListener("click", useExtraTime);
  dom.btnNext.addEventListener("click", () => {
    dom.ovResult.hidden = true;
    startRound(gameState.round + 1);
  });
  dom.btnRetry.addEventListener("click", () => {
    dom.ovAngry.hidden = true;
    startRound(gameState.round); // repete a mesma rodada, com pizza nova
  });
  dom.btnPlayagain.addEventListener("click", () => { dom.ovGameover.hidden = true; resetRun(); });

  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragEnd);
  window.addEventListener("pointercancel", onDragEnd);
}

function resetRun() {
  clearInterval(gameState.timer);
  clearInterval(gameState.flyerTimer);
  gameState.round = 1;
  gameState.score = 0;
  gameState.lives = CONFIG.START_LIVES;
  gameState.seenIngredients = new Set();
  gameState.pattern = null;
  gameState.powerups = { ...CONFIG.POWERUP_START };
  gameState.combo = 0;
  gameState.greatStreak = 0;
  gameState.variant = null;
  gameState.lastVariant = null;
  gameState.shift = SHIFTS[0];
  gameState.stats = { servidas: 0, perfeitas: 0, otimas: 0, usage: {}, bestRound: 1 };
  dom.hud.hidden = false;
  dom.flyers.innerHTML = "";
  updateHUD();
  updatePowerupButtons();
  startRound(1);
}

// Cada rodada recebe um "token". As sequências assíncronas (toast de
// turno, toast de ingrediente novo) checam o token antes de continuar —
// assim uma rodada antiga nunca sobrescreve a que já começou.
let roundToken = 0;

function startRound(round) {
  clearInterval(gameState.timer);
  const token = ++roundToken;
  gameState.round = round;
  gameState.stats.bestRound = Math.max(gameState.stats.bestRound, round);
  gameState.selectedIngredient = null;
  gameState.usedUndo = false;
  gameState.usedExtraTime = false;
  gameState.undoStack = [];
  gameState.peeking = false;

  const prevShift = gameState.shift;
  gameState.shift = getShift(round);
  const shiftChanged = prevShift !== gameState.shift;

  gameState.variant = pickVariant(round, gameState.lastVariant);
  if (gameState.variant) gameState.lastVariant = gameState.variant;

  if (round > 1 && round % CONFIG.POWERUP_REPLENISH_EVERY === 1) {
    Object.keys(gameState.powerups).forEach(k => gameState.powerups[k]++);
  }

  updateHUD();
  applyVariantBadge();
  updatePowerupButtons();
  restartFlyers();

  const alive = () => token === roundToken;
  const proceed = () => { if (alive()) setupRound(round); };

  if (shiftChanged && round > 1) {
    showShiftToast(gameState.shift, () => { if (alive()) maybeUnlockToast(round, proceed); });
  } else {
    maybeUnlockToast(round, proceed);
  }
}

// Toast quando um ingrediente aparece pela primeira vez na bandeja
function maybeUnlockToast(round, done) {
  const pool = INGREDIENTS.slice(0, poolSizeForRound(round));
  const fresh = pool.filter(i => !gameState.seenIngredients.has(i.id));
  fresh.forEach(i => gameState.seenIngredients.add(i.id));
  if (fresh.length === 0 || round === 1) return done();

  let i = 0;
  (function next() {
    if (i >= fresh.length) return done();
    const ing = fresh[i++];
    dom.toastUnlockBox.src = IMG + ing.img;
    dom.toastUnlockName.textContent = ing.nome;
    dom.toastUnlock.hidden = false;
    requestAnimationFrame(() => dom.toastUnlock.classList.add("is-visible"));
    playSound("novo");
    vibrate(30);
    setTimeout(() => {
      dom.toastUnlock.classList.remove("is-visible");
      setTimeout(() => { dom.toastUnlock.hidden = true; next(); }, 300);
    }, 1300);
  })();
}

function showShiftToast(shift, done) {
  dom.toastShiftName.textContent = shift.name;
  dom.toastShiftDesc.textContent = shift.desc;
  dom.toastShift.hidden = false;
  requestAnimationFrame(() => dom.toastShift.classList.add("is-visible"));
  playSound("turno");
  vibrate([40, 40, 70]);
  dom.stage.classList.add("is-shaking");
  setTimeout(() => dom.stage.classList.remove("is-shaking"), 400);
  setTimeout(() => {
    dom.toastShift.classList.remove("is-visible");
    setTimeout(() => { dom.toastShift.hidden = true; done(); }, 350);
  }, 1700);
}

function setupRound(round) {
  const cfg = getRoundConfig(round);
  const pool = INGREDIENTS.slice(0, poolSizeForRound(round)).map(i => i.id);
  buildPizzasDom(cfg.pizzas);

  const t1 = generateTargetPizza(cfg.toppings, pool, gameState.pattern);
  gameState.pattern = t1.pattern;
  gameState.pizzas[0].target = t1.toppings.map(t => ({ ...t, id: toppingIdCounter++ }));

  if (cfg.pizzas > 1) {
    const t2 = generateTargetPizza(cfg.toppings, pool, t1.pattern);
    gameState.pizzas[1].target = t2.toppings.map(t => ({ ...t, id: toppingIdCounter++ }));
  }
  gameState.pizzas.forEach(pz => { pz.player = []; });

  buildTrayFromTargets();
  renderTray();
  setIngredientsInteractive(false);
  setActionsInteractive(false);

  // efeitos de nível especial que atuam na memorização
  if (gameState.variant === "neblina") {
    const pz = gameState.pizzas[0];
    pz.fogEl.classList.add("is-active");
    pz.fogEl.style.transform = `rotate(${Math.round(rand(0, 360))}deg)`;
  }
  if (gameState.variant === "giratoria") {
    gameState.pizzas.forEach(pz => pz.boardEl.classList.add("is-spinning"));
  }

  showMemorizePhase();
}

/* ── FASE 1: MEMORIZAR ─────────────────────────────────── */
function showMemorizePhase() {
  gameState.phase = "memorize";
  setIngredientsInteractive(false);
  setHudState("Memorize!");
  setCustomerState("waiting", pick(CUSTOMER_MESSAGES.memorize));
  gameState.pizzas.forEach((pz, i) => {
    renderTargetPizza(i);
    pz.cloche.classList.add("pz-cloche--hidden");
  });

  const cfg = getRoundConfig(gameState.round);
  let duration = memorizeTimeFor(gameState.round, cfg.toppings * cfg.pizzas);
  if (gameState.variant === "relampago") duration = Math.max(2.2, duration * 0.6);

  gameState.duration = duration;
  gameState.deadline = performance.now() + duration * 1000;
  gameState.timerMode = "memorize";
  updatePowerupButtons();
  runTimer();
}

function runTimer() {
  clearInterval(gameState.timer);
  let lastTick = 99;
  gameState.timer = setInterval(() => {
    const remain = gameState.deadline - performance.now();
    setTimerFill(remain / (gameState.duration * 1000));

    if (gameState.timerMode === "memorize") {
      const secs = Math.ceil(remain / 1000);
      if (secs <= 3 && secs !== lastTick && secs > 0) { lastTick = secs; playSound("tick"); }
      if (remain <= 0) { clearInterval(gameState.timer); startBuildPhase(); }
    } else {
      const frac = remain / (gameState.duration * 1000);
      if (frac < 0.3) dom.customerAvatar.classList.add("is-impatient");
      if (frac < 0.28 && lastTick !== 1) { lastTick = 1; setCustomerState("neutral", pick(CUSTOMER_MESSAGES.hurry)); }
      if (remain <= 0) { clearInterval(gameState.timer); servePizza(true); }
    }
  }, 60);
}

/* ── FASE 2: MONTAR ────────────────────────────────────── */
function startBuildPhase() {
  gameState.phase = "covering";
  setIngredientsInteractive(false);
  setHudState("Cobrindo...");
  setTimerFill(1);

  gameState.pizzas.forEach(pz => {
    pz.cloche.classList.remove("pz-cloche--hidden");
    pz.fogEl.classList.remove("is-active");
    pz.boardEl.classList.remove("is-spinning");
  });

  setTimeout(() => {
    gameState.pizzas.forEach((pz, i) => {
      pz.player = [];
      if (i === 0 && gameState.variant === "surpresa") pz.player.push(makeDecoyTopping(pz.target));
      renderPlayerPizza(i);
      pz.cloche.classList.add("pz-cloche--hidden");
    });
    setActivePizza(0);
    setActionsInteractive(true);
    setIngredientsInteractive(true);
    setHudState("Monte!");
    setCustomerState("waiting", pick(CUSTOMER_MESSAGES.build));

    gameState.phase = "build";
    autoSelectNext();
    syncTrayUI();

    const cfg = getRoundConfig(gameState.round);
    gameState.buildBudget = buildBudgetFor(gameState.round, cfg.toppings * cfg.pizzas);
    gameState.buildStart = performance.now();
    gameState.duration = gameState.buildBudget;
    gameState.deadline = performance.now() + gameState.buildBudget * 1000;
    gameState.timerMode = "build";
    dom.customerAvatar.classList.remove("is-impatient");
    runTimer();
    updatePowerupButtons();
  }, 560);
}

// Topping intruso da variante "Sabotagem": um tipo que NÃO está na
// bandeja, pra ficar óbvio que ele não deveria estar ali.
function makeDecoyTopping(target) {
  const inTarget = new Set(target.map(t => t.type));
  const pool = INGREDIENTS.slice(0, poolSizeForRound(gameState.round))
    .map(i => i.id).filter(id => !inTarget.has(id));
  const type = pool.length ? pool[Math.floor(Math.random() * pool.length)]
                           : INGREDIENTS[0].id;
  const minDist = minDistForCount(target.length + 1);
  let pos = { x: 0, y: 0 };
  for (let tries = 0; tries < 24; tries++) {
    const ang = rand(0, Math.PI * 2);
    const r = Math.sqrt(Math.random()) * CONFIG.MAX_R;
    const p = { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
    pos = p;
    const nearest = target.reduce((m, t) => Math.min(m, Math.hypot(p.x - t.x, p.y - t.y)), Infinity);
    if (nearest >= minDist) break;
  }
  return { id: toppingIdCounter++, type, x: +pos.x.toFixed(3), y: +pos.y.toFixed(3), rot: Math.round(rand(-14, 14)), scale: 1, decoy: true };
}

/* ── COLOCAR / TIRAR ───────────────────────────────────── */
function selectIngredient(id) {
  if (gameState.phase !== "build" || gameState.peeking) return;
  if ((gameState.tray[id] || 0) <= 0) return;
  gameState.selectedIngredient = gameState.selectedIngredient === id ? null : id;
  syncTrayUI();
  playSound("select");
}

function onPizzaClick(e, pizzaIndex) {
  if (gameState.phase !== "build" || gameState.peeking) return;
  if (e.target.closest(".pz-topping")) return;
  setActivePizza(pizzaIndex);
  const type = gameState.selectedIngredient;
  if (!type || (gameState.tray[type] || 0) <= 0) return;

  const pz = gameState.pizzas[pizzaIndex];
  const rect = pz.pizzaEl.getBoundingClientRect();
  const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
  const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
  placeTopping(pizzaIndex, type, nx, ny);
}

function clampToDisk(x, y) {
  const d = Math.hypot(x, y);
  if (d <= CONFIG.MAX_R) return { x, y };
  const k = CONFIG.MAX_R / d;
  return { x: x * k, y: y * k };
}

function placeTopping(pizzaIndex, type, nx, ny) {
  if ((gameState.tray[type] || 0) <= 0) return;
  const { x, y } = clampToDisk(nx, ny);
  const t = { id: toppingIdCounter++, type, x: +x.toFixed(3), y: +y.toFixed(3), rot: Math.round(rand(-14, 14)), scale: 1 };
  gameState.pizzas[pizzaIndex].player.push(t);
  gameState.undoStack.push({ pizzaIndex, toppingId: t.id, type });
  gameState.tray[type] = gameState.tray[type] - 1;
  gameState.stats.usage[type] = (gameState.stats.usage[type] || 0) + 1;

  renderPlayerPizza(pizzaIndex);
  const el = gameState.pizzas[pizzaIndex].toppingsEl.querySelector(`[data-topping-id="${t.id}"]`);
  if (el) el.classList.add("pz-topping--placing");

  autoSelectNext(type);
  syncTrayUI(type);
  updatePowerupButtons();
  playSound("place");
  vibrate(12);

  if (trayRemaining() === 0) {
    setHudState("Pode servir!");
    setCustomerState("happy", "Tá pronta? Manda!");
  }
}

function removeTopping(pizzaIndex, toppingId) {
  if (gameState.phase !== "build" || gameState.peeking) return;
  const pz = gameState.pizzas[pizzaIndex];
  const t = pz.player.find(x => x.id === toppingId);
  if (!t) return;
  pz.player = pz.player.filter(x => x.id !== toppingId);
  gameState.undoStack = gameState.undoStack.filter(u => u.toppingId !== toppingId);
  // o intruso da "Sabotagem" não volta pra bandeja — ele nunca foi seu
  if (!t.decoy) {
    gameState.tray[t.type] = (gameState.tray[t.type] || 0) + 1;
    gameState.stats.usage[t.type] = Math.max(0, (gameState.stats.usage[t.type] || 0) - 1);
  } else {
    floatPopup("intruso fora!", pizzaIndex, t, false);
  }
  renderPlayerPizza(pizzaIndex);
  autoSelectNext(t.decoy ? gameState.selectedIngredient : t.type);
  syncTrayUI(t.decoy ? null : t.type);
  updatePowerupButtons();
  setHudState("Monte!");
  playSound("remove");
}

function undoLast() {
  if (gameState.phase !== "build" || gameState.peeking || gameState.undoStack.length === 0) return;
  const last = gameState.undoStack.pop();
  gameState.usedUndo = true;
  removeTopping(last.pizzaIndex, last.toppingId);
}

/* ── ARRASTAR ──────────────────────────────────────────── */
const DRAG_THRESHOLD = 7;
let dragState = null;

function startDrag(e, ingId) {
  if (gameState.phase !== "build" || gameState.peeking) return;
  if ((gameState.tray[ingId] || 0) <= 0) return;
  dragState = { ingId, startX: e.clientX, startY: e.clientY, moved: false };
}

function onDragMove(e) {
  if (!dragState) return;
  const dx = e.clientX - dragState.startX, dy = e.clientY - dragState.startY;
  if (!dragState.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    dragState.moved = true;
    const ing = ING_BY_ID[dragState.ingId];
    dom.dragGhost.style.backgroundImage = `url('${IMG}${ing.img}')`;
    dom.dragGhost.hidden = false;
    gameState.selectedIngredient = dragState.ingId;
    syncTrayUI();
  }
  if (dragState.moved) {
    dom.dragGhost.style.left = e.clientX + "px";
    dom.dragGhost.style.top = e.clientY + "px";
    e.preventDefault();
  }
}

function onDragEnd(e) {
  if (!dragState) return;
  const { ingId, moved } = dragState;
  dragState = null;
  dom.dragGhost.hidden = true;
  if (gameState.phase !== "build" || gameState.peeking) return;

  if (!moved) { selectIngredient(ingId); return; }

  const el = document.elementFromPoint(e.clientX, e.clientY);
  const board = el && el.closest(".pz-board");
  if (!board) return;
  const idx = parseInt(board.dataset.idx, 10);
  const pz = gameState.pizzas[idx];
  if (!pz) return;
  const rect = pz.pizzaEl.getBoundingClientRect();
  const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
  const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
  setActivePizza(idx);
  placeTopping(idx, ingId, nx, ny);
}

/* ══════════════════════════════════════════════════════════
   PONTUAÇÃO — só posição, e de bom coração.
   A bandeja garante tipo e quantidade certos; o que resta
   avaliar é o quão perto de cada alvo o jogador chegou.
══════════════════════════════════════════════════════════ */
function positionScore(d, close, far) {
  close = close != null ? close : CONFIG.CLOSE_DIST;
  far = far != null ? far : CONFIG.FAR_DIST;
  if (d <= close) return 100;
  if (d >= far) return 0;
  const t = (d - close) / (far - close);
  return 100 * Math.pow(1 - t, CONFIG.FALLOFF);
}

// Casamento guloso global entre alvos e toppings do jogador do mesmo tipo:
// do par mais próximo pro mais distante, cada um usado uma vez só.
function matchToppings(target, player) {
  const pairs = [];
  target.forEach(mt => player.forEach(pt => {
    if (pt.type === mt.type && !pt.decoy) {
      pairs.push({ mt, pt, d: Math.hypot(mt.x - pt.x, mt.y - pt.y) });
    }
  }));
  pairs.sort((a, b) => a.d - b.d);
  const usedT = new Set(), usedP = new Set();
  const matched = [];
  pairs.forEach(({ mt, pt, d }) => {
    if (usedT.has(mt.id) || usedP.has(pt.id)) return;
    usedT.add(mt.id); usedP.add(pt.id);
    matched.push({ mt, pt, d, score: 0 });
  });
  return { matched, missed: target.filter(mt => !usedT.has(mt.id)), extras: player.filter(pt => !usedP.has(pt.id)) };
}

function scorePizza(target, player, tol) {
  const close = tol && tol.close, far = tol && tol.far;
  const { matched, missed, extras } = matchToppings(target, player);
  matched.forEach(m => { m.score = positionScore(m.d, close, far); });

  const sum = matched.reduce((s, m) => s + m.score, 0);
  const posAvg = target.length === 0 ? 100 : sum / target.length;

  // Intrusos deixados na pizza (variante "Sabotagem") custam pouco
  const decoyLeft = player.filter(p => p.decoy).length;
  let nota = posAvg * CONFIG.SCORE_BOOST_MUL + CONFIG.SCORE_BOOST_ADD;
  nota -= decoyLeft * 12;
  nota = Math.max(0, Math.min(100, Math.round(nota)));

  return { nota, matched, missed, extras, decoyLeft, posAvg };
}

/* ══════════════════════════════════════════════════════════
   SERVIR
══════════════════════════════════════════════════════════ */
function servePizza(auto) {
  if (gameState.phase !== "build" || gameState.peeking) return;
  gameState.phase = "judging";
  clearInterval(gameState.timer);
  setIngredientsInteractive(false);
  setActionsInteractive(false);
  dom.btnServe.classList.remove("is-ready");
  dom.customerAvatar.classList.remove("is-impatient");
  playSound("serve");
  vibrate(30);
  setHudState(auto ? "Tempo!" : "Servindo...");

  const elapsed = (performance.now() - gameState.buildStart) / 1000;
  const tol = gameState.variant === "exigente"
    ? { close: CONFIG.CLOSE_DIST * 0.72, far: CONFIG.FAR_DIST * 0.85 }
    : null;

  const results = gameState.pizzas.map(pz => scorePizza(pz.target, pz.player, tol));
  const nota = Math.round(results.reduce((s, r) => s + r.nota, 0) / results.length);

  showJudging(results);
  setTimeout(() => finishRound(nota, results, elapsed, auto), 1650);
}

// Mostra o gabarito fantasma + o quão perto cada peça ficou.
// É o momento "ahhh, era ali" — o feedback que ensina sem punir.
function showJudging(results) {
  gameState.pizzas.forEach((pz, i) => {
    const r = results[i];
    pz.toppingsEl.innerHTML = "";
    pz.pizzaEl.classList.remove("is-empty");

    pz.target.forEach(t => pz.toppingsEl.appendChild(createToppingEl(t, "pz-topping--ghost")));

    r.matched.forEach(({ mt, pt, score }, k) => {
      const cls = score >= 88 ? "pz-judge-good" : score >= 50 ? "pz-judge-ok" : "pz-judge-miss";
      if (score < 96) {
        const a = toppingPct(pt.x, pt.y), b = toppingPct(mt.x, mt.y);
        const dx = b.left - a.left, dy = b.top - a.top;
        const line = document.createElement("div");
        line.className = "pz-judge-line " + cls;
        line.style.left = a.left + "%";
        line.style.top = a.top + "%";
        line.style.width = Math.hypot(dx, dy) + "%";
        line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
        pz.toppingsEl.appendChild(line);
      }
      const el = createToppingEl(pt, `pz-topping--judge ${cls}`);
      el.style.animationDelay = (k * 0.04) + "s";
      pz.toppingsEl.appendChild(el);
    });

    r.extras.forEach(pt => {
      pz.toppingsEl.appendChild(createToppingEl(pt, "pz-topping--judge pz-judge-miss"));
    });

    const acertos = r.matched.filter(m => m.score >= 88).length;
    if (acertos > 0) floatPopup(`${acertos} no ponto`, i, { x: 0, y: -0.75 }, false);
  });
}

function finishRound(nota, results, elapsed, auto) {
  const passed = nota >= CONFIG.PASS_NOTE;
  const great = nota >= CONFIG.GREAT_NOTE;
  const perfect = nota >= CONFIG.PERFECT_NOTE;

  if (!passed) return handleAngry(nota);

  gameState.stats.servidas++;
  if (perfect) gameState.stats.perfeitas++;
  else if (great) gameState.stats.otimas++;

  // ── pontos ──
  const base = nota * 60;
  const bonusRound = gameState.round * 200;
  const bonusTier = perfect ? 4000 : great ? 2000 : 0;
  const bonusNoUndo = gameState.usedUndo ? 0 : 400;
  const leftover = Math.max(0, Math.min(1, 1 - elapsed / gameState.buildBudget));
  const bonusSpeed = auto ? 0 : Math.round(leftover * 1200);
  const bonusChaos = Math.round(gameState.shift.chaos * 350);

  let subtotal = base + bonusRound + bonusTier + bonusNoUndo + bonusSpeed + bonusChaos;

  const breakdown = [
    { label: "Nota da pizza", value: base },
    { label: "Bônus de rodada", value: bonusRound },
    bonusTier ? { label: perfect ? "Pizza perfeita" : "Pizza ótima", value: bonusTier, bonus: true } : null,
    bonusNoUndo ? { label: "Sem desfazer", value: bonusNoUndo, bonus: true } : null,
    bonusSpeed ? { label: "Rapidez", value: bonusSpeed, bonus: true } : null,
    bonusChaos ? { label: "Aguentou o caos", value: bonusChaos, bonus: true } : null,
  ].filter(Boolean);

  // variante especial
  if (gameState.variant) {
    const v = VARIANTS[gameState.variant];
    const extra = Math.round(subtotal * v.bonus);
    breakdown.push({ label: `${v.label} · +${Math.round(v.bonus * 100)}%`, value: extra, bonus: true });
    subtotal += extra;
  }

  // combo
  gameState.combo++;
  const mult = comboMultiplier();
  if (mult > 1) {
    const extra = Math.round(subtotal * (mult - 1));
    breakdown.push({ label: `${comboName()} · x${Number.isInteger(mult) ? mult : mult.toFixed(1)}`, value: extra, bonus: true });
    subtotal += extra;
    playSound("combo");
  }

  const points = Math.round(subtotal);
  gameState.score += points;

  // vida bônus por sequência de pizzas ótimas
  if (great) {
    gameState.greatStreak++;
    if (gameState.greatStreak >= CONFIG.GREAT_STREAK_FOR_LIFE && gameState.lives < CONFIG.MAX_LIVES) {
      gameState.lives++;
      gameState.greatStreak = 0;
      breakdown.push({ label: "Sequência incrível — vida extra!", value: "+1 vida", bonus: true });
      setTimeout(() => { playSound("vida"); vibrate([20, 20, 20]); }, 350);
    }
  } else {
    gameState.greatStreak = 0;
  }

  saveHighScoreIfNeeded();
  updateHUD(true);
  floatPopup("+" + points.toLocaleString("pt-BR"), 0, { x: 0, y: 0 }, true);

  const tier = perfect ? "perfeita" : great ? "otima" : nota >= 62 ? "boa" : "neutra";
  const mood = perfect || great ? "great" : nota >= 62 ? "happy" : "neutral";
  setCustomerState(mood, pick(CUSTOMER_MESSAGES[tier]));

  if (great) {
    launchConfetti(perfect ? 130 : 70);
    playSound(perfect ? "perfeita" : "otima");
    vibrate(perfect ? [25, 25, 25, 25] : [35, 25]);
    gameState.pizzas.forEach(pz => pz.pizzaEl.classList.toggle("is-glow", perfect));
  }

  dom.resultKicker.textContent = perfect ? "Obra de arte" : great ? "Excelente" : nota >= 62 ? "Boa pizza" : "Passou raspando";
  dom.resultTitle.textContent = perfect ? "Idêntica à original!" : great ? "Que capricho!" : nota >= 62 ? "Ficou gostosa!" : "Quase não deu...";
  dom.resultNote.textContent = String(nota);
  dom.resultRingFill.style.strokeDashoffset = String(327 * (1 - nota / 100));
  dom.resultRingFill.style.stroke = perfect ? "#FFD54A" : great ? "#3F8A4C" : nota >= 62 ? "#8EAD7B" : "#C7653A";

  dom.resultBreakdown.innerHTML = breakdown.map((b, i) =>
    `<div class="pz-score-breakdown__row" style="animation-delay:${i * 0.05}s"><span>${b.label}</span><strong class="${b.bonus ? "pz-score-breakdown__bonus" : ""}">${b.bonus ? "+" : ""}${typeof b.value === "number" ? b.value.toLocaleString("pt-BR") : b.value}</strong></div>`
  ).join("");
  dom.resultPoints.textContent = points.toLocaleString("pt-BR");
  dom.btnNext.textContent = "Próximo pedido";

  setTimeout(() => { dom.ovResult.hidden = false; }, 300);
}

function handleAngry(nota) {
  gameState.lives--;
  gameState.combo = 0;
  gameState.greatStreak = 0;
  updateHUD();
  playSound("bravo");
  vibrate([60, 40, 60]);
  dom.stage.classList.add("is-shaking");
  setTimeout(() => dom.stage.classList.remove("is-shaking"), 420);
  setCustomerState("angry", pick(CUSTOMER_MESSAGES.brava));

  dom.angryTitle.textContent = pick(CUSTOMER_MESSAGES.brava);
  dom.angrySub.textContent = gameState.lives > 0
    ? `Nota ${nota}. Você perdeu uma vida — mas a pizza vem nova.`
    : `Nota ${nota}. Era sua última vida...`;
  dom.angryLives.innerHTML = Array.from({ length: Math.max(CONFIG.START_LIVES, gameState.lives) })
    .map((_, i) => `<span class="pz-life${i < gameState.lives ? "" : " is-lost"}"></span>`).join("");

  if (gameState.lives <= 0) setTimeout(showGameOver, 900);
  else setTimeout(() => { dom.ovAngry.hidden = false; }, 400);
}

/* ══════════════════════════════════════════════════════════
   GAME OVER
══════════════════════════════════════════════════════════ */
function favoriteIngredient() {
  const usage = gameState.stats.usage;
  const ids = Object.keys(usage).filter(k => usage[k] > 0);
  if (!ids.length) return "—";
  ids.sort((a, b) => usage[b] - usage[a]);
  return ING_BY_ID[ids[0]] ? ING_BY_ID[ids[0]].nome : "—";
}

function showGameOver() {
  gameState.phase = "gameover";
  clearInterval(gameState.timer);
  clearInterval(gameState.flyerTimer);
  playSound("gameover");
  vibrate([80, 50, 80, 50, 120]);
  const isNew = saveHighScoreIfNeeded();
  if (isNew) launchConfetti(90);

  dom.gameoverScore.textContent = gameState.score.toLocaleString("pt-BR");
  dom.gameoverNewbest.hidden = !isNew;
  dom.gameoverStats.innerHTML = `
    <div class="pz-final-stats__row"><span>Recorde</span><strong>${gameState.highScore.toLocaleString("pt-BR")}</strong></div>
    <div class="pz-final-stats__row"><span>Pizzas servidas</span><strong>${gameState.stats.servidas}</strong></div>
    <div class="pz-final-stats__row"><span>Pizzas perfeitas</span><strong>${gameState.stats.perfeitas}</strong></div>
    <div class="pz-final-stats__row"><span>Turno alcançado</span><strong>${gameState.shift.name}</strong></div>
    <div class="pz-final-stats__row"><span>Ingrediente favorito</span><strong>${favoriteIngredient()}</strong></div>
  `;
  dom.ovAngry.hidden = true;
  dom.ovGameover.hidden = false;
  updateHUD();
}

/* ══════════════════════════════════════════════════════════
   START
══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", initGame);

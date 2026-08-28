/* Banco de testes headless da "Mira do Casamento".
   Roda o jogo de verdade (mesmo arquivo do site) num DOM falso, com relógio
   virtual e Matter.js de verdade, e joga com um bot que mira nos presentes.
   Objetivo: garantir que nenhuma fase é impossível e que não há erro de
   runtime em nenhum caminho do jogo. */
const fs = require("fs");
const path = require("path");
const Matter = require("matter-js");

const GAME_JS = process.argv[2];

/* PRNG determinístico: o jogo usa Math.random em vários lugares (direção do
   foguete, cara sorteada, ângulo de giro). Sem semente fixa, dois runs do
   banco de testes dão resultados diferentes e fica impossível investigar. */
let seed = Number(process.env.WGL_SEED || 12345);
Math.random = function () {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

/* ── Relógio virtual + fila de timers ──────────────────────────────── */
let vnow = 0;
let timerId = 1;
let timers = [];
global.setTimeout = function (fn, ms) { const id = timerId++; timers.push({ id, at: vnow + (ms || 0), fn }); return id; };
global.clearTimeout = function (id) { timers = timers.filter(t => t.id !== id); };
global.setInterval = function () { return 0; };
global.clearInterval = function () {};
global.performance = { now: () => vnow };

function runDueTimers() {
  for (let guard = 0; guard < 500; guard++) {
    const due = timers.filter(t => t.at <= vnow).sort((a, b) => a.at - b.at);
    if (!due.length) return;
    const t = due[0];
    timers = timers.filter(x => x !== t);
    t.fn();
  }
}

/* ── DOM falso ─────────────────────────────────────────────────────── */
const noop = () => {};
/* Contexto 2D falso que CONFERE os argumentos: um NaN/Infinity numa
   coordenada não dá erro no canvas de verdade — o desenho simplesmente não
   aparece, e o bug passa despercebido. Aqui ele vira relatório.
   Também conta chamadas por tipo, pra dar pra ver que cada camada da cena
   (céu, colinas, chão, corpos, partículas) realmente desenhou algo. */
const drawStats = { calls: 0, byMethod: {}, bad: [] };
function ctxStub() {
  const grad = { addColorStop: noop };
  const c = {};
  ["clearRect","fillRect","strokeRect","beginPath","closePath","moveTo","lineTo","arc","ellipse",
   "quadraticCurveTo","bezierCurveTo","fill","stroke","save","restore","translate","rotate","scale",
   "setTransform","clip","drawImage","fillText","strokeText","roundRect","rect","arcTo"].forEach(m => {
    c[m] = function (...args) {
      drawStats.calls++;
      drawStats.byMethod[m] = (drawStats.byMethod[m] || 0) + 1;
      for (const a of args) {
        if (typeof a === "number" && !Number.isFinite(a) && drawStats.bad.length < 8) {
          drawStats.bad.push(m + "(" + args.join(", ") + ")");
          break;
        }
      }
    };
  });
  c.createLinearGradient = () => grad;
  c.createRadialGradient = () => grad;
  c.createPattern = () => null;
  c.measureText = () => ({ width: 10 });
  return c;
}

function makeEl(id) {
  const handlers = {};
  const el = {
    id, hidden: false, textContent: "", innerHTML: "", value: "",
    style: { cssText: "", setProperty: noop },
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    dataset: {}, children: [], offsetWidth: 100,
    addEventListener: (t, f) => { (handlers[t] = handlers[t] || []).push(f); },
    removeEventListener: noop,
    appendChild: (c) => { el.children.push(c); return c; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1600, height: 900 }),
    getContext: () => ctxStub(),
    _fire: (t, ev) => (handlers[t] || []).forEach(f => f(ev || {})),
    _handlers: handlers,
  };
  return el;
}

const els = {};
function getEl(id) { return (els[id] = els[id] || makeEl(id)); }

global.document = {
  readyState: "complete",
  getElementById: getEl,
  querySelectorAll: () => [],
  createElement: () => makeEl("created"),
  addEventListener: noop,
  body: makeEl("body"),
};

const winHandlers = {};
global.window = {
  addEventListener: (t, f) => { (winHandlers[t] = winHandlers[t] || []).push(f); },
  removeEventListener: noop,
  devicePixelRatio: 1,
  AudioContext: null,
  visualViewport: null,
  fire: (t, ev) => (winHandlers[t] || []).forEach(f => f(ev || {})),
};
global.navigator = { vibrate: noop };
global.localStorage = { getItem: () => null, setItem: noop };
global.Image = function () { this.src = ""; };
global.console.debug = noop;

let rafCb = null;
global.requestAnimationFrame = function (cb) { rafCb = cb; return 1; };
global.window.requestAnimationFrame = global.requestAnimationFrame;

/* ── Matter instrumentado: captura o engine criado pelo jogo ───────── */
let ENGINE = null;
const realCreate = Matter.Engine.create;
Matter.Engine.create = function (opts) { const e = realCreate.call(Matter.Engine, opts); ENGINE = e; return e; };
global.Matter = Matter;

/* ── Carrega o jogo ────────────────────────────────────────────────── */
const src = fs.readFileSync(GAME_JS, "utf8");
const errors = [];
try {
  // eslint-disable-next-line no-new-func
  new Function("window", "document", "navigator", "localStorage", "Matter", "performance",
               "requestAnimationFrame", "setTimeout", "clearTimeout", "Image", "console",
    src.replace('if (document.readyState === "loading") {',
        'window.__probe = { zoom: currentZoom, game: Game, cam: Camera };\nif (document.readyState === "loading") {')
      + "\n//# sourceURL=game.js"
  )(global.window, global.document, global.navigator, global.localStorage, Matter, global.performance,
    global.requestAnimationFrame, global.setTimeout, global.clearTimeout, global.Image, console);
} catch (e) {
  console.error("ERRO ao carregar o jogo:", e);
  process.exit(1);
}

/* ── Utilidades do bot ─────────────────────────────────────────────── */
const VIEW_W = 1600, VIEW_H = 900, GROUND_H = 90;
const SLING_Y_OFFSET = 200, MAX_DRAG = 180, FORCE_MULT = 0.185, MAX_SPEED = 33;
const STEP_MS = 1000 / 60;
const GRAV_STEP = 1.9 * 0.001 * STEP_MS * STEP_MS;
const AIR = 1 - 0.0002;

/* O canvas desenha com zoom por fase, então o ponto onde o "dedo" toca
   (coordenada de tela) não é o ponto do mundo. Como Camera.x/y são 0 no
   momento de mirar (slingX 230 fica antes do limite esquerdo), a conversão
   é só uma escala em torno do centro da tela. O zoom de cada fase é lido
   direto do código-fonte do jogo — é gambiarra de banco de testes, não do
   jogo. */
const ZOOMS = (function () {
  const out = [];
  const re = /lvl\((\d+),\s*\{([\s\S]*?)\n\}\)/g;
  let m;
  while ((m = re.exec(src))) {
    const zm = /zoom:\s*([\d.]+)/.exec(m[2]);
    out[Number(m[1])] = zm ? Number(zm[1]) : 1;
  }
  return out;
})();
function currentZoom() {
  if (global.window.__probe) return global.window.__probe.zoom();
  const lvl = Number(els["hud-level"].textContent) || 1;
  return ZOOMS[lvl] || 1;
}
/* A conversão precisa desfazer o MESMO que o jogo faz: zoom em torno do
   centro E o pan da câmera. Ignorar a câmera funcionava nas fases estreitas
   (onde ela fica em zero) e fazia o "dedo" errar o estilingue nas largas —
   o bot ficava atirando sem que o arremesso saísse. */
function worldToClient(wx, wy) {
  const z = currentZoom();
  const cam = global.window.__probe ? global.window.__probe.cam : { x: 0, y: 0 };
  return {
    x: (wx - cam.x - VIEW_W / 2) * z + VIEW_W / 2,
    y: (wy - cam.y - VIEW_H / 2) * z + VIEW_H / 2,
  };
}

function bodies() { return ENGINE ? Matter.Composite.allBodies(ENGINE.world) : []; }
function gifts() { return bodies().filter(b => b.wglGift && !b.wglGift.destroyed); }
function balloons() { return bodies().filter(b => b.wglBalloon && !b.wglBalloon.popped); }
function projectile() { return bodies().find(b => b.label === "wgl-projectile" && b.isStatic); }
function slingX() {
  // o estilingue fica sempre em slingX do nível; todos os níveis usam 230
  return 230;
}

/* Simula o voo do projétil com a mesma fórmula da prévia do jogo e mede a
   menor distância até algum alvo. Serve pra escolher o melhor arremesso. */
function simulate(vx, vy, targets) {
  let x = slingX(), y = VIEW_H - GROUND_H - SLING_Y_OFFSET, cvx = vx, cvy = vy;
  let best = Infinity;
  for (let i = 0; i < 260; i++) {
    cvx *= AIR; cvy = cvy * AIR + GRAV_STEP;
    x += cvx; y += cvy;
    if (y > VIEW_H - GROUND_H) break;
    if (x > 3200) break;
    for (const t of targets) {
      const d = Math.hypot(t.x - x, t.y - y);
      if (d < best) best = d;
    }
  }
  return best;
}

function bestShot() {
  const targets = gifts().map(b => ({ x: b.position.x, y: b.position.y }))
    .concat(balloons().map(b => ({ x: b.position.x, y: b.position.y })))
    .concat(bodies().filter(b => b.wglSpecial && !b.wglSpecial.spent).map(b => ({ x: b.position.x, y: b.position.y })));
  if (!targets.length) return null;
  let best = null;
  /* Ângulo da puxada, varrendo o círculo inteiro. Puxar pra ESQUERDA e pra
     BAIXO (cos<0, sin>0 em coordenadas de tela, com Y pra baixo) é o que
     lança pra cima e pra direita — que é o arco útil. */
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    for (let p = 0.45; p <= 1.0001; p += 0.05) {
      const d = MAX_DRAG * p;
      const dragX = slingX() + Math.cos(a) * d;
      const dragY = (VIEW_H - GROUND_H - SLING_Y_OFFSET) + Math.sin(a) * d;
      let vx = (slingX() - dragX) * FORCE_MULT;
      let vy = ((VIEW_H - GROUND_H - SLING_Y_OFFSET) - dragY) * FORCE_MULT;
      const sp = Math.hypot(vx, vy);
      if (sp > MAX_SPEED) { vx *= MAX_SPEED / sp; vy *= MAX_SPEED / sp; }
      const miss = simulate(vx, vy, targets);
      if (!best || miss < best.miss) best = { miss, dragX, dragY };
    }
  }
  return best;
}

/* Um arremesso: pointerdown no bolso, pointermove até a posição de puxada,
   pointerup. Exatamente o que um dedo faria. */
function shoot(dragX, dragY) {
  const canvas = getEl("wgl-canvas");
  const anchor = worldToClient(slingX(), VIEW_H - GROUND_H - SLING_Y_OFFSET);
  const drag = worldToClient(dragX, dragY);
  canvas._fire("pointerdown", { pointerId: 1, clientX: anchor.x, clientY: anchor.y, preventDefault: noop });
  global.window.fire("pointermove", { pointerId: 1, clientX: drag.x, clientY: drag.y, preventDefault: noop });
  global.window.fire("pointerup", { pointerId: 1, clientX: drag.x, clientY: drag.y, preventDefault: noop });
}

function tick(n) {
  for (let i = 0; i < n; i++) {
    vnow += 16.667;
    runDueTimers();
    if (rafCb) {
      try { rafCb(vnow); } catch (e) { errors.push(e); throw e; }
    }
  }
}

function overlayVisible(id) { return els[id] && els[id].hidden === false; }
function click(id) { getEl(id)._fire("click", {}); }

/* ── Playthrough ───────────────────────────────────────────────────── */
console.log("Iniciando playthrough automático das 50 fases...\n");
click("btn-play");
tick(5);

const report = [];
let shotsThisLevel = 0;
let guard = 0;
let stuck = 0;
let reportedStuck = false;
let enteredEndless = false;
const ENDLESS_UNTIL = Number(process.env.WGL_ENDLESS || 60);

let seenLevel = 0;
while (guard++ < 20000) {
  if (overlayVisible("ov-final")) {
    // vitória nas 50: entra no Caos Infinito pra testar as fases geradas
    if (!enteredEndless && els["btn-endless"] && els["btn-endless"].hidden === false) {
      enteredEndless = true;
      click("btn-endless"); tick(5);
      continue;
    }
    break;
  }
  const nowLevel = Number(els["hud-level"].textContent);
  if (nowLevel !== seenLevel) { seenLevel = nowLevel; process.stdout.write("[" + nowLevel + "]"); }
  if (guard % 200 === 0) {
    console.log("\n  ...fase " + nowLevel + " arremessos=" + els["hud-throws"].textContent +
      " presentes=" + els["hud-gifts"].textContent + " projétil=" + (projectile() ? "sim" : "não") +
      " tiros=" + shotsThisLevel + " t=" + Math.round(vnow / 1000) + "s");
  }

  if (overlayVisible("ov-complete")) {
    const lvl = Number(els["hud-level"].textContent);
    if (lvl >= ENDLESS_UNTIL) { console.log("\nparou na fase "+lvl); break; }
    report.push({ level: lvl, ok: true, shots: shotsThisLevel, throwsLeft: Number(els["hud-throws"].textContent) });
    shotsThisLevel = 0;
    click("btn-continue");
    tick(5);
    continue;
  }
  if (overlayVisible("ov-fail")) {
    const lvl = Number(els["hud-level"].textContent);
    const left = gifts().map(g => g.wglGift.tier + "@" + Math.round(g.position.x) + "," + Math.round(g.position.y) +
      " hp" + g.wglGift.hp);
    console.log("  falhou fase " + lvl + " após " + shotsThisLevel + " tiros; sobrou: " + (left.join(" | ") || "nada"));
    report.push({ level: lvl, ok: false, shots: shotsThisLevel });
    shotsThisLevel = 0;
    click("btn-retry");
    tick(5);
    continue;
  }

  const p = projectile();
  if (p) {
    stuck = 0;
    /* WGL_DUMB=1 usa um bot que atira a esmo — serve pra exercitar os
       caminhos de fracasso: arremessos de brinde, tela de "tentar de novo",
       perda de vidas e fim de jogo. */
    const shot = process.env.WGL_DUMB
      ? (function () {
          const a = Math.PI * (0.55 + Math.random() * 0.4);
          const d = MAX_DRAG * (0.5 + Math.random() * 0.5);
          const ax = slingX(), ay = VIEW_H - GROUND_H - SLING_Y_OFFSET;
          return { miss: 0, dragX: ax + Math.cos(a) * d, dragY: ay - Math.sin(a) * d * -1 };
        })()
      : bestShot();
    if (!shot) { tick(30); continue; }
    if (process.env.WGL_DEBUG_LEVEL && els["hud-level"].textContent === process.env.WGL_DEBUG_LEVEL) {
      const bs = balloons().map(b => "balao@" + Math.round(b.position.x) + "," + Math.round(b.position.y));
      console.log("  tiro: erro previsto=" + shot.miss.toFixed(0) + "px, alvos=" +
        gifts().length + " presentes, " + bs.join("/"));
    }
    shoot(shot.dragX, shot.dragY);
    shotsThisLevel++;
    /* Rede de segurança do banco de testes: se o bot passou de 40 tiros na
       mesma fase, alguma coisa está presa (arremesso que não sai, fase que
       não termina). Melhor gritar do que rodar em círculo pra sempre. */
    if (shotsThisLevel > 40) {
      console.log("\nPRESO na fase " + els["hud-level"].textContent +
        ": " + shotsThisLevel + " tiros, arremessos=" + els["hud-throws"].textContent +
        ", presentes=" + els["hud-gifts"].textContent);
      break;
    }
    // deixa o arremesso voar e a bagunça assentar
    tick(420);
  } else {
    stuck++;
    if (stuck > 40 && !reportedStuck) {
      reportedStuck = true;
      const moving = bodies().filter(b => !b.isStatic && b.speed > 1.2)
        .map(b => (b.label || "?") + "(" + (b.wglBlock ? b.wglBlock.kind : "") + ") v=" + b.speed.toFixed(1));
      console.log("TRAVOU na fase " + els["hud-level"].textContent +
        " | arremessos restantes=" + els["hud-throws"].textContent +
        " | presentes=" + els["hud-gifts"].textContent +
        " | corpos em movimento=" + moving.length);
      console.log("  " + moving.slice(0, 12).join(", "));
      break;
    }
    tick(30);
  }
}

/* ── Resultado ─────────────────────────────────────────────────────── */
const failed = report.filter(r => !r.ok);
const cleared = new Set(report.filter(r => r.ok).map(r => r.level));
console.log("Fases concluídas: " + cleared.size + "/50");
console.log("Tentativas falhas: " + failed.length + (failed.length ? " (fases " + failed.map(f => f.level).join(", ") + ")" : ""));
if (els["final-score"]) {
  console.log("Pontuação final: " + els["final-score"].textContent);
  console.log("Vitória: " + (els["final-kicker"].textContent === "Parabéns!" ? "SIM" : "não"));
}
console.log("Erros de runtime: " + errors.length);
const missing = [];
for (let i = 1; i <= 50; i++) if (!cleared.has(i)) missing.push(i);
if (missing.length) console.log("Fases NÃO concluídas: " + missing.join(", "));

const ok = report.filter(r => r.ok);
if (ok.length) {
  const shots = ok.map(r => r.shots);
  const spare = ok.map(r => r.throwsLeft).filter(n => !isNaN(n));
  console.log("Tiros por fase: min " + Math.min(...shots) + " / média " +
    (shots.reduce((a, b) => a + b, 0) / shots.length).toFixed(1) + " / máx " + Math.max(...shots));
  if (spare.length) console.log("Arremessos sobrando ao vencer: média " +
    (spare.reduce((a, b) => a + b, 0) / spare.length).toFixed(1));
}
console.log("Chamadas de desenho: " + drawStats.calls.toLocaleString("pt-BR") +
  " (arc " + (drawStats.byMethod.arc || 0) + ", fill " + (drawStats.byMethod.fill || 0) +
  ", drawImage " + (drawStats.byMethod.drawImage || 0) + ")");
if (drawStats.bad.length) {
  console.log("COORDENADAS INVÁLIDAS no desenho (" + drawStats.bad.length + " amostras):");
  drawStats.bad.forEach(b => console.log("  " + b));
  process.exitCode = 1;
} else {
  console.log("Coordenadas de desenho: nenhuma inválida");
}

/* ── Caminhos de UI que o playthrough não cobre ────────────────────── */
console.log("\nTestando telas de pausa / reiniciar / jogar de novo...");
try {
  click("btn-playagain"); tick(3);
  if (els["ov-start"].hidden) throw new Error("'Jogar de novo' não voltou pra tela inicial");
  click("btn-play"); tick(10);
  getEl("wgl-pause-btn")._fire("click", {}); tick(3);
  if (els["ov-pause"].hidden) throw new Error("botão de pausa não abriu o overlay");
  click("btn-resume"); tick(3);
  if (!els["ov-pause"].hidden) throw new Error("'Continuar jogando' não fechou a pausa");
  getEl("wgl-pause-btn")._fire("click", {}); tick(3);
  click("btn-restart-run"); tick(10);
  if (els["hud-level"].textContent !== "1") throw new Error("'Reiniciar partida' não voltou pra fase 1");
  global.window.fire("keydown", { key: "p" }); tick(3);
  if (els["ov-pause"].hidden) throw new Error("tecla P não pausou");
  global.window.fire("keydown", { key: "p" }); tick(3);
  if (!els["ov-pause"].hidden) throw new Error("tecla P não despausou");
  global.window.fire("resize", {});
  global.window.fire("orientationchange", {}); tick(10);
  console.log("Telas de UI: OK");
} catch (e) {
  console.log("FALHA na UI: " + e.message);
  process.exitCode = 1;
}

if (els["final-stats"]) {
  console.log("Estatísticas finais: " + els["final-stats"].innerHTML
    .replace(/<div class="wgl-final-stat"><strong>/g, "\n  ")
    .replace(/<\/strong>/g, " = ").replace(/<\/div>/g, ""));
}

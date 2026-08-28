/* ══════════════════════════════════════════════════════════════════════════
   MIRA DO CASAMENTO — wedding-gift-launch.js
   Jogo de estilingue/física com tema de casamento (Tiago & Gian), feito com
   Matter.js. Sem backend, sem frameworks, roda direto no GitHub Pages (ou
   até localmente via file://).

   FILOSOFIA DE DESIGN (v2 — "mais caos que dificuldade"):
     · O jogo é DIVERTIDO antes de ser desafiador. Presentes são frágeis,
       arremessos sobram, pontuação é generosa e quase nunca dá pra travar
       numa fase. A curva de progressão é de CAOS (mais coisa explodindo,
       estruturas mais altas, mais reação em cadeia), não de precisão.
     · Todo objeto especial é um gerador de caos: TNT (explosão enorme em
       cadeia), foguete (sai voando e explode em fogos), champanhe (rolha
       estoura e a garrafa sai girando feito míssil), balão (segura presente
       no ar; estourou, tudo despenca), vidro (estilhaça em cacos físicos).
     · O "juice" importa: hit-stop, câmera tremendo, slow-motion nas cadeias
       grandes, ondas de choque, fumaça, faíscas, flash de tela.

   ÍNDICE (seções nomeadas, nessa ordem):
     1.  Config / constantes
     2.  Paleta
     3.  Assets (rostos dos noivos + ícones, com fallback desenhado)
     4.  Utilitários
     5.  DSL e definição das 50 fases
     6.  Materiais / tiers de presente
     7.  Setup do Matter.js
     8.  Fábrica de corpos físicos
     9.  Montagem da fase
     10. Objetos especiais (TNT, foguete, champanhe, balão, vidro)
     11. Explosões / efeitos de tela
     12. Áudio sintetizado (Web Audio API)
     13. Partículas / confete / textos flutuantes
     14. Pontuação / combo / medidor de caos
     15. Colisões
     16. Estado do jogo + HUD
     17. Input de mira
     18. Câmera
     19. Renderização
     20. Overlays (telas)
     21. Loop principal / boot
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";

/* Mostra um aviso visível na tela em vez de deixar o botão "Jogar" só ficar
   sem reagir — se o Matter.js não carregar (CDN bloqueado, sem internet no
   momento de abrir o arquivo local etc.) ou qualquer outro erro acontecer
   na inicialização, o motivo aparece aqui, não some em silêncio no console. */
function wglShowFatalError(msg) {
  try {
    if (document.getElementById("wgl-fatal")) return; // já tem um aviso na tela
    var stage = document.getElementById("wgl-stage") || document.body;
    var box = document.createElement("div");
    box.id = "wgl-fatal";
    box.style.cssText = "position:absolute;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;background:rgba(42,40,32,.94);color:#fff;text-align:center;padding:24px;font-family:sans-serif;";
    box.innerHTML = '<div style="max-width:360px"><p style="font-size:1.05rem;margin:0 0 .6rem">O jogo não conseguiu iniciar</p>' +
      '<p style="font-size:.8rem;opacity:.85;line-height:1.55;margin:0">' + msg + '</p></div>';
    stage.appendChild(box);
  } catch (e) { /* nem isso deu certo — não tem mais o que fazer */ }
}

(function(){

if (typeof Matter === "undefined") {
  wglShowFatalError("A biblioteca de física (Matter.js) não carregou — ela vem de um CDN externo (cdnjs.cloudflare.com). " +
    "Verifique sua conexão com a internet e recarregue a página.");
  return;
}

/* ══════════════════════════════════════════════════════════════════════
   1. CONFIG / CONSTANTES
   ══════════════════════════════════════════════════════════════════════ */
const CFG = {
  VIEW_W: 1600,              // resolução lógica da "câmera" (viewport), 16:9
  VIEW_H: 900,
  GROUND_H: 90,               // altura do chão, a partir da base do mundo
  /* Calibrado empiricamente rodando o Matter.js de verdade (fora do navegador,
     via Node) até o arco ficar parabólico e satisfatório. Todas as 50 fases
     são desenhadas com folga desse alcance máximo, pra nunca ter presente
     "quase impossível" de acertar. */
  GRAVITY_Y: 1.9,

  SLING_Y_OFFSET: 200,        // altura do bolso do estilingue acima do chão
  SLING_MAX_DRAG: 180,        // distância máxima de arrasto (px lógicos)
  /* Força um pouco maior que a v1: as estruturas agora são bem mais altas,
     então o arremesso precisa alcançar o topo delas com folga. */
  SLING_FORCE_MULT: 0.185,    // velocidade de lançamento = distância arrastada * isso
  SLING_MAX_LAUNCH_SPEED: 33, // trava de força máxima

  PROJECTILE_RADIUS: 32,
  /* Projétil "bomba" (liberado pelo medidor de caos): maior, mais pesado e
     explode ao encostar em qualquer coisa. É puro presente pro jogador. */
  BOOM_PROJECTILE_RADIUS: 40,

  CAMERA_FOLLOW_LERP: 0.09,   // suavização da câmera seguindo o projétil
  CAMERA_RETURN_LERP: 0.075,  // suavização da câmera voltando pro estilingue
  /* As torres finais passam de 800px de altura — sem a câmera subindo junto,
     o arremesso desaparecia pra fora da tela no meio do arco. */
  CAMERA_MAX_UP: 700,

  SETTLE_SPEED_THRESHOLD: 0.4,   // abaixo disso, corpo conta como "quase parado"
  SETTLE_FRAMES_NEEDED: 30,      // ~0.5s a 60fps parado antes de liberar o próximo arremesso
  NEXT_THROW_DELAY_MS: 420,
  MAX_FLIGHT_MS: 8000,           // segurança: nunca deixa um arremesso "pendurado" pra sempre

  /* Baixo de propósito: qualquer encostão decente já conta como impacto —
     continua bem acima do "tremor de acomodação" de um corpo assentando
     (~0.4, ver SETTLE_SPEED_THRESHOLD), então não conta toque de bandeja. */
  MIN_HIT_SPEED: 2.4,
  /* Explosivos exigem uma pancada bem mais forte que um presente. Um TNT
     que só assentou no chão, ou que levou um empurrãozinho de um bloco
     rolando, não pode detonar sozinho — a explosão tem que ser sempre
     consequência de uma escolha do jogador. */
  SPECIAL_HIT_SPEED: 6.0,
  BLOCK_FALL_ANGLE: 0.42,        // ~24°: acima disso o bloco é considerado "derrubado"

  /* ── Explosivos ─────────────────────────────────────────────────────
     Três níveis de estrago, todos com reação em cadeia entre si. */
  BOMB_RADIUS: 26,
  BOMB_BLAST_RADIUS: 280,
  BOMB_FORCE: 0.115,
  BOMB_GIFT_DESTROY_RADIUS: 170,

  TNT_BLAST_RADIUS: 400,         // barril de TNT: o caos em pessoa
  TNT_FORCE: 0.2,
  TNT_GIFT_DESTROY_RADIUS: 250,

  BOOM_BLAST_RADIUS: 330,        // explosão do projétil-bomba
  BOOM_FORCE: 0.155,
  BOOM_GIFT_DESTROY_RADIUS: 210,

  CHAIN_DELAY_MS: 85,            // atraso pra reação em cadeia entre explosivos

  /* ── Foguete de fogos ──────────────────────────────────────────────── */
  ROCKET_FUSE_MS: 260,           // tempo entre ser atingido e começar a voar
  ROCKET_THRUST_MS: 900,         // quanto tempo empurra
  ROCKET_THRUST: 0.0062,         // aceleração do empuxo (força/massa por passo)
  ROCKET_BLAST_RADIUS: 300,
  ROCKET_FORCE: 0.1,
  ROCKET_GIFT_DESTROY_RADIUS: 175,

  /* ── Champanhe ─────────────────────────────────────────────────────── */
  CHAMPAGNE_THRUST_MS: 1100,
  CHAMPAGNE_THRUST: 0.0044,

  /* ── Balão de gás ──────────────────────────────────────────────────── */
  BALLOON_POP_SPEED: 2.2,        // qualquer toquinho estoura

  TOTAL_LEVELS: 50,
  START_LIVES: 5,                // generoso: 5 vidas
  LIFE_LOST_PENALTY: 0,          // errar não tira ponto — só custa uma vida
  MERCY_THROWS: 2,               // arremessos extras de brinde quando acabam os normais
  HIGHSCORE_KEY: "wglHighScore_v2",

  COMBO_WINDOW_MS: 3000,         // janela larga: combo é fácil de manter
  COMBO_STEP: 0.5,
  COMBO_MAX_MULT: 5,

  /* Medidor de caos: enche destruindo coisas; cheio, o próximo arremesso vira
     um projétil-bomba. É a "sensação de progressão" do jogo. */
  CHAOS_GAIN: { gift: 0.2, block: 0.035, explosive: 0.3, shatter: 0.06 },
  CHAOS_DECAY_PER_LEVEL: 0.35,   // sobra parte do caos ao trocar de fase

  POINTS: {
    weak: 800,
    medium: 1200,
    strong: 1800,
    golden: 3000,
    special: 2200,
    blockMin: 120,
    blockMax: 320,
    bomb: 500,
    tnt: 900,
    rocket: 700,
    champagne: 450,
    balloon: 400,
    shatter: 250,
    unusedThrow: 3000,
    perfectLevel: 6000,
    chaosBonusPerLevel: 1500,    // bônus por terminar a fase com o medidor cheio
    /* Estrelas bônus: NÃO são necessárias pra passar de fase. Existem pra
       dar um segundo objetivo — dá pra terminar a fase no primeiro tiro, ou
       gastar arremessos caçando as estrelas escondidas em cantos difíceis.
       Valem muito, e pegar todas vale ainda mais. */
    star: 2500,
    starBig: 6000,
    allStars: 12000,
  },
};

/* ══════════════════════════════════════════════════════════════════════
   2. PALETA — mesmo espírito do site (creme / sálvia / terracota / dourado / rosa)
   ══════════════════════════════════════════════════════════════════════ */
const PALETTE = {
  skyTop: "#A9DCEC", skyMid: "#D7EDF0", skyBottom: "#EDF4E4",
  skyTopSunset: "#F0A868", skyMidSunset: "#F6C98B", skyBottomSunset: "#F9E7CC",
  skyTopNight: "#171A3C", skyMidNight: "#2E2F63", skyBottomNight: "#4A4477",
  hillFar: "#B7CFAE", hillFarNight: "#2B3550", hillFarSunset: "#D9A87E",
  hillNear: "#94B282", hillNearNight: "#222B41", hillNearSunset: "#C08A5E",
  groundTop: "#8FAE72", groundTopNight: "#455A40", groundTopSunset: "#A88F5E",
  groundSide: "#6C8B54", groundSideNight: "#2E3C2A", groundSideSunset: "#7E6942",
  groundDeep: "#5A7345", groundDeepNight: "#242E21", groundDeepSunset: "#68562F",
  grass: "#A8C68A", grassNight: "#587056", grassSunset: "#C0A46A",
  cloud: "rgba(255,255,255,.8)",
  slingWood: "#8A5A34", slingWoodDark: "#5E3C21", slingLeather: "#7A4A28",
  band: "#4F6B45",
  ink: "#2A2820",
  gold: "#D9B25C",
  terracotta: "#C46D28",
};

/* ══════════════════════════════════════════════════════════════════════
   3. ASSETS — rostos dos noivos (várias caras, sorteadas a cada arremesso
      pra dar variedade) + ícones do site. Se nada carregar, cai num
      fallback desenhado no canvas: o jogo nunca quebra por falta de asset.
   ══════════════════════════════════════════════════════════════════════ */
const HEAD_FILES = {
  gian:  ["gianface01.png","gianface02.png","gianface03.png","gianface04.png","gianface05.png","gianface06.png","gianface07.png"],
  tiago: ["tiagoface01.png","tiagoface02.png","tiagoface03.png","tiagoface04.png","tiagoface05.png","tiagoface06.png","tiagoface07.png"],
};
const headImages = { gian: [], tiago: [] };

function loadHeadImages() {
  Object.keys(HEAD_FILES).forEach(function (key) {
    HEAD_FILES[key].forEach(function (file) {
      const img = new Image();
      img.onload = function () { headImages[key].push(img); };
      img.onerror = function () { /* essa cara não existe — segue o baile */ };
      img.src = "assets/img/" + file;
    });
  });
}
function headImageFor(key, variant) {
  const list = headImages[key];
  if (!list || !list.length) return null;
  return list[variant % list.length];
}

/* ══════════════════════════════════════════════════════════════════════
   4. UTILITÁRIOS
   ══════════════════════════════════════════════════════════════════════ */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function choose(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
function fmtNum(n) { return Math.round(n).toLocaleString("pt-BR"); }

/* roundRect com fallback — Safari antigo não tem ctx.roundRect. */
function roundRectPath(c, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  if (c.roundRect) { c.beginPath(); c.roundRect(x, y, w, h, r); return; }
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function loadHighScore() {
  try { return Number(localStorage.getItem(CFG.HIGHSCORE_KEY)) || 0; } catch (e) { return 0; }
}
function saveHighScore(v) {
  try { localStorage.setItem(CFG.HIGHSCORE_KEY, String(Math.round(v))); } catch (e) { /* ignora */ }
}

/* ══════════════════════════════════════════════════════════════════════
   5. DSL DAS FASES
   Cada fase é configuração declarativa, não código espalhado. Adicionar
   uma fase nova é só acrescentar outra chamada lvl(...) na lista LEVELS.
   ══════════════════════════════════════════════════════════════════════ */

/* Bloco de estrutura: kind = material (ver BLOCK_KINDS), w/h em px lógicos,
   dx = deslocamento horizontal opcional dentro da própria torre. */
function B(kind, w, h, dx) { return { kind: kind, w: w, h: h || w, dx: dx || 0 }; }

/* Presente-alvo: tier = resistência/cor (ver GIFT_TIERS), shape = 'box'|'round'|'bag',
   size = 'sm'|'md'|'lg'|'tall'|'wide'. */
function G(tier, shape, size, dx) { return { tier: tier, shape: shape || "box", size: size || "md", dx: dx || 0 }; }

/* Torre: pilha de blocos (de baixo pra cima) + presente opcional no topo. */
function tower(x, blocks, topGift, base) {
  return { x: x, blocks: blocks || [], topGift: topGift || null, base: base === undefined ? "ground" : base };
}

/* Presente/bloco avulso, direto no chão (sem torre). */
function standGift(x, tier, shape, size) { return { x: x, tier: tier, shape: shape || "box", size: size || "md" }; }
function standBlock(x, kind, w, h, y) { return { x: x, kind: kind, w: w, h: h || w, y: y }; }

/* Atalhos pros objetos caóticos — todos são "blocos" com comportamento
   especial (ver BLOCK_KINDS / seção 10), então cabem em extraBlocks e
   também dentro de qualquer torre via B(). */
function TNT(x, y)   { return standBlock(x, "tnt", 60, 68, y); }
function ROCKET(x, y){ return standBlock(x, "rocket", 30, 96, y); }
function CHAMP(x, y) { return standBlock(x, "champagne", 40, 108, y); }
function GLASS(x, y) { return standBlock(x, "glass", 52, 52, y); }
function CAKE(x, y)  { return standBlock(x, "cake", 96, 66, y); }

/* "Ponte": plataforma fina apoiada em duas estacas, com presente em cima.
   O presente só cai se uma das estacas for derrubada — instável e
   estratégico, sem exigir força bruta. */
function bridge(xLeft, xRight, stakeH, gift) {
  return { xLeft: xLeft, xRight: xRight, stakeH: stakeH || 130, gift: gift || null };
}

/* Bomba avulsa. */
function standBomb(x, y) { return { x: x, y: y }; }

/* "Torre de casinhas" — pilares finos + viga formando molduras empilhadas,
   com um presente NO CHÃO de cada andar (dentro da moldura, nunca em cima
   de nada). Derrubar um pilar de qualquer andar derruba tudo acima: é a
   estrutura mais alta e mais satisfatória de desabar do jogo. */
function frameTower(x, levels, opts) {
  opts = opts || {};
  return {
    x: x,
    width: opts.width || 132,
    legH: opts.legH || 104,
    /* Pilar mais grosso e viga mais alta que a versão original: a torre
       precisa ser frágil ao ser ACERTADA, não ao existir. Poste fininho
       demais escorrega de baixo da carga sozinho. */
    postW: opts.postW || 26,
    beamH: opts.beamH || 22,
    levels: levels || [],  // array de { gift } ou { block } (de baixo pra cima)
    roof: opts.roof !== false,
  };
}

/* "Castelo de cartas" — duas estacas apoiadas em "A". Colapsa inteiro com
   um acerto em qualquer perna; o presente fica no chão, dentro do triângulo. */
function cardCastle(x, opts) {
  opts = opts || {};
  return { x: x, legH: opts.legH || 150, leanAngle: opts.leanAngle || 0.32, gift: opts.gift || null };
}

/* "Barreira" — fileira de estacas finas lado a lado, tipo paliçada. */
function wall(x, count, opts) {
  opts = opts || {};
  return { x: x, count: count || 4, height: opts.height || 130, postW: opts.postW || 22, gap: opts.gap || 5 };
}

/* "Balão de gás" — um balão flutuando a uma altura fixa segurando um
   presente por um fio. Estourou o balão, o presente despenca (e leva junto
   o que estiver embaixo). Física de verdade: o fio é um Constraint. */
function balloonGift(x, y, gift, opts) {
  opts = opts || {};
  return { x: x, y: y, gift: gift, ropeLen: opts.ropeLen || 78, radius: opts.radius || 42 };
}

/* Estrela bônus — corpo-sensor (não empurra nada, não é empurrada) que some
   e dá pontos quando QUALQUER coisa encosta nela: a cabeça arremessada, um
   caco de vidro voando, uma onda de choque. Fica em cantos que o caminho
   "óbvio" pra terminar a fase não passa, pra dar motivo de mirar melhor
   mesmo quando a fase já está ganha. */
function ST(x, y)  { return { x: x, y: y, big: false }; }
function STB(x, y) { return { x: x, y: y, big: true }; }

function lvl(id, opts) {
  return Object.assign({
    id: id,
    name: "Fase " + id,
    throws: 4,
    slingX: 230,
    towers: [],
    bridges: [],
    extraGifts: [],
    extraBlocks: [],
    bombs: [],
    walls: [],
    castles: [],
    frameTowers: [],
    balloons: [],
    stars: [],
    skyVariant: "day",
    zoom: 1,   // <1 = câmera mais longe (tudo menor), >1 = mais perto
  }, opts);
}

/* ── Atalhos de leitura pros presentes mais usados ─────────────────── */
const gW = function (s, d) { return G("weak", s || "box", d || "sm"); };
const gM = function (s, d) { return G("medium", s || "box", d || "md"); };
const gS = function (s, d) { return G("strong", s || "box", d || "md"); };
const gG = function (s, d) { return G("golden", s || "box", d || "md"); };
const gX = function (s, d) { return G("special", s || "round", d || "md"); };

/* ══════════════════════════════════════════════════════════════════════
   AS 50 FASES DESENHADAS À MÃO

   Curva de intensidade (decidida junto com o Gian, e é ela que manda em
   qualquer ajuste futuro de fase):

     1-5    tutorial de verdade — uma ideia nova por fase, nada de caos.
            Mira, dois alvos, moldura, TNT, castelo. Estruturas pequenas.
     6-9    os brinquedos restantes (foguete, balão, champanhe, ponte),
            estruturas médias, primeiras estrelas bônus.
     10-15  estruturas GRANDES: torres de 4-5 andares, duas por fase,
            paliçadas altas, dois ou três explosivos.
     16-19  maiores ainda, cadeias começando a valer a pena de propósito.
     20     ENORME — o marco: torre de 7 andares, várias estruturas juntas.
     21-24  gigantes + balões, tela começando a encher.
     25-30  tela CHEIA: 3+ torres altas, 3-5 balões, 4-6 explosivos, muitas
            estrelas espalhadas em cantos difíceis.
     31-50  caos total, escalando até a 50.

   Depois da 50 o jogo não acaba: generateLevel() cria fases infinitas
   partindo já do patamar da 50 e subindo (ver a seção do gerador).
   ══════════════════════════════════════════════════════════════════════ */
const LEVELS = [
/* ═══ 1-5: TUTORIAL — uma ideia por fase, sem pressa ═══ */
lvl(1, {
  name: "Primeira Mira", throws: 4, zoom: 1.14,
  towers: [ tower(800, [B("crate", 84)], gW("box", "md")) ],
}),
lvl(2, {
  name: "Dois de Uma Vez", throws: 4, zoom: 1.1,
  towers: [
    tower(770, [B("crate", 78)], gW("box", "sm")),
    tower(980, [B("crate", 78)], gW("round", "sm")),
  ],
}),
lvl(3, {
  name: "A Casinha", throws: 4, zoom: 1.06,
  // Primeira estrutura: derrubar um pilar derruba tudo que está em cima.
  frameTowers: [ frameTower(900, [ { gift: gW() }, { gift: gW("round") } ], { legH: 100 }) ],
}),
lvl(4, {
  name: "Isso Explode", throws: 4, zoom: 1.04,
  // Primeiro TNT, isolado e óbvio: dá pra ver a explosão sem confusão.
  frameTowers: [ frameTower(930, [ { gift: gW() }, { gift: gM("round") } ], { legH: 100 }) ],
  extraBlocks: [ TNT(1080) ],
  extraGifts: [ standGift(1190, "weak", "round", "sm") ],
}),
lvl(5, {
  name: "Estrela da Sorte", throws: 4, zoom: 1.02,
  // Primeira estrela bônus, num lugar fácil, só pra ensinar que ela existe.
  castles: [ cardCastle(880, { legH: 150, gift: gM() }) ],
  extraGifts: [ standGift(1080, "weak", "round", "sm") ],
  extraBlocks: [ GLASS(980) ],
  stars: [ ST(1080, 400) ],
}),

/* ═══ 6-9: os brinquedos que faltam, estruturas médias ═══ */
lvl(6, {
  name: "Foguete na Festa", throws: 5,
  walls: [ wall(860, 4, { height: 140 }) ],
  extraBlocks: [ ROCKET(980) ],
  frameTowers: [ frameTower(1180, [ { gift: gM() }, { gift: gM("round") }, { gift: gS() } ], { legH: 98 }) ],
  stars: [ ST(1080, 330) ],
}),
lvl(7, {
  name: "Balão de Noiva", throws: 5,
  balloons: [ balloonGift(960, 400, gM("round")) ],
  frameTowers: [ frameTower(1220, [ { gift: gW() }, { gift: gM("round") }, { gift: gM() } ], { legH: 98 }) ],
  extraBlocks: [ CHAMP(1080) ],
  stars: [ ST(760, 300), ST(1400, 420) ],
}),
lvl(8, {
  name: "A Ponte do Brinde", throws: 5,
  bridges: [ bridge(880, 1040, 170, gM("box", "wide")) ],
  extraBlocks: [ CHAMP(760), GLASS(1160), TNT(1260) ],
  extraGifts: [ standGift(1380, "medium", "round", "sm") ],
  stars: [ ST(960, 300), ST(1300, 260) ],
}),
lvl(9, {
  name: "Sobrado de Quatro", throws: 5, zoom: 0.98,
  frameTowers: [ frameTower(960, [ { gift: gW() }, { gift: gM("round") }, { gift: gS() }, { gift: gM("round") } ], { legH: 98 }) ],
  extraBlocks: [ TNT(1180), CAKE(1300) ],
  stars: [ ST(880, 230), ST(1240, 380) ],
}),

/* ═══ 10-15: ESTRUTURAS GRANDES — duas torres altas por fase ═══ */
lvl(10, {
  name: "Duas Torres", throws: 6, zoom: 0.9,
  frameTowers: [
    frameTower(900,  [ { gift: gW() }, { gift: gM("round") }, { gift: gS() }, { gift: gM("round") } ], { legH: 96 }),
    frameTower(1240, [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { gift: gS("round") } ], { legH: 96 }),
  ],
  extraBlocks: [ TNT(1070), ROCKET(760) ],
  stars: [ ST(1070, 240), ST(760, 380), ST(1420, 300) ],
}),
lvl(11, {
  name: "Muralha e Sobrado", throws: 6, zoom: 0.88,
  walls: [ wall(820, 6, { height: 190 }) ],
  frameTowers: [ frameTower(1120, [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { gift: gS() }, { gift: gM("round") } ], { legH: 94 }) ],
  extraBlocks: [ TNT(980), CHAMP(1360), GLASS(1440) ],
  stars: [ ST(960, 260), ST(1300, 200), ST(1480, 420) ],
}),
lvl(12, {
  name: "Bolo de Cinco Andares", throws: 6, zoom: 0.88,
  frameTowers: [ frameTower(1000, [
    { gift: gM() }, { block: B("cake", 96, 66) }, { gift: gS("round") },
    { block: B("cake", 96, 66) }, { gift: gG() },
  ], { legH: 94 }) ],
  extraBlocks: [ standBlock(800, "spring", 78, 36), TNT(1220), ROCKET(1320) ],
  extraGifts: [ standGift(1440, "medium", "round", "sm") ],
  stars: [ ST(1000, 180), ST(830, 340), ST(1380, 300) ],
}),
lvl(13, {
  name: "Vila de Três", throws: 6, zoom: 0.86,
  frameTowers: [
    frameTower(880,  [ { gift: gW() }, { gift: gM("round") }, { gift: gS() } ], { legH: 96 }),
    frameTower(1140, [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { gift: gM("round") } ], { legH: 96 }),
    frameTower(1400, [ { gift: gS() }, { gift: gG("round") }, { gift: gS() } ], { legH: 96 }),
  ],
  extraBlocks: [ TNT(1010), TNT(1270) ],
  stars: [ ST(1010, 220), ST(1270, 200), ST(1540, 380) ],
}),
lvl(14, {
  name: "Noite de Castelos", throws: 6, skyVariant: "night", zoom: 0.88,
  castles: [
    cardCastle(860,  { legH: 155, gift: gM() }),
    cardCastle(1080, { legH: 158, gift: gS() }),
    cardCastle(1300, { legH: 158, gift: gG() }),
  ],
  extraBlocks: [ TNT(970), TNT(1190), ROCKET(1420) ],
  extraGifts: [ standGift(1520, "special", "round", "sm") ],
  stars: [ ST(970, 340), ST(1190, 300), ST(1420, 250) ],
}),
lvl(15, {
  name: "Fortim Alto", throws: 6, zoom: 0.84,
  walls: [ wall(800, 6, { height: 200 }) ],
  frameTowers: [
    frameTower(1080, [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { gift: gS() }, { gift: gG("round") } ], { legH: 94 }),
    frameTower(1400, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() } ], { legH: 94 }),
  ],
  balloons: [ balloonGift(920, 300, gS("round")) ],
  extraBlocks: [ TNT(1240), CHAMP(1520) ],
  stars: [ ST(920, 170), ST(1240, 200), ST(1560, 340) ],
}),

/* ═══ 16-19: maiores ainda, cadeias valendo muito ═══ */
lvl(16, {
  name: "Torres Gêmeas", throws: 7, zoom: 0.82,
  frameTowers: [
    frameTower(940,  [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { gift: gS() }, { gift: gM("round") }, { gift: gG() } ], { legH: 92 }),
    frameTower(1300, [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { gift: gS() }, { gift: gM("round") }, { gift: gG() } ], { legH: 92 }),
  ],
  extraBlocks: [ TNT(1120), ROCKET(780), ROCKET(1470) ],
  stars: [ ST(1120, 160), ST(780, 330), ST(1470, 300), ST(1120, 480) ],
}),
lvl(17, {
  name: "Corredor de Aço", throws: 7, zoom: 0.84,
  towers: [ tower(860, [B("steel", 48, 230)], null), tower(980, [B("steel", 48, 230)], null) ],
  extraBlocks: [ TNT(920), ROCKET(1120), CHAMP(1560) ],
  frameTowers: [ frameTower(1300, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() } ], { legH: 92 }) ],
  stars: [ ST(920, 300), ST(1300, 180), ST(1560, 400) ],
}),
lvl(18, {
  name: "Ponte Suspensa", throws: 7, zoom: 0.84,
  bridges: [ bridge(840, 1030, 240, gS("box", "wide")) ],
  balloons: [ balloonGift(1200, 280, gG("round")), balloonGift(1420, 380, gS("round")) ],
  castles: [ cardCastle(1600, { legH: 158, gift: gG() }) ],
  extraBlocks: [ TNT(1120), ROCKET(1300), GLASS(940) ],
  stars: [ ST(1030, 300), ST(1310, 170), ST(1600, 330) ],
}),
lvl(19, {
  name: "Muralha Dupla", throws: 7, zoom: 0.8,
  walls: [ wall(820, 6, { height: 210 }), wall(1120, 6, { height: 210 }) ],
  frameTowers: [ frameTower(1400, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gX() } ], { legH: 92 }) ],
  extraBlocks: [ TNT(970), TNT(1270), ROCKET(1600) ],
  extraGifts: [ standGift(1700, "special", "round", "sm") ],
  stars: [ ST(970, 260), ST(1270, 240), ST(1400, 130), ST(1680, 380) ],
}),

/* ═══ 20: O MARCO — enorme ═══ */
lvl(20, {
  name: "A Grande Fortaleza", throws: 8, zoom: 0.74,
  walls: [ wall(780, 7, { height: 220 }) ],
  frameTowers: [
    frameTower(1040, [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") } ], { legH: 92 }),
    frameTower(1400, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() } ], { legH: 92 }),
  ],
  castles: [ cardCastle(1680, { legH: 158, gift: gG() }) ],
  balloons: [ balloonGift(900, 240, gS("round")) ],
  extraBlocks: [ TNT(940), TNT(1220), ROCKET(1560), CHAMP(1800) ],
  extraGifts: [ standGift(1880, "special", "round", "sm") ],
  stars: [ ST(900, 120), ST(1220, 170), ST(1560, 220), ST(1040, 60), ST(1860, 400) ],
}),

/* ═══ 21-24: gigantes + balões, a tela enchendo ═══ */
lvl(21, {
  name: "Céu de Balões", throws: 8, zoom: 0.78,
  balloons: [
    balloonGift(880,  380, gM("round")),
    balloonGift(1080, 260, gS("round")),
    balloonGift(1280, 340, gG("round")),
    balloonGift(1480, 240, gX("round")),
  ],
  frameTowers: [ frameTower(1660, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") } ], { legH: 94 }) ],
  extraBlocks: [ ROCKET(980), ROCKET(1180), ROCKET(1380), TNT(1560) ],
  stars: [ ST(980, 150), ST(1180, 130), ST(1380, 150), ST(1660, 220) ],
}),
lvl(22, {
  name: "Cidade de Torres", throws: 8, zoom: 0.74,
  frameTowers: [
    frameTower(900,  [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { gift: gS() }, { gift: gM("round") } ], { legH: 92 }),
    frameTower(1220, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() } ], { legH: 92 }),
    frameTower(1540, [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { gift: gX("round") } ], { legH: 92 }),
  ],
  extraBlocks: [ TNT(1060), TNT(1380), CHAMP(1700), GLASS(760) ],
  stars: [ ST(1060, 150), ST(1380, 130), ST(760, 340), ST(1720, 300) ],
}),
lvl(23, {
  name: "Noite Fortificada", throws: 8, skyVariant: "night", zoom: 0.74,
  walls: [ wall(800, 7, { height: 220 }), wall(1140, 7, { height: 220 }) ],
  frameTowers: [ frameTower(1440, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gX() }, { gift: gG() } ], { legH: 90 }) ],
  balloons: [ balloonGift(970, 220, gG("round")), balloonGift(1300, 180, gX("round")) ],
  extraBlocks: [ TNT(970, undefined), TNT(1300), ROCKET(1700), CHAMP(1800) ],
  extraGifts: [ standGift(1880, "special", "round", "sm") ],
  stars: [ ST(970, 100), ST(1300, 80), ST(1440, 40), ST(1780, 360) ],
}),
lvl(24, {
  name: "Aço, Fogo e Vidro", throws: 8, zoom: 0.76,
  towers: [ tower(840, [B("steel", 48, 240)], null), tower(960, [B("steel", 48, 240)], null) ],
  extraBlocks: [ TNT(900), ROCKET(1100), ROCKET(1200), GLASS(1020), GLASS(1320), CHAMP(1820), CAKE(1700) ],
  frameTowers: [
    frameTower(1420, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() } ], { legH: 92 }),
  ],
  castles: [ cardCastle(1900, { legH: 158, gift: gX() }) ],
  stars: [ ST(900, 280), ST(1150, 180), ST(1420, 120), ST(1900, 340) ],
}),

/* ═══ 25-30: TELA CHEIA — muita coisa acontecendo ao mesmo tempo ═══ */
lvl(25, {
  name: "Marco de Vinte e Cinco", throws: 9, zoom: 0.68,
  walls: [ wall(780, 7, { height: 230 }) ],
  frameTowers: [
    frameTower(1020, [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { gift: gS() }, { gift: gG("round") }, { gift: gX() } ], { legH: 90 }),
    frameTower(1360, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX("round") } ], { legH: 90 }),
    frameTower(1700, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gS("round") } ], { legH: 90 }),
  ],
  balloons: [ balloonGift(900, 200, gS("round")), balloonGift(1200, 140, gX("round")) ],
  extraBlocks: [ TNT(920), TNT(1190), TNT(1530), ROCKET(1860), CHAMP(1960) ],
  extraGifts: [ standGift(2040, "special", "round", "sm") ],
  stars: [ ST(920, 80), ST(1190, 40), ST(1530, 120), ST(1360, -10), STB(1700, 200), ST(2020, 400) ],
}),
lvl(26, {
  name: "Ponte, Balão e Bolo", throws: 9, zoom: 0.7,
  bridges: [ bridge(820, 1020, 260, gS("box", "wide")) ],
  balloons: [
    balloonGift(1180, 200, gG("round")),
    balloonGift(1380, 300, gS("round")),
    balloonGift(1580, 160, gX("round")),
  ],
  frameTowers: [ frameTower(1820, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() } ], { legH: 92 }) ],
  extraBlocks: [ CAKE(1120), CAKE(1700), TNT(1280), TNT(1480), GLASS(940) ],
  stars: [ ST(1020, 200), ST(1280, 100), ST(1480, 60), STB(1820, 180), ST(1700, 400) ],
}),
lvl(27, {
  name: "Estilingue e Colapso", throws: 9, zoom: 0.7,
  extraBlocks: [ standBlock(800, "spring", 80, 38), TNT(1120), TNT(1460), GLASS(1280), CHAMP(1900), ROCKET(1020) ],
  castles: [ cardCastle(1080, { legH: 158, gift: gM() }), cardCastle(1620, { legH: 158, gift: gG() }) ],
  frameTowers: [
    frameTower(1340, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gX() } ], { legH: 90 }),
    frameTower(1820, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 92 }),
  ],
  balloons: [ balloonGift(940, 180, gX("round")) ],
  stars: [ ST(940, 60), ST(1120, 140), ST(1460, 120), STB(1340, 20), ST(1900, 380) ],
}),
lvl(28, {
  name: "Panorama do Caos", throws: 9, zoom: 0.64,
  walls: [ wall(800, 7, { height: 230 }), wall(1180, 7, { height: 230 }) ],
  frameTowers: [
    frameTower(980,  [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { gift: gS() }, { gift: gG("round") } ], { legH: 90 }),
    frameTower(1420, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX("round") } ], { legH: 90 }),
    frameTower(1800, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gS("round") }, { gift: gX() } ], { legH: 90 }),
  ],
  balloons: [ balloonGift(880, 160, gS("round")), balloonGift(1600, 120, gX("round")) ],
  extraBlocks: [ TNT(1080), TNT(1300), TNT(1660), ROCKET(2000), CHAMP(2100) ],
  extraGifts: [ standGift(2180, "special", "round", "sm") ],
  stars: [ ST(1080, 60), ST(1300, 20), ST(1660, 40), STB(1420, -60), ST(2000, 300), ST(880, 300) ],
}),
lvl(29, {
  name: "Noite de Vila Grande", throws: 9, skyVariant: "night", zoom: 0.66,
  frameTowers: [
    frameTower(900,  [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { gift: gS() }, { gift: gG("round") }, { gift: gX() } ], { legH: 90 }),
    frameTower(1260, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() } ], { legH: 90 }),
    frameTower(1620, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gS("round") }, { gift: gX() }, { gift: gG("round") } ], { legH: 90 }),
  ],
  balloons: [ balloonGift(1080, 140, gX("round")), balloonGift(1440, 100, gX("round")) ],
  extraBlocks: [ TNT(1080), TNT(1440), ROCKET(760), ROCKET(1800), CHAMP(1960), GLASS(2040) ],
  stars: [ ST(1080, 20), ST(1440, -20), ST(760, 320), STB(1620, -40), ST(2020, 360) ],
}),
lvl(30, {
  name: "Marco de Trinta", throws: 10, skyVariant: "sunset", zoom: 0.62,
  walls: [ wall(760, 8, { height: 240 }) ],
  frameTowers: [
    frameTower(1000, [ { gift: gM() }, { gift: gS("round") }, { gift: gG() }, { block: B("tnt", 60, 68) }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") } ], { legH: 88 }),
    frameTower(1380, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX("round") } ], { legH: 88 }),
    frameTower(1760, [ { gift: gG() }, { gift: gX("round") }, { block: B("tnt", 60, 68) }, { gift: gS("round") }, { gift: gX() } ], { legH: 88 }),
  ],
  castles: [ cardCastle(2060, { legH: 158, gift: gX() }) ],
  balloons: [ balloonGift(1190, 100, gS("round")), balloonGift(1570, 60, gX("round")) ],
  extraBlocks: [ TNT(880), TNT(1930), ROCKET(2200), CHAMP(2250) ],
  extraGifts: [ standGift(2280, "special", "round", "sm") ],
  stars: [ ST(880, 20), ST(1190, -60), ST(1570, -20), STB(1380, -140), ST(2200, 300), ST(2280, 460) ],
}),

/* ═══ 31-50: CAOS TOTAL ═══ */
lvl(31, {
  name: "Aço no Meio do Fogo", throws: 9, zoom: 0.64,
  towers: [ tower(860, [B("steel", 48, 260)], null), tower(1000, [B("steel", 48, 260)], null) ],
  frameTowers: [
    frameTower(1300, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gX() } ], { legH: 88 }),
    frameTower(1700, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 88 }),
  ],
  balloons: [ balloonGift(1150, 120, gX("round")) ],
  extraBlocks: [ TNT(930), TNT(1500), ROCKET(1150), ROCKET(1900), GLASS(2000), CHAMP(2080) ],
  stars: [ ST(930, 280), ST(1150, 0), STB(1300, -60), ST(1500, 60), ST(2040, 360) ],
}),
lvl(32, {
  name: "Vila Fortificada", throws: 10, zoom: 0.62,
  walls: [ wall(790, 8, { height: 240 }), wall(1160, 8, { height: 240 }) ],
  frameTowers: [
    frameTower(980,  [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() } ], { legH: 88 }),
    frameTower(1400, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX("round") } ], { legH: 88 }),
    frameTower(1800, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 88 }),
  ],
  balloons: [ balloonGift(1080, 100, gX("round")), balloonGift(1600, 60, gX("round")) ],
  extraBlocks: [ TNT(1080), TNT(1600), TNT(2000), ROCKET(880), CHAMP(2120), CAKE(2200) ],
  stars: [ ST(1080, -20), ST(1600, -60), STB(1400, -130), ST(880, 300), ST(2160, 360) ],
}),
lvl(33, {
  name: "Perto e Perigoso", throws: 8, zoom: 0.88,
  castles: [ cardCastle(880, { legH: 158, gift: gS() }), cardCastle(1120, { legH: 158, gift: gG() }) ],
  frameTowers: [ frameTower(1380, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") } ], { legH: 94 }) ],
  extraBlocks: [ TNT(1000), TNT(1250), GLASS(1560), CHAMP(1640) ],
  balloons: [ balloonGift(760, 300, gX("round")) ],
  stars: [ ST(1000, 300), ST(1250, 260), STB(1380, 160), ST(760, 180) ],
}),
lvl(34, {
  name: "Enxame de Balões", throws: 10, zoom: 0.64,
  balloons: [
    balloonGift(860,  340, gM("round")),
    balloonGift(1040, 200, gS("round")),
    balloonGift(1240, 300, gG("round")),
    balloonGift(1440, 160, gX("round")),
    balloonGift(1640, 260, gX("round")),
  ],
  frameTowers: [ frameTower(1900, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 90 }) ],
  extraBlocks: [ ROCKET(940), ROCKET(1140), ROCKET(1340), ROCKET(1540), TNT(1760) ],
  stars: [ ST(940, 120), ST(1340, 80), ST(1740, 100), STB(1900, 180), ST(2060, 380) ],
}),
lvl(35, {
  name: "Grande Vila", throws: 10, zoom: 0.6,
  walls: [ wall(780, 8, { height: 245 }) ],
  frameTowers: [
    frameTower(1020, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX("round") } ], { legH: 88 }),
    frameTower(1420, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() } ], { legH: 88 }),
    frameTower(1820, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX() } ], { legH: 88 }),
  ],
  balloons: [ balloonGift(920, 80, gX("round")), balloonGift(1620, 40, gX("round")) ],
  extraBlocks: [ TNT(920), TNT(1220), TNT(1620), TNT(2020), CHAMP(2140), GLASS(2220) ],
  stars: [ ST(920, -40), ST(1220, 20), ST(1620, -80), STB(1420, -150), ST(2180, 340), ST(760, 320) ],
}),
lvl(36, {
  name: "Fortaleza I", throws: 10, zoom: 0.6,
  walls: [ wall(740, 8, { height: 250 }), wall(1200, 8, { height: 250 }) ],
  frameTowers: [
    frameTower(980,  [ { gift: gS() }, { gift: gG("round") }, { block: B("tnt", 60, 68) }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX() } ], { legH: 88 }),
    frameTower(1440, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { block: B("tnt", 60, 68) }, { gift: gS() }, { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 86 }),
  ],
  castles: [ cardCastle(1760, { legH: 158, gift: gX() }), cardCastle(2020, { legH: 158, gift: gG() }) ],
  balloons: [ balloonGift(1090, 60, gX("round")) ],
  extraBlocks: [ TNT(1660), TNT(1890), ROCKET(2200), CHAMP(2260) ],
  stars: [ ST(1090, -60), STB(1440, -200), ST(1660, 40), ST(1890, 80), ST(2200, 340) ],
}),
lvl(37, {
  name: "Trilha de Foguetes", throws: 10, zoom: 0.62,
  extraBlocks: [
    ROCKET(820), ROCKET(940), ROCKET(1060), ROCKET(1180),
    TNT(1320), TNT(1560), CHAMP(2160), GLASS(2240), CAKE(1900),
  ],
  frameTowers: [
    frameTower(1450, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() } ], { legH: 88 }),
    frameTower(1820, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 88 }),
  ],
  balloons: [ balloonGift(2060, 200, gX("round")) ],
  stars: [ ST(1000, 260), ST(1320, 120), STB(1450, -80), ST(2060, 80), ST(2220, 360) ],
}),
lvl(38, {
  name: "Noite Sem Fim", throws: 10, skyVariant: "night", zoom: 0.58,
  frameTowers: [
    frameTower(900,  [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() } ], { legH: 88 }),
    frameTower(1280, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX("round") } ], { legH: 88 }),
    frameTower(1660, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX() } ], { legH: 88 }),
    frameTower(2040, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 90 }),
  ],
  balloons: [ balloonGift(1090, 60, gX("round")), balloonGift(1470, 20, gX("round")) ],
  extraBlocks: [ TNT(1090), TNT(1470), TNT(1850), ROCKET(760), CHAMP(2220) ],
  stars: [ ST(1090, -60), ST(1470, -100), ST(1850, 40), STB(1280, -170), ST(760, 320), ST(2240, 360) ],
}),
lvl(39, {
  name: "Horizonte Distante", throws: 10, zoom: 0.56,
  walls: [ wall(800, 8, { height: 250 }) ],
  castles: [ cardCastle(1100, { legH: 158, gift: gS() }), cardCastle(1340, { legH: 158, gift: gG() }) ],
  frameTowers: [
    frameTower(1660, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX() } ], { legH: 88 }),
    frameTower(2060, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") } ], { legH: 90 }),
  ],
  balloons: [ balloonGift(960, 100, gX("round")), balloonGift(1500, 60, gX("round")) ],
  extraBlocks: [ TNT(960), TNT(1500), TNT(1880), ROCKET(2260), GLASS(2340) ],
  stars: [ ST(960, -20), ST(1500, -60), STB(1660, -140), ST(1880, 60), ST(2300, 340) ],
}),
lvl(40, {
  name: "Marco de Quarenta", throws: 11, skyVariant: "sunset", zoom: 0.56,
  walls: [ wall(740, 8, { height: 250 }), wall(1200, 8, { height: 250 }) ],
  frameTowers: [
    frameTower(980,  [ { gift: gS() }, { gift: gG("round") }, { block: B("tnt", 60, 68) }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX() } ], { legH: 86 }),
    frameTower(1440, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { block: B("tnt", 60, 68) }, { gift: gS() }, { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 86 }),
    frameTower(1820, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { block: B("tnt", 60, 68) }, { gift: gG() }, { gift: gX() } ], { legH: 86 }),
  ],
  castles: [ cardCastle(2120, { legH: 158, gift: gX() }) ],
  balloons: [ balloonGift(1090, 20, gX("round")), balloonGift(1640, -20, gX("round")) ],
  extraBlocks: [ TNT(880), TNT(2000), CHAMP(2260), GLASS(620) ],
  stars: [ ST(1090, -100), ST(1640, -140), STB(1440, -240), ST(2000, 40), ST(880, 300), ST(2260, 400) ],
}),
lvl(41, {
  name: "Fortaleza II", throws: 11, zoom: 0.54,
  walls: [ wall(780, 9, { height: 260 }) ],
  frameTowers: [
    frameTower(1020, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 86 }),
    frameTower(1440, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX() } ], { legH: 86 }),
    frameTower(1860, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX() } ], { legH: 86 }),
  ],
  balloons: [ balloonGift(900, 40, gX("round")), balloonGift(1240, -20, gX("round")), balloonGift(1660, 0, gX("round")) ],
  extraBlocks: [ TNT(900), TNT(1240), TNT(1660), TNT(2060), ROCKET(2200), CHAMP(2300) ],
  stars: [ ST(900, -80), ST(1240, -140), ST(1660, -120), STB(1440, -230), ST(2060, 60), ST(2280, 340) ],
}),
lvl(42, {
  name: "Noite na Fortaleza", throws: 11, skyVariant: "night", zoom: 0.54,
  walls: [ wall(720, 9, { height: 260 }), wall(1230, 9, { height: 260 }) ],
  towers: [ tower(1520, [B("steel", 48, 280)], null) ],
  frameTowers: [
    frameTower(980,  [ { gift: gS() }, { gift: gG("round") }, { block: B("tnt", 60, 68) }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX() } ], { legH: 86 }),
    frameTower(1740, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { block: B("tnt", 60, 68) }, { gift: gS() }, { gift: gG() }, { gift: gX("round") } ], { legH: 86 }),
    frameTower(2100, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") } ], { legH: 88 }),
  ],
  balloons: [ balloonGift(1400, -20, gX("round")) ],
  extraBlocks: [ TNT(1620), TNT(880), ROCKET(2240), CHAMP(2280), GLASS(600) ],
  stars: [ ST(1400, -120), STB(1740, -220), ST(1620, 40), ST(880, 300), ST(2260, 380) ],
}),
lvl(43, {
  name: "Tudo no Ar", throws: 11, zoom: 0.58,
  bridges: [ bridge(840, 1060, 300, gS("box", "wide")) ],
  balloons: [
    balloonGift(1240, 60, gX("round")),
    balloonGift(1460, -20, gX("round")),
    balloonGift(1680, 80, gX("round")),
    balloonGift(1900, 20, gX("round")),
  ],
  frameTowers: [ frameTower(2160, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 88 }) ],
  extraBlocks: [ TNT(1140), TNT(1580), TNT(1800), ROCKET(1340), ROCKET(2020), CAKE(960) ],
  stars: [ ST(1140, 40), ST(1580, -100), ST(1800, -40), STB(2160, 60), ST(2320, 340) ],
}),
lvl(44, {
  name: "Alcance Extremo", throws: 11, zoom: 0.52,
  walls: [ wall(740, 9, { height: 260 }) ],
  frameTowers: [
    frameTower(1000, [ { gift: gS() }, { gift: gG("round") }, { block: B("tnt", 60, 68) }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX() } ], { legH: 86 }),
    frameTower(1440, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { block: B("tnt", 60, 68) }, { gift: gS() }, { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 86 }),
    frameTower(1840, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { block: B("tnt", 60, 68) }, { gift: gG() }, { gift: gX() } ], { legH: 86 }),
  ],
  castles: [ cardCastle(2140, { legH: 158, gift: gX() }) ],
  balloons: [ balloonGift(1220, -60, gX("round")), balloonGift(1640, -40, gX("round")) ],
  extraBlocks: [ TNT(880), TNT(2020), CHAMP(2280), GLASS(600) ],
  stars: [ ST(1220, -160), ST(1640, -140), STB(1440, -260), ST(2020, 20), ST(880, 300), ST(2280, 400) ],
}),
lvl(45, {
  name: "Cidade Sitiada", throws: 11, zoom: 0.5,
  walls: [ wall(740, 8, { height: 265 }), wall(1200, 8, { height: 265 }), wall(1660, 8, { height: 265 }) ],
  frameTowers: [
    frameTower(980,  [ { gift: gS() }, { gift: gG("round") }, { block: B("tnt", 60, 68) }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX() } ], { legH: 86 }),
    frameTower(1440, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { block: B("tnt", 60, 68) }, { gift: gS() }, { gift: gG() }, { gift: gX("round") } ], { legH: 86 }),
    frameTower(1900, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { block: B("tnt", 60, 68) }, { gift: gG() }, { gift: gX() } ], { legH: 86 }),
    frameTower(2180, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") } ], { legH: 88 }),
  ],
  balloons: [ balloonGift(1090, -60, gX("round")), balloonGift(1550, -20, gX("round")) ],
  extraBlocks: [ ROCKET(880), CHAMP(600), GLASS(560) ],
  stars: [ ST(1090, -160), ST(1550, -120), STB(1440, -260), ST(2050, 60), ST(880, 300), ST(2180, 420) ],
}),
lvl(46, {
  name: "Noite de Cinco Castelos", throws: 11, skyVariant: "night", zoom: 0.56,
  castles: [
    cardCastle(860,  { legH: 158, gift: gS() }),
    cardCastle(1080, { legH: 158, gift: gG() }),
    cardCastle(1300, { legH: 158, gift: gX() }),
    cardCastle(1520, { legH: 158, gift: gG() }),
    cardCastle(1740, { legH: 158, gift: gX() }),
  ],
  frameTowers: [ frameTower(2060, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX() } ], { legH: 88 }) ],
  balloons: [ balloonGift(1190, 40, gX("round")), balloonGift(1630, 0, gX("round")) ],
  extraBlocks: [ TNT(970), TNT(1410), TNT(1850), ROCKET(2220), CHAMP(2320) ],
  stars: [ ST(970, 260), ST(1190, -60), ST(1630, -100), STB(2060, 40), ST(2300, 340) ],
}),
lvl(47, {
  name: "Corredor Final", throws: 12, zoom: 0.5,
  walls: [ wall(700, 9, { height: 265 }) ],
  towers: [ tower(1120, [B("steel", 48, 300)], null), tower(1260, [B("steel", 48, 300)], null) ],
  frameTowers: [
    frameTower(1520, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { block: B("tnt", 60, 68) }, { gift: gS() }, { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 86 }),
    frameTower(1900, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { block: B("tnt", 60, 68) }, { gift: gG() }, { gift: gX() } ], { legH: 86 }),
    frameTower(2180, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 88 }),
  ],
  balloons: [ balloonGift(950, 20, gX("round")), balloonGift(1700, -40, gX("round")) ],
  extraBlocks: [ TNT(1380), TNT(2040), CHAMP(600), GLASS(560), CAKE(870) ],
  stars: [ ST(950, -80), ST(1380, 60), ST(1700, -140), STB(1520, -260), ST(2040, 20), ST(2180, 420) ],
}),
lvl(48, {
  name: "Vista Final", throws: 12, zoom: 0.48,
  walls: [ wall(720, 9, { height: 270 }), wall(1220, 9, { height: 270 }) ],
  frameTowers: [
    frameTower(980,  [ { gift: gS() }, { gift: gG("round") }, { block: B("tnt", 60, 68) }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX() } ], { legH: 86 }),
    frameTower(1460, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { block: B("tnt", 60, 68) }, { gift: gS() }, { gift: gG() }, { gift: gX("round") } ], { legH: 86 }),
    frameTower(1760, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { block: B("tnt", 60, 68) }, { gift: gG() }, { gift: gX() } ], { legH: 86 }),
    frameTower(2060, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") } ], { legH: 88 }),
  ],
  balloons: [ balloonGift(1090, -80, gX("round")), balloonGift(1610, -120, gX("round")) ],
  extraBlocks: [ TNT(880), ROCKET(2260), CHAMP(620), GLASS(560) ],
  stars: [ ST(1090, -190), ST(1610, -230), STB(1460, -300), ST(2260, 120), ST(880, 300), ST(2280, 440) ],
}),
lvl(49, {
  name: "Penúltima Prova", throws: 12, skyVariant: "sunset", zoom: 0.46,
  walls: [ wall(700, 9, { height: 270 }), wall(1200, 9, { height: 270 }), wall(1700, 9, { height: 270 }) ],
  frameTowers: [
    frameTower(960,  [ { gift: gS() }, { gift: gG("round") }, { block: B("tnt", 60, 68) }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX() }, { gift: gG("round") } ], { legH: 84 }),
    frameTower(1450, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { block: B("tnt", 60, 68) }, { gift: gS() }, { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX() } ], { legH: 84 }),
    frameTower(1950, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { block: B("tnt", 60, 68) }, { gift: gG() }, { gift: gX() }, { gift: gG("round") } ], { legH: 84 }),
    frameTower(2200, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") }, { gift: gG() } ], { legH: 86 }),
  ],
  balloons: [ balloonGift(1090, -60, gX("round")), balloonGift(1590, -140, gX("round")) ],
  extraBlocks: [ TNT(840), TNT(1330), ROCKET(600), CHAMP(560) ],
  stars: [ ST(1090, -170), ST(1590, -250), ST(2100, -120), STB(1450, -300), ST(840, 20), ST(2200, 440) ],
}),
lvl(50, {
  /* A 50 é o teto do jogo desenhado à mão: quatro torres de 9-10 andares com
     TNT no meio de cada uma, três paliçadas, quatro balões e estrelas lá em
     cima. Tudo cabe no alcance do estilingue de propósito — é para ser
     avassalador de olhar, não impossível de acertar. */
  name: "A Grande Celebração", throws: 13, skyVariant: "night", zoom: 0.44,
  walls: [ wall(660, 9, { height: 275 }), wall(1180, 9, { height: 275 }), wall(1700, 9, { height: 275 }) ],
  frameTowers: [
    frameTower(920,  [ { gift: gS() }, { gift: gG("round") }, { block: B("tnt", 60, 68) }, { gift: gG("round") }, { gift: gS() }, { gift: gG() }, { gift: gX() }, { gift: gG("round") } ], { legH: 84 }),
    frameTower(1440, [ { gift: gS() }, { gift: gG("round") }, { gift: gX() }, { block: B("tnt", 60, 68) }, { gift: gS() }, { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX() } ], { legH: 84 }),
    frameTower(1960, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { block: B("tnt", 60, 68) }, { gift: gG() }, { gift: gX() }, { gift: gG("round") }, { gift: gX() } ], { legH: 84 }),
    frameTower(2220, [ { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX("round") }, { gift: gG() }, { gift: gX() } ], { legH: 84 }),
  ],
  balloons: [
    balloonGift(1080, -100, gX("round")),
    balloonGift(1600, -180, gX("round")),
    balloonGift(1820, -140, gX("round")),
    balloonGift(2100, -120, gX("round")),
  ],
  extraBlocks: [ TNT(800), TNT(1320), ROCKET(560), CHAMP(520), GLASS(620) ],
  extraGifts: [ standGift(2340, "special", "round", "sm") ],
  stars: [ ST(1080, -210), ST(1600, -280), ST(1820, -250), ST(2100, -230), STB(1440, -300), ST(800, 20), ST(2340, 440) ],
}),
];

/* ══════════════════════════════════════════════════════════════════════
   5b. MODO CAOS INFINITO — fases 51 em diante, geradas na hora

   A 50 é o teto do conteúdo desenhado à mão. Depois dela o jogo não acaba:
   passa a gerar fases sozinho, já partindo do patamar da 50 e subindo — mais
   torres, mais altas, mais TNT, mais balões, mais estrelas, e a câmera cada
   vez mais longe.

   Duas regras que o gerador nunca quebra, porque quebrá-las tornaria a fase
   impossível em vez de difícil:
     · nada além do alcance real do arremesso (2201px da forquilha);
     · nada acima da altura máxima que o arremesso alcança (y ≈ -397).
   A montagem da fase (buildLevelBodies) ainda dá uma segunda passada
   empurrando avulsos pra fora das estruturas, então o gerador pode ser
   ousado sem gerar bagunça sobreposta.

   O sorteio tem semente derivada do NÚMERO da fase: a fase 137 é sempre a
   mesma fase 137, em qualquer aparelho. Dá pra comparar recorde com alguém
   sem ter que confiar na sorte.
   ══════════════════════════════════════════════════════════════════════ */
/* ── Envelope de alcance ──────────────────────────────────────────────
   Não basta "está dentro dos 2201px": o arremesso desenha um arco, então
   quanto MAIS LONGE o alvo, mais BAIXO é o ponto mais alto que ele ainda
   consegue tocar. Um presente no topo de uma torre alta a 2000px é
   inalcançável mesmo com o alcance máximo sobrando.

   A tabela abaixo é o resultado de varrer todos os ângulos na força máxima
   e anotar, a cada 100px de distância da forquilha, o Y mais alto tocado
   (lembrando: Y menor = mais alto; o chão é 810 e a forquilha, 610).
   O gerador de fases usa isso pra nunca criar um alvo impossível. */
const REACH_TOP = [
  -396, -396, -391, -381, -366, -345, -321, -292, -257, -217, -172,
  -123, -67, -10, 55, 125, 199, 279, 363, 452, 547, 647, 756, 862,
];
function maxReachHeightAt(worldX, slingX) {
  const d = (worldX - (slingX === undefined ? 230 : slingX)) / 100;
  if (d <= 0) return REACH_TOP[0];
  const i = Math.floor(d);
  if (i >= REACH_TOP.length - 1) return 900;
  return lerp(REACH_TOP[i], REACH_TOP[i + 1], d - i);
}

const GEN_CACHE = {};

function makeRng(n) {
  let s = (n * 2654435761) >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function generateLevel(number) {
  if (GEN_CACHE[number]) return GEN_CACHE[number];
  const rng = makeRng(number);
  const pickR = function (arr) { return arr[Math.floor(rng() * arr.length)]; };
  const d = number - LEVELS.length;              // 1, 2, 3... depois da 50
  const ramp = function (base, step, cap) { return Math.min(cap, base + Math.floor((d - 1) / step)); };

  /* A dificuldade sobe pela ALTURA e pela quantidade de explosivos dentro
     das torres, não por espremer mais estruturas lado a lado: a faixa útil
     é fixa (o alcance do estilingue não muda), então amontoar mais coisa só
     faria os corpos nascerem encavalados. */
  const towerCount = ramp(3, 10, 4);
  const floorsMax  = ramp(6, 4, 8);
  const tntChance  = Math.min(0.45, 0.2 + d * 0.006);
  const balloonQty = ramp(2, 6, 5);
  const wallQty    = ramp(1, 14, 2);
  const starQty    = ramp(4, 7, 8);

  /* Faixa útil: começa longe do estilingue e termina no alcance máximo.
     O espaçamento nunca fica menor que 290px — é a largura de uma paliçada
     mais a de uma torre, com folga. Amontoar mais que isso faria os corpos
     nascerem encavalados e a fase explodir sozinha. */
  const x0 = 900, x1 = 2150;
  const slots = Math.min(towerCount + wallQty, 1 + Math.floor((x1 - x0) / 290));
  const span = (x1 - x0) / Math.max(1, slots - 1);

  const frameTowers = [], walls = [], balloons = [], stars = [], extraBlocks = [], extraGifts = [];
  const tops = [];   // topo de cada torre, pra pendurar estrela em cima

  /* Alterna paliçada e torre ao longo da faixa, pra ter parede pra furar e
     torre pra desabar, nunca tudo do mesmo tipo em fila.
     As torres são sorteadas primeiro e ordenadas da MAIS ALTA pra mais
     baixa, e as mais altas ficam perto: por causa do envelope de alcance,
     uma torre alta lá no fim teria o topo inalcançável. De quebra, a fase
     ganha um perfil de horizonte que desce pra direita, que é bonito. */
  const towerFloors = [];
  for (let i = 0; i < towerCount; i++) towerFloors.push(5 + Math.floor(rng() * (floorsMax - 4)));
  towerFloors.sort(function (a, b) { return b - a; });

  let placedWalls = 0, placedTowers = 0;
  for (let i = 0; i < slots; i++) {
    const x = Math.round(x0 + i * span);
    const wantWall = placedWalls < wallQty && (i % 3 === 1 || placedTowers >= towerCount);
    if (wantWall) {
      placedWalls++;
      walls.push(wall(x, 8, { height: 240 + Math.floor(rng() * 40) }));
    } else if (placedTowers < towerCount) {
      /* Quantos andares o envelope permite NESTA posição. Em vez de mover a
         torre (o que bagunçaria o espaçamento e faria uma nascer dentro da
         outra), a torre encolhe até o topo dela ser alcançável. É por isso
         que as fases geradas têm perfil de horizonte descendo pra direita. */
      const teto = maxReachHeightAt(x, 230) + 40;
      const maxFloorsHere = Math.max(2, Math.floor((810 - 50 - teto) / 102));
      const floors = Math.min(towerFloors[placedTowers], maxFloorsHere);
      placedTowers++;
      const topY = 810 - floors * 102 - 50;
      const levelsSpec = [];
      for (let f = 0; f < floors; f++) {
        /* TNT vai DENTRO da torre, não no chão: no chão ele disputaria os
           poucos vãos livres com as estruturas; dentro, ele transforma cada
           torre numa bomba-relógio de vários andares. É também o que faz a
           dificuldade subir sem a fase ficar mais larga. */
        if (f > 0 && f < floors - 1 && rng() < tntChance) levelsSpec.push({ block: B("tnt", 60, 68) });
        else levelsSpec.push({ gift: pickR([gS(), gG("round"), gX(), gG(), gX("round")]) });
      }
      frameTowers.push(frameTower(x, levelsSpec, { legH: 84 }));
      tops.push({ x: x, y: topY });
    }
  }

  /* Balões nos vãos entre estruturas (a montagem ajusta se não couber).
     A altura respeita o envelope: balão alto demais e longe demais só
     ficaria lá boiando, zombando de quem não consegue acertá-lo. */
  /* Balão só na metade mais próxima da faixa. Lá longe o envelope obriga o
     balão a ficar baixo, e balão baixo não passa por cima de nada — acabaria
     tendo que nascer dentro de uma torre. Perto, ele fica alto e livre. */
  const balloonMinX = x0 - 220, balloonMaxX = Math.min(x1, 1750);
  for (let i = 0; i < balloonQty; i++) {
    const x = Math.round(balloonMinX + (balloonMaxX - balloonMinX) * ((i + 0.5) / balloonQty));
    const wanted = -60 - Math.floor(rng() * 140);
    balloons.push(balloonGift(x, Math.max(wanted, maxReachHeightAt(x, 230) + 70), gX("round")));
  }

  /* Corredor livre entre o estilingue e a primeira estrutura: é onde cabem
     os avulsos sem brigar com nada. Posições fixas e espaçadas de propósito. */
  extraBlocks.push(TNT(x0 - 320));
  extraBlocks.push(ROCKET(x0 - 240));
  extraBlocks.push(CHAMP(x0 - 170));
  if (rng() < 0.6) extraBlocks.push(GLASS(x0 - 100));

  /* Estrelas: uma em cima de cada torre (o lugar mais difícil de acertar) e
     o resto espalhado no céu, sempre abaixo do teto de alcance. */
  const starY = function (x, wanted) { return Math.max(wanted, maxReachHeightAt(x, 230) + 50); };
  tops.forEach(function (t, i) {
    if (stars.length >= starQty) return;
    const y = starY(t.x, t.y);
    stars.push(i === 0 ? STB(t.x, y) : ST(t.x, y));
  });
  while (stars.length < starQty) {
    // sempre dentro do que o arremesso alcança: nem além do fim, nem acima do envelope
    const sx = Math.round(clamp(x0 - 300 + rng() * (x1 - x0 + 500), 520, x1 - 20));
    stars.push(ST(sx, Math.round(starY(sx, -280 + rng() * 640))));
  }

  const level = lvl(number, {
    name: "Caos Infinito " + d,
    throws: Math.min(16, 11 + Math.floor(d / 8)),
    zoom: Math.max(0.4, 0.5 - d * 0.002),
    skyVariant: pickR(["night", "sunset", "night", "day"]),
    frameTowers: frameTowers,
    walls: walls,
    balloons: balloons,
    extraBlocks: extraBlocks,
    extraGifts: extraGifts,
    stars: stars,
  });
  GEN_CACHE[number] = level;
  return level;
}

/* Fonte única da verdade sobre "qual é a fase N": desenhada à mão até a 50,
   gerada daí em diante. Todo o resto do jogo passa por aqui. */
function levelAt(index) {
  return index < LEVELS.length ? LEVELS[index] : generateLevel(index + 1);
}

/* ══════════════════════════════════════════════════════════════════════
   6. MATERIAIS / TIERS
   Densidade e atrito calibrados testando de verdade no Matter.js: leve o
   bastante pra um acerto de força média já tombar a estrutura (o jogo é
   sobre desabamento, não sobre força bruta), pesado o bastante pro aço
   continuar sendo uma parede que resiste.
   ══════════════════════════════════════════════════════════════════════ */
/* Atrito ALTO em tudo que é estrutural, restituição ZERO. Não é capricho:
   com atrito baixo os apoios escorregam sozinhos sob o próprio peso, e com
   qualquer restituição a pilha fica microquicando pra sempre. O jogo quer
   estrutura que fique de pé até levar pancada — a fragilidade vem de ser
   leve e fina, não de ser escorregadia. */
const BLOCK_KINDS = {
  crate:      { shape: "rect",   color: "#D8C39A", accent: "#A9895A", density: 0.000114, friction: 0.5,  restitution: 0, radius: 6 },
  suitcase:   { shape: "rect",   color: "#C46D28", accent: "#8A4A18", density: 0.000108, friction: 0.5,  restitution: 0, radius: 6 },
  plaque:     { shape: "rect",   color: "#F1EAD9", accent: "#C9A268", density: 0.0002,  friction: 0.55,  restitution: 0, radius: 5 },
  neutralBox: { shape: "rect",   color: "#EDE6D6", accent: "#C9BB9C", density: 9.6e-05, friction: 0.5,  restitution: 0, radius: 6 },
  bottle:     { shape: "circle", color: "#3E5B3E", accent: "#22331C", density: 9e-05,  friction: 0.5,  restitution: 0.1 },
  floral:     { shape: "circle", color: "#9FB98F", accent: "#5F7A52", density: 6.9e-05, friction: 0.6,  restitution: 0.04 },

  /* Estaca fina — leve, cai/voa fácil. Apoio frágil de plataformas e
     molduras: derrubar a estaca faz tudo acima desabar por gravidade.
     A densidade subiu um pouco em relação à primeira versão porque corpo
     leve demais é chacoalhado pelo próprio solver; continua muito mais leve
     que o aço, que é o contraste que importa. */
  stake:      { shape: "rect",   color: "#B98A54", accent: "#7A5230", density: 0.0003,  friction: 0.55, restitution: 0, radius: 4 },

  /* Aço — obstáculo "que atrapalha": pesado e resistente, quase não se move
     nem em força máxima. Não é alvo, é parede estratégica de verdade. */
  steel:      { shape: "rect",   color: "#9AA3AC", accent: "#5C646C", density: 0.00078,  friction: 0.55,  restitution: 0, radius: 4 },

  /* Mola — objeto "que ajuda": restituição altíssima, arremessa de volta o
     que bater nela (inclusive a própria cabeça), útil pra saltar obstáculos. */
  spring:     { shape: "rect",   color: "#7A9B6E", accent: "#3F5636", density: 0.00027,  friction: 0.3,  restitution: 1.6,  radius: 8 },

  /* Telhado — tampa triangular de madeira no topo das torres de casinha.
     Corpo de física de verdade: cai, tomba e rola. */
  roof:       { shape: "triangle", color: "#8A5A34", accent: "#6B4423", density: 7e-05,  friction: 0.55,  restitution: 0 },

  /* ── Objetos caóticos ────────────────────────────────────────────────
     Todos têm `special`, que liga o comportamento da seção 10. */

  /* TNT: a estrela do caos. Explosão enorme, cadeia com tudo. */
  tnt:        { shape: "rect",   color: "#B4462A", accent: "#712615", density: 0.00015,  friction: 0.5, restitution: 0, radius: 8, special: "tnt" },

  /* Foguete de fogos: atingido, acende o pavio, sai voando e estoura em
     fogos de artifício no fim do curso. Imprevisível de propósito. */
  rocket:     { shape: "rect",   color: "#C46D28", accent: "#7E4212", density: 8.4e-05, friction: 0.5, restitution: 0, radius: 5, special: "rocket" },

  /* Champanhe: a rolha estoura pra um lado e a garrafa sai girando pro
     outro feito míssil desgovernado, espirrando espuma. */
  champagne:  { shape: "rect",   color: "#2F4A34", accent: "#18301C", density: 9.6e-05, friction: 0.5, restitution: 0, radius: 12, special: "champagne" },

  /* Vidro: estilhaça em cacos físicos de verdade quando leva pancada. */
  glass:      { shape: "rect",   color: "#CFE9F2", accent: "#8FC4D6", density: 7.2e-05, friction: 0.5,  restitution: 0.05, radius: 6, special: "glass" },

  /* Caco de vidro — só nasce quando um vidro estilhaça. */
  shard:      { shape: "rect",   color: "#DCEFF6", accent: "#9CCBDC", density: 3.6e-05, friction: 0.5,  restitution: 0.2,  radius: 2 },

  /* Bolo de casamento: pesado, macio, esparrama merengue quando desaba. */
  cake:       { shape: "rect",   color: "#FBF3E4", accent: "#E3C9A6", density: 0.000126, friction: 0.55,  restitution: 0, radius: 10, special: "cake" },
};

/* Presentes-alvo por resistência. HP baixo de propósito: o jogo é sobre
   derrubar estrutura, não sobre martelar o mesmo alvo cinco vezes. */
const GIFT_TIERS = {
  weak:    { color: "#F1EAD9", accent: "#C9A268", ribbon: "#C46D28", hp: 1, points: CFG.POINTS.weak },
  medium:  { color: "#9FB98F", accent: "#4F6B45", ribbon: "#F1EAD9", hp: 1, points: CFG.POINTS.medium },
  strong:  { color: "#C46D28", accent: "#8A4A18", ribbon: "#F1EAD9", hp: 1, points: CFG.POINTS.strong },
  golden:  { color: "#D9B25C", accent: "#8C6A24", ribbon: "#FFF8E6", hp: 1, points: CFG.POINTS.golden },
  special: { color: "#D9A9C4", accent: "#9C6683", ribbon: "#FFFFFF", hp: 1, points: CFG.POINTS.special },
};

const GIFT_SIZE_PX = {
  sm:   { w: 48,  h: 48  },
  md:   { w: 66,  h: 66  },
  lg:   { w: 90,  h: 90  },
  tall: { w: 58,  h: 102 },
  wide: { w: 112, h: 64  },
};

/* ══════════════════════════════════════════════════════════════════════
   7. SETUP DO MATTER.JS
   ══════════════════════════════════════════════════════════════════════ */
const Engine = Matter.Engine, World = Matter.World, Bodies = Matter.Bodies,
      Body = Matter.Body, Events = Matter.Events, Composite = Matter.Composite,
      Constraint = Matter.Constraint;

const engine = Engine.create();
engine.world.gravity.y = CFG.GRAVITY_Y;
/* Solver caprichado. Uma torre de 9 andares de estaca fina é o pior caso
   possível pra um motor 2D: cada andar apoia no anterior por dois contatos
   estreitos, e o errinho de posição de cada contato se acumula pra cima até
   a torre desabar sozinha, sem ninguém ter atirado. Mais iterações de
   posição custam pouco (são poucos corpos) e resolvem justamente isso. */
engine.positionIterations = 20;
engine.velocityIterations = 14;
engine.constraintIterations = 4;
/* Corpo parado dorme, e corpo dormindo não treme. Sem isso, o ruído
   numérico residual de cada contato mantém a pilha inteira vibrando de
   leve — e vibração, numa torre alta, vira tombo. O Matter acorda tudo
   sozinho na colisão; as explosões acordam na mão (ver applyBlast). */
engine.enableSleeping = true;

/* Duas constantes derivadas da gravidade, em unidades diferentes:
   · GRAV_STEP — quanto a gravidade soma à VELOCIDADE (px/passo) a cada
     passo do motor. Usada pela previsão pontilhada da trajetória.
   · GRAV_FORCE — força por unidade de massa que o Matter aplica como
     gravidade (mass * gravity.y * gravity.scale). É a unidade certa pra
     Body.applyForce; usada pela flutuação dos balões e pelo empuxo dos
     foguetes/champanhe. Confundir as duas erra por ~278x. */
const STEP_MS = 1000 / 60;   // passo fixo do motor (o Matter reclama acima disso)
const GRAV_STEP = CFG.GRAVITY_Y * 0.001 * (STEP_MS * STEP_MS);
const GRAV_FORCE = CFG.GRAVITY_Y * 0.001;

let groundBody = null;
let leftWallBody = null;
let rightWallBody = null;
let activeBlocks = [];    // corpos de estrutura da fase atual
let activeGifts = [];     // corpos de presente da fase atual
let activeBombs = [];     // bombas ainda não explodidas
let activeBalloons = [];  // balões de gás (com seus fios)
let activeStars = [];     // estrelas bônus ainda não pegas
let activeRopes = [];     // Constraints dos balões
let restBodies = [];      // projéteis já assentados (viram cenário)
let currentWorldWidth = CFG.VIEW_W;

function allDynamicBodies() {
  return activeBlocks.concat(activeGifts, activeBombs, activeBalloons, restBodies);
}

function clearLevelBodies() {
  activeRopes.forEach(function (r) { Composite.remove(engine.world, r); });
  allDynamicBodies().concat(activeStars).forEach(function (b) { World.remove(engine.world, b); });
  if (Game.currentProjectile) { World.remove(engine.world, Game.currentProjectile); Game.currentProjectile = null; }
  activeBlocks = []; activeGifts = []; activeBombs = [];
  activeBalloons = []; activeStars = []; activeRopes = []; restBodies = [];
}

function setupStaticBounds(worldWidth) {
  [groundBody, leftWallBody, rightWallBody].forEach(function (b) { if (b) World.remove(engine.world, b); });

  const groundY = CFG.VIEW_H - CFG.GROUND_H;
  groundBody = Bodies.rectangle(worldWidth / 2, groundY + CFG.GROUND_H / 2 + 40, worldWidth + 1200, CFG.GROUND_H + 80, {
    isStatic: true, friction: 0.9, label: "wgl-ground",
  });
  /* Paredes invisíveis bem além das bordas jogáveis — impedem que algo role
     infinitamente pros lados. Altíssimas, porque agora as torres e os
     foguetes sobem muito. */
  leftWallBody  = Bodies.rectangle(-160, 0, 80, CFG.VIEW_H * 12, { isStatic: true, label: "wgl-wall" });
  rightWallBody = Bodies.rectangle(worldWidth + 160, 0, 80, CFG.VIEW_H * 12, { isStatic: true, label: "wgl-wall" });
  World.add(engine.world, [groundBody, leftWallBody, rightWallBody]);
}

/* ══════════════════════════════════════════════════════════════════════
   8. FÁBRICA DE CORPOS
   ══════════════════════════════════════════════════════════════════════ */
function createBlockBody(x, y, spec) {
  const mat = BLOCK_KINDS[spec.kind] || BLOCK_KINDS.crate;
  /* frictionAir alto (o padrão do Matter) NÃO é detalhe: com amortecimento
     quase zero, a micro-oscilação de cada contato nunca morre e uma torre de
     vários andares se sacode sozinha até desabar, sem ninguém ter atirado.
     Foi exatamente esse o bug. O custo é entulho voando um pouco menos
     longe, o que nem se nota. */
  const opts = { density: mat.density, friction: mat.friction, restitution: mat.restitution, frictionAir: 0.003 };
  let body;
  if (mat.shape === "circle") {
    body = Bodies.circle(x, y, spec.w / 2, opts);
  } else if (mat.shape === "triangle") {
    // slope quase 1 (não pode ser exatamente 1) fecha o topo do trapézio num
    // ponto só — vira um triângulo de verdade, com física real.
    body = Bodies.trapezoid(x, y, spec.w, spec.h, 0.98, opts);
  } else {
    body = Bodies.rectangle(x, y, spec.w, spec.h, opts);
  }
  if (spec.angle) Body.setAngle(body, spec.angle);
  body.label = "wgl-block";
  body.wglBlock = {
    kind: spec.kind, w: spec.w, h: spec.h || spec.w,
    initialAngle: body.angle, fallen: false,
    seed: Math.random(),
  };
  if (mat.special) {
    body.wglSpecial = { type: mat.special, armed: false, spent: false, litAt: 0 };
  }
  return body;
}

function createGiftBody(x, y, spec) {
  const tier = GIFT_TIERS[spec.tier] || GIFT_TIERS.weak;
  const dims = GIFT_SIZE_PX[spec.size || "md"];
  const opts = { density: 0.000054, friction: 0.5, restitution: 0.04, frictionAir: 0.003 };
  const body = spec.shape === "round"
    ? Bodies.circle(x, y, dims.w / 2, opts)
    : Bodies.rectangle(x, y, dims.w, dims.h, opts);
  body.label = "wgl-gift";
  body.wglGift = {
    tier: spec.tier, shape: spec.shape, size: spec.size || "md",
    hp: tier.hp, maxHp: tier.hp, points: tier.points,
    destroyed: false, lastHitAt: 0, wobble: 0,
    w: dims.w, h: spec.shape === "round" ? dims.w : dims.h,
  };
  return body;
}

/* Bomba: leve o bastante pra ser empurrada fácil, mas com massa suficiente
   pra também empurrar vizinhos quando ela mesma é arremessada. */
function createBombBody(x, y) {
  const body = Bodies.circle(x, y, CFG.BOMB_RADIUS, { density: 0.0003, friction: 0.5, restitution: 0.15, frictionAir: 0.003 });
  body.label = "wgl-bomb";
  body.wglBomb = { exploded: false };
  return body;
}

/* Balão: densidade baixíssima + flutuação aplicada a cada passo (ver
   updateBalloons). O presente pendura num Constraint — física de verdade,
   com o presente balançando enquanto o balão sobe. */
function createBalloon(spec) {
  const balloon = Bodies.circle(spec.x, spec.y, spec.radius, {
    density: 0.00006, friction: 0.05, restitution: 0.6, frictionAir: 0.02,
  });
  balloon.label = "wgl-balloon";
  balloon.wglBalloon = {
    popped: false, targetY: spec.y, radius: spec.radius,
    color: choose(["#D9A9C4", "#BFE3EE", "#E9D6A8", "#9FB98F", "#F1B5B5"]),
    payloadMass: 0, seed: Math.random(),
  };

  const dims = GIFT_SIZE_PX[spec.gift.size || "md"];
  const gh = spec.gift.shape === "round" ? dims.w : dims.h;
  const gift = createGiftBody(spec.x, spec.y + spec.radius + spec.ropeLen + gh / 2, spec.gift);

  const rope = Constraint.create({
    bodyA: balloon, pointA: { x: 0, y: spec.radius },
    bodyB: gift,    pointB: { x: 0, y: -gh / 2 },
    length: spec.ropeLen, stiffness: 0.06, damping: 0.08,
  });
  balloon.wglBalloon.payloadMass = gift.mass;
  balloon.wglBalloon.rope = rope;
  balloon.wglBalloon.gift = gift;
  gift.wglHanging = true;   // balança pra sempre; não segura o próximo tiro
  return { balloon: balloon, gift: gift, rope: rope };
}

/* Estrela bônus: corpo estático E sensor. Estático pra não cair; sensor pra
   não empurrar (nem ser empurrada por) nada — ela não pode atrapalhar o
   desabamento das estruturas, só registrar quem passou por ela. */
function createStarBody(spec) {
  const r = spec.big ? 34 : 24;
  const body = Bodies.circle(spec.x, spec.y, r, { isStatic: true, isSensor: true });
  body.label = "wgl-star";
  body.wglStar = {
    collected: false, big: !!spec.big, r: r,
    points: spec.big ? CFG.POINTS.starBig : CFG.POINTS.star,
    seed: Math.random() * 6.28,
  };
  return body;
}

/* ══════════════════════════════════════════════════════════════════════
   9. MONTAGEM DA FASE
   ══════════════════════════════════════════════════════════════════════ */
const STAKE_W = 20;
const PLATFORM_H = 22;

function buildLevelBodies(level) {
  const groundY = CFG.VIEW_H - CFG.GROUND_H;
  const blocks = [], gifts = [], bombs = [], balloons = [], ropes = [], stars = [];
  /* Estrelas: a graça é estarem em cantos difíceis, não impossíveis. Aqui
     elas são puxadas pra dentro do envelope de alcance — quanto mais longe
     da forquilha, mais baixo o arremesso consegue chegar, então uma estrela
     lá no fundo tem que descer. */
  (level.stars || []).forEach(function (s) {
    const sx = Math.min(s.x, (level.slingX || 230) + 2100);
    stars.push(createStarBody({
      x: sx,
      y: Math.max(s.y, maxReachHeightAt(sx, level.slingX) + 60),
      big: s.big,
    }));
  });

  /* ── Anti-sobreposição ────────────────────────────────────────────────
     No Matter, dois corpos criados um DENTRO do outro se repelem com força
     no primeiro passo: a fase "explode sozinha" antes do primeiro tiro e o
     jogador não entende nada. Em vez de depender de eu acertar todas as
     coordenadas na mão (e o gerador infinito acertar também), a montagem
     reserva o espaço de cada estrutura e empurra os avulsos (TNT, foguete,
     champanhe, presentes soltos, balões) pro lugar livre mais próximo. */
  const obstacles = [];
  function reserve(cx, w, topY) {
    obstacles.push({ x0: cx - w / 2, x1: cx + w / 2, y0: topY });
  }
  /* Conflita se a coluna cruza a estrutura na horizontal E a estrutura sobe
     acima da base da coluna. A altura importa: um balão pendurado LÁ EM CIMA
     pode passar por cima de uma paliçada baixa sem problema nenhum — só não
     pode nascer dentro do telhado de uma torre alta. */
  function columnBusy(px, half, bottomY) {
    return obstacles.some(function (o) {
      return px + half > o.x0 && px - half < o.x1 && o.y0 < bottomY;
    });
  }
  function columnOverlap(px, half, bottomY) {
    let worst = 0;
    obstacles.forEach(function (o) {
      if (o.y0 >= bottomY) return;
      const ov = Math.min(px + half, o.x1) - Math.max(px - half, o.x0);
      if (ov > worst) worst = ov;
    });
    return worst;
  }
  /* Acha o X livre mais próximo pra um objeto de largura w apoiado no chão
     (ou pra a coluna inteira de um balão). Procura pros dois lados e
     devolve o original se não achar nada — melhor levemente encavalado que
     teleportado pro outro canto do mapa. */
  /* Alcance máximo do arremesso, medido rodando a física de verdade: 2201px
     no chão a partir da forquilha. Nada pode ser empurrado pra além disso —
     viraria um alvo impossível, e a fase nunca terminaria. */
  const reachX = (level.slingX || 230) + 2140;
  /* E também não vale empurrar pra trás do estilingue: um TNT parado atrás
     do jogador não é alvo, é enfeite invisível. A faixa útil é sempre
     "à frente da forquilha e dentro do alcance". */
  const minX = (level.slingX || 230) + 220;
  function freeX(x, w, bottomY) {
    const half = w / 2 + 8;
    const bY = bottomY === undefined ? groundY : bottomY;
    const inRange = function (px) { return px - half >= minX && px + half <= reachX; };
    if (inRange(x) && !columnBusy(x, half, bY)) return x;
    /* Se nada estiver totalmente livre (fases finais são bem apertadas),
       fica com a posição de MENOR sobreposição em vez de devolver a original —
       um encaixe apertado assenta sozinho; nascer 50px dentro de uma parede
       arremessa a estrutura inteira pelos ares no primeiro passo. */
    let best = clamp(x, minX + half, reachX - half), bestOv = Infinity;
    for (let d = 0; d <= 900; d += 14) {
      const cands = d === 0 ? [x] : [x - d, x + d];
      for (const px of cands) {
        if (!inRange(px)) continue;
        const ov = columnOverlap(px, half, bY);
        if (ov <= 0) return px;
        if (ov < bestOv) { bestOv = ov; best = px; }
      }
    }
    return best;
  }
  function placeOnGround(x, w, h, make) {
    const px = freeX(x, w);
    reserve(px, w, groundY - h);
    return make(px);
  }

  (level.towers || []).forEach(function (t) {
    let topY = t.base === "ground" ? groundY : t.base;
    let widest = 0;
    (t.blocks || []).forEach(function (spec) {
      const h = spec.h || spec.w;
      if (spec.w > widest) widest = spec.w;
      blocks.push(createBlockBody(t.x + (spec.dx || 0), topY - h / 2, spec));
      topY -= h;
    });
    reserve(t.x, widest, topY);
    if (t.topGift) {
      const dims = GIFT_SIZE_PX[t.topGift.size || "md"];
      const gh = t.topGift.shape === "round" ? dims.w : dims.h;
      gifts.push(createGiftBody(t.x + (t.topGift.dx || 0), topY - gh / 2, t.topGift));
    }
  });

  /* "Ponte": plataforma fina apoiada em duas estacas. Derrubar UMA estaca
     já derruba a plataforma (e o presente) por gravidade. */
  (level.bridges || []).forEach(function (br) {
    const stakeSpec = { kind: "stake", w: STAKE_W, h: br.stakeH };
    blocks.push(createBlockBody(br.xLeft, groundY - br.stakeH / 2, stakeSpec));
    blocks.push(createBlockBody(br.xRight, groundY - br.stakeH / 2, stakeSpec));
    reserve(br.xLeft, STAKE_W, groundY - br.stakeH);
    reserve(br.xRight, STAKE_W, groundY - br.stakeH);

    const platformCenterX = (br.xLeft + br.xRight) / 2;
    const platformW = (br.xRight - br.xLeft) + STAKE_W * 1.6;
    const platformTopY = groundY - br.stakeH;
    blocks.push(createBlockBody(platformCenterX, platformTopY - PLATFORM_H / 2, { kind: "plaque", w: platformW, h: PLATFORM_H }));

    if (br.gift) {
      const dims = GIFT_SIZE_PX[br.gift.size || "md"];
      const gh = br.gift.shape === "round" ? dims.w : dims.h;
      gifts.push(createGiftBody(platformCenterX + (br.gift.dx || 0), platformTopY - PLATFORM_H - gh / 2, br.gift));
    }
  });

  /* "Torre de casinhas" — andares empilhados de moldura (2 pilares + viga),
     com presente (ou bloco) NO CHÃO de cada andar. Quanto mais andares,
     mais alto e mais espetacular o desabamento. */
  (level.frameTowers || []).forEach(function (ft) {
    let baseY = groundY;
    /* Trava de alcance: o presente do último andar tem que ser acertável.
       Como o envelope fecha com a distância, uma torre lá no fundo não pode
       ter a mesma altura de uma torre perto — se a fase pedir mais andares
       do que cabem ali, os de cima simplesmente não são construídos. Melhor
       uma torre mais baixa do que uma fase que não dá pra terminar. */
    const teto = maxReachHeightAt(ft.x, level.slingX) + 40;
    /* Teto duplo: o alcance do arremesso E o limite de estabilidade.
       Acima de 8 andares a pilha começa a se sacudir sozinha por acúmulo de
       erro de contato, por mais que se aumente atrito e iterações. */
    const cabem = Math.min(8, Math.max(1, Math.floor((groundY - teto) / (ft.legH + ft.beamH))));
    const andares = (ft.levels || []).slice(0, cabem);
    andares.forEach(function (spec) {
      const leftX = ft.x - ft.width / 2, rightX = ft.x + ft.width / 2;
      const postSpec = { kind: "stake", w: ft.postW, h: ft.legH };
      blocks.push(createBlockBody(leftX, baseY - ft.legH / 2, postSpec));
      blocks.push(createBlockBody(rightX, baseY - ft.legH / 2, postSpec));
      const beamW = ft.width + ft.postW * 1.6;
      blocks.push(createBlockBody(ft.x, baseY - ft.legH - ft.beamH / 2, { kind: "plaque", w: beamW, h: ft.beamH }));
      /* Assentado com contato EXATO no piso do andar. A versão antiga deixava
         1px de folga "por segurança": com vários andares, cada presente caía
         esse 1px, batia, e as batidas fora de sincronia balançavam a torre
         até ela desabar sozinha. Um pixel de folga custou o jogo inteiro. */
      if (spec.gift) {
        const dims = GIFT_SIZE_PX[spec.gift.size || "md"];
        const gh = spec.gift.shape === "round" ? dims.w : dims.h;
        gifts.push(createGiftBody(ft.x + (spec.gift.dx || 0), baseY - gh / 2, spec.gift));
      }
      if (spec.block) {
        const bh = spec.block.h || spec.block.w;
        blocks.push(createBlockBody(ft.x + (spec.block.dx || 0), baseY - bh / 2, spec.block));
      }
      baseY -= (ft.legH + ft.beamH);
    });
    if (ft.roof !== false) {
      const beamW = ft.width + ft.postW * 1.6;
      const roofH = Math.max(32, beamW * 0.26);
      /* O centro do triângulo não fica no meio da altura, e o Matter
         recentraliza o trapézio no centroide dele — chutar "h/3" deixava o
         telhado meio pixel dentro da viga. Aqui a base é medida no corpo já
         criado e encostada no lugar certo. Meio pixel de sobreposição no
         topo de uma torre de nove andares vira desabamento. */
      const teto = createBlockBody(ft.x, baseY, { kind: "roof", w: beamW + 16, h: roofH });
      const baseOffset = teto.bounds.max.y - teto.position.y;
      Body.setPosition(teto, { x: ft.x, y: baseY - baseOffset });
      blocks.push(teto);
      baseY -= roofH;
    }
    reserve(ft.x, ft.width + ft.postW * 1.6 + 16, baseY);
  });

  /* "Castelo de cartas" — duas estacas em "A", presente no chão entre elas. */
  (level.castles || []).forEach(function (c) {
    /* As pernas se inclinam pra dentro, então na altura do topo do presente
       elas estão bem mais juntas que na base. Se o presente for largo demais
       pra abertura, ele nasce DENTRO da perna e o castelo se auto-destrói no
       primeiro passo da física. Em vez de exigir que quem escreve a fase
       faça essa trigonometria, aqui a inclinação abre sozinha até caber. */
    const lean = c.leanAngle;
    let legH = c.legH;
    if (c.gift) {
      const dims = GIFT_SIZE_PX[c.gift.size || "md"];
      const gw = dims.w, gh = c.gift.shape === "round" ? dims.w : dims.h;
      /* Abertura livre na altura do TOPO do presente. Aumentar o ângulo não
         resolve (abre a base mas fecha mais rápido lá em cima); o que resolve
         é a perna ser mais comprida. Então o castelo cresce até o presente
         caber, em vez de exigir a conta na mão em cada fase. */
      const needed = (gw / 2 + 8 + gh * Math.tan(lean) + (STAKE_W / 2) / Math.cos(lean)) / Math.sin(lean);
      legH = clamp(Math.max(legH, needed), legH, 340);
    }
    const spread = 2 * legH * Math.sin(lean);
    /* As duas pernas se encontram no ápice. Sem esse afastamentozinho elas
       nasceriam uma DENTRO da outra lá em cima (os centros coincidem), e o
       motor passaria o resto da fase empurrando as duas pra fora — o castelo
       ia abrindo sozinho até cair. Agora elas só se encostam. */
    const apice = (STAKE_W * 0.55) / Math.cos(lean);
    const leftCx = c.x - spread / 2 + (legH / 2) * Math.sin(lean) - apice;
    const rightCx = c.x + spread / 2 - (legH / 2) * Math.sin(lean) + apice;
    const cy = groundY - (legH / 2) * Math.cos(lean);
    blocks.push(createBlockBody(leftCx, cy, { kind: "stake", w: STAKE_W, h: legH, angle: lean }));
    blocks.push(createBlockBody(rightCx, cy, { kind: "stake", w: STAKE_W, h: legH, angle: -lean }));
    reserve(c.x, spread + STAKE_W * 2, groundY - legH * Math.cos(lean));
    if (c.gift) {
      const dims = GIFT_SIZE_PX[c.gift.size || "md"];
      const gh = c.gift.shape === "round" ? dims.w : dims.h;
      gifts.push(createGiftBody(c.x + (c.gift.dx || 0), groundY - gh / 2, c.gift));
    }
  });

  /* "Barreira" — fileira de estacas finas lado a lado, tipo paliçada. */
  (level.walls || []).forEach(function (w) {
    const totalW = w.count * w.postW + (w.count - 1) * w.gap;
    const startX = w.x - totalW / 2 + w.postW / 2;
    for (let i = 0; i < w.count; i++) {
      blocks.push(createBlockBody(startX + i * (w.postW + w.gap), groundY - w.height / 2, { kind: "stake", w: w.postW, h: w.height }));
    }
    reserve(w.x, totalW, groundY - w.height);
  });

  /* ── Avulsos: entram DEPOIS das estruturas, no lugar livre mais próximo ── */
  (level.extraBlocks || []).forEach(function (spec) {
    const h = spec.h || spec.w;
    if (spec.y !== undefined) {   // posicionado no ar de propósito: respeita
      blocks.push(createBlockBody(spec.x, spec.y, spec));
      return;
    }
    blocks.push(placeOnGround(spec.x, spec.w, h, function (px) {
      return createBlockBody(px, groundY - h / 2, spec);
    }));
  });

  (level.extraGifts || []).forEach(function (spec) {
    const dims = GIFT_SIZE_PX[spec.size || "md"];
    const gh = spec.shape === "round" ? dims.w : dims.h;
    gifts.push(placeOnGround(spec.x, dims.w, gh, function (px) {
      return createGiftBody(px, groundY - gh / 2, spec);
    }));
  });

  (level.bombs || []).forEach(function (spec) {
    if (spec.y !== undefined) { bombs.push(createBombBody(spec.x, spec.y)); return; }
    bombs.push(placeOnGround(spec.x, CFG.BOMB_RADIUS * 2, CFG.BOMB_RADIUS * 2, function (px) {
      return createBombBody(px, groundY - CFG.BOMB_RADIUS);
    }));
  });

  /* Balões de gás segurando presentes. A coluna inteira (balão + fio +
     presente) precisa de céu livre: se o X pedido cai em cima de uma torre,
     o balão é empurrado pro lado, não pra cima — subir só o enfiaria no
     telhado e o presente pendurado continuaria dentro da estrutura. */
  (level.balloons || []).forEach(function (spec) {
    const dims = GIFT_SIZE_PX[spec.gift.size || "md"];
    const gh = spec.gift.shape === "round" ? dims.w : dims.h;
    const colW = Math.max(spec.radius * 2, dims.w) + 20;
    // base da coluna = onde termina o presente pendurado
    /* Altura e posição se influenciam: baixar o balão pra ele ficar
       alcançável pode enfiá-lo numa torre, e desviá-lo de lado pode levá-lo
       pra uma distância onde aquela altura já não serve. Duas passadas
       resolvem o vaivém — a segunda parte de uma altura já válida. */
    let py = Math.max(spec.y, maxReachHeightAt(spec.x, level.slingX) + 70);
    let px = freeX(spec.x, colW, py + spec.radius + spec.ropeLen + gh);
    py = Math.max(py, maxReachHeightAt(px, level.slingX) + 70);
    px = freeX(px, colW, py + spec.radius + spec.ropeLen + gh);
    const built = createBalloon(Object.assign({}, spec, { x: px, y: py }));
    reserve(px, colW, py - spec.radius);
    balloons.push(built.balloon);
    gifts.push(built.gift);
    ropes.push(built.rope);
  });

  return { blocks: blocks, gifts: gifts, bombs: bombs, balloons: balloons, ropes: ropes, stars: stars };
}

/* Largura de mundo necessária pra fase (conteúdo mais folga). */
function computeWorldWidth(level) {
  let maxX = CFG.VIEW_W - 260;
  const bump = function (x) { if (x > maxX) maxX = x; };
  (level.towers || []).forEach(function (t) { bump(t.x); });
  (level.bridges || []).forEach(function (b) { bump(b.xRight); });
  (level.extraGifts || []).forEach(function (s) { bump(s.x); });
  (level.extraBlocks || []).forEach(function (s) { bump(s.x); });
  (level.bombs || []).forEach(function (s) { bump(s.x); });
  (level.balloons || []).forEach(function (s) { bump(s.x); });
  (level.stars || []).forEach(function (s) { bump(s.x); });
  (level.frameTowers || []).forEach(function (ft) { bump(ft.x + ft.width / 2); });
  (level.castles || []).forEach(function (c) { bump(c.x + c.legH * Math.sin(c.leanAngle)); });
  (level.walls || []).forEach(function (w) { bump(w.x + (w.count * w.postW) / 2); });
  return Math.max(CFG.VIEW_W, maxX + 360);
}

function loadLevelIntoWorld(level) {
  clearLevelBodies();
  currentWorldWidth = computeWorldWidth(level);
  setupStaticBounds(currentWorldWidth);
  const built = buildLevelBodies(level);
  activeBlocks = built.blocks;
  activeGifts = built.gifts;
  activeBombs = built.bombs;
  activeBalloons = built.balloons;
  activeStars = built.stars;
  activeRopes = built.ropes;
  World.add(engine.world, activeBlocks.concat(activeGifts, activeBombs, activeBalloons, activeStars));
  activeRopes.forEach(function (r) { World.add(engine.world, r); });
  settleLevel();
}

/* Assentamento inicial, antes de o jogador ver a fase.

   Por mais bem encaixada que a estrutura seja montada, o motor deixa cada
   contato ceder uma fração de pixel; numa torre de oito andares isso vira
   mais de dez pixels de afundamento. O problema não é o afundamento (ninguém
   vê), é a VELOCIDADE que ele acumula: a torre chega no chão balançando e o
   balanço a derruba sozinha.

   A solução é deixar a fase assentar aqui, com o ar dez vezes mais viscoso —
   ela desce devagar, sem ganhar embalo — e depois zerar velocidades e
   re-anotar o ângulo de repouso de cada bloco (senão o jogo pontuaria o
   assentamento como "você derrubou"). O jogador recebe a fase já parada. */
let isSettling = false;
function settleLevel() {
  const corpos = activeBlocks.concat(activeGifts, activeBombs);
  const arOriginal = corpos.map(function (b) { return b.frictionAir; });
  corpos.forEach(function (b) { b.frictionAir = 0.5; });
  isSettling = true;
  for (let i = 0; i < 90; i++) {
    updateBalloons();
    Engine.update(engine, STEP_MS);
  }
  isSettling = false;
  corpos.forEach(function (b, i) {
    b.frictionAir = arOriginal[i];
    Body.setVelocity(b, { x: 0, y: 0 });
    Body.setAngularVelocity(b, 0);
    if (b.wglBlock) b.wglBlock.initialAngle = b.angle;
  });
  activeBalloons.forEach(function (b) {
    Body.setVelocity(b, { x: 0, y: 0 });
    Body.setAngularVelocity(b, 0);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   10. OBJETOS ESPECIAIS — o coração do caos
   Todos entram pelo mesmo portão: triggerSpecial(body, cause). Um objeto
   pode ser acionado por impacto direto, por onda de choque ou por queda —
   e cada acionamento gera mais acionamentos. É de propósito.
   ══════════════════════════════════════════════════════════════════════ */
let pendingRockets = [];   // foguetes acesos, empurrando
let pendingCorks = [];     // garrafas de champanhe jorrando

function triggerSpecial(body, cause) {
  const sp = body.wglSpecial;
  if (!sp || sp.spent) return;
  /* Trava de segurança: nada de explosivo se acende antes do primeiro
     arremesso da fase. Sem isso, um TNT posicionado no alto caía sozinho na
     abertura da fase, detonava ao bater no chão e terminava o nível antes
     do jogador encostar na tela — o oposto da graça. Vale pra qualquer
     causa (impacto ou onda de choque), porque a cadeia também nasceria daí. */
  if (Game.throwsUsed === 0 && cause !== "player") return;
  switch (sp.type) {
    case "tnt":       sp.spent = true; detonateTNT(body); break;
    case "rocket":    sp.spent = true; igniteRocket(body); break;
    case "champagne": sp.spent = true; popChampagne(body); break;
    case "glass":     sp.spent = true; shatterGlass(body); break;
    case "cake":      sp.spent = true; splatCake(body); break;
    default: break;
  }
}

function removeBlock(body) {
  World.remove(engine.world, body);
  activeBlocks = activeBlocks.filter(function (b) { return b !== body; });
}

/* ── TNT ──────────────────────────────────────────────────────────────
   A explosão maior do jogo. Some do mundo e deixa uma cratera de caos. */
function detonateTNT(body) {
  const x = body.position.x, y = body.position.y;
  removeBlock(body);
  Score.add(CFG.POINTS.tnt);
  Chaos.gain(CFG.CHAOS_GAIN.explosive);
  Game.stats.explosives++;
  spawnFloatingText(x, y - 30, "TNT!", "#B4462A", true);
  applyBlast(x, y, CFG.TNT_BLAST_RADIUS, CFG.TNT_FORCE, CFG.TNT_GIFT_DESTROY_RADIUS);
  bigBoomFX(x, y, 1.35, "#FF9440");
}

/* ── Foguete de fogos ─────────────────────────────────────────────────
   Acende o pavio, sobe girando e estoura em fogos. Sai numa direção
   mais ou menos aleatória — é o objeto mais imprevisível do jogo. */
function igniteRocket(body) {
  const dir = -Math.PI / 2 + rand(-0.75, 0.75); // pra cima, com desvio
  body.wglRocket = { dir: dir, until: performance.now() + CFG.ROCKET_FUSE_MS + CFG.ROCKET_THRUST_MS, startAt: performance.now() + CFG.ROCKET_FUSE_MS };
  pendingRockets.push(body);
  Score.add(CFG.POINTS.rocket);
  Chaos.gain(CFG.CHAOS_GAIN.explosive);
  Game.stats.explosives++;
  spawnFloatingText(body.position.x, body.position.y - 40, "fogos!", PALETTE.terracotta, false);
  SFX.fuse();
}

function updateRockets(now) {
  if (!pendingRockets.length) return;
  pendingRockets = pendingRockets.filter(function (body) {
    const r = body.wglRocket;
    if (!r) return false;
    if (now < r.startAt) {
      spawnSpark(body.position.x, body.position.y, 1);
      return true;
    }
    if (now >= r.until) {
      burstFirework(body);
      return false;
    }
    // Empuxo ao longo da direção de lançamento + giro caótico
    const f = CFG.ROCKET_THRUST * body.mass;
    Body.applyForce(body, body.position, { x: Math.cos(r.dir) * f, y: Math.sin(r.dir) * f });
    Body.setAngularVelocity(body, body.angularVelocity * 0.9 + rand(-0.06, 0.06));
    spawnSmoke(body.position.x, body.position.y, 1, 0.55);
    spawnSpark(body.position.x, body.position.y, 2);
    return true;
  });
}

function burstFirework(body) {
  const x = body.position.x, y = body.position.y;
  removeBlock(body);
  applyBlast(x, y, CFG.ROCKET_BLAST_RADIUS, CFG.ROCKET_FORCE, CFG.ROCKET_GIFT_DESTROY_RADIUS);
  bigBoomFX(x, y, 1.05, "#FFD98A");
  // Fogos: leque de faíscas coloridas em círculo
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + rand(-0.1, 0.1);
    const sp = rand(4, 11);
    particles.push({
      x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(700, 1300), maxLife: 1300, size: rand(3, 6),
      color: choose(["#FFD98A", "#F1B5B5", "#BFE3EE", "#D9A9C4", "#FFF2C9", "#C46D28"]),
      rot: 0, vrot: 0, kind: "spark", grav: 0.1,
    });
  }
  SFX.firework();
}

/* ── Champanhe ────────────────────────────────────────────────────────
   A rolha voa pra um lado, a garrafa gira e sai voando pro outro
   jorrando espuma. Não destrói muito sozinha — mas empurra tudo. */
function popChampagne(body) {
  const dir = -Math.PI / 2 + rand(-1.0, 1.0);
  body.wglChamp = { dir: dir, until: performance.now() + CFG.CHAMPAGNE_THRUST_MS };
  pendingCorks.push(body);

  // A rolha: um corpinho de verdade, arremessado na direção oposta
  const cork = createBlockBody(body.position.x, body.position.y - 60, { kind: "crate", w: 16, h: 20 });
  cork.wglBlock.kind = "stake";
  Body.setVelocity(cork, { x: -Math.cos(dir) * 16, y: -Math.abs(Math.sin(dir)) * 16 - 6 });
  Body.setAngularVelocity(cork, rand(-0.5, 0.5));
  activeBlocks.push(cork);
  World.add(engine.world, cork);

  Score.add(CFG.POINTS.champagne);
  Chaos.gain(CFG.CHAOS_GAIN.explosive * 0.6);
  Game.stats.explosives++;
  spawnFloatingText(body.position.x, body.position.y - 50, "tim-tim!", "#7A9B6E", false);
  spawnFoam(body.position.x, body.position.y - 50, 26);
  Camera.shake(6, 260);
  SFX.cork();
}

function updateChampagnes(now) {
  if (!pendingCorks.length) return;
  pendingCorks = pendingCorks.filter(function (body) {
    const c = body.wglChamp;
    if (!c) return false;
    if (now >= c.until) return false;
    const f = CFG.CHAMPAGNE_THRUST * body.mass;
    Body.applyForce(body, body.position, { x: Math.cos(c.dir) * f, y: Math.sin(c.dir) * f });
    Body.setAngularVelocity(body, body.angularVelocity + rand(-0.09, 0.09));
    spawnFoam(body.position.x, body.position.y, 2);
    return true;
  });
}

/* ── Vidro ────────────────────────────────────────────────────────────
   Some e vira cacos físicos de verdade, que continuam quicando e
   derrubando coisinhas. Puro deleite visual. */
function shatterGlass(body) {
  const x = body.position.x, y = body.position.y;
  const w = body.wglBlock.w, h = body.wglBlock.h;
  removeBlock(body);
  Score.add(CFG.POINTS.shatter);
  Chaos.gain(CFG.CHAOS_GAIN.shatter);
  Game.stats.shattered++;
  SFX.glass();
  Camera.shake(4, 180);
  for (let i = 0; i < 7; i++) {
    const sw = rand(w * 0.16, w * 0.34), sh = rand(h * 0.16, h * 0.34);
    const shard = createBlockBody(x + rand(-w / 3, w / 3), y + rand(-h / 3, h / 3), { kind: "shard", w: sw, h: sh });
    Body.setVelocity(shard, { x: rand(-7, 7), y: rand(-9, -1) });
    Body.setAngularVelocity(shard, rand(-0.4, 0.4));
    shard.wglBlock.fallen = true; // cacos não pontuam de novo ao "cair"
    activeBlocks.push(shard);
    World.add(engine.world, shard);
  }
  for (let i = 0; i < 16; i++) {
    particles.push({
      x: x, y: y, vx: rand(-6, 6), vy: rand(-7, 2),
      life: rand(300, 600), maxLife: 600, size: rand(2, 4.5),
      color: choose(["#DCEFF6", "#FFFFFF", "#BFE3EE"]),
      rot: 0, vrot: rand(-0.4, 0.4), kind: "shardbit", grav: 0.26,
    });
  }
}

/* ── Bolo ─────────────────────────────────────────────────────────────
   Não explode: esparrama merengue e vira uma poça mole que amortece o
   que cair em cima. É o alívio cômico da física. */
function splatCake(body) {
  const x = body.position.x, y = body.position.y;
  spawnFrosting(x, y, 26);
  spawnFloatingText(x, y - 30, "esparramou!", "#B97C9E", false);
  SFX.splat();
  Body.setDensity(body, 0.0002);
  body.restitution = 0;
  body.friction = 0.9;
}

/* ══════════════════════════════════════════════════════════════════════
   11. EXPLOSÕES / EFEITOS DE TELA
   ══════════════════════════════════════════════════════════════════════ */
let shockwaves = [];
let screenFlash = 0;        // 0..1, decai sozinho
let hitStopUntil = 0;       // congela a física por alguns ms (impacto seco)
let slowMoUntil = 0;        // câmera lenta nas cadeias grandes
let chainDepth = 0;         // quantas explosões dispararam nos últimos ms
let chainResetAt = 0;

/* Onda de choque genérica: empurra tudo num raio, destrói presentes no
   miolo, e acende qualquer objeto especial que estiver por perto (é assim
   que uma explosão vira cinco). */
function applyBlast(cx, cy, radius, force, destroyRadius) {
  const now = performance.now();
  if (now > chainResetAt) chainDepth = 0;
  chainDepth++;
  chainResetAt = now + 900;
  if (chainDepth === 3) { slowMoUntil = now + 700; spawnFloatingText(cx, cy - 90, "reação em cadeia!", PALETTE.gold, true); }

  shockwaves.push({ x: cx, y: cy, r: 10, max: radius, life: 480, maxLife: 480 });

  // A onda de choque também colhe as estrelas que alcançar
  activeStars.slice().forEach(function (s) {
    if (dist(s.position.x, s.position.y, cx, cy) <= radius) collectStar(s);
  });

  const affected = allDynamicBodies().concat(Game.currentProjectile ? [Game.currentProjectile] : []);
  const toTrigger = [];
  affected.forEach(function (b) {
    if (b.isStatic && b !== Game.currentProjectile) return;
    const dx = b.position.x - cx, dy = b.position.y - cy;
    const d = Math.hypot(dx, dy);
    if (d > radius || d < 0.5) return;
    const falloff = 1 - d / radius;
    /* Sem escalar por massa: força fixa por distância deixa o aço resistir
       de verdade e as estacas/presentes saírem voando. É o contraste que dá
       graça na explosão. */
    const mag = force * falloff;
    if (!b.isStatic) {
      Body.applyForce(b, b.position, { x: (dx / d) * mag, y: (dy / d) * mag - mag * 0.34 });
      Body.setAngularVelocity(b, b.angularVelocity + rand(-0.3, 0.3) * falloff);
    }
    if (b.wglGift && !b.wglGift.destroyed && d <= destroyRadius) {
      registerGiftDestroyed(b, b.position.x, b.position.y);
    }
    if (b.wglBalloon && !b.wglBalloon.popped) popBalloon(b);
    if (b.wglBomb && !b.wglBomb.exploded) toTrigger.push({ b: b, kind: "bomb" });
    if (b.wglSpecial && !b.wglSpecial.spent) toTrigger.push({ b: b, kind: "special" });
    if (b.wglBlock && !b.wglBlock.fallen && d <= destroyRadius) registerBlockFall(b);
  });

  // Cadeia com um pequeno atraso — dá ritmo de "pipoca" em vez de tudo no
  // mesmo frame, e deixa a câmera acompanhar cada estouro.
  toTrigger.forEach(function (t, i) {
    setTimeout(function () {
      if (t.kind === "bomb") explodeBomb(t.b);
      else triggerSpecial(t.b, "blast");
    }, CFG.CHAIN_DELAY_MS * (1 + i * 0.35));
  });
}

/* Pacote visual/sonoro de explosão. scale ~1 = bomba, 1.35 = TNT. */
function bigBoomFX(x, y, scale, color) {
  spawnSmoke(x, y, Math.round(16 * scale), 1.2 * scale);
  spawnSpark(x, y, Math.round(26 * scale));
  spawnConfetti(x, y, Math.round(22 * scale));
  particles.push({ x: x, y: y, vx: 0, vy: 0, life: 260, maxLife: 260, size: 70 * scale, color: color || "#FFB25C", rot: 0, vrot: 0, kind: "fireball", grav: 0 });
  Camera.shake(13 * scale, 420 * scale);
  screenFlash = Math.min(1, screenFlash + 0.42 * scale);
  hitStopUntil = performance.now() + 70 * scale;
  vibrate([25, 40, 25, 60]);
  SFX.explosion();
}

/* Bomba clássica (mantida do jogo original, agora com o mesmo pacote de FX). */
function explodeBomb(bomb) {
  if (!bomb || !bomb.wglBomb || bomb.wglBomb.exploded) return;
  bomb.wglBomb.exploded = true;
  const cx = bomb.position.x, cy = bomb.position.y;
  World.remove(engine.world, bomb);
  activeBombs = activeBombs.filter(function (b) { return b !== bomb; });

  Score.add(CFG.POINTS.bomb);
  Chaos.gain(CFG.CHAOS_GAIN.explosive);
  Game.stats.explosives++;
  spawnFloatingText(cx, cy - 24, "BUM!", PALETTE.terracotta, true);
  applyBlast(cx, cy, CFG.BOMB_BLAST_RADIUS, CFG.BOMB_FORCE, CFG.BOMB_GIFT_DESTROY_RADIUS);
  bigBoomFX(cx, cy, 1, "#FFB25C");
}

/* Balão estourado: o fio some e o presente despenca em queda livre. */
function popBalloon(balloon) {
  const b = balloon.wglBalloon;
  if (b.popped) return;
  b.popped = true;
  if (b.rope) {
    Composite.remove(engine.world, b.rope);
    activeRopes = activeRopes.filter(function (r) { return r !== b.rope; });
  }
  World.remove(engine.world, balloon);
  activeBalloons = activeBalloons.filter(function (x) { return x !== balloon; });
  Score.add(CFG.POINTS.balloon);
  Chaos.gain(CFG.CHAOS_GAIN.shatter);
  Game.stats.balloonsPopped++;
  spawnFloatingText(balloon.position.x, balloon.position.y, "pop!", b.color, false);
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: balloon.position.x, y: balloon.position.y,
      vx: rand(-5, 5), vy: rand(-5, 5),
      life: rand(300, 550), maxLife: 550, size: rand(4, 8),
      color: b.color, rot: rand(0, 6), vrot: rand(-0.3, 0.3), kind: "confetti", grav: 0.2,
    });
  }
  SFX.pop();
  vibrate(14);
}

/* Flutuação dos balões: mola vertical amortecida que cancela a gravidade e
   segura o balão (mais o peso do presente) na altura projetada. Sem isso,
   ou o balão afunda ou some pro céu. */
function updateBalloons() {
  activeBalloons.forEach(function (b) {
    const st = b.wglBalloon;
    if (st.popped) return;
    const totalMass = b.mass + st.payloadMass;
    const dy = b.position.y - st.targetY;
    /* Força por unidade de massa (mesma unidade em que o Matter aplica a
       gravidade: mass * gravity.y * gravity.scale). Cancela o peso do balão
       MAIS o do presente pendurado, e adiciona mola + amortecimento pra ele
       parar na altura projetada em vez de afundar ou sumir pro céu. */
    const a = -GRAV_FORCE * (totalMass / b.mass) - dy * 0.00001 - b.velocity.y * 0.001;
    Body.applyForce(b, b.position, { x: Math.sin(performance.now() / 900 + st.seed * 6) * 0.000004 * b.mass, y: a * b.mass });
  });
}

/* ══════════════════════════════════════════════════════════════════════
   12. ÁUDIO SINTETIZADO (Web Audio API — sem arquivos externos)
   ══════════════════════════════════════════════════════════════════════ */
let actx = null, masterGain = null;
function ensureAudio() {
  if (!actx) {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = actx.createGain();
      masterGain.gain.value = 0.85;
      masterGain.connect(actx.destination);
    } catch (e) { return null; }
  }
  if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} }
  return actx;
}
function tone(freq, dur, type, vol, delay, glideTo) {
  const c = ensureAudio(); if (!c) return;
  try {
    const t0 = c.currentTime + (delay || 0);
    const osc = c.createOscillator(), gain = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol || 0.15, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(t0); osc.stop(t0 + dur + 0.06);
  } catch (e) {}
}
function noiseBurst(dur, vol, delay, filterHz) {
  const c = ensureAudio(); if (!c) return;
  try {
    const size = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, size, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = c.createBufferSource(); src.buffer = buffer;
    const gain = c.createGain();
    const t0 = c.currentTime + (delay || 0);
    gain.gain.setValueAtTime(vol || 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    let node = src;
    if (filterHz) {
      const filt = c.createBiquadFilter();
      filt.type = "lowpass"; filt.frequency.value = filterHz;
      src.connect(filt); node = filt;
    }
    node.connect(gain); gain.connect(masterGain);
    src.start(t0);
  } catch (e) {}
}
const SFX = {
  pull:      function () { tone(190, 0.1, "sine", 0.07, 0, 280); },
  release:   function () { tone(300, 0.16, "triangle", 0.16, 0, 720); },
  impact:    function () { noiseBurst(0.09, 0.16, 0, 2200); tone(110, 0.08, "sine", 0.08); },
  blockFall: function () { noiseBurst(0.08, 0.09, 0, 1400); },
  giftBreak: function () { noiseBurst(0.15, 0.19, 0, 5000); tone(680, 0.2, "square", 0.09, 0, 1150); tone(450, 0.16, "sine", 0.08, 0.04); },
  explosion: function () { noiseBurst(0.42, 0.34, 0, 900); tone(80, 0.36, "sine", 0.24, 0, 34); tone(170, 0.16, "sawtooth", 0.12, 0.02, 55); },
  firework:  function () { noiseBurst(0.28, 0.24, 0, 3800); [880, 1180, 1560].forEach(function (f, i) { tone(f, 0.18, "triangle", 0.1, i * 0.05, f * 0.5); }); },
  fuse:      function () { noiseBurst(0.5, 0.07, 0, 6000); tone(420, 0.45, "sawtooth", 0.04, 0, 900); },
  cork:      function () { tone(900, 0.06, "sine", 0.2, 0, 260); noiseBurst(0.5, 0.1, 0.04, 7000); },
  pop:       function () { tone(720, 0.07, "sine", 0.16, 0, 220); noiseBurst(0.06, 0.12, 0, 4000); },
  glass:     function () { noiseBurst(0.22, 0.16, 0, 9000); [1400, 1900, 2500, 3100].forEach(function (f, i) { tone(f, 0.13, "triangle", 0.06, i * 0.03); }); },
  splat:     function () { noiseBurst(0.16, 0.14, 0, 700); tone(140, 0.16, "sine", 0.1, 0, 60); },
  combo:     function (n) { tone(700 + n * 70, 0.14, "sine", 0.13); tone(1050 + n * 70, 0.1, "triangle", 0.06, 0.03); },
  star:      function (big) {
    const notes = big ? [784, 1046.5, 1318.5, 1568] : [1046.5, 1318.5, 1568];
    notes.forEach(function (f, i) { tone(f, 0.16, "triangle", 0.12, i * 0.055); });
  },
  chaosReady:function () { [523.25, 698.46, 880, 1174.7].forEach(function (f, i) { tone(f, 0.2, "triangle", 0.13, i * 0.06); }); },
  levelComplete: function () { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(f, 0.26, "triangle", 0.15, i * 0.1); }); },
  fail:      function () { tone(320, 0.22, "sawtooth", 0.12, 0, 180); },
  gameOver:  function () { tone(280, 0.5, "sawtooth", 0.14, 0, 90); },
};

function vibrate(pattern) {
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
}

/* ══════════════════════════════════════════════════════════════════════
   13. PARTÍCULAS / CONFETE / TEXTOS FLUTUANTES
   Cada partícula tem `grav` própria — fumaça sobe, confete cai, faísca
   cai rápido. Um único array, um único laço.
   ══════════════════════════════════════════════════════════════════════ */
let particles = [];
let floatingTexts = [];
const CONFETTI_COLORS = ["#C46D28", "#7A9B6E", "#D9B25C", "#D9A9C4", "#F1EAD9", "#4F6B45", "#BFE3EE"];
const MAX_PARTICLES = 620;   // teto de segurança: caos sim, travamento não

function pushParticle(p) {
  if (particles.length >= MAX_PARTICLES) particles.shift();
  particles.push(p);
}

function spawnConfetti(x, y, count) {
  for (let i = 0; i < (count || 18); i++) {
    pushParticle({
      x: x, y: y, vx: rand(-6, 6), vy: rand(-9, -2),
      life: rand(800, 1400), maxLife: 1400, size: rand(5, 11),
      color: choose(CONFETTI_COLORS), rot: rand(0, Math.PI * 2), vrot: rand(-0.25, 0.25),
      kind: choose(["confetti", "confetti", "petal", "heart"]), grav: 0.17,
    });
  }
}
function spawnPaperBits(x, y, count) {
  for (let i = 0; i < (count || 10); i++) {
    pushParticle({
      x: x, y: y, vx: rand(-3.5, 3.5), vy: rand(-5, -0.5),
      life: rand(450, 750), maxLife: 750, size: rand(3, 6),
      color: "#F1EAD9", rot: rand(0, Math.PI * 2), vrot: rand(-0.3, 0.3), kind: "paper", grav: 0.2,
    });
  }
}
function spawnSmoke(x, y, count, scale) {
  scale = scale || 1;
  for (let i = 0; i < (count || 8); i++) {
    pushParticle({
      x: x + rand(-14, 14), y: y + rand(-14, 14),
      vx: rand(-1.6, 1.6), vy: rand(-2.4, -0.4),
      life: rand(600, 1200), maxLife: 1200, size: rand(16, 34) * scale,
      color: choose(["rgba(120,112,102,", "rgba(88,82,74,", "rgba(160,152,140,"]),
      rot: 0, vrot: 0, kind: "smoke", grav: -0.012, grow: rand(0.35, 0.8) * scale,
    });
  }
}
function spawnSpark(x, y, count) {
  for (let i = 0; i < (count || 10); i++) {
    pushParticle({
      x: x, y: y, vx: rand(-9, 9), vy: rand(-9, 5),
      life: rand(180, 420), maxLife: 420, size: rand(2, 4),
      color: choose(["#FFE9A8", "#FFC46B", "#FF8A3D", "#FFFFFF"]),
      rot: 0, vrot: 0, kind: "spark", grav: 0.28,
    });
  }
}
function spawnFoam(x, y, count) {
  for (let i = 0; i < (count || 12); i++) {
    pushParticle({
      x: x, y: y, vx: rand(-4, 4), vy: rand(-6, -1),
      life: rand(400, 900), maxLife: 900, size: rand(3, 8),
      color: choose(["#FFFDF4", "#F3EBD6", "#E9E0C6"]),
      rot: 0, vrot: 0, kind: "foam", grav: 0.13,
    });
  }
}
function spawnFrosting(x, y, count) {
  for (let i = 0; i < (count || 16); i++) {
    pushParticle({
      x: x, y: y, vx: rand(-5, 5), vy: rand(-6, -1),
      life: rand(600, 1100), maxLife: 1100, size: rand(4, 10),
      color: choose(["#FBF3E4", "#F5D9E0", "#E3C9A6"]),
      rot: rand(0, 6), vrot: rand(-0.2, 0.2), kind: "confetti", grav: 0.22,
    });
  }
}
function spawnTrail(x, y) {
  pushParticle({
    x: x, y: y, vx: rand(-0.5, 0.5), vy: rand(-0.6, 0.2),
    life: 420, maxLife: 420, size: rand(4, 8),
    color: choose(["#F1EAD9", "#D9A9C4", "#E9D6A8"]),
    rot: rand(0, 6), vrot: rand(-0.1, 0.1), kind: "petal", grav: 0.03,
  });
}
function spawnFloatingText(x, y, text, color, big) {
  floatingTexts.push({ x: x, y: y, text: text, color: color || PALETTE.ink, life: 1100, maxLife: 1100, vy: -0.7, big: !!big });
}

function updateParticles(dt) {
  const k = dt / 16.7;
  particles = particles.filter(function (p) {
    p.life -= dt;
    if (p.life <= 0) return false;
    p.x += p.vx * k;
    p.y += p.vy * k;
    p.vy += (p.grav === undefined ? 0.17 : p.grav) * k;
    if (p.kind === "smoke") { p.vx *= 0.985; p.size += (p.grow || 0.5) * k; }
    if (p.kind === "spark") { p.vx *= 0.97; }
    p.rot += p.vrot * k;
    return true;
  });
  floatingTexts = floatingTexts.filter(function (t) {
    t.life -= dt;
    t.y += t.vy * k;
    return t.life > 0;
  });
  shockwaves = shockwaves.filter(function (s) {
    s.life -= dt;
    s.r = s.max * (1 - Math.pow(1 - (1 - s.life / s.maxLife), 3));
    return s.life > 0;
  });
  if (screenFlash > 0) screenFlash = Math.max(0, screenFlash - dt / 260);
}

/* ══════════════════════════════════════════════════════════════════════
   14. PONTUAÇÃO / COMBO / MEDIDOR DE CAOS
   ══════════════════════════════════════════════════════════════════════ */
const Score = {
  total: 0, levelPoints: 0, comboCount: 0, lastGiftAt: 0,
  add: function (n) { this.total += n; this.levelPoints += n; if (this.total < 0) this.total = 0; },
  resetLevel: function () { this.levelPoints = 0; this.comboCount = 0; this.lastGiftAt = 0; },
};

/* Medidor de caos: enche destruindo coisas. Cheio, o próximo arremesso vira
   um projétil-bomba (explode ao encostar em qualquer coisa). É a sensação
   de progressão do jogo — e é sempre um presente, nunca uma punição. */
const Chaos = {
  value: 0, ready: false,
  gain: function (n) {
    if (this.ready) return;
    this.value = clamp(this.value + n, 0, 1);
    if (this.value >= 1) {
      this.ready = true;
      SFX.chaosReady();
      flashCombo("CAOS TOTAL — próximo tiro explode!");
      vibrate([15, 30, 15, 30, 40]);
    }
    updateHud();
  },
  consume: function () { this.ready = false; this.value = 0; updateHud(); },
  carryOver: function () { if (!this.ready) this.value = clamp(this.value * CFG.CHAOS_DECAY_PER_LEVEL, 0, 1); },
  reset: function () { this.value = 0; this.ready = false; },
};

function registerGiftDestroyed(body, worldX, worldY) {
  const g = body.wglGift;
  if (g.destroyed) return;
  g.destroyed = true;
  const now = performance.now();
  let mult = 1;
  if (now - Score.lastGiftAt <= CFG.COMBO_WINDOW_MS && Score.lastGiftAt > 0) {
    Score.comboCount++;
    mult = Math.min(CFG.COMBO_MAX_MULT, 1 + Score.comboCount * CFG.COMBO_STEP);
  } else {
    Score.comboCount = 0;
  }
  Score.lastGiftAt = now;

  const pts = Math.round(g.points * mult);
  Score.add(pts);
  Game.stats.giftsDestroyed++;
  Chaos.gain(CFG.CHAOS_GAIN.gift);

  spawnConfetti(worldX, worldY, 24);
  spawnPaperBits(worldX, worldY, 14);
  spawnFloatingText(worldX, worldY - 20, "+" + fmtNum(pts), PALETTE.ink, true);
  if (mult > 1) {
    spawnFloatingText(worldX, worldY - 50, "x" + mult.toFixed(1), PALETTE.terracotta, true);
    flashCombo(comboWord(Score.comboCount) + " x" + mult.toFixed(1));
    SFX.combo(Score.comboCount);
    Camera.shake(4 + Score.comboCount, 200);
  }
  SFX.giftBreak();
  vibrate([12, 24, 12]);

  World.remove(engine.world, body);
  activeGifts = activeGifts.filter(function (b) { return b !== body; });
  updateHud();
  noteGiftsCleared();
}

/* O último presente pode cair por uma explosão em cadeia que acontece bem
   DEPOIS do arremesso já ter assentado — nesse caso ninguém mais ia chamar
   checkLevelOutcome e a fase ficava "ganha mas sem terminar", esperando o
   jogador gastar um arremesso à toa (ou travando de vez, se não sobrasse
   nenhum). Agora, assim que a lista de presentes zera, agenda-se a tela de
   vitória — com uma folga pra cadeia terminar o espetáculo antes. */
let victoryCheckAt = 0;
function noteGiftsCleared() {
  if (Game.screen !== "playing" || victoryCheckAt) return;
  if (remainingGiftsCount() > 0) return;
  victoryCheckAt = performance.now() + 850;
}

/* Estrela pega: qualquer coisa encostando serve — a cabeça, um caco de
   vidro voando, a onda de choque de um TNT. Pontos altos e feedback grande,
   porque é a recompensa por mirar além do necessário. */
function collectStar(body) {
  const s = body.wglStar;
  if (!s || s.collected) return;
  s.collected = true;
  World.remove(engine.world, body);
  activeStars = activeStars.filter(function (b) { return b !== body; });
  Score.add(s.points);
  Game.stats.starsCollected++;
  spawnFloatingText(body.position.x, body.position.y - 26, "+" + fmtNum(s.points), PALETTE.gold, true);
  spawnConfetti(body.position.x, body.position.y, s.big ? 26 : 16);
  spawnSpark(body.position.x, body.position.y, s.big ? 20 : 12);
  SFX.star(s.big);
  vibrate([10, 20, 10]);
  Chaos.gain(CFG.CHAOS_GAIN.shatter);
  if (!activeStars.length) {
    Score.add(CFG.POINTS.allStars);
    flashCombo("Todas as estrelas! +" + fmtNum(CFG.POINTS.allStars));
    spawnFloatingText(body.position.x, body.position.y - 70, "todas as estrelas!", PALETTE.terracotta, true);
  }
  updateHud();
}

const COMBO_WORDS = ["Que isso!", "Sensacional!", "Arrasou!", "Caos puro!", "Inacreditável!", "Casamento dos sonhos!"];
function comboWord(n) { return COMBO_WORDS[Math.min(n - 1, COMBO_WORDS.length - 1)] || COMBO_WORDS[0]; }

function registerBlockFall(body) {
  if (!body.wglBlock || body.wglBlock.fallen) return;
  body.wglBlock.fallen = true;
  const pts = randInt(CFG.POINTS.blockMin, CFG.POINTS.blockMax);
  Score.add(pts);
  Game.stats.blocksFallen++;
  Chaos.gain(CFG.CHAOS_GAIN.block);
  spawnPaperBits(body.position.x, body.position.y, 6);
  SFX.blockFall();
}

/* ══════════════════════════════════════════════════════════════════════
   15. COLISÕES
   ══════════════════════════════════════════════════════════════════════ */
let lastGenericImpactAt = 0;
Events.on(engine, "collisionStart", function (event) {
  // durante o assentamento inicial nada conta: nem dano, nem som, nem ponto
  if (isSettling) return;
  event.pairs.forEach(function (pair) {
    const a = pair.bodyA, b = pair.bodyB;
    const impactSpeed = Math.max(a.speed, b.speed);

    // Estrela: encostou, pegou. Sem exigência de velocidade.
    [a, b].forEach(function (body) {
      if (body.wglStar && !body.wglStar.collected) collectStar(body);
    });

    // Balão estoura com qualquer encostão — é um balão.
    [a, b].forEach(function (body) {
      if (body.wglBalloon && !body.wglBalloon.popped && impactSpeed >= CFG.BALLOON_POP_SPEED) popBalloon(body);
    });

    // Projétil-bomba: explode ao encostar em QUALQUER coisa (inclusive o chão).
    [a, b].forEach(function (body) {
      if (body.wglBoom && !body.wglBoom.spent && impactSpeed >= 1.2) {
        body.wglBoom.spent = true;
        const x = body.position.x, y = body.position.y;
        World.remove(engine.world, body);
        if (Game.currentProjectile === body) Game.currentProjectile = null;
        restBodies = restBodies.filter(function (r) { return r !== body; });
        spawnFloatingText(x, y - 40, "CAOS!", PALETTE.gold, true);
        applyBlast(x, y, CFG.BOOM_BLAST_RADIUS, CFG.BOOM_FORCE, CFG.BOOM_GIFT_DESTROY_RADIUS);
        bigBoomFX(x, y, 1.25, "#FFCE70");
        scheduleNextStep();
      }
    });

    if (impactSpeed < CFG.MIN_HIT_SPEED) return;

    [a, b].forEach(function (body) {
      if (body.wglBomb && !body.wglBomb.exploded) { explodeBomb(body); return; }
      if (body.wglSpecial && !body.wglSpecial.spent) {
        // vidro e bolo quebram fácil; explosivo exige pancada de verdade
        const soft = body.wglSpecial.type === "glass" || body.wglSpecial.type === "cake";
        if (soft || impactSpeed >= CFG.SPECIAL_HIT_SPEED) triggerSpecial(body, "hit");
        return;
      }
      if (body.wglGift && !body.wglGift.destroyed) {
        const now = performance.now();
        if (now - body.wglGift.lastHitAt < 90) return; // evita contar o mesmo impacto 2x
        body.wglGift.lastHitAt = now;
        body.wglGift.hp -= 1;
        body.wglGift.wobble = 1;
        if (body.wglGift.hp <= 0) {
          registerGiftDestroyed(body, body.position.x, body.position.y);
        } else {
          SFX.impact();
          spawnPaperBits(body.position.x, body.position.y, 5);
          Camera.shake(3, 120);
        }
      }
    });

    // Som/haptic genérico de impacto — com intervalo mínimo, senão um
    // desabamento grande vira uma enxurrada de som picotado.
    const now2 = performance.now();
    if (now2 - lastGenericImpactAt > 65) {
      lastGenericImpactAt = now2;
      SFX.impact();
      vibrate(8);
      if (impactSpeed > 14) Camera.shake(5, 150);
    }
  });
});

/* Blocos "derrubados" (ângulo mudou bastante) — contabilizados uma vez só. */
function checkFallenBlocks() {
  activeBlocks.forEach(function (body) {
    if (body.wglBlock.fallen) return;
    if (Math.abs(body.angle - body.wglBlock.initialAngle) > CFG.BLOCK_FALL_ANGLE) registerBlockFall(body);
  });
}

/* Rede de segurança: qualquer presente que caia pra fora do mundo conta
   como destruído (com pontos!) em vez de deixar a fase impossível de
   terminar. Vale também pra sujeira que sai do mapa. */
function sweepOutOfBounds() {
  const floor = CFG.VIEW_H + 900, left = -500, right = currentWorldWidth + 500, ceil = -3000;
  activeGifts.slice().forEach(function (g) {
    const p = g.position;
    if (p.y > floor || p.x < left || p.x > right || p.y < ceil) {
      registerGiftDestroyed(g, clamp(p.x, 0, currentWorldWidth), clamp(p.y, 0, CFG.VIEW_H));
    }
  });
  activeBalloons.slice().forEach(function (b) {
    if (b.position.y < ceil || b.position.y > floor) popBalloon(b);
  });
  [activeBlocks, activeBombs, restBodies].forEach(function (list) {
    list.slice().forEach(function (b) {
      const p = b.position;
      if (p.y > floor || p.x < left || p.x > right || p.y < ceil) {
        World.remove(engine.world, b);
        activeBlocks = activeBlocks.filter(function (x) { return x !== b; });
        activeBombs = activeBombs.filter(function (x) { return x !== b; });
        restBodies = restBodies.filter(function (x) { return x !== b; });
      }
    });
  });
}

/* ══════════════════════════════════════════════════════════════════════
   16. ESTADO DO JOGO
   ══════════════════════════════════════════════════════════════════════ */
const Game = {
  screen: "start", // start | playing | complete | fail | pause | final
  levelIndex: 0,
  lives: CFG.START_LIVES,
  highScore: loadHighScore(),
  attemptsThisLevel: 1,
  throwsUsed: 0,
  bonusThrows: 0,            // arremessos de misericórdia já concedidos nesta tentativa
  currentProjectile: null,
  currentKey: "gian",
  currentFace: 0,
  flightStartedAt: 0,
  settledFrames: 0,
  awaitingNext: false,
  isVictoryRun: false,
  trailTick: 0,
  stats: null,

  endless: false,            // true depois de vencer a 50 e escolher continuar
  get level() { return levelAt(this.levelIndex); },
};

function freshStats() {
  return {
    giftsDestroyed: 0, blocksFallen: 0, throwsUsed: 0, perfectLevels: 0,
    levelsCompleted: 0, explosives: 0, balloonsPopped: 0, shattered: 0, boomShots: 0,
    starsCollected: 0,
  };
}

function effectiveThrows() { return Game.level.throws + Game.bonusThrows; }

function startRun() {
  Game.lives = CFG.START_LIVES;
  Game.levelIndex = 0;
  Game.attemptsThisLevel = 1;
  Score.total = 0;
  Chaos.reset();
  Game.stats = freshStats();
  startLevel(0);
}

function startLevel(index) {
  Game.levelIndex = index;
  Game.throwsUsed = 0;
  Game.bonusThrows = 0;
  Game.awaitingNext = false;
  victoryCheckAt = 0;
  pendingRockets = []; pendingCorks = [];
  particles = []; floatingTexts = []; shockwaves = [];
  screenFlash = 0; hitStopUntil = 0; slowMoUntil = 0; chainDepth = 0;
  Score.resetLevel();
  loadLevelIntoWorld(Game.level);
  Camera.x = restCameraX(); Camera.targetX = Camera.x;
  Camera.y = 0; Camera.targetY = 0;
  Game.screen = "playing";
  hudEl.hidden = false;
  pauseBtn.hidden = false;
  hideAllOverlays();
  updateHud();
  flashCombo("Fase " + (index + 1) + " · " + Game.level.name);
  spawnNextProjectile();
}

function restCameraX() {
  return clamp(Game.level.slingX - 300, 0, Math.max(0, currentWorldWidth - CFG.VIEW_W));
}

function remainingGiftsCount() { return activeGifts.filter(function (g) { return !g.wglGift.destroyed; }).length; }

function spawnNextProjectile() {
  if (Game.throwsUsed >= effectiveThrows()) return;
  Game.currentKey = Math.random() < 0.5 ? "gian" : "tiago";
  Game.currentFace = randInt(0, 6);
  const anchor = slingAnchor();
  const boom = Chaos.ready;
  const r = boom ? CFG.BOOM_PROJECTILE_RADIUS : CFG.PROJECTILE_RADIUS;
  /* A cabeça arremessada é DENSA de propósito — bem mais pesada que
     qualquer peça de estrutura. É esse contraste que faz um acerto derrubar
     a torre inteira em vez de só empurrá-la. Não mexe na estabilidade das
     estruturas (que depende da proporção entre elas), só na destruição. */
  const body = Bodies.circle(anchor.x, anchor.y, r, {
    density: boom ? 0.011 : 0.007, friction: 0.6, restitution: 0.25, frictionAir: 0.0002,
  });
  body.label = "wgl-projectile";
  body.isStatic = true; // fica preso no bolso do estilingue até soltar
  body.wglHeadKey = Game.currentKey;
  body.wglFace = Game.currentFace;
  body.wglRadius = r;
  if (boom) {
    body.wglBoom = { spent: false };
    Game.stats.boomShots++;
    Chaos.consume();
  }
  Game.currentProjectile = body;
  World.add(engine.world, body);
  Game.awaitingNext = false;
  updateHud();
}

function slingAnchor() {
  return { x: Game.level.slingX, y: CFG.VIEW_H - CFG.GROUND_H - CFG.SLING_Y_OFFSET };
}

function launchProjectile(vx, vy) {
  const body = Game.currentProjectile;
  if (!body) return;
  /* A bola sai do bolso na posição de REPOUSO do estilingue, não de onde o
     dedo a puxou. Isso não é detalhe: a prévia pontilhada é calculada a
     partir da forquilha, então lançar da posição puxada fazia o voo real
     nascer até 180px longe do que o pontilhado prometia — mirar virava
     chute. Com o reposicionamento, o pontilhado passa a ser exato. */
  Body.setPosition(body, slingAnchor());
  Body.setStatic(body, false);
  Body.setVelocity(body, { x: vx, y: vy });
  Body.setAngularVelocity(body, rand(-0.14, 0.14));
  Game.throwsUsed++;
  Game.stats.throwsUsed++;
  Game.flightStartedAt = performance.now();
  Game.settledFrames = 0;
  SFX.release();
  vibrate(25);
  updateHud();
}

/* Checa se o arremesso atual assentou (baixa velocidade sustentada) ou saiu
   da área útil — nesses casos, libera o próximo arremesso. */
function updateProjectileLifecycle(dt) {
  const body = Game.currentProjectile;
  if (!body || body.isStatic || Game.awaitingNext) return;

  // Rastro de pétalas atrás da cabeça em voo
  Game.trailTick += dt;
  if (Game.trailTick > 34 && body.speed > 3) { Game.trailTick = 0; spawnTrail(body.position.x, body.position.y); }

  const p = body.position;
  const outOfBounds = p.x < -260 || p.x > currentWorldWidth + 260 || p.y > CFG.VIEW_H + 320;
  const tookTooLong = performance.now() - Game.flightStartedAt > CFG.MAX_FLIGHT_MS;

  if (outOfBounds) {
    World.remove(engine.world, body);
    Game.currentProjectile = null;
    scheduleNextStep();
    return;
  }

  if (body.speed < CFG.SETTLE_SPEED_THRESHOLD) Game.settledFrames++;
  else Game.settledFrames = 0;

  /* Só libera o próximo tiro quando o CENÁRIO INTEIRO também sossegou —
     senão o jogador dispara no meio de um desabamento em andamento e perde
     metade do espetáculo (e da pontuação). */
  if ((Game.settledFrames >= CFG.SETTLE_FRAMES_NEEDED && worldIsCalm()) || tookTooLong) {
    restBodies.push(body);
    Game.currentProjectile = null;
    scheduleNextStep();
  }
}

/* O próximo arremesso só é liberado quando o cenário sossega — senão o
   jogador atira no meio do desabamento e perde metade do espetáculo.
   Presente pendurado em balão NÃO conta: ele balança pra sempre, e esperar
   por ele deixaria o jogador olhando pra tela parada até o tempo limite. */
function worldIsCalm() {
  if (pendingRockets.length || pendingCorks.length) return false;
  const list = activeBlocks.concat(activeGifts, activeBombs);
  for (let i = 0; i < list.length; i++) {
    if (list[i].wglHanging) continue;
    if (list[i].speed > 1.2) return false;
  }
  return true;
}

function scheduleNextStep() {
  if (Game.awaitingNext) return;
  Game.awaitingNext = true;
  Camera.targetX = restCameraX();
  Camera.targetY = 0;
  setTimeout(checkLevelOutcome, CFG.NEXT_THROW_DELAY_MS);
}

function checkLevelOutcome() {
  if (Game.screen !== "playing") return;
  if (remainingGiftsCount() === 0) { completeLevel(); return; }

  if (Game.throwsUsed >= effectiveThrows()) {
    /* Misericórdia: em vez de falhar de cara, o jogo dá arremessos de brinde.
       A ideia é que travar numa fase seja quase impossível — o jogo é sobre
       ver as coisas explodirem, não sobre punir a mira. */
    if (Game.bonusThrows < CFG.MERCY_THROWS) {
      Game.bonusThrows++;
      flashCombo("Arremesso de brinde!");
      spawnNextProjectile();
      updateHud();
      return;
    }
    failLevel();
    return;
  }
  spawnNextProjectile();
}

function completeLevel() {
  Game.screen = "complete";
  const unused = Math.max(0, effectiveThrows() - Game.throwsUsed);
  const unusedBonus = unused * CFG.POINTS.unusedThrow;
  const perfect = Game.attemptsThisLevel === 1;
  const perfectBonus = perfect ? CFG.POINTS.perfectLevel : 0;
  const chaosBonus = Chaos.ready ? CFG.POINTS.chaosBonusPerLevel : 0;
  if (perfect) Game.stats.perfectLevels++;
  Game.stats.levelsCompleted++;

  Score.add(unusedBonus + perfectBonus + chaosBonus);
  SFX.levelComplete();
  vibrate([20, 40, 20, 60]);
  spawnConfetti(CFG.VIEW_W / 2 + Camera.x, 260, 40);

  const starsTotal = (Game.level.stars || []).length;
  showLevelComplete({
    levelPoints: Score.levelPoints,
    unused: unused, unusedBonus: unusedBonus,
    perfect: perfect, perfectBonus: perfectBonus,
    chaosBonus: chaosBonus,
    starsTotal: starsTotal, starsGot: starsTotal - activeStars.length,
  });

  if (Score.total > Game.highScore) { Game.highScore = Score.total; saveHighScore(Game.highScore); }
  updateHud();
}

function continueAfterComplete() {
  const next = Game.levelIndex + 1;
  /* Terminar a 50 é a vitória "oficial" — o jogo mostra a tela de parabéns
     com a estatística toda. Mas a partida não precisa acabar aí: quem
     quiser continua no Caos Infinito, de onde só se sai perdendo. */
  if (next >= LEVELS.length && !Game.endless) { endRun(true); return; }
  Chaos.carryOver();
  Game.attemptsThisLevel = 1;
  startLevel(next);
}

function failLevel() {
  Game.screen = "fail";
  Game.lives--;
  if (CFG.LIFE_LOST_PENALTY) Score.add(-CFG.LIFE_LOST_PENALTY);
  SFX.fail();
  vibrate([30, 50, 30]);
  if (Score.total > Game.highScore) { Game.highScore = Score.total; saveHighScore(Game.highScore); }
  updateHud();
  if (Game.lives <= 0) setTimeout(function () { endRun(false); }, 550);
  else showFail();
}

function retryLevel() {
  Game.attemptsThisLevel++;
  startLevel(Game.levelIndex);
}

function endRun(victory) {
  Game.screen = "final";
  Game.isVictoryRun = victory;
  hudEl.hidden = true;
  pauseBtn.hidden = true;
  if (victory) SFX.levelComplete(); else SFX.gameOver();
  vibrate(victory ? [20, 40, 20, 40, 20, 80] : [60, 80, 60]);
  showFinal(victory);
}

/* ══════════════════════════════════════════════════════════════════════
   17. INPUT DE MIRA (arrastar / mirar / soltar)
   ══════════════════════════════════════════════════════════════════════ */
const Aim = { dragging: false, pointerId: null, dragX: 0, dragY: 0, trajectory: [], power: 0 };

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = (clientX - rect.left) * (CFG.VIEW_W / rect.width);
  const sy = (clientY - rect.top) * (CFG.VIEW_H / rect.height);
  // desfaz exatamente a transformação de render(): zoom em torno do centro,
  // depois o pan da câmera — senão mirar fica errado em fases com zoom != 1.
  const zoom = currentZoom();
  const cx = CFG.VIEW_W / 2, cy = CFG.VIEW_H / 2;
  return {
    x: (sx - cx) / zoom + cx + Camera.x,
    y: (sy - cy) / zoom + cy + Camera.y,
  };
}

function pointFromEvent(e) {
  if (e.touches && e.touches.length) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  return { clientX: e.clientX, clientY: e.clientY };
}

function onPointerDown(e) {
  if (Game.screen !== "playing") return;
  const body = Game.currentProjectile;
  if (!body || !body.isStatic) return;
  const p = pointFromEvent(e);
  const world = screenToWorld(p.clientX, p.clientY);
  const anchor = slingAnchor();
  // Área de pega generosa: em celular, mirar não pode exigir precisão de pixel.
  if (dist(world.x, world.y, anchor.x, anchor.y) > CFG.SLING_MAX_DRAG * 2.4) return;
  Aim.dragging = true;
  Aim.pointerId = e.pointerId !== undefined ? e.pointerId : "touch";
  // Captura o ponteiro: garante que pointermove/pointerup continuem chegando
  // mesmo se o dedo/cursor sair da tela no meio da puxada. Sem isso, soltar o
  // botão fora da janela nunca dispara o pointerup e a mira fica presa — a
  // cabecinha passa a seguir o cursor e o jogo não arremessa mais nada.
  if (e.pointerId !== undefined && canvas.setPointerCapture) {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* segue o baile */ }
  }
  ensureAudio();
  SFX.pull();
  updateAimFromWorld(world);
  if (e.preventDefault) e.preventDefault();
}

function aimPointerMatches(e) {
  return !(e && e.pointerId !== undefined && Aim.pointerId !== "touch" && e.pointerId !== Aim.pointerId);
}

function releaseAimPointer(e) {
  if (!e || e.pointerId === undefined || !canvas.releasePointerCapture) return;
  try {
    if (!canvas.hasPointerCapture || canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  } catch (err) { /* já foi solto */ }
}

/* Aborta a mira SEM gastar arremesso: o sistema roubou o gesto (gesto de
   borda no celular, troca de aba, janela perdeu o foco). A cabecinha volta
   pro estilingue e o jogador tenta de novo. */
function cancelAim(e) {
  if (!Aim.dragging || !aimPointerMatches(e)) return;
  Aim.dragging = false;
  Aim.trajectory = [];
  Aim.power = 0;
  Aim._finalV = null;
  releaseAimPointer(e);
  if (Game.currentProjectile && Game.currentProjectile.isStatic) {
    Body.setPosition(Game.currentProjectile, slingAnchor());
  }
}

function onPointerMove(e) {
  if (!Aim.dragging) return;
  if (!aimPointerMatches(e)) return;
  // Rede de segurança do mouse: se chega um move sem nenhum botão apertado,
  // o pointerup se perdeu (soltou fora da janela) — trata como solta.
  if (e.pointerType === "mouse" && e.buttons === 0) { onPointerUp(e); return; }
  const p = pointFromEvent(e);
  updateAimFromWorld(screenToWorld(p.clientX, p.clientY));
  if (e.preventDefault) e.preventDefault();
}

function updateAimFromWorld(world) {
  const anchor = slingAnchor();
  const dx = world.x - anchor.x, dy = world.y - anchor.y;
  const d = Math.min(CFG.SLING_MAX_DRAG, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  Aim.dragX = anchor.x + Math.cos(angle) * d;
  Aim.dragY = anchor.y + Math.sin(angle) * d;
  Aim.power = d / CFG.SLING_MAX_DRAG;
  const body = Game.currentProjectile;
  if (body) Body.setPosition(body, { x: Aim.dragX, y: Aim.dragY });

  const vx = (anchor.x - Aim.dragX) * CFG.SLING_FORCE_MULT;
  const vy = (anchor.y - Aim.dragY) * CFG.SLING_FORCE_MULT;
  const speed = Math.hypot(vx, vy);
  const cap = CFG.SLING_MAX_LAUNCH_SPEED;
  const finalV = speed > cap ? { x: vx * (cap / speed), y: vy * (cap / speed) } : { x: vx, y: vy };
  Aim.trajectory = computeTrajectoryPoints(anchor, finalV.x, finalV.y);
  Aim._finalV = finalV;
}

function onPointerUp(e) {
  if (!Aim.dragging || !aimPointerMatches(e)) return;
  Aim.dragging = false;
  releaseAimPointer(e);
  const anchor = slingAnchor();
  const pulled = Math.hypot(anchor.x - Aim.dragX, anchor.y - Aim.dragY) > 10;
  const finalV = Aim._finalV;
  Aim.trajectory = [];
  Aim.power = 0;
  Aim._finalV = null;
  if (pulled && finalV && Game.currentProjectile) {
    launchProjectile(finalV.x, finalV.y);
  } else if (Game.currentProjectile) {
    Body.setPosition(Game.currentProjectile, anchor);
  }
}

/* O Matter.js amortece a velocidade a cada passo pelo frictionAir do
   projétil, MULTIPLICANDO a velocidade antes de somar a gravidade. Sem esse
   termo, a prévia pontilhada diverge cada vez mais do voo real conforme a
   distância aumenta; com ele, o erro cai pra frações de pixel. */
const AIR_FRICTION_DECAY = 1 - 0.0002;
function computeTrajectoryPoints(anchor, vx, vy) {
  const pts = [];
  let x = anchor.x, y = anchor.y, cvx = vx, cvy = vy;
  const stopY = CFG.VIEW_H - CFG.GROUND_H - CFG.PROJECTILE_RADIUS;
  for (let i = 0; i < 26; i++) {
    for (let s = 0; s < 3; s++) {
      cvx *= AIR_FRICTION_DECAY;
      cvy = cvy * AIR_FRICTION_DECAY + GRAV_STEP;
      x += cvx; y += cvy;
    }
    if (y > stopY) break;
    pts.push({ x: x, y: y });
  }
  return pts;
}

/* ══════════════════════════════════════════════════════════════════════
   18. CÂMERA — segue o projétil na horizontal E na vertical (as torres
   agora são altas demais pra caber numa câmera fixa), com tremor decaindo.
   ══════════════════════════════════════════════════════════════════════ */
const Camera = {
  x: 0, targetX: 0, y: 0, targetY: 0,
  shakeMag: 0, shakeUntil: 0, shakeDur: 1, shakeX: 0, shakeY: 0,
  shake: function (mag, dur) {
    const now = performance.now();
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeUntil = Math.max(this.shakeUntil, now + dur);
    this.shakeDur = dur;
  },
};

function updateCamera() {
  const body = Game.currentProjectile;
  const maxX = Math.max(0, currentWorldWidth - CFG.VIEW_W);
  if (body && !body.isStatic) {
    Camera.targetX = clamp(body.position.x - CFG.VIEW_W * 0.42, 0, maxX);
    Camera.targetY = clamp(body.position.y - CFG.VIEW_H * 0.58, -CFG.CAMERA_MAX_UP, 0);
    Camera.x = lerp(Camera.x, Camera.targetX, CFG.CAMERA_FOLLOW_LERP);
    Camera.y = lerp(Camera.y, Camera.targetY, CFG.CAMERA_FOLLOW_LERP);
  } else {
    Camera.x = lerp(Camera.x, Camera.targetX, CFG.CAMERA_RETURN_LERP);
    Camera.y = lerp(Camera.y, Camera.targetY, CFG.CAMERA_RETURN_LERP);
  }
  const now = performance.now();
  if (now < Camera.shakeUntil) {
    const t = (Camera.shakeUntil - now) / Camera.shakeDur;
    const s = Camera.shakeMag * clamp(t, 0, 1);
    Camera.shakeX = rand(-s, s);
    Camera.shakeY = rand(-s, s);
  } else {
    Camera.shakeX = 0; Camera.shakeY = 0; Camera.shakeMag = 0;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   19. RENDERIZAÇÃO
   ══════════════════════════════════════════════════════════════════════ */
let canvas, ctx, stageEl, hudEl, pauseBtn;

function resizeCanvas() {
  const rect = stageEl.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.max(2, Math.round(rect.width * dpr));
  canvas.height = Math.max(2, Math.round(rect.height * dpr));
  const scale = rect.width / CFG.VIEW_W;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
}

function skyVariant() { return (Game.level && Game.level.skyVariant) || "day"; }
function isNight() { return skyVariant() === "night"; }

function pick(day, night, sunset) {
  const v = skyVariant();
  return v === "night" ? night : (v === "sunset" ? sunset : day);
}

function drawSky() {
  const v = skyVariant();
  const grad = ctx.createLinearGradient(0, -200, 0, CFG.VIEW_H);
  if (v === "sunset") {
    grad.addColorStop(0, PALETTE.skyTopSunset); grad.addColorStop(0.55, PALETTE.skyMidSunset); grad.addColorStop(1, PALETTE.skyBottomSunset);
  } else if (v === "night") {
    grad.addColorStop(0, PALETTE.skyTopNight); grad.addColorStop(0.55, PALETTE.skyMidNight); grad.addColorStop(1, PALETTE.skyBottomNight);
  } else {
    grad.addColorStop(0, PALETTE.skyTop); grad.addColorStop(0.55, PALETTE.skyMid); grad.addColorStop(1, PALETTE.skyBottom);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);

  ctx.save();
  ctx.translate(-Camera.x * 0.12, -Camera.y * 0.12);

  if (v === "night") {
    // estrelas determinísticas (sem Math.random por frame, senão piscam feio)
    for (let i = 0; i < 70; i++) {
      const sx = (i * 197) % (CFG.VIEW_W * 2);
      const sy = 10 + (i * 83) % 420;
      const tw = 0.55 + 0.45 * Math.sin(performance.now() / 900 + i);
      ctx.globalAlpha = tw;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath(); ctx.arc(sx, sy, (i % 4 === 0) ? 2.4 : 1.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // lua com halo
    const mx = CFG.VIEW_W * 0.76, my = 140;
    const halo = ctx.createRadialGradient(mx, my, 20, mx, my, 130);
    halo.addColorStop(0, "rgba(241,234,217,.35)"); halo.addColorStop(1, "rgba(241,234,217,0)");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, 130, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#F5EEDC"; ctx.beginPath(); ctx.arc(mx, my, 48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.05)";
    ctx.beginPath(); ctx.arc(mx - 16, my - 12, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 14, my + 10, 6, 0, Math.PI * 2); ctx.fill();
  } else {
    // sol com halo
    const sx2 = CFG.VIEW_W * 0.8, sy2 = 130;
    const halo = ctx.createRadialGradient(sx2, sy2, 20, sx2, sy2, 160);
    halo.addColorStop(0, v === "sunset" ? "rgba(255,196,120,.55)" : "rgba(255,244,200,.55)");
    halo.addColorStop(1, "rgba(255,244,200,0)");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(sx2, sy2, 160, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = v === "sunset" ? "#FFD9A0" : "#FFF6D8";
    ctx.beginPath(); ctx.arc(sx2, sy2, 44, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* Duas fileiras de colinas com paralaxe — dá profundidade e faz o mundo
   parecer bem maior que a janela. */
function drawHills() {
  const groundY = CFG.VIEW_H - CFG.GROUND_H;
  const layers = [
    { color: pick(PALETTE.hillFar, PALETTE.hillFarNight, PALETTE.hillFarSunset), par: 0.2, amp: 120, base: groundY + 10, step: 520, off: 0 },
    { color: pick(PALETTE.hillNear, PALETTE.hillNearNight, PALETTE.hillNearSunset), par: 0.42, amp: 86, base: groundY + 26, step: 380, off: 180 },
  ];
  layers.forEach(function (L) {
    ctx.save();
    ctx.translate(-Camera.x * L.par, -Camera.y * L.par * 0.5);
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.moveTo(-400, CFG.VIEW_H + 200);
    // passo de 40px: com a curva sendo uma senoide larga, 20px não mudava
    // nada visualmente e dobrava o custo do traçado em celular fraco
    for (let x = -400; x <= currentWorldWidth + 800; x += 40) {
      const y = L.base - L.amp * (0.5 + 0.5 * Math.sin((x + L.off) / L.step * Math.PI));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(currentWorldWidth + 800, CFG.VIEW_H + 200);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

function drawClouds() {
  if (isNight()) return;
  ctx.save();
  ctx.translate(-Camera.x * 0.3, -Camera.y * 0.3);
  ctx.fillStyle = PALETTE.cloud;
  for (let i = 0; i < 14; i++) {
    const cx = 100 + i * 330, cy = 70 + (i % 4) * 72;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 50, 24, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 38, cy + 9, 36, 19, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 36, cy + 7, 32, 17, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGround() {
  const groundY = CFG.VIEW_H - CFG.GROUND_H;
  const w = currentWorldWidth + 900;
  ctx.fillStyle = pick(PALETTE.groundDeep, PALETTE.groundDeepNight, PALETTE.groundDeepSunset);
  ctx.fillRect(-400, groundY, w, CFG.GROUND_H + 800);
  ctx.fillStyle = pick(PALETTE.groundSide, PALETTE.groundSideNight, PALETTE.groundSideSunset);
  ctx.fillRect(-400, groundY, w, CFG.GROUND_H);
  ctx.fillStyle = pick(PALETTE.groundTop, PALETTE.groundTopNight, PALETTE.groundTopSunset);
  ctx.fillRect(-400, groundY, w, 20);

  // tufos de grama (determinísticos pela posição — não tremem entre frames)
  ctx.strokeStyle = pick(PALETTE.grass, PALETTE.grassNight, PALETTE.grassSunset);
  ctx.lineWidth = 2.5; ctx.lineCap = "round";
  for (let x = -400; x < currentWorldWidth + 500; x += 34) {
    const h = 8 + ((x * 7919) % 11);
    const lean = (((x * 104729) % 7) - 3) * 0.6;
    ctx.beginPath(); ctx.moveTo(x, groundY + 2); ctx.quadraticCurveTo(x + lean, groundY - h * 0.6, x + lean * 2, groundY - h); ctx.stroke();
  }
  // costura tracejada de "toalha de mesa" no barranco
  ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 3;
  for (let x = -400; x < currentWorldWidth + 500; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, groundY + 34); ctx.lineTo(x + 24, groundY + 34); ctx.stroke();
  }
}

/* Sombra no chão: elipse achatada embaixo do corpo, mais fraca e mais larga
   quanto mais alto ele estiver. Barato e amarra tudo visualmente. */
function drawGroundShadow(x, y, w) {
  const groundY = CFG.VIEW_H - CFG.GROUND_H;
  const h = groundY - y;
  if (h < -40 || h > 620) return;
  const t = clamp(1 - h / 620, 0, 1);
  ctx.globalAlpha = 0.2 * t;
  ctx.fillStyle = "#2A2820";
  ctx.beginPath();
  ctx.ellipse(x, groundY + 6, w * (0.5 + (1 - t) * 0.5), 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawSlingshot() {
  const anchor = slingAnchor();
  const baseY = CFG.VIEW_H - CFG.GROUND_H + 8;
  drawGroundShadow(anchor.x, baseY, 70);

  // forquilha (madeira com veio)
  ctx.lineCap = "round";
  ctx.strokeStyle = PALETTE.slingWoodDark; ctx.lineWidth = 17;
  ctx.beginPath(); ctx.moveTo(anchor.x - 22, baseY); ctx.lineTo(anchor.x - 26, anchor.y - 36); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(anchor.x + 22, baseY); ctx.lineTo(anchor.x + 26, anchor.y - 36); ctx.stroke();
  ctx.strokeStyle = PALETTE.slingWood; ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(anchor.x - 22, baseY); ctx.lineTo(anchor.x - 26, anchor.y - 36); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(anchor.x + 22, baseY); ctx.lineTo(anchor.x + 26, anchor.y - 36); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.16)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(anchor.x - 24, baseY - 10); ctx.lineTo(anchor.x - 27, anchor.y - 40); ctx.stroke();

  // fitinha de casamento amarrada na forquilha
  ctx.strokeStyle = "#D9A9C4"; ctx.lineWidth = 4;
  const sway = Math.sin(performance.now() / 620) * 6;
  ctx.beginPath();
  ctx.moveTo(anchor.x + 26, anchor.y - 34);
  ctx.quadraticCurveTo(anchor.x + 44 + sway, anchor.y - 12, anchor.x + 34 + sway, anchor.y + 16);
  ctx.stroke();

  /* O elástico só estica até a bola enquanto ela está presa no bolso.
     Depois de solta, ele volta pro descanso — senão fica uma linha absurda
     atravessando a tela durante o voo inteiro. */
  const body = Game.currentProjectile;
  const loaded = body && body.isStatic;
  const pouch = loaded ? body.position : { x: anchor.x, y: anchor.y + 6 };
  const tension = loaded ? clamp(Aim.power, 0, 1) : 0;
  ctx.strokeStyle = PALETTE.band;
  ctx.lineWidth = 8 - tension * 2.5;
  ctx.beginPath(); ctx.moveTo(anchor.x - 26, anchor.y - 34); ctx.lineTo(pouch.x, pouch.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(anchor.x + 26, anchor.y - 34); ctx.lineTo(pouch.x, pouch.y); ctx.stroke();
  // bolso de couro
  ctx.save();
  ctx.translate(pouch.x, pouch.y);
  ctx.rotate(Math.atan2(anchor.y - 34 - pouch.y, anchor.x - pouch.x));
  ctx.fillStyle = PALETTE.slingLeather;
  roundRectPath(ctx, -8, -18, 12, 36, 5); ctx.fill();
  ctx.restore();
}

function drawTrajectory() {
  if (!Aim.dragging || !Aim.trajectory.length) return;
  const n = Aim.trajectory.length;
  Aim.trajectory.forEach(function (p, i) {
    const t = i / n;
    ctx.globalAlpha = 0.75 * (1 - t * 0.75);
    ctx.fillStyle = i > n * 0.7 ? PALETTE.terracotta : "#3E3A32";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6 - t * 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  // "alvo" no ponto final previsto
  const last = Aim.trajectory[n - 1];
  if (last) {
    ctx.strokeStyle = "rgba(196,109,40,.65)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(last.x, last.y, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(last.x - 24, last.y); ctx.lineTo(last.x - 8, last.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(last.x + 8, last.y); ctx.lineTo(last.x + 24, last.y); ctx.stroke();
  }
}

function drawBlock(body) {
  const spec = body.wglBlock, mat = BLOCK_KINDS[spec.kind] || BLOCK_KINDS.crate;
  const w = spec.w, h = spec.h;
  drawGroundShadow(body.position.x, body.position.y + h / 2, w);
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);

  if (mat.shape === "circle") {
    const r = w / 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, "#FFFFFF33"); g.addColorStop(0.25, mat.color); g.addColorStop(1, mat.accent);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = mat.accent; ctx.stroke();
    if (spec.kind === "bottle") {
      ctx.fillStyle = "rgba(255,255,255,.28)";
      ctx.fillRect(-r * 0.35, -r * 0.7, r * 0.22, r * 1.3);
    }
    if (spec.kind === "floral") {
      ctx.fillStyle = "#FFFFFF";
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.22, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (mat.shape === "triangle") {
    // Mesma forma do corpo físico (trapézio quase fechado): base embaixo,
    // ápice em cima, centro de massa a 1/3 da altura.
    const baseY = h / 3, apexY = -2 * h / 3;
    ctx.beginPath();
    ctx.moveTo(-w / 2, baseY); ctx.lineTo(0, apexY); ctx.lineTo(w / 2, baseY); ctx.closePath();
    const g = ctx.createLinearGradient(0, apexY, 0, baseY);
    g.addColorStop(0, "#A26B3E"); g.addColorStop(1, mat.accent);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = mat.accent; ctx.stroke();
    // telhas
    ctx.strokeStyle = "rgba(0,0,0,.14)"; ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      const yy = apexY + (baseY - apexY) * (i / 4);
      const half = (w / 2) * (i / 4);
      ctx.beginPath(); ctx.moveTo(-half, yy); ctx.lineTo(half, yy); ctx.stroke();
    }
  } else {
    // Retângulos com cantos arredondados + gradiente: menos "programador
    // desenhando caixa", mais objeto de festa.
    const r = mat.radius || 5;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, mat.color); g.addColorStop(1, mat.accent);
    roundRectPath(ctx, -w / 2, -h / 2, w, h, r);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = mat.accent; ctx.stroke();
    // brilho superior
    ctx.globalAlpha = 0.25; ctx.fillStyle = "#FFFFFF";
    roundRectPath(ctx, -w / 2 + 3, -h / 2 + 3, w - 6, Math.min(10, h * 0.22), 4); ctx.fill();
    ctx.globalAlpha = 1;

    drawBlockDetail(spec.kind, w, h, mat, body);
  }
  ctx.restore();
}

function drawBlockDetail(kind, w, h, mat, body) {
  if (kind === "plaque" && w > 70) {
    ctx.fillStyle = mat.accent;
    ctx.font = "700 " + Math.round(h * 0.6) + "px 'Cormorant Garamond', serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("T&G", 0, 1);
  }
  if (kind === "stake" || kind === "shard") {
    ctx.strokeStyle = "rgba(0,0,0,.14)"; ctx.lineWidth = 1.4;
    for (let yy = -h / 2 + 12; yy < h / 2 - 4; yy += 16) {
      ctx.beginPath(); ctx.moveTo(-w / 2 + 3, yy); ctx.lineTo(w / 2 - 3, yy); ctx.stroke();
    }
  }
  if (kind === "steel") {
    ctx.fillStyle = "rgba(255,255,255,.4)";
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
      ctx.beginPath(); ctx.arc(c[0] * (w / 2 - 9), c[1] * (h / 2 - 9), 3.4, 0, Math.PI * 2); ctx.fill();
    });
  }
  if (kind === "spring") {
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 3.4; ctx.lineJoin = "round";
    ctx.beginPath();
    const coils = 4, cw = w * 0.72;
    for (let i = 0; i <= coils * 2; i++) {
      const xx = -cw / 2 + (cw * i) / (coils * 2);
      const yy = (i % 2 === 0) ? -h * 0.24 : h * 0.24;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  if (kind === "suitcase") {
    ctx.fillStyle = mat.accent;
    ctx.fillRect(-w * 0.12, -h / 2 - 9, w * 0.24, 11);
    ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 6, -h * 0.1); ctx.lineTo(w / 2 - 6, -h * 0.1); ctx.stroke();
  }
  if (kind === "tnt") {
    // faixa vermelha + letras + pavio piscando
    ctx.fillStyle = "#F6E4C8";
    roundRectPath(ctx, -w / 2 + 2, -h * 0.16, w - 4, h * 0.34, 3); ctx.fill();
    ctx.fillStyle = "#8C2A16";
    ctx.font = "800 " + Math.round(h * 0.26) + "px 'Inter', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("TNT", 0, h * 0.01);
    ctx.strokeStyle = "#C9A268"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.quadraticCurveTo(w * 0.3, -h * 0.72, w * 0.14, -h * 0.86); ctx.stroke();
    const t = 0.5 + 0.5 * Math.sin(performance.now() / 110 + (body.wglBlock.seed || 0) * 10);
    ctx.fillStyle = "rgba(255," + Math.round(180 + 60 * t) + ",90,.95)";
    ctx.beginPath(); ctx.arc(w * 0.14, -h * 0.86, 4 + t * 2.5, 0, Math.PI * 2); ctx.fill();
  }
  if (kind === "rocket") {
    // bico cônico + aletas + varinha
    ctx.fillStyle = "#8A2E12";
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(0, -h / 2 - w * 0.7); ctx.lineTo(w / 2, -h / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#F1EAD9";
    for (let i = 0; i < 3; i++) { ctx.fillRect(-w / 2 + 2, -h * 0.2 + i * h * 0.2, w - 4, 4); }
    ctx.fillStyle = "#5E3C21";
    ctx.fillRect(-2.5, h / 2 - 2, 5, h * 0.34);
    ctx.fillStyle = "#8A2E12";
    ctx.beginPath(); ctx.moveTo(-w / 2, h / 2); ctx.lineTo(-w / 2 - 8, h / 2 + 12); ctx.lineTo(-w / 2, h / 2 - 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2 + 8, h / 2 + 12); ctx.lineTo(w / 2, h / 2 - 6); ctx.closePath(); ctx.fill();
  }
  if (kind === "champagne") {
    // gargalo + rótulo dourado + papel alumínio
    ctx.fillStyle = "#22331C";
    roundRectPath(ctx, -w * 0.2, -h / 2 - h * 0.3, w * 0.4, h * 0.32, 3); ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    roundRectPath(ctx, -w * 0.24, -h / 2 - h * 0.32, w * 0.48, h * 0.12, 3); ctx.fill();
    ctx.fillStyle = "#F1EAD9";
    roundRectPath(ctx, -w / 2 + 4, h * 0.02, w - 8, h * 0.28, 3); ctx.fill();
    ctx.fillStyle = "#8C6A24";
    ctx.font = "700 " + Math.round(h * 0.13) + "px 'Cormorant Garamond', serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("T&G", 0, h * 0.16);
  }
  if (kind === "glass") {
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-w * 0.3, -h * 0.3); ctx.lineTo(w * 0.15, h * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.28, -h * 0.28); ctx.lineTo(-w * 0.05, h * 0.1); ctx.stroke();
  }
  if (kind === "cake") {
    // três andares de merengue + topo com dois bonequinhos abstratos
    ctx.fillStyle = "#F5D9E0";
    for (let i = 0; i < 3; i++) {
      const yy = -h / 2 + 6 + i * (h / 3);
      const ww = w - 10 - i * 14;
      roundRectPath(ctx, -ww / 2, yy, ww, 7, 3.5); ctx.fill();
    }
    ctx.fillStyle = "#C46D28";
    ctx.beginPath(); ctx.arc(-7, -h / 2 - 6, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7A9B6E";
    ctx.beginPath(); ctx.arc(7, -h / 2 - 6, 5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBomb(body) {
  const r = CFG.BOMB_RADIUS;
  drawGroundShadow(body.position.x, body.position.y + r, r * 2);
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
  grad.addColorStop(0, "#514C44"); grad.addColorStop(1, "#1D1A16");
  ctx.fillStyle = grad; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = PALETTE.terracotta; ctx.stroke();
  ctx.strokeStyle = "#C9A268"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.35, -r * 1.35, r * 0.15, -r * 1.6); ctx.stroke();
  const t = 0.5 + 0.5 * Math.sin(performance.now() / 100);
  ctx.fillStyle = "#F1D27A";
  ctx.beginPath(); ctx.arc(r * 0.15, -r * 1.6, 4 + t * 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBalloon(body) {
  const st = body.wglBalloon, r = st.radius;
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle * 0.4);
  // corpo do balão (gota)
  ctx.beginPath();
  ctx.moveTo(0, r * 1.12);
  ctx.bezierCurveTo(-r * 1.05, r * 0.42, -r * 1.02, -r * 0.9, 0, -r);
  ctx.bezierCurveTo(r * 1.02, -r * 0.9, r * 1.05, r * 0.42, 0, r * 1.12);
  ctx.closePath();
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.2);
  g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.35, st.color); g.addColorStop(1, "rgba(0,0,0,.18)");
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.14)"; ctx.lineWidth = 2; ctx.stroke();
  // bico
  ctx.fillStyle = st.color;
  ctx.beginPath(); ctx.moveTo(-5, r * 1.1); ctx.lineTo(5, r * 1.1); ctx.lineTo(0, r * 1.3); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* Estrela bônus: gira devagar, flutua e pulsa. Precisa "pedir" pra ser
   acertada mesmo de longe, então tem halo e brilho. */
function drawStar(body) {
  const s = body.wglStar;
  const t = performance.now() / 1000;
  const bob = Math.sin(t * 1.7 + s.seed) * 7;
  const pulse = 0.9 + 0.1 * Math.sin(t * 3 + s.seed);
  ctx.save();
  ctx.translate(body.position.x, body.position.y + bob);

  const halo = ctx.createRadialGradient(0, 0, s.r * 0.3, 0, 0, s.r * 2.4);
  halo.addColorStop(0, "rgba(255,226,140,.55)");
  halo.addColorStop(1, "rgba(255,226,140,0)");
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(0, 0, s.r * 2.4 * pulse, 0, Math.PI * 2); ctx.fill();

  ctx.rotate(Math.sin(t * 0.9 + s.seed) * 0.35);
  ctx.scale(pulse, pulse);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = (i % 2 === 0) ? s.r : s.r * 0.44;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -s.r, 0, s.r);
  g.addColorStop(0, "#FFF3CC"); g.addColorStop(0.5, "#F5CE63"); g.addColorStop(1, "#D9A03C");
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = "#A8762A"; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.beginPath(); ctx.ellipse(-s.r * 0.22, -s.r * 0.3, s.r * 0.16, s.r * 0.09, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawRope(rope) {
  const a = rope.bodyA, b = rope.bodyB;
  if (!a || !b) return;
  const ax = a.position.x + rope.pointA.x, ay = a.position.y + rope.pointA.y;
  const bx = b.position.x + rope.pointB.x, by = b.position.y + rope.pointB.y;
  ctx.strokeStyle = "rgba(42,40,32,.45)"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo((ax + bx) / 2 + 6, (ay + by) / 2, bx, by);
  ctx.stroke();
}

function drawGift(body) {
  const g = body.wglGift, tier = GIFT_TIERS[g.tier];
  const w = g.w, h = g.h;
  drawGroundShadow(body.position.x, body.position.y + h / 2, w);
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  // Tremidinha depois de levar pancada sem quebrar — feedback claro de "bati,
  // mas não foi o bastante".
  if (g.wobble > 0) {
    const s = 1 + Math.sin(performance.now() / 40) * 0.05 * g.wobble;
    ctx.scale(s, 1 / s);
    g.wobble = Math.max(0, g.wobble - 0.03);
  }

  if (g.shape === "round") {
    const r = w / 2;
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.15, 0, 0, r);
    grad.addColorStop(0, "#FFFFFF"); grad.addColorStop(0.4, tier.color); grad.addColorStop(1, tier.accent);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = tier.accent; ctx.stroke();
    ctx.strokeStyle = tier.ribbon; ctx.lineWidth = Math.max(3, r * 0.2);
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
  } else {
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, tier.color); grad.addColorStop(1, tier.accent);
    ctx.fillStyle = grad;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 7); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = tier.accent; ctx.stroke();
    ctx.strokeStyle = tier.ribbon; ctx.lineWidth = Math.max(3, w * 0.1);
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(0, h / 2); ctx.stroke();
  }
  // laço
  ctx.fillStyle = tier.ribbon;
  const ly = g.shape === "round" ? -w / 2 : -h / 2;
  ctx.beginPath();
  ctx.ellipse(-w * 0.1, ly, w * 0.12, w * 0.08, 0.55, 0, Math.PI * 2);
  ctx.ellipse(w * 0.1, ly, w * 0.12, w * 0.08, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tier.accent;
  ctx.beginPath(); ctx.arc(0, ly, w * 0.05, 0, Math.PI * 2); ctx.fill();

  // brilho de "presente dourado"
  if (g.tier === "golden" || g.tier === "special") {
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(performance.now() / 500));
    ctx.globalAlpha = tw;
    ctx.strokeStyle = g.tier === "golden" ? "#FFF0BF" : "#FFFFFF";
    ctx.lineWidth = 2;
    const sx = w * 0.3, sy = -h * 0.28, ss = 7;
    ctx.beginPath(); ctx.moveTo(sx - ss, sy); ctx.lineTo(sx + ss, sy); ctx.moveTo(sx, sy - ss); ctx.lineTo(sx, sy + ss); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // rachaduras quando já apanhou (mais legível que os pontinhos antigos)
  if (g.hp < g.maxHp) {
    ctx.strokeStyle = "rgba(42,40,32,.45)"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.28, -h * 0.3); ctx.lineTo(-w * 0.06, -h * 0.04);
    ctx.lineTo(-w * 0.2, h * 0.12); ctx.lineTo(w * 0.04, h * 0.32);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHead(body) {
  const r = body.wglRadius || CFG.PROJECTILE_RADIUS;
  const key = body.wglHeadKey || "gian";
  const boom = body.wglBoom && !body.wglBoom.spent;
  drawGroundShadow(body.position.x, body.position.y + r, r * 2);
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);

  if (boom) {
    // aura pulsante de projétil-bomba
    const t = 0.5 + 0.5 * Math.sin(performance.now() / 120);
    const halo = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.9);
    halo.addColorStop(0, "rgba(255,180,90,.6)"); halo.addColorStop(1, "rgba(255,180,90,0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, r * (1.6 + t * 0.3), 0, Math.PI * 2); ctx.fill();
  }

  const img = headImageFor(key, body.wglFace || 0);
  ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fill();
  if (img) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, -r, -r, r * 2, r * 2);
    ctx.restore();
  } else {
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    if (key === "gian") { grad.addColorStop(0, "#EDE0C8"); grad.addColorStop(1, "#C8A050"); }
    else { grad.addColorStop(0, "#F0DCC8"); grad.addColorStop(1, "#C46D28"); }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.fillStyle = "#3A342B";
    ctx.font = "700 " + Math.round(r * 1.15) + "px 'Cormorant Garamond', serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(key === "gian" ? "G" : "T", 0, r * 0.08);
  }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = 3.5; ctx.strokeStyle = boom ? "#FFC46B" : "#FFFFFF"; ctx.stroke();
  ctx.restore();
}

function drawShockwaves() {
  shockwaves.forEach(function (s) {
    const t = 1 - s.life / s.maxLife;
    ctx.globalAlpha = (1 - t) * 0.55;
    ctx.strokeStyle = "#FFE3B0";
    ctx.lineWidth = 10 * (1 - t) + 2;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = (1 - t) * 0.22;
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.72, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

function drawParticles() {
  particles.forEach(function (p) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = alpha;
    if (p.kind === "smoke") {
      ctx.fillStyle = p.color + (alpha * 0.34).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === "fireball") {
      const g = ctx.createRadialGradient(0, 0, p.size * 0.1, 0, 0, p.size * alpha);
      g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.35, p.color); g.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, p.size * alpha, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === "spark") {
      ctx.strokeStyle = p.color; ctx.lineWidth = p.size * 0.7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-p.vx * 1.4, -p.vy * 1.4); ctx.stroke();
    } else if (p.kind === "heart") {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      const s = p.size * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.7);
      ctx.bezierCurveTo(-s * 1.5, -s * 0.4, -s * 0.5, -s * 1.3, 0, -s * 0.5);
      ctx.bezierCurveTo(s * 0.5, -s * 1.3, s * 1.5, -s * 0.4, 0, s * 0.7);
      ctx.fill();
    } else if (p.kind === "petal" || p.kind === "foam") {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(0, 0, p.size * 0.62, p.size * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    }
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

function drawFloatingTexts() {
  floatingTexts.forEach(function (t) {
    const alpha = clamp(t.life / t.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.font = (t.big ? "700 34px " : "600 24px ") + "'Cormorant Garamond', serif";
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

/* Zoom por fase: <1 = "mais longe" (cabe mais mundo na mesma janela), >1 =
   "mais perto". Não muda o alcance real do arremesso (isso é física) — só a
   escala em que a cena é desenhada. Sempre em torno do centro da tela. */
function currentZoom() { return (Game.level && Game.level.zoom) || 1; }

function render() {
  ctx.clearRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  drawSky();
  drawClouds();

  ctx.save();
  const zoom = currentZoom();
  ctx.translate(CFG.VIEW_W / 2, CFG.VIEW_H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-CFG.VIEW_W / 2, -CFG.VIEW_H / 2);
  ctx.translate(-Camera.x + Camera.shakeX, -Camera.y + Camera.shakeY);

  drawHills();
  drawGround();
  drawSlingshot();
  drawTrajectory();
  activeRopes.forEach(drawRope);
  activeBlocks.forEach(drawBlock);
  activeGifts.forEach(function (b) { if (!b.wglGift.destroyed) drawGift(b); });
  activeBombs.forEach(function (b) { if (!b.wglBomb.exploded) drawBomb(b); });
  activeBalloons.forEach(drawBalloon);
  activeStars.forEach(drawStar);
  restBodies.forEach(drawHead);
  if (Game.currentProjectile) drawHead(Game.currentProjectile);
  drawShockwaves();
  drawParticles();
  drawFloatingTexts();
  ctx.restore();

  // Flash de explosão — em espaço de tela, por cima de tudo
  if (screenFlash > 0.01) {
    ctx.fillStyle = "rgba(255,236,200," + (screenFlash * 0.5).toFixed(3) + ")";
    ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  }
  // Vinheta suave: dá foco ao centro e disfarça as bordas do mundo
  const vig = ctx.createRadialGradient(CFG.VIEW_W / 2, CFG.VIEW_H / 2, CFG.VIEW_H * 0.42, CFG.VIEW_W / 2, CFG.VIEW_H / 2, CFG.VIEW_W * 0.72);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, isNight() ? "rgba(10,10,30,.4)" : "rgba(60,44,20,.2)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
}

/* ══════════════════════════════════════════════════════════════════════
   20. HUD + OVERLAYS (DOM)
   ══════════════════════════════════════════════════════════════════════ */
let hudLevelEl, hudScoreEl, hudBestEl, hudThrowsEl, hudGiftsEl, heartsEls,
    chaosFillEl, chaosPillEl, comboFlashEl, hudStarsEl, hudStarsWrapEl;
let ovStart, ovComplete, ovFail, ovPause, ovFinal;

function updateHud() {
  if (!hudLevelEl) return;
  hudLevelEl.textContent = String(Game.levelIndex + 1);
  hudScoreEl.textContent = fmtNum(Score.total);
  hudBestEl.textContent = fmtNum(Math.max(Game.highScore, Score.total));
  hudThrowsEl.textContent = String(Math.max(0, effectiveThrows() - Game.throwsUsed));
  hudGiftsEl.textContent = String(remainingGiftsCount());
  if (hudStarsEl) {
    const total = (Game.level.stars || []).length;
    hudStarsWrapEl.hidden = total === 0;
    hudStarsEl.textContent = (total - activeStars.length) + "/" + total;
  }
  heartsEls.forEach(function (el, i) { el.classList.toggle("is-lost", i >= Game.lives); });
  if (chaosFillEl) {
    chaosFillEl.style.width = Math.round(Chaos.value * 100) + "%";
    chaosPillEl.classList.toggle("is-ready", Chaos.ready);
  }
}

let comboFlashTimer = 0;
function flashCombo(text) {
  if (!comboFlashEl) return;
  comboFlashEl.textContent = text;
  comboFlashEl.hidden = false;
  // re-dispara a animação CSS (senão o segundo flash seguido não anima)
  comboFlashEl.style.animation = "none";
  void comboFlashEl.offsetWidth;
  comboFlashEl.style.animation = "";
  clearTimeout(comboFlashTimer);
  comboFlashTimer = setTimeout(function () { comboFlashEl.hidden = true; }, 1100);
}

function hideAllOverlays() {
  [ovStart, ovComplete, ovFail, ovPause, ovFinal].forEach(function (o) { if (o) o.hidden = true; });
}

function rowHtml(label, value, bonus) {
  return '<div class="wgl-score-row' + (bonus ? " wgl-score-row--bonus" : "") + '"><span>' + label + "</span><span>" + value + "</span></div>";
}

function showLevelComplete(data) {
  hideAllOverlays();
  document.getElementById("complete-kicker").textContent = "Fase " + (Game.levelIndex + 1) + " · " + Game.level.name;
  const base = data.levelPoints - data.unusedBonus - data.perfectBonus - data.chaosBonus;
  const rows = [ rowHtml("Destruição da fase", fmtNum(base)) ];
  if (data.unused > 0) rows.push(rowHtml(data.unused + "x arremesso guardado", "+" + fmtNum(data.unusedBonus), true));
  if (data.perfect) rows.push(rowHtml("Fase perfeita", "+" + fmtNum(data.perfectBonus), true));
  if (data.chaosBonus) rows.push(rowHtml("Medidor de caos cheio", "+" + fmtNum(data.chaosBonus), true));
  if (data.starsTotal) {
    rows.push(rowHtml("Estrelas bônus " + data.starsGot + "/" + data.starsTotal,
      data.starsGot === data.starsTotal ? "todas!" : "faltaram " + (data.starsTotal - data.starsGot),
      data.starsGot === data.starsTotal));
  }
  document.getElementById("complete-breakdown").innerHTML = rows.join("");
  document.getElementById("complete-total").textContent = fmtNum(data.levelPoints);
  const nextIdx = Game.levelIndex + 1;
  const next = (nextIdx < LEVELS.length || Game.endless) ? levelAt(nextIdx) : null;
  document.getElementById("complete-next").textContent = next ? "A seguir: " + next.name : "Última fase desenhada!";
  ovComplete.hidden = false;
}

function showFail() {
  hideAllOverlays();
  const wrap = document.getElementById("fail-lives");
  wrap.innerHTML = "";
  for (let i = 0; i < CFG.START_LIVES; i++) {
    const img = document.createElement("img");
    img.src = i < Game.lives ? "assets/img/icon-heart-full.png" : "assets/img/icon-heart-broken.png";
    img.alt = "";
    img.className = "wgl-life-icon" + (i < Game.lives ? "" : " is-lost");
    wrap.appendChild(img);
  }
  ovFail.hidden = false;
}

function showPause() { hideAllOverlays(); ovPause.hidden = false; }

function stat(label, value) {
  return '<div class="wgl-final-stat"><strong>' + value + "</strong>" + label + "</div>";
}

function showFinal(victory) {
  hideAllOverlays();
  document.getElementById("final-kicker").textContent = victory ? "Parabéns!" : "Fim de jogo";
  document.getElementById("final-title").textContent = victory ? "Vocês salvaram a festa!" : "Foi por pouco!";
  // O convite pro modo infinito só aparece pra quem realmente fechou as 50
  document.getElementById("btn-endless").hidden = !victory;
  document.getElementById("endless-note").hidden = !victory;
  document.getElementById("btn-playagain").textContent = victory ? "Recomeçar do zero" : "Jogar de novo";
  document.getElementById("final-score").textContent = fmtNum(Score.total);
  document.getElementById("final-newbest").hidden = !(Score.total >= Game.highScore && Score.total > 0);
  const s = Game.stats;
  document.getElementById("final-stats").innerHTML = [
    stat("Fases completas", s.levelsCompleted),
    stat("Presentes destruídos", s.giftsDestroyed),
    stat("Explosivos detonados", s.explosives),
    stat("Estrelas bônus", s.starsCollected),
    stat("Estruturas derrubadas", s.blocksFallen),
    stat("Tiros de caos", s.boomShots),
  ].join("");
  ovFinal.hidden = false;
}

/* ══════════════════════════════════════════════════════════════════════
   21. LOOP PRINCIPAL / BOOT
   ══════════════════════════════════════════════════════════════════════ */
/* Passo de física FIXO (STEP_MS = 1000/60) com acumulador, em vez do dt
   variável de cada frame. Necessário porque a prévia pontilhada da
   trajetória assume passos desse tamanho exato — com passo fixo, o
   pontilhado bate com o voo de verdade em qualquer aparelho (30, 60, 90 ou
   120fps). O slow-motion é feito reduzindo quantos passos rodam por frame,
   não mexendo no tamanho do passo (mexer no passo mudaria a física). */
const FIXED_DT = STEP_MS;
const MAX_PHYSICS_STEPS_PER_FRAME = 5;
let physicsAccumulator = 0;
let lastTs = 0;

function frame(ts) {
  requestAnimationFrame(frame);
  if (!lastTs) lastTs = ts;
  let frameDt = clamp(ts - lastTs, 0, 250);
  lastTs = ts;

  const now = performance.now();
  const frozen = now < hitStopUntil;
  const slow = now < slowMoUntil;

  if (Game.screen === "playing" && !frozen) {
    physicsAccumulator += frameDt * (slow ? 0.35 : 1);
    let steps = 0;
    while (physicsAccumulator >= FIXED_DT && steps < MAX_PHYSICS_STEPS_PER_FRAME) {
      updateBalloons();
      updateRockets(now);
      updateChampagnes(now);
      Engine.update(engine, FIXED_DT);
      physicsAccumulator -= FIXED_DT;
      steps++;
    }
    if (steps >= MAX_PHYSICS_STEPS_PER_FRAME) physicsAccumulator = 0;
    checkFallenBlocks();
    sweepOutOfBounds();
    updateProjectileLifecycle(frameDt);
    updateCamera();
    if (victoryCheckAt && now >= victoryCheckAt) {
      victoryCheckAt = 0;
      if (remainingGiftsCount() === 0) completeLevel();
    }
  }
  updateParticles(frameDt * (slow ? 0.5 : 1));
  render();
}

function bindEvents() {
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  // pointercancel NÃO arremessa: o gesto foi roubado, seria um tiro fantasma.
  window.addEventListener("pointercancel", cancelAim);
  window.addEventListener("blur", cancelAim);
  document.addEventListener("visibilitychange", function () { if (document.hidden) cancelAim(); });
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", function () { setTimeout(resizeCanvas, 60); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", resizeCanvas);

  document.getElementById("btn-play").addEventListener("click", function () {
    ensureAudio();
    hideAllOverlays();
    startRun();
  });
  document.getElementById("btn-continue").addEventListener("click", continueAfterComplete);
  document.getElementById("btn-retry").addEventListener("click", retryLevel);
  document.getElementById("btn-playagain").addEventListener("click", function () {
    hideAllOverlays();
    Game.endless = false;
    ovStart.hidden = false;
    document.getElementById("start-best").textContent = fmtNum(Game.highScore);
  });
  /* Continua a MESMA partida (pontos, vidas e medidor de caos preservados) —
     recomeçar do zero depois de 50 fases seria castigo, não recompensa. */
  document.getElementById("btn-endless").addEventListener("click", function () {
    Game.endless = true;
    Game.screen = "playing";
    Game.attemptsThisLevel = 1;
    hideAllOverlays();
    hudEl.hidden = false;
    pauseBtn.hidden = false;
    flashCombo("Caos Infinito!");
    startLevel(LEVELS.length);
  });
  pauseBtn.addEventListener("click", function () {
    if (Game.screen === "playing") { Game.screen = "pause"; showPause(); }
  });
  document.getElementById("btn-resume").addEventListener("click", function () {
    Game.screen = "playing"; hideAllOverlays();
  });
  document.getElementById("btn-restart-run").addEventListener("click", function () {
    hideAllOverlays();
    startRun();
  });

  // Atalhos de teclado no desktop: espaço/P pausa, R reinicia a fase
  window.addEventListener("keydown", function (e) {
    if (e.key === "p" || e.key === "P") {
      if (Game.screen === "playing") { Game.screen = "pause"; showPause(); }
      else if (Game.screen === "pause") { Game.screen = "playing"; hideAllOverlays(); }
    }
  });
}

function boot() {
  canvas = document.getElementById("wgl-canvas");
  ctx = canvas.getContext("2d");
  stageEl = document.getElementById("wgl-stage");
  hudEl = document.getElementById("wgl-hud");
  pauseBtn = document.getElementById("wgl-pause-btn");

  hudLevelEl = document.getElementById("hud-level");
  hudScoreEl = document.getElementById("hud-score");
  hudBestEl = document.getElementById("hud-best");
  hudThrowsEl = document.getElementById("hud-throws");
  hudGiftsEl = document.getElementById("hud-gifts");
  chaosFillEl = document.getElementById("hud-chaos-fill");
  chaosPillEl = document.getElementById("hud-chaos");
  hudStarsEl = document.getElementById("hud-stars");
  hudStarsWrapEl = document.getElementById("hud-stars-wrap");
  comboFlashEl = document.getElementById("wgl-combo-flash");
  heartsEls = Array.prototype.slice.call(document.querySelectorAll("#hud-lives-wrap .wgl-heart"));

  ovStart = document.getElementById("ov-start");
  ovComplete = document.getElementById("ov-complete");
  ovFail = document.getElementById("ov-fail");
  ovPause = document.getElementById("ov-pause");
  ovFinal = document.getElementById("ov-final");

  Game.stats = freshStats();
  document.getElementById("start-best").textContent = fmtNum(Game.highScore);

  loadHeadImages();
  resizeCanvas();
  bindEvents();
  requestAnimationFrame(frame);
}

/* Erros em tempo de execução não podem derrubar o jogo em silêncio — mas
   também não devem cobrir a tela toda depois que a partida já começou
   (um erro num efeito visual não justifica matar a diversão). */
window.addEventListener("error", function (e) {
  if (Game && Game.screen !== "start") { console.error("[mira] erro em jogo:", e && e.message); return; }
  wglShowFatalError("Erro inesperado: " + (e && e.message ? e.message : "desconhecido") +
    ". Recarregue a página; se persistir, veja o console do navegador (F12).");
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

})();

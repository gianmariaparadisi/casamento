/* ══════════════════════════════════════════════════════════════════════════
   MIRA DO CASAMENTO — wedding-gift-launch.js
   Jogo de estilingue/física com tema de casamento (Tiago & Gian), feito com
   Matter.js. Sem backend, sem frameworks, roda direto no GitHub Pages (ou
   até localmente via file://).

   ÍNDICE (seções nomeadas, nessa ordem):
     1.  Config / constantes
     2.  Assets (imagens das cabeças, com fallback desenhado)
     3.  Setup do Matter.js
     4.  Utilitários
     5.  Definição dos níveis (20 fases)
     6.  Criação de corpos físicos
     7.  Input de mira (arrastar / mirar / soltar)
     8.  Câmera
     9.  Áudio sintetizado (Web Audio API)
     10. Haptics (navigator.vibrate)
     11. Partículas / confete / textos flutuantes
     12. Renderização (canvas)
     13. Pontuação / combo
     14. Estados do jogo (máquina de estados) + HUD
     15. Overlays (telas)
     16. Loop principal / boot
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";

/* Mostra um aviso visível na tela em vez de deixar o botão "Jogar" só ficar
   sem reagir — se o Matter.js não carregar (CDN bloqueado, sem internet no
   momento de abrir o arquivo local etc.) ou qualquer outro erro acontecer
   na inicialização, o motivo aparece aqui, não some em silêncio no console. */
function wglShowFatalError(msg) {
  try {
    var stage = document.getElementById("wgl-stage") || document.body;
    var box = document.createElement("div");
    box.style.cssText = "position:absolute;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;background:rgba(42,40,32,.94);color:#fff;text-align:center;padding:24px;font-family:sans-serif;";
    box.innerHTML = '<div style="max-width:360px"><p style="font-size:1.05rem;margin:0 0 .6rem">⚠️ O jogo não conseguiu iniciar</p>' +
      '<p style="font-size:.8rem;opacity:.85;line-height:1.55;margin:0">' + msg + '</p></div>';
    stage.appendChild(box);
  } catch (e) { /* nem isso deu certo — não tem mais o que fazer */ }
}
window.addEventListener("error", function (e) {
  wglShowFatalError("Erro inesperado: " + (e && e.message ? e.message : "desconhecido") +
    ". Recarregue a página; se persistir, veja o console do navegador (F12) pra mais detalhes.");
});

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
     via Node) até o arco ficar parabólico e satisfatório: em força máxima o
     projétil percorre ~1300-1650px em ~1-1.3s (cobre até o alvo mais distante
     da fase 20) e desacelera visivelmente ao subir — não uma linha quase reta
     saindo da tela, que era o que a calibração antiga fazia (a fórmula de
     gravidade do Matter usa o quadrado do passo de tempo, então uma conta
     "no olho" erra fácil por uma ordem de grandeza). */
  GRAVITY_Y: 1.9,

  SLING_X_ANCHOR_OFFSET: 0,   // ajuste fino opcional da forquilha do estilingue
  SLING_Y_OFFSET: 190,        // altura do bolso do estilingue acima do chão
  SLING_MAX_DRAG: 165,        // distância máxima de arrasto (px lógicos)
  SLING_FORCE_MULT: 0.1576,   // velocidade de lançamento = distância arrastada * isso (165*isso ≈ força máxima)
  SLING_MAX_LAUNCH_SPEED: 26, // trava de força máxima (o jogo não fica caótico)

  PROJECTILE_RADIUS: 32,

  CAMERA_FOLLOW_LERP: 0.085,  // suavização da câmera seguindo o projétil
  CAMERA_RETURN_LERP: 0.07,   // suavização da câmera voltando pro estilingue

  SETTLE_SPEED_THRESHOLD: 0.35,  // abaixo disso, corpo conta como "quase parado"
  SETTLE_FRAMES_NEEDED: 42,      // ~0.7s a 60fps parado antes de liberar o próximo arremesso
  NEXT_THROW_DELAY_MS: 550,
  MAX_FLIGHT_MS: 9000,           // segurança: nunca deixa um arremesso "pendurado" pra sempre

  MIN_HIT_SPEED: 5.2,          // velocidade mínima de colisão pra contar como "impacto de verdade"
  BLOCK_FALL_ANGLE: 0.5,        // ~28.6°: acima disso o bloco é considerado "derrubado"

  /* Bombas: explodem ao serem atingidas (ou atingidas por estilhaços de
     outra explosão — reação em cadeia). Empurram tudo num raio, e presentes
     bem no centro da explosão são destruídos na hora. */
  BOMB_RADIUS: 26,
  BOMB_BLAST_RADIUS: 230,       // alcance da onda de choque
  // Calibrado testando no Matter.js de verdade: a força NÃO escala pela
  // massa do corpo atingido (testei escalando e o bloco de aço se movia
  // igual a tudo, perdendo a graça de "obstáculo pesado que resiste") — com
  // força fixa (só variando pela distância), o aço mal se mexe (~40px) e a
  // estaca fina voa longe (~850px), que é o contraste que queremos.
  BOMB_FORCE: 0.1,              // magnitude da força radial (escala Body.applyForce)
  BOMB_GIFT_DESTROY_RADIUS: 135,// presentes dentro desse raio morrem na hora
  BOMB_POINTS: 300,             // bônus só por detonar a bomba (mesmo sem pegar presente)
  BOMB_CHAIN_DELAY_MS: 90,      // atraso pra reação em cadeia entre bombas próximas

  TOTAL_LEVELS: 50,
  START_LIVES: 3,
  LIFE_LOST_PENALTY: 200,       // penalidade de pontos ao perder 1 vida
  HIGHSCORE_KEY: "wglHighScore_v1",

  COMBO_WINDOW_MS: 2200,
  COMBO_STEP: 0.35,             // cada presente extra no combo soma esse multiplicador
  COMBO_MAX_MULT: 2.6,

  POINTS: {
    weak: 500,
    medium: 800,
    strong: 1200,
    golden: 2000,
    special: 1500,
    blockMin: 50,
    blockMax: 150,
    unusedThrow: 2500,
    perfectLevel: 5000,
  },
};

/* Paleta visual — mesmo espírito do site (creme / sálvia / terracota / dourado / rosa) */
const PALETTE = {
  skyTop: "#BFE3EE",
  skyBottom: "#EAF3E4",
  skyTopSunset: "#F3C98B",
  skyBottomSunset: "#F6E2C4",
  skyTopNight: "#1A1A40",
  skyBottomNight: "#3E3A6E",
  groundTop: "#8FAE72",
  groundTopNight: "#4B5E45",
  groundSide: "#6C8B54",
  groundSideNight: "#33422E",
  groundStripe: "#7C9C60",
  cloud: "rgba(255,255,255,.75)",
  slingWood: "#8A5A34",
  slingWoodDark: "#6B4423",
  band: "#4F6B45",
  ink: "#2A2820",
};

/* ══════════════════════════════════════════════════════════════════════
   2. ASSETS — cabeças dos noivos (procura imagens existentes; se não achar
      nenhuma, cai num fallback desenhado no canvas — o jogo nunca quebra
      por falta de asset).
   ══════════════════════════════════════════════════════════════════════ */
const HEAD_CANDIDATES = {
  gian:  ["assets/img/gianface01.png", "assets/img/gian-face.png", "assets/img/gianface02.png", "assets/img/gianface03.png"],
  tiago: ["assets/img/tiagoface01.png", "assets/img/tiago-face.png", "assets/img/tiagoface02.png", "assets/img/tiagoface03.png"],
};
const headImages = { gian: null, tiago: null };

function tryLoadSequence(list, idx, key) {
  if (idx >= list.length) return; // esgotou as tentativas -> fica null, usa fallback desenhado
  const img = new Image();
  img.onload = function () { headImages[key] = img; };
  img.onerror = function () { tryLoadSequence(list, idx + 1, key); };
  img.src = list[idx];
}
function loadHeadImages() {
  Object.keys(HEAD_CANDIDATES).forEach(function (key) {
    tryLoadSequence(HEAD_CANDIDATES[key], 0, key);
  });
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

function loadHighScore() {
  try { return Number(localStorage.getItem(CFG.HIGHSCORE_KEY)) || 0; } catch (e) { return 0; }
}
function saveHighScore(v) {
  try { localStorage.setItem(CFG.HIGHSCORE_KEY, String(Math.round(v))); } catch (e) { /* ignora */ }
}

/* ══════════════════════════════════════════════════════════════════════
   5. DEFINIÇÃO DOS NÍVEIS
   Cada fase é um array de configuração (torres de blocos + presentes),
   não código espalhado. B()/G() são atalhos pra deixar isso legível;
   tower()/lvl() montam o objeto final. Adicionar uma fase nova é só
   acrescentar outra chamada lvl(...) na lista LEVELS.
   ══════════════════════════════════════════════════════════════════════ */

/* Bloco de estrutura: kind = material (ver BLOCK_KINDS), w/h em px lógicos,
   dx = deslocamento horizontal opcional dentro da própria torre. */
function B(kind, w, h, dx) { return { kind: kind, w: w, h: h || w, dx: dx || 0 }; }

/* Presente-alvo: tier = resistência/cor (ver GIFT_TIERS), shape = 'box'|'round'|'bag',
   size = 'sm'|'md'|'lg'|'tall'|'wide'. */
function G(tier, shape, size, dx) { return { tier: tier, shape: shape || "box", size: size || "md", dx: dx || 0 }; }

/* Torre: pilha de blocos (de baixo pra cima) + presente opcional no topo.
   base='ground' (padrão) ou um Y absoluto, pra torres "suspensas". */
function tower(x, blocks, topGift, base) {
  return { x: x, blocks: blocks || [], topGift: topGift || null, base: base === undefined ? "ground" : base };
}

/* Presente/bloco avulso, direto no chão (sem torre) — útil pra alvos soltos. */
function standGift(x, tier, shape, size) { return { x: x, tier: tier, shape: shape || "box", size: size || "md" }; }
function standBlock(x, kind, w, h) { return { x: x, kind: kind, w: w, h: h || w }; }

/* "Ponte": uma plataforma fina apoiada em duas estacas finas (tipo uma
   mesinha), com um presente em cima. Diferente da tower() normal (pilha
   sólida), aqui o presente só cai se uma das duas estacas for derrubada —
   dá aquele "empilhado" instável e estratégico que pede pra alguém mirar
   certo, sem depender de arremessar cada bloco com força bruta (basta
   acertar a estaca fina). Como o presente cai NO CHÃO ao lado, não fica
   soterrado embaixo da própria estrutura. */
function bridge(xLeft, xRight, stakeH, gift) {
  return { xLeft: xLeft, xRight: xRight, stakeH: stakeH || 130, gift: gift || null };
}

/* Bomba avulsa, direto no chão (ou dx a partir de uma coordenada). */
function standBomb(x) { return { x: x }; }

/* "Torre de casinhas" — inspirada nas estruturas clássicas de estilingue:
   pilares finos + uma viga formando uma moldura, com o presente NO CHÃO,
   dentro da moldura (não em cima de nada) — dá pra empilhar vários andares,
   cada um com seu presente, criando uma torre alta e frágil. Derrubar um
   pilar de qualquer andar derruba tudo que está acima. */
function frameTower(x, levels, opts) {
  opts = opts || {};
  return {
    x: x,
    width: opts.width || 130,
    legH: opts.legH || 108,
    postW: opts.postW || 18,
    beamH: opts.beamH || 20,
    levels: levels || [],  // array de { gift } (ou {} pra andar vazio, só estrutural), de baixo pra cima
  };
}

/* "Castelo de cartas" — duas estacas apoiadas uma na outra em ângulo,
   formando um "A". Colapsa inteiro com um só acerto em qualquer uma das
   duas pernas. O presente fica no chão, dentro do triângulo formado pelas
   pernas — literalmente "dentro" da estrutura. */
function cardCastle(x, opts) {
  opts = opts || {};
  return {
    x: x,
    legH: opts.legH || 150,
    leanAngle: opts.leanAngle || 0.32,
    gift: opts.gift || null,
  };
}

/* "Barreira" — fileira de estacas finas lado a lado, tipo cerca/paliçada.
   Puramente uma parede a derrubar (ou pular por cima) — o presente que ela
   protege é posicionado à parte, logo atrás, com uma torre/standGift normal. */
function wall(x, count, opts) {
  opts = opts || {};
  return { x: x, count: count || 4, height: opts.height || 130, postW: opts.postW || 22, gap: opts.gap || 5 };
}

function lvl(id, opts) {
  return Object.assign({
    id: id,
    name: "Fase " + id,
    throws: 3,
    difficulty: "normal",
    slingX: 230,
    towers: [],
    bridges: [],
    extraGifts: [],
    extraBlocks: [],
    bombs: [],
    walls: [],
    castles: [],
    frameTowers: [],
    skyVariant: "day",
    zoom: 1,   // <1 = câmera mais longe (tudo menor), >1 = mais perto (tudo maior)
  }, opts);
}

const LEVELS = [
/* ════════════════ Fases 1-3: tutorial ════════════════ */
lvl(1, {
  name: "Primeira Mira", throws: 3, zoom: 1.14,
  towers: [ tower(780, [B("crate", 84)], G("weak", "box", "md")) ],
}),
lvl(2, {
  name: "Dois de Uma Vez", throws: 3, zoom: 1.1,
  towers: [
    tower(760, [B("crate", 78)], G("weak", "box", "sm")),
    tower(960, [B("crate", 78)], G("weak", "round", "sm")),
  ],
}),
lvl(3, {
  name: "Primeira Torre", throws: 3,
  towers: [ tower(820, [B("crate", 84), B("crate", 84)], G("medium", "box", "md")) ],
  extraGifts: [ standGift(1060, "weak", "round", "sm") ],
}),

/* ════════════════ Fases 4-10: variedade inicial ════════════════ */
lvl(4, {
  name: "Salvia a Vista", throws: 3,
  towers: [ tower(820, [B("neutralBox", 88)], G("medium", "box", "md")) ],
  bridges: [ bridge(1080, 1220, 110, G("weak", "round", "sm")) ],
}),
lvl(5, {
  name: "Fileira de Presentes", throws: 4,
  towers: [
    tower(760, [B("crate", 76)], G("weak", "box", "sm")),
    tower(940, [B("crate", 76)], G("weak", "box", "sm")),
    tower(1120, [B("crate", 76)], G("weak", "box", "sm")),
  ],
}),
lvl(6, {
  name: "Tacas ao Alto", throws: 3,
  towers: [
    tower(800, [B("crate", 84)], G("weak", "box", "sm")),
    tower(860, [B("glass", 46)], null),
    tower(1040, [B("suitcase", 100), B("crate", 84)], G("medium", "box", "md")),
    tower(1260, [B("crate", 76)], G("weak", "round", "sm")),
  ],
  bombs: [ standBomb(1160) ],
}),
lvl(7, {
  name: "Garrafas em Fila", throws: 4,
  towers: [
    tower(820, [B("bottle", 54, 118)], null),
    tower(1020, [B("bottle", 54, 118)], null),
  ],
  extraGifts: [ standGift(920, "medium", "box", "md"), standGift(1150, "weak", "round", "sm") ],
}),
lvl(8, {
  name: "Mala Pronta", throws: 3,
  towers: [
    tower(820, [B("suitcase", 100)], G("weak", "box", "md")),
    tower(1080, [B("floral", 50)], null),
  ],
  extraGifts: [ standGift(1010, "weak", "round", "sm") ],
  extraBlocks: [ standBlock(950, "spring", 70, 32) ],
}),
lvl(9, {
  name: "Arranjos e Lacos", throws: 4,
  towers: [
    tower(760, [B("floral", 50)], null),
    tower(950, [B("crate", 84), B("crate", 76)], G("medium", "box", "md")),
    tower(1220, [B("glass", 46)], null),
  ],
  extraGifts: [ standGift(830, "weak", "box", "sm"), standGift(1300, "weak", "round", "sm") ],
}),
lvl(10, {
  name: "A Ponte do Brinde", throws: 4,
  towers: [
    tower(800, [B("crate", 90), B("crate", 84), B("crate", 78)], G("medium", "box", "md")),
    tower(1360, [B("bottle", 52, 116)], null),
  ],
  bridges: [ bridge(1040, 1200, 130, G("strong", "box", "wide")) ],
  extraGifts: [ standGift(1460, "weak", "round", "sm"), standGift(1290, "golden", "round", "md") ],
}),

/* ════════════════ Fases 11-20: pontes, molduras, paredes ════════════════ */
lvl(11, {
  name: "Caixas Neutras", throws: 3,
  towers: [
    tower(800, [B("neutralBox", 84), B("neutralBox", 76)], G("medium", "box", "md")),
    tower(1260, [B("floral", 50)], null),
  ],
  extraGifts: [ standGift(1180, "weak", "box", "sm") ],
}),
lvl(12, {
  name: "Reflexo Dourado", throws: 4,
  towers: [
    tower(800, [B("crate", 84)], G("weak", "box", "sm")),
    tower(860, [B("glass", 46)], null),
    tower(1220, [B("steel", 46, 170)], null),
    tower(1340, [B("bottle", 52, 116)], null),
  ],
  extraGifts: [ standGift(1420, "golden", "round", "md") ],
  bombs: [ standBomb(1150) ],
}),
lvl(13, {
  name: "Placas de Mesa", throws: 4,
  towers: [
    tower(780, [B("crate", 84), B("crate", 76)], G("medium", "box", "md")),
    tower(1000, [B("crate", 80)], G("weak", "round", "sm")),
  ],
  bridges: [ bridge(1180, 1320, 100, G("strong", "box", "wide")) ],
  extraGifts: [ standGift(1460, "special", "round", "md") ],
}),
lvl(14, {
  name: "Torre Terracota", throws: 4,
  towers: [
    tower(800, [B("suitcase", 100), B("suitcase", 90)], G("strong", "box", "md")),
    tower(1100, [B("glass", 46)], null),
    tower(1340, [B("bottle", 52, 116)], null),
  ],
  extraGifts: [ standGift(1180, "weak", "box", "sm"), standGift(1420, "weak", "round", "sm") ],
}),
lvl(15, {
  name: "Salao Cheio", throws: 5,
  towers: [
    tower(760, [B("crate", 80)], G("weak", "box", "sm")),
    tower(940, [B("neutralBox", 84), B("neutralBox", 76)], G("medium", "box", "md")),
    tower(1180, [B("floral", 50)], null),
    tower(1400, [B("bottle", 52, 116)], null),
  ],
  extraGifts: [ standGift(1100, "weak", "round", "sm"), standGift(1480, "weak", "box", "sm") ],
}),
lvl(16, {
  name: "Fileira Dourada", throws: 4,
  towers: [
    tower(800, [B("crate", 84), B("crate", 76)], G("medium", "box", "md")),
    tower(1280, [B("crate", 80), B("crate", 72)], null),
    tower(1210, [B("glass", 46)], null),
  ],
  extraGifts: [ standGift(1280, "golden", "round", "md") ],
  extraBlocks: [ standBlock(1050, "spring", 70, 32) ],
}),
lvl(17, {
  name: "Primeira Casinha", throws: 4,
  frameTowers: [ frameTower(900, [ { gift: G("medium", "box", "md") }, { gift: G("weak", "round", "sm") } ]) ],
  extraGifts: [ standGift(1180, "weak", "box", "sm") ],
}),
lvl(18, {
  name: "Torres Gemeas", throws: 4,
  towers: [
    tower(800, [B("bottle", 52, 116)], null),
    tower(870, [B("bottle", 46, 100)], null),
    tower(1260, [B("crate", 84), B("crate", 76)], G("strong", "box", "md")),
  ],
  extraGifts: [ standGift(940, "weak", "round", "sm"), standGift(1380, "weak", "box", "sm") ],
}),
lvl(19, {
  name: "Quase La", throws: 4,
  towers: [
    tower(780, [B("crate", 84), B("crate", 76)], G("medium", "box", "md")),
    tower(1000, [B("floral", 50)], null),
    tower(1180, [B("steel", 46, 160)], null),
    tower(1300, [B("bottle", 52, 116)], null),
  ],
  bombs: [ standBomb(1120) ],
  extraGifts: [ standGift(1080, "weak", "round", "sm"), standGift(1420, "golden", "round", "md"), standGift(1550, "special", "round", "sm") ],
}),
lvl(20, {
  name: "Primeiro Grande Desafio", throws: 5,
  towers: [
    tower(760, [B("crate", 84), B("crate", 76)], G("medium", "box", "md")),
    tower(980, [B("neutralBox", 84)], G("strong", "box", "md")),
    tower(1220, [B("bottle", 52, 116)], null),
    tower(1360, [B("steel", 48, 180)], null),
  ],
  bridges: [ bridge(1450, 1560, 120, G("special", "round", "md")) ],
  bombs: [ standBomb(1290) ],
  extraGifts: [ standGift(1120, "weak", "round", "sm") ],
}),

/* ════════════════ Fases 21-30: castelos, molduras, variacao de zoom/noite ════════════════ */
lvl(21, {
  name: "Castelo de Cartas", throws: 4,
  castles: [ cardCastle(900, { legH: 150, leanAngle: 0.32, gift: G("medium", "box", "md") }) ],
  towers: [ tower(1180, [B("crate", 80), B("crate", 72)], G("weak", "box", "sm")) ],
  extraGifts: [ standGift(1050, "weak", "round", "sm") ],
}),
lvl(22, {
  name: "Atras da Paliçada", throws: 4, zoom: 0.86,
  walls: [ wall(950, 4, { height: 130 }) ],
  towers: [ tower(1160, [B("crate", 84), B("crate", 76)], G("strong", "box", "md")) ],
  extraGifts: [ standGift(1300, "weak", "round", "sm") ],
}),
lvl(23, {
  name: "Sobrado de Presentes", throws: 5,
  frameTowers: [ frameTower(900, [
    { gift: G("medium", "box", "md") },
    { gift: G("weak", "round", "sm") },
    { gift: G("golden", "box", "md") },
  ], { legH: 100 }) ],
  extraGifts: [ standGift(1200, "weak", "box", "sm") ],
}),
lvl(24, {
  name: "Ceia sob as Estrelas", throws: 4, skyVariant: "night",
  towers: [
    tower(800, [B("crate", 84), B("crate", 76)], G("medium", "box", "md")),
    tower(1160, [B("steel", 46, 160)], null),
    tower(1280, [B("bottle", 52, 116)], null),
  ],
  bombs: [ standBomb(1220) ],
  extraGifts: [ standGift(1400, "golden", "round", "md") ],
}),
lvl(25, {
  name: "Dois Castelos", throws: 5,
  castles: [
    cardCastle(860, { legH: 140, leanAngle: 0.3, gift: G("weak", "box", "sm") }),
    cardCastle(1180, { legH: 150, leanAngle: 0.32, gift: G("strong", "box", "md") }),
  ],
  extraGifts: [ standGift(1020, "weak", "round", "sm") ],
}),
lvl(26, {
  name: "Ponte Alta", throws: 4, zoom: 1.12,
  towers: [ tower(780, [B("crate", 84), B("crate", 76)], G("medium", "box", "md")) ],
  bridges: [ bridge(1020, 1160, 150, G("strong", "box", "wide")) ],
  frameTowers: [ frameTower(1360, [ { gift: G("weak", "round", "sm") } ], { legH: 100 }) ],
}),
lvl(27, {
  name: "Impulso de Mola", throws: 4,
  towers: [
    tower(820, [B("crate", 84)], G("weak", "box", "sm")),
    tower(1240, [B("floral", 50)], null),
  ],
  extraBlocks: [ standBlock(1020, "spring", 74, 34) ],
  extraGifts: [ standGift(1140, "medium", "box", "md"), standGift(1340, "weak", "round", "sm") ],
}),
lvl(28, {
  name: "Corredor de Aco", throws: 5,
  towers: [
    tower(880, [B("steel", 46, 170)], null),
    tower(1000, [B("steel", 46, 170)], null),
  ],
  bombs: [ standBomb(940) ],
  extraGifts: [ standGift(1160, "golden", "round", "md"), standGift(1320, "weak", "box", "sm") ],
}),
lvl(29, {
  name: "Vila de Casinhas", throws: 5,
  frameTowers: [
    frameTower(820, [ { gift: G("weak", "box", "sm") }, { gift: G("medium", "round", "md") } ], { legH: 96 }),
    frameTower(1180, [ { gift: G("weak", "round", "sm") } ], { legH: 100 }),
  ],
  extraGifts: [ standGift(1400, "strong", "box", "md") ],
}),
lvl(30, {
  name: "Marco de Trinta", throws: 6,
  towers: [
    tower(760, [B("crate", 84), B("crate", 76)], G("medium", "box", "md")),
    tower(1000, [B("suitcase", 96)], G("strong", "box", "md")),
    tower(1220, [B("bottle", 52, 116)], null),
  ],
  castles: [ cardCastle(1420, { legH: 150, leanAngle: 0.3, gift: G("golden", "box", "md") }) ],
  bombs: [ standBomb(1130) ],
  extraGifts: [ standGift(1300, "weak", "round", "sm") ],
}),

/* ════════════════ Fases 31-40: mais dificeis, combinacoes ════════════════ */
lvl(31, {
  name: "Fortim de Estacas", throws: 4, zoom: 0.88,
  walls: [ wall(880, 5, { height: 140 }) ],
  towers: [ tower(1180, [B("crate", 84), B("crate", 76)], G("strong", "box", "md")) ],
  bombs: [ standBomb(1000) ],
  extraGifts: [ standGift(1320, "weak", "round", "sm") ],
}),
lvl(32, {
  name: "Torre de Tres Andares", throws: 5,
  frameTowers: [ frameTower(950, [
    { gift: G("weak", "box", "sm") },
    { gift: G("medium", "round", "md") },
    { gift: G("golden", "box", "md") },
  ], { legH: 96 }) ],
  extraGifts: [ standGift(1260, "weak", "round", "sm") ],
}),
lvl(33, {
  name: "Noite de Aco", throws: 5, skyVariant: "night",
  towers: [
    tower(820, [B("steel", 46, 170)], null),
    tower(1040, [B("crate", 84), B("crate", 76)], G("strong", "box", "md")),
    tower(1300, [B("bottle", 52, 116)], null),
  ],
  bombs: [ standBomb(940) ],
  extraGifts: [ standGift(1400, "golden", "round", "md") ],
}),
lvl(34, {
  name: "Castelo Duplo e Ponte", throws: 5,
  castles: [ cardCastle(880, { legH: 150, leanAngle: 0.32, gift: G("medium", "box", "md") }) ],
  bridges: [ bridge(1120, 1260, 130, G("strong", "box", "wide")) ],
  extraGifts: [ standGift(1400, "weak", "round", "sm") ],
}),
lvl(35, {
  name: "Vista de Longe", throws: 5, zoom: 0.82,
  towers: [
    tower(760, [B("crate", 84)], G("weak", "box", "sm")),
    tower(980, [B("suitcase", 96), B("crate", 80)], G("strong", "box", "md")),
    tower(1240, [B("floral", 50)], null),
    tower(1420, [B("steel", 46, 160)], null),
  ],
  bombs: [ standBomb(1330) ],
  extraGifts: [ standGift(1550, "golden", "round", "md") ],
}),
lvl(36, {
  name: "Paliçada Dourada", throws: 4,
  walls: [ wall(900, 4, { height: 150 }) ],
  frameTowers: [ frameTower(1220, [ { gift: G("golden", "box", "md") } ], { legH: 100 }) ],
  extraBlocks: [ standBlock(1050, "spring", 74, 34) ],
}),
lvl(37, {
  name: "Aproximacao Total", throws: 5, zoom: 1.16,
  towers: [
    tower(780, [B("crate", 84), B("crate", 76)], G("medium", "box", "md")),
    tower(1020, [B("bottle", 52, 116)], null),
  ],
  castles: [ cardCastle(1240, { legH: 150, leanAngle: 0.3, gift: G("strong", "box", "md") }) ],
  extraGifts: [ standGift(1100, "weak", "round", "sm") ],
}),
lvl(38, {
  name: "Ceia Especial", throws: 5, skyVariant: "night",
  frameTowers: [ frameTower(880, [
    { gift: G("medium", "box", "md") },
    { gift: G("special", "round", "md") },
  ], { legH: 100 }) ],
  towers: [ tower(1220, [B("steel", 46, 160)], null) ],
  bombs: [ standBomb(1160) ],
  extraGifts: [ standGift(1360, "golden", "round", "md") ],
}),
lvl(39, {
  name: "Labirinto de Aco", throws: 6,
  towers: [
    tower(820, [B("steel", 46, 160)], null),
    tower(960, [B("steel", 46, 160)], null),
    tower(1180, [B("crate", 84), B("crate", 76)], G("strong", "box", "md")),
  ],
  bombs: [ standBomb(890), standBomb(1030) ],
  extraGifts: [ standGift(1350, "golden", "round", "md") ],
}),
lvl(40, {
  name: "Marco de Quarenta", throws: 6,
  castles: [
    cardCastle(820, { legH: 150, leanAngle: 0.3, gift: G("medium", "box", "md") }),
    cardCastle(1140, { legH: 150, leanAngle: 0.32, gift: G("strong", "box", "md") }),
  ],
  frameTowers: [ frameTower(1420, [ { gift: G("golden", "box", "md") } ], { legH: 100 }) ],
  bombs: [ standBomb(990) ],
  extraGifts: [ standGift(1550, "special", "round", "sm") ],
}),

/* ════════════════ Fases 41-50: fortalezas finais ════════════════ */
lvl(41, {
  name: "Fortaleza I", throws: 5, zoom: 0.9,
  walls: [ wall(820, 5, { height: 150 }) ],
  frameTowers: [ frameTower(1140, [ { gift: G("medium", "box", "md") }, { gift: G("weak", "round", "sm") } ], { legH: 96 }) ],
  bombs: [ standBomb(980) ],
  extraGifts: [ standGift(1380, "golden", "round", "md") ],
}),
lvl(42, {
  name: "Noite na Paliçada", throws: 5, skyVariant: "night",
  walls: [ wall(880, 5, { height: 150 }) ],
  towers: [ tower(1180, [B("steel", 46, 170)], null) ],
  extraGifts: [ standGift(1050, "strong", "box", "md"), standGift(1330, "golden", "round", "md") ],
  bombs: [ standBomb(1220) ],
}),
lvl(43, {
  name: "Torre Suspensa", throws: 5,
  bridges: [ bridge(820, 960, 160, G("strong", "box", "wide")) ],
  castles: [ cardCastle(1220, { legH: 155, leanAngle: 0.3, gift: G("medium", "box", "md") }) ],
  extraGifts: [ standGift(1400, "weak", "round", "sm") ],
}),
lvl(44, {
  name: "Alcance Extremo", throws: 5, zoom: 0.84,
  towers: [
    tower(800, [B("crate", 84), B("crate", 76)], G("medium", "box", "md")),
    tower(1080, [B("bottle", 52, 116)], null),
    tower(1360, [B("steel", 46, 170)], null),
  ],
  bombs: [ standBomb(1260) ],
  extraGifts: [ standGift(1500, "golden", "round", "md"), standGift(1620, "special", "round", "sm") ],
}),
lvl(45, {
  name: "Vila Fortificada", throws: 6,
  frameTowers: [
    frameTower(820, [ { gift: G("weak", "box", "sm") }, { gift: G("medium", "round", "md") } ], { legH: 96 }),
    frameTower(1160, [ { gift: G("strong", "box", "md") }, { gift: G("golden", "box", "md") } ], { legH: 96 }),
  ],
  extraGifts: [ standGift(1420, "weak", "round", "sm") ],
}),
lvl(46, {
  name: "Noite de Castelos", throws: 6, skyVariant: "night",
  castles: [
    cardCastle(840, { legH: 150, leanAngle: 0.3, gift: G("medium", "box", "md") }),
    cardCastle(1160, { legH: 150, leanAngle: 0.32, gift: G("golden", "box", "md") }),
  ],
  bombs: [ standBomb(1000) ],
  extraGifts: [ standGift(1380, "special", "round", "md") ],
}),
lvl(47, {
  name: "Corredor Final", throws: 6,
  walls: [ wall(820, 5, { height: 150 }) ],
  towers: [
    tower(1080, [B("steel", 46, 170)], null),
    tower(1200, [B("crate", 84), B("crate", 76)], G("strong", "box", "md")),
  ],
  bombs: [ standBomb(1140) ],
  extraGifts: [ standGift(1360, "golden", "round", "md"), standGift(1500, "special", "round", "sm") ],
}),
lvl(48, {
  name: "Vista Distante", throws: 6, zoom: 0.8,
  frameTowers: [ frameTower(860, [ { gift: G("medium", "box", "md") }, { gift: G("strong", "round", "md") } ], { legH: 96 }) ],
  castles: [ cardCastle(1180, { legH: 155, leanAngle: 0.3, gift: G("golden", "box", "md") }) ],
  bombs: [ standBomb(1020) ],
  extraGifts: [ standGift(1420, "special", "round", "sm") ],
}),
lvl(49, {
  name: "Penultima Prova", throws: 6, skyVariant: "sunset",
  walls: [ wall(800, 5, { height: 155 }) ],
  frameTowers: [ frameTower(1120, [ { gift: G("strong", "box", "md") }, { gift: G("golden", "box", "md") } ], { legH: 96 }) ],
  bombs: [ standBomb(960), standBomb(1260) ],
  extraGifts: [ standGift(1420, "special", "round", "sm") ],
}),
lvl(50, {
  name: "A Grande Celebracao", throws: 7, skyVariant: "night",
  walls: [ wall(800, 5, { height: 150 }) ],
  frameTowers: [ frameTower(1080, [
    { gift: G("medium", "box", "md") },
    { gift: G("strong", "round", "md") },
    { gift: G("golden", "box", "md") },
  ], { legH: 92 }) ],
  castles: [ cardCastle(1380, { legH: 155, leanAngle: 0.3, gift: G("special", "round", "md") }) ],
  bombs: [ standBomb(940), standBomb(1250) ],
  extraGifts: [ standGift(1550, "special", "round", "sm") ],
}),
];

/* Materiais dos blocos de estrutura — cor, física e rótulo (usado em comentários/labels). */
/* Densidade/atrito recalibrados testando de verdade no Matter.js: os valores
   antigos (bem mais altos) deixavam os blocos "pesados demais" — nem um
   arremesso em força máxima conseguia tombar uma caixa sozinha. Testado até
   um acerto de força média já deslocar/tombar satisfatoriamente, e um de
   força máxima jogar tudo longe. */
const BLOCK_KINDS = {
  crate:      { shape: "rect",   color: "#D8C39A", accent: "#A9895A", density: 0.0004,  friction: 0.42, restitution: 0.05 },
  suitcase:   { shape: "rect",   color: "#C46D28", accent: "#8A4A18", density: 0.00038, friction: 0.4,  restitution: 0.05 },
  plaque:     { shape: "rect",   color: "#F1EAD9", accent: "#C9A268", density: 0.0003,  friction: 0.38, restitution: 0.05 },
  neutralBox: { shape: "rect",   color: "#EDE6D6", accent: "#C9BB9C", density: 0.00033, friction: 0.4,  restitution: 0.05 },
  bottle:     { shape: "circle", color: "#3E5B3E", accent: "#22331C", density: 0.0003,  friction: 0.3,  restitution: 0.2  },
  glass:      { shape: "circle", color: "#CFE9F2", accent: "#8FC4D6", density: 0.0002,  friction: 0.28, restitution: 0.24 },
  floral:     { shape: "circle", color: "#9FB98F", accent: "#5F7A52", density: 0.00023, friction: 0.4,  restitution: 0.06 },
  /* Estaca fina — bem leve, cai/voa fácil. Serve de apoio frágil pra
     plataformas (ver bridge()/tower "empilhada"): derrubar a estaca faz a
     plataforma (e o presente em cima) desabar por gravidade, sem precisar
     de um impacto direto nela — o "prazer de derrubar" vem da reação em
     cadeia, não de arremessar cada bloco na força bruta. */
  stake:      { shape: "rect",   color: "#B98A54", accent: "#7A5230", density: 0.00016, friction: 0.3,  restitution: 0.04 },
  /* Aço — obstáculo "que atrapalha": bem mais pesado e resistente que o
     resto, quase não se move nem com arremesso em força máxima. Não é alvo,
     é parede estratégica de verdade. */
  steel:      { shape: "rect",   color: "#9AA3AC", accent: "#5C646C", density: 0.0026,  friction: 0.55, restitution: 0.02 },
  /* Mola — objeto "que ajuda": restituição bem alta, arremessa de volta o
     que bater nela (inclusive a própria cabeça arremessada), útil pra
     saltar por cima de um obstáculo e alcançar um presente escondido atrás. */
  spring:     { shape: "rect",   color: "#7A9B6E", accent: "#3F5636", density: 0.0009,  friction: 0.3,  restitution: 1.55 },
};

/* Presentes-alvo por resistência: cor, pontos e HP (nº de impactos pra destruir). */
const GIFT_TIERS = {
  weak:    { color: "#F1EAD9", accent: "#C9A268", ribbon: "#C46D28", hp: 1, points: CFG.POINTS.weak },
  medium:  { color: "#9FB98F", accent: "#4F6B45", ribbon: "#F1EAD9", hp: 2, points: CFG.POINTS.medium },
  strong:  { color: "#C46D28", accent: "#8A4A18", ribbon: "#F1EAD9", hp: 3, points: CFG.POINTS.strong },
  golden:  { color: "#D9B25C", accent: "#8C6A24", ribbon: "#fff",    hp: 4, points: CFG.POINTS.golden },
  special: { color: "#D9A9C4", accent: "#9C6683", ribbon: "#fff",    hp: 2, points: CFG.POINTS.special },
};

const GIFT_SIZE_PX = {
  sm:   { w: 46,  h: 46  },
  md:   { w: 64,  h: 64  },
  lg:   { w: 88,  h: 88  },
  tall: { w: 56,  h: 100 },
  wide: { w: 108, h: 62  },
};

/* ══════════════════════════════════════════════════════════════════════
   3. SETUP DO MATTER.JS
   ══════════════════════════════════════════════════════════════════════ */
const Engine = Matter.Engine, World = Matter.World, Bodies = Matter.Bodies,
      Body = Matter.Body, Events = Matter.Events;

const engine = Engine.create();
engine.world.gravity.y = CFG.GRAVITY_Y;
engine.positionIterations = 8;
engine.velocityIterations = 8;

let groundBody = null;
let leftWallBody = null;
let rightWallBody = null;
let activeBlocks = [];   // corpos de estrutura da fase atual
let activeGifts = [];    // corpos de presente da fase atual
let activeBombs = [];    // bombas ainda não explodidas da fase atual
let restBodies = [];     // projéteis já assentados (viram parte do cenário)
let currentWorldWidth = CFG.VIEW_W;

function clearLevelBodies() {
  activeBlocks.concat(activeGifts, activeBombs, restBodies).forEach(function (b) { World.remove(engine.world, b); });
  activeBlocks = [];
  activeGifts = [];
  activeBombs = [];
  restBodies = [];
}

function setupStaticBounds(worldWidth) {
  if (groundBody) World.remove(engine.world, groundBody);
  if (leftWallBody) World.remove(engine.world, leftWallBody);
  if (rightWallBody) World.remove(engine.world, rightWallBody);

  const groundY = CFG.VIEW_H - CFG.GROUND_H;
  groundBody = Bodies.rectangle(worldWidth / 2, groundY + CFG.GROUND_H / 2 + 40, worldWidth + 800, CFG.GROUND_H + 80, {
    isStatic: true, friction: 0.9, label: "wgl-ground",
  });
  /* Paredes invisíveis bem além das bordas jogáveis — impedem que qualquer
     coisa role infinitamente pros lados (limite invisível do mundo). */
  leftWallBody = Bodies.rectangle(-140, CFG.VIEW_H / 2, 80, CFG.VIEW_H * 4, { isStatic: true, label: "wgl-wall" });
  rightWallBody = Bodies.rectangle(worldWidth + 140, CFG.VIEW_H / 2, 80, CFG.VIEW_H * 4, { isStatic: true, label: "wgl-wall" });
  World.add(engine.world, [groundBody, leftWallBody, rightWallBody]);
}

/* ══════════════════════════════════════════════════════════════════════
   6. CRIAÇÃO DE CORPOS FÍSICOS
   ══════════════════════════════════════════════════════════════════════ */
function createBlockBody(x, y, spec) {
  const mat = BLOCK_KINDS[spec.kind];
  let body;
  if (mat.shape === "circle") {
    const r = spec.w / 2;
    body = Bodies.circle(x, y, r, { density: mat.density, friction: mat.friction, restitution: mat.restitution, frictionAir: 0.0006 });
  } else {
    body = Bodies.rectangle(x, y, spec.w, spec.h, { density: mat.density, friction: mat.friction, restitution: mat.restitution, frictionAir: 0.0006 });
  }
  if (spec.angle) Body.setAngle(body, spec.angle);
  body.label = "wgl-block";
  body.wglBlock = {
    kind: spec.kind, w: spec.w, h: spec.h || spec.w,
    initialAngle: body.angle, fallen: false,
  };
  return body;
}

function createGiftBody(x, y, spec) {
  const tier = GIFT_TIERS[spec.tier];
  const dims = GIFT_SIZE_PX[spec.size || "md"];
  let body;
  // densidade baixa (recalibrada junto com os blocos) — presentes também
  // devem sacudir/rolar de forma satisfatória quando levam um impacto que
  // ainda não os destrói (tiers com hp>1).
  if (spec.shape === "round") {
    body = Bodies.circle(x, y, dims.w / 2, { density: 0.00035, friction: 0.45, restitution: 0.14, frictionAir: 0.0006 });
  } else {
    body = Bodies.rectangle(x, y, dims.w, dims.h, { density: 0.00035, friction: 0.45, restitution: 0.12, frictionAir: 0.0006 });
  }
  body.label = "wgl-gift";
  body.wglGift = {
    tier: spec.tier, shape: spec.shape, size: spec.size || "md",
    hp: tier.hp, maxHp: tier.hp, points: tier.points,
    destroyed: false, lastHitAt: 0,
    w: dims.w, h: spec.shape === "round" ? dims.w : dims.h,
  };
  return body;
}

/* Bomba: leve o bastante pra ser empurrada fácil, mas com massa suficiente
   pra também empurrar vizinhos quando ela mesma é arremessada contra algo. */
function createBombBody(x, y) {
  const body = Bodies.circle(x, y, CFG.BOMB_RADIUS, { density: 0.0011, friction: 0.5, restitution: 0.15, frictionAir: 0.0006 });
  body.label = "wgl-bomb";
  body.wglBomb = { exploded: false };
  return body;
}

/* Constrói (ou reconstrói, ao repetir uma fase) os corpos de uma fase a
   partir da configuração declarativa em LEVELS. */
const STAKE_W = 20;
const PLATFORM_H = 22;

function buildLevelBodies(level) {
  const groundY = CFG.VIEW_H - CFG.GROUND_H;
  const blocks = [];
  const gifts = [];
  const bombs = [];

  (level.towers || []).forEach(function (t) {
    let topY = t.base === "ground" ? groundY : t.base;
    (t.blocks || []).forEach(function (spec) {
      const h = spec.h || spec.w;
      const cy = topY - h / 2;
      blocks.push(createBlockBody(t.x + (spec.dx || 0), cy, spec));
      topY -= h;
    });
    if (t.topGift) {
      const dims = GIFT_SIZE_PX[t.topGift.size || "md"];
      const gh = t.topGift.shape === "round" ? dims.w : dims.h;
      const cy = topY - gh / 2;
      gifts.push(createGiftBody(t.x + (t.topGift.dx || 0), cy, t.topGift));
    }
  });

  /* "Ponte": plataforma fina apoiada em duas estacas — ver bridge() pra a
     explicação de design. Derrubar UMA estaca já derruba a plataforma (e o
     presente) por gravidade, sem precisar de impacto direto nela. */
  (level.bridges || []).forEach(function (br) {
    const stakeSpec = { kind: "stake", w: STAKE_W, h: br.stakeH };
    blocks.push(createBlockBody(br.xLeft, groundY - br.stakeH / 2, stakeSpec));
    blocks.push(createBlockBody(br.xRight, groundY - br.stakeH / 2, stakeSpec));

    const platformCenterX = (br.xLeft + br.xRight) / 2;
    const platformW = (br.xRight - br.xLeft) + STAKE_W * 1.6;
    const platformTopY = groundY - br.stakeH; // altura do topo das estacas
    const platformCy = platformTopY - PLATFORM_H / 2;
    blocks.push(createBlockBody(platformCenterX, platformCy, { kind: "plaque", w: platformW, h: PLATFORM_H }));

    if (br.gift) {
      const dims = GIFT_SIZE_PX[br.gift.size || "md"];
      const gh = br.gift.shape === "round" ? dims.w : dims.h;
      const giftCy = platformTopY - PLATFORM_H - gh / 2;
      gifts.push(createGiftBody(platformCenterX + (br.gift.dx || 0), giftCy, br.gift));
    }
  });

  (level.extraGifts || []).forEach(function (spec) {
    const dims = GIFT_SIZE_PX[spec.size || "md"];
    const gh = spec.shape === "round" ? dims.w : dims.h;
    gifts.push(createGiftBody(spec.x, groundY - gh / 2, spec));
  });

  (level.extraBlocks || []).forEach(function (spec) {
    const h = spec.h || spec.w;
    blocks.push(createBlockBody(spec.x, groundY - h / 2, spec));
  });

  (level.bombs || []).forEach(function (spec) {
    bombs.push(createBombBody(spec.x, groundY - CFG.BOMB_RADIUS - (spec.dy || 0)));
  });

  /* "Torre de casinhas" — andares empilhados de moldura (2 pilares + viga),
     com o presente NO CHÃO de cada andar, dentro da moldura (nunca em cima
     de nada) — ver frameTower(). */
  (level.frameTowers || []).forEach(function (ft) {
    let baseY = groundY;
    (ft.levels || []).forEach(function (spec) {
      const leftX = ft.x - ft.width / 2, rightX = ft.x + ft.width / 2;
      const postSpec = { kind: "stake", w: ft.postW, h: ft.legH };
      blocks.push(createBlockBody(leftX, baseY - ft.legH / 2, postSpec));
      blocks.push(createBlockBody(rightX, baseY - ft.legH / 2, postSpec));
      const beamW = ft.width + ft.postW * 1.6;
      const beamY = baseY - ft.legH - ft.beamH / 2;
      blocks.push(createBlockBody(ft.x, beamY, { kind: "plaque", w: beamW, h: ft.beamH }));
      if (spec.gift) {
        const dims = GIFT_SIZE_PX[spec.gift.size || "md"];
        const gh = spec.gift.shape === "round" ? dims.w : dims.h;
        const giftCy = baseY - gh / 2 - 1;
        gifts.push(createGiftBody(ft.x + (spec.gift.dx || 0), giftCy, spec.gift));
      }
      baseY -= (ft.legH + ft.beamH);
    });
  });

  /* "Castelo de cartas" — duas estacas em "A", presente no chão entre elas.
     Ver cardCastle() pra a matemática do ângulo/posição. */
  (level.castles || []).forEach(function (c) {
    const spread = 2 * c.legH * Math.sin(c.leanAngle);
    const leftBaseX = c.x - spread / 2, rightBaseX = c.x + spread / 2;
    const leftCx = leftBaseX + (c.legH / 2) * Math.sin(c.leanAngle);
    const leftCy = groundY - (c.legH / 2) * Math.cos(c.leanAngle);
    const rightCx = rightBaseX - (c.legH / 2) * Math.sin(c.leanAngle);
    const rightCy = groundY - (c.legH / 2) * Math.cos(c.leanAngle);
    blocks.push(createBlockBody(leftCx, leftCy, { kind: "stake", w: STAKE_W, h: c.legH, angle: c.leanAngle }));
    blocks.push(createBlockBody(rightCx, rightCy, { kind: "stake", w: STAKE_W, h: c.legH, angle: -c.leanAngle }));
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
      const px = startX + i * (w.postW + w.gap);
      blocks.push(createBlockBody(px, groundY - w.height / 2, { kind: "stake", w: w.postW, h: w.height }));
    }
  });

  return { blocks: blocks, gifts: gifts, bombs: bombs };
}

/* Calcula a largura de mundo necessária pra fase (conteúdo mais folga),
   nunca menor que a largura do viewport. */
function computeWorldWidth(level) {
  let maxX = CFG.VIEW_W - 260;
  (level.towers || []).forEach(function (t) { maxX = Math.max(maxX, t.x); });
  (level.bridges || []).forEach(function (b) { maxX = Math.max(maxX, b.xRight); });
  (level.extraGifts || []).forEach(function (s) { maxX = Math.max(maxX, s.x); });
  (level.extraBlocks || []).forEach(function (s) { maxX = Math.max(maxX, s.x); });
  (level.bombs || []).forEach(function (s) { maxX = Math.max(maxX, s.x); });
  (level.frameTowers || []).forEach(function (ft) { maxX = Math.max(maxX, ft.x + ft.width / 2); });
  (level.castles || []).forEach(function (c) { maxX = Math.max(maxX, c.x + c.legH * Math.sin(c.leanAngle)); });
  (level.walls || []).forEach(function (w) { maxX = Math.max(maxX, w.x + (w.count * w.postW) / 2); });
  return Math.max(CFG.VIEW_W, maxX + 340);
}

function loadLevelIntoWorld(level) {
  clearLevelBodies();
  currentWorldWidth = computeWorldWidth(level);
  setupStaticBounds(currentWorldWidth);
  const built = buildLevelBodies(level);
  activeBlocks = built.blocks;
  activeGifts = built.gifts;
  activeBombs = built.bombs;
  World.add(engine.world, activeBlocks.concat(activeGifts, activeBombs));
}

/* ══════════════════════════════════════════════════════════════════════
   9. ÁUDIO SINTETIZADO (Web Audio API — sem arquivos externos)
   ══════════════════════════════════════════════════════════════════════ */
let actx = null;
function ensureAudio() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} }
  return actx;
}
function tone(freq, dur, type, vol, delay, glideTo) {
  const ctx = ensureAudio(); if (!ctx) return;
  try {
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol || 0.15, t0 + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.06);
  } catch (e) {}
}
function noiseBurst(dur, vol, delay) {
  const ctx = ensureAudio(); if (!ctx) return;
  try {
    const size = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + (delay || 0);
    gain.gain.setValueAtTime(vol || 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(gain); gain.connect(ctx.destination);
    src.start(t0);
  } catch (e) {}
}
const SFX = {
  pull: function () { tone(190, 0.1, "sine", 0.07, 0, 260); },
  release: function () { tone(300, 0.16, "triangle", 0.16, 0, 700); },
  impact: function () { noiseBurst(0.1, 0.18); tone(110, 0.08, "sine", 0.09); },
  blockFall: function () { noiseBurst(0.08, 0.1); },
  giftBreak: function () { noiseBurst(0.16, 0.2); tone(660, 0.2, "square", 0.1, 0, 1100); tone(440, 0.16, "sine", 0.09, 0.04); },
  explosion: function () { noiseBurst(0.34, 0.32); tone(85, 0.32, "sine", 0.22, 0, 40); tone(180, 0.14, "sawtooth", 0.12, 0.02, 60); },
  combo: function (n) { tone(760 + n * 60, 0.14, "sine", 0.13); },
  levelComplete: function () { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(f, 0.24, "triangle", 0.15, i * 0.1); }); },
  fail: function () { tone(320, 0.22, "sawtooth", 0.12, 0, 180); },
  gameOver: function () { tone(280, 0.5, "sawtooth", 0.14, 0, 90); },
};

/* ══════════════════════════════════════════════════════════════════════
   10. HAPTICS
   ══════════════════════════════════════════════════════════════════════ */
function vibrate(pattern) {
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
}

/* ══════════════════════════════════════════════════════════════════════
   11. PARTÍCULAS / CONFETE / TEXTOS FLUTUANTES
   ══════════════════════════════════════════════════════════════════════ */
let particles = [];
let floatingTexts = [];
const CONFETTI_COLORS = ["#C46D28", "#7A9B6E", "#D9B25C", "#D9A9C4", "#F1EAD9", "#4F6B45"];

function spawnConfetti(x, y, count) {
  for (let i = 0; i < (count || 18); i++) {
    particles.push({
      x: x, y: y,
      vx: rand(-4.5, 4.5), vy: rand(-7.5, -2),
      life: 900, maxLife: rand(700, 1100),
      size: rand(5, 10), color: choose(CONFETTI_COLORS),
      rot: rand(0, Math.PI * 2), vrot: rand(-0.2, 0.2),
      kind: "confetti",
    });
  }
}
function spawnPaperBits(x, y, count) {
  for (let i = 0; i < (count || 10); i++) {
    particles.push({
      x: x, y: y,
      vx: rand(-3, 3), vy: rand(-4, -0.5),
      life: 650, maxLife: rand(500, 750),
      size: rand(3, 6), color: "#F1EAD9",
      rot: rand(0, Math.PI * 2), vrot: rand(-0.3, 0.3),
      kind: "paper",
    });
  }
}
function spawnFloatingText(x, y, text, color, big) {
  floatingTexts.push({ x: x, y: y, text: text, color: color || PALETTE.ink, life: 1000, maxLife: 1000, vy: -0.6, big: !!big });
}
function updateParticles(dt) {
  particles = particles.filter(function (p) {
    p.life -= dt;
    if (p.life <= 0) return false;
    p.x += p.vx * (dt / 16.7);
    p.y += p.vy * (dt / 16.7);
    p.vy += 0.16 * (dt / 16.7); // gravidade leve pro confete cair
    p.rot += p.vrot * (dt / 16.7);
    return true;
  });
  floatingTexts = floatingTexts.filter(function (t) {
    t.life -= dt;
    t.y += t.vy * (dt / 16.7);
    return t.life > 0;
  });
}

/* ══════════════════════════════════════════════════════════════════════
   13. PONTUAÇÃO / COMBO
   ══════════════════════════════════════════════════════════════════════ */
const Score = {
  total: 0,
  levelPoints: 0,
  comboCount: 0,
  lastGiftAt: 0,
  add: function (n) { this.total += n; this.levelPoints += n; if (this.total < 0) this.total = 0; },
  resetLevel: function () { this.levelPoints = 0; this.comboCount = 0; this.lastGiftAt = 0; },
};

function registerGiftDestroyed(body, worldX, worldY) {
  const g = body.wglGift;
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

  spawnConfetti(worldX, worldY, 22);
  spawnPaperBits(worldX, worldY, 12);
  spawnFloatingText(worldX, worldY - 20, "+" + fmtNum(pts), PALETTE.ink, true);
  if (mult > 1) {
    spawnFloatingText(worldX, worldY - 46, "combo!", "#C46D28", true);
    SFX.combo(Score.comboCount);
  }
  SFX.giftBreak();
  vibrate([12, 24, 12]);

  World.remove(engine.world, body);
  activeGifts = activeGifts.filter(function (b) { return b !== body; });
  // O presente destruído some de vez (não vira "entulho" como os projéteis) —
  // já soltamos confete/partículas no lugar dele acima.
}

function registerBlockFall(body) {
  body.wglBlock.fallen = true;
  const pts = randInt(CFG.POINTS.blockMin, CFG.POINTS.blockMax);
  Score.add(pts);
  Game.stats.blocksFallen++;
  spawnPaperBits(body.position.x, body.position.y, 6);
  SFX.blockFall();
}

/* Explode uma bomba: empurra tudo num raio (blocos, presentes, o projétil
   em voo, outras bombas — que detonam em cadeia com um pequeno atraso — e
   até as cabeças já assentadas), e destrói na hora qualquer presente bem
   no centro da explosão. É o objeto que "ajuda" (limpa uma estrutura
   inteira de uma vez) mas também pode "atrapalhar" a mira se detonar perto
   demais da bola em voo, empurrando ela pra outro lugar. */
function explodeBomb(bomb) {
  if (bomb.wglBomb.exploded) return;
  bomb.wglBomb.exploded = true;
  const cx = bomb.position.x, cy = bomb.position.y;

  World.remove(engine.world, bomb);
  activeBombs = activeBombs.filter(function (b) { return b !== bomb; });

  Score.add(CFG.BOMB_POINTS);
  Game.stats.bombsDetonated++;
  spawnConfetti(cx, cy, 30);
  spawnPaperBits(cx, cy, 18);
  spawnFloatingText(cx, cy - 24, "BUM!", "#C46D28", true);
  SFX.explosion();
  vibrate([25, 40, 25, 60]);
  Camera.shakeUntil = performance.now() + 260;

  const affected = activeBlocks.concat(
    activeGifts,
    activeBombs,
    restBodies,
    Game.currentProjectile ? [Game.currentProjectile] : []
  );
  affected.forEach(function (b) {
    if (b === bomb) return;
    const dx = b.position.x - cx, dy = b.position.y - cy;
    const d = Math.hypot(dx, dy);
    if (d > CFG.BOMB_BLAST_RADIUS || d < 1) return;
    const falloff = 1 - d / CFG.BOMB_BLAST_RADIUS;
    // Sem escalar por massa (ver comentário na config): força fixa por
    // distância deixa objetos pesados (aço) resistirem de verdade, e
    // objetos leves (estaca, presentes) saírem voando.
    const forceMag = CFG.BOMB_FORCE * falloff;
    if (!b.isStatic) {
      Body.applyForce(b, b.position, { x: (dx / d) * forceMag, y: (dy / d) * forceMag - forceMag * 0.35 });
    }

    if (b.wglGift && !b.wglGift.destroyed && d <= CFG.BOMB_GIFT_DESTROY_RADIUS) {
      registerGiftDestroyed(b, b.position.x, b.position.y);
    }
    if (b.wglBomb && !b.wglBomb.exploded) {
      setTimeout(function () { explodeBomb(b); }, CFG.BOMB_CHAIN_DELAY_MS);
    }
    if (b.wglBlock && !b.wglBlock.fallen) {
      // uma explosão perto o bastante já conta como "derrubou" o bloco,
      // mesmo que o ângulo dele ainda não tenha virado nesse exato frame.
      if (d <= CFG.BOMB_GIFT_DESTROY_RADIUS) registerBlockFall(b);
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════
   COLISÕES — decide impacto em presentes e queda de blocos
   ══════════════════════════════════════════════════════════════════════ */
let lastGenericImpactAt = 0;
Events.on(engine, "collisionStart", function (event) {
  event.pairs.forEach(function (pair) {
    const a = pair.bodyA, b = pair.bodyB;
    const impactSpeed = Math.max(a.speed, b.speed);
    if (impactSpeed < CFG.MIN_HIT_SPEED) return;
    [a, b].forEach(function (body) {
      if (body.wglBomb && !body.wglBomb.exploded) {
        explodeBomb(body);
        return;
      }
      if (body.wglGift && !body.wglGift.destroyed) {
        const now = performance.now();
        if (now - body.wglGift.lastHitAt < 90) return; // evita contar o mesmo impacto 2x
        body.wglGift.lastHitAt = now;
        body.wglGift.hp -= 1;
        if (body.wglGift.hp <= 0) {
          registerGiftDestroyed(body, body.position.x, body.position.y);
        } else {
          SFX.impact();
          spawnPaperBits(body.position.x, body.position.y, 4);
        }
      }
    });
    // Som/haptic genérico de impacto — com um pequeno intervalo mínimo entre
    // toques, senão um desabamento grande vira uma enxurrada de som picotado.
    const now2 = performance.now();
    if (now2 - lastGenericImpactAt > 70) {
      lastGenericImpactAt = now2;
      SFX.impact();
      vibrate(10);
    }
  });
});

/* Verifica blocos "derrubados" (ângulo mudou bastante) a cada frame — não
   precisa remover o bloco, só contabilizar e pontuar uma vez. */
function checkFallenBlocks() {
  activeBlocks.forEach(function (body) {
    if (body.wglBlock.fallen) return;
    const delta = Math.abs(body.angle - body.wglBlock.initialAngle);
    if (delta > CFG.BLOCK_FALL_ANGLE) registerBlockFall(body);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   14. ESTADO DO JOGO
   ══════════════════════════════════════════════════════════════════════ */
const Game = {
  screen: "start", // start | playing | complete | fail | pause | final
  levelIndex: 0,
  lives: CFG.START_LIVES,
  highScore: loadHighScore(),
  attemptsThisLevel: 1,
  throwsUsed: 0,
  currentProjectile: null,   // corpo carregado no estilingue (ou em voo)
  currentKey: "gian",        // 'gian' | 'tiago' — sorteado a cada arremesso
  flightStartedAt: 0,
  settledFrames: 0,
  awaitingNext: false,
  isVictoryRun: false,
  stats: { giftsDestroyed: 0, blocksFallen: 0, throwsUsed: 0, perfectLevels: 0, levelsCompleted: 0, bombsDetonated: 0 },

  get level() { return LEVELS[this.levelIndex]; },
};

function startRun() {
  Game.lives = CFG.START_LIVES;
  Game.levelIndex = 0;
  Game.attemptsThisLevel = 1;
  Score.total = 0;
  Game.stats = { giftsDestroyed: 0, blocksFallen: 0, throwsUsed: 0, perfectLevels: 0, levelsCompleted: 0 };
  startLevel(0);
}

function startLevel(index) {
  Game.levelIndex = index;
  Game.throwsUsed = 0;
  Score.resetLevel();
  loadLevelIntoWorld(Game.level);
  Camera.x = 0; Camera.targetX = restCameraX();
  Game.screen = "playing";
  hudEl.hidden = false;
  pauseBtn.hidden = false;
  hideAllOverlays();
  updateHud();
  spawnNextProjectile();
}

function restCameraX() {
  return clamp(Game.level.slingX - 300, 0, Math.max(0, currentWorldWidth - CFG.VIEW_W));
}

function remainingGiftsCount() { return activeGifts.filter(function (g) { return !g.wglGift.destroyed; }).length; }

function spawnNextProjectile() {
  if (Game.throwsUsed >= Game.level.throws) return; // sem arremessos — outcome tratado em checkOutcome
  Game.currentKey = Math.random() < 0.5 ? "gian" : "tiago";
  const anchor = slingAnchor();
  const body = Bodies.circle(anchor.x, anchor.y, CFG.PROJECTILE_RADIUS, {
    density: 0.0018, friction: 0.6, restitution: 0.25, frictionAir: 0.0002,
  });
  body.label = "wgl-projectile";
  body.isStatic = true; // fica "preso" no bolso do estilingue até soltar
  body.wglHeadKey = Game.currentKey; // guarda quem é essa cabeça, pra continuar desenhando certo depois de assentar
  Game.currentProjectile = body;
  World.add(engine.world, body);
  Game.awaitingNext = false;
  updateHud();
}

function slingAnchor() {
  const l = Game.level;
  return { x: l.slingX, y: CFG.VIEW_H - CFG.GROUND_H - CFG.SLING_Y_OFFSET };
}

function launchProjectile(vx, vy) {
  const body = Game.currentProjectile;
  if (!body) return;
  Body.setStatic(body, false);
  Body.setVelocity(body, { x: vx, y: vy });
  Body.setAngularVelocity(body, rand(-0.12, 0.12));
  Game.throwsUsed++;
  Game.stats.throwsUsed++;
  Game.flightStartedAt = performance.now();
  Game.settledFrames = 0;
  SFX.release();
  vibrate(25);
  updateHud();
}

/* Checa se o arremesso atual "assentou" (baixa velocidade sustentada) ou
   saiu da área útil — nesses casos, libera o próximo arremesso (ou conclui
   a fase, se os arremessos acabaram). */
function updateProjectileLifecycle(dt) {
  const body = Game.currentProjectile;
  if (!body || body.isStatic || Game.awaitingNext) return;

  const outOfBounds =
    body.position.x < -220 ||
    body.position.x > currentWorldWidth + 220 ||
    body.position.y > CFG.VIEW_H + 260;

  const tookTooLong = performance.now() - Game.flightStartedAt > CFG.MAX_FLIGHT_MS;

  if (outOfBounds) {
    World.remove(engine.world, body);
    Game.currentProjectile = null;
    scheduleNextStep();
    return;
  }

  if (body.speed < CFG.SETTLE_SPEED_THRESHOLD) {
    Game.settledFrames++;
  } else {
    Game.settledFrames = 0;
  }

  if (Game.settledFrames >= CFG.SETTLE_FRAMES_NEEDED || tookTooLong) {
    restBodies.push(body); // vira parte do cenário (não removido — fica como "entulho")
    Game.currentProjectile = null;
    scheduleNextStep();
  }
}

function scheduleNextStep() {
  if (Game.awaitingNext) return;
  Game.awaitingNext = true;
  Camera.targetX = restCameraX();
  setTimeout(function () {
    checkLevelOutcome();
  }, CFG.NEXT_THROW_DELAY_MS);
}

function checkLevelOutcome() {
  if (Game.screen !== "playing") return;
  const remaining = remainingGiftsCount();

  if (remaining === 0) {
    completeLevel();
    return;
  }
  if (Game.throwsUsed >= Game.level.throws) {
    failLevel();
    return;
  }
  spawnNextProjectile();
}

function completeLevel() {
  Game.screen = "complete";
  const unused = Game.level.throws - Game.throwsUsed;
  const unusedBonus = unused * CFG.POINTS.unusedThrow;
  const perfect = Game.attemptsThisLevel === 1;
  const perfectBonus = perfect ? CFG.POINTS.perfectLevel : 0;
  if (perfect) Game.stats.perfectLevels++;
  Game.stats.levelsCompleted++;

  Score.add(unusedBonus + perfectBonus);
  SFX.levelComplete();
  vibrate([20, 40, 20, 60]);

  showLevelComplete({
    levelPoints: Score.levelPoints,
    unused: unused, unusedBonus: unusedBonus,
    perfect: perfect, perfectBonus: perfectBonus,
  });

  if (Score.total > Game.highScore) { Game.highScore = Score.total; saveHighScore(Game.highScore); }
  updateHud();
}

function continueAfterComplete() {
  const next = Game.levelIndex + 1;
  if (next >= LEVELS.length) {
    endRun(true);
  } else {
    Game.attemptsThisLevel = 1;
    startLevel(next);
  }
}

function failLevel() {
  Game.screen = "fail";
  Game.lives--;
  Score.add(-CFG.LIFE_LOST_PENALTY);
  SFX.fail();
  vibrate([30, 50, 30]);
  if (Score.total > Game.highScore) { Game.highScore = Score.total; saveHighScore(Game.highScore); }
  updateHud();

  if (Game.lives <= 0) {
    setTimeout(function () { endRun(false); }, 550);
  } else {
    showFail();
  }
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
  if (victory) { SFX.levelComplete(); } else { SFX.gameOver(); }
  vibrate(victory ? [20, 40, 20, 40, 20, 80] : [60, 80, 60]);
  showFinal(victory);
}

/* ══════════════════════════════════════════════════════════════════════
   7. INPUT DE MIRA (arrastar / mirar / soltar)
   ══════════════════════════════════════════════════════════════════════ */
const Aim = { dragging: false, pointerId: null, dragX: 0, dragY: 0, trajectory: [] };

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CFG.VIEW_W / rect.width;
  const scaleY = CFG.VIEW_H / rect.height;
  const sx = (clientX - rect.left) * scaleX;
  const sy = (clientY - rect.top) * scaleY;
  // desfaz exatamente a transformação de render(): zoom em torno do centro,
  // depois o pan da câmera — senão mirar fica errado em fases com zoom != 1.
  const zoom = currentZoom();
  const cx = CFG.VIEW_W / 2, cy = CFG.VIEW_H / 2;
  const x = (sx - cx) / zoom + cx + Camera.x;
  const y = (sy - cy) / zoom + cy;
  return { x: x, y: y };
}

function pointFromEvent(e) {
  if (e.touches && e.touches.length) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  return { clientX: e.clientX, clientY: e.clientY };
}

function onPointerDown(e) {
  if (Game.screen !== "playing") return;
  const body = Game.currentProjectile;
  if (!body || !body.isStatic) return; // só mira quando há projétil carregado e parado no bolso
  const p = pointFromEvent(e);
  const world = screenToWorld(p.clientX, p.clientY);
  const anchor = slingAnchor();
  if (dist(world.x, world.y, anchor.x, anchor.y) > CFG.SLING_MAX_DRAG * 1.8) return; // toque longe do estilingue: ignora
  Aim.dragging = true;
  Aim.pointerId = e.pointerId !== undefined ? e.pointerId : "touch";
  ensureAudio();
  SFX.pull();
  updateAimFromWorld(world);
  e.preventDefault && e.preventDefault();
}

function onPointerMove(e) {
  if (!Aim.dragging) return;
  // ignora dedos extras: só o ponteiro que iniciou o arrasto mira o estilingue
  if (e.pointerId !== undefined && Aim.pointerId !== "touch" && e.pointerId !== Aim.pointerId) return;
  const p = pointFromEvent(e);
  const world = screenToWorld(p.clientX, p.clientY);
  updateAimFromWorld(world);
  e.preventDefault && e.preventDefault();
}

function updateAimFromWorld(world) {
  const anchor = slingAnchor();
  const dx = world.x - anchor.x, dy = world.y - anchor.y;
  const d = Math.min(CFG.SLING_MAX_DRAG, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  Aim.dragX = anchor.x + Math.cos(angle) * d;
  Aim.dragY = anchor.y + Math.sin(angle) * d;
  const body = Game.currentProjectile;
  if (body) Body.setPosition(body, { x: Aim.dragX, y: Aim.dragY });

  const pull = { x: anchor.x - Aim.dragX, y: anchor.y - Aim.dragY };
  const vx = pull.x * CFG.SLING_FORCE_MULT, vy = pull.y * CFG.SLING_FORCE_MULT;
  const speed = Math.hypot(vx, vy);
  const cap = CFG.SLING_MAX_LAUNCH_SPEED;
  const finalV = speed > cap ? { x: vx * (cap / speed), y: vy * (cap / speed) } : { x: vx, y: vy };
  Aim.trajectory = computeTrajectoryPoints(anchor, finalV.x, finalV.y);
  Aim._finalV = finalV;
}

function onPointerUp(e) {
  if (!Aim.dragging) return;
  if (e.pointerId !== undefined && Aim.pointerId !== "touch" && e.pointerId !== Aim.pointerId) return;
  Aim.dragging = false;
  const anchor = slingAnchor();
  const pull = { x: anchor.x - Aim.dragX, y: anchor.y - Aim.dragY };
  const pulledEnough = Math.hypot(pull.x, pull.y) > 10;
  Aim.trajectory = [];
  if (pulledEnough && Aim._finalV && Game.currentProjectile) {
    launchProjectile(Aim._finalV.x, Aim._finalV.y);
  } else if (Game.currentProjectile) {
    // soltou sem puxar de verdade: devolve o projétil pro bolso
    Body.setPosition(Game.currentProjectile, anchor);
  }
}

/* Aproximação do quanto a gravidade do Matter.js soma à velocidade a cada
   passo do motor (delta≈16.667ms): gravity.y * gravity.scale(0.001) * delta² —
   confirmado rodando o motor de verdade num teste isolado, a prévia batia
   pixel a pixel com o voo real usando essa fórmula. */
const GRAV_ACCEL_APPROX = CFG.GRAVITY_Y * 0.001 * (16.667 * 16.667);
function computeTrajectoryPoints(anchor, vx, vy) {
  const pts = [];
  let x = anchor.x, y = anchor.y, cvx = vx, cvy = vy;
  for (let i = 0; i < 20; i++) {
    for (let s = 0; s < 3; s++) { cvy += GRAV_ACCEL_APPROX; x += cvx; y += cvy; }
    if (y > CFG.VIEW_H - CFG.GROUND_H) break;
    pts.push({ x: x, y: y });
  }
  return pts;
}

/* ══════════════════════════════════════════════════════════════════════
   8. CÂMERA
   ══════════════════════════════════════════════════════════════════════ */
const Camera = { x: 0, targetX: 0, shakeUntil: 0, shakeX: 0, shakeY: 0 };
function updateCamera() {
  const body = Game.currentProjectile;
  if (body && !body.isStatic) {
    const desired = clamp(body.position.x - CFG.VIEW_W * 0.42, 0, Math.max(0, currentWorldWidth - CFG.VIEW_W));
    Camera.targetX = desired;
    Camera.x = lerp(Camera.x, Camera.targetX, CFG.CAMERA_FOLLOW_LERP);
  } else {
    Camera.x = lerp(Camera.x, Camera.targetX, CFG.CAMERA_RETURN_LERP);
  }
  // Tremor de câmera — usado nas explosões de bomba, some sozinho depois de shakeUntil.
  if (performance.now() < Camera.shakeUntil) {
    const strength = 7;
    Camera.shakeX = rand(-strength, strength);
    Camera.shakeY = rand(-strength, strength);
  } else {
    Camera.shakeX = 0; Camera.shakeY = 0;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   12. RENDERIZAÇÃO
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

function drawSky() {
  const variant = (Game.level && Game.level.skyVariant) || "day";
  const grad = ctx.createLinearGradient(0, 0, 0, CFG.VIEW_H);
  if (variant === "sunset") {
    grad.addColorStop(0, PALETTE.skyTopSunset); grad.addColorStop(1, PALETTE.skyBottomSunset);
  } else if (variant === "night") {
    grad.addColorStop(0, PALETTE.skyTopNight); grad.addColorStop(1, PALETTE.skyBottomNight);
  } else {
    grad.addColorStop(0, PALETTE.skyTop); grad.addColorStop(1, PALETTE.skyBottom);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);

  if (variant === "night") {
    // estrelas + lua discretas — posições fixas (determinísticas, sem Math.random por frame)
    ctx.save();
    ctx.translate(-Camera.x * 0.2, 0);
    ctx.fillStyle = "rgba(255,255,255,.8)";
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137) % (CFG.VIEW_W * 2);
      const sy = 24 + (i * 71) % 260;
      ctx.beginPath(); ctx.arc(sx, sy, (i % 3 === 0) ? 2.2 : 1.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#F1EAD9";
    ctx.beginPath(); ctx.arc(CFG.VIEW_W * 0.78, 130, 46, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawClouds() {
  if (Game.level && Game.level.skyVariant === "night") return; // céu noturno usa estrelas, não nuvens
  ctx.save();
  ctx.translate(-Camera.x * 0.35, 0); // paralaxe leve
  ctx.fillStyle = PALETTE.cloud;
  for (let i = 0; i < 10; i++) {
    const cx = 120 + i * 340, cy = 90 + (i % 3) * 60;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 46, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 34, cy + 8, 34, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 34, cy + 6, 30, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGround() {
  const night = Game.level && Game.level.skyVariant === "night";
  const groundY = CFG.VIEW_H - CFG.GROUND_H;
  ctx.fillStyle = night ? PALETTE.groundSideNight : PALETTE.groundSide;
  ctx.fillRect(0, groundY, currentWorldWidth, CFG.GROUND_H + 40);
  ctx.fillStyle = night ? PALETTE.groundTopNight : PALETTE.groundTop;
  ctx.fillRect(0, groundY, currentWorldWidth, 18);
  ctx.strokeStyle = PALETTE.groundStripe;
  ctx.lineWidth = 3;
  for (let x = 0; x < currentWorldWidth; x += 46) {
    ctx.beginPath(); ctx.moveTo(x, groundY + 22); ctx.lineTo(x + 22, groundY + CFG.GROUND_H + 30); ctx.stroke();
  }
}

function drawSlingshot() {
  const anchor = slingAnchor();
  const baseY = CFG.VIEW_H - CFG.GROUND_H + 6;
  ctx.strokeStyle = PALETTE.slingWood;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(anchor.x - 20, baseY); ctx.lineTo(anchor.x - 24, anchor.y - 34); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(anchor.x + 20, baseY); ctx.lineTo(anchor.x + 24, anchor.y - 34); ctx.stroke();
  ctx.strokeStyle = PALETTE.slingWoodDark;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(anchor.x - 20, baseY); ctx.lineTo(anchor.x - 24, anchor.y - 34); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(anchor.x + 20, baseY); ctx.lineTo(anchor.x + 24, anchor.y - 34); ctx.stroke();

  /* O elástico só deve esticar até a bola enquanto ela está presa no bolso
     (isStatic — durante a mira). Depois de solta, ela voa livre e o
     elástico volta pro descanso — antes ele continuava "grudado" na bola
     durante o voo inteiro (porque Game.currentProjectile só vira null bem
     depois, quando o arremesso assenta), esticando uma linha absurda pela
     tela inteira e dando a impressão de que algo segurava a bola. */
  const body = Game.currentProjectile;
  const stillLoaded = body && body.isStatic;
  const pouch = stillLoaded ? body.position : anchor;
  ctx.strokeStyle = PALETTE.band;
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(anchor.x - 24, anchor.y - 34); ctx.lineTo(pouch.x, pouch.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(anchor.x + 24, anchor.y - 34); ctx.lineTo(pouch.x, pouch.y); ctx.stroke();
}

function drawTrajectory() {
  if (!Aim.dragging || !Aim.trajectory.length) return;
  ctx.fillStyle = "rgba(42,40,32,.4)";
  Aim.trajectory.forEach(function (p, i) {
    if (i % 1 !== 0) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBlock(body) {
  const spec = body.wglBlock, mat = BLOCK_KINDS[spec.kind];
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  if (mat.shape === "circle") {
    const r = spec.w / 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = mat.color; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = mat.accent; ctx.stroke();
    if (spec.kind === "bottle") {
      ctx.fillStyle = "rgba(255,255,255,.25)";
      ctx.fillRect(-r * 0.35, -r * 0.7, r * 0.22, r * 1.3);
    }
    if (spec.kind === "glass") {
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.25, r * 0.3, 0, Math.PI * 2); ctx.stroke();
    }
    if (spec.kind === "floral") {
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.22, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else {
    const w = spec.w, h = spec.h;
    ctx.fillStyle = mat.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = 3; ctx.strokeStyle = mat.accent; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = mat.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
    if (spec.kind === "suitcase") {
      ctx.fillStyle = mat.accent;
      ctx.fillRect(-w * 0.12, -h / 2 - 8, w * 0.24, 10);
    }
    if (spec.kind === "plaque" && w > 70) {
      ctx.fillStyle = mat.accent;
      ctx.font = "700 " + Math.round(h * 0.55) + "px 'Cormorant Garamond', serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("T&G", 0, 1);
    }
    if (spec.kind === "stake") {
      // textura simples de madeira — só uns tracinhos horizontais
      ctx.strokeStyle = "rgba(0,0,0,.15)"; ctx.lineWidth = 1.5;
      for (let yy = -h / 2 + 10; yy < h / 2; yy += 14) {
        ctx.beginPath(); ctx.moveTo(-w / 2 + 2, yy); ctx.lineTo(w / 2 - 2, yy); ctx.stroke();
      }
    }
    if (spec.kind === "steel") {
      // rebites nos cantos — deixa claro que é metal resistente
      ctx.fillStyle = "rgba(255,255,255,.35)";
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
        ctx.beginPath(); ctx.arc(c[0] * (w / 2 - 8), c[1] * (h / 2 - 8), 3, 0, Math.PI * 2); ctx.fill();
      });
    }
    if (spec.kind === "spring") {
      // um "molejo" em zigue-zague, pra ficar óbvio que é uma mola
      ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
      ctx.beginPath();
      const coils = 4, cw = w * 0.7;
      for (let i = 0; i <= coils * 2; i++) {
        const xx = -cw / 2 + (cw * i) / (coils * 2);
        const yy = (i % 2 === 0) ? -h * 0.22 : h * 0.22;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBomb(body) {
  const r = CFG.BOMB_RADIUS;
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
  grad.addColorStop(0, "#4A4640"); grad.addColorStop(1, "#201D19");
  ctx.fillStyle = grad; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = "#C46D28"; ctx.stroke();
  // pavio com faísca
  ctx.strokeStyle = "#C9A268"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.35, -r * 1.35, r * 0.15, -r * 1.6); ctx.stroke();
  ctx.fillStyle = "#F1D27A";
  ctx.beginPath(); ctx.arc(r * 0.15, -r * 1.6, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawGift(body) {
  const g = body.wglGift, tier = GIFT_TIERS[g.tier];
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  const w = g.w, h = g.h;

  if (g.shape === "round") {
    const r = w / 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = tier.color; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = tier.accent; ctx.stroke();
    ctx.strokeStyle = tier.ribbon; ctx.lineWidth = Math.max(3, r * 0.22);
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
  } else {
    ctx.fillStyle = tier.color;
    if (g.shape === "bag") {
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2 + 8);
      ctx.lineTo(w / 2, -h / 2 + 8);
      ctx.lineTo(w / 2 - 4, h / 2);
      ctx.lineTo(-w / 2 + 4, h / 2);
      ctx.closePath(); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = tier.accent; ctx.stroke();
      ctx.strokeStyle = tier.accent; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, -h / 2 + 4, w * 0.22, Math.PI, 0); ctx.stroke();
    } else {
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.lineWidth = 3; ctx.strokeStyle = tier.accent; ctx.strokeRect(-w / 2, -h / 2, w, h);
    }
    ctx.strokeStyle = tier.ribbon; ctx.lineWidth = Math.max(3, w * 0.11);
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(0, h / 2); ctx.stroke();
    // laço
    ctx.fillStyle = tier.ribbon;
    ctx.beginPath();
    ctx.ellipse(-w * 0.09, -h / 2, w * 0.11, w * 0.075, 0.5, 0, Math.PI * 2);
    ctx.ellipse(w * 0.09, -h / 2, w * 0.11, w * 0.075, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // rostinho discreto (sem virar personagem infantil)
  if (Math.min(w, h) > 40) {
    ctx.fillStyle = "rgba(42,40,32,.35)";
    const eyeY = h ? -h * 0.06 : -w * 0.06;
    ctx.beginPath(); ctx.arc(-w * 0.12, eyeY, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.12, eyeY, 1.8, 0, Math.PI * 2); ctx.fill();
  }

  // "hp" restante — pontinhos discretos, só se já apanhou
  if (g.hp < g.maxHp) {
    ctx.fillStyle = "rgba(42,40,32,.4)";
    for (let i = 0; i < g.hp; i++) ctx.fillRect(-w / 2 + 6 + i * 8, h / 2 - 10, 5, 5);
  }

  ctx.restore();
}

function drawHead(body, key) {
  const r = CFG.PROJECTILE_RADIUS;
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  const img = headImages[key];
  ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fill();
  if (img) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, -r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.stroke();
  } else {
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    if (key === "gian") { grad.addColorStop(0, "#EDE0C8"); grad.addColorStop(1, "#C8A050"); }
    else { grad.addColorStop(0, "#F0DCC8"); grad.addColorStop(1, "#C46D28"); }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.stroke();
    ctx.fillStyle = "#3A342B";
    ctx.font = "700 " + Math.round(r * 1.15) + "px 'Cormorant Garamond', serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(key === "gian" ? "G" : "T", 0, r * 0.08);
  }
  ctx.restore();
}

function drawParticles() {
  particles.forEach(function (p) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    if (p.kind === "confetti") ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    else ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

function drawFloatingTexts() {
  floatingTexts.forEach(function (t) {
    const alpha = clamp(t.life / t.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = t.color;
    ctx.font = (t.big ? "700 30px " : "600 22px ") + "'Cormorant Garamond', serif";
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

/* Zoom por fase: <1 = "mais longe" (estilingue e tudo mais menor na tela,
   cabe mais mundo na mesma janela), >1 = "mais perto" (tudo maior). Não
   muda o alcance real do arremesso (isso é física, em unidades de mundo) —
   só a escala em que a cena é desenhada. Sempre em torno do centro da
   tela, senão o zoom "puxa" a cena pro canto. */
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
  ctx.translate(-Camera.x + Camera.shakeX, Camera.shakeY);
  drawGround();
  drawSlingshot();
  drawTrajectory();
  activeBlocks.forEach(drawBlock);
  activeGifts.forEach(function (b) { if (!b.wglGift.destroyed) drawGift(b); });
  activeBombs.forEach(function (b) { if (!b.wglBomb.exploded) drawBomb(b); });
  restBodies.forEach(function (b) { drawHead(b, b.wglHeadKey || "gian"); });
  if (Game.currentProjectile) drawHead(Game.currentProjectile, Game.currentKey);
  drawParticles();
  drawFloatingTexts();
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════════════
   14b. HUD (DOM)
   ══════════════════════════════════════════════════════════════════════ */
let hudLevelEl, hudScoreEl, hudBestEl, hudThrowsEl, hudGiftsEl, heartsEls;

function updateHud() {
  if (!hudLevelEl) return;
  hudLevelEl.textContent = String(Game.levelIndex + 1);
  hudScoreEl.textContent = fmtNum(Score.total);
  hudBestEl.textContent = fmtNum(Math.max(Game.highScore, Score.total));
  hudThrowsEl.textContent = String(Math.max(0, Game.level.throws - Game.throwsUsed));
  hudGiftsEl.textContent = String(remainingGiftsCount());
  heartsEls.forEach(function (el, i) { el.classList.toggle("is-lost", i >= Game.lives); });
}

/* ══════════════════════════════════════════════════════════════════════
   15. OVERLAYS (telas)
   ══════════════════════════════════════════════════════════════════════ */
let ovStart, ovComplete, ovFail, ovPause, ovFinal;

function hideAllOverlays() {
  [ovStart, ovComplete, ovFail, ovPause, ovFinal].forEach(function (o) { o.hidden = true; });
}

function showLevelComplete(data) {
  hideAllOverlays();
  document.getElementById("complete-kicker").textContent = "Fase " + (Game.levelIndex + 1) + " completa — " + Game.level.name;
  const rows = [];
  rows.push(rowHtml("Pontos da fase", fmtNum(data.levelPoints - data.unusedBonus - data.perfectBonus)));
  if (data.unused > 0) rows.push(rowHtml(data.unused + "x arremesso não usado", "+" + fmtNum(data.unusedBonus), true));
  if (data.perfect) rows.push(rowHtml("Fase perfeita!", "+" + fmtNum(data.perfectBonus), true));
  document.getElementById("complete-breakdown").innerHTML = rows.join("");
  document.getElementById("complete-total").textContent = fmtNum(data.levelPoints);
  ovComplete.hidden = false;
}
function rowHtml(label, value, bonus) {
  return '<div class="wgl-score-row' + (bonus ? " wgl-score-row--bonus" : "") + '"><span>' + label + "</span><span>" + value + "</span></div>";
}

function showFail() {
  hideAllOverlays();
  const wrap = document.getElementById("fail-lives");
  wrap.innerHTML = "";
  for (let i = 0; i < CFG.START_LIVES; i++) {
    const span = document.createElement("span");
    span.textContent = "♥";
    if (i >= Game.lives) span.classList.add("is-lost");
    wrap.appendChild(span);
  }
  ovFail.hidden = false;
}

function showPause() { hideAllOverlays(); ovPause.hidden = false; }

function showFinal(victory) {
  hideAllOverlays();
  document.getElementById("final-kicker").textContent = victory ? "Parabéns!" : "Fim de jogo";
  document.getElementById("final-title").textContent = victory ? "Vocês salvaram a festa! 💍" : "Foi por pouco!";
  document.getElementById("final-score").textContent = fmtNum(Score.total);
  const isNewBest = Score.total >= Game.highScore && Score.total > 0;
  document.getElementById("final-newbest").hidden = !isNewBest;
  const s = Game.stats;
  const statsHtml = [
    stat("Fases completas", s.levelsCompleted),
    stat("Presentes destruídos", s.giftsDestroyed),
    stat("Arremessos usados", s.throwsUsed),
    stat("Fases perfeitas", s.perfectLevels),
    stat("Bombas detonadas", s.bombsDetonated),
  ].join("");
  document.getElementById("final-stats").innerHTML = statsHtml;
  ovFinal.hidden = false;
}
function stat(label, value) {
  return '<div class="wgl-final-stat"><strong>' + value + "</strong>" + label + "</div>";
}

/* ══════════════════════════════════════════════════════════════════════
   16. LOOP PRINCIPAL / BOOT
   ══════════════════════════════════════════════════════════════════════ */
let lastTs = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (!lastTs) lastTs = ts;
  let dt = ts - lastTs; lastTs = ts;
  dt = clamp(dt, 0, 34); // trava passos gigantes (aba em segundo plano etc.)

  if (Game.screen === "playing") {
    Engine.update(engine, dt);
    checkFallenBlocks();
    updateProjectileLifecycle(dt);
    updateCamera();
  }
  updateParticles(dt);
  render();
}

function bindEvents() {
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
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
    ovStart.hidden = false;
    document.getElementById("start-best").textContent = fmtNum(Game.highScore);
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
  heartsEls = Array.prototype.slice.call(document.querySelectorAll("#hud-lives-wrap .wgl-heart"));
  // Contagem total de fases fica escondida de propósito (surpresa progressiva) —
  // por isso não preenchemos mais "hud-level-total" aqui.

  ovStart = document.getElementById("ov-start");
  ovComplete = document.getElementById("ov-complete");
  ovFail = document.getElementById("ov-fail");
  ovPause = document.getElementById("ov-pause");
  ovFinal = document.getElementById("ov-final");

  document.getElementById("start-best").textContent = fmtNum(Game.highScore);

  loadHeadImages();
  resizeCanvas();
  bindEvents();
  requestAnimationFrame(frame);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

})();

(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha:false });

  const $ = id => document.getElementById(id);
  const gameCard = $('gameCard');
  const startOverlay = $('startOverlay');
  const levelOverlay = $('levelOverlay');
  const gameOverOverlay = $('gameOverOverlay');
  const ideaOverlay = $('ideaOverlay');
  const scoreText = $('scoreText');
  const bestText = $('bestText');
  const comboText = $('comboText');
  const livesText = $('livesText');
  const powerText = $('powerText');
  const messages = $('messages');
  const cityEmoji = $('cityEmoji');
  const cityName = $('cityName');
  const cityProgress = $('cityProgress');
  const levelKicker = $('levelKicker');
  const levelTitle = $('levelTitle');
  const levelText = $('levelText');
  const endKicker = $('endKicker');
  const endTitle = $('endTitle');
  const endText = $('endText');
  const endScore = $('endScore');
  const endDistance = $('endDistance');
  const endCollects = $('endCollects');

  const ASSET = 'assets/img/';
  const DPR_LIMIT = 2;
  const STORAGE_BEST = 'tg-vespa-eurotrip-best';

  const LEVELS = [
    {
      id:'lisboa', name:'Lisboa', emoji:'🇵🇹', length:920, speed:360,
      subtitle:'Pastel de nata, azulejo e bonde vindo do nada.',
      palette:{ sky:'#F8C887', road1:'#D8B98B', road2:'#B98A61', line:'#F7E7C8' },
      bg:{ sky:'bg-lisboa-sky.png', mid:'bg-lisboa-mid.png', front:'bg-lisboa-front.png', mirrorFront:true },
      obstacles:[
        { kind:'tram', img:'lisboaTram', emoji:'🚋', w:124, h:84, ground:true, weight:3, name:'Bonde na contramão', hit:{x:.13,y:.18,w:.74,h:.66} },
        { kind:'seagull', img:'lisboaSeagull', emoji:'🕊️', w:76, h:56, air:true, weight:2, name:'Gaivota abusada', hit:{x:.18,y:.2,w:.64,h:.56} },
        { kind:'clothesline', img:'lisboaClothesline', emoji:'👕', w:112, h:70, air:true, weight:2, name:'Varal traiçoeiro', hit:{x:.08,y:.22,w:.84,h:.42} }
      ],
      collectibles:[
        { img:'lisboaNata', label:'Nata', emoji:'🥧', value:55 },
        { img:'lisboaAzulejo', label:'Azulejo', emoji:'▣', value:70 },
        { img:'lisboaFado', label:'Fado', emoji:'🎸', value:85 },
        { img:'lisboaSardinha', label:'Sardinha', emoji:'🐟', value:65 }
      ]
    },
    {
      id:'paris', name:'Paris', emoji:'🇫🇷', length:1040, speed:395,
      subtitle:'Macaron, champanhe e pombo sem senso de espaço pessoal.',
      palette:{ sky:'#EFC28E', road1:'#D7C3A2', road2:'#A88D75', line:'#FFF8EA' },
      bg:{ sky:'bg-paris-sky.png', mid:'bg-paris-mid.png', front:'bg-paris-front.png', mirrorFront:false },
      obstacles:[
        { kind:'pigeon', img:'parisPigeon', emoji:'🐦', w:74, h:62, air:true, weight:3, name:'Pombo parisiense', hit:{x:.17,y:.16,w:.66,h:.62} },
        { kind:'umbrella', img:'parisUmbrella', emoji:'☂️', w:92, h:92, ground:true, weight:2, name:'Guarda-chuva do caos', hit:{x:.16,y:.12,w:.68,h:.74} },
        { kind:'baguette', img:'parisBaguette', emoji:'🥖', w:98, h:48, air:true, weight:2, name:'Baguete voadora', hit:{x:.08,y:.24,w:.84,h:.48} },
        { kind:'balloon', img:'parisBalloon', emoji:'🎈', w:72, h:94, air:true, weight:1, name:'Balão perdido', hit:{x:.18,y:.06,w:.64,h:.8} }
      ],
      collectibles:[
        { img:'parisMacaron', label:'Macaron', emoji:'🍬', value:65 },
        { img:'parisChampagne', label:'Champagne', emoji:'🥂', value:90 },
        { img:'parisCollectBaguette', label:'Baguete', emoji:'🥖', value:60 },
        { img:'parisCoquelicot', label:'Flor', emoji:'🌺', value:75 }
      ]
    },
    {
      id:'roma', name:'Roma', emoji:'🇮🇹', length:1140, speed:430,
      subtitle:'Gelato, limone e uma scooter jurando que tem prioridade.',
      palette:{ sky:'#F0A15A', road1:'#C8A77A', road2:'#8C6042', line:'#F7E7C8' },
      bg:{ sky:'bg-roma-sky.png', mid:'bg-roma-mid.png', front:'bg-roma-front.png', mirrorFront:true },
      obstacles:[
        { kind:'scooter', img:'romaScooter', emoji:'🏍️', w:104, h:72, ground:true, weight:3, name:'Scooter romana', hit:{x:.12,y:.2,w:.76,h:.62} },
        { kind:'cat', img:'romaCat', emoji:'🐈‍⬛', w:78, h:58, ground:true, weight:2, name:'Gato imperial', hit:{x:.1,y:.18,w:.8,h:.65} },
        { kind:'column', img:'romaColumn', emoji:'🏛️', w:72, h:112, ground:true, weight:2, name:'Coluna no caminho', hit:{x:.2,y:.04,w:.6,h:.9} }
      ],
      collectibles:[
        { img:'romaGelato', label:'Gelato', emoji:'🍦', value:70 },
        { img:'romaLimone', label:'Limone', emoji:'🍋', value:65 },
        { img:'romaMoeda', label:'Moeda', emoji:'🪙', value:85 },
        { img:'romaEspaguete', label:'Spaghetti', emoji:'🍝', value:80 }
      ]
    },
    {
      id:'santorini', name:'Santorini', emoji:'🇬🇷', length:1280, speed:460,
      subtitle:'Ouzo, buganvília, pôr do sol e burro no meio do caminho.',
      palette:{ sky:'#EC9A48', road1:'#D8C2A5', road2:'#8EA7C4', line:'#FFF8EA' },
      bg:{ sky:'bg-santorini-sky.png', mid:'bg-santorini-mid.png', front:'bg-santorini-front.png', mirrorFront:true },
      obstacles:[
        { kind:'donkey', img:'santoriniDonkey', emoji:'🐴', w:106, h:86, ground:true, weight:3, name:'Burro grego', hit:{x:.12,y:.12,w:.76,h:.76} },
        { kind:'vase', img:'santoriniVase', emoji:'🏺', w:72, h:76, ground:true, weight:2, name:'Vaso assassino', hit:{x:.18,y:.12,w:.64,h:.76} },
        { kind:'windmill', img:'santoriniWindmill', emoji:'🌬️', w:98, h:116, ground:true, weight:2, name:'Moinho dramático', hit:{x:.18,y:.12,w:.64,h:.78} }
      ],
      collectibles:[
        { img:'santoriniAnel', label:'Anel', emoji:'💍', value:120 },
        { img:'santoriniBuganvilha', label:'Buganvília', emoji:'🌸', value:75 },
        { img:'santoriniOuzo', label:'Ouzo', emoji:'🍸', value:85 },
        { img:'santoriniPolvo', label:'Polvo', emoji:'🐙', value:70 }
      ]
    }
  ];

  const IMG_SOURCES = {
    vespa:['vespa_player.png'],
    lisboaTram:['obstacle-lisboa-eletrico.png'], lisboaSeagull:['obstacle-lisboa-gaivota.png'], lisboaClothesline:['obstacle-lisboa-varal.png'],
    lisboaNata:['collect-lisboa-nata.png'], lisboaAzulejo:['collect-lisboa-azulejo.png'], lisboaFado:['collect-lisboa-fado.png'], lisboaSardinha:['collect-lisboa-sardinha.png'],
    parisPigeon:['obstacle-paris-pombo.png'], parisUmbrella:['obstacle-paris-guarda-chuva.png'], parisBaguette:['obstacle-paris-baguete-voando.png'], parisBalloon:['obstacle-paris-balao.png'],
    parisMacaron:['collect-paris-macaron.png'], parisChampagne:['collect-paris-champagne.png'], parisCollectBaguette:['collect-paris-baguette.png'], parisCoquelicot:['collect-paris-coquelicot.png'],
    romaScooter:['obstacle-roma-scooter.png'], romaCat:['obstacle-roma-gato.png'], romaColumn:['obstacle-roma-coluna.png'],
    romaGelato:['collect-roma-gelato.png'], romaLimone:['collect-roma-limone.png'], romaMoeda:['collect-roma-moeda.png'], romaEspaguete:['collect-roma-espaguete.png'],
    santoriniDonkey:['obstacle-santorini-burro.png'], santoriniVase:['obstacle-santorini-vaso.png'], santoriniWindmill:['obstacle-santorini-moinho.png'],
    santoriniAnel:['collect-santorini-anel.png'], santoriniBuganvilha:['collect-santorini-buganvilha.png'], santoriniOuzo:['collect-santorini-ouzo.png'], santoriniPolvo:['collect-santorini-polvo.png'],
    shield:['powerup-shield.png','moum-powerup-shield.png'], turbo:['powerup-turbo.png','powerup-star.png'], magnet:['powerup-magnet.png','powerup-magnet.png  .png'], slowmo:['powerup-slowmo.png','powerup-slowmo.png  .png']
  };

  for (const level of LEVELS) {
    for (const src of [level.bg.sky, level.bg.mid, level.bg.front]) IMG_SOURCES[`bg:${src}`] = [src];
  }

  const images = {};
  function loadImageCandidates(img, candidates, i = 0) {
    if (i >= candidates.length) { img.ok = false; return; }
    img.onload = () => { img.ok = true; img.datasetSrc = candidates[i]; };
    img.onerror = () => loadImageCandidates(img, candidates, i + 1);
    img.src = ASSET + candidates[i];
  }
  for (const [key, candidates] of Object.entries(IMG_SOURCES)) {
    const img = new Image();
    img.decoding = 'async';
    loadImageCandidates(img, candidates);
    images[key] = img;
  }

  const rand = (min, max) => Math.random() * (max - min) + min;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const format = n => Math.floor(n).toLocaleString('pt-BR');

  let W = 900, H = 1500, dpr = 1, raf = null, last = 0, state = 'menu';
  let muted = false, musicOn = false, audio = null, best = Number(localStorage.getItem(STORAGE_BEST) || 0);
  let transitionT = 0;

  const game = {
    time:0, score:0, totalDistance:0, levelIndex:0, levelDistance:0,
    speed:360, baseSpeed:360, lives:3, collects:0, combo:1, comboT:0,
    invT:0, power:null, powerT:0, shake:0, flash:0, groundY:0,
    nextObstaclePx:500, nextCollectPx:260, nextPowerPx:1800,
    obstacles:[], collectibles:[], powerups:[], particles:[], decorations:[]
  };

  const player = {
    x:130, y:0, w:100, h:128, vy:0, onGround:true, jumpCount:0, coyote:0,
    duck:false, holdJump:false, holdT:0, squash:0
  };

  const powerTypes = [
    { kind:'shield', img:'shield', label:'Escudo', emoji:'🛡️', duration:8.5, w:58, h:50 },
    { kind:'turbo', img:'turbo', label:'Turbo', emoji:'🍹', duration:5, w:62, h:54 },
    { kind:'magnet', img:'magnet', label:'Ímã', emoji:'🧲', duration:7.5, w:64, h:48 },
    { kind:'slowmo', img:'slowmo', label:'Slow', emoji:'🕰️', duration:5.5, w:64, h:46 }
  ];

  const currentLevel = () => LEVELS[game.levelIndex] || LEVELS[LEVELS.length - 1];
  const isMobilePortrait = () => window.innerWidth <= 720 && window.innerHeight > window.innerWidth;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const portrait = isMobilePortrait();
    dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
    W = Math.max(320, rect.width);
    H = Math.max(480, rect.height || (portrait ? rect.width * 16 / 9 : rect.width * 9 / 16));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    game.groundY = H * (portrait ? .82 : .78);
    player.x = W * (portrait ? .23 : .15);
    player.w = clamp(W * (portrait ? .16 : .095), 82, 120);
    player.h = player.w * 1.28;
    if (state !== 'running') {
      player.y = game.groundY - player.h;
      player.vy = 0;
    }
    render();
  }

  function reset() {
    const lvl = currentLevel();
    game.time = 0; game.score = 0; game.totalDistance = 0; game.levelIndex = 0; game.levelDistance = 0;
    game.speed = LEVELS[0].speed; game.baseSpeed = LEVELS[0].speed; game.lives = 3; game.collects = 0;
    game.combo = 1; game.comboT = 0; game.invT = 0; game.power = null; game.powerT = 0; game.shake = 0; game.flash = 0;
    game.nextObstaclePx = W * 1.05; game.nextCollectPx = W * .6; game.nextPowerPx = W * 4.2;
    game.obstacles.length = game.collectibles.length = game.powerups.length = game.particles.length = game.decorations.length = 0;
    player.y = game.groundY - player.h; player.vy = 0; player.onGround = true; player.jumpCount = 0; player.coyote = 0;
    player.duck = false; player.holdJump = false; player.holdT = 0; player.squash = 0;
    updateHUD();
  }

  function startGame() {
    unlockAudio();
    game.levelIndex = 0;
    reset();
    state = 'running';
    hideOverlays();
    toast('Lisboa: partiu!', 'power');
    vibrate(18);
    loopStart();
  }

  function hideOverlays() {
    startOverlay.classList.remove('show'); levelOverlay.classList.remove('show'); gameOverOverlay.classList.remove('show'); ideaOverlay.classList.remove('show');
  }

  function loopStart() { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop); }
  function loop(now) {
    const dt = Math.min((now - last) / 1000, .033);
    last = now;
    if (state === 'running') { update(dt); render(); raf = requestAnimationFrame(loop); }
  }

  function update(dt) {
    const lvl = currentLevel();
    game.time += dt;

    const progress = clamp(game.levelDistance / lvl.length, 0, 1);
    let targetSpeed = lvl.speed * (1 + progress * .12 + game.levelIndex * .045);
    if (game.power === 'turbo') targetSpeed *= 1.22;
    if (game.power === 'slowmo') targetSpeed *= .74;
    game.speed += (targetSpeed - game.speed) * Math.min(1, dt * 1.9);

    const distStep = game.speed * dt;
    game.totalDistance += distStep / 18;
    game.levelDistance += distStep / 18;
    game.score += dt * (12 + game.speed / 36) * game.combo * (game.power === 'turbo' ? 2 : 1);

    if (game.levelDistance >= lvl.length) { nextLevel(); return; }

    if (game.comboT > 0) { game.comboT -= dt; if (game.comboT <= 0) game.combo = 1; }
    if (game.invT > 0) game.invT -= dt;
    if (game.flash > 0) game.flash -= dt;
    if (game.shake > 0) game.shake -= dt;
    if (player.squash > 0) player.squash -= dt;
    updatePower(dt);
    updatePlayer(dt);
    updateSpawns(dt, distStep);
    updateObjects(dt);
    updateParticles(dt);
    updateDecorations(dt);
    updateHUD();
  }

  function updatePlayer(dt) {
    const portrait = isMobilePortrait();
    const baseGravity = H * (portrait ? 2.28 : 2.55);
    const maxHold = .22;
    let gravity = baseGravity;

    if (player.vy < 0 && player.holdJump && player.holdT < maxHold) {
      gravity *= .36;
      player.holdT += dt;
    } else if (player.vy < 0 && !player.holdJump) {
      gravity *= 1.65;
    }
    if (player.duck && !player.onGround) gravity *= 1.9;

    player.vy += gravity * dt;
    player.y += player.vy * dt;

    const floor = game.groundY - player.h * (player.duck ? .68 : 1);
    if (player.y >= floor) {
      if (!player.onGround && player.vy > H * .28) {
        player.squash = .12;
        dust(player.x + player.w * .35, game.groundY, 8);
        playSound('land');
      }
      player.y = floor; player.vy = 0; player.onGround = true; player.jumpCount = 0; player.coyote = .1; player.holdT = 0;
    } else {
      if (player.onGround) player.coyote = .1;
      player.onGround = false; player.coyote -= dt;
    }
  }

  function pressJump() {
    if (state === 'menu') { startGame(); return; }
    if (state !== 'running') return;
    player.holdJump = true;
    if (player.onGround || player.coyote > 0) doJump();
  }

  function releaseJump() {
    player.holdJump = false;
    if (state !== 'running') return;
    if (player.vy < 0) player.vy *= .42;
  }

  function doJump() {
    const portrait = isMobilePortrait();
    player.vy = -H * (portrait ? .72 : .78);
    player.onGround = false; player.jumpCount += 1; player.coyote = 0; player.holdT = 0; player.squash = .08;
    puff(player.x + player.w * .28, game.groundY - 8, 10, currentLevel().palette.road1);
    playSound('jump');
    vibrate(10);
  }

  function setDuck(on) {
    if (state !== 'running') return;
    player.duck = on;
    if (on && !player.onGround) player.vy += H * .42;
  }

  function updateSpawns(dt, distStep) {
    game.nextObstaclePx -= distStep;
    game.nextCollectPx -= distStep;
    game.nextPowerPx -= distStep;

    if (game.nextObstaclePx <= 0) {
      spawnObstacle();
      const lvl = currentLevel();
      const progress = clamp(game.levelDistance / lvl.length, 0, 1);
      const minSeconds = clamp(1.34 - game.levelIndex * .07 - progress * .12, 1.02, 1.34);
      const maxSeconds = clamp(1.82 - game.levelIndex * .06 - progress * .12, 1.28, 1.82);
      game.nextObstaclePx = game.speed * rand(minSeconds, maxSeconds) + W * rand(.12, .28);
    }

    if (game.nextCollectPx <= 0) {
      spawnCollectibles();
      game.nextCollectPx = game.speed * rand(.78, 1.18) + W * .18;
    }

    if (game.nextPowerPx <= 0) {
      spawnPowerup();
      game.nextPowerPx = game.speed * rand(7.8, 11.5) + W * 1.2;
    }

    if (Math.random() < dt * .55) spawnDecoration();
  }

  function weightedChoice(items) {
    const total = items.reduce((s, i) => s + (i.weight || 1), 0);
    let r = Math.random() * total;
    for (const item of items) { r -= item.weight || 1; if (r <= 0) return item; }
    return items[items.length - 1];
  }

  function spawnObstacle() {
    const lvl = currentLevel();
    const type = weightedChoice(lvl.obstacles);
    const s = isMobilePortrait() ? clamp(W / 390, .88, 1.22) : clamp(W / 1100, .78, 1.05);
    const w = type.w * s, h = type.h * s;
    let y = game.groundY - h;
    if (type.air) {
      const band = Math.random();
      if (band < .36) y = game.groundY - h - rand(72, 112) * s;
      else if (band < .72) y = game.groundY - h - rand(132, 190) * s;
      else y = game.groundY - h - rand(38, 68) * s;
    }
    game.obstacles.push({ type, x:W + rand(35, 90), y, w, h, hit:false, phase:rand(0, Math.PI * 2), rot:rand(-.035, .035) });
  }

  function spawnCollectibles() {
    const lvl = currentLevel();
    const type = lvl.collectibles[Math.floor(Math.random() * lvl.collectibles.length)];
    const count = Math.random() < .25 ? 5 : Math.random() < .62 ? 4 : 3;
    const s = isMobilePortrait() ? clamp(W / 390, .88, 1.16) : clamp(W / 1100, .78, 1);
    const size = 38 * s;
    const startX = W + rand(35, 100);
    const baseY = game.groundY - rand(125, 245) * s;
    const arc = Math.random() < .52;
    for (let i = 0; i < count; i++) {
      game.collectibles.push({ type, x:startX + i * 56 * s, y:baseY - (arc ? Math.sin(i / (count - 1) * Math.PI) * 42 * s : 0), w:size, h:size, got:false, phase:rand(0, Math.PI * 2) });
    }
  }

  function spawnPowerup() {
    const type = powerTypes[Math.floor(Math.random() * powerTypes.length)];
    const s = isMobilePortrait() ? clamp(W / 390, .88, 1.1) : clamp(W / 1100, .78, 1);
    game.powerups.push({ type, x:W + rand(80, 180), y:game.groundY - rand(170, 280) * s, w:type.w * s, h:type.h * s, got:false, phase:rand(0, Math.PI * 2) });
  }

  function spawnDecoration() {
    const emojis = { lisboa:['✨','🌊','☁️','🕊️'], paris:['✨','💌','☁️','🌹'], roma:['✨','☁️','🕯️'], santorini:['✨','🌸','☁️','🌅'] }[currentLevel().id];
    game.decorations.push({ emoji:emojis[Math.floor(Math.random() * emojis.length)], x:W + 30, y:rand(H * .14, H * .46), size:rand(13, 24), speed:rand(.08, .18), alpha:rand(.22, .55) });
  }

  function updateObjects(dt) {
    const speed = game.speed;
    for (const o of game.obstacles) {
      o.x -= speed * dt; o.phase += dt * 4;
      if (!o.hit && rectsHit(playerHitbox(), obstacleHitbox(o))) handleHit(o);
    }
    game.obstacles = game.obstacles.filter(o => o.x + o.w > -160);

    for (const c of game.collectibles) {
      if (game.power === 'magnet' && !c.got) {
        const px = player.x + player.w * .52, py = player.y + player.h * .42, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        if (Math.hypot(px - cx, py - cy) < W * .34) { c.x += (px - cx) * dt * 5.2; c.y += (py - cy) * dt * 5.2; }
        else c.x -= speed * dt;
      } else c.x -= speed * dt;
      c.phase += dt * 5;
      if (!c.got && rectsHit(playerHitbox(), c)) collect(c);
    }
    game.collectibles = game.collectibles.filter(c => !c.got && c.x + c.w > -80);

    for (const p of game.powerups) {
      p.x -= speed * dt; p.phase += dt * 4.5;
      if (!p.got && rectsHit(playerHitbox(), p)) activatePower(p);
    }
    game.powerups = game.powerups.filter(p => !p.got && p.x + p.w > -90);
  }

  function updateDecorations(dt) {
    for (const d of game.decorations) { d.x -= game.speed * dt * d.speed; d.y += Math.sin(game.time * 2 + d.x * .01) * dt * 5; }
    game.decorations = game.decorations.filter(d => d.x > -50);
  }

  function updatePower(dt) {
    if (!game.power) return;
    game.powerT -= dt;
    if (game.powerT <= 0) { game.power = null; game.powerT = 0; toast('Power-up acabou', 'power'); }
  }

  function collect(c) {
    c.got = true; game.collects += 1; game.combo = clamp(game.combo + 1, 1, 9); game.comboT = 3.4;
    const gained = c.type.value * game.combo * (game.power === 'turbo' ? 2 : 1);
    game.score += gained; sparkle(c.x + c.w / 2, c.y + c.h / 2, 14, c.type.emoji); toast(`${c.type.emoji} +${Math.floor(gained)}`, 'good'); playSound('collect'); vibrate(8);
  }

  function activatePower(p) {
    p.got = true; game.power = p.type.kind; game.powerT = p.type.duration; game.score += 120; game.combo = clamp(game.combo + 2, 1, 9); game.comboT = 4.2;
    burst(p.x + p.w / 2, p.y + p.h / 2, 28, p.type.kind === 'shield' ? '#1A8080' : '#F4C040'); toast(`${p.type.emoji} ${p.type.label}!`, 'power'); playSound('power'); vibrate([14, 28, 14]);
  }

  function handleHit(o) {
    if (game.invT > 0 || game.power === 'turbo') { o.hit = true; game.score += 80; puff(o.x + o.w / 2, o.y + o.h / 2, 20, '#F4C040'); playSound('bonk'); return; }
    if (game.power === 'shield') { game.power = null; game.powerT = 0; game.invT = 1.1; o.hit = true; game.score += 70; toast('Escudo salvou!', 'power'); burst(o.x + o.w / 2, o.y + o.h / 2, 22, '#1A8080'); playSound('shield'); vibrate([25, 35, 25]); return; }
    o.hit = true; game.lives -= 1; game.combo = 1; game.comboT = 0; game.invT = 1.15; game.shake = .28; game.flash = .18;
    gameCard.classList.remove('shake'); void gameCard.offsetWidth; gameCard.classList.add('shake');
    puff(player.x + player.w * .62, player.y + player.h * .55, 26, '#E8784A'); toast(`${o.type.name}!`, 'bad'); playSound('hit'); vibrate([38, 45, 38]);
    if (game.lives <= 0) setTimeout(() => gameOver(false), 120);
  }

  function playerHitbox() {
    const duck = player.duck;
    return { x:player.x + player.w * .17, y:player.y + player.h * (duck ? .42 : .17), w:player.w * .66, h:player.h * (duck ? .43 : .67) };
  }
  function obstacleHitbox(o) {
    const hit = o.type.hit || {x:.12,y:.12,w:.76,h:.76};
    return { x:o.x + o.w * hit.x, y:o.y + o.h * hit.y, w:o.w * hit.w, h:o.h * hit.h };
  }
  function rectsHit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function updateParticles(dt) {
    for (const p of game.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gravity || 0) * dt; p.rot += p.vr * dt; p.alpha = clamp(p.life / p.maxLife, 0, 1); }
    game.particles = game.particles.filter(p => p.life > 0);
  }

  function puff(x, y, count = 12, color = '#C46D28') {
    for (let i = 0; i < count; i++) game.particles.push({ type:'dot', x, y, vx:rand(-130,80), vy:rand(-120,40), r:rand(3,9), color, life:rand(.28,.58), maxLife:.58, alpha:1, rot:0, vr:0, gravity:220 });
  }
  function dust(x, y, count = 8) { puff(x, y, count, 'rgba(150,110,70,.7)'); }
  function sparkle(x, y, count = 12, emoji = '✨') {
    for (let i = 0; i < count; i++) game.particles.push({ type:Math.random() < .35 ? 'emoji' : 'spark', emoji, x, y, vx:rand(-130,130), vy:rand(-170,80), r:rand(3,7), color:['#F4C040','#E8784A','#FFF8EA','#7A9B6E'][Math.floor(Math.random()*4)], life:rand(.45,.9), maxLife:.9, alpha:1, rot:rand(0,Math.PI), vr:rand(-5,5), gravity:260 });
  }
  function burst(x, y, count, color) {
    for (let i = 0; i < count; i++) { const a = Math.PI * 2 * i / count, sp = rand(90,260); game.particles.push({ type:'spark', x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, r:rand(3,8), color, life:rand(.45,.8), maxLife:.8, alpha:1, rot:0, vr:rand(-4,4), gravity:80 }); }
  }
  function burstConfetti(x, y, count = 70) {
    for (let i = 0; i < count; i++) game.particles.push({ type:'confetti', x:x + rand(-80,80), y:y + rand(-30,30), vx:rand(-190,190), vy:rand(-260,20), r:rand(4,9), color:['#F4C040','#E8784A','#7A9B6E','#1A8080','#FFF8EA'][Math.floor(Math.random()*5)], life:rand(1.1,2.1), maxLife:2.1, alpha:1, rot:rand(0,Math.PI), vr:rand(-8,8), gravity:420 });
  }

  function render() {
    const dx = game.shake > 0 ? rand(-7,7) * (game.shake / .28) : 0;
    const dy = game.shake > 0 ? rand(-4,4) * (game.shake / .28) : 0;
    ctx.save(); ctx.translate(dx, dy);
    drawBackground(); drawDecorations(); drawGround(); drawObjects(); drawPlayer(); drawParticles(); drawVignette();
    if (game.flash > 0) { ctx.fillStyle = `rgba(232,120,74,${game.flash * 1.9})`; ctx.fillRect(0,0,W,H); }
    ctx.restore();
  }

  function drawBackground() {
    const lvl = currentLevel(), p = lvl.palette;
    const grad = ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0, p.sky); grad.addColorStop(.58, '#FFF4DA'); grad.addColorStop(1, '#F7E7C8'); ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
    drawTiledLayer(`bg:${lvl.bg.sky}`, 0, 0, W, H * .66, .09, { fit:'cover', mirror:true, alpha:1, align:'top' });
    drawSoftSun();
    drawTiledLayer(`bg:${lvl.bg.mid}`, 0, H * .15, W, H * .48, .18, { fit:'contain', mirror:true, alpha:.98, align:'bottom' });
    drawTiledLayer(`bg:${lvl.bg.front}`, 0, game.groundY - H * .25, W, H * .255, .43, { fit:'contain', mirror:lvl.bg.mirrorFront, alpha:1, align:'bottom' });
  }

  function drawTiledLayer(key, x, y, w, h, speedFactor, opts = {}) {
    const img = images[key];
    if (!img || !img.ok) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    let tileH = h;
    let tileW = tileH * ratio;
    if (opts.fit === 'cover' && tileW < w) { tileW = w; tileH = tileW / ratio; }
    if (tileW < 260) tileW = 260;
    const drawY = opts.align === 'bottom' ? y + h - tileH : y;
    const scroll = (game.totalDistance * 18 * speedFactor) % tileW;
    let startX = x - scroll - tileW;
    let index = Math.floor((game.totalDistance * speedFactor) / tileW) - 1;
    ctx.save(); ctx.globalAlpha = opts.alpha ?? 1;
    for (let px = startX; px < x + w + tileW * 2; px += tileW) {
      const mirror = opts.mirror && Math.abs(index) % 2 === 1;
      if (mirror) { ctx.save(); ctx.translate(px + tileW, drawY); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, tileW + 1, tileH); ctx.restore(); }
      else ctx.drawImage(img, px, drawY, tileW + 1, tileH);
      index++;
    }
    ctx.restore();
  }

  function drawSoftSun() {
    const lvl = currentLevel();
    if (lvl.id !== 'santorini') return;
    const x = W * .2, y = H * .28, r = Math.min(W,H) * .08;
    const g = ctx.createRadialGradient(x,y,0,x,y,r*3); g.addColorStop(0,'rgba(244,192,64,.55)'); g.addColorStop(1,'rgba(244,192,64,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,r*3,0,Math.PI*2); ctx.fill();
  }

  function drawDecorations() {
    ctx.save();
    for (const d of game.decorations) { ctx.globalAlpha = d.alpha; ctx.font = `${d.size}px system-ui, sans-serif`; ctx.fillText(d.emoji, d.x, d.y); }
    ctx.restore();
  }

  function drawGround() {
    const lvl = currentLevel(), p = lvl.palette;
    const top = game.groundY - 4;
    const g = ctx.createLinearGradient(0, top, 0, H); g.addColorStop(0, p.road1); g.addColorStop(1, p.road2); ctx.fillStyle = g; ctx.fillRect(-20, top, W+40, H-top+20);
    ctx.fillStyle = 'rgba(255,253,246,.5)'; ctx.fillRect(-20, top, W+40, 5);
    ctx.strokeStyle = 'rgba(255,253,246,.18)'; ctx.lineWidth = 1;
    const scroll = (game.totalDistance * 18 * .85) % 44;
    for (let y = top + 24; y < H; y += 38) {
      ctx.beginPath();
      for (let x = -scroll - 70; x < W + 90; x += 44) {
        ctx.moveTo(x, y + Math.sin((x + y) * .03) * 3);
        ctx.quadraticCurveTo(x+18, y+8, x+36, y + Math.cos((x+y)*.02)*3);
      }
      ctx.stroke();
    }
  }

  function drawObjects() {
    for (const c of game.collectibles) drawFloatingSprite(c.type.img, c.x, c.y, c.w, c.h, c.type.emoji, c.phase, 1);
    for (const p of game.powerups) drawFloatingSprite(p.type.img, p.x, p.y, p.w, p.h, p.type.emoji, p.phase, 1.1);
    for (const o of game.obstacles) {
      const bob = o.type.air ? Math.sin(o.phase) * 5 : 0;
      drawShadow(o.x + o.w*.5, o.y + o.h + bob + 4, o.w*.64, o.h*.13, o.type.air ? .08 : .18);
      drawSprite(o.type.img, o.x, o.y + bob, o.w, o.h, o.type.emoji, o.hit ? .5 : 1, o.rot);
    }
  }

  function drawFloatingSprite(imgKey, x, y, w, h, emoji, phase, glow = 1) {
    const bob = Math.sin(phase) * 6;
    ctx.save(); ctx.globalAlpha = .22; ctx.fillStyle = '#F4C040'; ctx.beginPath(); ctx.arc(x+w/2, y+h/2+bob, Math.max(w,h)*.55*glow, 0, Math.PI*2); ctx.fill(); ctx.restore();
    drawSprite(imgKey, x, y + bob, w, h, emoji, 1, Math.sin(phase*.7)*.08);
  }

  function drawPlayer() {
    const tilt = clamp(player.vy / 1400, -.34, .34) + (game.power === 'turbo' ? -.08 : 0);
    const duckScaleY = player.duck ? .68 : 1;
    const squashX = player.squash > 0 ? 1.07 : 1;
    const squashY = player.squash > 0 ? .93 : 1;
    drawShadow(player.x + player.w*.5, game.groundY + 6, player.w*.72, player.h*.1, .2);
    if (game.power === 'shield') { ctx.save(); ctx.strokeStyle='rgba(26,128,128,.72)'; ctx.lineWidth=4; ctx.beginPath(); ctx.ellipse(player.x+player.w*.5, player.y+player.h*.52, player.w*.62, player.h*.58, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
    if (game.power === 'turbo') { ctx.save(); ctx.globalAlpha=.8; ctx.fillStyle='#E8784A'; ctx.beginPath(); ctx.ellipse(player.x-player.w*.08, player.y+player.h*.62, player.w*.24, player.h*.12, 0, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
    ctx.save();
    ctx.translate(player.x + player.w/2, player.y + player.h/2 + (player.duck ? player.h*.18 : 0));
    ctx.rotate(tilt); ctx.scale(squashX, duckScaleY*squashY);
    const alpha = game.invT > 0 ? .58 + Math.sin(game.time*45)*.25 : 1;
    drawSprite('vespa', -player.w/2, -player.h/2, player.w, player.h, '🛵', alpha, 0, true);
    ctx.restore();
  }

  function drawSprite(key, x, y, w, h, fallback = '✨', alpha = 1, rot = 0, local = false) {
    const img = images[key];
    ctx.save(); ctx.globalAlpha = alpha;
    if (!local) { ctx.translate(x + w/2, y + h/2); ctx.rotate(rot); x = -w/2; y = -h/2; }
    if (img && img.ok) ctx.drawImage(img, x, y, w, h);
    else { ctx.font = `${Math.max(22, h*.72)}px system-ui, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(fallback, x+w/2, y+h/2); }
    ctx.restore();
  }

  function drawShadow(x, y, w, h, alpha = .18) { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#1F2438'; ctx.beginPath(); ctx.ellipse(x, y, w/2, h/2, 0, 0, Math.PI*2); ctx.fill(); ctx.restore(); }

  function drawParticles() {
    for (const p of game.particles) {
      ctx.save(); ctx.globalAlpha = p.alpha; ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      if (p.type === 'emoji') { ctx.font = `${p.r*3.2}px system-ui, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(p.emoji,0,0); }
      else if (p.type === 'confetti') { ctx.fillStyle=p.color; ctx.fillRect(-p.r,-p.r*.45,p.r*2,p.r*.9); }
      else if (p.type === 'spark') { ctx.strokeStyle=p.color; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-p.r,0); ctx.lineTo(p.r,0); ctx.moveTo(0,-p.r); ctx.lineTo(0,p.r); ctx.stroke(); }
      else { ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(0,0,p.r,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W/2,H*.42,Math.min(W,H)*.2,W/2,H*.5,Math.max(W,H)*.72);
    g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(1,'rgba(31,36,56,.18)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  }

  function nextLevel() {
    if (game.levelIndex >= LEVELS.length - 1) { gameOver(true); return; }
    game.levelIndex += 1; game.levelDistance = 0; game.obstacles.length = game.collectibles.length = game.powerups.length = game.decorations.length = 0; game.power = null; game.powerT = 0; game.invT = 1.4;
    game.nextObstaclePx = W * 1.15; game.nextCollectPx = W * .48; game.nextPowerPx = W * 3.6;
    const lvl = currentLevel();
    state = 'transition'; transitionT = 1.55;
    levelKicker.textContent = game.levelIndex === LEVELS.length - 1 ? 'destino final' : 'próxima parada';
    levelTitle.textContent = `${lvl.emoji} ${lvl.name}`; levelText.textContent = lvl.subtitle; levelOverlay.classList.add('show'); updateHUD(); playSound('level'); vibrate([18,40,18]); cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(transitionLoop);
  }

  function transitionLoop(now) {
    const dt = Math.min((now - last) / 1000, .033); last = now; transitionT -= dt; render();
    if (transitionT <= 0) { levelOverlay.classList.remove('show'); state = 'running'; last = performance.now(); toast(`${currentLevel().name}: vai!`, 'power'); raf = requestAnimationFrame(loop); }
    else raf = requestAnimationFrame(transitionLoop);
  }

  function gameOver(won = false) {
    state = 'over'; cancelAnimationFrame(raf); best = Math.max(best, Math.floor(game.score)); localStorage.setItem(STORAGE_BEST, String(best));
    if (won) { endKicker.textContent='rota completa'; endTitle.textContent='Chegaram em Santorini'; endText.textContent='Pôr do sol, Vespa intacta e lua de mel desbloqueada.'; playSound('win'); burstConfetti(W*.5,H*.34,90); vibrate([30,50,30,50,70]); }
    else { endKicker.textContent='fim da rota'; endTitle.textContent=game.levelIndex >= 2 ? 'Quase no pôr do sol' : 'A viagem engasgou'; endText.textContent='A Vespa sobreviveu, mas o roteiro precisa de uma segunda tentativa.'; playSound('over'); vibrate([45,70,45]); }
    endScore.textContent = format(game.score); endDistance.textContent = `${format(game.totalDistance)} m`; endCollects.textContent = String(game.collects); updateHUD(); gameOverOverlay.classList.add('show');
  }

  function updateHUD() {
    const lvl = currentLevel();
    cityEmoji.textContent = lvl.emoji; cityName.textContent = lvl.name; cityProgress.textContent = `${Math.floor(clamp(game.levelDistance / lvl.length, 0, 1) * 100)}%`;
    scoreText.textContent = format(game.score); bestText.textContent = format(best); comboText.textContent = `x${game.combo}`; livesText.textContent = '🤍'.repeat(Math.max(0, game.lives)) + '♡'.repeat(Math.max(0, 3 - game.lives));
    if (game.power) { const p = powerTypes.find(x => x.kind === game.power); powerText.classList.add('show'); powerText.innerHTML = `${p?.emoji || '✨'} <span>${p?.label || 'power'}</span> <b>${Math.ceil(game.powerT)}s</b>`; }
    else powerText.classList.remove('show');
  }

  function toast(text, kind = '') {
    const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = text; messages.appendChild(el); setTimeout(() => el.remove(), 920);
  }

  function pauseGame() {
    if (state === 'running') { state = 'paused'; $('btnPause').innerHTML = '▶️ <span>Voltar</span>'; toast('Pausa para foto', 'power'); cancelAnimationFrame(raf); }
    else if (state === 'paused') { state = 'running'; $('btnPause').innerHTML = '⏸️ <span>Pausar</span>'; last = performance.now(); loopStart(); }
  }

  function showMenu() { state = 'menu'; cancelAnimationFrame(raf); startOverlay.classList.add('show'); gameOverOverlay.classList.remove('show'); ideaOverlay.classList.remove('show'); levelOverlay.classList.remove('show'); game.levelIndex = 0; reset(); }

  function vibrate(pattern) { if ('vibrate' in navigator) navigator.vibrate(pattern); }

  function unlockAudio() {
    if (muted) return;
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    if (!musicOn) startMusic();
  }
  function playSound(kind) {
    if (muted || !audio) return;
    const now = audio.currentTime, osc = audio.createOscillator(), gain = audio.createGain();
    const map = { jump:[520,.055,'triangle'], land:[140,.04,'sine'], collect:[820,.07,'sine'], power:[420,.16,'sawtooth'], hit:[90,.18,'square'], bonk:[220,.08,'triangle'], shield:[540,.12,'sine'], level:[660,.18,'triangle'], over:[120,.35,'sawtooth'], win:[760,.3,'triangle'] };
    const [freq,dur,type] = map[kind] || [440,.08,'sine']; osc.type = type; osc.frequency.setValueAtTime(freq, now); if (kind==='collect') osc.frequency.exponentialRampToValueAtTime(freq*1.45, now+dur); if (kind==='over') osc.frequency.exponentialRampToValueAtTime(70, now+dur);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.055, now+.01); gain.gain.exponentialRampToValueAtTime(.0001, now+dur);
    osc.connect(gain); gain.connect(audio.destination); osc.start(now); osc.stop(now+dur+.02);
  }
  function startMusic() {
    if (!audio || muted) return; musicOn = true;
    const notes = [261.63,329.63,392,493.88,440,392,329.63,293.66]; let i = 0;
    const tick = () => { if (!musicOn || muted || !audio) return; const now = audio.currentTime, osc = audio.createOscillator(), gain = audio.createGain(); osc.type='sine'; osc.frequency.value = notes[i % notes.length] * (currentLevel().id === 'santorini' ? 1.06 : 1); gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.018, now+.03); gain.gain.exponentialRampToValueAtTime(.0001, now+.34); osc.connect(gain); gain.connect(audio.destination); osc.start(now); osc.stop(now+.38); i++; setTimeout(tick, 360); };
    tick();
  }

  function bindHoldButton(el, down, up) {
    const onDown = e => { e.preventDefault(); down(); };
    const onUp = e => { e.preventDefault(); up(); };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onUp);
  }

  bindHoldButton(canvas, pressJump, releaseJump);
  bindHoldButton($('padJump'), pressJump, releaseJump);
  $('padDuck').addEventListener('pointerdown', e => { e.preventDefault(); setDuck(true); });
  $('padDuck').addEventListener('pointerup', e => { e.preventDefault(); setDuck(false); });
  $('padDuck').addEventListener('pointercancel', e => { e.preventDefault(); setDuck(false); });
  $('padDuck').addEventListener('pointerleave', e => { e.preventDefault(); setDuck(false); });

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { if (!e.repeat) pressJump(); e.preventDefault(); }
    if (e.code === 'ArrowDown') { setDuck(true); e.preventDefault(); }
    if (e.code === 'KeyP') pauseGame();
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { releaseJump(); e.preventDefault(); }
    if (e.code === 'ArrowDown') { setDuck(false); e.preventDefault(); }
  });

  $('btnStart').addEventListener('click', startGame);
  $('btnAgain').addEventListener('click', startGame);
  $('btnBackStart').addEventListener('click', showMenu);
  $('btnPause').addEventListener('click', pauseGame);
  $('btnReset').addEventListener('click', startGame);
  $('btnHow').addEventListener('click', () => { hideOverlays(); ideaOverlay.classList.add('show'); });
  $('btnCloseIdeas').addEventListener('click', () => { ideaOverlay.classList.remove('show'); startOverlay.classList.add('show'); });
  $('btnMute').addEventListener('click', () => { muted = !muted; if (muted) musicOn = false; else unlockAudio(); $('btnMute').innerHTML = muted ? '🔇 <span>Mudo</span>' : '🔊 <span>Som</span>'; });

  window.addEventListener('resize', resize, { passive:true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'running') pauseGame(); });

  resize();
  reset();
  render();
})();

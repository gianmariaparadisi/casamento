/* ============================================================
   wedding-geoguessr.js — "Volta ao Mundo"
   Jogo GeoGuessr-like com Google Maps JavaScript API + Street View.
   Sem backend, sem frameworks. Pensado para GitHub Pages.
   ============================================================ */
(function(){
"use strict";

/* ============================================================
   CONFIG
   ============================================================ */
const CONFIG = {
  ROUNDS_TOTAL: 6,
  MAX_MOVEMENTS: 5,
  MAX_SCORE_PER_ROUND: 5000,
  MAX_SCORE_TOTAL: 30000,
  HIGHSCORE_KEY: "geoguessr-wedding-highscore",
  SOUND_KEY: "geoguessr-wedding-sound",
  // Raios de busca (em metros) tentados em ordem até achar um panorama.
  PANORAMA_SEARCH_RADII: [50, 2000, 20000, 75000],
  // Quantas localizações tentar no total antes de desistir e mostrar erro.
  MAX_LOCATION_ATTEMPTS: 40,
  GREAT_SCORE_THRESHOLD: 4500, // dispara confete
};

/* ============================================================
   LOCATIONS — banco curado de localizações com boa cobertura
   de Street View, distribuídas pelo mundo.
   ============================================================ */
const LOCATIONS = [
  // — Europa —
  { id:"paris-eiffel",        name:"Paris",             country:"França",        lat:48.8584,  lng:2.2945,   difficulty:"easy" },
  { id:"lisboa-alfama",       name:"Lisboa",            country:"Portugal",      lat:38.7139,  lng:-9.1334,  difficulty:"easy" },
  { id:"roma-coliseu",        name:"Roma",              country:"Itália",        lat:41.8902,  lng:12.4922,  difficulty:"easy" },
  { id:"amsterdam-centro",    name:"Amsterdã",          country:"Países Baixos", lat:52.3676,  lng:4.9041,   difficulty:"easy" },
  { id:"barcelona-sagrada",   name:"Barcelona",         country:"Espanha",       lat:41.4036,  lng:2.1744,   difficulty:"easy" },
  { id:"londres-westminster", name:"Londres",           country:"Reino Unido",   lat:51.5007,  lng:-0.1246,  difficulty:"easy" },
  { id:"praga-centro",        name:"Praga",             country:"República Tcheca", lat:50.0875, lng:14.4213, difficulty:"medium" },
  { id:"santorini",           name:"Santorini",         country:"Grécia",        lat:36.3932,  lng:25.4615,  difficulty:"medium" },
  { id:"reykjavik",           name:"Reykjavík",         country:"Islândia",      lat:64.1466,  lng:-21.9426, difficulty:"medium" },
  { id:"edimburgo",           name:"Edimburgo",         country:"Escócia",       lat:55.9533,  lng:-3.1883,  difficulty:"medium" },
  { id:"viena",               name:"Viena",             country:"Áustria",       lat:48.2082,  lng:16.3738,  difficulty:"medium" },
  { id:"budapeste",           name:"Budapeste",         country:"Hungria",       lat:47.4979,  lng:19.0402,  difficulty:"medium" },
  { id:"copenhague",          name:"Copenhague",        country:"Dinamarca",     lat:55.6761,  lng:12.5683,  difficulty:"medium" },
  { id:"interlaken",          name:"Interlaken",        country:"Suíça",         lat:46.6863,  lng:7.8632,   difficulty:"medium" },
  { id:"porto",               name:"Porto",             country:"Portugal",      lat:41.1579,  lng:-8.6291,  difficulty:"medium" },
  { id:"bruges",              name:"Bruges",            country:"Bélgica",       lat:51.2093,  lng:3.2247,   difficulty:"medium" },
  { id:"dubrovnik",           name:"Dubrovnik",         country:"Croácia",       lat:42.6507,  lng:18.0944,  difficulty:"hard" },
  { id:"tromso",              name:"Tromsø",            country:"Noruega",       lat:69.6492,  lng:18.9553,  difficulty:"hard" },
  { id:"helsinque",           name:"Helsinque",         country:"Finlândia",     lat:60.1699,  lng:24.9384,  difficulty:"medium" },
  { id:"estocolmo",           name:"Estocolmo",         country:"Suécia",        lat:59.3293,  lng:18.0686,  difficulty:"medium" },
  { id:"oslo",                name:"Oslo",              country:"Noruega",       lat:59.9139,  lng:10.7522,  difficulty:"medium" },
  { id:"varsovia",            name:"Varsóvia",          country:"Polônia",       lat:52.2297,  lng:21.0122,  difficulty:"medium" },
  { id:"atenas",              name:"Atenas",            country:"Grécia",        lat:37.9838,  lng:23.7275,  difficulty:"easy" },
  { id:"douro-estrada",       name:"Vale do Douro",     country:"Portugal",      lat:41.1622,  lng:-7.7864,  difficulty:"hard" },
  { id:"toscana-estrada",     name:"Toscana",           country:"Itália",       lat:43.4642,  lng:11.2653,  difficulty:"medium" },

  // — América do Sul —
  { id:"rio-copacabana",      name:"Rio de Janeiro",    country:"Brasil",        lat:-22.9711, lng:-43.1822, difficulty:"easy" },
  { id:"buenos-aires",        name:"Buenos Aires",      country:"Argentina",     lat:-34.6037, lng:-58.3816, difficulty:"easy" },
  { id:"cusco",               name:"Cusco",             country:"Peru",          lat:-13.5320, lng:-71.9675, difficulty:"medium" },
  { id:"cartagena",           name:"Cartagena",         country:"Colômbia",      lat:10.3910,  lng:-75.4794, difficulty:"medium" },
  { id:"santiago",            name:"Santiago",          country:"Chile",         lat:-33.4489, lng:-70.6693, difficulty:"medium" },
  { id:"salvador",            name:"Salvador",          country:"Brasil",        lat:-12.9714, lng:-38.5014, difficulty:"medium" },
  { id:"ushuaia",             name:"Ushuaia",           country:"Argentina",     lat:-54.8019, lng:-68.3030, difficulty:"hard" },
  { id:"montevideo",          name:"Montevidéu",        country:"Uruguai",       lat:-34.9011, lng:-56.1645, difficulty:"medium" },
  { id:"sao-paulo",           name:"São Paulo",         country:"Brasil",        lat:-23.5505, lng:-46.6333, difficulty:"easy" },

  // — América do Norte —
  { id:"nyc-times-square",    name:"Nova York",         country:"Estados Unidos", lat:40.7580, lng:-73.9855, difficulty:"easy" },
  { id:"sf-golden-gate",      name:"São Francisco",     country:"Estados Unidos", lat:37.7749, lng:-122.4194, difficulty:"easy" },
  { id:"cidade-mexico",       name:"Cidade do México",  country:"México",        lat:19.4326,  lng:-99.1332, difficulty:"easy" },
  { id:"chicago",             name:"Chicago",           country:"Estados Unidos", lat:41.8781, lng:-87.6298, difficulty:"easy" },
  { id:"vancouver",           name:"Vancouver",         country:"Canadá",        lat:49.2827,  lng:-123.1207, difficulty:"medium" },
  { id:"quebec",              name:"Cidade de Quebec",  country:"Canadá",        lat:46.8139,  lng:-71.2080, difficulty:"medium" },
  { id:"nova-orleans",        name:"Nova Orleans",      country:"Estados Unidos", lat:29.9511, lng:-90.0715, difficulty:"medium" },
  { id:"banff",               name:"Banff",             country:"Canadá",        lat:51.1784,  lng:-115.5708, difficulty:"hard" },
  { id:"havana",              name:"Havana",            country:"Cuba",          lat:23.1136,  lng:-82.3666, difficulty:"hard" },
  { id:"route66",             name:"Rota 66, Arizona",  country:"Estados Unidos", lat:35.0242, lng:-110.6974, difficulty:"hard" },
  { id:"anchorage",           name:"Anchorage",         country:"Estados Unidos", lat:61.2181,  lng:-149.9003, difficulty:"hard" },

  // — Ásia —
  { id:"toquio-shibuya",      name:"Tóquio",            country:"Japão",         lat:35.6595,  lng:139.7005, difficulty:"easy" },
  { id:"kyoto",               name:"Quioto",            country:"Japão",         lat:35.0116,  lng:135.7681, difficulty:"medium" },
  { id:"seul",                name:"Seul",              country:"Coreia do Sul", lat:37.5665,  lng:126.9780, difficulty:"easy" },
  { id:"bangkok",             name:"Bangkok",           country:"Tailândia",     lat:13.7563,  lng:100.5018, difficulty:"easy" },
  { id:"singapura",           name:"Singapura",         country:"Singapura",     lat:1.3521,   lng:103.8198, difficulty:"easy" },
  { id:"hong-kong",           name:"Hong Kong",         country:"China",         lat:22.3193,  lng:114.1694, difficulty:"easy" },
  { id:"taipei",              name:"Taipei",            country:"Taiwan",        lat:25.0330,  lng:121.5654, difficulty:"medium" },
  { id:"ho-chi-minh",         name:"Ho Chi Minh",       country:"Vietnã",        lat:10.7769,  lng:106.7009, difficulty:"medium" },
  { id:"jaipur",              name:"Jaipur",            country:"Índia",         lat:26.9124,  lng:75.7873,  difficulty:"medium" },
  { id:"dubai",               name:"Dubai",             country:"Emirados Árabes", lat:25.2048, lng:55.2708, difficulty:"easy" },
  { id:"istambul",            name:"Istambul",          country:"Turquia",       lat:41.0082,  lng:28.9784,  difficulty:"easy" },
  { id:"jerusalem",           name:"Jerusalém",         country:"Israel",        lat:31.7683,  lng:35.2137,  difficulty:"medium" },
  { id:"ulaanbaatar",         name:"Ulaanbaatar",       country:"Mongólia",      lat:47.8864,  lng:106.9057, difficulty:"hard" },

  // — Oceania —
  { id:"sydney",              name:"Sydney",            country:"Austrália",     lat:-33.8688, lng:151.2093, difficulty:"easy" },
  { id:"melbourne",           name:"Melbourne",         country:"Austrália",     lat:-37.8136, lng:144.9631, difficulty:"medium" },
  { id:"auckland",            name:"Auckland",          country:"Nova Zelândia", lat:-36.8485, lng:174.7633, difficulty:"medium" },
  { id:"queenstown",          name:"Queenstown",        country:"Nova Zelândia", lat:-45.0312, lng:168.6626, difficulty:"medium" },
  { id:"perth",               name:"Perth",             country:"Austrália",     lat:-31.9505, lng:115.8605, difficulty:"medium" },
  { id:"wellington",          name:"Wellington",        country:"Nova Zelândia", lat:-41.2865, lng:174.7762, difficulty:"medium" },

  // — África —
  { id:"cidade-do-cabo",      name:"Cidade do Cabo",    country:"África do Sul", lat:-33.9249, lng:18.4241,  difficulty:"medium" },
  { id:"marrakech",           name:"Marrakech",         country:"Marrocos",      lat:31.6295,  lng:-7.9811,  difficulty:"medium" },
  { id:"cairo",               name:"Cairo",             country:"Egito",         lat:30.0444,  lng:31.2357,  difficulty:"medium" },
  { id:"nairobi",             name:"Nairóbi",           country:"Quênia",        lat:-1.2921,  lng:36.8219,  difficulty:"hard" },
  { id:"windhoek",            name:"Windhoek",          country:"Namíbia",       lat:-22.5609, lng:17.0658,  difficulty:"hard" },
];

/* ============================================================
   STATE
   ============================================================ */
const state = {
  map: null,               // não usado globalmente, mapas são criados por tela
  panorama: null,
  streetViewService: null,
  soundOn: true,

  round: 0,                 // 1-indexado durante o jogo
  totalScore: 0,
  roundResults: [],         // { location, distanceKm, score }
  movementsUsed: 0,

  currentRound: null,       // { ...location, realLat, realLng, panoId }
  locationQueue: [],        // fila embaralhada de LOCATIONS ainda não tentadas
  usedLocationIds: new Set(),

  guessMap: null,
  guessMarker: null,
  guessLatLng: null,

  resultMap: null,

  linksChangedListener: null,
  povChangedListener: null,
  povDebounceTimer: null,
};

/* ============================================================
   DOM SHORTCUTS
   ============================================================ */
const $ = (id) => document.getElementById(id);
const screens = {
  start:  () => $("screen-start"),
  loading:() => $("screen-loading"),
  error:  () => $("screen-error"),
  game:   () => $("screen-game"),
  result: () => $("screen-result"),
  final:  () => $("screen-final"),
};

function showScreen(name){
  Object.keys(screens).forEach((key) => {
    const el = screens[key]();
    if (el) el.hidden = (key !== name);
  });
}

/* ============================================================
   INIT
   ============================================================ */

// Se a chave ainda for o placeholder, nem tentamos esperar a API carregar.
function checkPlaceholderKey(){
  const scriptTag = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
  if (scriptTag && scriptTag.src.indexOf("SUA_GOOGLE_MAPS_API_KEY") !== -1){
    showApiKeyError();
    return true;
  }
  return false;
}

function showApiKeyError(){
  showScreen("error");
  $("error-title").textContent = "Falta configurar a chave da Google Maps API";
  $("error-text").textContent = "Abra o arquivo wedding-geoguessr.html e troque SUA_GOOGLE_MAPS_API_KEY pela sua chave do Google Cloud, com as APIs \"Maps JavaScript API\" habilitadas e restrição por domínio configurada.";
  $("btn-error-retry").hidden = true;
}

// Hook oficial do Google para falhas de autenticação (chave inválida, restrição errada, faturamento etc.)
window.gm_authFailure = function(){
  showScreen("error");
  $("error-title").textContent = "Não foi possível autenticar com o Google Maps";
  $("error-text").textContent = "Verifique se a chave da API é válida, se o faturamento está ativo no projeto do Google Cloud e se o domínio atual está na lista de referrers permitidos.";
  $("btn-error-retry").hidden = true;
};

// Chamado pelo callback do script da Google Maps API (?callback=initGame)
window.initGame = function(){
  try{
    if (typeof google === "undefined" || !google.maps){
      showApiKeyError();
      return;
    }
    state.streetViewService = new google.maps.StreetViewService();
    loadHighScore();
    setupStartScreenListeners();
    setupGameListeners();
    showScreen("start");
  }catch(err){
    console.error("Erro ao iniciar o jogo:", err);
    showFriendlyError("Não foi possível iniciar o jogo. Recarregue a página e tente novamente.");
  }
};

document.addEventListener("DOMContentLoaded", function(){
  loadSoundPref();
  // Se a chave for o placeholder, avisamos sem esperar a API (que provavelmente vai falhar).
  if (checkPlaceholderKey()) return;

  // Se o script da API demorar demais ou nunca chamar o callback (ex: bloqueado, sem internet),
  // mostramos um erro amigável em vez de deixar a tela em branco.
  setTimeout(function(){
    if (typeof google === "undefined" || !google.maps){
      showScreen("error");
      $("error-title").textContent = "O Google Maps não carregou";
      $("error-text").textContent = "Verifique sua conexão com a internet e se a chave da API está correta e habilitada. Depois, tente novamente.";
      $("btn-error-retry").hidden = false;
    }
  }, 8000);
});

function showFriendlyError(msg){
  showScreen("error");
  $("error-title").textContent = "Ops!";
  $("error-text").textContent = msg;
  $("btn-error-retry").hidden = false;
}

/* ============================================================
   HIGH SCORE
   ============================================================ */
function loadHighScore(){
  const hs = getHighScore();
  $("start-highscore").textContent = hs;
}

function getHighScore(){
  try{
    const v = parseInt(localStorage.getItem(CONFIG.HIGHSCORE_KEY), 10);
    return isNaN(v) ? 0 : v;
  }catch(e){ return 0; }
}

function saveHighScore(total){
  try{
    const current = getHighScore();
    if (total > current){
      localStorage.setItem(CONFIG.HIGHSCORE_KEY, String(total));
      return true; // novo recorde
    }
  }catch(e){ /* localStorage indisponível — ignora silenciosamente */ }
  return false;
}

/* ============================================================
   SOM (persistência simples do mute)
   ============================================================ */
function loadSoundPref(){
  try{
    const v = localStorage.getItem(CONFIG.SOUND_KEY);
    state.soundOn = v === null ? true : v === "1";
  }catch(e){ state.soundOn = true; }
  updateSoundButton();
}
function toggleSound(){
  state.soundOn = !state.soundOn;
  try{ localStorage.setItem(CONFIG.SOUND_KEY, state.soundOn ? "1" : "0"); }catch(e){}
  updateSoundButton();
}
function updateSoundButton(){
  const btn = $("btn-sound");
  if (!btn) return;
  btn.classList.toggle("is-muted", !state.soundOn);
}

/* ============================================================
   START SCREEN
   ============================================================ */
function setupStartScreenListeners(){
  $("btn-play").addEventListener("click", startGame);
  $("btn-error-retry").addEventListener("click", function(){
    location.reload();
  });
}

/* ============================================================
   startGame() — reseta estado e começa a rodada 1
   ============================================================ */
function startGame(){
  state.round = 0;
  state.totalScore = 0;
  state.roundResults = [];
  state.usedLocationIds = new Set();
  state.locationQueue = shuffle(LOCATIONS.slice());
  updateHudScore(0);
  nextRound();
}

/* ============================================================
   nextRound() — avança para a próxima rodada ou termina o jogo
   ============================================================ */
function nextRound(){
  state.round += 1;
  if (state.round > CONFIG.ROUNDS_TOTAL){
    endGame();
    return;
  }
  startRound();
}

/* ============================================================
   startRound() — sorteia/verifica uma localização válida e carrega o Street View
   ============================================================ */
function startRound(){
  showScreen("loading");
  $("loading-text").textContent = "Preparando rodada " + state.round + " de " + CONFIG.ROUNDS_TOTAL + "…";
  state.movementsUsed = 0;
  findValidLocation(0);
}

// Tenta localizações da fila embaralhada até achar uma com panorama disponível.
function findValidLocation(attempt){
  if (attempt >= CONFIG.MAX_LOCATION_ATTEMPTS || state.locationQueue.length === 0){
    showFriendlyError("Não conseguimos encontrar imagens do Street View para este jogo agora. Tente novamente em instantes.");
    return;
  }

  const candidate = state.locationQueue.pop();
  if (state.usedLocationIds.has(candidate.id)){
    findValidLocation(attempt + 1);
    return;
  }

  tryPanoramaWithRadii(candidate, 0, function(panoData){
    if (panoData){
      state.usedLocationIds.add(candidate.id);
      state.currentRound = {
        id: candidate.id,
        name: candidate.name,
        country: candidate.country,
        difficulty: candidate.difficulty,
        lat: candidate.lat,
        lng: candidate.lng,
        realLat: panoData.location.latLng.lat(),
        realLng: panoData.location.latLng.lng(),
        panoId: panoData.location.pano,
      };
      loadStreetView(state.currentRound);
    } else {
      // Sem panorama nesta localização — tenta a próxima.
      findValidLocation(attempt + 1);
    }
  });
}

// Tenta raios crescentes de busca até achar um panorama próximo à coordenada.
function tryPanoramaWithRadii(location, radiusIndex, callback){
  if (radiusIndex >= CONFIG.PANORAMA_SEARCH_RADII.length){
    callback(null);
    return;
  }
  const radius = CONFIG.PANORAMA_SEARCH_RADII[radiusIndex];
  state.streetViewService.getPanorama({
    location: { lat: location.lat, lng: location.lng },
    radius: radius,
    source: google.maps.StreetViewSource.OUTDOOR,
  }, function(data, status){
    if (status === google.maps.StreetViewStatus.OK && data){
      callback(data);
    } else {
      tryPanoramaWithRadii(location, radiusIndex + 1, callback);
    }
  });
}

/* ============================================================
   loadStreetView() — cria/atualiza o StreetViewPanorama
   ============================================================ */
function loadStreetView(round){
  showScreen("game");
  updateHudRound();
  updateHudScore(state.totalScore);
  updateHudMoves();
  $("move-limit-msg").hidden = true;
  $("gg-hint").hidden = false;
  $("btn-guess").disabled = false;

  const container = $("street-view");

  if (!state.panorama){
    state.panorama = new google.maps.StreetViewPanorama(container, {
      pano: round.panoId,
      visible: true,
      addressControl: false,
      showRoadLabels: false,
      fullscreenControl: false,
      motionTracking: false,
      motionTrackingControl: false,
      linksControl: false,   // usamos controles customizados para limitar movimentos
      panControl: true,
      zoomControl: true,
      clickToGo: false,      // evita navegação livre por clique na cena
      disableDefaultUI: false,
      enableCloseButton: false,
    });

    state.linksChangedListener = state.panorama.addListener("links_changed", buildMovementControls);
    state.povChangedListener = state.panorama.addListener("pov_changed", function(){
      // Recalcula os rótulos dos botões de movimento conforme o jogador olha ao redor (sem custo).
      clearTimeout(state.povDebounceTimer);
      state.povDebounceTimer = setTimeout(buildMovementControls, 120);
    });
  } else {
    state.panorama.setPano(round.panoId);
  }

  playSound("start");
}

/* ============================================================
   buildMovementControls() — transforma panorama.getLinks() em botões
   ============================================================ */
function buildMovementControls(){
  if (!state.panorama) return;
  const wrap = $("move-controls");
  wrap.innerHTML = "";

  if (state.movementsUsed >= CONFIG.MAX_MOVEMENTS){
    return; // limite atingido — sem botões
  }

  const links = state.panorama.getLinks();
  if (!links || links.length === 0) return;

  const pov = state.panorama.getPov();
  const currentHeading = pov ? pov.heading : 0;

  links.forEach(function(link){
    if (!link || link.heading == null) return;
    const relative = ((link.heading - currentHeading) % 360 + 360) % 360;
    const dir = relativeHeadingToLabel(relative);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gg-move-btn" + (dir.key === "front" ? " gg-move-btn--front" : "");
    btn.setAttribute("aria-label", dir.label);
    btn.innerHTML =
      '<span class="gg-move-btn__arrow" style="display:inline-block;transform:rotate(' + relative + 'deg);">↑</span>' +
      '<span class="gg-move-btn__label">' + dir.label + "</span>";
    btn.addEventListener("click", function(){ moveToLink(link); });
    wrap.appendChild(btn);
  });
}

function relativeHeadingToLabel(relative){
  if (relative <= 45 || relative >= 315) return { key: "front", label: "Frente" };
  if (relative > 45 && relative <= 135) return { key: "right", label: "Direita" };
  if (relative > 135 && relative < 225) return { key: "back", label: "Trás" };
  return { key: "left", label: "Esquerda" };
}

/* ============================================================
   moveToLink() — troca de panorama e consome um movimento
   ============================================================ */
function moveToLink(link){
  if (!link || !link.pano) return;
  if (state.movementsUsed >= CONFIG.MAX_MOVEMENTS) return;

  state.panorama.setPano(link.pano);
  state.movementsUsed += 1;
  updateHudMoves();
  playSound("move");
  vibrate("move");

  if (state.movementsUsed >= CONFIG.MAX_MOVEMENTS){
    $("move-limit-msg").hidden = false;
    $("move-controls").innerHTML = "";
  }
}

/* ============================================================
   HUD helpers
   ============================================================ */
function updateHudRound(){
  $("hud-round").textContent = state.round;
}
function updateHudScore(total){
  $("hud-score").textContent = total;
}
function updateHudMoves(){
  $("hud-moves").textContent = state.movementsUsed;
  const pill = $("hud-moves-pill");
  pill.classList.toggle("is-maxed", state.movementsUsed >= CONFIG.MAX_MOVEMENTS);
}

/* ============================================================
   GUESS MAP — abrir modal, colocar marcador, confirmar
   ============================================================ */
function setupGameListeners(){
  $("btn-guess").addEventListener("click", openGuessMap);
  $("btn-back-streetview").addEventListener("click", closeGuessMap);
  $("btn-confirm-guess").addEventListener("click", confirmGuess);
  $("btn-next-round").addEventListener("click", nextRound);
  $("btn-play-again").addEventListener("click", function(){
    showScreen("start");
    loadHighScore();
  });
  $("btn-sound").addEventListener("click", toggleSound);
}

function openGuessMap(){
  $("modal-guess").hidden = false;
  state.guessLatLng = null;
  $("btn-confirm-guess").disabled = true;

  // Cria o mapa apenas uma vez e reaproveita nas rodadas seguintes.
  if (!state.guessMap){
    state.guessMap = new google.maps.Map($("guess-map"), {
      center: { lat: 15, lng: 10 },
      zoom: 2,
      minZoom: 2,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      restriction: {
        latLngBounds: { north: 85, south: -85, west: -180, east: 180 },
        strictBounds: true,
      },
    });
    state.guessMap.addListener("click", function(e){
      placeGuessMarker(e.latLng);
    });
  } else {
    // remove marcador de rodada anterior
    if (state.guessMarker){
      state.guessMarker.setMap(null);
      state.guessMarker = null;
    }
    google.maps.event.trigger(state.guessMap, "resize");
  }
}

function placeGuessMarker(latLng){
  state.guessLatLng = latLng;
  if (state.guessMarker){
    state.guessMarker.setPosition(latLng);
  } else {
    state.guessMarker = new google.maps.Marker({
      position: latLng,
      map: state.guessMap,
      draggable: true, // permite reposicionar antes de confirmar
      title: "Seu palpite",
    });
    state.guessMarker.addListener("dragend", function(){
      state.guessLatLng = state.guessMarker.getPosition();
    });
  }
  $("btn-confirm-guess").disabled = false;
  playSound("place");
  vibrate("tap");
}

function closeGuessMap(){
  $("modal-guess").hidden = true;
}

/* ============================================================
   confirmGuess() — calcula distância/pontuação e mostra resultado
   ============================================================ */
function confirmGuess(){
  if (!state.guessLatLng) return;

  const round = state.currentRound;
  const distanceKm = calculateDistanceKm(
    state.guessLatLng.lat(), state.guessLatLng.lng(),
    round.realLat, round.realLng
  );
  const score = calculateScore(distanceKm);

  state.totalScore += score;
  state.roundResults.push({ location: round, distanceKm: distanceKm, score: score });

  $("modal-guess").hidden = true;
  playSound("confirm");
  vibrate("confirm");

  showRoundResult(distanceKm, score, round);
}

/* ============================================================
   calculateDistanceKm() — fórmula de Haversine
   ============================================================ */
function calculateDistanceKm(lat1, lng1, lat2, lng2){
  const R = 6371; // raio médio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function toRad(deg){ return deg * (Math.PI / 180); }

/* ============================================================
   calculateScore() — pontuação suave baseada na distância
   ============================================================ */
function calculateScore(distanceKm){
  if (distanceKm < 0.1) return CONFIG.MAX_SCORE_PER_ROUND;

  let score = Math.round(CONFIG.MAX_SCORE_PER_ROUND * Math.exp(-distanceKm / 1800));

  if (distanceKm < 1) score = Math.max(score, 4800);
  else if (distanceKm < 10) score = Math.max(score, 4000);

  return Math.min(score, CONFIG.MAX_SCORE_PER_ROUND);
}

/* ============================================================
   showRoundResult() — tela de resultado da rodada
   ============================================================ */
function showRoundResult(distanceKm, score, round){
  showScreen("result");

  const distanceLabel = distanceKm < 1
    ? Math.round(distanceKm * 1000) + " m"
    : formatKm(distanceKm) + " km";

  $("result-distance").textContent = "Você ficou a " + distanceLabel;
  $("result-place").innerHTML = 'Era: <strong>' + escapeHtml(round.name) + ", " + escapeHtml(round.country) + "</strong>";

  const pointsEl = $("result-points");
  pointsEl.classList.toggle("is-great", score >= CONFIG.GREAT_SCORE_THRESHOLD);
  animateCountUp(pointsEl, 0, score, 700, "+", " pontos");

  updateHudScore(state.totalScore);

  buildResultMap(state.guessLatLng, { lat: round.realLat, lng: round.realLng });

  if (score >= CONFIG.GREAT_SCORE_THRESHOLD){
    playSound("great");
    vibrate("great");
    launchConfetti();
  } else if (score < 1500){
    playSound("bad");
  } else {
    playSound("good");
  }

  const nextBtn = $("btn-next-round");
  nextBtn.textContent = state.round >= CONFIG.ROUNDS_TOTAL ? "Ver resultado final" : "Próxima rodada";
}

function buildResultMap(guessLatLng, realLatLng){
  const container = $("result-map");

  if (!state.resultMap){
    state.resultMap = new google.maps.Map(container, {
      zoom: 2,
      center: realLatLng,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });
  } else {
    // limpa overlays da rodada anterior
    if (state.resultMap._overlays){
      state.resultMap._overlays.forEach(function(o){ o.setMap(null); });
    }
    google.maps.event.trigger(state.resultMap, "resize");
  }

  const guessMarker = new google.maps.Marker({
    position: guessLatLng,
    map: state.resultMap,
    label: { text: "?", color: "#fff", fontWeight: "700" },
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: "#C56A45",
      fillOpacity: 1,
      strokeColor: "#fff",
      strokeWeight: 2,
    },
    title: "Seu palpite",
  });

  const realMarker = new google.maps.Marker({
    position: realLatLng,
    map: state.resultMap,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: "#4F7A5E",
      fillOpacity: 1,
      strokeColor: "#fff",
      strokeWeight: 2,
    },
    title: "Localização real",
  });

  const line = new google.maps.Polyline({
    path: [guessLatLng, realLatLng],
    geodesic: true,
    strokeColor: "#1E2E3D",
    strokeOpacity: 0.8,
    strokeWeight: 3,
    map: state.resultMap,
  });

  state.resultMap._overlays = [guessMarker, realMarker, line];

  const bounds = new google.maps.LatLngBounds();
  bounds.extend(guessLatLng);
  bounds.extend(realLatLng);
  state.resultMap.fitBounds(bounds, 60);
}

/* ============================================================
   endGame() — tela final com estatísticas e high score
   ============================================================ */
function endGame(){
  showScreen("final");

  const total = state.totalScore;
  $("final-score").textContent = "0";
  animateCountUp($("final-score"), 0, total, 900, "", "");

  const previousHighScore = getHighScore();
  const isNewRecord = saveHighScore(total);
  $("final-highscore-msg").classList.toggle("is-new-record", isNewRecord);
  $("final-highscore-msg").innerHTML = isNewRecord
    ? "Novo recorde! Recorde anterior: <strong id=\"final-highscore\">" + previousHighScore + "</strong>"
    : "Recorde: <strong id=\"final-highscore\">" + getHighScore() + "</strong>";

  if (state.roundResults.length){
    const best = state.roundResults.reduce((a, b) => (b.score > a.score ? b : a));
    const worst = state.roundResults.reduce((a, b) => (b.score < a.score ? b : a));
    const avgDistance = state.roundResults.reduce((sum, r) => sum + r.distanceKm, 0) / state.roundResults.length;

    $("final-best").textContent = best.score + " pts (" + best.location.name + ")";
    $("final-worst").textContent = worst.score + " pts (" + worst.location.name + ")";
    $("final-avg").textContent = formatKm(avgDistance) + " km";
  }

  $("final-headline").textContent = isNewRecord ? "Novo recorde mundial!" : "Sua volta ao mundo terminou";

  playSound(isNewRecord ? "great" : "end");
  vibrate(isNewRecord ? "great" : "confirm");
  if (isNewRecord) launchConfetti();
}

/* ============================================================
   UTILITÁRIOS
   ============================================================ */
function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatKm(km){
  if (km >= 100) return Math.round(km).toLocaleString("pt-BR");
  return km.toFixed(1).replace(".", ",");
}

function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Animação simples de contagem de pontos (delight visual, sem libs externas).
function animateCountUp(el, from, to, duration, prefix, suffix){
  prefix = prefix || "";
  suffix = suffix || "";
  const start = performance.now();
  function tick(now){
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cúbico
    const value = Math.round(from + (to - from) * eased);
    el.textContent = prefix + value + suffix;
    if (progress < 1){
      requestAnimationFrame(tick);
    } else {
      el.textContent = prefix + to + suffix;
      el.classList.add("gg-pulse");
      setTimeout(function(){ el.classList.remove("gg-pulse"); }, 300);
    }
  }
  requestAnimationFrame(tick);
}

/* ============================================================
   CONFETE — se a rodada render mais de 4500 pontos
   ============================================================ */
function launchConfetti(){
  const layer = $("confetti-layer");
  const colors = ["#C56A45", "#F0C069", "#4F7A5E", "#F8F2E6", "#2C4054"];
  const count = 46;

  for (let i = 0; i < count; i++){
    const piece = document.createElement("div");
    piece.className = "gg-confetti-piece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    const duration = 1.8 + Math.random() * 1.4;
    const delay = Math.random() * 0.4;
    piece.style.animationDuration = duration + "s";
    piece.style.animationDelay = delay + "s";
    layer.appendChild(piece);
    setTimeout(function(){ piece.remove(); }, (duration + delay) * 1000 + 200);
  }
}

/* ============================================================
   SOM — sintetizado via Web Audio API (sem arquivos externos)
   ============================================================ */
let _audioCtx = null;
function getAudioCtx(){
  if (!_audioCtx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _audioCtx = new AC();
  }
  return _audioCtx;
}

function tone(freq, dur, vol, type, delay){
  if (!state.soundOn) return;
  try{
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol || 0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }catch(e){ /* Web Audio indisponível — falha silenciosa */ }
}

function playSound(name){
  switch(name){
    case "start":   tone(523, 0.12, 0.07); setTimeout(() => tone(659, 0.14, 0.07), 90); break;
    case "move":    tone(440, 0.05, 0.06); break;
    case "confirm": tone(660, 0.08, 0.09); setTimeout(() => tone(880, 0.1, 0.08), 70); break;
    case "good":    tone(700, 0.08, 0.09); setTimeout(() => tone(900, 0.1, 0.08), 80); break;
    case "great":   [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 0.09), i * 90)); break;
    case "bad":     tone(220, 0.2, 0.08, "sawtooth"); break;
    case "end":     [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.18, 0.08), i * 110)); break;
    default: break;
  }
}

/* ============================================================
   HAPTICS — navigator.vibrate (mobile), com fallback silencioso
   ============================================================ */
function vibrate(kind){
  try{
    if (!navigator.vibrate) return;
    switch(kind){
      case "move":    navigator.vibrate(10); break;
      case "tap":     navigator.vibrate(8); break;
      case "confirm": navigator.vibrate(20); break;
      case "great":   navigator.vibrate([30, 40, 30, 40, 60]); break;
      default: break;
    }
  }catch(e){ /* ignora */ }
}

})();

/* ══════════════════════════════════════════════════════════
   MÚSICA AMBIENTE, Tiago e Gian
   Injeta um <audio> + botão flutuante em qualquer página que
   inclua este script, e guarda o ponto exato (tempo + tocando
   ou não) em localStorage — assim, ao navegar entre as telas
   de jogo, a música continua de onde parou em vez de reiniciar.
══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var STORAGE_KEY = "casamento_bgmusic_v1";
  var SRC = "assets/audio/caruso-instrumental.mp3";
  var VOLUME = 0.35;

  function lerEstado() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function salvarEstado(parcial) {
    try {
      var atual = lerEstado();
      for (var k in parcial) { atual[k] = parcial[k]; }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(atual));
    } catch (e) {}
  }

  function setPlayingUI(btn, tocando) {
    btn.classList.toggle("is-playing", tocando);
    var label = tocando ? "Pausar música" : "Tocar música ambiente";
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }

  function criarElementos() {
    var audio = document.createElement("audio");
    audio.id = "bgMusic";
    audio.src = SRC;
    audio.loop = true;
    audio.preload = "none";
    audio.volume = VOLUME;

    var btn = document.createElement("button");
    btn.id = "musicToggle";
    btn.className = "music-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Tocar música ambiente");
    btn.title = "Tocar música ambiente";
    btn.innerHTML =
      '<svg class="music-toggle__note" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
      '<span class="music-toggle__bars"><span></span><span></span><span></span></span>';

    document.body.appendChild(audio);
    document.body.appendChild(btn);
    return { audio: audio, btn: btn };
  }

  function restaurarEstado(audio, btn) {
    var estado = lerEstado();

    if (typeof estado.tempo === "number" && estado.tempo > 0) {
      audio.addEventListener("loadedmetadata", function () {
        try {
          var dur = audio.duration;
          audio.currentTime = (dur && dur > 0) ? (estado.tempo % dur) : estado.tempo;
        } catch (e) {}
      }, { once: true });
    }

    if (estado.tocando) {
      // Tenta retomar automaticamente. Se o navegador bloquear (sem
      // interação prévia do usuário nesta origem), apenas mantém pausado
      // — o próximo clique no botão volta a tocar normalmente.
      var p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(function () { setPlayingUI(btn, true); })
         .catch(function () { setPlayingUI(btn, false); });
      }
    }
  }

  function ligarEventos(audio, btn) {
    btn.addEventListener("click", function () {
      if (audio.paused) {
        var p = audio.play();
        if (p && typeof p.then === "function") {
          p.then(function () {
            setPlayingUI(btn, true);
            salvarEstado({ tocando: true });
          }).catch(function () {});
        }
      } else {
        audio.pause();
      }
    });

    audio.addEventListener("play", function () {
      setPlayingUI(btn, true);
      salvarEstado({ tocando: true });
    });

    audio.addEventListener("pause", function () {
      setPlayingUI(btn, false);
      salvarEstado({ tocando: false, tempo: audio.currentTime });
    });

    // Salva o tempo periodicamente, pra sobreviver a navegação entre páginas
    setInterval(function () {
      if (!audio.paused) salvarEstado({ tempo: audio.currentTime });
    }, 1000);

    // Última garantia ao trocar de página/fechar a aba
    window.addEventListener("pagehide", function () {
      salvarEstado({ tempo: audio.currentTime, tocando: !audio.paused });
    });
  }

  function iniciar() {
    if (document.getElementById("bgMusic")) return; // já existe nesta página
    var els = criarElementos();
    restaurarEstado(els.audio, els.btn);
    ligarEventos(els.audio, els.btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();

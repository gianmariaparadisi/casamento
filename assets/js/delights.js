/* ══════════════════════════════════════════════════════════
   DELIGHTS — pequenos easter eggs e microinterações
   Script compartilhado, carregado em todas as páginas.
══════════════════════════════════════════════════════════ */
(function () {

  /* ---------- Helpers de confete / corações ---------- */

  function injectKeyframesOnce() {
    if (document.getElementById("delightsKeyframes")) return;
    const style = document.createElement("style");
    style.id = "delightsKeyframes";
    style.textContent = `
      @keyframes delightsFall {
        0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
        100% { transform: translateY(110vh) rotate(360deg); opacity: .85; }
      }
      @keyframes delightsPop {
        0%   { transform: translate(-50%,-50%) scale(.3); opacity: 0; }
        30%  { transform: translate(-50%,-60%) scale(1.15); opacity: 1; }
        100% { transform: translate(-50%,-120%) scale(.8); opacity: 0; }
      }
      @keyframes delightsWiggle {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-8deg); }
        50% { transform: rotate(6deg); }
        75% { transform: rotate(-4deg); }
      }
      @keyframes delightsBounce {
        0%   { transform: scale(1); }
        30%  { transform: scale(1.35) rotate(-6deg); }
        55%  { transform: scale(.9) rotate(4deg); }
        100% { transform: scale(1); }
      }
      @keyframes delightsShake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(6px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
      }
      @keyframes delightsGlow {
        0%   { box-shadow: 0 0 0 rgba(212,175,90,0); }
        40%  { box-shadow: 0 0 28px 8px rgba(212,175,90,.55); }
        100% { box-shadow: 0 0 0 rgba(212,175,90,0); }
      }
      @keyframes delightsFloatHeart {
        0%   { transform: translate(-50%,-50%) scale(.4); opacity: 0; }
        25%  { transform: translate(-50%,-90%) scale(1.1); opacity: 1; }
        100% { transform: translate(-50%,-180%) scale(.7); opacity: 0; }
      }
      @keyframes delightsTwinkle {
        0%, 100% { opacity: .25; transform: scale(.85); }
        50% { opacity: 1; transform: scale(1.15); }
      }
      @keyframes delightsBirdFly {
        0%   { transform: translate(-10vw, 0) scale(1); opacity: 0; }
        8%   { opacity: 1; }
        50%  { transform: translate(55vw, -14vh) scale(1) rotate(4deg); }
        92%  { opacity: 1; }
        100% { transform: translate(120vw, -6vh) scale(1); opacity: 0; }
      }
      @keyframes delightsElastic {
        0%   { transform: scale(1); }
        40%  { transform: scale(1.18); }
        100% { transform: scale(1); }
      }
      @keyframes delightsScrollTopIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .delights-confetti-wrap {
        position: fixed; inset: 0; pointer-events: none; z-index: 9999; overflow: hidden;
      }
      .delights-confetti-piece {
        position: absolute; top: -10%; object-fit: contain;
        animation-name: delightsFall; animation-timing-function: linear; animation-fill-mode: forwards;
      }
      .delights-trail-piece {
        position: fixed; pointer-events: none; z-index: 9998;
      }
      .delights-pop {
        position: fixed; pointer-events: none; z-index: 9999;
        animation: delightsPop .9s ease-out forwards;
      }
      .delights-float-heart {
        position: fixed; pointer-events: none; z-index: 9999;
        animation: delightsFloatHeart 1.1s ease-out forwards;
      }
      .delights-shake { animation: delightsShake .4s ease-in-out; }
      .delights-glow { animation: delightsGlow 1.4s ease-out; }
      .delights-bounce { animation: delightsBounce .5s ease-in-out; }
      .delights-wiggle { animation: delightsWiggle .5s ease-in-out; }
      @keyframes delightsToastClink {
        0%   { transform: rotate(0deg) scale(1); filter: brightness(1); }
        20%  { transform: rotate(-18deg) scale(1.1); filter: brightness(1.5); }
        40%  { transform: rotate(14deg) scale(1.08); filter: brightness(1.3); }
        60%  { transform: rotate(-8deg) scale(1.04); filter: brightness(1.15); }
        100% { transform: rotate(0deg) scale(1); filter: brightness(1); }
      }
      @keyframes delightsToastSparkle {
        0%   { opacity: 0; transform: translate(-50%,-50%) scale(.3); }
        40%  { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%,-50%) scale(1.4); }
      }
      .delights-toast-clink { animation: delightsToastClink .7s ease-in-out; }
      .delights-toast-sparkle {
        position: fixed; pointer-events: none; z-index: 9999;
        animation: delightsToastSparkle .6s ease-out forwards;
      }

      .delights-bird {
        position: fixed; top: 18vh; left: 0; width: 56px; height: 56px;
        object-fit: contain; pointer-events: none; z-index: 9998;
        animation: delightsBirdFly 9s linear forwards;
      }

      .delights-scrolltop {
        position: fixed; right: 1.1rem; bottom: 1.1rem; z-index: 60;
        width: 2.75rem; height: 2.75rem; border-radius: 50%;
        background: var(--white); border: 1.5px solid var(--line-green);
        box-shadow: var(--shadow-green);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; opacity: 0; pointer-events: none;
        transition: opacity .3s ease, transform .3s ease;
      }
      .delights-scrolltop.visible {
        opacity: .9; pointer-events: auto;
        animation: delightsScrollTopIn .3s ease;
      }
      .delights-scrolltop:hover { opacity: 1; transform: translateY(-2px); }
      .delights-scrolltop svg { width: 1.2rem; height: 1.2rem; color: var(--sage-dark); }

      .delights-progress {
        position: fixed; top: 0; left: 0; height: 3px; width: 0%;
        background: linear-gradient(90deg, var(--sage), var(--terracotta));
        z-index: 101; transition: width .1s linear;
      }

      .delights-input-check {
        position: absolute; right: .85rem; top: 50%; transform: translateY(-50%);
        width: 1.2rem; height: 1.2rem; opacity: 0; transition: opacity .25s ease;
        pointer-events: none;
      }
      .delights-input-check.visible { opacity: 1; }
      .delights-input-wrap { position: relative; flex: 1; display: flex; }
      .delights-input-wrap .rsvp__input,
      .delights-input-wrap input { flex: 1; width: 100%; padding-right: 2.4rem; }

      .delights-pull-indicator {
        position: fixed; top: 0; left: 50%; transform: translate(-50%,-100%);
        z-index: 102; pointer-events: none;
        width: 2.5rem; height: 2.5rem; opacity: 0;
        transition: opacity .15s ease;
      }
      .delights-pull-indicator img { width: 100%; height: 100%; object-fit: contain; }
      .delights-pull-indicator.visible { opacity: 1; }

      .delights-stars {
        position: fixed; inset: 0; pointer-events: none; z-index: 5; overflow: hidden;
      }
      .delights-star {
        position: absolute; border-radius: 50%; background: #fff;
        animation: delightsTwinkle 2.4s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  function confettiBurst(opts) {
    injectKeyframesOnce();
    const { count = 16, originX = null, originY = null, spread = 100, hearts = false } = opts || {};
    const wrap = document.createElement("div");
    wrap.className = "delights-confetti-wrap";
    for (let i = 0; i < count; i++) {
      const img = document.createElement("img");
      img.className = "delights-confetti-piece";
      img.alt = "";
      if (hearts && i % 3 === 0) {
        img.src = "assets/img/icon-heart-full.png";
      } else {
        const piece = String((i % 12) + 1).padStart(2, "0");
        img.src = `assets/img/confetti-piece-${piece}.png`;
      }
      const size = 12 + Math.random() * 16;
      img.style.width = size + "px";
      img.style.height = size + "px";
      if (originX !== null) {
        img.style.left = `calc(${originX}px + ${(Math.random() - 0.5) * spread}px)`;
        img.style.top = (originY || 0) + "px";
      } else {
        img.style.left = Math.random() * 100 + "vw";
      }
      const duration = 2 + Math.random() * 1.6;
      const delay = Math.random() * 0.4;
      img.style.animationDuration = duration + "s";
      img.style.animationDelay = delay + "s";
      wrap.appendChild(img);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 4500);
  }
  window.delightsConfetti = confettiBurst;

  // Pequeno "pop" no ponto clicado (confete/folha/coração)
  function spawnPop(x, y, src, size) {
    injectKeyframesOnce();
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.className = "delights-pop";
    img.style.left = x + "px";
    img.style.top = y + "px";
    img.style.width = (size || 28) + "px";
    img.style.height = (size || 28) + "px";
    img.style.transform = "translate(-50%,-50%)";
    document.body.appendChild(img);
    setTimeout(() => img.remove(), 950);
  }

  // Pequenos corações saindo do ponto clicado (efeito "double-tap like")
  function spawnHeartFlash(x, y, opts) {
    injectKeyframesOnce();
    const { count = 5, spread = 60 } = opts || {};
    for (let i = 0; i < count; i++) {
      const img = document.createElement("img");
      img.src = "assets/img/icon-heart-full.png";
      img.alt = "";
      img.className = "delights-float-heart";
      const offsetX = (Math.random() - 0.5) * spread;
      const offsetYStart = (Math.random() - 0.5) * (spread * 0.4);
      const size = 14 + Math.random() * 16;
      img.style.left = (x + offsetX) + "px";
      img.style.top = (y + offsetYStart) + "px";
      img.style.width = size + "px";
      img.style.height = size + "px";
      img.style.animationDelay = (Math.random() * 0.35) + "s";
      img.style.animationDuration = (0.9 + Math.random() * 0.5) + "s";
      document.body.appendChild(img);
      setTimeout(() => img.remove(), 1700);
    }
  }
  window.delightsHeartFlash = spawnHeartFlash;

  // Coordenadas do ponteiro, funciona tanto para click (mouse/touch) quanto
  // para eventos touch puros, caso necessário
  function getPointerXY(e) {
    if (typeof e.clientX === "number" && (e.clientX !== 0 || e.clientY !== 0)) {
      return { x: e.clientX, y: e.clientY };
    }
    const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    if (touch) return { x: touch.clientX, y: touch.clientY };
    return { x: e.clientX || 0, y: e.clientY || 0 };
  }

  /* ---------- 1. Passarinho cruzando a tela (raro) ---------- */
  function maybeFlyBird() {
    // ~1.5% de chance por carregamento de página
    if (Math.random() > 0.015) return;
    injectKeyframesOnce();
    const img = document.createElement("img");
    img.src = "assets/img/icon-bird.png";
    img.alt = "";
    img.className = "delights-bird";
    img.style.top = (10 + Math.random() * 25) + "vh";
    document.body.appendChild(img);
    setTimeout(() => img.remove(), 9300);
  }

  /* ---------- 2. Trail de folhinhas ao ficar idle ---------- */
  function initIdleLeafTrail() {
    injectKeyframesOnce();
    let idleTimer = null;
    let lastX = 0, lastY = 0;
    let trailActive = false;

    function spawnLeaf() {
      const img = document.createElement("img");
      img.src = "assets/img/icon-leaf-branch.png";
      img.alt = "";
      img.style.position = "fixed";
      img.style.left = (lastX - 14 + (Math.random() - 0.5) * 30) + "px";
      img.style.top = (lastY - 14 + (Math.random() - 0.5) * 30) + "px";
      img.style.width = "26px";
      img.style.height = "26px";
      img.style.opacity = ".55";
      img.style.pointerEvents = "none";
      img.style.zIndex = "9997";
      img.style.transition = "opacity 1.4s ease, transform 1.4s ease";
      img.style.transform = "translateY(0) rotate(0deg)";
      document.body.appendChild(img);
      requestAnimationFrame(() => {
        img.style.opacity = "0";
        img.style.transform = `translateY(40px) rotate(${(Math.random() - 0.5) * 90}deg)`;
      });
      setTimeout(() => img.remove(), 1500);
    }

    let leafInterval = null;
    function startTrail() {
      if (trailActive) return;
      trailActive = true;
      let count = 0;
      leafInterval = setInterval(() => {
        spawnLeaf();
        count++;
        if (count >= 4) { clearInterval(leafInterval); trailActive = false; }
      }, 350);
    }

    function resetIdle() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(startTrail, 2200);
    }

    document.addEventListener("mousemove", (e) => {
      lastX = e.clientX; lastY = e.clientY;
      resetIdle();
    }, { passive: true });

    resetIdle();
  }

  /* ---------- 2b. Pequenas partículas ao rolar (mobile-friendly) ---------- */
  function initScrollDelights() {
    injectKeyframesOnce();
    let lastY = window.scrollY;
    let lastSpawn = 0;
    const particles = ["assets/img/icon-leaf-branch.png", "assets/img/icon-sparkle.png", "assets/img/confetti-piece-03.png"];

    window.addEventListener("scroll", () => {
      const now = Date.now();
      const currentY = window.scrollY;
      const delta = Math.abs(currentY - lastY);
      lastY = currentY;

      // só dispara ocasionalmente, em scrolls com algum "impulso", com intervalo mínimo
      if (delta < 18) return;
      if (now - lastSpawn < 900) return;
      if (Math.random() > 0.18) return; // raro: ~18% dos scrolls "fortes"
      lastSpawn = now;

      const src = particles[Math.floor(Math.random() * particles.length)];
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.style.position = "fixed";
      img.style.left = (10 + Math.random() * 80) + "vw";
      img.style.top = (15 + Math.random() * 50) + "vh";
      const size = 16 + Math.random() * 14;
      img.style.width = size + "px";
      img.style.height = size + "px";
      img.style.opacity = ".6";
      img.style.pointerEvents = "none";
      img.style.zIndex = "40";
      img.style.transition = "opacity 1.1s ease, transform 1.1s ease";
      img.style.transform = "translateY(0) rotate(0deg) scale(1)";
      document.body.appendChild(img);
      requestAnimationFrame(() => {
        img.style.opacity = "0";
        img.style.transform = `translateY(${30 + Math.random()*30}px) rotate(${(Math.random()-0.5)*120}deg) scale(.7)`;
      });
      setTimeout(() => img.remove(), 1200);
    }, { passive: true });
  }

  /* ---------- 2c. Brilho sutil nos divisores ao entrarem na tela ---------- */
  function initDividerShimmer() {
    injectKeyframesOnce();
    const dividers = document.querySelectorAll(".divider-wrap img, .flourish-wrap img");
    if (!dividers.length || !("IntersectionObserver" in window)) return;
    const seen = new WeakSet();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !seen.has(entry.target)) {
          seen.add(entry.target);
          const el = entry.target;
          el.style.transition = "opacity .9s ease, filter .9s ease";
          const originalOpacity = el.style.opacity || "";
          el.style.filter = "drop-shadow(0 0 0 transparent)";
          requestAnimationFrame(() => {
            el.style.filter = "drop-shadow(0 0 10px rgba(212,175,90,.45))";
            setTimeout(() => { el.style.filter = ""; }, 900);
          });
        }
      });
    }, { threshold: 0.4 });
    dividers.forEach(d => observer.observe(d));
  }

  /* ---------- 3. Confete em marcos do countdown ---------- */
  function initCountdownMilestones() {
    const el = document.getElementById("cd-dias");
    if (!el) return;
    const milestones = [100, 50, 30, 7, 1];
    const storageKey = "delights_countdown_seen";

    function check() {
      const dias = parseInt(el.textContent, 10);
      if (isNaN(dias)) return;
      if (!milestones.includes(dias)) return;
      let seen = [];
      try { seen = JSON.parse(sessionStorage.getItem(storageKey) || "[]"); } catch (e) {}
      if (seen.includes(dias)) return;
      seen.push(dias);
      try { sessionStorage.setItem(storageKey, JSON.stringify(seen)); } catch (e) {}

      // Banner discreto
      const banner = document.createElement("div");
      banner.style.position = "fixed";
      banner.style.top = "5.5rem";
      banner.style.left = "50%";
      banner.style.transform = "translateX(-50%) translateY(-12px)";
      banner.style.background = "var(--white)";
      banner.style.border = "1px solid var(--line-green)";
      banner.style.boxShadow = "var(--shadow-green)";
      banner.style.borderRadius = "999px";
      banner.style.padding = ".6rem 1.4rem";
      banner.style.fontSize = ".82rem";
      banner.style.fontWeight = "600";
      banner.style.color = "var(--sage-dark)";
      banner.style.zIndex = "200";
      banner.style.opacity = "0";
      banner.style.transition = "opacity .4s ease, transform .4s ease";
      banner.style.textAlign = "center";
      const label = dias === 1
        ? (window.I18N && window.I18N.lang === "it" ? "É domani! 🎉" : "É amanhã! 🎉")
        : (window.I18N && window.I18N.lang === "it" ? `Mancano ${dias} giorni! 🎉` : `Faltam ${dias} dias! 🎉`);
      banner.textContent = label;
      document.body.appendChild(banner);
      requestAnimationFrame(() => {
        banner.style.opacity = "1";
        banner.style.transform = "translateX(-50%) translateY(0)";
      });
      setTimeout(() => {
        banner.style.opacity = "0";
        banner.style.transform = "translateX(-50%) translateY(-12px)";
        setTimeout(() => banner.remove(), 450);
      }, 3200);

      confettiBurst({ count: 22, hearts: true });
    }

    // o countdown é atualizado a cada segundo pelo app.js; verificamos periodicamente
    setInterval(check, 1000);
    check();
  }

  // Mostra/escode um check verde dentro de um input (wrap automático em .delights-input-wrap)
  function setInputCheck(input, visible) {
    if (!input) return;
    let wrap = input.parentElement;
    if (!wrap || !wrap.classList.contains("delights-input-wrap")) {
      wrap = document.createElement("div");
      wrap.className = "delights-input-wrap";
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
    }
    let check = wrap.querySelector(".delights-input-check");
    if (!check) {
      check = document.createElement("img");
      check.src = "assets/img/icon-check-decorative.png";
      check.alt = "";
      check.className = "delights-input-check";
      wrap.appendChild(check);
    }
    check.classList.toggle("visible", !!visible);
  }
  window.delightsSetInputCheck = setInputCheck;

  /* ---------- 3b. Tap nos números do countdown → bounce ---------- */
  function initCountdownTapBounce() {
    document.querySelectorAll(".countdown__item").forEach(item => {
      item.style.cursor = "pointer";
      item.addEventListener("click", () => {
        const num = item.querySelector(".countdown__num");
        if (!num) return;
        num.classList.remove("delights-bounce");
        requestAnimationFrame(() => num.classList.add("delights-bounce"));
        setTimeout(() => num.classList.remove("delights-bounce"), 550);
      });
    });
  }

  /* ---------- 4. Duplo clique/tap no monograma → modo festa ---------- */
  function initLogoPartyMode() {
    const logos = document.querySelectorAll(".nav__logo-wrap");
    logos.forEach(logo => {
      let lastTap = 0;
      logo.addEventListener("click", (e) => {
        const now = Date.now();
        if (now - lastTap < 400) {
          e.preventDefault();
          confettiBurst({ count: 40, hearts: true });
        } else {
          // clique único: wiggle + coração subindo
          const img = logo.querySelector("img");
          if (img) {
            img.classList.remove("delights-wiggle");
            requestAnimationFrame(() => img.classList.add("delights-wiggle"));
          }
          const rect = logo.getBoundingClientRect();
          spawnPop(rect.left + rect.width / 2, rect.top + rect.height / 2, "assets/img/icon-heart-full.png", 22);
        }
        lastTap = now;
      });
    });
  }

  /* ---------- 5. Cliques em fotos e ícones decorativos ---------- */
  function initImageClicks() {
    // Fotos do site (carrossel, galeria, hero) → flash de corações
    document.querySelectorAll(".site-img, .carrossel__slide img, .photo-strip__item img, .photo-pair__item img").forEach(img => {
      img.dataset.delightsBound = "1";
      img.dataset.delightsKind = "heart";
    });

    // Ícones decorativos pequenos (não dentro de botões/links com função própria)
    document.querySelectorAll("img[src*='assets/img/icon-']").forEach(img => {
      if (img.closest("a, button")) return;
      if (img.dataset.delightsBound) return;
      img.dataset.delightsBound = "1";
      img.dataset.delightsKind = "pop";
    });

    // Demais imagens estáticas também recebem reação leve
    document.querySelectorAll("img").forEach(img => {
      if (img.dataset.delightsBound) return;
      if (img.closest("a, button")) return;
      img.dataset.delightsBound = "1";
      img.dataset.delightsKind = "pop";
    });

    // Handler delegado em document: cobre tanto as imagens já marcadas quanto
    // qualquer imagem adicionada dinamicamente depois (resultados de busca,
    // modal de presentes, avatares etc.)
    document.addEventListener("click", (e) => {
      const img = e.target.closest("img");
      if (!img) return;
      if (img.closest("a, button")) return;
      if (img.dataset.delightsNoReact) return;

      const kind = img.dataset.delightsKind ||
        (img.matches(".site-img, .carrossel__slide img, .photo-strip__item img, .photo-pair__item img") ? "heart" : "pop");

      if (kind === "heart") {
        const p = getPointerXY(e);
        spawnHeartFlash(p.x, p.y, { count: 50, spread: 160 });
      } else {
        const rect = img.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const pieces = ["assets/img/confetti-piece-02.png","assets/img/confetti-piece-07.png","assets/img/icon-leaf-branch.png","assets/img/icon-sparkle.png"];
        const src = pieces[Math.floor(Math.random() * pieces.length)];
        spawnPop(x, y, src, 22);
      }
    });

    // Aplica cursor pointer via CSS para todas as imagens não-interativas
    if (!document.getElementById("delightsCursorStyle")) {
      const style = document.createElement("style");
      style.id = "delightsCursorStyle";
      style.textContent = `img:not(a img):not(button img) { cursor: pointer; }`;
      document.head.appendChild(style);
    }
  }

  /* ---------- 5b. Tap no ícone de welcome drink → tilintar ---------- */
  function initToastClink() {
    document.querySelectorAll("[data-delights-toast]").forEach(img => {
      img.style.cursor = "pointer";
      img.dataset.delightsBound = "1";
      img.dataset.delightsNoReact = "1"; // evita o handler genérico delegado de confete
      img.addEventListener("click", () => {
        img.classList.remove("delights-toast-clink");
        requestAnimationFrame(() => img.classList.add("delights-toast-clink"));
        setTimeout(() => img.classList.remove("delights-toast-clink"), 750);

        // pequenas faíscas/brilhos ao redor
        const rect = img.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        for (let i = 0; i < 5; i++) {
          const spark = document.createElement("img");
          spark.src = "assets/img/icon-sparkle.png";
          spark.alt = "";
          spark.className = "delights-toast-sparkle";
          spark.style.left = (cx + (Math.random() - 0.5) * 40) + "px";
          spark.style.top = (cy + (Math.random() - 0.5) * 40) + "px";
          const s = 10 + Math.random() * 8;
          spark.style.width = s + "px";
          spark.style.height = s + "px";
          spark.style.objectFit = "contain";
          spark.style.animationDelay = (Math.random() * 0.15) + "s";
          document.body.appendChild(spark);
          setTimeout(() => spark.remove(), 800);
        }
      });
    });
  }

  /* ---------- 5d. Confete ao clicar em QUALQUER lugar do site ---------- */
  function initAnywhereConfetti() {
    document.addEventListener("click", (e) => {
      // Não duplica em imagens (já têm seus próprios efeitos) nem em
      // controles interativos (botões, links, inputs, selects) para não
      // interferir no feedback normal da interface.
      if (e.target.closest("img, a, button, input, select, textarea, label, .delights-scrolltop")) return;

      const p = getPointerXY(e);
      confettiBurst({ count: 10, originX: p.x, originY: p.y, spread: 70 });
    });
  }

  /* ---------- 5e. Arrastar/segurar → chuvinha de confete seguindo o dedo/cursor ---------- */
  function initDragConfettiTrail() {
    injectKeyframesOnce();
    let dragging = false;
    let lastSpawn = 0;
    let lastPos = { x: 0, y: 0 };

    function spawnTrailPiece(x, y) {
      const img = document.createElement("img");
      const pieces = ["assets/img/confetti-piece-01.png","assets/img/confetti-piece-04.png",
                       "assets/img/confetti-piece-06.png","assets/img/confetti-piece-09.png",
                       "assets/img/confetti-piece-11.png","assets/img/icon-sparkle.png"];
      img.src = pieces[Math.floor(Math.random() * pieces.length)];
      img.alt = "";
      img.className = "delights-confetti-piece delights-trail-piece";
      const size = 10 + Math.random() * 14;
      img.style.width = size + "px";
      img.style.height = size + "px";
      img.style.left = (x + (Math.random() - 0.5) * 24) + "px";
      img.style.top = (y + (Math.random() - 0.5) * 24) + "px";
      img.style.animationDuration = (1.4 + Math.random() * 1) + "s";
      document.body.appendChild(img);
      setTimeout(() => img.remove(), 2600);
    }

    function maybeSpawn(x, y) {
      const now = Date.now();
      if (now - lastSpawn < 60) return; // limita a frequência
      lastSpawn = now;
      spawnTrailPiece(x, y);
      if (Math.random() < 0.4) spawnTrailPiece(x, y); // às vezes spawna 2
    }

    function start(e) {
      // evita iniciar sobre controles interativos (não interfere com botões etc.)
      if (e.target.closest("a, button, input, select, textarea, label")) return;
      dragging = true;
      const p = getPointerXY(e);
      lastPos = p;
      maybeSpawn(p.x, p.y);
    }
    function move(e) {
      if (!dragging) return;
      const p = getPointerXY(e);
      lastPos = p;
      maybeSpawn(p.x, p.y);
    }
    function end() {
      dragging = false;
    }

    document.addEventListener("mousedown", start);
    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseup", end);

    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("touchend", end, { passive: true });
    document.addEventListener("touchcancel", end, { passive: true });
  }

  /* ---------- 6. Long-press / clique-e-segure em fotos ---------- */
  function initLongPressGlow() {
    injectKeyframesOnce();
    const targets = document.querySelectorAll(".site-img, .carrossel__slide img, .photo-strip__item img, .photo-pair__item img");
    targets.forEach(img => {
      let pressTimer = null;
      const start = () => {
        pressTimer = setTimeout(() => {
          const wrap = img.closest(".carrossel__slide, .photo-strip__item, .photo-pair__item") || img;
          wrap.classList.remove("delights-glow");
          requestAnimationFrame(() => wrap.classList.add("delights-glow"));
          const rect = img.getBoundingClientRect();
          spawnPop(rect.left + rect.width / 2, rect.top + rect.height / 2, "assets/img/icon-heart-full.png", 32);
          setTimeout(() => wrap.classList.remove("delights-glow"), 1500);
        }, 600);
      };
      const cancel = () => clearTimeout(pressTimer);
      img.addEventListener("mousedown", start);
      img.addEventListener("touchstart", start, { passive: true });
      ["mouseup","mouseleave","touchend","touchcancel"].forEach(ev => img.addEventListener(ev, cancel));
    });
  }

  /* ---------- 7. Shake do celular → chuva de confete ---------- */
  function initShakeDetection() {
    if (typeof window.DeviceMotionEvent === "undefined") return;
    let lastShake = 0;
    const threshold = 18; // sensibilidade
    let lastX = null, lastY = null, lastZ = null;

    function handleMotion(e) {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;
      const { x, y, z } = acc;
      if (lastX !== null) {
        const delta = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);
        const now = Date.now();
        if (delta > threshold && now - lastShake > 2500) {
          lastShake = now;
          confettiBurst({ count: 36, hearts: true });
        }
      }
      lastX = x; lastY = y; lastZ = z;
    }

    function enable() {
      window.addEventListener("devicemotion", handleMotion, { passive: true });
    }

    // iOS 13+ exige permissão explícita; pedimos no primeiro toque na página
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      const grant = () => {
        DeviceMotionEvent.requestPermission().then(state => {
          if (state === "granted") enable();
        }).catch(() => {});
        document.removeEventListener("touchend", grant);
      };
      document.addEventListener("touchend", grant, { once: true });
    } else {
      enable();
    }
  }

  /* ---------- 8. Pull-to-refresh customizado (mobile) ---------- */
  function initPullToRefresh() {
    if (!("ontouchstart" in window)) return;
    injectKeyframesOnce();
    const indicator = document.createElement("div");
    indicator.className = "delights-pull-indicator";
    indicator.innerHTML = '<img src="assets/img/icon-heart-full.png" alt="">';
    document.body.appendChild(indicator);

    let startY = null;
    let pulling = false;

    document.addEventListener("touchstart", (e) => {
      if (window.scrollY <= 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      } else {
        pulling = false;
      }
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
      if (!pulling || startY === null) return;
      const diff = e.touches[0].clientY - startY;
      if (diff > 10 && window.scrollY <= 0) {
        const dist = Math.min(diff, 90);
        indicator.style.transform = `translate(-50%, ${dist - 40}px) scale(${0.6 + dist / 90 * 0.6})`;
        indicator.classList.add("visible");
        if (dist > 70) {
          indicator.classList.add("delights-elastic");
        } else {
          indicator.classList.remove("delights-elastic");
        }
      }
    }, { passive: true });

    document.addEventListener("touchend", () => {
      if (!pulling) return;
      indicator.classList.remove("visible", "delights-elastic");
      indicator.style.transform = "translate(-50%,-100%)";
      pulling = false;
      startY = null;
    }, { passive: true });
  }

  /* ---------- 9. Scroll progress bar ---------- */
  function initScrollProgress() {
    const bar = document.createElement("div");
    bar.className = "delights-progress";
    document.body.appendChild(bar);
    function update() {
      const h = document.documentElement;
      const scrollTop = h.scrollTop || document.body.scrollTop;
      const scrollHeight = h.scrollHeight - h.clientHeight;
      const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      bar.style.width = pct + "%";
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- 10. Botão "Voltar ao topo" ---------- */
  function initBackToTop() {
    const btn = document.createElement("button");
    btn.className = "delights-scrolltop";
    btn.setAttribute("aria-label", window.I18N && window.I18N.lang === "it" ? "Torna in alto" : "Voltar ao topo");
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
    document.body.appendChild(btn);

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      btn.classList.remove("delights-bounce");
      requestAnimationFrame(() => btn.classList.add("delights-bounce"));
      setTimeout(() => btn.classList.remove("delights-bounce"), 550);
      const rect = btn.getBoundingClientRect();
      spawnPop(rect.left + rect.width / 2, rect.top + rect.height / 2, "assets/img/icon-leaf-branch.png", 22);
    });

    window.addEventListener("scroll", () => {
      btn.classList.toggle("visible", window.scrollY > 600);
    }, { passive: true });
  }

  /* ---------- Init geral ---------- */
  function init() {
    injectKeyframesOnce();
    maybeFlyBird();
    initIdleLeafTrail();
    initScrollDelights();
    initDividerShimmer();
    initCountdownMilestones();
    initCountdownTapBounce();
    initLogoPartyMode();
    initToastClink();
    initImageClicks();
    initAnywhereConfetti();
    initDragConfettiTrail();
    initLongPressGlow();
    initShakeDetection();
    initPullToRefresh();
    initScrollProgress();
    initBackToTop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

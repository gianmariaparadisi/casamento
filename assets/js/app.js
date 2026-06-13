/* ═══════════════════════════════════════════════════════════
   GIAN & TIAGO — app.js v2
═══════════════════════════════════════════════════════════ */
"use strict";

/* ── CONFIGURAÇÃO ─────────────────────────────────────────── */
const API_URL       = "https://script.google.com/macros/s/AKfycbyYyCrT2oNLYDLcXDWq8X2b9Y0u0EbmQ7pUnpdRA3g0wZNUDtX0VTNrHq26wIngBwHn/exec";
const PIX_CODE      = "COLE_AQUI_O_CODIGO_PIX_COPIA_E_COLA"; // ← substituir
const EMAIL_CONTATO = "casamento.tiagoegian@gmail.com";
const DATA_LIMITE_ALTERACAO = "12 de agosto de 2026";
const DATA_CASAMENTO = new Date("2026-12-12T16:30:00-03:00");

/* ── ESTADO ───────────────────────────────────────────────── */
let convidadoSelecionado = null; // { nome, telefone, rowId, grupo: [] }

/* ══════════════════════════════════════════════════════════
   1. NAV
══════════════════════════════════════════════════════════ */
(function initNav() {
  const nav       = document.getElementById("nav");
  const hamburger = document.getElementById("hamburger");
  const links     = document.getElementById("navLinks");
  if (!nav) return;

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });

  hamburger.addEventListener("click", () => {
    const aberto = links.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", String(aberto));
  });

  links.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target)) {
      links.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    }
  });
})();

/* ══════════════════════════════════════════════════════════
   2. REVEAL
══════════════════════════════════════════════════════════ */
(function initReveal() {
  const items = document.querySelectorAll(".reveal, .reveal-left, .reveal-right");
  if (!items.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
  items.forEach(el => observer.observe(el));
})();

/* ══════════════════════════════════════════════════════════
   3. CONTAGEM REGRESSIVA
══════════════════════════════════════════════════════════ */
(function initCountdown() {
  const dias = document.getElementById("cd-dias");
  const horas = document.getElementById("cd-horas");
  const min   = document.getElementById("cd-min");
  const seg   = document.getElementById("cd-seg");
  if (!dias) return;

  function atualizar() {
    const agora = new Date();
    const diff  = DATA_CASAMENTO - agora;
    if (diff <= 0) {
      dias.textContent = horas.textContent = min.textContent = seg.textContent = "0";
      return;
    }
    dias.textContent  = Math.floor(diff / 86400000);
    horas.textContent = Math.floor((diff % 86400000) / 3600000);
    min.textContent   = Math.floor((diff % 3600000) / 60000);
    seg.textContent   = Math.floor((diff % 60000) / 1000);
  }

  atualizar();
  setInterval(atualizar, 1000);
})();

/* ══════════════════════════════════════════════════════════
   4. CARROSSEL
   Usa scrollLeft em vez de translateX(%) para evitar
   o bug de zoom no mobile onde o track tem width:max-content
══════════════════════════════════════════════════════════ */
(function initCarrossel() {
  const carrossel = document.getElementById("carrossel");
  const track     = document.getElementById("carrosselTrack");
  const dotsEl    = document.getElementById("carrosselDots");
  if (!track || !carrossel) return;

  const slides = track.querySelectorAll(".carrossel__slide");
  let atual = 0;
  let timer;
  let isScrolling = false;

  // Garantir que cada slide ocupa exatamente 100% do container
  function ajustarSlides() {
    const w = carrossel.clientWidth;
    slides.forEach(s => {
      s.style.minWidth = w + "px";
      s.style.width    = w + "px";
    });
  }
  ajustarSlides();
  window.addEventListener("resize", () => { ajustarSlides(); irPara(atual); });

  // Criar dots
  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "carrossel__dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `Foto ${i + 1}`);
    dot.addEventListener("click", () => { irPara(i); pararTimer(); iniciarTimer(); });
    dotsEl.appendChild(dot);
  });

  function irPara(idx) {
    atual = (idx + slides.length) % slides.length;
    const w = carrossel.clientWidth;
    // Usar scrollLeft — sem depender de transform nem de %
    track.style.transform = `translateX(-${atual * w}px)`;
    dotsEl.querySelectorAll(".carrossel__dot").forEach((d, i) => {
      d.classList.toggle("active", i === atual);
    });
  }

  function avancar() { irPara(atual + 1); }
  function iniciarTimer() { timer = setInterval(avancar, 4500); }
  function pararTimer()   { clearInterval(timer); }

  iniciarTimer();
  carrossel.addEventListener("mouseenter", pararTimer);
  carrossel.addEventListener("mouseleave", iniciarTimer);

  // Touch swipe no carrossel
  let touchStartX = 0;
  carrossel.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
    pararTimer();
  }, { passive: true });
  carrossel.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) irPara(atual + (dx < 0 ? 1 : -1));
    iniciarTimer();
  }, { passive: true });

  window.moverCarrossel = function(dir) {
    irPara(atual + dir);
    pararTimer();
    iniciarTimer();
  };
})();

/* ══════════════════════════════════════════════════════════
   5. RSVP — BUSCA
══════════════════════════════════════════════════════════ */
window.buscar = async function() {
  const input     = document.getElementById("nomeBusca");
  const nome      = (input?.value || "").trim();
  const btnBuscar = document.getElementById("btnBuscar");
  const resultado = document.getElementById("rsvp-resultado");
  if (!resultado) return;

  if (!nome) {
    setHint("Digite seu nome para buscar.", "info");
    input?.focus();
    return;
  }

  btnBuscar.disabled = true;
  btnBuscar.innerHTML = '<span class="spinner"></span>';
  resultado.innerHTML = "";
  resultado.classList.add("oculto");

  try {
    const resp  = await fetch(`${API_URL}?nome=${encodeURIComponent(nome)}`);
    const dados = await resp.json();

    btnBuscar.disabled = false;
    btnBuscar.textContent = "Buscar";

    if (!dados || (Array.isArray(dados) && dados.length === 0)) {
      resultado.classList.remove("oculto");
      resultado.innerHTML = `
        <p class="rsvp__msg rsvp__msg--info">
          Hmmmm... não encontramos esse nome... já sabe né...<br>
          <strong>BRINCADEIRINHA!</strong> 😄<br>
          Tente pelo primeiro nome ou sobrenome.<br>
          Ainda com dificuldades? Fale com a assessoria: <strong>(14) 99189-8540</strong>
        </p>`;
      return;
    }

    const lista = Array.isArray(dados) ? dados : [dados];
    resultado.classList.remove("oculto");
    resultado.innerHTML = `<p class="rsvp__hint" style="margin-bottom:.75rem">Encontramos ${lista.length > 1 ? lista.length + " nomes" : "1 nome"}. Selecione o seu:</p>`;

    lista.forEach(item => {
      const statusLabel = item.status
        ? `<span class="convidado__badge ${item.status === "Confirmado" ? "convidado__badge--sim" : "convidado__badge--nao"}">${item.status}</span>`
        : "";
      const card = document.createElement("div");
      card.className = "convidado__card";
      card.innerHTML = `
        <div class="convidado__info">
          <p class="convidado__nome">${escHtml(item.nome)} ${statusLabel}</p>
          <p class="convidado__tel">${item.telefone ? "Tel: " + escHtml(item.telefone) : '<em style="color:var(--sage)">Telefone não cadastrado</em>'}</p>
        </div>
        <button class="btn btn--outline btn--sm" type="button">Selecionar</button>`;
      card.querySelector("button").addEventListener("click", () => selecionarConvidado(item, lista));
      resultado.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    btnBuscar.disabled = false;
    btnBuscar.textContent = "Buscar";
    resultado.classList.remove("oculto");
    resultado.innerHTML = `
      <p class="rsvp__msg rsvp__msg--erro">
        Não conseguimos buscar agora. Tente em alguns minutos ou escreva para
        <a href="mailto:${EMAIL_CONTATO}" style="color:var(--terracotta-hover)">${EMAIL_CONTATO}</a>.
      </p>`;
  }
};

/* ══════════════════════════════════════════════════════════
   6. RSVP — SELEÇÃO + FORMULÁRIO
══════════════════════════════════════════════════════════ */
function selecionarConvidado(item, todosDaBusca) {
  convidadoSelecionado = item;
  const resultado = document.getElementById("rsvp-resultado");

  // Filtra outros do mesmo grupo (exclui o próprio)
  const grupo = (todosDaBusca || []).filter(p => p.grupo && p.grupo === item.grupo && p.rowId !== item.rowId);
  const temGrupo = grupo.length > 0;
  const semTelefone = !item.telefone || item.telefone === "****";

  resultado.innerHTML = `
    <div class="rsvp__form" id="rsvpForm">

      <div style="padding:.75rem 1rem;background:var(--bg-green);border-radius:var(--radius);border:1px solid var(--line-green)">
        <p style="font-size:.85rem;color:var(--sage-dark)">
          Confirmando: <strong>${escHtml(item.nome)}</strong>
          ${item.telefone ? "· Tel: " + escHtml(item.telefone) : ""}
        </p>
        <button type="button" style="font-size:.75rem;color:var(--sage);text-decoration:underline;margin-top:.25rem;background:none;border:none;cursor:pointer" onclick="voltarBusca()">← Buscar outro nome</button>
      </div>

      ${semTelefone ? `
      <div class="rsvp__field">
        <label class="rsvp__label" for="telefoneCad">Seu telefone (WhatsApp)</label>
        <input type="tel" id="telefoneCad" class="rsvp__input" placeholder="(11) 99999-0000" inputmode="tel" autocomplete="tel" />
        <p class="rsvp__hint">Não encontramos um telefone cadastrado para você. Informe para facilitar o contato.</p>
      </div>
      ` : `
      <div class="rsvp__field">
        <label class="rsvp__label" for="ultimos4">Últimos 4 dígitos do seu telefone</label>
        <input type="tel" id="ultimos4" class="rsvp__input" maxlength="4" inputmode="numeric" placeholder="0000" autocomplete="off" />
        <p class="rsvp__hint">Confirme o número cadastrado para segurança.</p>
      </div>
      `}

      <div class="rsvp__field">
        <label class="rsvp__label" for="emailRsvp">Seu e-mail</label>
        <input type="email" id="emailRsvp" class="rsvp__input" placeholder="seuemail@exemplo.com" autocomplete="email" />
        <p class="rsvp__hint">Enviaremos a confirmação e o link para alterar depois, se precisar.</p>
      </div>

      <div class="rsvp__field">
        <span class="rsvp__label" id="statusLabel">Sua presença</span>
        <div class="rsvp__status" role="group" aria-labelledby="statusLabel">
          <label class="rsvp__status-option">
            <input type="radio" name="statusRsvp" value="SIM" checked />
            ✓ Confirmo presença
          </label>
          <label class="rsvp__status-option">
            <input type="radio" name="statusRsvp" value="NAO" />
            ✕ Não poderei comparecer
          </label>
        </div>
      </div>

      ${temGrupo ? `
      <div class="rsvp__field">
        <span class="rsvp__label">Confirmar também para o seu grupo?</span>
        <p class="rsvp__hint" style="margin-bottom:.6rem">Você pode confirmar para os outros do seu grupo agora, ou deixar que cada um confirme individualmente.</p>
        <div class="grupo__lista" id="grupoLista">
          ${grupo.map(p => `
            <label class="grupo__membro">
              <input type="checkbox" name="grupo" value="${escHtml(p.rowId)}" data-nome="${escHtml(p.nome)}" />
              <span class="grupo__membro-nome">${escHtml(p.nome)}</span>
              ${p.status ? `<span class="grupo__membro-status">${escHtml(p.status)}</span>` : ""}
            </label>
          `).join("")}
        </div>
      </div>
      ` : ""}

      <div id="rsvpErro"></div>

      <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:.25rem">
        <button class="btn btn--primary" type="button" id="btnConfirmar" onclick="confirmar()">Confirmar</button>
        <button class="btn btn--outline" type="button" onclick="voltarBusca()">Voltar</button>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════
   7. RSVP — ENVIO
══════════════════════════════════════════════════════════ */
window.confirmar = async function() {
  const semTelefone = !convidadoSelecionado?.telefone || convidadoSelecionado?.telefone === "****";
  const ultimos4    = semTelefone ? null : (document.getElementById("ultimos4")?.value || "").replace(/\D/g, "");
  const telefoneCad = semTelefone ? (document.getElementById("telefoneCad")?.value || "").trim() : null;
  const email       = (document.getElementById("emailRsvp")?.value || "").trim();
  const statusEl    = document.querySelector('input[name="statusRsvp"]:checked');
  const status      = statusEl ? statusEl.value : "SIM";
  const erroDiv     = document.getElementById("rsvpErro");
  const btnConf     = document.getElementById("btnConfirmar");

  erroDiv.innerHTML = "";

  // Validações
  if (!semTelefone && ultimos4.length !== 4) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Digite os 4 últimos dígitos do telefone.</p>`;
    document.getElementById("ultimos4")?.focus();
    return;
  }
  if (semTelefone && telefoneCad && telefoneCad.replace(/\D/g, "").length < 8) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Digite um telefone válido.</p>`;
    document.getElementById("telefoneCad")?.focus();
    return;
  }
  if (!email || !email.includes("@")) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Digite um e-mail válido.</p>`;
    document.getElementById("emailRsvp")?.focus();
    return;
  }

  // Membros do grupo selecionados
  const grupoChecks = document.querySelectorAll('input[name="grupo"]:checked');
  const grupoRowIds = Array.from(grupoChecks).map(c => c.value);
  const grupoNomes  = Array.from(grupoChecks).map(c => c.dataset.nome);

  btnConf.disabled = true;
  btnConf.innerHTML = '<span class="spinner"></span> Enviando…';

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action:       "rsvp",
        nome:         convidadoSelecionado.nome,
        rowId:        convidadoSelecionado.rowId,
        ultimos4:     ultimos4,
        semTelefone:  semTelefone,
        telefoneCad:  telefoneCad,
        email:        email,
        status:       status,
        grupoRowIds:  grupoRowIds,
        grupoNomes:   grupoNomes,
        grupoStatus:  status  // aplica mesmo status para o grupo
      })
    });

    const json = await resp.json();

    if (json.sucesso) {
      mostrarSucessoRsvp(email, status, grupoNomes);
    } else if (json.erro === "telefone_incorreto") {
      btnConf.disabled = false;
      btnConf.textContent = "Confirmar";
      erroDiv.innerHTML = `
        <p class="rsvp__msg rsvp__msg--erro">
          Os últimos 4 dígitos não conferem.<br>
          Verifique e tente novamente, ou escreva para
          <a href="mailto:${EMAIL_CONTATO}" style="color:var(--terracotta-hover)">${EMAIL_CONTATO}</a>.
        </p>`;
    } else {
      throw new Error(json.erro || "erro");
    }

  } catch (err) {
    console.error(err);
    btnConf.disabled = false;
    btnConf.textContent = "Confirmar";
    erroDiv.innerHTML = `
      <p class="rsvp__msg rsvp__msg--erro">
        Não conseguimos registrar. Tente novamente ou escreva para
        <a href="mailto:${EMAIL_CONTATO}" style="color:var(--terracotta-hover)">${EMAIL_CONTATO}</a>.
      </p>`;
  }
};

/* ══════════════════════════════════════════════════════════
   8. RSVP — SUCESSO
══════════════════════════════════════════════════════════ */
function mostrarSucessoRsvp(email, status, grupoNomes) {
  const resultado  = document.getElementById("rsvp-resultado");
  const confirmado = status === "SIM";
  const grupoMsg   = grupoNomes?.length
    ? `<p class="mt-2" style="font-size:.85rem;color:var(--sage-dark)">Confirmado também para: <strong>${grupoNomes.map(escHtml).join(", ")}</strong></p>`
    : "";

  // Link do whatsapp para convidados sem confirmação
  const urlSite = encodeURIComponent(window.location.origin + (window.location.pathname.replace("index.html","")) + "#rsvp");
  const msgWpp  = encodeURIComponent(`Oi! Confirme sua presença no casamento do Gian & Tiago aqui: ${decodeURIComponent(urlSite)}`);
  const linkWpp = `https://wa.me/?text=${msgWpp}`;

  resultado.innerHTML = `
    <div class="rsvp__sucesso">
      <div class="rsvp__sucesso-icon">${confirmado ? "❤️" : "💌"}</div>
      <h3>${confirmado ? "Presença confirmada!" : "Recebemos sua resposta."}</h3>
      <p>${confirmado ? "Mal podemos esperar para te ver lá!" : "Sentiremos sua falta. Obrigado por avisar."}</p>
      ${grupoMsg}

      <p class="mt-2">
        Confirmação enviada para:<br>
        <span class="rsvp__email-destaque">${escHtml(email)}</span>
      </p>

      <p class="mt-2" style="font-size:.82rem;color:var(--text-muted)">
        O e-mail inclui um link para <strong>alterar sua confirmação</strong> até ${DATA_LIMITE_ALTERACAO}.
      </p>

      <!-- Reenvio -->
      <div style="margin-top:1.5rem;padding:1.25rem;background:var(--bg-soft);border-radius:var(--radius);border:1px solid var(--line);text-align:left">
        <p style="font-size:.82rem;font-weight:600;color:var(--text-main);margin-bottom:.5rem">Não recebeu o e-mail?</p>
        <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.75rem">Confira spam e promoções. Se ainda assim não chegou, corrija o endereço e reenvie:</p>
        <div class="renvio__form" id="renvioForm">
          <input type="email" id="emailRenvio" class="rsvp__input" placeholder="${escHtml(email)}" value="${escHtml(email)}" />
          <button class="btn btn--outline btn--sm" type="button" id="btnRenvio" onclick="reenviarEmail()">Reenviar</button>
        </div>
        <p id="renvioMsg" style="font-size:.78rem;margin-top:.5rem"></p>
      </div>

      <!-- Compartilhar para grupo -->
      <div style="margin-top:1.5rem;text-align:left">
        <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:.5rem">Tem alguém do seu grupo que ainda não confirmou?</p>
        <a href="${linkWpp}" target="_blank" rel="noopener" class="whatsapp-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.83L.057 23.999l6.304-1.654A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.373l-.359-.213-3.721.976.993-3.63-.234-.374A9.818 9.818 0 012.182 12C2.182 6.579 6.578 2.182 12 2.182c5.42 0 9.818 4.397 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/></svg>
          Compartilhar link de confirmação
        </a>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════
   9. RSVP — REENVIO DE E-MAIL
══════════════════════════════════════════════════════════ */
window.reenviarEmail = async function() {
  const inputEmail = document.getElementById("emailRenvio");
  const email      = (inputEmail?.value || "").trim();
  const msgEl      = document.getElementById("renvioMsg");
  const btn        = document.getElementById("btnRenvio");

  if (!email || !email.includes("@")) {
    msgEl.textContent = "Digite um e-mail válido.";
    msgEl.style.color = "var(--terracotta)";
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner--dark"></span>';

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action:   "reenviarEmail",
        nome:     convidadoSelecionado?.nome || "",
        rowId:    convidadoSelecionado?.rowId || "",
        email:    email
      })
    });
    const json = await resp.json();

    btn.disabled = false;
    btn.textContent = "Reenviar";

    if (json.sucesso) {
      msgEl.textContent = `E-mail enviado para ${email}. Verifique também spam.`;
      msgEl.style.color = "var(--sage-dark)";
    } else {
      msgEl.textContent = "Não conseguimos reenviar. Escreva para " + EMAIL_CONTATO;
      msgEl.style.color = "var(--terracotta)";
    }
  } catch {
    btn.disabled = false;
    btn.textContent = "Reenviar";
    msgEl.textContent = "Erro ao reenviar. Tente novamente.";
    msgEl.style.color = "var(--terracotta)";
  }
};

/* ══════════════════════════════════════════════════════════
   10. RSVP — ALTERAR CONFIRMAÇÃO VIA TOKEN (link do e-mail)
   URL: #alterar?token=ABC&rowId=2
══════════════════════════════════════════════════════════ */
(function checkAlterarToken() {
  const hash = window.location.hash;
  if (!hash.startsWith("#alterar")) return;

  const params = new URLSearchParams(hash.replace("#alterar?", ""));
  const token  = params.get("token");
  const rowId  = params.get("rowId");
  if (!token || !rowId) return;

  // Scrolar para RSVP
  setTimeout(() => {
    document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth" });
  }, 600);

  const box = document.getElementById("rsvpBox");
  if (!box) return;

  box.innerHTML = `
    <div id="rsvp-busca">
      <p class="rsvp__hint" style="margin-bottom:1rem;color:var(--sage-dark)">Verificando seu link…</p>
    </div>
    <div id="rsvp-resultado"></div>
  `;

  // Valida token no servidor
  fetch(`${API_URL}?action=validarToken&token=${encodeURIComponent(token)}&rowId=${encodeURIComponent(rowId)}`)
    .then(r => r.json())
    .then(json => {
      if (!json.sucesso) {
        document.getElementById("rsvp-busca").innerHTML = `
          <p class="rsvp__msg rsvp__msg--erro">
            Link inválido ou expirado.<br>
            Busque seu nome abaixo ou escreva para
            <a href="mailto:${EMAIL_CONTATO}">${EMAIL_CONTATO}</a>.
          </p>
          <div style="margin-top:1rem">
            <label for="nomeBusca" class="rsvp__label">Buscar pelo nome</label>
            <div class="rsvp__row">
              <input type="text" id="nomeBusca" class="rsvp__input" placeholder="Ex: Gian" />
              <button class="btn btn--primary" onclick="buscar()">Buscar</button>
            </div>
          </div>`;
        return;
      }

      // Token válido — mostrar formulário de alteração diretamente
      convidadoSelecionado = { nome: json.nome, rowId: rowId, telefone: json.telefone, token: token };
      document.getElementById("rsvp-busca").innerHTML = `
        <p class="rsvp__msg rsvp__msg--ok">
          ✓ Link válido. Altere sua confirmação abaixo.<br>
          <small>Prazo para alteração: <strong>${DATA_LIMITE_ALTERACAO}</strong></small>
        </p>`;
      const resultado = document.getElementById("rsvp-resultado");
      resultado.classList.remove("oculto");
      mostrarFormAlteracao(json, resultado);
    })
    .catch(() => {
      document.getElementById("rsvp-busca").innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Erro ao verificar link. Tente novamente.</p>`;
    });
})();

function mostrarFormAlteracao(json, resultado) {
  resultado.innerHTML = `
    <div class="rsvp__form" id="rsvpForm">
      <p style="font-size:.9rem;color:var(--text-muted)">Alterando confirmação de: <strong>${escHtml(json.nome)}</strong></p>
      <div class="rsvp__field">
        <label class="rsvp__label" for="emailRsvp">Confirme seu e-mail</label>
        <input type="email" id="emailRsvp" class="rsvp__input" placeholder="seuemail@exemplo.com" autocomplete="email" />
      </div>
      <div class="rsvp__field">
        <span class="rsvp__label">Nova confirmação</span>
        <div class="rsvp__status">
          <label class="rsvp__status-option">
            <input type="radio" name="statusRsvp" value="SIM" checked /> ✓ Confirmo presença
          </label>
          <label class="rsvp__status-option">
            <input type="radio" name="statusRsvp" value="NAO" /> ✕ Não poderei comparecer
          </label>
        </div>
      </div>
      <div id="rsvpErro"></div>
      <button class="btn btn--primary" type="button" id="btnConfirmar" onclick="confirmarAlteracao()">Salvar alteração</button>
    </div>`;
}

window.confirmarAlteracao = async function() {
  const email   = (document.getElementById("emailRsvp")?.value || "").trim();
  const statusEl = document.querySelector('input[name="statusRsvp"]:checked');
  const status   = statusEl ? statusEl.value : "SIM";
  const erroDiv  = document.getElementById("rsvpErro");
  const btn      = document.getElementById("btnConfirmar");

  erroDiv.innerHTML = "";
  if (!email || !email.includes("@")) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Digite seu e-mail.</p>`;
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Salvando…';

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "rsvp",
        nome:   convidadoSelecionado.nome,
        rowId:  convidadoSelecionado.rowId,
        token:  convidadoSelecionado.token,
        email:  email,
        status: status,
        semTelefone: true
      })
    });
    const json = await resp.json();
    if (json.sucesso) {
      mostrarSucessoRsvp(email, status, []);
    } else {
      throw new Error(json.erro);
    }
  } catch {
    btn.disabled = false;
    btn.textContent = "Salvar alteração";
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Não conseguimos salvar. Tente novamente.</p>`;
  }
};

/* ══════════════════════════════════════════════════════════
   11. RSVP — UTILS
══════════════════════════════════════════════════════════ */
window.voltarBusca = function() {
  convidadoSelecionado = null;
  const resultado = document.getElementById("rsvp-resultado");
  if (resultado) { resultado.classList.add("oculto"); resultado.innerHTML = ""; }
  const input = document.getElementById("nomeBusca");
  if (input) { input.value = ""; input.focus(); }
};

function setHint(msg, tipo) {
  const hint = document.getElementById("rsvpHint");
  if (!hint) return;
  hint.textContent = msg;
  hint.style.color = tipo === "erro" ? "var(--terracotta)" : "var(--sage)";
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("nomeBusca")?.addEventListener("keydown", e => {
    if (e.key === "Enter") window.buscar();
  });
});

/* ══════════════════════════════════════════════════════════
   12. MODAL DE PRESENTES
══════════════════════════════════════════════════════════ */
window.abrirModalPresente = function(btn) {
  const card  = btn.closest(".presente__card");
  const nome  = card.dataset.nome;
  const valor = card.dataset.valor;
  const desc  = card.dataset.desc;
  renderizarModalPresente(nome, valor, desc);
};

window.abrirModalCustom = function() {
  const modal    = document.getElementById("modal");
  const conteudo = document.getElementById("modalConteudo");

  conteudo.innerHTML = `
    <p class="modal__eyebrow">Presente personalizado</p>
    <h2 class="modal__titulo" id="modalTitulo">Crie o seu presente</h2>
    <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:1.25rem">Escolha um nome, valor e foto (opcional).</p>

    <div class="modal__form" id="customForm">
      <div class="modal__field">
        <label class="modal__label" for="customNome">Nome do presente</label>
        <input type="text" id="customNome" class="modal__input" placeholder="Ex: Experiência gastronômica" />
      </div>
      <div class="modal__field">
        <label class="modal__label" for="customValor">Valor (R$) <span style="color:var(--terracotta)">*</span></label>
        <input type="number" id="customValor" class="modal__input" placeholder="0" min="1" inputmode="numeric" />
      </div>
      <div class="modal__field">
        <label class="modal__label" for="customFoto">Foto (opcional)</label>
        <input type="file" id="customFoto" accept="image/*" style="display:none" onchange="previewFoto(this)" />
        <div class="modal__img-placeholder" onclick="document.getElementById('customFoto').click()" role="button" tabindex="0">
          + Adicionar foto
        </div>
        <img id="customFotoPreview" class="modal__img-preview" style="display:none" alt="Preview" />
      </div>
      <div id="customErro"></div>
      <button class="btn btn--primary" type="button" onclick="confirmarCustom()">Continuar</button>
    </div>
  `;

  modal.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
};

window.previewFoto = function(input) {
  const preview = document.getElementById("customFotoPreview");
  const placeholder = document.querySelector(".modal__img-placeholder");
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = "block";
      if (placeholder) placeholder.style.display = "none";
    };
    reader.readAsDataURL(input.files[0]);
  }
};

window.confirmarCustom = function() {
  const nome  = (document.getElementById("customNome")?.value || "").trim() || "Presente personalizado";
  const valor = (document.getElementById("customValor")?.value || "").trim();
  const erroDiv = document.getElementById("customErro");

  erroDiv.innerHTML = "";
  if (!valor || isNaN(valor) || Number(valor) <= 0) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Informe um valor válido.</p>`;
    document.getElementById("customValor")?.focus();
    return;
  }

  renderizarModalPresente(nome, valor, "Presente personalizado por você ❤️");
};

function renderizarModalPresente(nome, valor, desc) {
  const modal    = document.getElementById("modal");
  const conteudo = document.getElementById("modalConteudo");
  const pixExiste = PIX_CODE !== "COLE_AQUI_O_CODIGO_PIX_COPIA_E_COLA";

  conteudo.innerHTML = `
    <p class="modal__eyebrow">Presente</p>
    <h2 class="modal__titulo" id="modalTitulo">${escHtml(nome)}</h2>
    <p class="modal__valor">R$ ${escHtml(valor)}</p>
    <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:1.25rem">${escHtml(desc)}</p>

    ${pixExiste ? `
    <div class="pix__box">
      <p class="pix__label">Chave Pix copia-e-cola</p>
      <p class="pix__code" id="pixCode">${escHtml(PIX_CODE)}</p>
      <button class="btn btn--outline-green btn--sm" type="button" onclick="copiarPix()">Copiar chave Pix</button>
    </div>` : `
    <div class="pix__box">
      <p class="pix__label">Chave Pix</p>
      <p style="font-size:.82rem;color:var(--sage);font-style:italic">[Código Pix será adicionado em breve]</p>
    </div>`}

    <div class="modal__form" id="presenteForm">
      <div class="modal__field">
        <label class="modal__label" for="presenteNome">Seu nome</label>
        <input type="text" id="presenteNome" class="modal__input" autocomplete="name" placeholder="Como prefere ser chamado(a)" />
      </div>
      <div class="modal__field">
        <label class="modal__label" for="presenteEmail">Seu e-mail</label>
        <input type="email" id="presenteEmail" class="modal__input" autocomplete="email" placeholder="seuemail@exemplo.com" />
      </div>
      <div class="modal__field">
        <label class="modal__label" for="presenteMensagem">Mensagem (opcional)</label>
        <textarea id="presenteMensagem" class="modal__textarea" placeholder="Deixe uma mensagem para os noivos…"></textarea>
      </div>
      <div id="presenteErro"></div>
      <button class="btn btn--terra" type="button" id="btnPresente" onclick="enviarPresente('${escAttr(nome)}','${escAttr(valor)}')">
        Já fiz o Pix ❤️
      </button>
    </div>
  `;

  modal.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
  modal.querySelector(".modal__close")?.focus();
}

window.fecharModal = function() {
  document.getElementById("modal")?.setAttribute("hidden", "");
  document.body.style.overflow = "";
};

document.addEventListener("keydown", e => {
  if (e.key === "Escape") window.fecharModal();
});

window.copiarPix = async function() {
  const code = document.getElementById("pixCode");
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code.textContent.trim());
    const btn = document.querySelector('[onclick="copiarPix()"]');
    const orig = btn.textContent;
    btn.textContent = "Copiado!";
    btn.style.color = "var(--sage-dark)";
    setTimeout(() => { btn.textContent = orig; btn.style.color = ""; }, 2000);
  } catch {
    alert("Selecione e copie manualmente.");
  }
};

window.enviarPresente = async function(nome, valor) {
  const nomeRem  = (document.getElementById("presenteNome")?.value || "").trim();
  const email    = (document.getElementById("presenteEmail")?.value || "").trim();
  const mensagem = (document.getElementById("presenteMensagem")?.value || "").trim();
  const erroDiv  = document.getElementById("presenteErro");
  const btn      = document.getElementById("btnPresente");

  erroDiv.innerHTML = "";
  if (!nomeRem) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Informe seu nome.</p>`;
    document.getElementById("presenteNome")?.focus();
    return;
  }
  if (!email || !email.includes("@")) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Digite um e-mail válido.</p>`;
    document.getElementById("presenteEmail")?.focus();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Registrando…';

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "gift", nome: nomeRem, email, presente: nome, valor, mensagem })
    });
    const json = await resp.json();
    if (json.sucesso) {
      document.getElementById("modalConteudo").innerHTML = `
        <div class="modal__sucesso">
          <div class="modal__sucesso-icon">🎁</div>
          <h3>Presente registrado!</h3>
          <p>Obrigado, ${escHtml(nomeRem)}!<br>Enviamos uma cópia para <strong>${escHtml(email)}</strong>.</p>
          <p class="mt-2" style="font-size:.78rem;color:var(--sage)">
            Não chegou? Confira spam e promoções.<br>
            Dúvidas? <a href="mailto:${EMAIL_CONTATO}" style="color:var(--terracotta)">${EMAIL_CONTATO}</a>
          </p>
        </div>`;
    } else { throw new Error(json.erro); }
  } catch {
    btn.disabled = false;
    btn.innerHTML = "Já fiz o Pix ❤️";
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Não conseguimos registrar. Tente novamente.</p>`;
  }
};

/* ══════════════════════════════════════════════════════════
   13. UTILS
══════════════════════════════════════════════════════════ */
function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escAttr(str) { return String(str || "").replace(/'/g, "\\'"); }

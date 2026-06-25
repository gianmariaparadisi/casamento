/* ═══════════════════════════════════════════════════════════
   GIAN & TIAGO — app.js v3
═══════════════════════════════════════════════════════════ */
"use strict";

/* ── CONFIGURAÇÃO ─────────────────────────────────────────── */
const API_URL       = "https://script.google.com/macros/s/AKfycbyM4Z8xwYYEDRLaofBISOQJKKsn_tCeUuIl1wbLlQRmfjnK5E2DE94tv7HTAQvfwXQ7kg/exec";
const EMAIL_CONTATO = "casamento.tiagoegian@gmail.com";
const DATA_LIMITE_ALTERACAO = "12 de agosto de 2026";
const DATA_CASAMENTO = new Date("2026-12-12T16:30:00-03:00");

/* ── PIX POR PRESENTE ─────────────────────────────────────── */
const PIX_MAP = {
  "Passeio de barco": "00020126580014BR.GOV.BCB.PIX0136d2376c5e-4233-4bd1-b053-2854e71b70fc5204000053039865406600.005802BR5919Gian Maria Paradisi6009SAO PAULO62140510gsoZjzwjdq63046D3B",
  "Degustação de vinhos e champagnes": "00020126580014BR.GOV.BCB.PIX0136d2376c5e-4233-4bd1-b053-2854e71b70fc5204000053039865406280.005802BR5919Gian Maria Paradisi6009SAO PAULO62140510y4bgvGBPBW6304EC64",
  "Resort all inclusive": "00020126580014BR.GOV.BCB.PIX0136d2376c5e-4233-4bd1-b053-2854e71b70fc52040000530398654071200.005802BR5919Gian Maria Paradisi6009SAO PAULO62140510B3p031F31d6304A29E",
  "Café da manhã com vista": "00020126580014BR.GOV.BCB.PIX0136d2376c5e-4233-4bd1-b053-2854e71b70fc5204000053039865406150.005802BR5919Gian Maria Paradisi6009SAO PAULO62140510hXG9PjNj4u6304D870",
  "Um vaso lindo para casa": "00020126580014BR.GOV.BCB.PIX0136d2376c5e-4233-4bd1-b053-2854e71b70fc5204000053039865406180.005802BR5919Gian Maria Paradisi6009SAO PAULO62140510eiwztZg6ME6304957F",
  "Um mergulho relaxante": "00020126580014BR.GOV.BCB.PIX0136d2376c5e-4233-4bd1-b053-2854e71b70fc5204000053039865406350.005802BR5919Gian Maria Paradisi6009SAO PAULO62140510MQ45XYdDpO6304177E",
  "Passeio de vespa": "00020126580014BR.GOV.BCB.PIX0136d2376c5e-4233-4bd1-b053-2854e71b70fc5204000053039865406220.005802BR5919Gian Maria Paradisi6009SAO PAULO62140510eiaVkBQR3J630432FA",
  "Sessão de massagem relaxante": "00020126580014BR.GOV.BCB.PIX0136d2376c5e-4233-4bd1-b053-2854e71b70fc5204000053039865406200.005802BR5919Gian Maria Paradisi6009SAO PAULO62140510sMKjd9SpAr6304D08C",
  "Jantar italiano delicioso": "00020126580014BR.GOV.BCB.PIX0136d2376c5e-4233-4bd1-b053-2854e71b70fc5204000053039865406250.005802BR5919Gian Maria Paradisi6009SAO PAULO62140510fOsSwm7D4O6304A9FB",
  "_default": "casamento.tiagoegian@gmail.com"
};

function getPixCode(nomepresente) {
  return PIX_MAP[nomepresente] || PIX_MAP["_default"];
}

function isPixEmailChave(code) {
  return code.includes("@");
}

/* ── ESTADO ───────────────────────────────────────────────── */
let convidadoSelecionado = null; // { nome, telefone, rowId, grupo: [] }

/* ══════════════════════════════════════════════════════════
   UTILS — MÁSCARA DE TELEFONE
   Esconde os últimos 4 dígitos, exibe o restante
══════════════════════════════════════════════════════════ */
// Traduz os valores de status vindos da planilha (PT) para italiano quando ?lang=it
function traduzirStatus(status) {
  if (!status) return status;
  if (!(window.I18N && window.I18N.lang === "it")) return status;
  const map = {
    "Confirmado": "Confermato",
    "Pendente Confirmação": "In attesa di conferma",
    "Pendente": "In attesa",
    "Não compareceu": "Non presente"
  };
  return map[status] || status;
}

function mascararTelefone(tel) {
  if (!tel || tel === "****") return null;
  // Remove tudo que não é dígito
  const digits = String(tel).replace(/\D/g, "");
  if (digits.length < 5) return null;
  // Mantém todos os dígitos menos os 4 últimos, substitui os 4 últimos por ••••
  const visiveis = digits.slice(0, -4);
  // Formata: (XX) XXXXX-••••
  let formatted = "";
  if (visiveis.length >= 2) {
    formatted += "(" + visiveis.slice(0, 2) + ") ";
    const resto = visiveis.slice(2);
    if (resto.length > 0) formatted += resto;
  } else {
    formatted += visiveis;
  }
  return formatted + "••••";
}

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

  // Dropdown "Mais" — clique no mobile, hover no desktop (via CSS)
  links.querySelectorAll(".nav__dropdown-toggle").forEach(toggle => {
    toggle.addEventListener("click", (e) => {
      if (window.innerWidth <= 900) {
        e.preventDefault();
        toggle.closest(".nav__dropdown").classList.toggle("open");
      }
    });
  });

  links.querySelectorAll("a:not(.nav__dropdown-toggle)").forEach(link => {
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
══════════════════════════════════════════════════════════ */
(function initCarrossel() {
  const carrossel = document.getElementById("carrossel");
  const track     = document.getElementById("carrosselTrack");
  const dotsEl    = document.getElementById("carrosselDots");
  if (!track || !carrossel) return;

  const slides = track.querySelectorAll(".carrossel__slide");
  let atual = 0;
  let timer;

  function ajustarSlides() {
    const w = carrossel.clientWidth;
    slides.forEach(s => {
      s.style.minWidth = w + "px";
      s.style.width    = w + "px";
    });
  }
  ajustarSlides();
  window.addEventListener("resize", () => { ajustarSlides(); irPara(atual); });

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

  let touchStartX = 0;
  let touchStartTime = 0;
  carrossel.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
    pararTimer();
  }, { passive: true });
  carrossel.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dt = Math.max(1, Date.now() - touchStartTime);
    const velocity = Math.abs(dx) / dt; // px/ms

    const tentandoVoltar = dx > 40 && atual === 0;
    const tentandoAvancar = dx < -40 && atual === slides.length - 1;

    if (Math.abs(dx) > 40) {
      if ((tentandoVoltar || tentandoAvancar) && velocity > 0.6) {
        // swipe rápido no limite do carrossel: pequena vibração elástica
        track.classList.remove("delights-elastic");
        requestAnimationFrame(() => track.classList.add("delights-elastic"));
        setTimeout(() => track.classList.remove("delights-elastic"), 420);
      } else {
        irPara(atual + (dx < 0 ? 1 : -1));
      }
    }
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
    if (input) {
      input.classList.remove("delights-shake");
      requestAnimationFrame(() => input.classList.add("delights-shake"));
      setTimeout(() => input.classList.remove("delights-shake"), 450);
    }
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
    btnBuscar.textContent = window.I18N.t("Buscar", "Cerca");

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
    resultado.innerHTML = `<p class="rsvp__hint" style="margin-bottom:.75rem">${window.I18N.t("Encontramos","Abbiamo trovato")} ${lista.length > 1 ? lista.length + window.I18N.t(" nomes"," nomi") : window.I18N.t("1 nome","1 nome")}. ${window.I18N.t("Selecione o seu:","Seleziona il tuo:")}</p>`;

    lista.forEach(item => {
      const statusLabel = item.status
        ? `<span class="convidado__badge ${item.status === "Confirmado" ? "convidado__badge--sim" : "convidado__badge--nao"}">${escHtml(traduzirStatus(item.status))}</span>`
        : "";
      const telMascarado = mascararTelefone(item.telefone);
      const card = document.createElement("div");
      card.className = "convidado__card";
      card.innerHTML = `
        <img class="convidado__avatar" src="assets/img/${avatarParaNome(item.nome)}" alt="">
        <div class="convidado__info">
          <p class="convidado__nome">${escHtml(item.nome)} ${statusLabel}</p>
          ${telMascarado
            ? `<p class="convidado__tel">Tel: ${escHtml(telMascarado)}</p>`
            : `<p class="convidado__tel"><em style="color:var(--sage)">${window.I18N.t("Telefone não cadastrado","Telefono non registrato")}</em></p>`}
        </div>
        <button class="btn btn--outline btn--sm" type="button">${window.I18N.t("Selecionar","Seleziona")}</button>`;
      card.querySelector("button").addEventListener("click", () => selecionarConvidado(item, lista));
      resultado.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    btnBuscar.disabled = false;
    btnBuscar.textContent = window.I18N.t("Buscar", "Cerca");
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
window.toggleGrupoContato = function(rowId, checked) {
  const el = document.getElementById("contato_" + rowId);
  if (el) el.classList.toggle("oculto", !checked);

  if (!checked) {
    // Desmarcou o checkbox: limpa o status escolhido (Confirmado / Não poderá comparecer)
    document.querySelectorAll(`input[name="grupoStatus_${rowId}"]`).forEach(r => { r.checked = false; });
  }
};

window.marcarGrupoCheckbox = function(rowId) {
  // Ao escolher um status (Confirmado / Não poderá comparecer), marca
  // automaticamente o checkbox dessa pessoa, se ainda não estiver marcado.
  const checkbox = document.querySelector(`input[name="grupo"][value="${rowId}"]`);
  if (checkbox && !checkbox.checked) {
    checkbox.checked = true;
    window.toggleGrupoContato(rowId, true);
  }
};

function selecionarConvidado(item, todosDaBusca) {
  convidadoSelecionado = item;
  const resultado = document.getElementById("rsvp-resultado");

  const grupo = (todosDaBusca || []).filter(p => p.grupo && p.grupo === item.grupo && p.rowId !== item.rowId);
  const temGrupo = grupo.length > 0;
  const semTelefone = !item.telefone || item.telefone === "****";
  const telMascarado = mascararTelefone(item.telefone);

  resultado.innerHTML = `
    <div class="rsvp__form" id="rsvpForm">

      <div style="padding:.75rem 1rem;background:var(--bg-green);border-radius:var(--radius);border:1px solid var(--line-green);display:flex;align-items:center;gap:.75rem">
        <img src="assets/img/${avatarParaNome(item.nome)}" alt="" style="width:2.25rem;height:2.25rem;object-fit:contain;flex-shrink:0">
        <div>
          <p style="font-size:.85rem;color:var(--sage-dark)">
            ${window.I18N.t("Confirmando","Confermando")}: <strong>${escHtml(item.nome)}</strong>
            ${telMascarado ? "· Tel: " + escHtml(telMascarado) : ""}
          </p>
          <button type="button" style="font-size:.75rem;color:var(--sage);text-decoration:underline;margin-top:.25rem;background:none;border:none;cursor:pointer" onclick="voltarBusca()">${window.I18N.t("← Buscar outro nome","← Cerca un altro nome")}</button>
        </div>
      </div>

      ${semTelefone ? `
      <div class="rsvp__field">
        <label class="rsvp__label" for="telefoneCad"><img src="assets/img/icon-luggage-tag.png" alt="" class="rsvp__label-icon"> ${window.I18N.t("Seu telefone (WhatsApp)","Il tuo telefono (WhatsApp)")} <span style="color:var(--text-muted);font-weight:400">(${window.I18N.t("opcional","opzionale")})</span></label>
        <input type="tel" id="telefoneCad" class="rsvp__input" placeholder="(11) 99999-0000" inputmode="tel" autocomplete="tel" oninput="window.delightsSetInputCheck(this, this.value.replace(/\\D/g,'').length >= 10)" />
        <p class="rsvp__hint">${window.I18N.t("Não encontramos um telefone cadastrado para você. Se quiser, informe para facilitar o contato — não é obrigatório.","Non abbiamo trovato un telefono registrato per te. Se vuoi, indicalo per facilitare il contatto — non è obbligatorio.")}</p>
      </div>
      ` : `
      <div class="rsvp__field">
        <label class="rsvp__label" for="ultimos4"><img src="assets/img/icon-luggage-tag.png" alt="" class="rsvp__label-icon"> Últimos 4 dígitos do seu telefone</label>
        <input type="tel" id="ultimos4" class="rsvp__input" maxlength="4" inputmode="numeric" placeholder="0000" autocomplete="off" oninput="window.delightsSetInputCheck(this, this.value.replace(/\\D/g,'').length === 4)" />
        <p class="rsvp__hint">Confirme o número cadastrado para segurança.</p>
      </div>
      `}

      <div class="rsvp__field">
        <label class="rsvp__label" for="emailRsvp"><img src="assets/img/icon-envelope.png" alt="" class="rsvp__label-icon"> ${window.I18N.t("Seu e-mail","La tua e-mail")}</label>
        <input type="email" id="emailRsvp" class="rsvp__input" placeholder="seuemail@exemplo.com" autocomplete="email" />
        <p class="rsvp__hint">${window.I18N.t("Enviaremos a confirmação e o link para alterar depois, se precisar.","Ti invieremo la conferma e il link per modificarla in seguito, se necessario.")}</p>
      </div>

      <div class="rsvp__field">
        <span class="rsvp__label" id="statusLabel">${window.I18N.t("Sua presença","La tua presenza")}</span>
        <div class="rsvp__status" role="group" aria-labelledby="statusLabel">
          <label class="rsvp__status-option">
            <input type="radio" name="statusRsvp" value="SIM" checked />
            <img src="assets/img/icon-check-decorative.png" alt=""> ${window.I18N.t("Confirmo presença","Confermo la presenza")}
          </label>
          <label class="rsvp__status-option">
            <input type="radio" name="statusRsvp" value="NAO" />
            <img src="assets/img/icon-cancel-decorative.png" alt=""> ${window.I18N.t("Não poderei comparecer","Non potrò essere presente")}
          </label>
        </div>
      </div>

      ${temGrupo ? `
      <div class="rsvp__field">
        <span class="rsvp__label">${window.I18N.t("Confirmar também para o seu grupo?","Confermare anche per il tuo gruppo?")}</span>
        <p class="rsvp__hint" style="margin-bottom:.6rem">${window.I18N.t("Você pode confirmar para os outros do seu grupo agora, ou deixar que cada um confirme individualmente.","Puoi confermare anche per gli altri del tuo gruppo ora, oppure lasciare che ognuno confermi individualmente.")}</p>
        <div class="grupo__lista" id="grupoLista">
          ${grupo.map(p => `
            <label class="grupo__membro">
              <input type="checkbox" name="grupo" value="${escHtml(p.rowId)}" data-nome="${escHtml(p.nome)}" onchange="window.toggleGrupoContato('${escHtml(p.rowId)}', this.checked)" />
              <img class="grupo__membro-avatar" src="assets/img/${avatarParaNome(p.nome)}" alt="">
              <span class="grupo__membro-nome">${escHtml(p.nome)}</span>
              <div class="rsvp__status rsvp__status--sm" role="group" style="margin-top:.35rem;margin-left:.25rem">
                <label class="rsvp__status-option rsvp__status-option--sm" style="font-size:.8rem">
                  <input type="radio" name="grupoStatus_${escHtml(p.rowId)}" value="SIM" onchange="window.marcarGrupoCheckbox('${escHtml(p.rowId)}')" />
                  <img src="assets/img/icon-check-decorative.png" alt=""> ${window.I18N.t("Confirmado","Confermato")}
                </label>
                <label class="rsvp__status-option rsvp__status-option--sm" style="font-size:.8rem">
                  <input type="radio" name="grupoStatus_${escHtml(p.rowId)}" value="NAO" onchange="window.marcarGrupoCheckbox('${escHtml(p.rowId)}')" />
                  <img src="assets/img/icon-cancel-decorative.png" alt=""> ${window.I18N.t("Não poderá comparecer","Non potrà essere presente")}
                </label>
              </div>
              <div class="grupo__membro-contato oculto" id="contato_${escHtml(p.rowId)}" style="margin-top:.5rem;margin-left:.25rem;width:100%;display:flex;flex-direction:column;gap:.4rem">
                <p style="font-size:.72rem;color:var(--text-muted);margin:0">
                  ${window.I18N.t(`Telefone e e-mail de ${escHtml(p.nome.split(" ")[0])}`, `Telefono ed e-mail di ${escHtml(p.nome.split(" ")[0])}`)} <em>(${window.I18N.t("opcional","opzionale")})</em> — ${window.I18N.t("se deixar em branco, você ficará como responsável pelo contato dessa pessoa.","se lasci vuoto, rimarrai responsabile del contatto per questa persona.")}
                </p>
                <input type="tel" class="rsvp__input rsvp__input--sm" placeholder="${window.I18N.t("Telefone (opcional)","Telefono (opzionale)")}" inputmode="tel" autocomplete="tel" data-grupo-tel="${escHtml(p.rowId)}" />
                <input type="email" class="rsvp__input rsvp__input--sm" placeholder="${window.I18N.t("E-mail (opcional)","E-mail (opzionale)")}" autocomplete="email" data-grupo-email="${escHtml(p.rowId)}" />
              </div>
              ${p.status ? `<span class="grupo__membro-status">${escHtml(traduzirStatus(p.status))}</span>` : ""}
            </label>
          `).join("")}
        </div>
      </div>
      ` : ""}

      <div id="rsvpErro"></div>

      <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:.25rem">
        <button class="btn btn--primary" type="button" id="btnConfirmar" onclick="confirmar()">${window.I18N.t("Confirmar","Confermare")}</button>
        <button class="btn btn--outline" type="button" onclick="voltarBusca()">${window.I18N.t("Voltar","Indietro")}</button>
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

  if (!semTelefone && ultimos4.length !== 4) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">${window.I18N.t("Digite os 4 últimos dígitos do telefone.","Inserisci le ultime 4 cifre del telefono.")}</p>`;
    document.getElementById("ultimos4")?.focus();
    return;
  }
  if (semTelefone && telefoneCad && telefoneCad.replace(/\D/g, "").length < 8) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">${window.I18N.t("Digite um telefone válido.","Inserisci un telefono valido.")}</p>`;
    document.getElementById("telefoneCad")?.focus();
    return;
  }
  if (!email || !email.includes("@")) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">${window.I18N.t("Digite um e-mail válido.","Inserisci un&#39;e-mail valida.")}</p>`;
    document.getElementById("emailRsvp")?.focus();
    return;
  }

  // Telefone/e-mail opcionais por membro do grupo: se preenchidos, validar formato básico
  const camposEmailGrupo = document.querySelectorAll('[data-grupo-email]');
  for (const input of camposEmailGrupo) {
    const val = (input.value || "").trim();
    if (val && !val.includes("@")) {
      erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">${window.I18N.t("Verifique o e-mail informado para o seu grupo (ou deixe em branco).","Controlla l&#39;e-mail inserita per il tuo gruppo (o lasciala vuota).")}</p>`;
      input.focus();
      return;
    }
  }

  // Membros do grupo selecionados — cada um precisa ter um status escolhido
  const grupoChecks = document.querySelectorAll('input[name="grupo"]:checked');
  for (const check of grupoChecks) {
    const rowId = check.value;
    const radioChecked = document.querySelector(`input[name="grupoStatus_${rowId}"]:checked`);
    if (!radioChecked) {
      erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">${window.I18N.t("Escolha a presença de","Scegli la presenza di")} ${escHtml(check.dataset.nome)}.</p>`;
      document.querySelector(`input[name="grupoStatus_${rowId}"]`)?.focus();
      return;
    }
  }

  // Membros do grupo selecionados — cada um com seu próprio status, e telefone/email opcionais
  const grupoRowIds = Array.from(grupoChecks).map(c => c.value);
  const grupoNomes  = Array.from(grupoChecks).map(c => c.dataset.nome);
  const grupoStatuses = grupoRowIds.map(rowId => {
    const radioChecked = document.querySelector(`input[name="grupoStatus_${rowId}"]:checked`);
    return radioChecked.value;
  });
  const grupoTelefones = grupoRowIds.map(rowId => {
    const input = document.querySelector(`[data-grupo-tel="${rowId}"]`);
    return (input?.value || "").trim();
  });
  const grupoEmails = grupoRowIds.map(rowId => {
    const input = document.querySelector(`[data-grupo-email="${rowId}"]`);
    return (input?.value || "").trim();
  });

  btnConf.disabled = true;
  btnConf.innerHTML = `<span class="spinner"></span> ${window.I18N.t('Enviando…','Invio…')}`;

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action:        "rsvp",
        nome:          convidadoSelecionado.nome,
        rowId:         convidadoSelecionado.rowId,
        ultimos4:      ultimos4,
        semTelefone:   semTelefone,
        telefoneCad:   telefoneCad,
        email:         email,
        status:        status,
        grupoRowIds:    grupoRowIds,
        grupoNomes:     grupoNomes,
        grupoStatuses:  grupoStatuses,
        grupoTelefones: grupoTelefones,
        grupoEmails:    grupoEmails,
        lang:           (window.I18N && window.I18N.lang) || "pt"
      })
    });

    const json = await resp.json();

    if (json.sucesso) {
      mostrarSucessoRsvp(email, status, grupoNomes);
    } else if (json.erro === "telefone_incorreto") {
      btnConf.disabled = false;
      btnConf.textContent = window.I18N.t("Confirmar","Confermare");
      erroDiv.innerHTML = `
        <p class="rsvp__msg rsvp__msg--erro">
          ${window.I18N.t("Os últimos 4 dígitos não conferem.","Le ultime 4 cifre non corrispondono.")}<br>
          ${window.I18N.t("Verifique e tente novamente, ou escreva para","Controlla e riprova, oppure scrivi a")}
          <a href="mailto:${EMAIL_CONTATO}" style="color:var(--terracotta-hover)">${EMAIL_CONTATO}</a>.
        </p>`;
    } else {
      throw new Error(json.erro || "erro");
    }

  } catch (err) {
    console.error(err);
    btnConf.disabled = false;
    btnConf.textContent = window.I18N.t("Confirmar","Confermare");
    erroDiv.innerHTML = `
      <p class="rsvp__msg rsvp__msg--erro">
        ${window.I18N.t("Não conseguimos registrar. Tente novamente ou escreva para","Non siamo riusciti a registrare. Riprova o scrivi a")}
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
    ? `<p class="mt-2" style="font-size:.85rem;color:var(--sage-dark)">${window.I18N.t("Confirmado também para","Confermato anche per")}: <strong>${grupoNomes.map(escHtml).join(", ")}</strong></p>`
    : "";

  const urlSite = encodeURIComponent(window.location.origin + (window.location.pathname.replace("index.html","")) + "#rsvp");
  const msgWpp  = encodeURIComponent(`Oi! Confirme sua presença no casamento do Gian & Tiago aqui: ${decodeURIComponent(urlSite)}`);
  const linkWpp = `https://wa.me/?text=${msgWpp}`;

  resultado.innerHTML = `
    <div class="rsvp__sucesso">
      <div class="rsvp__sucesso-icon">${confirmado ? "<img src='assets/img/icon-heart-full.png' alt=''>" : "<img src='assets/img/icon-rsvp-envelope.png' alt=''>"}</div>
      <h3>${confirmado ? window.I18N.t("Presença confirmada!","Presenza confermata!") : window.I18N.t("Recebemos sua resposta.","Abbiamo ricevuto la tua risposta.")}</h3>
      <p>${confirmado ? window.I18N.t("Mal podemos esperar para te ver lá!","Non vediamo l&#39;ora di vederti lì!") : window.I18N.t("Sentiremos sua falta. Obrigado por avisar.","Ci mancherai. Grazie per averci avvisato.")}</p>
      ${grupoMsg}

      <p class="mt-2">
        ${window.I18N.t("Confirmação enviada para","Conferma inviata a")}:<br>
        <span class="rsvp__email-destaque">${escHtml(email)}</span>
      </p>

      <p class="mt-2" style="font-size:.82rem;color:var(--text-muted)">
        ${window.I18N.t(`O e-mail inclui um link para <strong>alterar sua confirmação</strong> até ${DATA_LIMITE_ALTERACAO}.`, `L&#39;e-mail include un link per <strong>modificare la tua conferma</strong> entro il ${DATA_LIMITE_ALTERACAO}.`)}
      </p>

      <!-- Reenvio -->
      <div style="margin-top:1.5rem;padding:1.25rem;background:var(--bg-soft);border-radius:var(--radius);border:1px solid var(--line);text-align:left">
        <p style="font-size:.82rem;font-weight:600;color:var(--text-main);margin-bottom:.5rem">${window.I18N.t("Não recebeu o e-mail?","Non hai ricevuto l&#39;e-mail?")}</p>
        <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.75rem">${window.I18N.t("Confira spam e promoções. Se ainda assim não chegou, corrija o endereço e reenvie:","Controlla spam e promozioni. Se ancora non è arrivata, correggi l&#39;indirizzo e invia di nuovo:")}</p>
        <div class="renvio__form" id="renvioForm">
          <input type="email" id="emailRenvio" class="rsvp__input" placeholder="${escHtml(email)}" value="${escHtml(email)}" />
          <button class="btn btn--outline btn--sm" type="button" id="btnRenvio" onclick="reenviarEmail()">${window.I18N.t("Reenviar","Invia di nuovo")}</button>
        </div>
        <p id="renvioMsg" style="font-size:.78rem;margin-top:.5rem"></p>
      </div>

      <!-- Compartilhar para grupo -->
      <div style="margin-top:1.5rem;text-align:left">
        <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:.5rem">${window.I18N.t("Tem alguém do seu grupo que ainda não confirmou?","C&#39;è qualcuno del tuo gruppo che non ha ancora confermato?")}</p>
        <a href="${linkWpp}" target="_blank" rel="noopener" class="whatsapp-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.83L.057 23.999l6.304-1.654A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.373l-.359-.213-3.721.976.993-3.63-.234-.374A9.818 9.818 0 012.182 12C2.182 6.579 6.578 2.182 12 2.182c5.42 0 9.818 4.397 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/></svg>
          ${window.I18N.t("Compartilhar link de confirmação","Condividi il link di conferma")}
        </a>
      </div>
    </div>
  `;
  if (confirmado) celebrarConfirmacao();
}

/* Chuva de confete + corações para celebrar uma confirmação de presença */
function celebrarConfirmacao(){
  const wrap = document.createElement("div");
  wrap.style.position = "fixed";
  wrap.style.inset = "0";
  wrap.style.pointerEvents = "none";
  wrap.style.zIndex = "9999";
  wrap.style.overflow = "hidden";
  const total = 40;
  for(let i=0;i<total;i++){
    const isHeart = i % 3 === 0;
    const img = document.createElement("img");
    if(isHeart){
      img.src = "assets/img/icon-heart-full.png";
    } else {
      const piece = String((i % 12) + 1).padStart(2,"0");
      img.src = `assets/img/confetti-piece-${piece}.png`;
    }
    img.alt = "";
    img.style.position = "absolute";
    img.style.top = "-10%";
    img.style.left = (Math.random()*100) + "vw";
    const size = isHeart ? (20 + Math.random()*16) : (16 + Math.random()*18);
    img.style.width = size + "px";
    img.style.height = size + "px";
    img.style.objectFit = "contain";
    const duration = 2.6 + Math.random()*2;
    const delay = Math.random()*0.7;
    img.style.animation = `confettiFall ${duration}s linear ${delay}s forwards`;
    wrap.appendChild(img);
  }
  if(!document.getElementById("confettiFallKeyframes")){
    const style = document.createElement("style");
    style.id = "confettiFallKeyframes";
    style.textContent = `@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1;}100%{transform:translateY(110vh) rotate(360deg);opacity:.85;}}`;
    document.head.appendChild(style);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 5500);
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
    msgEl.textContent = window.I18N.t("Digite um e-mail válido.","Inserisci un&#39;e-mail valida.");
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
        email:    email,
        lang:     (window.I18N && window.I18N.lang) || "pt"
      })
    });
    const json = await resp.json();

    btn.disabled = false;
    btn.textContent = window.I18N.t("Reenviar","Invia di nuovo");

    if (json.sucesso) {
      msgEl.textContent = `${window.I18N.t("E-mail enviado para","E-mail inviata a")} ${email}. ${window.I18N.t("Verifique também spam.","Controlla anche lo spam.")}`;
      msgEl.style.color = "var(--sage-dark)";
    } else {
      msgEl.textContent = window.I18N.t("Não conseguimos reenviar. Escreva para ","Non siamo riusciti a inviare di nuovo. Scrivi a ") + EMAIL_CONTATO;
      msgEl.style.color = "var(--terracotta)";
    }
  } catch {
    btn.disabled = false;
    btn.textContent = window.I18N.t("Reenviar","Invia di nuovo");
    msgEl.textContent = window.I18N.t("Erro ao reenviar. Tente novamente.","Errore durante l&#39;invio. Riprova.");
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

  setTimeout(() => {
    document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth" });
  }, 600);

  const box = document.getElementById("rsvpBox");
  if (!box) return;

  box.innerHTML = `
    <div id="rsvp-busca">
      <p class="rsvp__hint" style="margin-bottom:1rem;color:var(--sage-dark)">${window.I18N.t("Verificando seu link…","Verifica del link in corso…")}</p>
    </div>
    <div id="rsvp-resultado"></div>
  `;

  fetch(`${API_URL}?action=validarToken&token=${encodeURIComponent(token)}&rowId=${encodeURIComponent(rowId)}`)
    .then(r => r.json())
    .then(json => {
      if (!json.sucesso) {
        document.getElementById("rsvp-busca").innerHTML = `
          <p class="rsvp__msg rsvp__msg--erro">
            ${window.I18N.t("Link inválido ou expirado.","Link non valido o scaduto.")}<br>
            ${window.I18N.t("Busque seu nome abaixo ou escreva para","Cerca il tuo nome qui sotto o scrivi a")}
            <a href="mailto:${EMAIL_CONTATO}">${EMAIL_CONTATO}</a>.
          </p>
          <div style="margin-top:1rem">
            <label for="nomeBusca" class="rsvp__label">${window.I18N.t("Buscar pelo nome","Cerca per nome")}</label>
            <div class="rsvp__row">
              <input type="text" id="nomeBusca" class="rsvp__input" placeholder="Ex: Gian" />
              <button class="btn btn--primary" onclick="buscar()">${window.I18N.t("Buscar","Cerca")}</button>
            </div>
          </div>`;
        return;
      }

      convidadoSelecionado = { nome: json.nome, rowId: rowId, telefone: json.telefone, token: token };
      document.getElementById("rsvp-busca").innerHTML = `
        <p class="rsvp__msg rsvp__msg--ok">
          ✓ ${window.I18N.t("Link válido. Altere sua confirmação abaixo.","Link valido. Modifica la tua conferma qui sotto.")}<br>
          <small>${window.I18N.t("Prazo para alteração","Termine per la modifica")}: <strong>${DATA_LIMITE_ALTERACAO}</strong></small>
        </p>`;
      const resultado = document.getElementById("rsvp-resultado");
      resultado.classList.remove("oculto");
      mostrarFormAlteracao(json, resultado);
    })
    .catch(() => {
      document.getElementById("rsvp-busca").innerHTML = `<p class="rsvp__msg rsvp__msg--erro">${window.I18N.t("Erro ao verificar link. Tente novamente.","Errore durante la verifica del link. Riprova.")}</p>`;
    });
})();

function mostrarFormAlteracao(json, resultado) {
  resultado.innerHTML = `
    <div class="rsvp__form" id="rsvpForm">
      <p style="font-size:.9rem;color:var(--text-muted)">${window.I18N.t("Alterando confirmação de","Modifica della conferma di")}: <strong>${escHtml(json.nome)}</strong></p>
      <div class="rsvp__field">
        <label class="rsvp__label" for="emailRsvp">${window.I18N.t("Confirme seu e-mail","Confermi la tua e-mail")}</label>
        <input type="email" id="emailRsvp" class="rsvp__input" placeholder="seuemail@exemplo.com" autocomplete="email" />
      </div>
      <div class="rsvp__field">
        <span class="rsvp__label">${window.I18N.t("Nova confirmação","Nuova conferma")}</span>
        <div class="rsvp__status">
          <label class="rsvp__status-option">
            <input type="radio" name="statusRsvp" value="SIM" checked /> ✓ ${window.I18N.t("Confirmo presença","Confermo la presenza")}
          </label>
          <label class="rsvp__status-option">
            <input type="radio" name="statusRsvp" value="NAO" /> ✕ ${window.I18N.t("Não poderei comparecer","Non potrò essere presente")}
          </label>
        </div>
      </div>
      <div id="rsvpErro"></div>
      <button class="btn btn--primary" type="button" id="btnConfirmar" onclick="confirmarAlteracao()">${window.I18N.t("Salvar alteração","Salva modifica")}</button>
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
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">${window.I18N.t("Digite seu e-mail.","Inserisci la tua e-mail.")}</p>`;
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${window.I18N.t('Salvando…','Salvataggio…')}`;

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
        semTelefone: true,
        lang: (window.I18N && window.I18N.lang) || "pt"
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
    btn.textContent = window.I18N.t("Salvar alteração","Salva modifica");
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">${window.I18N.t("Não conseguimos salvar. Tente novamente.","Non siamo riusciti a salvare. Riprova.")}</p>`;
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
  const nomeInput = document.getElementById("nomeBusca");
  nomeInput?.addEventListener("keydown", e => {
    if (e.key === "Enter") window.buscar();
  });

  // Validação em tempo real: mostra um check verde quando o nome digitado tem correspondência
  if (nomeInput) {
    let debounceTimer = null;
    nomeInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const nome = nomeInput.value.trim();
      if (nome.length < 2) {
        window.delightsSetInputCheck?.(nomeInput, false);
        return;
      }
      debounceTimer = setTimeout(async () => {
        try {
          const resp  = await fetch(`${API_URL}?nome=${encodeURIComponent(nome)}`);
          const dados = await resp.json();
          const temResultado = dados && (Array.isArray(dados) ? dados.length > 0 : true);
          window.delightsSetInputCheck?.(nomeInput, !!temResultado);
        } catch (e) { /* silencioso */ }
      }, 450);
    });
  }
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
    <img src="assets/img/icon-gift-box.png" alt="" class="modal__icon-hero">
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

  renderizarModalPresente(nome, valor, "Presente personalizado por você");
};

function renderizarModalPresente(nome, valor, desc) {
  const modal    = document.getElementById("modal");
  const conteudo = document.getElementById("modalConteudo");
  const pixCode  = getPixCode(nome);
  const isEmail  = isPixEmailChave(pixCode);

  conteudo.innerHTML = `
    <p class="modal__eyebrow">${window.I18N.t("Presente","Regalo")}</p>
    <img src="assets/img/icon-gift-box.png" alt="" class="modal__icon-hero">
    <h2 class="modal__titulo" id="modalTitulo">${escHtml(nome)}</h2>
    <p class="modal__valor">R$ ${escHtml(valor)}</p>
    <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:1.25rem">${escHtml(desc)}</p>

    <div class="pix__box">
      <p class="pix__label"><img src="assets/img/icon-pix.png" alt="">${isEmail ? window.I18N.t("Chave Pix (e-mail)","Chiave Pix (e-mail)") : window.I18N.t("Pix copia-e-cola","Pix copia e incolla")}</p>
      <p class="pix__code" id="pixCode">${escHtml(pixCode)}</p>
      <button class="btn btn--outline-green btn--sm" type="button" onclick="copiarPix()">${isEmail ? window.I18N.t("Copiar chave","Copia chiave") : window.I18N.t("Copiar código Pix","Copia codice Pix")}</button>
    </div>

    <div class="modal__form" id="presenteForm">
      <div class="modal__field">
        <label class="modal__label" for="presenteNome">${window.I18N.t("Seu nome","Il tuo nome")}</label>
        <input type="text" id="presenteNome" class="modal__input" autocomplete="name" placeholder="${window.I18N.t("Como prefere ser chamado(a)","Come preferisci essere chiamato/a")}" />
      </div>
      <div class="modal__field">
        <label class="modal__label" for="presenteEmail"><img src="assets/img/icon-envelope.png" alt="" class="modal__label-icon">${window.I18N.t("Seu e-mail","La tua e-mail")}</label>
        <input type="email" id="presenteEmail" class="modal__input" autocomplete="email" placeholder="seuemail@exemplo.com" />
      </div>
      <div class="modal__field">
        <label class="modal__label" for="presenteMensagem"><img src="assets/img/icon-rsvp-envelope.png" alt="" class="modal__label-icon">${window.I18N.t("Mensagem (opcional)","Messaggio (opzionale)")}</label>
        <textarea id="presenteMensagem" class="modal__textarea" placeholder="${window.I18N.t("Deixe uma mensagem para os noivos…","Lascia un messaggio per gli sposi…")}"></textarea>
      </div>
      <div id="presenteErro"></div>
      <button class="btn btn--terra" type="button" id="btnPresente" onclick="enviarPresente('${escAttr(nome)}','${escAttr(valor)}')">
        ${window.I18N.t("Já fiz o Pix","Ho già fatto il Pix")} <img src="assets/img/icon-heart-full.png" alt="" class="modal__icon-inline" style="margin-right:0;margin-left:.25rem">
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
    const orig = btn.innerHTML;
    const label = window.I18N && window.I18N.lang === "it" ? "Copiato!" : "Copiado!";
    btn.innerHTML = `<img src="assets/img/icon-check-decorative.png" alt="" style="width:1.1em;height:1.1em;object-fit:contain;vertical-align:middle;margin-right:.3em">${label}`;
    btn.style.color = "var(--sage-dark)";
    btn.classList.remove("delights-bounce");
    requestAnimationFrame(() => btn.classList.add("delights-bounce"));
    setTimeout(() => { btn.innerHTML = orig; btn.style.color = ""; btn.classList.remove("delights-bounce"); }, 2000);
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
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">${window.I18N.t("Informe seu nome.","Inserisci il tuo nome.")}</p>`;
    document.getElementById("presenteNome")?.focus();
    return;
  }
  if (!email || !email.includes("@")) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">${window.I18N.t("Digite um e-mail válido.","Inserisci un&#39;e-mail valida.")}</p>`;
    document.getElementById("presenteEmail")?.focus();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${window.I18N.t('Registrando…','Registrazione…')}`;

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "gift", nome: nomeRem, email, presente: nome, valor, mensagem, lang: (window.I18N && window.I18N.lang) || "pt" })
    });
    const json = await resp.json();
    if (json.sucesso) {
      document.getElementById("modalConteudo").innerHTML = `
        <div class="modal__sucesso">
          <div class="modal__sucesso-icon"><img src="assets/img/icon-gift-box.png" alt=""></div>
          <h3>${window.I18N.t("Presente registrado!","Regalo registrato!")}</h3>
          <p>${window.I18N.t("Obrigado","Grazie")}, ${escHtml(nomeRem)}!<br>${window.I18N.t("Enviamos uma cópia para","Abbiamo inviato una copia a")} <strong>${escHtml(email)}</strong>.</p>
          <p class="mt-2" style="font-size:.95rem;font-weight:600;color:var(--sage-dark);background:var(--bg-green);border:1px solid var(--line-green);border-radius:var(--radius);padding:.85rem 1rem;display:flex;align-items:center;gap:.6rem;justify-content:center;text-align:left">
            <img src="assets/img/icon-envelope.png" alt="" style="width:2rem;height:2rem;object-fit:contain;flex-shrink:0">
            ${window.I18N.t("Não chegou? Confira spam e promoções.","Non è arrivata? Controlla spam e promozioni.")}
          </p>
        </div>`;
      celebrarConfirmacao();
    } else { throw new Error(json.erro); }
  } catch {
    btn.disabled = false;
    btn.innerHTML = `${window.I18N.t("Já fiz o Pix","Ho già fatto il Pix")} <img src='assets/img/icon-heart-full.png' alt='' class='modal__icon-inline' style='margin-right:0;margin-left:.25rem'>`;
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">${window.I18N.t("Não conseguimos registrar. Tente novamente.","Non siamo riusciti a registrare. Riprova.")}</p>`;
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

/* Avatar decorativo determinístico por nome — mesma pessoa sempre recebe o mesmo ícone */
const AVATAR_POOL = [
  "icon-sunglasses.png", "icon-flower-crown.png", "icon-bouquet-tall.png",
  "icon-cocktail.png", "icon-bell.png", "icon-laurel.png",
  "icon-sparkle.png", "icon-gift-box-sage.png", "icon-palm.png",
  "icon-wine.png", "icon-music.png", "icon-string-lights.png"
];
function avatarParaNome(nome) {
  const s = String(nome || "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_POOL[hash % AVATAR_POOL.length];
}

/* ═══════════════════════════════════════════════════════════
   GIAN & TIAGO — app.js
   Responsável por: nav, reveal, RSVP, modal de presentes
═══════════════════════════════════════════════════════════ */

"use strict";

/* ── CONFIGURAÇÃO ─────────────────────────────────────────── */
const API_URL = "https://script.google.com/macros/s/AKfycbyYyCrT2oNLYDLcXDWq8X2b9Y0u0EbmQ7pUnpdRA3g0wZNUDtX0VTNrHq26wIngBwHn/exec";

const PIX_CODE     = "COLE_AQUI_O_CODIGO_PIX_COPIA_E_COLA"; // ← substituir
const PIX_RECEIVER = "Gian & Tiago";
const EMAIL_CONTATO = "casamento.tiagoegian@gmail.com";

/* ── ESTADO RSVP ──────────────────────────────────────────── */
let convidadoSelecionado = null;

/* ══════════════════════════════════════════════════════════
   1. NAV — scroll + hamburger
══════════════════════════════════════════════════════════ */
(function initNav() {
  const nav       = document.getElementById("nav");
  const hamburger = document.getElementById("hamburger");
  const links     = document.getElementById("navLinks");

  // Sombra ao rolar
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });

  // Hamburger
  hamburger.addEventListener("click", () => {
    const aberto = links.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", aberto);
  });

  // Fechar menu ao clicar em link
  links.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    });
  });

  // Fechar ao clicar fora
  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target)) {
      links.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    }
  });
})();

/* ══════════════════════════════════════════════════════════
   2. REVEAL — IntersectionObserver
══════════════════════════════════════════════════════════ */
(function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  items.forEach(el => observer.observe(el));
})();

/* ══════════════════════════════════════════════════════════
   3. RSVP
══════════════════════════════════════════════════════════ */

/** Busca convidados pelo nome */
async function buscar() {
  const input  = document.getElementById("nomeBusca");
  const nome   = (input.value || "").trim();
  const btnBuscar = document.getElementById("btnBuscar");
  const resultado = document.getElementById("rsvp-resultado");

  if (!nome) {
    mostrarHint("Digite seu nome para buscar.", "info");
    input.focus();
    return;
  }

  // Loading state
  btnBuscar.disabled = true;
  btnBuscar.innerHTML = '<span class="spinner"></span>';
  resultado.innerHTML = "";
  resultado.classList.add("oculto");

  try {
    const resposta = await fetch(`${API_URL}?nome=${encodeURIComponent(nome)}`);
    const dados    = await resposta.json();

    btnBuscar.disabled = false;
    btnBuscar.textContent = "Buscar";

    if (!dados || dados.length === 0) {
      resultado.classList.remove("oculto");
      resultado.innerHTML = `
        <p class="rsvp__msg rsvp__msg--info">
          Não encontramos esse nome na lista. Tente pelo primeiro nome ou sobrenome.<br>
          Dificuldades? Fale com a gente pelo
          <a href="mailto:${EMAIL_CONTATO}" style="color:var(--terracotta)">${EMAIL_CONTATO}</a>.
        </p>
      `;
      return;
    }

    resultado.classList.remove("oculto");
    resultado.innerHTML = `<p class="rsvp__hint" style="margin-bottom:.75rem">Encontramos ${dados.length > 1 ? dados.length + " nomes" : "1 nome"}. Selecione o seu:</p>`;

    dados.forEach(item => {
      const card = document.createElement("div");
      card.className = "convidado__card";
      card.innerHTML = `
        <div class="convidado__info">
          <p class="convidado__nome">${escHtml(item.nome)}</p>
          <p class="convidado__tel">Tel: ${escHtml(item.telefone)}</p>
        </div>
        <button class="btn btn--outline btn--sm" type="button">Selecionar</button>
      `;
      card.querySelector("button").addEventListener("click", () => selecionar(item));
      resultado.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    btnBuscar.disabled = false;
    btnBuscar.textContent = "Buscar";
    resultado.classList.remove("oculto");
    resultado.innerHTML = `
      <p class="rsvp__msg rsvp__msg--erro">
        Não conseguimos buscar agora. Tente novamente em alguns minutos ou entre em contato pelo
        <a href="mailto:${EMAIL_CONTATO}" style="color:var(--terracotta-hover)">${EMAIL_CONTATO}</a>.
      </p>
    `;
  }
}

/** Exibe formulário de confirmação para o convidado selecionado */
function selecionar(item) {
  convidadoSelecionado = item;
  const resultado = document.getElementById("rsvp-resultado");

  resultado.innerHTML = `
    <div style="margin-bottom:1rem">
      <p class="rsvp__hint">
        Confirmando presença de:
        <strong>${escHtml(item.nome)}</strong>
        · Tel: ${escHtml(item.telefone)}
      </p>
    </div>

    <div class="rsvp__form" id="rsvpForm">

      <div class="rsvp__field">
        <label class="rsvp__label" for="ultimos4">Últimos 4 dígitos do telefone</label>
        <input
          type="tel"
          id="ultimos4"
          class="rsvp__input"
          maxlength="4"
          inputmode="numeric"
          placeholder="0000"
          autocomplete="off"
          aria-describedby="ultimos4Hint"
        />
        <p class="rsvp__hint" id="ultimos4Hint">Confirme o número cadastrado para segurança.</p>
      </div>

      <div class="rsvp__field">
        <label class="rsvp__label" for="emailRsvp">Seu e-mail</label>
        <input
          type="email"
          id="emailRsvp"
          class="rsvp__input"
          placeholder="seuemail@exemplo.com"
          autocomplete="email"
        />
        <p class="rsvp__hint">Enviaremos a confirmação para esse endereço.</p>
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

      <div id="rsvpErro"></div>

      <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:.5rem">
        <button class="btn btn--primary" type="button" id="btnConfirmar" onclick="confirmar()">
          Confirmar
        </button>
        <button class="btn btn--outline" type="button" onclick="voltarBusca()">
          Voltar
        </button>
      </div>

    </div>
  `;
}

/** Envia confirmação para o Apps Script */
async function confirmar() {
  const ultimos4  = (document.getElementById("ultimos4").value || "").replace(/\D/g, "");
  const email     = (document.getElementById("emailRsvp").value || "").trim();
  const statusEl  = document.querySelector('input[name="statusRsvp"]:checked');
  const status    = statusEl ? statusEl.value : "SIM";
  const btnConf   = document.getElementById("btnConfirmar");
  const erroDiv   = document.getElementById("rsvpErro");

  // Validação client-side
  erroDiv.innerHTML = "";

  if (ultimos4.length !== 4) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Digite os 4 últimos dígitos do telefone.</p>`;
    document.getElementById("ultimos4").focus();
    return;
  }

  if (!email || !email.includes("@")) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Digite um e-mail válido.</p>`;
    document.getElementById("emailRsvp").focus();
    return;
  }

  // Loading
  btnConf.disabled = true;
  btnConf.innerHTML = '<span class="spinner"></span> Enviando…';

  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action:   "rsvp",
        nome:     convidadoSelecionado.nome,
        rowId:    convidadoSelecionado.rowId,
        ultimos4: ultimos4,
        email:    email,
        status:   status
      })
    });

    const json = await resposta.json();

    if (json.sucesso) {
      mostrarSucessoRsvp(email, status);
    } else if (json.erro === "telefone_incorreto") {
      btnConf.disabled = false;
      btnConf.textContent = "Confirmar";
      erroDiv.innerHTML = `
        <p class="rsvp__msg rsvp__msg--erro">
          Os últimos 4 dígitos não conferem com o número cadastrado.<br>
          Verifique e tente novamente, ou fale conosco pelo
          <a href="mailto:${EMAIL_CONTATO}" style="color:var(--terracotta-hover)">${EMAIL_CONTATO}</a>.
        </p>
      `;
    } else {
      throw new Error(json.erro || "erro desconhecido");
    }

  } catch (err) {
    console.error(err);
    btnConf.disabled = false;
    btnConf.textContent = "Confirmar";
    erroDiv.innerHTML = `
      <p class="rsvp__msg rsvp__msg--erro">
        Não conseguimos registrar agora. Tente novamente em alguns minutos ou envie mensagem para
        <a href="mailto:${EMAIL_CONTATO}" style="color:var(--terracotta-hover)">${EMAIL_CONTATO}</a>.
      </p>
    `;
  }
}

/** Tela de sucesso do RSVP */
function mostrarSucessoRsvp(email, status) {
  const resultado = document.getElementById("rsvp-resultado");
  const statusLabel = status === "SIM" ? "Presença confirmada ❤️" : "Recebemos sua resposta.";
  const subMsg = status === "SIM"
    ? "Mal podemos esperar para te ver lá!"
    : "Sentiremos sua falta. Obrigado por avisar.";

  resultado.innerHTML = `
    <div class="rsvp__sucesso">
      <div class="rsvp__sucesso-icon">${status === "SIM" ? "❤️" : "💌"}</div>
      <h3>${statusLabel}</h3>
      <p>${subMsg}</p>
      <p class="mt-2">
        Enviamos uma confirmação para:<br>
        <span class="rsvp__email-destaque">${escHtml(email)}</span>
      </p>
      <p class="mt-2">
        Não recebeu o e-mail? Verifique se o endereço acima está correto<br>
        e confira sua caixa de <strong>spam</strong> ou <strong>promoções</strong>.
      </p>
      <p class="mt-2">
        Se não chegar em alguns minutos, tire um print desta tela e envie para:<br>
        <a href="mailto:${EMAIL_CONTATO}" style="color:var(--terracotta)">${EMAIL_CONTATO}</a>
      </p>
    </div>
  `;
}

/** Volta ao estado de busca */
function voltarBusca() {
  convidadoSelecionado = null;
  document.getElementById("rsvp-resultado").classList.add("oculto");
  document.getElementById("rsvp-resultado").innerHTML = "";
  document.getElementById("nomeBusca").value = "";
  document.getElementById("nomeBusca").focus();
}

/** Atalho Enter no campo de busca */
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("nomeBusca");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") buscar();
    });
  }
});

/** Mostra mensagem de hint no RSVP inicial */
function mostrarHint(msg, tipo) {
  const hint = document.getElementById("rsvpHint");
  hint.textContent = msg;
  hint.style.color = tipo === "erro" ? "var(--terracotta)" : "var(--sage)";
}

/* ══════════════════════════════════════════════════════════
   4. MODAL DE PRESENTES
══════════════════════════════════════════════════════════ */

/** Abre o modal com dados do card clicado */
function abrirModal(btn) {
  const card    = btn.closest(".presente__card");
  const nome    = card.dataset.nome;
  const valor   = card.dataset.valor;
  const desc    = card.dataset.desc;

  const modal   = document.getElementById("modal");
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
      <button class="btn btn--outline btn--sm" type="button" onclick="copiarPix()">
        Copiar chave Pix
      </button>
    </div>
    ` : `
    <div class="pix__box" style="background:var(--bg-soft)">
      <p class="pix__label">Chave Pix</p>
      <p style="font-size:.85rem;color:var(--sage);font-style:italic">
        [Código Pix copia-e-cola será inserido em breve]
      </p>
    </div>
    `}

    <div class="modal__form" id="presenteForm">

      <div class="modal__field">
        <label class="modal__label" for="presenteNome">Seu nome</label>
        <input
          type="text"
          id="presenteNome"
          class="modal__input"
          autocomplete="name"
          placeholder="Como prefere ser chamado(a)"
        />
      </div>

      <div class="modal__field">
        <label class="modal__label" for="presenteEmail">Seu e-mail</label>
        <input
          type="email"
          id="presenteEmail"
          class="modal__input"
          autocomplete="email"
          placeholder="seuemail@exemplo.com"
        />
      </div>

      <div class="modal__field">
        <label class="modal__label" for="presenteMensagem">Mensagem (opcional)</label>
        <textarea
          id="presenteMensagem"
          class="modal__textarea"
          placeholder="Deixe uma mensagem para os noivos…"
        ></textarea>
      </div>

      <div id="presenteErro"></div>

      <button class="btn btn--primary" type="button" id="btnPresente" onclick="enviarPresente('${escAttr(nome)}','${escAttr(valor)}')">
        Já fiz o Pix ❤️
      </button>

    </div>
  `;

  modal.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
  modal.querySelector(".modal__close").focus();
}

/** Fecha o modal */
function fecharModal() {
  const modal = document.getElementById("modal");
  modal.setAttribute("hidden", "");
  document.body.style.overflow = "";
}

// Fechar com Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModal();
});

/** Copia o código Pix */
async function copiarPix() {
  const code = document.getElementById("pixCode");
  if (!code) return;

  try {
    await navigator.clipboard.writeText(code.textContent.trim());
    const btn = document.querySelector('[onclick="copiarPix()"]');
    const original = btn.textContent;
    btn.textContent = "Copiado!";
    btn.style.color = "var(--olive)";
    btn.style.borderColor = "var(--olive)";
    setTimeout(() => {
      btn.textContent = original;
      btn.style.color = "";
      btn.style.borderColor = "";
    }, 2000);
  } catch {
    alert("Não foi possível copiar automaticamente. Selecione e copie manualmente.");
  }
}

/** Envia confirmação de presente */
async function enviarPresente(nome, valor) {
  const nomeRem  = (document.getElementById("presenteNome").value || "").trim();
  const email    = (document.getElementById("presenteEmail").value || "").trim();
  const mensagem = (document.getElementById("presenteMensagem").value || "").trim();
  const erroDiv  = document.getElementById("presenteErro");
  const btn      = document.getElementById("btnPresente");

  erroDiv.innerHTML = "";

  if (!nomeRem) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Por favor, informe seu nome.</p>`;
    document.getElementById("presenteNome").focus();
    return;
  }

  if (!email || !email.includes("@")) {
    erroDiv.innerHTML = `<p class="rsvp__msg rsvp__msg--erro">Digite um e-mail válido.</p>`;
    document.getElementById("presenteEmail").focus();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Registrando…';

  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action:    "gift",
        nome:      nomeRem,
        email:     email,
        presente:  nome,
        valor:     valor,
        mensagem:  mensagem
      })
    });

    const json = await resposta.json();

    if (json.sucesso) {
      document.getElementById("modalConteudo").innerHTML = `
        <div class="modal__sucesso">
          <div class="modal__sucesso-icon">🎁</div>
          <h3>Presente registrado!</h3>
          <p>
            Obrigado, ${escHtml(nomeRem)}!<br>
            Registramos sua confirmação de presente.<br>
            Enviamos uma cópia para <strong>${escHtml(email)}</strong>.
          </p>
          <p class="mt-2" style="font-size:.8rem;color:var(--sage)">
            Se o e-mail não chegar, confira spam e promoções.<br>
            Dúvidas? <a href="mailto:${EMAIL_CONTATO}" style="color:var(--terracotta)">${EMAIL_CONTATO}</a>
          </p>
        </div>
      `;
    } else {
      throw new Error(json.erro || "erro");
    }

  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.innerHTML = "Já fiz o Pix ❤️";
    erroDiv.innerHTML = `
      <p class="rsvp__msg rsvp__msg--erro">
        Não conseguimos registrar. Tente novamente ou escreva para
        <a href="mailto:${EMAIL_CONTATO}" style="color:var(--terracotta-hover)">${EMAIL_CONTATO}</a>.
      </p>
    `;
  }
}

/* ══════════════════════════════════════════════════════════
   5. UTILITÁRIOS
══════════════════════════════════════════════════════════ */

/** Escapa HTML para evitar XSS ao inserir texto do usuário */
function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escapa valor para uso em atributos inline HTML */
function escAttr(str) {
  return String(str || "").replace(/'/g, "\\'");
}

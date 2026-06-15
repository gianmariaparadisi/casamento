/* ══════════════════════════════════════════════════════════
   I18N — Toggle Português / Italiano via ?lang=it
   Marque elementos traduzíveis com data-it="texto em italiano".
   Para HTML interno (com tags), use data-it-html="<b>...</b>".
   Para atributos (placeholder, aria-label, title), use
   data-it-placeholder="...", data-it-aria-label="...", etc.
══════════════════════════════════════════════════════════ */
(function () {
  function getLang() {
    const params = new URLSearchParams(window.location.search);
    return params.get("lang") === "it" ? "it" : "pt";
  }

  function buildUrl(lang) {
    const url = new URL(window.location.href);
    if (lang === "it") url.searchParams.set("lang", "it");
    else url.searchParams.delete("lang");
    return url.pathname + (url.search ? url.search : "") + url.hash;
  }

  function isInternalLink(href) {
    if (!href) return false;
    if (href.startsWith("#")) return false; // âncora na mesma página, preserva idioma naturalmente
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith("http")) return false; // outros esquemas
    if (/^https?:\/\//i.test(href)) {
      // só propaga para links do próprio site
      try {
        const u = new URL(href, window.location.href);
        return u.origin === window.location.origin;
      } catch (e) { return false; }
    }
    return true; // relativo (ex: index.html, transfer.html)
  }

  function propagateLangToLinks() {
    if (getLang() !== "it") return;
    document.querySelectorAll("a[href]").forEach(a => {
      if (a.id === "langToggle") return;
      const href = a.getAttribute("href");
      if (!isInternalLink(href)) return;
      try {
        const u = new URL(href, window.location.href);
        u.searchParams.set("lang", "it");
        // mantém o link relativo/curto quando possível
        if (!/^https?:\/\//i.test(href)) {
          a.setAttribute("href", u.pathname.split("/").pop() + (u.search || "") + (u.hash || ""));
        } else {
          a.setAttribute("href", u.toString());
        }
      } catch (e) { /* ignora hrefs inválidos */ }
    });
  }

  function applyTranslations(lang) {
    if (lang !== "it") return; // PT é o padrão, nada a fazer

    // Texto simples (textContent)
    document.querySelectorAll("[data-it]").forEach(el => {
      const it = el.getAttribute("data-it");
      if (el.dataset.ptOriginal === undefined) el.dataset.ptOriginal = el.textContent;
      el.textContent = it;
    });

    // HTML interno (com tags)
    document.querySelectorAll("[data-it-html]").forEach(el => {
      const it = el.getAttribute("data-it-html");
      if (el.dataset.ptOriginalHtml === undefined) el.dataset.ptOriginalHtml = el.innerHTML;
      el.innerHTML = it;
    });

    // Atributos comuns
    ["placeholder", "aria-label", "title", "alt"].forEach(attr => {
      document.querySelectorAll(`[data-it-${attr}]`).forEach(el => {
        el.setAttribute(attr, el.getAttribute(`data-it-${attr}`));
      });
    });

    document.documentElement.lang = "it";
  }

  function initLangToggle() {
    const lang = getLang();
    applyTranslations(lang);
    propagateLangToLinks();

    // Adiciona o botão de troca de idioma no nav, se ainda não existir
    const nav = document.getElementById("navLinks");
    if (nav && !document.getElementById("langToggle")) {
      const a = document.createElement("a");
      a.id = "langToggle";
      a.className = "nav__lang";
      a.href = buildUrl(lang === "it" ? "pt" : "it");
      a.setAttribute("aria-label", lang === "it" ? "Cambia in portoghese" : "Mudar para italiano");
      a.textContent = lang === "it" ? "PT" : "IT";
      nav.appendChild(a);
    }
  }

  // Expõe globalmente para módulos que renderizam HTML dinamicamente (ex: transfer.html)
  window.I18N = {
    lang: getLang(),
    t(pt, it) { return window.I18N.lang === "it" ? it : pt; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLangToggle);
  } else {
    initLangToggle();
  }
})();

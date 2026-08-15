/* ═══════════════════════════════════════════════════════════
   GIAN & TIAGO — Code.gs v5
   GET  ?nome=...                              → busca convidados
   GET  ?action=validarToken&token=&rowId=    → valida token
   GET  ?action=top10&jogo=                   → placar de jogos
   GET  ?action=wordle&data=DD/MM/YYYY        → palavra do Wordle
   GET  ?action=connect4&data=DD/MM/YYYY      → grupos do Connections
   GET  ?action=transferBusca&rowIds=&nomes=  → interesses de transfer existentes
   GET  ?action=arrumacao                     → contagens de interesse cabelo/maquiagem (madrinhas)
   POST action="rsvp"                         → confirma/altera presença
   POST action="gift"                         → registra presente
   POST action="reenviarEmail"                → reenvia e-mail
   POST action="score"                        → salva pontuação
   POST action="transfer"                     → interesse em transfer (por convidado)
   POST action="arrumacaoInteresse"           → registra interesse em cabelo/maquiagem (madrinhas)

   Todas as ações de POST que enviam e-mail ao convidado aceitam um
   campo opcional "lang" ("pt" | "it"). Quando lang === "it", o
   e-mail é enviado em italiano. Padrão: "pt".
═══════════════════════════════════════════════════════════ */

const SPREADSHEET_ID    = "1sk6G0Tt0K4r5UUaAyf9R6e0ZQuUUciDbbl3pKpxYTtQ";
const SHEET_CONVIDADOS  = "LISTA DE CONVIDADOS";
const SHEET_PRESENTES   = "PRESENTES";
const SHEET_PLACAR      = "PLACAR";
const SHEET_WORDLE      = "WORDLE";
const SHEET_CONNECT4    = "CONNECT 4";
const SHEET_TRANSFER    = "TRANSFER";
const SHEET_LUADEMEL    = "LUA DE MEL";
const SHEET_ARRUMACAO   = "ARRUMACAO";
const EMAIL_NOIVOS      = "casamento.tiagoegian@gmail.com";
const URL_SITE          = "https://gianmariaparadisi.github.io/casamento";
const DATA_LIMITE_ALT   = "12 de agosto de 2026";
const DATA_LIMITE_ALT_IT = "12 agosto 2026";
const DATA_LIMITE_TS    = new Date("2026-08-12T23:59:59-03:00");

/*
  ESTRUTURA DA ABA "LISTA DE CONVIDADOS"
  Col A (1): Grupo
  Col B (2): Nome
  Col C (3): Telefone
  Col D (4): Email
  Col E (5): Confirmado
  Col F (6): Data/Hora da confirmação
  Col G (7): Token de alteração

  ABA "WORDLE"
  Col A: Data (DD/MM/YYYY ou YYYY-MM-DD ou qualquer formato JS)
  Col B: Palavra do dia (ex: AMOR)
  Col C: Lista de palavras válidas de 5 letras (dicionário, uma por linha)

  ABA "CONNECT 4"
  Col A: Data
  Col B: Título grupo 1   Col C-F: 4 palavras grupo 1
  Col G: Título grupo 2   Col H-K: 4 palavras grupo 2
  Col L: Título grupo 3   Col M-P: 4 palavras grupo 3
  Col Q: Título grupo 4   Col R-U: 4 palavras grupo 4

  ABA "TRANSFER"
  Col A: Data/Hora  B: RowId (linha do convidado na LISTA DE CONVIDADOS)
  Col C: Nome       D: Grupo
  Col E: Trecho ("campinas" | "sao_paulo" | vazio)
  Col F: Pessoas
  -> Cada convidado tem NO MÁXIMO uma linha. trecho vazio = sem interesse
     (a linha é removida quando o interesse é retirado).

  ABA "PLACAR"
  Col A: Data/Hora  B: Nome  C: Jogo  D: Pontos

*/

/* ──────────────────────────────────────────────────────────
   doGet
────────────────────────────────────────────────────────── */
function doGet(e) {
  try {
    const action   = (e && e.parameter && e.parameter.action)   || "";
    const callback = (e && e.parameter && e.parameter.callback) || "";

    if (action === "debug")         return handleDebug(e, callback);
    if (action === "validarToken")  return handleValidarToken(e, callback);
    if (action === "top10")         return handleTop10(e, callback);
    if (action === "wordle")        return handleWordle(e, callback);
    if (action === "connect4")      return handleConnect4(e, callback);
    if (action === "transferBusca") return handleTransferBusca(e, callback);
    if (action === "luademel")      return handleLuaDeMel(e, callback);
    if (action === "arrumacao")     return handleArrumacao(e, callback);
    if (e.parameter.action === 'tema' && e.parameter.jogo === 'mosaico') {
        return ContentService.createTextOutput(JSON.stringify(handleTemaMosaico(e)))
    .setMimeType(ContentService.MimeType.JSON);
    }

    // Busca padrão por nome
    return handleBusca(e, callback);

  } catch (err) {
    const callback = (e && e.parameter && e.parameter.callback) || "";
    return jsonResponse({ erro: "erro_interno", detalhe: err.message }, callback);
  }
}

/* ──────────────────────────────────────────────────────────
   doPost
────────────────────────────────────────────────────────── */
function doPost(e) {
  try {
    const dados  = JSON.parse(e.postData.contents);
    const action = String(dados.action || "rsvp");

    if (action === "rsvp")          return handleRsvp(dados);
    if (action === "gift")          return handleGift(dados);
    if (action === "reenviarEmail") return handleReenviar(dados);
    if (action === "score")         return handleScore(dados);
    if (action === "transfer")      return handleTransfer(dados);
    if (action === "votarLuaDeMel") return handleVotarLuaDeMel(dados);
    if (action === "arrumacaoInteresse") return handleArrumacaoInteresse(dados);

    return jsonResponse({ sucesso: false, erro: "action_desconhecida" });

  } catch (err) {
    return jsonResponse({ sucesso: false, erro: "erro_interno", detalhe: err.message });
  }
}

/* ──────────────────────────────────────────────────────────
   I18N — textos de e-mail em PT / IT
   Uso: T_("chave", lang [, ...args])
────────────────────────────────────────────────────────── */
function normalizarLang_(lang) {
  return String(lang || "").toLowerCase().trim() === "it" ? "it" : "pt";
}

const EMAIL_STRINGS_ = {
  // ── RSVP ──────────────────────────────────────────────
  rsvp_subject_sim: {
    pt: "Presença confirmada! ❤️",
    it: "Presenza confermata! ❤️"
  },
  rsvp_subject_nao: {
    pt: "Confirmação recebida 💌",
    it: "Conferma ricevuta 💌"
  },
  rsvp_ola: {
    pt: function(nome) { return "Olá, " + nome + "!"; },
    it: function(nome) { return "Ciao, " + nome + "!"; }
  },
  rsvp_intro: {
    pt: "Recebemos sua resposta. Aqui está um resumo:",
    it: "Abbiamo ricevuto la tua risposta. Ecco un riepilogo:"
  },
  rsvp_status_label: {
    pt: "Status",
    it: "Stato"
  },
  rsvp_status_sim: {
    pt: "Confirmado",
    it: "Confermato"
  },
  rsvp_status_nao: {
    pt: "Não comparecerá",
    it: "Non sarà presente"
  },
  rsvp_grupo_msg: {
    pt: function(nomes) { return '<p style="margin-top:.75rem;font-size:.85rem;color:#5A534D">Confirmado também para: <strong>' + nomes + '</strong></p>'; },
    it: function(nomes) { return '<p style="margin-top:.75rem;font-size:.85rem;color:#5A534D">Confermato anche per: <strong>' + nomes + '</strong></p>'; }
  },
  rsvp_alterar_prazo: {
    pt: function(prazo) { return 'Precisa alterar sua confirmação? Você tem até <strong>' + prazo + '</strong>.'; },
    it: function(prazo) { return 'Devi modificare la tua conferma? Hai tempo fino al <strong>' + prazo + '</strong>.'; }
  },
  rsvp_btn_alterar: {
    pt: "Alterar minha confirmação",
    it: "Modifica la mia conferma"
  },
  rsvp_link_fallback: {
    pt: "Se o botão não funcionar, copie e cole este link no navegador:",
    it: "Se il pulsante non funziona, copia e incolla questo link nel browser:"
  },
  rsvp_spam_aviso: {
    pt: "Não recebeu em sua caixa principal? Verifique <strong>spam</strong> e <strong>promoções</strong>.<br>Dúvidas? Responda este e-mail.",
    it: "Non l'hai ricevuta nella posta principale? Controlla <strong>spam</strong> e <strong>promozioni</strong>.<br>Domande? Rispondi a questa e-mail."
  },
  assinatura: {
    pt: "Com carinho,<br><em>Gian & Tiago</em>",
    it: "Con affetto,<br><em>Gian & Tiago</em>"
  },

  // ── REENVIO ───────────────────────────────────────────
  reenvio_subject: {
    pt: "Confirmação de presença (reenvio) ❤️",
    it: "Conferma di presenza (nuovo invio) ❤️"
  },
  reenvio_intro: {
    pt: "Aqui está o reenvio da sua confirmação:",
    it: "Ecco il nuovo invio della tua conferma:"
  },
  reenvio_prazo: {
    pt: function(prazo) { return 'Prazo para alteração: <strong>' + prazo + '</strong>'; },
    it: function(prazo) { return 'Termine per la modifica: <strong>' + prazo + '</strong>'; }
  },

  // ── PRESENTES ─────────────────────────────────────────
  gift_subject: {
    pt: "Recebemos sua confirmação de presente 🎁",
    it: "Abbiamo ricevuto la tua conferma del regalo 🎁"
  },
  gift_obrigado: {
    pt: function(nome) { return "Obrigado, " + nome + "!"; },
    it: function(nome) { return "Grazie, " + nome + "!"; }
  },
  gift_intro: {
    pt: "Registramos sua confirmação de presente:",
    it: "Abbiamo registrato la tua conferma del regalo:"
  },
  gift_label: {
    pt: "Presente",
    it: "Regalo"
  },
  gift_felizes: {
    pt: "Estamos muito felizes com seu carinho. Até dezembro! ❤️",
    it: "Siamo molto felici per il tuo affetto. Ci vediamo a dicembre! ❤️"
  }
};

/* Retorna o texto traduzido. Se o valor for função, chama com os args extras. */
function T_(chave, lang) {
  const l = normalizarLang_(lang);
  const entry = EMAIL_STRINGS_[chave];
  if (!entry) return "";
  const val = entry[l] || entry.pt;
  if (typeof val === "function") {
    const args = Array.prototype.slice.call(arguments, 2);
    return val.apply(null, args);
  }
  return val;
}

/* ──────────────────────────────────────────────────────────
   WORDLE — retorna a palavra do dia + lista de palavras válidas
────────────────────────────────────────────────────────── */
function handleWordle(e, callback) {
  const dataParam = String((e && e.parameter && e.parameter.data) || "").trim();
  const dataBusca = normalizarData(dataParam) || dataHoje_();

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_WORDLE);
  if (!sheet) return jsonResponse({ palavra: null, validas: [] }, callback);

  const dados = sheet.getDataRange().getValues();

  let palavraDoDia = null;

  for (let i = 0; i < dados.length; i++) {
    const dataCelula = normalizarDataCelula(dados[i][0]);
    if (dataCelula === dataBusca) {
      palavraDoDia = String(dados[i][1] || "").toUpperCase().trim();
      break;
    }
  }

  const validas = [];
  for (let j = 0; j < dados.length; j++) {
    const palavra = String(dados[j][2] || "").toUpperCase().trim();
    if (palavra) validas.push(palavra);
  }

  if (palavraDoDia && validas.indexOf(palavraDoDia) === -1) {
    validas.push(palavraDoDia);
  }

  return jsonResponse({
    palavra: palavraDoDia,
    validas: validas
  }, callback);
}

/* ──────────────────────────────────────────────────────────
   CONNECT 4 — retorna os 4 grupos do dia
────────────────────────────────────────────────────────── */
function handleConnect4(e, callback) {
  const dataParam = String((e && e.parameter && e.parameter.data) || "").trim();
  const dataHoje  = normalizarData(dataParam) || dataHoje_();

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_CONNECT4);
  if (!sheet) return jsonResponse({ grupos: null }, callback);

  const dados = sheet.getDataRange().getValues();

  for (let i = 0; i < dados.length; i++) {
    const dataCelula = normalizarDataCelula(dados[i][0]);
    if (dataCelula !== dataHoje) continue;

    const linha = dados[i];
    const grupos = [];

    for (let g = 0; g < 4; g++) {
      const base    = 1 + g * 5;
      const titulo  = String(linha[base] || "").trim();
      const palavras = [];
      for (let p = 1; p <= 4; p++) {
        const palavra = String(linha[base + p] || "").trim();
        if (palavra) palavras.push(palavra.toUpperCase());
      }
      if (titulo && palavras.length === 4) {
        grupos.push({ titulo, palavras });
      }
    }

    if (grupos.length === 4) return jsonResponse({ grupos }, callback);
    break;
  }

  return jsonResponse({ grupos: null }, callback);
}


/* ──────────────────────────────────────────────────────────
   TRANSFER — busca interesses existentes por convidado
   GET ?action=transferBusca&rowIds=12,15&nomes=["Tiago","Gian"]

   Retorna: { registros: [ { rowId, nome, trecho }, ... ] }

   Usado pelo transfer.html para pré-marcar a opção de cada
   pessoa do grupo ao reabrir a página.
────────────────────────────────────────────────────────── */
function handleTransferBusca(e, callback) {
  const rowIdsParam = String((e && e.parameter && e.parameter.rowIds) || "").trim();
  let nomesParam = [];
  try {
    nomesParam = JSON.parse((e && e.parameter && e.parameter.nomes) || "[]");
  } catch (_) {
    nomesParam = [];
  }

  const rowIds = rowIdsParam
    ? rowIdsParam.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const nomesNorm = (Array.isArray(nomesParam) ? nomesParam : [])
    .map(n => normalizarTexto(n))
    .filter(Boolean);

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_TRANSFER);
  if (!sheet) return jsonResponse({ registros: [] }, callback);

  const dados = sheet.getDataRange().getValues();
  // Colunas: A Data/Hora, B RowId, C Nome, D Grupo, E Trecho, F Pessoas
  const registros = [];

  for (let i = 1; i < dados.length; i++) {
    const linha   = dados[i];
    const rowId   = String(linha[1] || "").trim();
    const nome    = String(linha[2] || "").trim();
    const trecho  = String(linha[4] || "").trim();
    if (!nome && !rowId) continue;

    const bateRowId = rowId && rowIds.includes(rowId);
    const bateNome  = !bateRowId && nomesNorm.includes(normalizarTexto(nome));

    if (bateRowId || bateNome) {
      registros.push({ rowId, nome, trecho });
    }
  }

  return jsonResponse({ registros }, callback);
}

/* ──────────────────────────────────────────────────────────
   TRANSFER — registra/atualiza/remove interesse em transfer
   POST action="transfer"

   Formato novo (preferido), um registro por convidado:
     {
       action: "transfer",
       modo: "por_convidado",
       registros: [
         { rowId, nome, grupo, trecho },   // trecho: "campinas" | "sao_paulo" | "" (remover)
         ...
       ]
     }

   Formato antigo (compatibilidade):
     { action: "transfer", nome, trecho, pessoas, tel }

   Cada convidado tem NO MÁXIMO uma linha na aba TRANSFER,
   identificada por RowId (ou por Nome quando RowId não existe).
   - trecho vazio  -> remove a linha (apaga o interesse)
   - trecho válido -> cria ou atualiza a linha existente
────────────────────────────────────────────────────────── */
function handleTransfer(dados) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet   = ss.getSheetByName(SHEET_TRANSFER);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TRANSFER);
    sheet.appendRow(["Data/Hora", "RowId", "Nome", "Grupo", "Trecho", "Pessoas"]);
  }

  const modo = String(dados.modo || "").trim();

  if (modo === "por_convidado" && Array.isArray(dados.registros)) {
    const registros = dados.registros
      .map(r => ({
        rowId:  String(r.rowId  || "").trim(),
        nome:   String(r.nome   || "").trim(),
        grupo:  String(r.grupo  || "").trim(),
        trecho: normalizarTrechoServidor_(r.trecho)
      }))
      .filter(r => r.nome || r.rowId);

    if (!registros.length) {
      return jsonResponse({ sucesso: false, erro: "dados_incompletos" });
    }

    const dadosAtuais = sheet.getDataRange().getValues();
    const alteracoes  = [];

    registros.forEach(r => {
      // Procura linha existente para este convidado (por RowId, senão por Nome)
      let linhaIdx = -1;
      for (let i = 1; i < dadosAtuais.length; i++) {
        const linhaRowId = String(dadosAtuais[i][1] || "").trim();
        const linhaNome  = String(dadosAtuais[i][2] || "").trim();
        const bateRowId  = r.rowId && linhaRowId && linhaRowId === r.rowId;
        const bateNome   = !r.rowId && normalizarTexto(linhaNome) === normalizarTexto(r.nome);
        if (bateRowId || bateNome) { linhaIdx = i; break; }
      }

      if (!r.trecho) {
        // Remover interesse: apaga a linha existente, se houver
        if (linhaIdx !== -1) {
          sheet.deleteRow(linhaIdx + 1); // +1 pois getDataRange é 0-indexed e Sheets é 1-indexed
          dadosAtuais.splice(linhaIdx, 1); // mantém dadosAtuais sincronizado para os próximos registros
        }
        alteracoes.push({ nome: r.nome, trecho: "" });
        return;
      }

      if (linhaIdx !== -1) {
        // Atualiza linha existente
        sheet.getRange(linhaIdx + 1, 1).setValue(new Date());
        sheet.getRange(linhaIdx + 1, 2).setValue(r.rowId);
        sheet.getRange(linhaIdx + 1, 3).setValue(r.nome);
        sheet.getRange(linhaIdx + 1, 4).setValue(r.grupo);
        sheet.getRange(linhaIdx + 1, 5).setValue(r.trecho);
        sheet.getRange(linhaIdx + 1, 6).setValue(1);
        dadosAtuais[linhaIdx] = [new Date(), r.rowId, r.nome, r.grupo, r.trecho, 1];
      } else {
        // Cria nova linha
        sheet.appendRow([new Date(), r.rowId, r.nome, r.grupo, r.trecho, 1]);
        dadosAtuais.push([new Date(), r.rowId, r.nome, r.grupo, r.trecho, 1]);
      }

      alteracoes.push({ nome: r.nome, trecho: r.trecho });
    });

    // Avisa os noivos com o resumo das alterações (e-mail interno, mantido em PT)
    if (alteracoes.length) {
      const linhasEmail = alteracoes.map(a =>
        `<p><strong>${escapeHtml(a.nome)}:</strong> ${escapeHtml(rotuloTrechoServidor_(a.trecho))}</p>`
      ).join("");

      MailApp.sendEmail({
        to:      EMAIL_NOIVOS,
        subject: `🚌 Atualização de transfer — ${escapeHtml(alteracoes[0].nome)}`,
        htmlBody: `
          <p>Alterações de interesse em transfer:</p>
          ${linhasEmail}
          <p><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
        `
      });
    }

    return jsonResponse({ sucesso: true, registros: alteracoes });
  }

  // ── Formato antigo (compatibilidade) ──────────────────────
  const nome    = String(dados.nome    || "").trim();
  const trecho  = normalizarTrechoServidor_(dados.trecho);
  const pessoas = Number(dados.pessoas || 1);
  const tel     = String(dados.tel     || "").trim();

  if (!nome) return jsonResponse({ sucesso: false, erro: "dados_incompletos" });

  if (!trecho) {
    // remover por nome
    const dadosAtuais = sheet.getDataRange().getValues();
    for (let i = 1; i < dadosAtuais.length; i++) {
      if (normalizarTexto(String(dadosAtuais[i][2] || "")) === normalizarTexto(nome)) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return jsonResponse({ sucesso: true });
  }

  sheet.appendRow([new Date(), "", nome, "", trecho, pessoas]);

  const trechoLabel = rotuloTrechoServidor_(trecho);

  MailApp.sendEmail({
    to:      EMAIL_NOIVOS,
    subject: `🚌 Novo interesse em transfer — ${escapeHtml(nome)}`,
    htmlBody: `
      <p><strong>Nome:</strong> ${escapeHtml(nome)}</p>
      <p><strong>Trecho:</strong> ${escapeHtml(trechoLabel)}</p>
      <p><strong>Pessoas:</strong> ${pessoas}</p>
      <p><strong>WhatsApp:</strong> ${escapeHtml(tel)}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
    `
  });

  return jsonResponse({ sucesso: true });
}

/* Normaliza o valor de trecho recebido do front-end para os
   valores canônicos usados na planilha: "campinas" | "sao_paulo" | "" */
function normalizarTrechoServidor_(valor) {
  const raw = String(valor || "").trim();
  const v = raw
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");

  if (!v) return "";
  if (["nao", "nao_tenho", "sem", "sem_interesse", "nenhum", "remover", "remove", "cancelar"].includes(v)) return "";
  if (v.includes("campinas")) return "campinas";
  if (v.includes("sao_paulo") || v === "sp" || v.includes("sampa")) return "sao_paulo";
  return "";
}

function rotuloTrechoServidor_(valor) {
  const v = normalizarTrechoServidor_(valor);
  if (v === "campinas")  return "Campinas ↔ Limeira";
  if (v === "sao_paulo") return "São Paulo ↔ Limeira";
  return "Sem interesse registrado";
}

/* ──────────────────────────────────────────────────────────
   LUA DE MEL — votação de destino
   GET  ?action=luademel              → retorna votos e % de cada destino
   POST action="votarLuaDeMel"        → soma +1 voto a um destino

   ABA "LUA DE MEL"
   Col A: Destino   Col B: Votos

   Destinos fixos (criados automaticamente se a aba não existir):
   Fernando de Noronha, Tailândia, Curaçao, África do Sul, Caribe, Espanha (Maiorca)
────────────────────────────────────────────────────────── */
const LUADEMEL_DESTINOS = [
  "Fernando de Noronha",
  "Tailândia",
  "África do Sul",
  "Caribe",
  "Espanha (Maiorca)"
];

function getOrCreateLuaDeMelSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_LUADEMEL);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LUADEMEL);
    sheet.appendRow(["Destino", "Votos"]);
    LUADEMEL_DESTINOS.forEach(d => sheet.appendRow([d, 0]));
  }
  return sheet;
}

function handleLuaDeMel(e, callback) {
  const sheet = getOrCreateLuaDeMelSheet_();
  const dados = sheet.getDataRange().getValues();

  const resultados = [];
  let total = 0;

  for (let i = 1; i < dados.length; i++) {
    const destino = String(dados[i][0] || "").trim();
    const votos   = Number(dados[i][1] || 0);
    if (!destino) continue;
    if (LUADEMEL_DESTINOS.indexOf(destino) === -1) continue; // ignora destinos removidos (ex: Curaçao)
    resultados.push({ destino, votos });
    total += votos;
  }

  resultados.forEach(r => {
    r.percentual = total > 0 ? Math.round((r.votos / total) * 1000) / 10 : 0;
  });

  return jsonResponse({ destinos: resultados, total }, callback);
}

function handleVotarLuaDeMel(dados) {
  const destino = String(dados.destino || "").trim();
  if (!destino) return jsonResponse({ sucesso: false, erro: "destino_ausente" });

  const sheet = getOrCreateLuaDeMelSheet_();
  const linhas = sheet.getDataRange().getValues();

  let linhaIdx = -1;
  for (let i = 1; i < linhas.length; i++) {
    if (normalizarTexto(String(linhas[i][0] || "")) === normalizarTexto(destino)) {
      linhaIdx = i;
      break;
    }
  }

  if (linhaIdx === -1) {
    // Destino novo (não estava na lista pré-definida) — adiciona linha
    sheet.appendRow([destino, 1]);
    linhaIdx = linhas.length; // nova linha
  } else {
    const votosAtuais = Number(linhas[linhaIdx][1] || 0);
    sheet.getRange(linhaIdx + 1, 2).setValue(votosAtuais + 1);
  }

  // Retorna o estado atualizado de todos os destinos
  return handleLuaDeMel({ parameter: {} }, "");
}
/* ──────────────────────────────────────────────────────────
   ARRUMAÇÃO (madrinhas) — interesse em cabelo/maquiagem
   GET  ?action=arrumacao                 → retorna contagens
   POST action="arrumacaoInteresse"       → registra nome + estúdio + interesse

   ABA "ARRUMACAO"
   Col A: Data/Hora   Col B: Nome   Col C: Estúdio   Col D: Interesse
   (Estúdio: "Charmant" | "Lefran" | "Tanto faz" | vazio)
────────────────────────────────────────────────────────── */
function getOrCreateArrumacaoSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_ARRUMACAO);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ARRUMACAO);
    sheet.appendRow(["Data/Hora", "Nome", "Estúdio", "Interesse"]);
  }
  return sheet;
}

function handleArrumacao(e, callback) {
  const sheet = getOrCreateArrumacaoSheet_();
  const dados = sheet.getDataRange().getValues();

  let charmant = 0, lefran = 0, tantoFaz = 0, interessadas = 0;
  const total = Math.max(dados.length - 1, 0);

  for (let i = 1; i < dados.length; i++) {
    const estudio    = normalizarTexto(String(dados[i][2] || ""));
    const interesse  = String(dados[i][3] || "");

    if (estudio === "charmant") charmant++;
    else if (estudio === "lefran") lefran++;
    else if (estudio.indexOf("tanto") !== -1) tantoFaz++;

    if (interesse && normalizarTexto(interesse).indexOf("nao tenho interesse") === -1) {
      interessadas++;
    }
  }

  return jsonResponse({ charmant, lefran, tantoFaz, interessadas, total }, callback);
}

function handleArrumacaoInteresse(dados) {
  const nome      = String(dados.nome || "").trim();
  const estudio   = String(dados.estudio || "").trim();
  const interesse = String(dados.interesse || "").trim();

  if (!nome)      return jsonResponse({ sucesso: false, erro: "nome_ausente" });
  if (!interesse) return jsonResponse({ sucesso: false, erro: "interesse_ausente" });

  const sheet = getOrCreateArrumacaoSheet_();
  sheet.appendRow([new Date(), nome, estudio, interesse]);

  // Retorna o estado atualizado das contagens
  return handleArrumacao({ parameter: {} }, "");
}

/* ──────────────────────────────────────────────────────────
   DEBUG — mostra o estado interno da planilha
   GET ?action=debug
────────────────────────────────────────────────────────── */
function handleDebug(e, callback) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const out = { timestamp: new Date().toISOString(), dataHoje: dataHoje_() };

  const sw = ss.getSheetByName(SHEET_WORDLE);
  if (!sw) {
    out.wordle = "ABA NAO ENCONTRADA — crie a aba com nome exato: WORDLE";
  } else {
    const dw = sw.getDataRange().getValues();
    out.wordle = {
      total_linhas: dw.length,
      primeiras_5: dw.slice(0, 5).map(function(r) {
        return {
          col_A_raw:  String(r[0]),
          col_A_tipo: typeof r[0],
          col_A_ehDate: r[0] instanceof Date,
          col_A_norm: normalizarDataCelula(r[0]),
          col_B: String(r[1] || "")
        };
      })
    };
  }

  const sc = ss.getSheetByName(SHEET_CONNECT4);
  if (!sc) {
    out.connect4 = "ABA NAO ENCONTRADA — crie a aba com nome exato: CONNECT 4";
  } else {
    const dc = sc.getDataRange().getValues();
    out.connect4 = {
      total_linhas: dc.length,
      primeiras_3: dc.slice(0, 3).map(function(r) {
        return {
          col_A_norm: normalizarDataCelula(r[0]),
          titulo_g1: String(r[1] || ""),
          palavra1_g1: String(r[2] || "")
        };
      })
    };
  }

  return jsonResponse(out, callback);
}

/* ──────────────────────────────────────────────────────────
   BUSCA FUZZY — tolerante a erros de digitação
────────────────────────────────────────────────────────── */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function matchFuzzy(nomePlanilha, busca) {
  const nTokens = normalizarTexto(nomePlanilha).split(" ").filter(Boolean);
  const bTokens = busca.split(" ").filter(Boolean);

  for (const bt of bTokens) {
    for (const nt of nTokens) {
      if (nt.includes(bt)) return { match: true, score: 1 };
    }
  }

  const todosBatem = bTokens.every(bt =>
    nTokens.some(nt => nt.includes(bt) || bt.includes(nt))
  );
  if (todosBatem && bTokens.length > 1) return { match: true, score: 2 };

  for (const bt of bTokens) {
    if (bt.length < 4) continue;
    for (const nt of nTokens) {
      if (nt.length < 4) continue;
      const maxDist = bt.length <= 5 ? 1 : 2;
      if (levenshtein(bt, nt) <= maxDist) return { match: true, score: 3 };
    }
  }

  for (const bt of bTokens) {
    if (bt.length < 3) continue;
    for (const nt of nTokens) {
      if (nt.startsWith(bt)) return { match: true, score: 4 };
    }
  }

  return { match: false, score: 99 };
}

function handleBusca(e, callback) {
  const nomeBusca = normalizarTexto((e && e.parameter && e.parameter.nome) || "").trim();
  if (!nomeBusca || nomeBusca.length < 2) return jsonResponse([], callback);

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_CONVIDADOS);
  const dados = sheet.getDataRange().getValues();

  const matchesBrutos = [];
  for (let i = 1; i < dados.length; i++) {
    const nome = String(dados[i][1] || "");
    if (!nome) continue;
    const { match, score } = matchFuzzy(nome, nomeBusca);
    if (match) matchesBrutos.push({ rowIndex: i, linha: dados[i], score });
  }

  if (!matchesBrutos.length) return jsonResponse([], callback);

  matchesBrutos.sort((a, b) => a.score - b.score);
  const matches = matchesBrutos.slice(0, 8);

  const rowIdsRetornados = new Set();
  const resultado = [];

  matches.forEach(({ rowIndex, linha }) => {
    const grupoMatch = String(linha[0] || "").trim();
    const linhasParaAdicionar = [];

    if (grupoMatch) {
      for (let i = 1; i < dados.length; i++) {
        const grupoLinha = String(dados[i][0] || "").trim();
        if (grupoLinha === grupoMatch && !rowIdsRetornados.has(i + 1)) {
          linhasParaAdicionar.push({ rowIndex: i, linha: dados[i] });
          rowIdsRetornados.add(i + 1);
        }
      }
    } else {
      if (!rowIdsRetornados.has(rowIndex + 1)) {
        linhasParaAdicionar.push({ rowIndex: rowIndex, linha: dados[rowIndex] });
        rowIdsRetornados.add(rowIndex + 1);
      }
    }

    linhasParaAdicionar.forEach(({ rowIndex: ri, linha: l }) => {
      const telefone = String(l[2] || "").replace(/\D/g, "");
      resultado.push({
        nome:     String(l[1] || ""),
        telefone: telefone ? "****" + telefone.slice(-4) : "",
        rowId:    ri + 1,
        grupo:    String(l[0] || ""),
        status:   String(l[4] || "")
      });
    });
  });

  return jsonResponse(resultado, callback);
}

/* ──────────────────────────────────────────────────────────
   Valida token de alteração
────────────────────────────────────────────────────────── */
function handleValidarToken(e, callback) {
  const token = String((e && e.parameter && e.parameter.token) || "").trim();
  const rowId = parseInt((e && e.parameter && e.parameter.rowId) || "0");

  if (!token || !rowId) return jsonResponse({ sucesso: false, erro: "parametros_invalidos" }, callback);
  if (new Date() > DATA_LIMITE_TS) return jsonResponse({ sucesso: false, erro: "prazo_expirado" }, callback);

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_CONVIDADOS);
  const dados = sheet.getDataRange().getValues();

  const i = rowId - 1;
  if (i < 1 || i >= dados.length) return jsonResponse({ sucesso: false, erro: "linha_invalida" }, callback);

  const tokenPlanilha = String(dados[i][6] || "").trim();
  if (!tokenPlanilha || tokenPlanilha !== token) {
    return jsonResponse({ sucesso: false, erro: "token_invalido" }, callback);
  }

  const telefone = String(dados[i][2] || "").replace(/\D/g, "");
  return jsonResponse({
    sucesso:  true,
    nome:     String(dados[i][1] || ""),
    telefone: telefone ? "****" + telefone.slice(-4) : ""
  }, callback);
}

/* ──────────────────────────────────────────────────────────
   handleRsvp — confirmação ou alteração de presença
   Suporta grupoStatuses[] individuais por membro, e telefone/email
   opcionais por membro do grupo (grupoTelefones[] / grupoEmails[]).
────────────────────────────────────────────────────────── */
function handleRsvp(dados) {
  const rowId        = parseInt(dados.rowId || "0");
  const email        = String(dados.email    || "").trim();
  const status       = dados.status === "NAO" ? "NAO" : "SIM";
  const lang         = normalizarLang_(dados.lang);
  const statusLabel  = status === "SIM" ? "Confirmado" : "Não comparecerá"; // valor salvo na planilha (sempre PT)
  const semTelefone  = !!dados.semTelefone;
  const token        = String(dados.token    || "").trim();
  const ultimos4     = String(dados.ultimos4 || "").replace(/\D/g, "");
  const telefoneCad  = String(dados.telefoneCad || "").replace(/\D/g, "");

  if (!rowId || !email) return jsonResponse({ sucesso: false, erro: "dados_incompletos" });

  const ss     = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet  = ss.getSheetByName(SHEET_CONVIDADOS);
  const linhas = sheet.getDataRange().getValues();

  const i = rowId - 1;
  if (i < 1 || i >= linhas.length) return jsonResponse({ sucesso: false, erro: "linha_invalida" });

  const nomePlanilha     = String(linhas[i][1] || "");
  const telefonePlanilha = String(linhas[i][2] || "").replace(/\D/g, "");
  const tokenPlanilha    = String(linhas[i][6] || "").trim();

  if (token) {
    if (new Date() > DATA_LIMITE_TS) return jsonResponse({ sucesso: false, erro: "prazo_expirado" });
    if (!tokenPlanilha || tokenPlanilha !== token) return jsonResponse({ sucesso: false, erro: "token_invalido" });
  } else if (semTelefone) {
    if (telefonePlanilha) return jsonResponse({ sucesso: false, erro: "telefone_incorreto" });
  } else {
    if (ultimos4.length !== 4 || ultimos4 !== telefonePlanilha.slice(-4)) {
      return jsonResponse({ sucesso: false, erro: "telefone_incorreto" });
    }
  }

  let tokenFinal = tokenPlanilha;
  if (!tokenFinal) {
    tokenFinal = Utilities.getUuid().replace(/-/g, "").substring(0, 24);
  }

  if (semTelefone && telefoneCad && !telefonePlanilha) {
    sheet.getRange(i + 1, 3).setValue(telefoneCad);
  }

  sheet.getRange(i + 1, 4).setValue(email);
  sheet.getRange(i + 1, 5).setValue(statusLabel);
  sheet.getRange(i + 1, 6).setValue(new Date());
  sheet.getRange(i + 1, 7).setValue(tokenFinal);

  const grupoRowIds    = dados.grupoRowIds    || [];
  const grupoNomes     = dados.grupoNomes     || [];
  const grupoStatuses  = dados.grupoStatuses  || [];
  const grupoTelefones = dados.grupoTelefones || [];
  const grupoEmails    = dados.grupoEmails    || [];

  grupoRowIds.forEach((gRowId, idx) => {
    const gi = parseInt(gRowId) - 1;
    if (gi < 1 || gi >= linhas.length) return;
    const gStatus      = grupoStatuses[idx] === "NAO" ? "NAO" : "SIM";
    const gStatusLabel = gStatus === "SIM" ? "Confirmado" : "Não comparecerá";

    // Telefone/e-mail opcionais por membro do grupo, informados pela
    // pessoa que está confirmando. Se ficarem vazios, quem confirmou
    // permanece como responsável pelo contato dessa pessoa (usamos o
    // e-mail dela como fallback; o telefone do membro não é alterado).
    const gTelefone = String(grupoTelefones[idx] || "").trim();
    const gEmail    = String(grupoEmails[idx]    || "").trim();

    if (gTelefone) {
      sheet.getRange(gi + 1, 3).setValue(gTelefone);
    }
    sheet.getRange(gi + 1, 4).setValue(gEmail || email);
    sheet.getRange(gi + 1, 5).setValue(gStatusLabel);
    sheet.getRange(gi + 1, 6).setValue(new Date());
  });

  const linkAlterar = `${URL_SITE}/#alterar?token=${tokenFinal}&rowId=${rowId}`;

  const statusEmoji   = status === "SIM" ? "✅" : "❌";
  const statusLabelEm = T_(status === "SIM" ? "rsvp_status_sim" : "rsvp_status_nao", lang);
  const prazoEm       = lang === "it" ? DATA_LIMITE_ALT_IT : DATA_LIMITE_ALT;
  const grupoMsgHtml  = grupoNomes.length
    ? T_("rsvp_grupo_msg", lang, grupoNomes.map(n => escapeHtml(n)).join(", "))
    : "";

  MailApp.sendEmail({
    to:       email,
    replyTo:  EMAIL_NOIVOS,
    subject:  T_(status === "SIM" ? "rsvp_subject_sim" : "rsvp_subject_nao", lang),
    htmlBody: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#2A2820;line-height:1.75">
        <p style="font-size:1.5rem;font-weight:300;margin-bottom:1rem">${T_("rsvp_ola", lang, escapeHtml(nomePlanilha))}</p>
        <p>${T_("rsvp_intro", lang)}</p>
        <div style="background:#EBF0E6;border:1px solid #B8C49A;border-radius:10px;padding:1.25rem 1.5rem;margin:1.25rem 0">
          <p style="margin:0;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;color:#506B45">${T_("rsvp_status_label", lang)}</p>
          <p style="margin:.3rem 0 0;font-size:1.1rem;font-weight:500">${statusEmoji} ${statusLabelEm}</p>
          ${grupoMsgHtml}
        </div>
        <p style="color:#5A534D">${T_("rsvp_alterar_prazo", lang, prazoEm)}</p>
        <p style="margin:1.25rem 0">
          <a href="${linkAlterar}" style="display:inline-block;padding:.75rem 1.5rem;background:#7A9B6E;color:#fff;border-radius:6px;font-family:sans-serif;font-size:.82rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;text-decoration:none">
            ${T_("rsvp_btn_alterar", lang)}
          </a>
        </p>
        <p style="font-size:.8rem;color:#8E8B6C">${T_("rsvp_link_fallback", lang)}<br><span style="color:#506B45">${linkAlterar}</span></p>
        <hr style="border:none;border-top:1px solid #D5CCBF;margin:1.5rem 0" />
        <p style="font-size:.8rem;color:#8E8B6C">${T_("rsvp_spam_aviso", lang)}</p>
        <p style="margin-top:1.5rem;font-family:Georgia,serif;font-size:1.1rem;font-weight:300">
          ${T_("assinatura", lang)}
        </p>
      </div>
    `
  });

  // E-mail interno aos noivos — mantido em português independentemente do idioma do convidado
  MailApp.sendEmail({
    to:      EMAIL_NOIVOS,
    subject: `${statusEmoji} Nova confirmação — ${escapeHtml(nomePlanilha)}`,
    htmlBody: `
      <p><strong>Nome:</strong> ${escapeHtml(nomePlanilha)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Status:</strong> ${statusLabel}</p>
      <p><strong>Idioma do e-mail enviado:</strong> ${lang === "it" ? "Italiano" : "Português"}</p>
      ${grupoNomes.length ? `<p><strong>Confirmou também por:</strong> ${grupoNomes.map(n => escapeHtml(n)).join(", ")}</p>` : ""}
      ${telefoneCad ? `<p><strong>Telefone cadastrado agora:</strong> ${escapeHtml(telefoneCad)}</p>` : ""}
      <p><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
    `
  });

  return jsonResponse({ sucesso: true, status });
}

/* ──────────────────────────────────────────────────────────
   handleReenviar — reenvia e-mail de confirmação
────────────────────────────────────────────────────────── */
function handleReenviar(dados) {
  const rowId = parseInt(dados.rowId || "0");
  const email = String(dados.email  || "").trim();
  const lang  = normalizarLang_(dados.lang);

  if (!rowId || !email) return jsonResponse({ sucesso: false, erro: "dados_incompletos" });

  const ss     = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet  = ss.getSheetByName(SHEET_CONVIDADOS);
  const linhas = sheet.getDataRange().getValues();

  const i = rowId - 1;
  if (i < 1 || i >= linhas.length) return jsonResponse({ sucesso: false, erro: "linha_invalida" });

  const nome    = String(linhas[i][1] || "");
  const status  = String(linhas[i][4] || "Confirmado");
  const token   = String(linhas[i][6] || "");
  const linkAlt = token ? `${URL_SITE}/#alterar?token=${token}&rowId=${rowId}` : URL_SITE + "/#rsvp";
  const emoji   = status === "Não comparecerá" ? "❌" : "✅";
  const statusEm = status === "Não comparecerá"
    ? T_("rsvp_status_nao", lang)
    : T_("rsvp_status_sim", lang);
  const prazoEm  = lang === "it" ? DATA_LIMITE_ALT_IT : DATA_LIMITE_ALT;

  if (email !== String(linhas[i][3] || "").trim()) {
    sheet.getRange(i + 1, 4).setValue(email);
  }

  MailApp.sendEmail({
    to:       email,
    replyTo:  EMAIL_NOIVOS,
    subject:  T_("reenvio_subject", lang),
    htmlBody: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#2A2820;line-height:1.75">
        <p style="font-size:1.5rem;font-weight:300;margin-bottom:1rem">${T_("rsvp_ola", lang, escapeHtml(nome))}</p>
        <p>${T_("reenvio_intro", lang)}</p>
        <div style="background:#EBF0E6;border:1px solid #B8C49A;border-radius:10px;padding:1.25rem 1.5rem;margin:1.25rem 0">
          <p style="margin:0;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;color:#506B45">${T_("rsvp_status_label", lang)}</p>
          <p style="margin:.3rem 0 0;font-size:1.1rem;font-weight:500">${emoji} ${statusEm}</p>
        </div>
        <p style="margin:1.25rem 0">
          <a href="${linkAlt}" style="display:inline-block;padding:.75rem 1.5rem;background:#7A9B6E;color:#fff;border-radius:6px;font-family:sans-serif;font-size:.82rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;text-decoration:none">
            ${T_("rsvp_btn_alterar", lang)}
          </a>
        </p>
        <p style="font-size:.8rem;color:#8E8B6C">${T_("reenvio_prazo", lang, prazoEm)}</p>
        <p style="margin-top:1.5rem;font-family:Georgia,serif;font-size:1.1rem;font-weight:300">
          ${T_("assinatura", lang)}
        </p>
      </div>
    `
  });

  return jsonResponse({ sucesso: true });
}

/* ──────────────────────────────────────────────────────────
   handleGift — registra presente
────────────────────────────────────────────────────────── */
function handleGift(dados) {
  const nome     = String(dados.nome     || "").trim();
  const email    = String(dados.email    || "").trim();
  const presente = String(dados.presente || "").trim();
  const valor    = String(dados.valor    || "").trim();
  const mensagem = String(dados.mensagem || "").trim();
  const lang     = normalizarLang_(dados.lang);

  if (!nome || !email || !presente) return jsonResponse({ sucesso: false, erro: "dados_incompletos" });

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet   = ss.getSheetByName(SHEET_PRESENTES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PRESENTES);
    sheet.appendRow(["Data/Hora", "Nome", "Email", "Presente", "Valor", "Mensagem"]);
  }

  sheet.appendRow([new Date(), nome, email, presente, valor, mensagem]);

  MailApp.sendEmail({
    to:       email,
    replyTo:  EMAIL_NOIVOS,
    subject:  T_("gift_subject", lang),
    htmlBody: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#2A2820;line-height:1.75">
        <p style="font-size:1.5rem;font-weight:300;margin-bottom:1rem">${T_("gift_obrigado", lang, escapeHtml(nome))}</p>
        <p>${T_("gift_intro", lang)}</p>
        <div style="background:#EBF0E6;border:1px solid #B8C49A;border-radius:10px;padding:1.25rem 1.5rem;margin:1.25rem 0">
          <p style="margin:0;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;color:#506B45">${T_("gift_label", lang)}</p>
          <p style="margin:.3rem 0 0;font-size:1.1rem;font-weight:500">${escapeHtml(presente)} — R$ ${escapeHtml(valor)}</p>
          ${mensagem ? `<p style="margin:.75rem 0 0;font-size:.88rem;color:#5A534D;font-style:italic">"${escapeHtml(mensagem)}"</p>` : ""}
        </div>
        <p style="color:#5A534D">${T_("gift_felizes", lang)}</p>
        <p style="margin-top:1.5rem;font-family:Georgia,serif;font-size:1.1rem;font-weight:300">
          ${T_("assinatura", lang)}
        </p>
      </div>
    `
  });

  // E-mail interno aos noivos — mantido em português
  MailApp.sendEmail({
    to:      EMAIL_NOIVOS,
    subject: `🎁 Novo presente — ${escapeHtml(nome)}`,
    htmlBody: `
      <p><strong>Nome:</strong> ${escapeHtml(nome)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Presente:</strong> ${escapeHtml(presente)}</p>
      <p><strong>Valor:</strong> R$ ${escapeHtml(valor)}</p>
      <p><strong>Mensagem:</strong> ${escapeHtml(mensagem) || "(nenhuma)"}</p>
      <p><strong>Idioma do e-mail enviado:</strong> ${lang === "it" ? "Italiano" : "Português"}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
    `
  });

  return jsonResponse({ sucesso: true });
}

/* ──────────────────────────────────────────────────────────
   PLACAR DE JOGOS
────────────────────────────────────────────────────────── */
function handleTop10(e, callback) {
  const jogo = String((e && e.parameter && e.parameter.jogo) || "").toLowerCase();
  if (!jogo) return jsonResponse({ erro: "jogo_ausente" }, callback);

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet   = ss.getSheetByName(SHEET_PLACAR);
  if (!sheet) return jsonResponse({ lista: [] }, callback);

  const dados = sheet.getDataRange().getValues();
  const melhores = {};

  for (let i = 1; i < dados.length; i++) {
    const nomeL  = String(dados[i][1] || "").trim();
    const jogoL  = String(dados[i][2] || "").toLowerCase().trim();
    const pontos = Number(dados[i][3] || 0);
    if (jogoL !== jogo || !nomeL) continue;
    if (!melhores[nomeL] || pontos > melhores[nomeL]) {
      melhores[nomeL] = pontos;
    }
  }

  const lista = Object.entries(melhores)
    .map(([nome, pontos]) => ({ nome, pontos }))
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 10);

  return jsonResponse({ lista }, callback);
}

function handleScore(dados) {
  const nome   = String(dados.nome   || "").trim();
  const jogo   = String(dados.jogo   || "").toLowerCase().trim();
  const pontos = Number(dados.pontos || 0);

  if (!nome || !jogo) return jsonResponse({ sucesso: false, erro: "dados_incompletos" });

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet   = ss.getSheetByName(SHEET_PLACAR);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PLACAR);
    sheet.appendRow(["Data/Hora", "Nome", "Jogo", "Pontos"]);
  }

  sheet.appendRow([new Date(), nome, jogo, pontos]);
  return jsonResponse({ sucesso: true });
}

/* ──────────────────────────────────────────────────────────
   Utilitários
────────────────────────────────────────────────────────── */
function jsonResponse(obj, callback) {
  if (callback) {
    const texto = callback + "(" + JSON.stringify(obj) + ");";
    return ContentService
      .createTextOutput(texto)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").trim().toLowerCase();
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* Normaliza uma célula de data do Sheets (pode ser Date, string, número) para DD/MM/YYYY */
function normalizarDataCelula(celula) {
  if (!celula) return null;
  if (celula instanceof Date) {
    const brt = new Date(celula.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    return String(brt.getDate()).padStart(2,'0') + "/" +
           String(brt.getMonth()+1).padStart(2,'0') + "/" +
           brt.getFullYear();
  }
  return normalizarData(String(celula));
}

/* Normaliza qualquer formato de data para DD/MM/YYYY */
function normalizarData(str) {
  if (!str) return null;
  str = str.trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (isNaN(d)) return null;
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  const d = new Date(str);
  if (!isNaN(d)) {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  return null;
}

/* Data de hoje em DD/MM/YYYY no fuso de Brasília */
function dataHoje_() {
  const agora = new Date();
  const brt   = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${String(brt.getDate()).padStart(2,'0')}/${String(brt.getMonth()+1).padStart(2,'0')}/${brt.getFullYear()}`;
}

function handleTemaMosaico(e) {
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var aba = ss.getSheetByName('TemaMosaico');
  if (!aba) return { achou: false };
  var dataPedida = (e.parameter.data || '').trim();
  var linhas = aba.getDataRange().getValues();
  for (var i = 1; i < linhas.length; i++) {
    var dataCelula = linhas[i][0];
    var dataStr = (dataCelula instanceof Date)
      ? Utilities.formatDate(dataCelula, Session.getScriptTimeZone(), 'dd/MM/yyyy')
      : String(dataCelula).trim();
    if (dataStr === dataPedida) {
      return {
        achou: true,
        cor: String(linhas[i][1] || '#C8A050'),
        variante_formato: Number(linhas[i][2]) || 1,
        variante_traco: Number(linhas[i][3]) || 1,
        variante_central: Number(linhas[i][4]) || 1
      };
    }
  }
  return { achou: false };
}
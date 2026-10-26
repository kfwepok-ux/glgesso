// GL Gesso: recebe os leads do quiz do site, grava na aba "Leads do site" da planilha
// "Gestão de Tráfego | GL Gesso" e avisa a equipe por e-mail.

// Modo teste: e-mail só para TEST_EMAIL e Status "Teste" na planilha. Em produção, mantenha false.
const TEST_MODE = false;
const TEST_EMAIL = "kaioapchagas@gmail.com";

const SCRIPT_VERSION = "gl-gesso-quiz-v1";

const CONFIG = {
  SPREADSHEET_ID: "1Wbp_T96Wy814Tukge5X-TSIsirwCLkfI2Xrhas3leUo",
  SHEET_NAME: "Leads do site",
  STATUS_INICIAL: "Novo lead",
  EMAIL_RECIPIENTS: ["kaioapchagas@gmail.com", "ysousalima00@gmail.com"],
  BRAND_NAME: "GL Gesso",
};

// Mesma ordem da aba "Gestão de Leads", com as colunas do quiz no fim.
const HEADERS = [
  "Lead", "1º contato", "Serviço", "Nome", "Telefone", "Cidade", "Status",
  "Valor do Orçamento", "Valor Fechado", "Observação",
  "E-mail", "Bairro", "Tamanho (m²)", "Prazo", "Origem", "ID",
];

// Execute uma vez no editor (Executar → autorizar) para conceder acesso à planilha e ao envio
// de e-mails. Não grava nada nem envia mensagens.
function autorizar() {
  const sheetName = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getName();
  console.log("Planilha: " + sheetName + " · cota de e-mails restante hoje: " + MailApp.getRemainingDailyQuota());
}

function doGet() {
  return jsonResponse_({ ok: true, version: SCRIPT_VERSION, sheet: CONFIG.SHEET_NAME, message: "Endpoint ativo. Envie leads via POST." });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    lock.waitLock(30000);
    locked = true;
    const lead = normalizeLead_(parseRequest_(e));
    preventAccidentalDuplicate_(lead);
    const sheet = getLeadSheet_();
    const map = ensureHeaders_(sheet);
    const row = writeLead_(sheet, map, lead);
    // O lead já está salvo; uma falha no e-mail não desfaz a gravação.
    let notification = "sent";
    try {
      sendLeadEmail_(lead, sheet, row);
    } catch (mailError) {
      console.error("E-mail não enviado para a linha " + row + ": " + mailError);
      notification = "failed";
    }
    return jsonResponse_({ ok: true, id: lead.id, row: row, notification: notification });
  } catch (err) {
    console.error(err);
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error("POST sem corpo.");
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw new Error("JSON inválido.");
  }
}

function normalizeLead_(raw) {
  const lead = {
    id: sanitize_(raw.id) || Utilities.getUuid(),
    created_at: new Date(),
    nome: sanitize_(raw.nome),
    whatsapp: sanitizePhone_(raw.whatsapp),
    email: sanitize_(raw.email).toLowerCase(),
    servico: sanitize_(raw.servico),
    regiao: sanitize_(raw.regiao),
    bairro: sanitize_(raw.bairro),
    medida: sanitize_(raw.medida),
    prazo: sanitize_(raw.prazo),
    origem_cta: sanitize_(raw.origem_cta),
    pagina_origem: sanitize_(raw.pagina_origem),
  };
  if (lead.nome.length < 2) throw new Error("Nome inválido.");
  if (lead.whatsapp.replace(/\D/g, "").length < 10) throw new Error("WhatsApp inválido.");
  if (lead.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) throw new Error("E-mail inválido.");
  ["servico", "regiao", "medida", "prazo"].forEach(function (field) {
    if (!lead[field]) throw new Error("Campo obrigatório ausente: " + field + ".");
  });
  return lead;
}

function preventAccidentalDuplicate_(lead) {
  const cache = CacheService.getScriptCache();
  const key = ["lead", lead.whatsapp.replace(/\D/g, ""), lead.servico].join(":");
  if (cache.get(key)) throw new Error("Lead duplicado detectado há poucos segundos.");
  cache.put(key, "1", 30);
}

function getLeadSheet_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return spreadsheet.getSheetByName(CONFIG.SHEET_NAME) || spreadsheet.insertSheet(CONFIG.SHEET_NAME);
}

// Localiza as colunas pelo nome. Cabeçalhos que faltarem entram nas colunas vazias
// à direita; os existentes nunca são reescritos, então a equipe pode reordenar a aba.
function ensureHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    const current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (h) { return String(h).trim(); });
    let next = lastColumn + 1;
    HEADERS.forEach(function (header) {
      if (current.indexOf(header) < 0) {
        sheet.getRange(1, next).setValue(header).setFontWeight("bold");
        next++;
      }
    });
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  const map = {};
  HEADERS.forEach(function (header) { map[header] = headers.indexOf(header) + 1; });
  return map;
}

// Escreve só as colunas do quiz; Valor do Orçamento, Valor Fechado e Observação ficam com a equipe.
function writeLead_(sheet, map, lead) {
  const row = sheet.getLastRow() + 1;
  const values = {
    "Lead": 1,
    "1º contato": lead.created_at,
    "Serviço": sheetValue_(lead.servico),
    "Nome": sheetValue_(lead.nome),
    "Telefone": sheetValue_(lead.whatsapp),
    "Cidade": sheetValue_(lead.regiao),
    "Status": TEST_MODE ? "Teste" : CONFIG.STATUS_INICIAL,
    "E-mail": sheetValue_(lead.email),
    "Bairro": sheetValue_(lead.bairro),
    "Tamanho (m²)": sheetValue_(lead.medida),
    "Prazo": sheetValue_(lead.prazo),
    "Origem": sheetValue_([lead.origem_cta, lead.pagina_origem].filter(String).join(" · ")),
    "ID": sheetValue_(lead.id),
  };
  Object.keys(values).forEach(function (header) {
    sheet.getRange(row, map[header]).setValue(values[header]);
  });
  sheet.getRange(row, map["1º contato"]).setNumberFormat("dd/MM/yyyy HH:mm");
  SpreadsheetApp.flush();
  return row;
}

function sendLeadEmail_(lead, sheet, row) {
  const baseSubject = "🟢 Novo lead " + CONFIG.BRAND_NAME + " — " + lead.servico + " — " + lead.nome;
  const rowUrl = "https://docs.google.com/spreadsheets/d/" + CONFIG.SPREADSHEET_ID + "/edit#gid=" + sheet.getSheetId() + "&range=A" + row;
  const digits = lead.whatsapp.replace(/\D/g, "");
  const waUrl = "https://wa.me/" + (digits.length <= 11 ? "55" + digits : digits);
  const message = {
    to: TEST_MODE ? TEST_EMAIL : CONFIG.EMAIL_RECIPIENTS.join(","),
    subject: TEST_MODE ? "[TESTE] " + baseSubject : baseSubject,
    body: buildEmailPlain_(lead, rowUrl, waUrl),
    htmlBody: buildEmailHtml_(lead, rowUrl, waUrl),
    name: CONFIG.BRAND_NAME + " Leads",
  };
  if (lead.email) message.replyTo = lead.email;
  MailApp.sendEmail(message);
}

function emailRows_(lead) {
  return [
    ["Nome", lead.nome],
    ["WhatsApp", lead.whatsapp],
    ["E-mail", lead.email],
    ["Serviço", lead.servico],
    ["Região", lead.regiao],
    ["Bairro", lead.bairro],
    ["Tamanho", lead.medida],
    ["Prazo", lead.prazo],
    ["Botão de origem", lead.origem_cta],
    ["Página", lead.pagina_origem],
    ["Recebido em", Utilities.formatDate(lead.created_at, "America/Sao_Paulo", "dd/MM/yyyy HH:mm")],
  ];
}

function buildEmailHtml_(lead, rowUrl, waUrl) {
  const rows = emailRows_(lead).map(function (r) {
    return '<tr><td style="font-weight:bold;border-bottom:1px solid #eee;padding:6px 12px 6px 0">' + escapeHtml_(r[0]) +
      '</td><td style="border-bottom:1px solid #eee;padding:6px 0">' + escapeHtml_(r[1] || "—") + "</td></tr>";
  }).join("");
  return '<div style="font-family:Arial,sans-serif;color:#111;line-height:1.5">' +
    "<h2>Novo pedido de orçamento pelo site</h2>" +
    '<table cellspacing="0" style="border-collapse:collapse">' + rows + "</table>" +
    '<p style="margin:24px 0 12px"><a href="' + waUrl + '" style="background:#25D366;color:#0a0e14;font-weight:bold;padding:12px 20px;border-radius:8px;text-decoration:none">Chamar no WhatsApp</a></p>' +
    '<p><a href="' + rowUrl + '">Abrir a linha na planilha</a></p>' +
    "</div>";
}

function buildEmailPlain_(lead, rowUrl, waUrl) {
  const lines = ["Novo pedido de orçamento pelo site", ""];
  emailRows_(lead).forEach(function (r) { lines.push(r[0] + ": " + (r[1] || "—")); });
  lines.push("", "Chamar no WhatsApp: " + waUrl, "Abrir a linha na planilha: " + rowUrl);
  return lines.join("\n");
}

function sanitize_(value) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 500);
}

function sanitizePhone_(value) {
  return sanitize_(value).replace(/[^\d()+\-\s]/g, "").slice(0, 32);
}

// Impede que um texto começando com =, +, - ou @ vire fórmula na planilha.
function sheetValue_(value) {
  const text = String(value || "");
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

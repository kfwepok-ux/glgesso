// GL Gesso: quiz de orçamento. Abre nos CTAs marcados com data-quiz, grava o lead
// na planilha (Google Apps Script) e abre o WhatsApp com as respostas.
(function () {
  "use strict";

  // URL /exec do Apps Script (automation/Code.gs). Vazia: o quiz abre o WhatsApp, mas não grava o lead.
  var LEAD_ENDPOINT = "";
  var PHONE = "5524981162757";

  var root = document.getElementById("quiz");
  if (!root) return;

  var STEPS = [
    {
      id: "servico", label: "Serviço", autoAdvance: true,
      title: "Qual serviço você precisa?",
      help: "Escolha o principal. Os detalhes você conta na conversa.",
      options: ["Divisória em drywall acústico", "Forro de gesso", "Sanca ou rasgo de luz com LED", "Armário ou closet de gesso",
        "Cortineiro embutido", "Nicho ou painel de TV", "Paredes 3D", "Mais de um serviço / ainda não sei"],
    },
    {
      id: "regiao", label: "Local", autoAdvance: false,
      title: "Onde é a obra?",
      help: "Atendemos o Rio e região. Outras regiões sob consulta.",
      options: ["Rio de Janeiro (capital)", "Niterói", "Baixada Fluminense", "Sul Fluminense", "Região Serrana", "Outra região"],
    },
    {
      id: "medida", label: "Tamanho", autoAdvance: true,
      title: "Qual o tamanho aproximado?",
      help: "Uma estimativa já ajuda. Se não souber, tudo bem.",
      options: ["Até 10 m²", "10 a 30 m²", "30 a 60 m²", "Mais de 60 m²", "Não sei medir"],
    },
    {
      id: "prazo", label: "Prazo", autoAdvance: true,
      title: "Para quando você precisa?",
      help: "Assim conseguimos organizar a visita e a agenda da equipe.",
      options: ["O quanto antes", "Em até 30 dias", "Em 1 a 3 meses", "Ainda estou pesquisando"],
    },
    { id: "contato", label: "Contato", title: "Para onde mandamos o orçamento?", help: "Confira suas respostas e deixe seu contato." },
  ];

  // data-service dos cards de serviço -> opção do quiz.
  var SERVICE_FROM_CTA = {
    drywall: "Divisória em drywall acústico",
    forro: "Forro de gesso",
    sanca: "Sanca ou rasgo de luz com LED",
    closet: "Armário ou closet de gesso",
    cortineiro: "Cortineiro embutido",
    nicho: "Nicho ou painel de TV",
  };

  var form = document.getElementById("quiz-form");
  var stepsWrap = document.getElementById("quiz-steps");
  var panel = root.querySelector(".quiz-panel");
  var countEl = document.getElementById("quiz-count");
  var bar = document.getElementById("quiz-bar");
  var errorEl = document.getElementById("quiz-error");
  var backBtn = document.getElementById("quiz-back");
  var nextBtn = document.getElementById("quiz-next");
  var sendBtn = document.getElementById("quiz-send");
  var donePanel = document.getElementById("quiz-done");
  var doneLink = document.getElementById("quiz-open-wa");

  var answers = {};
  var origin = { cta_location: "", service: "" };
  var index = 0;
  var lastFocus = null;
  var submitting = false;

  var push = function (data) {
    if (window.glPush) window.glPush(data);
    else (window.dataLayer = window.dataLayer || []).push(data);
  };

  var inputClass = "w-full bg-gl-base border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-gl-accent focus:outline-none aria-[invalid=true]:border-red-400";

  function optionButtons(step) {
    return step.options.map(function (value) {
      return '<button type="button" class="quiz-opt" data-field="' + step.id + '" data-value="' + value + '" aria-pressed="false">' + value + "</button>";
    }).join("");
  }

  function field(id, name, label, attrs, error) {
    return '<div class="mb-4">' +
      '<label for="' + id + '" class="block text-sm font-medium text-slate-200 mb-1.5">' + label + "</label>" +
      '<input id="' + id + '" name="' + name + '" class="' + inputClass + '" ' + attrs + " />" +
      '<p class="quiz-field-error mt-1.5 text-xs text-red-400" data-error-for="' + name + '" hidden>' + error + "</p>" +
      "</div>";
  }

  stepsWrap.innerHTML = STEPS.map(function (step) {
    var body;
    if (step.id === "contato") {
      body = '<dl id="quiz-summary" class="grid gap-1.5 text-sm bg-gl-base/60 border border-slate-800 rounded-xl p-4 mb-5"></dl>' +
        field("quiz-nome", "nome", "Seu nome", 'type="text" autocomplete="name" placeholder="Como podemos te chamar?"', "Informe seu nome.") +
        field("quiz-whatsapp", "whatsapp", "WhatsApp com DDD", 'type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="15" placeholder="(21) 99999-9999"', "Informe um WhatsApp válido com DDD.") +
        field("quiz-email", "email", 'E-mail <span class="text-slate-500 font-normal">(opcional)</span>', 'type="email" autocomplete="email" placeholder="seu@email.com"', "Informe um e-mail válido ou deixe em branco.") +
        '<p class="text-xs text-slate-400 leading-relaxed">Ao enviar, você concorda com o uso dos seus dados para o contato sobre este orçamento, conforme a <a href="/politica-de-privacidade" target="_blank" rel="noopener" class="underline hover:text-gl-accent">Política de Privacidade</a>.</p>';
    } else {
      body = '<div class="grid sm:grid-cols-2 gap-2.5">' + optionButtons(step) + "</div>";
      if (step.id === "regiao") {
        body += '<div class="mt-5">' +
          '<label for="quiz-bairro" class="block text-sm font-medium text-slate-200 mb-1.5">Bairro <span class="text-slate-500 font-normal">(opcional)</span></label>' +
          '<input id="quiz-bairro" name="bairro" type="text" autocomplete="address-level3" maxlength="80" placeholder="Ex.: Botafogo" class="' + inputClass + '" />' +
          "</div>";
      }
    }
    return '<fieldset class="quiz-step" data-step="' + step.id + '" hidden>' +
      '<legend class="font-heading font-bold text-xl text-white mb-1">' + step.title + "</legend>" +
      '<p class="text-sm text-slate-400 mb-5">' + step.help + "</p>" + body + "</fieldset>";
  }).join("");

  var stepEls = stepsWrap.querySelectorAll(".quiz-step");
  var nomeInput = document.getElementById("quiz-nome");
  var whatsInput = document.getElementById("quiz-whatsapp");
  var emailInput = document.getElementById("quiz-email");
  var bairroInput = document.getElementById("quiz-bairro");

  function setAnswer(fieldId, value) {
    answers[fieldId] = value;
    stepsWrap.querySelectorAll('.quiz-opt[data-field="' + fieldId + '"]').forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.value === value));
    });
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  function fieldError(name, show) {
    var input = form.elements[name];
    var msg = form.querySelector('[data-error-for="' + name + '"]');
    if (show) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    if (msg) msg.hidden = !show;
    return !show;
  }

  function renderSummary() {
    var rows = [
      ["Serviço", answers.servico],
      ["Onde", answers.regiao + (bairroInput.value.trim() ? " – " + bairroInput.value.trim() : "")],
      ["Tamanho", answers.medida],
      ["Para quando", answers.prazo],
    ];
    document.getElementById("quiz-summary").innerHTML = rows.map(function (row) {
      return '<div class="flex justify-between gap-4"><dt class="text-slate-400">' + row[0] + '</dt><dd class="text-white text-right">' + escapeHtml(row[1] || "—") + "</dd></div>";
    }).join("");
  }

  function show(i) {
    index = Math.max(0, Math.min(STEPS.length - 1, i));
    var step = STEPS[index];
    stepEls.forEach(function (el) { el.hidden = el.dataset.step !== step.id; });
    countEl.textContent = "Pergunta " + (index + 1) + " de " + STEPS.length;
    bar.style.width = ((index + 1) / STEPS.length) * 100 + "%";
    var last = index === STEPS.length - 1;
    backBtn.hidden = index === 0;
    nextBtn.hidden = last;
    sendBtn.hidden = !last;
    showError("");
    if (last) renderSummary();
    panel.scrollTop = 0;
    var current = stepEls[index];
    var focusTarget = last ? nomeInput : current.querySelector('.quiz-opt[aria-pressed="true"]') || current.querySelector(".quiz-opt");
    setTimeout(function () { try { focusTarget.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }

  function validateStep(i) {
    var step = STEPS[i];
    if (step.id !== "contato") {
      if (answers[step.id]) return true;
      showError("Escolha uma opção para continuar.");
      return false;
    }
    var ok = fieldError("nome", nomeInput.value.trim().length < 2);
    var digits = whatsInput.value.replace(/\D/g, "");
    ok = fieldError("whatsapp", digits.length < 10 || digits.length > 11) && ok;
    var email = emailInput.value.trim();
    ok = fieldError("email", !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && ok;
    if (!ok) {
      showError("Revise os campos destacados.");
      var invalid = form.querySelector('[aria-invalid="true"]');
      if (invalid) invalid.focus();
    }
    return ok;
  }

  function next() {
    if (!validateStep(index)) return;
    push({ event: "quiz_step", step: index + 1, step_name: STEPS[index].label });
    show(index + 1);
  }

  stepsWrap.addEventListener("click", function (event) {
    var btn = event.target.closest(".quiz-opt");
    if (!btn) return;
    setAnswer(btn.dataset.field, btn.dataset.value);
    showError("");
    var step = STEPS[index];
    if (step.autoAdvance && step.id === btn.dataset.field) setTimeout(next, 150);
  });

  // Máscara (00) 00000-0000.
  whatsInput.addEventListener("input", function () {
    var d = whatsInput.value.replace(/\D/g, "").slice(0, 11);
    var out = d;
    if (d.length > 2) out = "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length > 6) out = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(d.length - 4);
    whatsInput.value = out;
  });

  // O aviso de erro some assim que o campo é editado.
  [nomeInput, whatsInput, emailInput].forEach(function (input) {
    input.addEventListener("input", function () {
      fieldError(input.name, false);
      if (!form.querySelector('[aria-invalid="true"]')) showError("");
    });
  });

  backBtn.addEventListener("click", function () { show(index - 1); });
  nextBtn.addEventListener("click", next);

  function buildMessage(lead) {
    return [
      "Olá! Vim pelo site da GL Gesso e quero um orçamento.",
      "",
      "*Serviço:* " + lead.servico,
      "*Onde:* " + lead.regiao + (lead.bairro ? " – " + lead.bairro : ""),
      "*Tamanho:* " + lead.medida,
      "*Para quando:* " + lead.prazo,
      "*Nome:* " + lead.nome,
    ].join("\n");
  }

  function sendLead(lead) {
    if (!LEAD_ENDPOINT) return;
    try {
      fetch(LEAD_ENDPOINT, {
        method: "POST",
        mode: "no-cors", // o Apps Script não responde com CORS; o envio é processado mesmo assim
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // requisição "simples", sem preflight
        body: JSON.stringify(lead),
      }).catch(function () {});
    } catch (e) {}
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (submitting) return;
    for (var i = 0; i < STEPS.length - 1; i++) {
      if (!answers[STEPS[i].id]) { show(i); showError("Escolha uma opção para continuar."); return; }
    }
    if (!validateStep(index)) return;
    submitting = true;
    sendBtn.disabled = true;

    var lead = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      created_at: new Date().toISOString(),
      nome: nomeInput.value.trim(),
      whatsapp: whatsInput.value.trim(),
      email: emailInput.value.trim(),
      servico: answers.servico,
      regiao: answers.regiao,
      bairro: bairroInput.value.trim(),
      medida: answers.medida,
      prazo: answers.prazo,
      origem_cta: origin.cta_location || "site",
      pagina_origem: location.href,
    };
    var url = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(buildMessage(lead));
    sendLead(lead);
    doneLink.href = url;
    form.hidden = true;
    donePanel.hidden = false;

    // A aba é aberta ainda dentro do clique (evita bloqueio de pop-up); o endereço do
    // WhatsApp só carrega depois que o GTM processar a conversão (ou após 1,5 s).
    var waWindow = null;
    var opened = false;
    try {
      waWindow = window.open("about:blank", "_blank");
      if (waWindow) waWindow.opener = null;
    } catch (e) {}
    var openWhatsApp = function () {
      if (opened) return;
      opened = true;
      clearTimeout(timer);
      try {
        if (waWindow && !waWindow.closed) waWindow.location.replace(url);
        else window.location.href = url;
      } catch (e) { window.location.href = url; }
    };
    var timer = setTimeout(openWhatsApp, 1500);

    push({ event: "generate_lead", service: lead.servico, region: lead.regiao, size: lead.medida, timeline: lead.prazo, cta_location: lead.origem_cta });
    push({
      event: "cta_click",
      channel: "whatsapp",
      cta_location: lead.origem_cta,
      service: origin.service || "",
      link_url: "https://wa.me/" + PHONE,
      eventCallback: openWhatsApp,
      eventTimeout: 1500,
    });
    var title = document.getElementById("quiz-done-title");
    try { title.focus(); } catch (e) {}
  });

  function open(context) {
    context = context || {};
    lastFocus = document.activeElement;
    answers = {};
    stepsWrap.querySelectorAll(".quiz-opt").forEach(function (btn) { btn.setAttribute("aria-pressed", "false"); });
    bairroInput.value = "";
    ["nome", "whatsapp", "email"].forEach(function (name) { fieldError(name, false); });
    form.hidden = false;
    donePanel.hidden = true;
    submitting = false;
    sendBtn.disabled = false;

    origin = { cta_location: context.cta_location || "site", service: context.service || "" };
    var preset = SERVICE_FROM_CTA[origin.service];
    if (preset) setAnswer("servico", preset);

    root.hidden = false;
    document.documentElement.classList.add("quiz-open");
    push({ event: "quiz_open", cta_location: origin.cta_location, service: origin.service });
    show(preset ? 1 : 0);
  }

  function close() {
    root.hidden = true;
    document.documentElement.classList.remove("quiz-open");
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }

  root.addEventListener("click", function (event) {
    if (event.target.closest("[data-quiz-close]")) close();
  });

  // Esc fecha; Tab fica preso dentro do modal (ouvinte no documento para valer mesmo
  // antes de o foco entrar no modal).
  document.addEventListener("keydown", function (event) {
    if (root.hidden) return;
    if (event.key === "Escape") { close(); return; }
    if (event.key !== "Tab") return;
    var items = [].filter.call(panel.querySelectorAll("a[href],button:not([disabled]),input:not([disabled])"), function (el) {
      return el.offsetParent !== null;
    });
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (!panel.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  // CTAs marcados abrem o quiz; Ctrl/Cmd+clique mantém o link original.
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[data-quiz]");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open({ cta_location: link.dataset.cta, service: link.dataset.service });
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  window.glQuiz = { open: open };

  // Links de outras páginas: /?orcamento=<origem> abre o quiz direto.
  var params = new URLSearchParams(location.search);
  if (params.has("orcamento")) {
    var from = params.get("orcamento") || "link_externo";
    params.delete("orcamento");
    var query = params.toString();
    history.replaceState(null, "", location.pathname + (query ? "?" + query : "") + location.hash);
    open({ cta_location: from });
  }
})();

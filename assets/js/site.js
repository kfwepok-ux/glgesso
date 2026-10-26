// GL Gesso: interações da página e eventos para o GTM (dataLayer) e o GA4 (gtag).
(function () {
  "use strict";

  window.dataLayer = window.dataLayer || [];
  // O GTM lê o objeto no dataLayer (ex.: conversão do Ads em cta_click);
  // o GA4 instalado via gtag.js só recebe o que vem por gtag("event").
  // eventCallback/eventTimeout são instruções para o GTM e não vão para o GA4.
  var push = function (data) {
    window.dataLayer.push(data);
    if (typeof window.gtag === "function") {
      var params = {};
      Object.keys(data).forEach(function (key) {
        if (["event", "eventCallback", "eventTimeout"].indexOf(key) < 0) params[key] = data[key];
      });
      window.gtag("event", data.event, params);
    }
  };
  window.glPush = push;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Cliques nos CTAs: canal (whatsapp, telefone, instagram), posição na página e serviço.
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[data-cta]");
    if (!link) return;
    // Esses CTAs abrem o quiz; a conversão (cta_click) só é registrada no envio dele.
    if (link.hasAttribute("data-quiz") && window.glQuiz) return;
    push({
      event: "cta_click",
      channel: link.dataset.channel || "",
      cta_location: link.dataset.cta,
      service: link.dataset.service || "",
      link_url: link.href,
    });
  });

  // Perguntas abertas no FAQ.
  document.querySelectorAll("#faq-list details").forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      push({ event: "faq_open", question: item.querySelector("summary").firstChild.textContent.trim() });
    });
  });

  // Seções vistas (uma vez por carregamento) e animação de entrada.
  if ("IntersectionObserver" in window) {
    var seen = {};
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var name = entry.target.dataset.section;
        if (entry.isIntersecting && !seen[name]) {
          seen[name] = true;
          push({ event: "section_view", section: name });
        }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll("[data-section]").forEach(function (el) { sectionObserver.observe(el); });

    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -40px 0px", threshold: 0.1 });
    document.querySelectorAll(".reveal").forEach(function (el) { revealObserver.observe(el); });

    // Botão flutuante só depois que o hero (com o CTA principal) sai da tela.
    var floatButton = document.querySelector(".wa-float");
    var hero = document.getElementById("inicio");
    if (floatButton && hero) {
      new IntersectionObserver(function (entries) {
        floatButton.classList.toggle("is-visible", !entries[0].isIntersecting);
      }).observe(hero);
    }
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-revealed"); });
    var fallbackFloat = document.querySelector(".wa-float");
    if (fallbackFloat) fallbackFloat.classList.add("is-visible");
  }

  // Menu do celular: fecha ao escolher um item.
  var menu = document.querySelector(".menu-mobile");
  if (menu) {
    menu.addEventListener("click", function (event) {
      if (event.target.closest("nav a")) menu.open = false;
    });
  }

  // Carrossel do hero: troca automática pausada no hover, foco, fora da tela ou com movimento reduzido.
  var carousel = document.getElementById("hero-carousel");
  if (carousel) {
    var slides = carousel.querySelectorAll(".hero-slide");
    var dots = carousel.querySelectorAll(".carousel-dot");
    var current = 0;
    var timer = null;

    var show = function (index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) { slide.classList.toggle("is-active", i === current); });
      dots.forEach(function (dot, i) {
        var active = i === current;
        dot.firstElementChild.classList.toggle("bg-white", active);
        dot.firstElementChild.classList.toggle("bg-white/40", !active);
        if (active) dot.setAttribute("aria-current", "true"); else dot.removeAttribute("aria-current");
      });
    };
    var stop = function () { clearInterval(timer); timer = null; };
    var start = function () {
      if (reduceMotion || timer) return;
      timer = setInterval(function () { show(current + 1); }, 5000);
    };

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { stop(); show(i); });
    });
    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    carousel.addEventListener("focusin", stop);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) start(); else stop();
      }).observe(carousel);
    } else {
      start();
    }
  }

  // Core Web Vitals reais (LCP, INP, CLS), já que o CrUX não tem dados do site.
  window.addEventListener("load", function () {
    if (!window.webVitals) return;
    var report = function (metric) {
      push({
        event: "web_vitals",
        metric_name: metric.name,
        metric_value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
        metric_rating: metric.rating,
      });
    };
    window.webVitals.onLCP(report);
    window.webVitals.onINP(report);
    window.webVitals.onCLS(report);
  });
})();

/* =========================================================
   ИНТЕРФЕЙСНЫЕ КОМПОНЕНТЫ — поведение.
   Подключать после effects.js. Каждый блок проверяет,
   есть ли он на странице, поэтому файл универсален.
   ========================================================= */

(function () {
  "use strict";
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Тёмная тема ---------- */
  (function theme() {
    var KEY = "theme";
    function apply(v) {
      document.documentElement.setAttribute("data-theme", v);
      try { localStorage.setItem(KEY, v); } catch (e) {}
    }
    var saved;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved) document.documentElement.setAttribute("data-theme", saved);

    $$(".theme-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        apply(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
      });
    });
  })();

  /* ---------- Табы ----------
     <div class="tabs"><div class="tabs__list">
       <button class="tabs__btn is-active" data-tab="a">…</button></div>
       <div class="tabs__panel is-active" data-panel="a">…</div></div>      */
  $$(".tabs").forEach(function (tabs) {
    tabs.addEventListener("click", function (e) {
      var btn = e.target.closest(".tabs__btn");
      if (!btn) return;
      $$(".tabs__btn", tabs).forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      $$(".tabs__panel", tabs).forEach(function (p) {
        p.classList.toggle("is-active", p.dataset.panel === btn.dataset.tab);
      });
    });
  });

  /* ---------- Модальные окна ----------
     Открыть: <button data-dialog="id">   Закрыть: [data-dialog-close]  */
  function closeDialog(d) {
    d.classList.remove("is-open");
    document.body.style.overflow = "";
    if (d._opener) d._opener.focus();
  }
  $$("[data-dialog]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var d = document.getElementById(btn.dataset.dialog);
      if (!d) return;
      d._opener = btn;
      d.classList.add("is-open");
      document.body.style.overflow = "hidden";
      var focusable = $("button, [href], input, textarea, select", d);
      if (focusable) focusable.focus();
    });
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-dialog-close]") || e.target.classList.contains("dialog__backdrop")) {
      var d = e.target.closest(".dialog");
      if (d) closeDialog(d);
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var open = $(".dialog.is-open");
    if (open) closeDialog(open);
  });

  /* ---------- Уведомления ----------
     Вызов из своего кода:  UI.toast("Заявка отправлена", "ok");
     Кнопка-пример:         <button data-toast="Текст" data-toast-kind="ok">  */
  var box;
  var ICONS = {
    ok:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    err: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
    info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };
  function toast(text, kind, sub) {
    if (!box) {
      box = document.createElement("div");
      box.className = "toasts";
      document.body.appendChild(box);
    }
    kind = kind || "info";
    var t = document.createElement("div");
    t.className = "toast toast--" + kind;
    t.setAttribute("role", "status");
    t.innerHTML = (ICONS[kind] || ICONS.info) +
      "<div><b></b>" + (sub ? "<span></span>" : "") + "</div>" +
      '<button type="button" aria-label="Закрыть">✕</button>';
    t.querySelector("b").textContent = text;
    if (sub) t.querySelector("span").textContent = sub;
    box.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("is-in"); });

    var timer = setTimeout(remove, 4500);
    function remove() {
      clearTimeout(timer);
      t.classList.remove("is-in");
      setTimeout(function () { t.remove(); }, 300);
    }
    t.querySelector("button").addEventListener("click", remove);
    return t;
  }
  $$("[data-toast]").forEach(function (b) {
    b.addEventListener("click", function () { toast(b.dataset.toast, b.dataset.toastKind, b.dataset.toastSub); });
  });

  /* ---------- Полоса прочтения страницы ---------- */
  (function scrollProgress() {
    var bar = $(".scroll-progress");
    if (!bar) return;
    var ticking = false;
    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.setProperty("--scrolled", p.toFixed(1) + "%");
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  })();

  /* ---------- Подсветка за курсором ---------- */
  if (!reduce && window.matchMedia("(hover: hover)").matches) {
    $$(".spotlight").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- Прогресс: заполняем при появлении ---------- */
  $$(".progress__bar[data-value]").forEach(function (bar) {
    function fill() { bar.style.width = bar.dataset.value + "%"; }
    if (!("IntersectionObserver" in window)) return fill();
    new IntersectionObserver(function (es, obs) {
      if (!es[0].isIntersecting) return;
      fill();
      obs.disconnect();
    }, { threshold: 0.4 }).observe(bar);
  });

  /* ---------- Оглавление страницы: подсветка активного пункта ---------- */
  (function toc() {
    var links = $$("[data-toc] a");
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) {
      var el = document.getElementById(a.getAttribute("href").slice(1));
      if (el) map[el.id] = a;
    });
    Object.keys(map).forEach(function (id) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) { a.classList.remove("is-active"); });
          map[id].classList.add("is-active");
        });
      }, { rootMargin: "-20% 0px -70% 0px" }).observe(document.getElementById(id));
    });
  })();

  window.UI = { toast: toast };
})();

/* =========================================================
   ПОВЕДЕНИЕ ВТОРОГО ПАКЕТА. Подключать после ui.js.
   Каждый блок проверяет, есть ли он на странице.
   ========================================================= */

(function () {
  "use strict";
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Выпадающие меню ---------- */
  $$(".dropdown").forEach(function (dd) {
    var btn = $("[data-dropdown]", dd);
    if (!btn) return;
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      $$(".dropdown.is-open").forEach(function (o) { if (o !== dd) o.classList.remove("is-open"); });
      var open = dd.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  document.addEventListener("click", function () {
    $$(".dropdown.is-open").forEach(function (d) { d.classList.remove("is-open"); });
  });

  /* ---------- Шторка снизу ---------- */
  $$("[data-drawer]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var d = document.getElementById(btn.dataset.drawer);
      if (d) { d.classList.add("is-open"); document.body.style.overflow = "hidden"; }
    });
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-drawer-close]") || e.target.classList.contains("drawer__backdrop")) {
      var d = e.target.closest(".drawer");
      if (d) { d.classList.remove("is-open"); document.body.style.overflow = ""; }
    }
  });

  /* ---------- Просмотр фото ----------
     Любая ссылка вида <a data-lightbox href="фото.jpg"> внутри галереи */
  (function lightbox() {
    var links = $$("[data-lightbox]");
    if (!links.length) return;
    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.innerHTML =
      '<button class="lightbox__close" aria-label="Закрыть"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '<button class="lightbox__nav lightbox__nav--prev" aria-label="Предыдущее"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
      '<img alt="" />' +
      '<button class="lightbox__nav lightbox__nav--next" aria-label="Следующее"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '<p class="lightbox__cap"></p>';
    document.body.appendChild(box);

    var img = $("img", box), cap = $(".lightbox__cap", box), i = 0;
    function show(n) {
      i = (n + links.length) % links.length;
      var a = links[i];
      img.src = a.getAttribute("href");
      img.alt = a.dataset.caption || "";
      cap.textContent = a.dataset.caption || "";
    }
    function open(n) { show(n); box.classList.add("is-open"); document.body.style.overflow = "hidden"; }
    function close() { box.classList.remove("is-open"); document.body.style.overflow = ""; }

    links.forEach(function (a, n) {
      a.addEventListener("click", function (e) { e.preventDefault(); open(n); });
    });
    $(".lightbox__close", box).addEventListener("click", close);
    $(".lightbox__nav--prev", box).addEventListener("click", function () { show(i - 1); });
    $(".lightbox__nav--next", box).addEventListener("click", function () { show(i + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(i - 1);
      if (e.key === "ArrowRight") show(i + 1);
    });
  })();

  /* ---------- Поиск по странице (Ctrl+K) ----------
     Ищет по заголовкам h2 и h3 и переносит к ним.            */
  (function command() {
    var cmd = $(".command");
    if (!cmd) return;
    var input = $(".command__input", cmd), list = $(".command__list", cmd);
    var items = $$("h2[id], h3[id], section[id] > h2, section[id] > h3").map(function (h) {
      var id = h.id || (h.closest("section") && h.closest("section").id);
      return id ? { id: id, text: h.textContent.trim() } : null;
    }).filter(Boolean);

    function render(q) {
      var found = items.filter(function (it) { return it.text.toLowerCase().indexOf(q.toLowerCase()) !== -1; });
      list.innerHTML = found.length
        ? found.map(function (it, n) {
            return '<a href="#' + it.id + '" class="' + (n === 0 ? "is-active" : "") + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>' +
              it.text + "</a>";
          }).join("")
        : '<p class="command__empty">Ничего не нашлось</p>';
    }
    function open() { cmd.classList.add("is-open"); input.value = ""; render(""); input.focus(); }
    function close() { cmd.classList.remove("is-open"); }

    $$("[data-command-open]").forEach(function (b) { b.addEventListener("click", open); });
    input.addEventListener("input", function () { render(input.value); });
    cmd.addEventListener("click", function (e) {
      if (e.target.classList.contains("command__backdrop")) close();
      if (e.target.closest("a")) close();
    });
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); cmd.classList.contains("is-open") ? close() : open(); }
      if (e.key === "Escape") close();
      if (!cmd.classList.contains("is-open")) return;
      if (e.key === "Enter") {
        var a = $("a.is-active", list) || $("a", list);
        if (a) { a.click(); }
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var all = $$("a", list);
        if (!all.length) return;
        var cur = all.indexOf($("a.is-active", list));
        var next = (cur + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length;
        all.forEach(function (a) { a.classList.remove("is-active"); });
        all[next].classList.add("is-active");
        all[next].scrollIntoView({ block: "nearest" });
      }
    });
  })();

  /* ---------- Шаги формы ---------- */
  $$("[data-steps]").forEach(function (wrap) {
    var panels = $$(".step-panel", wrap), dots = $$(".stepper__dot", wrap), cur = 0;
    function draw() {
      panels.forEach(function (p, n) { p.classList.toggle("is-active", n === cur); });
      dots.forEach(function (d, n) {
        d.classList.toggle("is-active", n === cur);
        d.classList.toggle("is-done", n < cur);
      });
    }
    wrap.addEventListener("click", function (e) {
      if (e.target.closest("[data-step-next]") && cur < panels.length - 1) { cur++; draw(); }
      if (e.target.closest("[data-step-prev]") && cur > 0) { cur--; draw(); }
    });
    draw();
  });

  /* ---------- Оценка звёздами ---------- */
  $$(".rating[data-input]").forEach(function (r) {
    var stars = $$("button", r), out = $(r.dataset.input);
    function paint(n) { stars.forEach(function (s, i) { s.classList.toggle("is-on", i <= n); }); }
    stars.forEach(function (s, i) {
      s.addEventListener("mouseenter", function () { paint(i); });
      s.addEventListener("click", function () {
        r.dataset.value = i + 1;
        paint(i);
        if (out) out.value = i + 1;
      });
    });
    r.addEventListener("mouseleave", function () { paint((r.dataset.value || 0) - 1); });
  });

  /* ---------- Сегменты ---------- */
  $$(".segments").forEach(function (seg) {
    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      $$("button", seg).forEach(function (x) { x.classList.remove("is-active"); });
      b.classList.add("is-active");
      var target = seg.dataset.target && document.getElementById(seg.dataset.target);
      if (target) target.textContent = b.dataset.text || b.textContent;
    });
  });

  /* ---------- Ползунок значения ---------- */
  $$(".range input[type=range]").forEach(function (input) {
    var out = $(".range__val", input.closest(".range"));
    function show() {
      if (!out) return;
      var v = Number(input.value).toLocaleString("ru-RU");
      out.textContent = v + (input.dataset.suffix || "");
    }
    input.addEventListener("input", show);
    show();
  });

  /* ---------- Столбчатый график: растёт при появлении ---------- */
  $$(".chart").forEach(function (chart) {
    function fill() {
      $$(".chart__bar i", chart).forEach(function (bar) { bar.style.height = bar.dataset.h + "%"; });
    }
    if (!("IntersectionObserver" in window)) return fill();
    new IntersectionObserver(function (es, obs) {
      if (!es[0].isIntersecting) return;
      fill(); obs.disconnect();
    }, { threshold: 0.3 }).observe(chart);
  });

  /* ---------- Скопировать ---------- */
  $$(".copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.dataset.copy || btn.textContent.trim();
      var done = function () {
        var label = $("span", btn);
        var old = label ? label.textContent : "";
        btn.classList.add("is-done");
        if (label) label.textContent = "Скопировано";
        setTimeout(function () {
          btn.classList.remove("is-done");
          if (label) label.textContent = old;
        }, 1800);
      };
      function fallback() {
        // clipboard API недоступен или запрещён (частый случай на http без сертификата)
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        ta.remove();
        done();
      }
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
  });

  /* ---------- Кнопка «наверх» ---------- */
  (function toTop() {
    var btn = $(".to-top");
    if (!btn) return;
    var ticking = false;
    function update() {
      btn.classList.toggle("is-in", window.scrollY > window.innerHeight);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
    update();
  })();

  /* ---------- Раскрывающийся блок ---------- */
  $$(".collapsible").forEach(function (c) {
    var btn = $("[data-collapse]", c);
    if (!btn) return;
    btn.addEventListener("click", function () {
      var open = c.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (btn.dataset.textOpen) btn.textContent = open ? btn.dataset.textOpen : btn.dataset.textClosed;
    });
  });

  /* ---------- Календарь ---------- */
  $$(".calendar").forEach(function (cal) {
    var head = $(".calendar__title", cal), grid = $(".calendar__grid", cal);
    var out = cal.dataset.target ? document.getElementById(cal.dataset.target) : null;
    var months = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);
    var picked = null;

    function draw() {
      head.textContent = months[view.getMonth()] + " " + view.getFullYear();
      grid.innerHTML = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(function (d) { return "<span>" + d + "</span>"; }).join("");
      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var shift = (first.getDay() + 6) % 7;                       // неделя с понедельника
      var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var s = 0; s < shift; s++) grid.appendChild(document.createElement("i"));
      for (var d = 1; d <= days; d++) {
        var date = new Date(view.getFullYear(), view.getMonth(), d);
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = d;
        if (date < today) b.disabled = true;
        if (+date === +today) b.classList.add("is-today");
        if (picked && +date === +picked) b.classList.add("is-active");
        b.addEventListener("click", function (dt) {
          return function () {
            picked = dt;
            if (out) out.value = dt.toLocaleDateString("ru-RU");
            draw();
          };
        }(date));
        grid.appendChild(b);
      }
    }
    $("[data-cal-prev]", cal).addEventListener("click", function () { view.setMonth(view.getMonth() - 1); draw(); });
    $("[data-cal-next]", cal).addEventListener("click", function () { view.setMonth(view.getMonth() + 1); draw(); });
    draw();
  });

  /* ---------- Маска телефона ---------- */
  $$("input[data-phone]").forEach(function (input) {
    input.addEventListener("input", function () {
      var d = input.value.replace(/\D/g, "").replace(/^8/, "7").replace(/^([^7])/, "7$1").slice(0, 11);
      var out = "+7";
      if (d.length > 1) out += " (" + d.slice(1, 4);
      if (d.length >= 5) out += ") " + d.slice(4, 7);
      if (d.length >= 8) out += "-" + d.slice(7, 9);
      if (d.length >= 10) out += "-" + d.slice(9, 11);
      input.value = out;
    });
  });

  /* ---------- Волна от клика ---------- */
  if (!reduce) {
    document.addEventListener("click", function (e) {
      var el = e.target.closest(".ripple");
      if (!el) return;
      var r = el.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var w = document.createElement("span");
      w.className = "ripple__wave";
      w.style.width = w.style.height = size + "px";
      w.style.left = (e.clientX - r.left - size / 2) + "px";
      w.style.top = (e.clientY - r.top - size / 2) + "px";
      el.appendChild(w);
      setTimeout(function () { w.remove(); }, 620);
    });
  }

  /* ---------- Кнопка-магнит ---------- */
  if (!reduce && window.matchMedia("(hover: hover)").matches) {
    $$(".magnetic").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.25;
        var y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- Текст из-под маски ---------- */
  (function revealText() {
    var els = $$(".reveal-text");
    if (!els.length) return;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- Печатающийся текст ----------
     <span class="typewriter" data-words="Сайты,Боты,Приложения"></span>  */
  $$(".typewriter[data-words]").forEach(function (el) {
    var words = el.dataset.words.split(",");
    if (reduce) { el.textContent = words[0]; return; }
    var w = 0, i = 0, back = false;
    (function tick() {
      var word = words[w];
      el.textContent = word.slice(0, i);
      if (!back && i < word.length) i++;
      else if (!back && i === word.length) { back = true; return setTimeout(tick, 1400); }
      else if (back && i > 0) i--;
      else { back = false; w = (w + 1) % words.length; }
      setTimeout(tick, back ? 45 : 90);
    })();
  });
})();

/* =========================================================
   ЭФФЕКТЫ — один файл на все каркасы.
   Каждый блок сам проверяет, есть ли он на странице,
   поэтому файл можно подключать везде без разбора.
   Всё выключается при системной настройке «уменьшить движение».
   ========================================================= */

(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Бургер-меню ---------- */
  (function burger() {
    var btn = $(".burger"), nav = $(".nav");
    if (!btn || !nav) return;
    btn.setAttribute("aria-expanded", "false");
    function close() { document.body.classList.remove("nav-open"); btn.setAttribute("aria-expanded", "false"); }
    btn.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A") close(); });
    document.addEventListener("click", function (e) {
      if (document.body.classList.contains("nav-open") && !nav.contains(e.target) && !btn.contains(e.target)) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  })();

  /* ---------- Появление при прокрутке ---------- */
  (function reveal() {
    var items = $$("[data-reveal]");
    if (!items.length) return;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    // Порог задаём не долей высоты блока, а долей экрана.
    // Было `threshold: 0.12` — «показать, когда в окно попало 12 % блока».
    // Для блока выше восьми экранов это недостижимо: он не появлялся никогда.
    // Так на телефоне пропадало всё меню ресторана — обёртка фильтров
    // 6879 px при окне 720 px. По высоте блока ветвиться тоже нельзя:
    // на момент запуска карточки ещё скрыты фильтром и блок меряется в 48 px.
    // rootMargin снизу -20 % даёт то же ощущение и не зависит от высоты:
    // блок проявляется, когда его верх поднялся на 80 % экрана.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px -20% 0px" });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- Счётчики цифр ---------- */
  (function counters() {
    var els = $$(".counter");
    if (!els.length) return;
    function run(el) {
      var to = parseFloat(el.dataset.to || "0");
      var suffix = el.dataset.suffix || "";
      if (reduce) { el.textContent = to.toLocaleString("ru-RU") + suffix; return; }
      var dur = 1200, t0 = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - t0) / dur);
        var v = Math.round(to * (1 - Math.pow(1 - p, 3)));
        el.textContent = v.toLocaleString("ru-RU") + suffix;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    if (!("IntersectionObserver" in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- Бегущая строка: дублируем содержимое ---------- */
  $$(".marquee__track").forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });

  /* ---------- Слайдер «до / после» ---------- */
  $$(".ba").forEach(function (box) {
    var range = $(".ba__range", box);
    if (!range) return;
    function set(v) { box.style.setProperty("--pos", v + "%"); }
    set(range.value || 50);
    range.addEventListener("input", function () { set(range.value); });
  });

  /* ---------- Наклон карточек ---------- */
  if (!reduce && window.matchMedia("(hover: hover)").matches) {
    $$(".tilt").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(700px) rotateX(" + (-y * 6) + "deg) rotateY(" + (x * 6) + "deg) translateY(-4px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- Аккордеон ---------- */
  $$(".acc").forEach(function (acc) {
    $$(".acc__btn", acc).forEach(function (btn) {
      var item = btn.closest(".acc__item");
      btn.setAttribute("aria-expanded", item.classList.contains("is-open") ? "true" : "false");
      btn.addEventListener("click", function () {
        var open = item.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  });

  /* ---------- Карусель: кнопки прокрутки ---------- */
  $$("[data-slider]").forEach(function (wrap) {
    var track = $(".slider", wrap);
    var prev = $("[data-prev]", wrap), next = $("[data-next]", wrap);
    if (!track) return;
    function step() { return Math.min(track.clientWidth * 0.9, 380); }
    if (prev) prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" }); });
    if (next) next.addEventListener("click", function () { track.scrollBy({ left:  step(), behavior: reduce ? "auto" : "smooth" }); });
  });

  /* ---------- Фильтры каталога ---------- */
  $$("[data-filters]").forEach(function (wrap) {
    var buttons = $$("button", $(".filters", wrap));
    var items = $$(".catalog__item", wrap);
    function apply(tag) {
      items.forEach(function (it) {
        var ok = tag === "*" || (it.dataset.tags || "").split(" ").indexOf(tag) !== -1;
        it.classList.toggle("is-shown", ok);
      });
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        buttons.forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        apply(b.dataset.tag || "*");
      });
    });
    apply("*");
  });

  /* ---------- Выбор слота записи ---------- */
  $$(".slots").forEach(function (box) {
    box.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn || btn.disabled) return;
      $$("button", box).forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var out = document.getElementById(box.dataset.target || "");
      if (out) out.value = (box.dataset.day || "") + " " + btn.textContent.trim();
    });
  });

  /* ---------- Калькулятор ---------- */
  $$("[data-calc]").forEach(function (calc) {
    var out = $("[data-calc-sum]", calc);
    if (!out) return;
    function recalc() {
      var total = 0;
      $$("[data-price]", calc).forEach(function (el) {
        var price = parseFloat(el.dataset.price) || 0;
        if (el.type === "checkbox") { if (el.checked) total += price; }
        else if (el.type === "range" || el.type === "number") {
          total += price * (parseFloat(el.value) || 0);
          var lab = document.getElementById(el.dataset.out || "");
          if (lab) lab.textContent = el.value;
        } else if (el.tagName === "SELECT") {
          total += parseFloat(el.selectedOptions[0].dataset.price || "0");
        }
      });
      var mult = 1;
      $$("[data-mult]", calc).forEach(function (el) {
        if ((el.type === "checkbox" && el.checked) || el.tagName === "SELECT") {
          mult *= parseFloat(el.tagName === "SELECT" ? (el.selectedOptions[0].dataset.mult || 1) : el.dataset.mult) || 1;
        }
      });
      total = Math.round(total * mult / 500) * 500;
      out.textContent = total.toLocaleString("ru-RU") + " ₽";
      var hidden = $("[data-calc-field]", calc);
      if (hidden) hidden.value = out.textContent;
    }
    calc.addEventListener("input", recalc);
    calc.addEventListener("change", recalc);
    recalc();
  });

  /* ---------- Таймер акции ---------- */
  $$(".timer").forEach(function (t) {
    var until = new Date(t.dataset.until || "").getTime();
    if (!until) return;
    var names = ["дней", "часов", "минут", "секунд"];
    function tick() {
      var d = Math.max(0, until - Date.now());
      var v = [Math.floor(d / 864e5), Math.floor(d / 36e5) % 24, Math.floor(d / 6e4) % 60, Math.floor(d / 1e3) % 60];
      t.innerHTML = v.map(function (n, i) {
        return "<div><b>" + String(n).padStart(2, "0") + "</b><span>" + names[i] + "</span></div>";
      }).join("");
    }
    tick();
    setInterval(tick, 1000);
  });


  /* ---------- Параллакс фона ----------
     Без IntersectionObserver: секций с параллаксом на странице единицы,
     проверить их прямоугольники дешевле, чем держать наблюдатель. */
  (function parallax() {
    if (reduce) return;
    var pars = $$(".parallax");
    if (!pars.length) return;
    var ticking = false;
    function update() {
      pars.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;   // вне экрана — не считаем
        var shift = (r.top / window.innerHeight) * 40;            // 40px хода, без «плавания»
        el.style.setProperty("--parallax-shift", shift.toFixed(1) + "px");
      });
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  })();

  /* ---------- Видео: грузим только когда экран близко ---------- */
  $$(".video-hero video[data-video]").forEach(function (v) {
    var saveData = navigator.connection && navigator.connection.saveData;
    if (reduce || saveData) return;                 // экономия трафика — остаётся постер
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (es, obs) {
      if (!es[0].isIntersecting) return;
      v.src = v.dataset.video;
      v.play().catch(function () {});               // автовоспроизведение могли запретить
      obs.disconnect();
    }, { rootMargin: "200px" }).observe(v);
  });

  /* ---------- Год в подвале ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();

/* =========================================================
   НОУТБУК В HERO — оркестровка сцены.
   Проигрывается один раз, когда ноутбук попадает в вьюпорт.
   Финал: на экране открыт наш сайт (без разворота на весь
   экран — это просто визуал hero).
   ========================================================= */

(function () {
  const scene = document.querySelector(".laptop-scene");
  if (!scene) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const viewport   = scene.querySelector(".laptop__viewport");
  const browser    = scene.querySelector(".browser");
  const urlBar     = scene.querySelector(".browser__url");
  const searchScr  = scene.querySelector(".screen--search");
  const resultsScr = scene.querySelector(".screen--results");
  const siteScr    = scene.querySelector(".screen--site");
  const typed      = scene.querySelector(".search__text");
  const topResult  = scene.querySelector(".result--top");
  const cursor     = scene.querySelector(".lap-cursor");

  let started = false;

  // Подписи внутри сцены пишутся из скрипта — прогоняем их через словарь языков
  const T = s => (window.I18N ? window.I18N.t(s) : s);

  /* Клавиатура: генерируем настоящие клавиши (ряды × клавиши) */
  (function buildKeyboard() {
    const kb = scene.querySelector(".deck__keys");
    if (!kb) return;
    const rows = [];
    // функциональный ряд
    rows.push({ cls: "deck__row deck__row--fn", keys: Array.from({ length: 14 }, () => "key") });
    // 4 основных ряда: крайние клавиши пошире
    for (let r = 0; r < 4; r++) {
      rows.push({ cls: "deck__row", keys: Array.from({ length: 14 }, (_, i) => (i === 0 || i === 13) ? "key key--wide" : "key") });
    }
    // нижний ряд с пробелом
    rows.push({ cls: "deck__row", keys: ["key", "key", "key key--wide", "key key--space", "key key--wide", "key", "key"] });
    kb.innerHTML = rows.map(row =>
      '<div class="' + row.cls + '">' + row.keys.map(k => '<span class="' + k + '"></span>').join("") + "</div>"
    ).join("");
  })();

  const sleep = ms => new Promise(res => setTimeout(res, ms));
  const show = el => el && el.classList.add("is-shown");
  const hide = el => el && el.classList.remove("is-shown");

  function typeText(el, text, speed) {
    return new Promise(res => {
      const str = String(text || "");
      if (!str) { el.textContent = ""; res(); return; }   // пустая строка не должна ронять сцену
      let i = 0; el.textContent = "";
      const tick = () => {
        el.textContent += str[i++];
        if (i < str.length) setTimeout(tick, speed); else res();
      };
      tick();
    });
  }

  function cursorTo(el) {
    const vpR = viewport.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = r.left - vpR.left + r.width / 2;
    const y = r.top - vpR.top + r.height / 2;
    cursor.style.setProperty("--cx", x + "px");
    cursor.style.setProperty("--cy", y + "px");
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    return sleep(950);
  }

  function clickCursor() {
    cursor.classList.add("is-click");
    setTimeout(() => cursor.classList.remove("is-click"), 200);
  }

  async function run() {
    // Стартовое состояние прячем под невидимой сценой
    hide(siteScr); show(searchScr);
    urlBar.textContent = T("поиск");
    await sleep(150);

    scene.classList.add("is-in");            // крышка открывается + fade-in
    cursor.classList.add("is-visible");
    await sleep(1400);

    await typeText(typed, T("decidio — сайты и автоматизация"), 55);
    await sleep(500);

    urlBar.textContent = T("поиск: decidio — сайты и автоматизация");
    hide(searchScr); show(resultsScr);
    await sleep(700);

    await cursorTo(topResult);
    topResult.classList.add("is-hover");
    await sleep(400);
    clickCursor();
    await sleep(450);

    urlBar.textContent = "decidio.ru";
    hide(resultsScr);
    browser.classList.add("is-loading");
    await sleep(800);

    show(siteScr);
    browser.classList.remove("is-loading");
    await sleep(300);
    cursor.classList.remove("is-visible");   // сайт открыт — конец
  }

  /* Финальное состояние сцены: открытый сайт на экране.
     Вынесено отдельно, потому что попасть в него нужно ЛЮБОЙ ценой —
     если анимация прервалась на середине (слабый телефон, экономия
     энергии, вкладка ушла в фон), все три экрана оказывались скрыты
     и в ноутбуке белело пустое место. */
  function finish() {
    scene.classList.add("is-in");
    hide(searchScr); hide(resultsScr);
    browser.classList.remove("is-loading");
    urlBar.textContent = "decidio.ru";
    show(siteScr);
    cursor.classList.remove("is-visible");
  }

  function start() {
    if (started) return;
    started = true;
    if (reduce) { finish(); return; }

    /* Две страховки от пустого экрана:
       1) каждые 0,6 с проверяем, виден ли хоть один экран. Если сцена
          «провалилась» между шагами — сразу показываем открытый сайт;
       2) общий предел: через 9 секунд финал наступает в любом случае. */
    const shown = () =>
      searchScr.classList.contains("is-shown") ||
      resultsScr.classList.contains("is-shown") ||
      siteScr.classList.contains("is-shown");

    const blankWatch = setInterval(() => {
      if (!shown()) { clearInterval(blankWatch); finish(); }
    }, 600);

    const guard = setTimeout(() => {
      if (!siteScr.classList.contains("is-shown")) finish();
    }, 9000);

    const stopGuards = () => { clearInterval(blankWatch); clearTimeout(guard); };

    run()
      .then(stopGuards)
      .catch(() => { stopGuards(); finish(); });
  }

  // Запуск, когда ноутбук появляется в вьюпорте
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => { if (e.isIntersecting) { obs.disconnect(); start(); } });
    }, { threshold: 0.3 });
    io.observe(scene);
    // Если наблюдатель почему-то не сработал (низкий экран, ошибка вычислений) —
    // запускаем сами, чтобы сцена не осталась в стартовом состоянии.
    setTimeout(start, 6000);
  } else {
    start();
  }
})();

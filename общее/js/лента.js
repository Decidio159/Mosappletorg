/* Лента карточек на телефоне.

   На широком экране блок остаётся обычной сеткой. На узком — превращается
   в горизонтальную ленту со стрелками и неспешной автопрокруткой.
   Разметку стрелок скрипт создаёт сам: в HTML нужна только обёртка

       <div class="lenta" data-lenta> …сетка карточек… </div>

   Лента бесконечная. Сделано не арифметикой по позиции прокрутки — так
   край всё равно успевал показаться, — а перестановкой самих карточек:
   лента всегда стоит на второй карточке от начала, и как только человек
   уходит дальше, первая карточка молча переезжает в конец, а прокрутка
   уменьшается ровно на её ширину. Визуально не меняется ничего, но впереди
   и позади всегда есть запас, и до края доехать нельзя ни стрелкой, ни
   пальцем. Поэтому стрелки не прячутся. Автопрокрутка замолкает, как только
   человек листнул сам, и не запускается при prefers-reduced-motion. */
(function () {
  "use strict";

  var ПОРОГ = 720;          // до этой ширины показываем ленту
  var ПАУЗА = 4500;         // мс между шагами автопрокрутки
  var ПОСЛЕ_РУКИ = 12000;   // мс тишины после того, как человек листнул сам

  var спокойно = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ленты = [].slice.call(document.querySelectorAll("[data-lenta]"));
  if (!ленты.length) return;

  ленты.forEach(завести);

  function завести(обёртка) {
    var трек = обёртка.firstElementChild;
    while (трек && трек.nodeType !== 1) трек = трек.nextElementSibling;
    if (!трек || !трек.children.length) return;
    трек.classList.add("lenta__track");

    var назад = кнопка("prev", "Предыдущая карточка", "M15 18l-6-6 6-6");
    var вперёд = кнопка("next", "Следующая карточка", "M9 6l6 6-6 6");
    обёртка.appendChild(назад);
    обёртка.appendChild(вперёд);

    var таймер = null;
    var пауза_до = 0;
    var едем = 0;               // пока идёт наш собственный плавный ход
    var ждём_нормализации;      // таймер приведения ленты к базовой позиции

    function лента_включена() { return window.innerWidth <= ПОРОГ; }

    function шаг() {
      var первая = трек.children[0];
      if (!первая) return трек.clientWidth;
      var стиль = getComputedStyle(трек);
      return первая.getBoundingClientRect().width + (parseFloat(стиль.columnGap) || 0);
    }

    function обновить_стрелки() {
      // лента закольцована, поэтому стрелки нужны всегда — прячем их
      // только там, где ленты нет вовсе
      назад.hidden = вперёд.hidden = !лента_включена();
    }

    function начало() {
      return parseFloat(getComputedStyle(трек).paddingInlineStart) || 0;
    }

    /* Держим ленту на одной карточке от начала: спереди и сзади всегда
       остаётся запас, поэтому край не показывается никогда.
       Прилипание на время перестановки выключаем — иначе браузер сам
       доводит прокрутку и получается рывок. */
    /* База ленты — ровно одна карточка от начала. Мы всегда возвращаемся
       к ней, а вперёд и назад двигаются сами карточки: первая уезжает
       в конец, последняя приходит в начало. Поэтому спереди и позади
       всегда есть запас и до края доехать нельзя ни стрелкой, ни пальцем. */
    function база() { return шаг(); }

    function повернуть(на) {
      var сколько = Math.min(Math.abs(на), трек.children.length);
      for (var и = 0; и < сколько; и++) {
        if (на > 0) трек.appendChild(трек.firstElementChild);
        else трек.insertBefore(трек.lastElementChild, трек.firstElementChild);
      }
    }

    /* Мгновенная установка позиции. scroll-behavior у трека плавный,
       поэтому на время подмены его отключаем — иначе «мгновенно» превращается
       в ещё одну анимацию поверх текущей. */
    function встать(куда) {
      трек.style.scrollBehavior = "auto";
      трек.scrollLeft = куда;
      трек.offsetHeight;
      трек.style.scrollBehavior = "";
    }

    /* Куда бы лента ни уехала — пальцем или анимацией, — считаем, на сколько
       карточек, поворачиваем список на столько же и возвращаемся к базе.
       Для человека ничего не дёргается: под пальцем те же карточки. */
    function нормализовать() {
      var ш = шаг();
      if (!ш || трек.children.length < 3) return;
      var сдвиг = Math.round((трек.scrollLeft - база()) / ш);
      if (сдвиг) повернуть(сдвиг);
      встать(база());
    }

    function листнуть(куда) {
      var ш = шаг();
      едем = Date.now() + 700;
      if (спокойно) {
        повернуть(куда > 0 ? 1 : -1);
        встать(база());
        return;
      }
      трек.scrollTo({ left: база() + куда * ш, behavior: "smooth" });
      clearTimeout(ждём_нормализации);
      ждём_нормализации = setTimeout(нормализовать, 520);
    }

    /* Пока человек листает сам, автопрокрутка молчит. */
    function руками() { пауза_до = Date.now() + ПОСЛЕ_РУКИ; }

    function тик() {
      if (!лента_включена() || document.hidden || Date.now() < пауза_до) return;
      if (обёртка.matches(":hover")) return;
      листнуть(1);
    }

    назад.addEventListener("click", function () { руками(); листнуть(-1); });
    вперёд.addEventListener("click", function () { руками(); листнуть(1); });

    var ждём_остановки;
    трек.addEventListener("scroll", function () {
      // во время собственного плавного хода нормализацию делает его таймер
      if (Date.now() < едем) return;
      clearTimeout(ждём_остановки);
      ждём_остановки = setTimeout(нормализовать, 260);
    }, { passive: true });
    трек.addEventListener("touchstart", руками, { passive: true });
    трек.addEventListener("wheel", руками, { passive: true });

    function пересобрать() {
      var было = обёртка.classList.contains("is-lenta");
      обёртка.classList.toggle("is-lenta", лента_включена());
      if (!лента_включена()) { трек.scrollLeft = 0; }
      else if (было !== лента_включена()) встать(база());
      обновить_стрелки();
      clearInterval(таймер);
      таймер = null;
      if (лента_включена() && !спокойно && трек.children.length > 1) {
        таймер = setInterval(тик, ПАУЗА);
      }
    }

    window.addEventListener("resize", пересобрать);
    пересобрать();
    // Картинки грузятся лениво: пока они не встали на место, ширина трека
    // меряется неверно, поэтому меряем ещё раз после загрузки и при возврате
    // на страницу из истории браузера.
    window.addEventListener("load", нормализовать);
    window.addEventListener("pageshow", function () { обновить_стрелки(); нормализовать(); });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) нормализовать();
    });
  }

  function кнопка(сторона, подпись, путь) {
    var э = document.createElement("button");
    э.type = "button";
    э.className = "lenta__arrow lenta__arrow--" + сторона;
    э.setAttribute("aria-label", подпись);
    э.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + путь + '"/></svg>';
    э.hidden = true;
    return э;
  }
})();

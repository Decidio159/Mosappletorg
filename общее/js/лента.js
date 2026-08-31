/* Лента карточек на телефоне.

   На широком экране блок остаётся обычной сеткой. На узком — превращается
   в горизонтальную ленту со стрелками и неспешной автопрокруткой.
   Разметку стрелок скрипт создаёт сам: в HTML нужна только обёртка

       <div class="lenta" data-lenta> …сетка карточек… </div>

   Лента закольцована, как слайдер баннеров на главной: с последней карточки
   «вперёд» ведёт на первую, с первой «назад» — на последнюю. Поэтому стрелки
   не прячутся. Автопрокрутка останавливается, как только человек тронул ленту
   сам, и не запускается при prefers-reduced-motion. */
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

    function предел() {
      return трек.scrollWidth - трек.clientWidth - 2;
    }

    var едем = 0;   // пока идёт плавный переход, выравнивать нельзя

    function листнуть(куда) {
      var плавно = спокойно ? "auto" : "smooth";
      едем = Date.now() + 700;
      /* С последней карточки уезжаем в начало, с первой — в конец.
         Порог — половина карточки, а не пара пикселей: после выравнивания
         лента встаёт по сетке шага и до самого края обычно не доезжает. */
      var допуск = шаг() * 0.5;
      if (куда > 0 && трек.scrollLeft >= предел() - допуск) {
        трек.scrollTo({ left: 0, behavior: плавно });
      } else if (куда < 0 && трек.scrollLeft <= начало() + допуск) {
        трек.scrollTo({ left: трек.scrollWidth, behavior: плавно });
      } else {
        трек.scrollBy({ left: куда * шаг(), behavior: плавно });
      }
    }

    /* Возврат на страницу «назад» восстанавливает прокрутку ленты как попало —
       карточка замирает разрезанной краем экрана. Доводим её до ближайшей. */
    function выровнять() {
      // во время собственного плавного перехода выравнивание сбивало ленту
      // обратно к прежней карточке — особенно при переходе с последней на первую
      if (!лента_включена() || Date.now() < едем) return;
      var ш = шаг();
      if (!ш) return;
      var поле = начало();
      var сколько = Math.round((трек.scrollLeft - поле) / ш);
      трек.scrollTo({ left: поле + сколько * ш, behavior: "auto" });
    }

    назад.addEventListener("click", function () { руками(); листнуть(-1); });
    вперёд.addEventListener("click", function () { руками(); листнуть(1); });

    var ждём_остановки;
    трек.addEventListener("scroll", function () {
      обновить_стрелки();
      // после ручного пролистывания тоже доводим карточку до края
      clearTimeout(ждём_остановки);
      ждём_остановки = setTimeout(выровнять, 220);
    }, { passive: true });
    трек.addEventListener("touchstart", руками, { passive: true });
    трек.addEventListener("wheel", руками, { passive: true });

    function руками() { пауза_до = Date.now() + ПОСЛЕ_РУКИ; }

    function тик() {
      if (!лента_включена() || document.hidden || Date.now() < пауза_до) return;
      if (обёртка.matches(":hover")) return;
      листнуть(1);
    }

    function пересобрать() {
      обёртка.classList.toggle("is-lenta", лента_включена());
      if (!лента_включена()) трек.scrollLeft = 0;
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
    window.addEventListener("load", выровнять);
    window.addEventListener("pageshow", function () { обновить_стрелки(); выровнять(); });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) выровнять();
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

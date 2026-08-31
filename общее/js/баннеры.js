/* Слайдер баннеров на первом экране.

   Баннеры никуда не ведут — это витрина, поэтому внутри картинки, а не ссылки.
   Скрипт сам добавляет стрелки, крутит слайды по кругу и останавливается,
   когда человек взялся листать сам или ушёл на другую вкладку. */
(function () {
  "use strict";

  var блок = document.querySelector("[data-banners]");
  if (!блок) return;

  var трек = блок.querySelector("[data-banners-track]");
  var точки = [].slice.call(блок.querySelectorAll("[data-banner-dot]"));
  var слайды = [].slice.call(трек.children);
  if (слайды.length < 2) return;

  var спокойно = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ПАУЗА = 5000;
  var ХОД = 600;              // столько же, сколько transition в theme.css
  var пауза_до = 0;
  var едет = false;

  /* Бесконечная карусель без «отмотки» назад: по краям вешаем клоны —
     копию последнего слайда перед первым и копию первого после последнего.
     Лента всегда едет в одну сторону, а когда доезжает до клона, мы молча,
     без анимации, переставляем её на настоящий слайд. Шва не видно. */
  var первый_клон = слайды[0].cloneNode(true);
  var последний_клон = слайды[слайды.length - 1].cloneNode(true);
  [первый_клон, последний_клон].forEach(function (к) {
    к.setAttribute("aria-hidden", "true");
    var кар = к.querySelector("img");
    if (кар) { кар.setAttribute("alt", ""); кар.setAttribute("loading", "lazy"); }
  });
  трек.insertBefore(последний_клон, слайды[0]);
  трек.appendChild(первый_клон);

  var всего = слайды.length;
  var позиция = 1;            // единица — потому что слева стоит клон

  function сдвинуть(анимировать) {
    трек.style.transition = анимировать ? "" : "none";
    трек.style.transform = "translateX(" + (-позиция * 100) + "%)";
    if (!анимировать) трек.offsetHeight;   // заставляем браузер применить сразу
  }

  function номер_слайда() {
    return (позиция - 1 + всего) % всего;
  }

  function отметить() {
    var н = номер_слайда();
    точки.forEach(function (т, и) { т.classList.toggle("is-active", и === н); });
    слайды.forEach(function (с, и) {
      с.setAttribute("aria-hidden", и === н ? "false" : "true");
    });
  }

  function показать(куда) {
    if (едет) return;
    едет = true;
    позиция += куда;
    сдвинуть(!спокойно);
    отметить();
    setTimeout(function () {
      // доехали до клона — переставляем на настоящий слайд без анимации
      if (позиция === всего + 1) { позиция = 1; сдвинуть(false); }
      if (позиция === 0) { позиция = всего; сдвинуть(false); }
      едет = false;
    }, спокойно ? 0 : ХОД);
  }

  function к_слайду(н) {
    if (едет) return;
    позиция = н + 1;
    сдвинуть(!спокойно);
    отметить();
  }

  var назад = стрелка("prev", "Предыдущий баннер", "M15 18l-6-6 6-6");
  var вперёд = стрелка("next", "Следующий баннер", "M9 6l6 6-6 6");
  блок.appendChild(назад);
  блок.appendChild(вперёд);

  function руками() { пауза_до = Date.now() + 15000; }

  назад.addEventListener("click", function () { руками(); показать(-1); });
  вперёд.addEventListener("click", function () { руками(); показать(1); });
  точки.forEach(function (т, и) {
    т.addEventListener("click", function () { руками(); к_слайду(и); });
  });

  /* Свайп пальцем — на телефоне листать стрелками неудобно. */
  var старт = null;
  трек.addEventListener("touchstart", function (е) { старт = е.touches[0].clientX; руками(); }, { passive: true });
  трек.addEventListener("touchend", function (е) {
    if (старт === null) return;
    var сдвиг = е.changedTouches[0].clientX - старт;
    if (Math.abs(сдвиг) > 40) показать(сдвиг < 0 ? 1 : -1);
    старт = null;
  }, { passive: true });

  сдвинуть(false);
  отметить();
  if (!спокойно) {
    setInterval(function () {
      if (document.hidden || Date.now() < пауза_до || блок.matches(":hover")) return;
      показать(1);
    }, ПАУЗА);
  }

  function стрелка(сторона, подпись, путь) {
    var э = document.createElement("button");
    э.type = "button";
    э.className = "banners__arrow banners__arrow--" + сторона;
    э.setAttribute("aria-label", подпись);
    э.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="' + путь + '"/></svg>';
    return э;
  }
})();

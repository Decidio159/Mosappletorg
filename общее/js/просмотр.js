/* Просмотр снимка товара во весь экран с увеличением.

   Открывается кликом по фото — в каталоге и на странице товара.
   Внутри: колесо мыши и щипок двумя пальцами приближают, кнопки «+/−»
   тоже, двойной клик переключает между обычным и двукратным. Увеличенный
   снимок таскается мышью и пальцем. Esc и клик по фону закрывают,
   стрелки листают снимки товара, если их несколько.

   Разметку окна скрипт создаёт сам: в HTML нужен только атрибут
   data-zoom со списком снимков через «|» на кликабельной картинке. */
(function () {
  "use strict";

  var МАКС = 4;
  var окно = null, полотно = null, подпись = null;
  var снимки = [], текущий = 0;
  var масштаб = 1, сдвигX = 0, сдвигY = 0;
  var тянем = false, startX = 0, startY = 0, базаX = 0, базаY = 0;
  var щипок = 0;

  function собрать() {
    окно = document.createElement("div");
    окно.className = "zoom";
    окно.setAttribute("role", "dialog");
    окно.setAttribute("aria-modal", "true");
    окно.setAttribute("aria-label", "Просмотр фотографии");
    окно.innerHTML =
      '<button class="zoom__close" type="button" aria-label="Закрыть">' + значок("M18 6 6 18M6 6l12 12") + "</button>" +
      '<button class="zoom__nav zoom__nav--prev" type="button" aria-label="Предыдущий снимок">' + значок("M15 18l-6-6 6-6") + "</button>" +
      '<button class="zoom__nav zoom__nav--next" type="button" aria-label="Следующий снимок">' + значок("M9 6l6 6-6 6") + "</button>" +
      '<div class="zoom__stage" data-zoom-stage><img alt="" data-zoom-img /></div>' +
      '<div class="zoom__bar">' +
      '<button class="zoom__btn" type="button" data-zoom-out aria-label="Уменьшить">' + значок("M5 12h14") + "</button>" +
      '<span class="zoom__count" data-zoom-count></span>' +
      '<button class="zoom__btn" type="button" data-zoom-in aria-label="Увеличить">' + значок("M12 5v14M5 12h14") + "</button>" +
      "</div>";
    document.body.appendChild(окно);
    полотно = окно.querySelector("[data-zoom-img]");
    подпись = окно.querySelector("[data-zoom-count]");

    окно.addEventListener("click", function (е) {
      if (е.target === окно || е.target.closest(".zoom__close")) закрыть();
      if (е.target.closest(".zoom__nav--prev")) листнуть(-1);
      if (е.target.closest(".zoom__nav--next")) листнуть(1);
      if (е.target.closest("[data-zoom-in]")) приблизить(0.5);
      if (е.target.closest("[data-zoom-out]")) приблизить(-0.5);
    });

    var сцена = окно.querySelector("[data-zoom-stage]");
    сцена.addEventListener("wheel", function (е) {
      е.preventDefault();
      приблизить(е.deltaY < 0 ? 0.3 : -0.3);
    }, { passive: false });
    сцена.addEventListener("dblclick", function () {
      применить(масштаб > 1 ? 1 : 2);
    });

    сцена.addEventListener("pointerdown", function (е) {
      if (масштаб <= 1) return;
      тянем = true; сцена.setPointerCapture(е.pointerId);
      startX = е.clientX; startY = е.clientY; базаX = сдвигX; базаY = сдвигY;
    });
    сцена.addEventListener("pointermove", function (е) {
      if (!тянем) return;
      сдвигX = базаX + (е.clientX - startX);
      сдвигY = базаY + (е.clientY - startY);
      нарисовать();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (имя) {
      сцена.addEventListener(имя, function () { тянем = false; });
    });

    /* Щипок двумя пальцами — основной жест увеличения на телефоне. */
    сцена.addEventListener("touchmove", function (е) {
      if (е.touches.length !== 2) return;
      е.preventDefault();
      var d = расстояние(е.touches);
      if (щипок) применить(масштаб * (d / щипок));
      щипок = d;
    }, { passive: false });
    сцена.addEventListener("touchend", function () { щипок = 0; });

    document.addEventListener("keydown", function (е) {
      if (!окно.classList.contains("is-open")) return;
      if (е.key === "Escape") закрыть();
      if (е.key === "ArrowLeft") листнуть(-1);
      if (е.key === "ArrowRight") листнуть(1);
    });
  }

  function значок(путь) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="' + путь + '"/></svg>';
  }

  function расстояние(точки) {
    var dx = точки[0].clientX - точки[1].clientX;
    var dy = точки[0].clientY - точки[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function применить(новый) {
    масштаб = Math.min(МАКС, Math.max(1, новый));
    if (масштаб === 1) { сдвигX = 0; сдвигY = 0; }
    нарисовать();
  }

  function приблизить(на) { применить(масштаб + на); }

  function нарисовать() {
    полотно.style.transform =
      "translate(" + сдвигX + "px," + сдвигY + "px) scale(" + масштаб + ")";
    полотно.style.cursor = масштаб > 1 ? "grab" : "zoom-in";
  }

  function показать(номер) {
    текущий = (номер + снимки.length) % снимки.length;
    полотно.src = снимки[текущий];
    применить(1);
    подпись.textContent = снимки.length > 1
      ? (текущий + 1) + " из " + снимки.length
      : "Колесом или щипком — крупнее";
    окно.querySelectorAll(".zoom__nav").forEach(function (к) {
      к.hidden = снимки.length < 2;
    });
  }

  function листнуть(куда) { показать(текущий + куда); }

  function открыть(список, начальный, имя) {
    if (!окно) собрать();
    снимки = список;
    полотно.alt = имя || "";
    показать(начальный || 0);
    окно.classList.add("is-open");
    document.body.style.overflow = "hidden";
    окно.querySelector(".zoom__close").focus();
  }

  function закрыть() {
    окно.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function запустить(цель) {
    var список = цель.dataset.zoom.split("|").filter(Boolean);
    if (!список.length) return;
    открыть(список, 0, цель.getAttribute("alt") || "");
  }

  document.addEventListener("click", function (е) {
    var цель = е.target.closest("[data-zoom]");
    if (!цель) return;
    е.preventDefault();
    запустить(цель);
  });

  /* Картинка с role="button" сама по себе не отзывается на клавиатуру. */
  document.addEventListener("keydown", function (е) {
    if (е.key !== "Enter" && е.key !== " ") return;
    var цель = е.target.closest && е.target.closest("[data-zoom]");
    if (!цель) return;
    е.preventDefault();
    запустить(цель);
  });
})();

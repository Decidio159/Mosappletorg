/* Галерея на странице товара: клик по миниатюре меняет крупный снимок.
   Отдельный файл, потому что в общем скелете такого блока нет.
   Крупные снимки уже лежат в разметке миниатюр, поэтому подмена мгновенная. */
(function () {
  "use strict";
  var галерея = document.querySelector("[data-gallery]");
  if (!галерея) return;

  var главный = galleryMain();
  function galleryMain() { return галерея.querySelector("[data-gallery-main]"); }
  if (!главный) return;

  галерея.addEventListener("click", function (событие) {
    var кнопка = событие.target.closest("[data-gallery-thumb]");
    if (!кнопка) return;
    главный.src = кнопка.dataset.galleryThumb;
    [].forEach.call(галерея.querySelectorAll("[data-gallery-thumb]"), function (э) {
      э.classList.toggle("is-active", э === кнопка);
    });
  });
})();

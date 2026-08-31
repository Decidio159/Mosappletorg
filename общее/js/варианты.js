/* Выбор объёма памяти (или комплектации) на странице товара.

   Меняется не только подпись цены, но и данные для корзины: иначе человек
   выбрал бы 512 ГБ, а в заявку ушла бы конфигурация со 128 ГБ.
   Разметка: .variants > [data-variant] с data-price и data-label,
   цена — в [data-price-out], карточка товара — ближайший [data-id]. */
(function () {
  "use strict";

  var блок = document.querySelector("[data-variants]");
  if (!блок) return;

  var карточка = блок.closest("[data-id]");
  var вывод = карточка && карточка.querySelector("[data-price-out]");
  if (!карточка || !вывод) return;

  var базовое_имя = карточка.dataset.name;

  function рублями(число) {
    return String(число).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
  }

  блок.addEventListener("click", function (событие) {
    var кнопка = событие.target.closest("[data-variant]");
    if (!кнопка) return;

    [].forEach.call(блок.querySelectorAll("[data-variant]"), function (э) {
      э.classList.toggle("is-active", э === кнопка);
      э.setAttribute("aria-pressed", э === кнопка ? "true" : "false");
    });

    var цена = parseInt(кнопка.dataset.price, 10);
    вывод.textContent = (кнопка.dataset.from ? "от " : "") + рублями(цена);
    карточка.dataset.price = цена;
    карточка.dataset.name = базовое_имя + " · " + кнопка.dataset.label;
  });
})();

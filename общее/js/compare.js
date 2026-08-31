/* Сравнение товаров.
   Список выбранного лежит в localStorage под ключом "compare" и переживает
   переход между страницами — так же, как корзина в cart.js.

   Разметка, за которую цепляемся:
     [data-id] > [data-compare]      кнопка на карточке и на странице товара
     [data-compare-count]            счётчик в шапке
     [data-compare-page]             страница сравнения целиком
   Данные для таблицы страница сравнения приносит с собой:
     window.ТОВАРЫ_ДЛЯ_СРАВНЕНИЯ — их вшивает собрать-товары.py, а не запрос,
     иначе макет не открылся бы файлом с флешки. */
(function () {
  "use strict";

  var КЛЮЧ = "compare";
  var ПРЕДЕЛ = 4;

  function $(с, где) { return (где || document).querySelector(с); }
  function $$(с, где) { return [].slice.call((где || document).querySelectorAll(с)); }

  function читать() {
    try {
      var с = JSON.parse(localStorage.getItem(КЛЮЧ));
      return Array.isArray(с) ? с.slice(0, ПРЕДЕЛ) : [];
    } catch (е) { return []; }
  }

  function писать(список) {
    try { localStorage.setItem(КЛЮЧ, JSON.stringify(список)); } catch (е) {}
  }

  function цена(число) {
    return String(число).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
  }

  /* ---------- Счётчик в шапке ---------- */
  function обновить_счётчики() {
    var сколько = читать().length;
    $$("[data-compare-count]").forEach(function (э) {
      э.textContent = сколько;
      э.style.display = сколько ? "" : "none";
    });
  }

  /* ---------- Кнопки «К сравнению» ---------- */
  function обновить_кнопки() {
    var список = читать();
    $$("[data-compare]").forEach(function (кнопка) {
      var хозяин = кнопка.closest("[data-id]");
      if (!хозяин) return;
      var внутри = список.indexOf(хозяин.dataset.id) > -1;
      кнопка.classList.toggle("is-active", внутри);
      кнопка.setAttribute("aria-pressed", внутри ? "true" : "false");
      var подпись = $("[data-compare-label]", кнопка);
      if (подпись) подпись.textContent = внутри ? "В сравнении" : "К сравнению";
    });
  }

  function переключить(ид, кнопка) {
    var список = читать();
    var где = список.indexOf(ид);
    if (где > -1) {
      список.splice(где, 1);
    } else {
      if (список.length >= ПРЕДЕЛ) {
        сообщить(кнопка, "Больше четырёх сравнивать неудобно — уберите один");
        return;
      }
      список.push(ид);
    }
    писать(список);
    обновить_счётчики();
    обновить_кнопки();
    нарисовать_таблицу();
  }

  /* Короткая подсказка возле кнопки: отдельного окна ради одной строки не нужно. */
  function сообщить(рядом, текст) {
    var было = $(".compare-hint");
    if (было) было.remove();
    var подсказка = document.createElement("span");
    подсказка.className = "compare-hint";
    подсказка.textContent = текст;
    рядом.parentNode.insertBefore(подсказка, рядом.nextSibling);
    setTimeout(function () { подсказка.remove(); }, 3000);
  }

  document.addEventListener("click", function (событие) {
    var кнопка = событие.target.closest("[data-compare]");
    if (!кнопка) return;
    var хозяин = кнопка.closest("[data-id]");
    if (!хозяин) return;
    событие.preventDefault();
    переключить(хозяин.dataset.id, кнопка);
  });

  /* ---------- Таблица на странице сравнения ---------- */
  function нарисовать_таблицу() {
    var страница = $("[data-compare-page]");
    if (!страница || !window.ТОВАРЫ_ДЛЯ_СРАВНЕНИЯ) return;

    var все = window.ТОВАРЫ_ДЛЯ_СРАВНЕНИЯ;
    var список = читать().filter(function (ид) { return все[ид]; });
    var пусто = $("[data-compare-empty]", страница);
    var коробка = $("[data-compare-table]", страница);
    var низ = $("[data-compare-foot]", страница);
    var подсказка = $("[data-compare-hint]", страница);

    if (!список.length) {
      пусто.hidden = false;
      коробка.hidden = true;
      низ.hidden = true;
      if (подсказка) подсказка.hidden = true;
      return;
    }
    пусто.hidden = true;
    коробка.hidden = false;
    низ.hidden = false;
    if (подсказка) подсказка.hidden = false;

    var товары = список.map(function (ид) { return все[ид]; });

    /* Строки берём в том порядке, в каком они у первого товара, и дописываем
       те, что есть только у остальных: у разных типов наборы не совпадают. */
    var строки = [];
    товары.forEach(function (т) {
      (т.характеристики || []).forEach(function (пара) {
        if (строки.indexOf(пара[0]) === -1) строки.push(пара[0]);
      });
    });

    function значение(товар, подпись) {
      var найдено = (товар.характеристики || []).filter(function (п) { return п[0] === подпись; })[0];
      return найдено ? найдено[1] : "—";
    }

    var только_различия = $("[data-compare-diff]", страница);
    var прячем = только_различия && только_различия.checked;

    var html = ['<table class="compare">', "<thead><tr><th></th>"];
    товары.forEach(function (т, номер) {
      html.push(
        '<th><div class="compare__head">' +
        '<button class="compare__drop" type="button" data-compare-drop="' + список[номер] + '" aria-label="Убрать из сравнения">×</button>' +
        '<a href="' + т.адрес + '"><img src="' + т.фото + '" alt="' + т.имя + '" width="480" height="480" loading="lazy" />' +
        '<span class="compare__name">' + т.имя + '</span></a>' +
        '<b class="compare__price">' + цена(т.цена) + "</b></div></th>");
    });
    html.push("</tr></thead><tbody>");

    строки.forEach(function (подпись) {
      var значения = товары.map(function (т) { return значение(т, подпись); });
      var одинаковые = значения.every(function (з) { return з === значения[0]; });
      if (прячем && одинаковые) return;
      html.push('<tr class="' + (одинаковые ? "" : "is-diff") + '"><th>' + подпись + "</th>");
      значения.forEach(function (з) { html.push("<td>" + з + "</td>"); });
      html.push("</tr>");
    });
    html.push("</tbody></table>");
    коробка.innerHTML = html.join("");
  }

  document.addEventListener("click", function (событие) {
    var крестик = событие.target.closest("[data-compare-drop]");
    if (крестик) {
      var список = читать();
      var где = список.indexOf(крестик.dataset.compareDrop);
      if (где > -1) список.splice(где, 1);
      писать(список);
      обновить_счётчики();
      обновить_кнопки();
      нарисовать_таблицу();
      return;
    }
    if (событие.target.closest("[data-compare-clear]")) {
      писать([]);
      обновить_счётчики();
      обновить_кнопки();
      нарисовать_таблицу();
    }
  });

  document.addEventListener("change", function (событие) {
    if (событие.target.matches("[data-compare-diff]")) нарисовать_таблицу();
  });

  обновить_счётчики();
  обновить_кнопки();
  нарисовать_таблицу();
})();

/* =========================================================
   УВЕДОМЛЕНИЕ О ФАЙЛАХ COOKIE
   ---------------------------------------------------------
   Показывается, пока посетитель не нажмёт «Принять» — согласие
   запоминается в localStorage (decidio-cookie) и больше баннер
   не появляется. «Не принимать» уводит на 404.html; отказ
   «навсегда» не запоминаем — при следующем заходе спросим снова,
   иначе сайтом нельзя было бы пользоваться.
   Разметка создаётся здесь, чтобы не дублировать её в HTML.
   ========================================================= */
(function () {
  "use strict";

  var KEY = "cookie-consent";

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return "accepted"; } // нет доступа к хранилищу — не надоедаем
  }
  function save(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  if (saved() === "accepted") return;                 // уже согласились — молчим
  if (document.body && document.body.hasAttribute("data-no-cookie-banner")) return;

  function build() {
    var wrap = document.createElement("div");
    wrap.className = "cookie";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-live", "polite");
    wrap.innerHTML =
      '<div class="cookie__text">' +
        '<strong class="cookie__title">Мы используем файлы cookie</strong>' +
        '<p>Сайт использует файлы cookie и сервисы веб-аналитики, чтобы работать корректно ' +
        'и понимать, как им пользуются. Продолжая пользоваться сайтом, вы соглашаетесь на это. ' +
        '<a href="privacy.html">Подробнее в политике конфиденциальности</a></p>' +
      '</div>' +
      '<div class="cookie__actions">' +
        '<button type="button" class="btn btn--primary cookie__ok">Принять</button>' +
        '<button type="button" class="btn btn--ghost cookie__no">Не принимать</button>' +
      '</div>';

    wrap.querySelector(".cookie__ok").addEventListener("click", function () {
      save("accepted");
      // только теперь запускаем веб-аналитику — до согласия её нет
      if (window.DecidioMetrika) window.DecidioMetrika.start();
      wrap.classList.remove("is-shown");
      setTimeout(function () { wrap.remove(); }, 400);
    });
    // Отказ — сайтом пользоваться нельзя, уводим на страницу 404,
    // где можно прочитать про cookie и передумать.
    wrap.querySelector(".cookie__no").addEventListener("click", function () {
      save("declined");
      location.href = "404.html";
    });

    if (window.I18N) window.I18N.apply(wrap);   // язык уже выбран — переводим сразу
    document.body.appendChild(wrap);
    // следующий кадр — чтобы сработала анимация появления
    requestAnimationFrame(function () { wrap.classList.add("is-shown"); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();

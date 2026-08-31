/* =========================================================
   ФОРМА ЗАЯВКИ — общая для всех каркасов.
   Закрывает пункты 5.2–5.7 тех-листа:
     • ловушка для ботов (скрытое поле website);
     • отсечка мгновенной отправки (elapsed);
     • проверка на клиенте, понятные сообщения;
     • кнопка блокируется, чтобы не было дублей;
     • метка источника из ?from= уходит вместе с заявкой.
   Разметка формы: см. блоки/форма.html
   ========================================================= */

(function () {
  "use strict";

  /* --- Метка источника: decidio.ru/?from=call — живёт до конца визита --- */
  try {
    var from = new URLSearchParams(location.search).get("from");
    if (from) sessionStorage.setItem("source_auto", from.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40));
  } catch (e) { /* приватный режим — просто без метки */ }

  var forms = document.querySelectorAll("form[data-form]");
  Array.prototype.forEach.call(forms, function (form) {
    var started = Date.now();
    var msg = form.querySelector(".form__msg");
    var btn = form.querySelector("[type=submit]");

    function say(text, ok) {
      if (!msg) return;
      msg.textContent = text;
      msg.className = "form__msg " + (ok ? "is-ok" : "is-err");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // --- проверка на клиенте ---
      var bad = null;
      Array.prototype.forEach.call(form.querySelectorAll("[required]"), function (el) {
        var empty = el.type === "checkbox" ? !el.checked : !el.value.trim();
        el.classList.toggle("is-invalid", empty);
        if (empty && !bad) bad = el;
      });
      var contact = form.querySelector("[name=contact]");
      if (contact && contact.value.trim() && contact.value.replace(/\D/g, "").length < 10 && contact.value.indexOf("@") === -1) {
        contact.classList.add("is-invalid");
        if (!bad) bad = contact;
      }
      if (bad) {
        say("Проверьте отмеченные поля — без них заявку не отправить.", false);
        bad.focus();
        return;
      }

      // --- служебные поля ---
      var data = new FormData(form);
      data.set("elapsed", String(Date.now() - started));
      try {
        var src = sessionStorage.getItem("source_auto");
        if (src) data.set("source_auto", src);
      } catch (e) {}
      data.set("page", location.pathname + location.search);

      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Отправляем…"; }
      say("", true);

      /* Демо-режим макета: demo.js ставит флаг, и заявка никуда не уходит.
         На готовом сайте demo.js не подключён, и работает обычная отправка. */
      if (window.МАКЕТ_ДЕМО) {
        setTimeout(function () {
          form.reset();
          started = Date.now();
          say("Заявка принята — перезвоним в течение рабочего дня.", true);
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || "Отправить"; }
        }, 600);
        return;
      }

      fetch(form.action || "send.php", { method: "POST", body: data })
        .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
        .then(function () {
          form.reset();
          started = Date.now();
          say("Заявка принята — перезвоним в течение рабочего дня.", true);
        })
        .catch(function () {
          say("Не получилось отправить. Позвоните нам или напишите в мессенджер — ответим сразу.", false);
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || "Отправить"; }
        });
    });

    // снимаем красную рамку, как только человек начал исправлять
    form.addEventListener("input", function (e) {
      if (e.target.classList) e.target.classList.remove("is-invalid");
    });
  });
})();

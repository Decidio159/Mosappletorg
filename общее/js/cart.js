/* =========================================================
   КОРЗИНА для витрины-магазина.
   Хранится в localStorage, поэтому переживает перезагрузку.
   Оформление заказа уходит той же формой, что и заявки:
   состав корзины кладётся в скрытое поле task.

   Разметка товара:
     <article class="card product" data-id="1" data-name="Корм"
              data-price="1290" data-img="…"> … <button data-add>В корзину</button>
   ========================================================= */

(function () {
  "use strict";
  var panel = document.querySelector(".cart-panel");
  if (!panel) return;

  var KEY = "cart";
  var body = panel.querySelector(".cart-panel__body");
  var totalEl = panel.querySelector("[data-cart-total]");
  var countEls = document.querySelectorAll("[data-cart-count]");
  var field = document.querySelector("[data-cart-field]");
  var overlay = document.querySelector(".cart-overlay");

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
  }
  var items = load();

  function money(n) { return n.toLocaleString("ru-RU") + " ₽"; }

  function render() {
    var total = 0, count = 0;
    body.innerHTML = "";

    if (!items.length) {
      body.innerHTML = '<p class="muted" style="padding: 2rem 0; text-align: center">Корзина пуста</p>';
    }

    items.forEach(function (it, i) {
      total += it.price * it.qty;
      count += it.qty;
      var line = document.createElement("div");
      line.className = "cart-line";
      line.innerHTML =
        '<img src="' + it.img + '" alt="" width="56" height="56" />' +
        '<div><b>' + it.name + '</b><span>' + money(it.price) + ' × ' + it.qty + '</span></div>' +
        '<div style="display:flex; gap:.3rem; align-items:center">' +
          '<button type="button" data-minus="' + i + '" aria-label="Убрать одну штуку">−</button>' +
          '<button type="button" data-plus="' + i + '" aria-label="Добавить ещё одну">+</button>' +
        '</div>';
      body.appendChild(line);
    });

    if (totalEl) totalEl.textContent = money(total);
    Array.prototype.forEach.call(countEls, function (el) {
      el.textContent = count;
      el.style.display = count ? "" : "none";
    });
    if (field) {
      field.value = items.length
        ? items.map(function (i) { return i.name + " × " + i.qty; }).join(", ") + ". Итого: " + money(total)
        : "";
    }
    save(items);
  }

  function add(data) {
    var found = items.filter(function (i) { return i.id === data.id; })[0];
    if (found) found.qty++;
    else items.push({ id: data.id, name: data.name, price: +data.price, img: data.img, qty: 1 });
    render();
    open();
  }

  function open()  { panel.classList.add("is-open");  if (overlay) overlay.classList.add("is-open"); }
  function close() { panel.classList.remove("is-open"); if (overlay) overlay.classList.remove("is-open"); }

  document.addEventListener("click", function (e) {
    var addBtn = e.target.closest("[data-add]");
    if (addBtn) {
      var card = addBtn.closest("[data-id]");
      if (card) add(card.dataset);
      return;
    }
    if (e.target.closest("[data-cart-open]")) { open(); return; }
    if (e.target.closest("[data-cart-close]") || e.target === overlay) { close(); return; }

    var minus = e.target.closest("[data-minus]");
    if (minus) {
      var mi = +minus.dataset.minus;
      if (--items[mi].qty <= 0) items.splice(mi, 1);
      render();
      return;
    }
    var plus = e.target.closest("[data-plus]");
    if (plus) { items[+plus.dataset.plus].qty++; render(); }
  });

  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  render();
})();

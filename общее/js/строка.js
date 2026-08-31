/* Бегущая строка на широком мониторе.

   Скелет (effects.js) дублирует содержимое ровно один раз, а анимация
   сдвигает ленту на половину её ширины. Если один набор уже экрана — а на
   мониторе 2000 px так и есть — справа появляется пустота. Здесь мы
   доклонируем содержимое, пока половина ленты не станет шире окна.
   Каждое удвоение сохраняет две одинаковые половины, поэтому шва не видно.

   Заодно задаём длительность по ширине: иначе на широком экране лента
   летела бы вдвое быстрее, чем на узком. */
(function () {
  "use strict";

  var СКОРОСТЬ = 55;       // пикселей в секунду
  var ПРЕДЕЛ = 6;          // страховка от бесконечного цикла

  function настроить(лента) {
    var трек = лента.querySelector(".marquee__track");
    if (!трек || !трек.children.length) return;

    if (!трек.dataset.основа) трек.dataset.основа = трек.innerHTML;

    трек.style.animation = "none";
    трек.innerHTML = трек.dataset.основа;
    var шаг = 0;
    while (трек.scrollWidth / 2 < window.innerWidth && шаг < ПРЕДЕЛ) {
      трек.innerHTML += трек.innerHTML;
      шаг++;
    }
    трек.style.animation = "";
    трек.style.animationDuration = Math.round(трек.scrollWidth / 2 / СКОРОСТЬ) + "s";
  }

  var ленты = [].slice.call(document.querySelectorAll(".marquee"));
  if (!ленты.length) return;

  /* effects.js уже удвоил содержимое к этому моменту — берём его за основу. */
  ленты.forEach(настроить);

  var ждём;
  window.addEventListener("resize", function () {
    clearTimeout(ждём);
    ждём = setTimeout(function () { ленты.forEach(настроить); }, 200);
  });
})();

/* Прелоадер: снимает экран загрузки, когда страница готова.
   Ставится в <head> с defer или первым скриптом перед </body>.
   Класс is-loaded вешается на <html>, дальше всё делает CSS. */
(function () {
  "use strict";
  var МИНИМУМ = 700;           // мс: меньше — экран мигает и раздражает
  var СТРАХОВКА = 2500;        // мс: если что-то не догрузилось, не держим гостя
  var старт = Date.now();
  var снят = false;

  function снять() {
    if (снят) return;
    снят = true;
    document.documentElement.classList.add("is-loaded");
  }

  function поГотовности() {
    var ждать = Math.max(0, МИНИМУМ - (Date.now() - старт));
    setTimeout(снять, ждать);
  }

  if (document.readyState === "complete") поГотовности();
  else window.addEventListener("load", поГотовности);

  setTimeout(снять, СТРАХОВКА);
})();

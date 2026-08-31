/* =========================================================
   ВОЛНОВАЯ ПЛАСТИНА — анимированная 3D-сетка точек внизу
   сайта. Псевдо-3D на Canvas 2D (без внешних библиотек):
   точки на плоскости уходят к горизонту, колышутся волнами,
   по поверхности бегут блики («переливание»). Оттенки серого.

   • rAF работает только когда band виден и вкладка активна.
   • prefers-reduced-motion — один статичный кадр.
   • Параметры вынесены в CONFIG для быстрой подстройки.
   ========================================================= */

(function () {
  const canvas = document.getElementById("waveCanvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  const CONFIG = {
    bg: "#0a0a0b",        // фон band-а — перекрывается переменной --wave-bg темы
    tint: [255, 255, 255],// оттенок точек — переменная --wave-tint, например "125 185 245"
    cols: [60, 170],      // [min, max] точек по ширине
    rows: [34, 84],       // [min, max] рядов вглубь
    spanX: 2.6,           // ширина плоскости в долях канваса (уходит за края — «бесконечная»)
    horizon: 0.30,        // высота горизонта (доля высоты)
    ground: 0.58,         // насколько плоскость опущена у ближнего края
    depth: 2.6,           // сила перспективы (компрессия вдаль)
    amp: 0.16,            // визуальная амплитуда волн (доля высоты)
    dot: 1.7,             // базовый радиус точки (px, до перспективы)
    speed: 0.55,          // скорость волн
    fog: 0.85             // затухание вглубь (0..1)
  };

  /* Тема: цвета берём из CSS-переменных, чтобы волна перекрашивалась
     вместе с нишей и не приходилось лезть в скрипт. */
  (function readTheme() {
    const cs = getComputedStyle(canvas);
    const bg = cs.getPropertyValue("--wave-bg").trim();
    if (bg) CONFIG.bg = bg;
    const tint = cs.getPropertyValue("--wave-tint").trim();
    if (tint) {
      const p = tint.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
      if (p.length === 3) CONFIG.tint = p;
    }
  })();

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, COLS = 0, ROWS = 0;
  let running = false, onscreen = true, rafId = 0, startT = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    COLS = clamp(Math.round(W / 8), CONFIG.cols[0], CONFIG.cols[1]);
    ROWS = clamp(Math.round(H / 7),  CONFIG.rows[0], CONFIG.rows[1]);
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function draw(t) {
    const cx = W / 2;
    const horizonY = H * CONFIG.horizon;
    const groundOff = H * CONFIG.ground;
    const spanX = W * CONFIG.spanX;
    const heightPx = H * CONFIG.amp;
    const baseR = Math.max(1, CONFIG.dot * (W / 900));

    ctx.fillStyle = CONFIG.bg;
    ctx.fillRect(0, 0, W, H);

    // Рисуем сзади вперёд (дальние ряды первыми)
    for (let j = ROWS; j >= 0; j--) {
      const z = j / ROWS;                          // 0 ближний → 1 дальний
      const persp = 1 / (1 + z * CONFIG.depth);    // дальше → мельче
      const baseY = horizonY + groundOff * persp;  // перспективная компрессия
      const fog = 1 - z * CONFIG.fog;              // затухание вглубь
      const rowR = baseR * persp;
      if (rowR < 0.35) continue;

      for (let i = 0; i <= COLS; i++) {
        const wx = i / COLS - 0.5;                 // -0.5..0.5

        // Высота волны (сумма синусов — органичное колыхание)
        let h = Math.sin(wx * 6 + t * 0.9 * CONFIG.speed);
        h += Math.sin(z * 7 - t * 0.7 * CONFIG.speed) * 0.8;
        h += Math.sin((wx + z) * 5 + t * 1.1 * CONFIG.speed) * 0.5;
        h *= 0.4;                                   // ≈ [-1..1]

        const sx = cx + wx * spanX * persp;
        const sy = baseY - h * heightPx * persp;

        // Яркость: гребни светлее + бегущий блик (переливание) + туман
        const nh = h * 0.5 + 0.5;                   // 0..1
        const spec = Math.pow(Math.max(0, Math.sin(wx * 4 - z * 3 + t * 1.6 * CONFIG.speed)), 3);
        let g = (40 + nh * 150 + spec * 85) * fog;
        g = clamp(g, 0, 255);

        const T = CONFIG.tint;
        ctx.fillStyle = "rgb(" + ((g * T[0] / 255) | 0) + "," + ((g * T[1] / 255) | 0) + "," + ((g * T[2] / 255) | 0) + ")";
        ctx.beginPath();
        ctx.arc(sx, sy, rowR, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  function frame(now) {
    if (!running) return;
    draw((now - startT) / 1000);
    rafId = requestAnimationFrame(frame);
  }

  function play() {
    if (running || reduce || !onscreen || document.hidden) return;
    running = true;
    startT = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  // Пересчёт размеров
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (!running) draw(0); }, 150); }, { passive: true });

  // Пауза вне экрана
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => {
      onscreen = es[0].isIntersecting;
      onscreen ? play() : stop();
    }, { threshold: 0.01 }).observe(canvas);
  }
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : play());

  // Старт
  resize();
  if (reduce) { draw(0.6); }   // статичный «застывший» кадр
  else { draw(0); play(); }
})();

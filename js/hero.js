/* ==========================================================================
   NAHLIO — Vollbild-Hero: Bildwechsel mit Schleifenlinie
   - 6 Bilder (Startseite + je Leistung), Wechsel alle DUR ms.
   - Die Linie unten ist die Uhr: Sie zeichnet sich in DUR von links nach rechts.
     Ist sie am rechten Rand angekommen, wechselt das Bild; die Linie gleitet mit
     dem Bild um STEP nach links, wischt sich dabei von links weg und beginnt neu.
   - Die Linie ist periodisch (PERIOD, tools/line.py): Verschiebungen um PERIOD
     sind unsichtbar, so laeuft sie endlos.
   - Beim Scrollen folgen Linie und Bild dem Blick (leichtes Nachziehen).
   - Anhalten: Knopf, ausgeblendeter Tab, Hero ausserhalb des Fensters.
   - Weniger Bewegung: kein automatischer Wechsel, Linie fertig gezeichnet.
   ========================================================================== */
(function () {
  "use strict";

  var hx = document.querySelector("[data-hx]");
  if (!hx) return;

  var slides = [].slice.call(hx.querySelectorAll("[data-hx-slide]"));
  var tabs = [].slice.call(hx.querySelectorAll("[data-hx-tab]"));
  var pauseBtn = hx.querySelector("[data-hx-pause]");
  var media = hx.querySelector("[data-hx-media]");
  var copy = hx.querySelector("[data-hx-copy]");
  var lineBox = hx.querySelector("[data-hx-line]");
  var svg = hx.querySelector(".hx__svg");
  var glide = hx.querySelector("[data-hx-glide]");
  var draw = hx.querySelector("[data-hx-draw]");
  var reduceQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  var DUR = 7000;          /* ms je Bild (Wunsch: 5-10 s) */
  var SWITCH = 1100;       /* ms Bildwechsel, gleich --hx-switch */
  var PERIOD = 1920;       /* Periode der Linie in Pfad-Einheiten */
  var STEP = PERIOD / slides.length;
  var DRIFT = 0.012;       /* Pfad-Einheiten je ms: die Linie treibt langsam mit dem Bild */
  var H = 280;             /* Hoehe der viewBox */
  var PAD = 70;            /* Vorlauf links/rechts, damit Schleifen am Rand ganz erscheinen */

  /* --- Pfad abtasten: Laenge bis jedem Punkt und die bis dahin groesste x-Position ------------- */
  /* Schleifen laufen kurz rueckwaerts; "bis x gezeichnet" heisst deshalb: bis die Linie x zum ersten Mal erreicht. */
  var envX = [], cumL = [];
  (function sample() {
    var n = (draw.getAttribute("d").match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    var px = n[0], py = n[1], len = 0, mx = px;
    envX.push(mx); cumL.push(0);
    for (var i = 2; i + 5 < n.length; i += 6) {
      var x0 = px, y0 = py;
      for (var k = 1; k <= 10; k++) {
        var t = k / 10, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        var qx = a * x0 + b * n[i] + c * n[i + 2] + d * n[i + 4];
        var qy = a * y0 + b * n[i + 1] + c * n[i + 3] + d * n[i + 5];
        len += Math.sqrt((qx - px) * (qx - px) + (qy - py) * (qy - py));
        if (qx > mx) mx = qx;
        envX.push(mx); cumL.push(len);
        px = qx; py = qy;
      }
    }
    var real = draw.getTotalLength ? draw.getTotalLength() : len;
    var f = len ? real / len : 1;
    for (var j = 0; j < cumL.length; j++) cumL[j] *= f;
  })();
  var TOTAL = cumL[cumL.length - 1];
  function lenAtX(x) {
    if (x <= envX[0]) return 0;
    var hi = envX.length - 1;
    if (x >= envX[hi]) return TOTAL;
    var lo = 0;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (envX[m] < x) lo = m; else hi = m; }
    var span = envX[hi] - envX[lo];
    return cumL[lo] + (cumL[hi] - cumL[lo]) * (span ? (x - envX[lo]) / span : 0);
  }

  /* --- Zeichenflaeche: viewBox passend zur Groesse, nie verzerrt ------------------------------- */
  var V = 1920;
  function fit() {
    var w = svg.clientWidth, h = svg.clientHeight;
    if (!w || !h) return;
    V = Math.min(2400, w * H / h);
    svg.setAttribute("viewBox", "0 0 " + V.toFixed(1) + " " + H);
    svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
  }

  /* --- Zustand ------------------------------------------------------------------------------- */
  var idx = 0;
  var T = 0;                         /* Verschiebung der Linie (Pfad-Einheiten) */
  var phase = "draw";                /* draw | switch */
  var elapsed = 0;                   /* ms im aktuellen Abschnitt (pausierbar) */
  var from = 0, to = 0;              /* T am Anfang/Ende des Wechsels */
  var userPaused = false, hidden = false, offscreen = false;
  var last = 0, rafId = 0;
  var leaveTimers = [];

  function easeMove(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function setSpan(a, b) {           /* a, b: relativ zum linken Rand des Fensters */
    var la = lenAtX(T + a), lb = lenAtX(T + b), vis = Math.max(0, lb - la);
    draw.style.strokeDasharray = vis.toFixed(1) + " " + (TOTAL + 10).toFixed(0);
    draw.style.strokeDashoffset = (-la).toFixed(1);
    draw.style.visibility = vis < 0.5 ? "hidden" : "";   /* sonst setzt die runde Kappe einen Punkt */
    glide.setAttribute("transform", "translate(" + (-T).toFixed(1) + " 0)");
  }

  function render() {
    if (phase === "draw") {
      var p = Math.min(1, elapsed / DUR);
      setSpan(-PAD, -PAD + (V + 2 * PAD) * p);
    } else {
      var u = Math.min(1, elapsed / SWITCH);
      T = from + (to - from) * easeMove(u);
      setSpan(-PAD + (V + 2 * PAD) * easeOut(u), V + PAD);   /* wischt sich von links weg */
    }
  }

  function wrap() { if (T >= PERIOD) { T -= PERIOD; from -= PERIOD; to -= PERIOD; } }

  function tick(now) {
    rafId = 0;
    var dt = last ? Math.min(64, now - last) : 16;
    last = now;
    if (running()) {
      elapsed += dt;
      if (phase === "draw") {
        T += DRIFT * dt;
        wrap();
        if (elapsed >= DUR) go(idx + 1, true);
      } else if (elapsed >= SWITCH) {
        T = to; wrap(); phase = "draw"; elapsed = 0;
      }
      render();
      loop();
    } else {
      last = 0;
    }
  }
  function running() { return !userPaused && !hidden && !offscreen && !reduceQ.matches; }
  function loop() { if (!rafId && running()) rafId = window.requestAnimationFrame(tick); }

  /* --- Bild wechseln ---------------------------------------------------------------------------- */
  function show(n) {
    var prev = slides[idx], next = slides[n];
    if (prev === next) return;
    clearTimeout(leaveTimers[n]);
    next.classList.remove("is-leaving");
    var img = next.querySelector("img");
    if (img) { img.style.animation = "none"; void img.offsetWidth; img.style.animation = ""; }  /* Zoom neu starten */
    if (img && img.loading === "lazy") img.loading = "eager";
    prev.classList.remove("is-active");
    prev.classList.add("is-leaving");
    var k = idx;
    leaveTimers[k] = setTimeout(function () { slides[k].classList.remove("is-leaving"); }, SWITCH + 60);
    next.classList.add("is-active");
    tabs.forEach(function (t, i) { if (i === n) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current"); });
    idx = n;
    /* naechstes Bild vorab laden */
    var after = slides[(n + 1) % slides.length].querySelector("img");
    if (after && after.loading === "lazy") after.loading = "eager";
  }
  function go(n, auto) {
    n = (n + slides.length) % slides.length;
    if (n === idx && auto !== true) return;
    show(n);
    if (reduceQ.matches) { phase = "draw"; elapsed = DUR; render(); return; }
    phase = "switch"; elapsed = 0; from = T; to = T + STEP;
    render();
    loop();
  }

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { go(i); });
  });
  /* Pfeiltasten in der Bildleiste */
  hx.querySelector(".hx__tabs").addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    var n = (idx + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    go(n); tabs[n].focus();
  });

  function setPaused(p) {
    userPaused = p;
    pauseBtn.setAttribute("aria-pressed", p ? "true" : "false");
    pauseBtn.setAttribute("aria-label", p ? "Bildwechsel fortsetzen" : "Bildwechsel anhalten");
    sync();
  }
  pauseBtn.addEventListener("click", function () { setPaused(!userPaused); });

  function sync() {
    hx.classList.toggle("is-paused", !running());
    loop();
  }
  document.addEventListener("visibilitychange", function () { hidden = document.hidden; sync(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { offscreen = !es[0].isIntersecting; sync(); }, { threshold: 0.05 }).observe(hx);
  }

  /* --- Beim Scrollen: Linie und Bild ziehen mit ---------------------------------------------- */
  var ticking = false;
  function follow() {
    ticking = false;
    if (reduceQ.matches) return;
    var h = hx.offsetHeight || 1, s = Math.max(0, Math.min(1, window.pageYOffset / h));
    media.style.transform = s ? "translate3d(0," + (s * h * 0.28).toFixed(1) + "px,0) scale(" + (1 + s * 0.05).toFixed(4) + ")" : "";
    lineBox.style.transform = s ? "translate3d(0," + (s * h * 0.42).toFixed(1) + "px,0)" : "";
    copy.style.transform = s ? "translate3d(0," + (s * h * -0.08).toFixed(1) + "px,0)" : "";
    copy.style.opacity = s ? String(Math.max(0, 1 - s * 1.4)) : "";
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(follow); }
  }, { passive: true });

  /* --- Start ---------------------------------------------------------------------------------- */
  document.documentElement.classList.add("hx-ready");
  fit();
  window.addEventListener("resize", function () { fit(); render(); });
  if (reduceQ.matches) { elapsed = DUR; render(); setPaused(true); }
  else { render(); loop(); }
  reduceQ.addEventListener && reduceQ.addEventListener("change", function () { render(); sync(); });
  follow();
})();

/* Leistungen: Hintergrundbild folgt dem aktiven Reiter (aria-selected aus app.js) */
(function () {
  "use strict";
  var bg = document.querySelector("[data-zoom-bg]");
  var strip = document.querySelector("[data-sc-tabs]");
  if (!bg || !strip) return;
  var imgs = [].slice.call(bg.querySelectorAll("img"));
  function sync() {
    var t = strip.querySelector('[aria-selected="true"]');
    var key = t && t.getAttribute("data-key");
    if (!key) return;
    imgs.forEach(function (im) { im.classList.toggle("is-active", im.getAttribute("data-key") === key); });
  }
  new MutationObserver(sync).observe(strip, { subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
  sync();
})();

/* Unterseiten: Schleifenlinie im Kopf zeichnet sich an und waechst mit dem Lesefortschritt */
(function () {
  "use strict";
  var head = document.querySelector("[data-phead]");
  if (!head) return;
  var svg = head.querySelector(".phead__svg"), draw = head.querySelector("[data-phead-draw]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var n = (draw.getAttribute("d").match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  var envX = [n[0]], cumL = [0], px = n[0], py = n[1], len = 0, mx = n[0];
  for (var i = 2; i + 5 < n.length; i += 6) {
    var x0 = px, y0 = py;
    for (var k = 1; k <= 10; k++) {
      var t = k / 10, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      var qx = a * x0 + b * n[i] + c * n[i + 2] + d * n[i + 4], qy = a * y0 + b * n[i + 1] + c * n[i + 3] + d * n[i + 5];
      len += Math.hypot(qx - px, qy - py); if (qx > mx) mx = qx;
      envX.push(mx); cumL.push(len); px = qx; py = qy;
    }
  }
  var f = draw.getTotalLength() / len; cumL = cumL.map(function (v) { return v * f; });
  var TOTAL = cumL[cumL.length - 1];
  function lenAtX(x) {
    if (x <= envX[0]) return 0;
    var lo = 0, hi = envX.length - 1;
    if (x >= envX[hi]) return TOTAL;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (envX[m] < x) lo = m; else hi = m; }
    return cumL[lo] + (cumL[hi] - cumL[lo]) * ((x - envX[lo]) / ((envX[hi] - envX[lo]) || 1));
  }
  var V = 1920;
  function fit() {
    var w = svg.clientWidth, h = svg.clientHeight;
    if (w && h) { V = Math.min(2400, w * 280 / h); svg.setAttribute("viewBox", "0 0 " + V.toFixed(1) + " 280"); }
  }
  var INTRO = 0.32, t0 = performance.now(), introP = reduce ? 1 : 0, shown = -1;
  function readP() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, window.pageYOffset / max) : 1;
  }
  function paint() {
    var p = reduce ? 1 : INTRO * introP + (1 - INTRO) * readP();
    var x = -70 + (V + 140) * p, L = lenAtX(x);
    if (Math.abs(L - shown) < 0.5) return;
    shown = L;
    draw.style.strokeDasharray = L.toFixed(1) + " " + (TOTAL + 10).toFixed(0);
    draw.style.visibility = L < 0.5 ? "hidden" : "";
  }
  function intro(now) {
    var u = Math.min(1, (now - t0) / 1600);
    introP = 1 - Math.pow(1 - u, 3);
    paint();
    if (u < 1) requestAnimationFrame(intro);
  }
  fit();
  window.addEventListener("resize", function () { fit(); shown = -1; paint(); });
  window.addEventListener("scroll", function () { requestAnimationFrame(paint); }, { passive: true });
  if (reduce) paint(); else requestAnimationFrame(intro);
})();

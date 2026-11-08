/* NAHLIO — erzeugt von build.py. Quellen liegen in static/js/. */

/* ==== 10-util.js ==== */
/* ==========================================================================
   NAHLIO — gemeinsame Helfer
   ========================================================================== */
var NAHLIO = (function () {
  "use strict";

  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var deskQuery = window.matchMedia("(min-width: 64em)");
  /* Ab Tablet laeuft die Scroll-Choreografie, ab Desktop in voller Staerke. */
  var storyQuery = window.matchMedia("(min-width: 48em)");

  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
  function clamp01(v) { return clamp(v, 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* weiche Beschleunigung ohne Ueberschwingen */
  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* rAF-gedrosselter Scroll-/Resize-Handler */
  function raf(fn) {
    var pending = false;
    return function () {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(function () {
        pending = false;
        fn();
      });
    };
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      window.clearTimeout(t);
      t = window.setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function onMedia(mq, fn) {
    if (mq.addEventListener) mq.addEventListener("change", fn);
    else if (mq.addListener) mq.addListener(fn);
  }

  /* Wird ausgeloest, wenn sich Viewport, Schrift- oder Bildladung so aendern,
     dass Positionen neu berechnet werden muessen. */
  var listeners = [];
  function onRecalc(fn) { listeners.push(fn); }
  function recalc() { for (var i = 0; i < listeners.length; i++) listeners[i](); }

  var fireRecalc = debounce(recalc, 120);
  window.addEventListener("resize", fireRecalc);
  window.addEventListener("orientationchange", fireRecalc);
  window.addEventListener("load", recalc);

  /* Zusaetzlich beobachten: das resize-Event allein greift nicht in jedem
     Fall (Zoom, ein- und ausblendende Browserleisten, Geraete-Emulation). */
  if (window.ResizeObserver) {
    new ResizeObserver(fireRecalc).observe(document.documentElement);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(recalc).catch(function () {});
  }

  onMedia(reduceQuery, function () {
    document.documentElement.classList.toggle("motion-ok", !reduceQuery.matches);
    recalc();
  });
  onMedia(deskQuery, recalc);
  onMedia(storyQuery, recalc);

  return {
    clamp: clamp,
    clamp01: clamp01,
    lerp: lerp,
    easeInOut: easeInOut,
    easeOut: easeOut,
    raf: raf,
    debounce: debounce,
    onRecalc: onRecalc,
    recalc: recalc,
    onMedia: onMedia,
    isReduced: function () { return reduceQuery.matches; },
    isDesktop: function () { return deskQuery.matches; },
    isStoryViewport: function () { return storyQuery.matches; }
  };
})();

/* ==== 20-nav.js ==== */
/* ==========================================================================
   NAHLIO — Navigation
   1. Helligkeitszustand folgt der Sektion, die unter der Unterkante der Leiste beginnt.
   2. Aktiver Punkt folgt dem sichtbaren Abschnitt.
   3. Mobiles Panel mit Escape, Fokusfuehrung und Fokusring.
   ========================================================================== */
(function () {
  "use strict";

  var nav = document.querySelector("[data-nav]");
  if (!nav) return;

  var themed = Array.prototype.slice.call(document.querySelectorAll("[data-nav-theme]"));
  var links = Array.prototype.slice.call(nav.querySelectorAll("[data-nav-link]"));
  var tops = [];

  var lastHeight = 0;

  function measure() {
    var y = window.pageYOffset;
    lastHeight = document.documentElement.scrollHeight;
    tops = themed.map(function (el) {
      return { el: el, top: el.getBoundingClientRect().top + y };
    });
    apply();
  }

  /* --- Helligkeitszustand -------------------------------------------------- */
  function apply() {
    /* Aendert sich die Dokumenthoehe (Bild nachgeladen, Kapitel umgebaut),
       sind die gespeicherten Sektionsgrenzen veraltet. */
    if (document.documentElement.scrollHeight !== lastHeight) { measure(); return; }
    var navH = nav.offsetHeight || 64;
    /* Massgeblich ist die Flaeche, die unmittelbar unter der Leiste beginnt (Unterkante der
       Leiste), nicht die Mittellinie: So ist die Leiste dunkel, sobald ein dunkler Abschnitt
       unter ihr liegt — auch wenn ein Anker ihn knapp unter die Oberkante des Fensters setzt. */
    var probe = window.pageYOffset + navH - 1;
    var state = "light";
    for (var i = 0; i < tops.length; i++) {
      if (tops[i].top <= probe) state = tops[i].el.getAttribute("data-nav-theme") || "light";
    }
    nav.setAttribute("data-state", state);
    nav.classList.toggle("is-stuck", window.pageYOffset > 12);
  }

  var onScroll = NAHLIO.raf(apply);
  window.addEventListener("scroll", onScroll, { passive: true });
  /* Der Endzustand stimmt immer: nach dem letzten Scroll-Ereignis (auch bei Sprung zu einem
     Anker, direkt geladenem #kontakt oder Wechsel des Hash) wird die Helligkeit noch einmal aus
     der tatsaechlichen Lage der Abschnitte berechnet — unabhaengig vom Bildtakt. */
  var settleTimer = 0;
  function settle() { window.clearTimeout(settleTimer); settleTimer = window.setTimeout(apply, 120); }
  window.addEventListener("scroll", settle, { passive: true });
  window.addEventListener("scrollend", apply);
  window.addEventListener("hashchange", function () { apply(); settle(); });
  window.addEventListener("load", settle);
  /* Abschnitte, die ihre Helligkeit selbst wechseln (Uebergang zu den
     Projekten), melden das hier. */
  window.addEventListener("nahlio:navtheme", onScroll);
  NAHLIO.onRecalc(measure);
  measure();

  /* --- Aktiver Navigationspunkt --------------------------------------------
     Ein Abschnitt kann eine eigene Messflaeche mitbringen
     ([data-nav-watch="id"]). Das nutzen die Projekte: Waehrend des Uebergangs
     aus dem Storytelling rastet der Abschnitt ein und laege sonst zu frueh
     in der Mitte des Fensters. */
  var targets = links
    .map(function (a) {
      var id = (a.getAttribute("href") || "").replace(/^#/, "");
      if (!id) return null;
      var el = document.querySelector('[data-nav-watch="' + id + '"]') || document.getElementById(id);
      return el ? { id: id, el: el } : null;
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && targets.length) {
    var visible = [];

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          for (var k = 0; k < targets.length; k++) {
            if (targets[k].el === e.target) visible[k] = e.isIntersecting;
          }
        });
        var currentId = null;
        for (var i = 0; i < targets.length; i++) {
          if (visible[i]) currentId = targets[i].id;
        }
        setCurrent(currentId);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    targets.forEach(function (t) { io.observe(t.el); });
  }

  function setCurrent(id) {
    var all = links.concat(
      Array.prototype.slice.call(document.querySelectorAll("[data-nav-panel-link]"))
    );
    all.forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (id && href === "#" + id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  /* --- Mobiles Panel -------------------------------------------------------- */
  var toggle = nav.querySelector("[data-nav-toggle]");
  var panel = document.getElementById("nav-panel");
  if (!toggle || !panel) return;

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", toggle.getAttribute(open ? "data-label-close" : "data-label-open") || "");
    panel.hidden = !open;
    document.body.classList.toggle("nav-open", open);
    if (open) {
      var first = panel.querySelector("a, button");
      if (first) first.focus();
    }
  }

  toggle.addEventListener("click", function () {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  panel.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || panel.hidden) return;
    setOpen(false);
    toggle.focus();
  });

  /* Fokus bleibt im geoeffneten Panel. */
  panel.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var f = Array.prototype.slice.call(panel.querySelectorAll("a[href], button:not([disabled])"));
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  NAHLIO.onMedia(window.matchMedia("(min-width: 64em)"), function (mq) {
    if (mq.matches && !panel.hidden) setOpen(false);
  });
})();

/* ==== 22-fit.js ==== */
/* ==========================================================================
   NAHLIO — Abschnitte genau auf einen Bildschirm bringen
   Jede Kiste mit data-fit wird gemessen. Ist sie hoeher als der freie Platz
   (Fensterhoehe minus Navigation minus Polster des Abschnitts), wird sie
   gleichmaessig verkleinert (CSS zoom, nie unter MIN — kleiner wuerde die Schrift
   unlesbar; dann reicht der Abschnitt ueber den Bildschirm hinaus und die Seite
   scrollt normal). Mit data-fit-grow="<Faktor>" darf eine Kiste auch WACHSEN, bis
   sie den Bildschirm fuellt (bis zu diesem Faktor): So bleiben auf grossen
   Fenstern keine leeren Flaechen, die Schrift wird entsprechend groesser.
   Nur ab 64em; darunter scrollt die Seite ganz normal.
   data-fit-extra="<Selektor>" rechnet die Hoehe des groessten solchen Elements
   dazu (FAQ: die laengste Antwort, damit sich beim Aufklappen nichts mehr
   verschiebt).
   Hinweis zu CSS zoom: getBoundingClientRect() liefert die sichtbare (gezoomte)
   Groesse, offsetHeight/scrollHeight die Groesse im eigenen Koordinatensystem;
   deshalb wird die Zusatzhoehe mit dem Faktor multipliziert.
   ========================================================================== */
(function () {
  "use strict";

  var boxes = Array.prototype.slice.call(document.querySelectorAll("[data-fit]"));
  if (!boxes.length) return;

  var supportsZoom = window.CSS && CSS.supports && CSS.supports("zoom", "1");
  var desk = window.matchMedia("(min-width: 64em)");
  var MIN = 0.72;

  function navHeight() {
    var n = document.querySelector("[data-nav]");
    return n ? n.offsetHeight : 88;
  }

  function visualHeight(box, sel, f) {
    var extra = 0;
    if (sel) {
      Array.prototype.forEach.call(box.querySelectorAll(sel), function (el) {
        extra = Math.max(extra, el.scrollHeight);
      });
    }
    return box.getBoundingClientRect().height + extra * f;
  }

  function run() {
    var base = window.innerHeight - navHeight();
    boxes.forEach(function (box) {
      box.style.zoom = "";
      if (!supportsZoom || !desk.matches) return;
      /* freier Platz = Fenster ohne Navigation, ohne Polster des Abschnitts, mit etwas Rand */
      var sec = box.closest(".fit-sec");
      var pad = 34;
      if (sec) {
        var cs = window.getComputedStyle(sec);
        pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + 6;
      }
      var avail = base - pad;
      var sel = box.getAttribute("data-fit-extra");
      var maxUp = parseFloat(box.getAttribute("data-fit-grow")) || 1;
      var natural = visualHeight(box, sel, 1);
      if (!natural) return;

      function fits(f) {
        box.style.zoom = f.toFixed(3);
        return visualHeight(box, sel, f) <= avail;
      }
      /* groesster Faktor in [lo, hi], bei dem die Kiste noch passt */
      function best(lo, hi) {
        if (fits(hi)) return hi;
        for (var i = 0; i < 9; i++) {
          var mid = (lo + hi) / 2;
          if (fits(mid)) lo = mid; else hi = mid;
        }
        return lo;
      }

      var f = 1;
      if (natural > avail) f = best(MIN, 1);                      /* zu hoch: verkleinern */
      else if (maxUp > 1) f = best(1, maxUp);                     /* Platz uebrig: wachsen */
      if (Math.abs(f - 1) < 0.004) box.style.zoom = "";
      else box.style.zoom = f.toFixed(3);
    });
  }

  NAHLIO.onRecalc(run);
  NAHLIO.onMedia(desk, run);
  run();
})();

/* ==== 25-line.js ==== */
/* ==========================================================================
   NAHLIO — durchgehende Linie im Hintergrund
   Ein einziger, langer Pfad aus weiten Schwuengen und grossen Schleifen, in
   echten Pixeln ueber die ganze Hoehe von <main> aufgebaut; er kreuzt sich
   selbst und laeuft zwischendurch wieder nach oben. Gezeichnet wird bis zu
   der Laenge, die der Hoehe knapp unter der Fenstermitte entspricht — und
   zwar mit Nachlauf: Die Linie schiesst zuerst schnell los und bremst zum
   Ende hin ab (Zeitkonstante TAU), vorwaerts wie rueckwaerts. Bei Reduced
   Motion steht sie fertig gezeichnet da.
   Auftakt beim Oeffnen der Seite: Ohne zu scrollen zieht sich die Linie von
   links ausserhalb des Bildes durch alle fuenf Hero-Bilder und laeuft unten
   aus dem ersten Bildschirm hinaus (zeitgesteuert, INTRO_DUR Sekunden, weich
   anfahrend und auslaufend). Erst danach folgt sie wie beschrieben dem
   Scrollen. Auch beim Laden mitten auf der Seite startet sie bei Null und
   laeuft zum Ziel, statt ganz aufzutauchen.
   ========================================================================== */
(function () {
  "use strict";

  var layer = document.querySelector("[data-pageline]");
  if (!layer) return;
  var main = layer.parentElement;
  var svg = layer.querySelector("svg");
  var path = layer.querySelector("[data-line-main]");

  var LUT = 800;
  var TAU = 0.34;                 /* Sekunden: je kleiner, desto schneller zieht die Linie nach */
  var LEAD = 0.80;                /* Anteil der Fensterhoehe, bis zu dem die Linie vorauseilt */
  var INTRO_DELAY = 0.55;         /* Sekunden bis die Linie loszieht (die ersten Bilder steigen dann schon auf) */
  var INTRO_DUR = 3.4;            /* Sekunden, die sie fuer die ganze Bilderreihe und den Weg nach unten braucht */

  /* Freihaltezonen: Elemente mit data-line-clear (Fragen, Uebergangstext, Bild) bekommen
     eine weich auslaufende Aussparung in der Linie. Sie behaelt ihren Weg, taucht aber
     vor dem Text ab, statt ihn zu kreuzen. */
  var NS = "http://www.w3.org/2000/svg";
  var maskBase = null, maskG = null, maskEl = null;
  function svgEl(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  function buildMask(W, Hh) {
    var clears = Array.prototype.slice.call(document.querySelectorAll("[data-line-clear]"));
    if (!clears.length) { path.removeAttribute("mask"); return; }
    if (!maskEl) {
      var defs = svgEl("defs", {});
      var filt = svgEl("filter", { id: "pageline-soft", x: "-20%", y: "-20%", width: "140%", height: "140%" });
      filt.appendChild(svgEl("feGaussianBlur", { stdDeviation: "10" }));
      maskEl = svgEl("mask", { id: "pageline-mask", maskUnits: "userSpaceOnUse", x: "0", y: "0" });
      maskBase = svgEl("rect", { x: "0", y: "0", fill: "#fff" });
      maskG = svgEl("g", { fill: "#000", filter: "url(#pageline-soft)" });
      maskEl.appendChild(maskBase);
      maskEl.appendChild(maskG);
      defs.appendChild(filt);
      defs.appendChild(maskEl);
      svg.insertBefore(defs, svg.firstChild);
    }
    maskEl.setAttribute("width", String(W)); maskEl.setAttribute("height", String(Hh));
    maskBase.setAttribute("width", String(W)); maskBase.setAttribute("height", String(Hh));
    while (maskG.firstChild) maskG.removeChild(maskG.firstChild);
    var sr = svg.getBoundingClientRect();
    var pad = 26;                       /* deckt auch die 14 px der Einblender-Verschiebung ab */
    clears.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      maskG.appendChild(svgEl("rect", {
        x: (r.left - sr.left - pad).toFixed(1), y: (r.top - sr.top - pad).toFixed(1),
        width: (r.width + 2 * pad).toFixed(1), height: (r.height + 2 * pad).toFixed(1), rx: "18"
      }));
    });
    path.setAttribute("mask", "url(#pageline-mask)");
  }

  /* Hero: Elemente mit data-line-via (die fuenf Leistungsbilder) sind Stationen der Linie. Sie
     laeuft von links aussen durch ihre Mitten (weiche Kurve) und verlaesst die Reihe nach unten;
     erst danach beginnt der uebliche Weg durch die Seite. Liegen keine Bilder vor, beginnt die
     Linie wie frueher oben rechts. */
  var heroEndY = 0;
  function heroPoints() {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-line-via]"));
    var pts = [];
    els.forEach(function (el) {
      if (!el.offsetWidth || !el.offsetHeight) return;
      var x = 0, yy = 0, n = el;
      while (n && n !== main) { x += n.offsetLeft; yy += n.offsetTop; n = n.offsetParent; }
      if (n !== main) return;
      /* data-line-via = Hoehe der Station als Anteil der Bilderreihe (Elternelement), nicht des Bildes:
         so liegt die Linie wie eine Welle unter den Bildern und bleibt im Hero. */
      var fr = parseFloat(el.getAttribute("data-line-via")) || 0.5;
      var par = el.parentElement, py = 0, q = par;
      while (q && q !== main) { py += q.offsetTop; q = q.offsetParent; }
      pts.push({ x: x + el.offsetWidth / 2, y: py + par.offsetHeight * fr });
    });
    pts.sort(function (a, b) { return a.x - b.x; });
    return pts;
  }

  /* Vordere Ebene (siehe line.css): Ausschnitte = Elemente mit data-line-front. */
  var frontLayer = null, frontSvg = null, frontClip = null, frontPath = null;
  function boxInMain(el) {
    var x = 0, yy = 0, n = el;
    while (n && n !== main) { x += n.offsetLeft; yy += n.offsetTop; n = n.offsetParent; }
    return n === main ? { x: x, y: yy, w: el.offsetWidth, h: el.offsetHeight } : null;
  }
  function buildFront(W, Hh, dstr) {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-line-front]"))
      .filter(function (e) { return e.offsetWidth && e.offsetHeight; });
    if (!els.length) { if (frontLayer) frontLayer.hidden = true; frontPath = null; return; }
    if (!frontLayer) {
      frontLayer = document.createElement("div");
      frontLayer.className = "pageline pageline--front";
      frontLayer.setAttribute("aria-hidden", "true");
      frontSvg = svgEl("svg", { "class": "pageline__svg", focusable: "false" });
      var defs = svgEl("defs", {});
      frontClip = svgEl("clipPath", { id: "pageline-front-clip", clipPathUnits: "userSpaceOnUse" });
      defs.appendChild(frontClip);
      frontSvg.appendChild(defs);
      frontPath = svgEl("path", { "class": "pageline__main", "clip-path": "url(#pageline-front-clip)" });
      frontSvg.appendChild(frontPath);
      frontLayer.appendChild(frontSvg);
      main.appendChild(frontLayer);
    }
    frontLayer.hidden = false;
    frontSvg.setAttribute("viewBox", "0 0 " + W + " " + Hh);
    while (frontClip.firstChild) frontClip.removeChild(frontClip.firstChild);
    els.forEach(function (e) {
      var b = boxInMain(e);
      if (!b) return;
      frontClip.appendChild(svgEl("rect", { x: b.x.toFixed(1), y: b.y.toFixed(1), width: b.w.toFixed(1), height: b.h.toFixed(1) }));
    });
    frontPath.setAttribute("d", dstr);
  }

  var total = 0, ys = null, H = 1, topInDoc = 0;
  var cur = 0, target = 0, running = false, lastT = 0;
  var intro = true;               /* solange wahr, laeuft der zeitgesteuerte Auftakt (siehe introCur) */
  var introT0 = 0, introGoal = 0; /* Startzeit (ms) und Ziellaenge des Auftakts */

  function ease(t) { return (1 - Math.cos(Math.PI * t)) / 2; }
  function introCur(now) {
    if (!introT0) return 0;
    var t = (now - introT0) / (INTRO_DUR * 1000);
    return t <= 0 ? 0 : ease(t >= 1 ? 1 : t) * introGoal;
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* --- Pfad aus Schwuengen und Schleifen ---------------------------------------
     Wie eine Schildkroete: Position und Blickrichtung (0 = rechts, 90 = unten,
     Winkel wachsen im Uhrzeigersinn). "swoop" ist ein weicher Bogen zu einem
     Punkt mit vorgegebener Endrichtung, "arc" ein Kreisbogen. Eine Schleife ist
     ein Dreiviertelkreis: Wer links unten ankommt (Richtung 135 Grad), dreht
     270 Grad im Uhrzeigersinn und verlaesst sie Richtung 45 Grad — dabei kreuzt
     er seine eigene Spur. Gespiegelt gilt das fuer rechts. */
  function buildPath(W, H, vh) {
    var rad = Math.PI / 180;
    var R = Math.max(70, Math.min(W * 0.16, vh * 0.34));
    var x = 0, y = 0, h = 0, d = "";

    function dir(a) { return [Math.cos(a * rad), Math.sin(a * rad)]; }
    function f(n) { return n.toFixed(1); }
    function start(px, py, ph) { x = px; y = py; h = ph; d = "M" + f(x) + " " + f(y); }

    function swoop(qx, qy, hEnd, k1, k2) {
      var dist = Math.sqrt((qx - x) * (qx - x) + (qy - y) * (qy - y));
      var a = dir(h), b = dir(hEnd);
      d += " C" + f(x + a[0] * dist * k1) + " " + f(y + a[1] * dist * k1) + " " +
           f(qx - b[0] * dist * k2) + " " + f(qy - b[1] * dist * k2) + " " + f(qx) + " " + f(qy);
      x = qx; y = qy; h = hEnd;
    }

    /* cw = true: im Uhrzeigersinn (Mittelpunkt rechts der Fahrtrichtung). */
    function arc(deg, cw) {
      var left = deg;
      while (left > 0.01) {
        var step = Math.min(90, left);
        left -= step;
        var s = (cw ? 1 : -1);
        var n = dir(h + s * 90);
        var cx = x + n[0] * R, cy = y + n[1] * R;
        var vx = x - cx, vy = y - cy;
        var t = s * step * rad;
        var px = cx + vx * Math.cos(t) - vy * Math.sin(t);
        var py = cy + vx * Math.sin(t) + vy * Math.cos(t);
        var hn = h + s * step;
        var kap = 4 / 3 * Math.tan(step * rad / 4) * R;
        var a = dir(h), b = dir(hn);
        d += " C" + f(x + a[0] * kap) + " " + f(y + a[1] * kap) + " " + f(px - b[0] * kap) + " " + f(py - b[1] * kap) + " " + f(px) + " " + f(py);
        x = px; y = py; h = hn;
      }
    }

    /* Meist weite Schwuenge von einer Seite zur anderen (sie kreuzen sich nicht);
       nur jede vierte Station ist eine grosse Schleife — und damit eine der
       wenigen Kreuzungen. Abstaende, Orte und Groessen wechseln. */
    var dyList = [1.25, 1.45, 1.2, 1.1, 1.5, 1.3, 1.15, 1.4];
    var swingL = [0.14, 0.20, 0.12, 0.18];
    var swingR = [0.86, 0.80, 0.88, 0.82];
    var xl = [0.26, 0.32, 0.22, 0.30];
    var xr = [0.74, 0.69, 0.78, 0.71];
    var rk = [1.0, 0.85, 1.12, 0.92];
    var R0 = R;
    var via = heroPoints();
    if (via.length >= 3) {
      var P = [{ x: -W * 0.05, y: via[0].y - vh * 0.03 }];
      via.forEach(function (q) { P.push(q); });
      var lv = via[via.length - 1];
      /* Endpunkt: unter der letzten Station und in jedem Fall unterhalb des ersten Bildschirms —
         die Linie verlaesst das Bild nach unten und geht beim Scrollen von dort aus weiter. */
      P.push({ x: Math.min(W * 0.97, lv.x + W * 0.06), y: Math.max(lv.y + vh * 0.2, vh + 40 - topInDoc) });
      d = "M" + f(P[0].x) + " " + f(P[0].y);
      for (var j = 0; j < P.length - 1; j++) {
        var p0 = P[Math.max(0, j - 1)], p1 = P[j], p2 = P[j + 1], p3 = P[Math.min(P.length - 1, j + 2)];
        d += " C" + f(p1.x + (p2.x - p0.x) / 6) + " " + f(p1.y + (p2.y - p0.y) / 6) + " " +
             f(p2.x - (p3.x - p1.x) / 6) + " " + f(p2.y - (p3.y - p1.y) / 6) + " " + f(p2.x) + " " + f(p2.y);
      }
      var pe = P[P.length - 1], pp = P[P.length - 2];
      x = pe.x; y = pe.y; h = Math.atan2(pe.y - pp.y, pe.x - pp.x) / rad;
      heroEndY = y;
    } else {
      start(W * 0.80, -vh * 0.15, 112);
      heroEndY = 0;
    }
    var side = -1, guard = 0, i = 0, loops = 0;
    while (y < H + vh * 0.7 && guard++ < 80) {
      var dy = dyList[i % dyList.length] * vh;
      if (i % 4 === 3) {
        R = R0 * rk[loops % rk.length];
        if (side < 0) {
          swoop(W * xl[loops % xl.length], y + dy * 0.8, 135, 0.45, 0.42);
          arc(270, true);
        } else {
          swoop(W * xr[loops % xr.length], y + dy * 0.8, 45, 0.45, 0.42);
          arc(270, false);
        }
        loops++;
      } else {
        /* weiter Schwung auf die andere Seite, am Ende Richtung nach unten */
        swoop(side < 0 ? W * swingL[i % swingL.length] : W * swingR[i % swingR.length], y + dy, 90, 0.5, 0.5);
      }
      side = -side;
      i++;
    }
    return d;
  }

  function build() {
    var W = main.offsetWidth;
    H = main.offsetHeight;
    if (!W || !H) return;
    if (!introT0) introT0 = window.performance.now() + INTRO_DELAY * 1000;
    topInDoc = main.getBoundingClientRect().top + window.pageYOffset;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    buildMask(W, H);
    var dstr = buildPath(W, H, window.innerHeight);
    path.setAttribute("d", dstr);
    buildFront(W, H, dstr);
    total = path.getTotalLength();
    ys = new Array(LUT + 1);
    var maxY = -Infinity;
    for (var i = 0; i <= LUT; i++) {
      var y = path.getPointAtLength(total * i / LUT).y;
      if (y > maxY) maxY = y;
      ys[i] = maxY;               /* nur wachsend: Laenge, bei der der Pfad die Hoehe zum ersten Mal erreicht */
    }
    path.style.strokeDasharray = total + " " + total;
    if (frontPath) frontPath.style.strokeDasharray = total + " " + total;
    target = targetLength();
    introGoal = target;
    cur = intro ? introCur(window.performance.now()) : target;
    apply(cur);
    if (intro) kick();
  }

  /* Laenge, bei der der Pfad zum ersten Mal die Hoehe y erreicht. Eine Schleife
     ist deshalb ein Sprung in der Laenge — der Nachlauf macht daraus eine
     schnelle, weich auslaufende Bewegung. */
  function lenAtY(y) {
    if (y <= ys[0]) return 0;
    if (y >= ys[LUT]) return total;
    var lo = 0, hi = LUT;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (ys[mid] < y) lo = mid; else hi = mid;
    }
    var f = (y - ys[lo]) / ((ys[hi] - ys[lo]) || 1);
    return total * (lo + f) / LUT;
  }

  function targetLength() {
    if (!ys) return 0;
    if (NAHLIO.isReduced()) return total;
    var sy = window.pageYOffset;
    /* Am Seitenanfang ist die ganze Reihe der Hero-Bilder gezeichnet (heroEndY), danach folgt
       die Linie dem Scrollen mit Vorsprung. */
    var y = Math.max(sy + window.innerHeight * LEAD - topInDoc, heroEndY);
    return clamp01(lenAtY(y) / total) * total;
  }

  function apply(len) {
    var off = String(Math.max(0, total - len));
    path.style.strokeDashoffset = off;
    if (frontPath) frontPath.style.strokeDashoffset = off;
  }

  function tick(now) {
    var dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;
    if (intro) {
      cur = introCur(now);
      if (now >= introT0 + INTRO_DUR * 1000) intro = false;   /* ab hier folgt die Linie wieder dem Scrollen */
    } else {
      cur += (target - cur) * (1 - Math.exp(-dt / TAU));
      if (Math.abs(target - cur) < 0.8) { cur = target; running = false; }
    }
    apply(cur);
    if (running) window.requestAnimationFrame(tick);
  }

  function kick() {
    if (NAHLIO.isReduced()) { cur = target; apply(cur); intro = false; return; }
    if (running || (!intro && Math.abs(target - cur) < 0.8)) return;
    running = true;
    lastT = window.performance.now();
    window.requestAnimationFrame(tick);
  }

  function onScroll() {
    target = targetLength();
    kick();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("nahlio:layout", build);
  NAHLIO.onRecalc(build);
  build();
})();

/* ==== 30-pop.js ==== */
/* ==========================================================================
   NAHLIO — weiches Einblenden auf der ganzen Seite
   Jedes Element mit data-pop erscheint einmal, sobald es ins Fenster kommt:
   weich eingeblendet und leicht nach oben gleitend (Stil in motion.css).
   Gestaffelt wird ueber data-pop-delay. Reduced Motion: sofort sichtbar.
   ========================================================================== */
(function () {
  "use strict";

  /* Meldung an das Startskript im Seitenkopf: Die Einblender laufen. Fehlt sie nach
     4 s, schaltet das Startskript die Einblender ab und alle Inhalte bleiben sichtbar. */
  NAHLIO.popReady = true;

  var els = Array.prototype.slice.call(document.querySelectorAll("[data-pop]"));
  if (!els.length) return;

  /* Wer per Tastatur ins noch unsichtbare Element springt, sieht es sofort. */
  document.addEventListener("focusin", function (e) {
    var el = e.target && e.target.closest ? e.target.closest("[data-pop]") : null;
    if (el) el.classList.add("is-in");
  });

  if (!("IntersectionObserver" in window) || NAHLIO.isReduced()) {
    els.forEach(function (el) { el.classList.add("is-in"); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -9% 0px", threshold: 0.08 });

  /* Der Hero erscheint beim Oeffnen der Seite immer von selbst — nicht erst, wenn der Beobachter
     seine Teile sieht: Bei niedrigen Fenstern (Laptop, 1536 x 730) liegt das letzte Bild ganz unten,
     ausserhalb der Beobachtungsgrenze, und kaeme sonst erst nach dem Scrollen. */
  var heroEls = els.filter(function (el) { return el.closest(".hero"); });
  els.forEach(function (el) { if (heroEls.indexOf(el) < 0) io.observe(el); });
  if (heroEls.length) {
    void document.body.offsetHeight;       /* Ausgangszustand berechnen lassen, damit der Uebergang wirklich laeuft */
    window.setTimeout(function () {
      heroEls.forEach(function (el) { el.classList.add("is-in"); });
    }, 60);
  }
})();

/* ==== 40-journey.js ==== */
/* ==========================================================================
   NAHLIO — Beispiele (die fuenf Leistungen)
   Die Flaeche steht normal im Seitenfluss (keine Zoom-Buehne, kein festgehaltener
   Bereich, kein kuenstlicher Scrollweg). Die Leistungen liegen als Bilder
   nebeneinander auf einer Schiene und gleiten von rechts nach links; das erste
   Beispiel zeigt nach 2 Sekunden kurz, dass es weitere gibt (10 %-Schub).
   Automatischer Wechsel alle 10 Sekunden (je Beispiel ueber data-auto-ms
   aenderbar, z. B. laenger fuer die WhatsApp-Vorfuehrung), solange der Bereich
   im Bild ist; Knoepfe und Punkte wechseln sofort. Reduced Motion: kein
   Auto-Wechsel. Links mit data-show-slide (Fragen, Uebergang) waehlen vor dem
   Sprung zu #beispiele das passende Beispiel.
   ========================================================================== */
(function () {
  "use strict";

  var zoom = document.querySelector("[data-zoom]");
  if (!zoom) return;

  function all(sel, root) { return Array.prototype.slice.call((root || zoom).querySelectorAll(sel)); }

  var visuals = all("[data-vis]");
  var rail = zoom.querySelector("[data-zoom-visuals]");
  var panel = zoom.querySelector("[data-zoom-panel]");
  var texts = all(".sl");
  var dots = all("[data-slide-dot]");
  var prevBtn = zoom.querySelector("[data-slide-prev]");
  var nextBtn = zoom.querySelector("[data-slide-next]");
  var N = texts.length;
  if (!N || !rail) return;

  var AUTO_MS = 10000;
  var NUDGE_MS = 2000;
  var cur = -1;
  var inView = false;
  var timer = 0;
  var nudgeTimers = [];
  var desk = window.matchMedia("(min-width: 64em)");

  function indexOfKey(key) {
    for (var i = 0; i < texts.length; i++) if (texts[i].getAttribute("data-slide") === key) return i;
    return 0;
  }

  /* Die Beispiele liegen auf einer Schiene: das aktuelle bei 0, das naechste rechts
     daneben (+1), das vorige links (-1). Wer ueber den Rand springt (ganz links
     nach ganz rechts), springt ohne Bewegung, damit nichts quer durchs Bild faehrt. */
  var offs = [];
  function layoutRail() {
    visuals.forEach(function (v, k) {
      var o = ((k - cur) % N + N) % N;
      if (o > N / 2) o -= N;
      var prev = offs[k];
      var instant = prev === undefined || Math.abs(o - prev) >= 3;
      offs[k] = o;
      if (instant) v.classList.add("is-instant");
      v.style.setProperty("--o", String(o));
      v.classList.toggle("is-far", Math.abs(o) > 1);
      if (instant) { void v.offsetWidth; v.classList.remove("is-instant"); }
    });
  }

  /* Kleiner Hinweis auf weitere Beispiele: kurz 10 % nach links und gleich zurueck —
     nur beim ersten Beispiel und schon nach 2 Sekunden. */
  function nudge() {
    if (NAHLIO.isReduced()) return;
    rail.classList.remove("is-nudge");
    void rail.offsetWidth;
    rail.classList.add("is-nudge");
  }
  rail.addEventListener("animationend", function () { rail.classList.remove("is-nudge"); });

  /* Zweiter Zustand der Darstellungen (Knoepfe der Leistungen): Beim Wechsel zurueck. */
  function resetStates() {
    all(".vis").forEach(function (v) { v.classList.remove("is-before"); });
  }

  function show(i, byUser) {
    i = (i + N) % N;
    if (i === cur) { if (byUser) schedule(); return; }
    cur = i;
    layoutRail();
    visuals.forEach(function (v, k) {
      var on = k === i;
      v.classList.toggle("is-active", on);
      v.setAttribute("aria-hidden", "true");
    });
    texts.forEach(function (tx, k) {
      var on = k === i;
      tx.classList.toggle("is-active", on);
      tx.setAttribute("aria-hidden", on ? "false" : "true");
      Array.prototype.forEach.call(tx.querySelectorAll("button"), function (b) { b.tabIndex = on ? 0 : -1; });
    });
    dots.forEach(function (d, k) {
      d.classList.toggle("is-active", k === i);
      d.setAttribute("aria-current", k === i ? "true" : "false");
    });
    resetStates();
    schedule();
    try {
      document.dispatchEvent(new CustomEvent("nahlio:slide", { detail: { key: texts[i].getAttribute("data-slide") } }));
    } catch (e) {}
  }

  /* Automatik: nur, wenn der Bereich im Bild ist. */
  function schedule() {
    window.clearTimeout(timer);
    nudgeTimers.forEach(function (t_) { window.clearTimeout(t_); });
    nudgeTimers = [];
    /* Sichtbarkeit aus der Lage des Bereichs, nicht nur aus dem Beobachter:
       so stimmt sie auch, wenn Beobachter-Meldungen ausbleiben. */
    var r = zoom.getBoundingClientRect();
    inView = r.bottom > 0 && r.top < window.innerHeight;
    if (NAHLIO.isReduced() || document.hidden || !inView) return;
    var ms = (texts[cur] && +texts[cur].getAttribute("data-auto-ms")) || AUTO_MS;
    timer = window.setTimeout(function () { show(cur + 1, false); }, ms);
    if (cur === 0) nudgeTimers = [window.setTimeout(nudge, NUDGE_MS)];
  }

  if (prevBtn) prevBtn.addEventListener("click", function () { show(cur - 1, true); });
  if (nextBtn) nextBtn.addEventListener("click", function () { show(cur + 1, true); });
  dots.forEach(function (d, k) { d.addEventListener("click", function () { show(k, true); }); });

  zoom.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-slide-action]");
    if (!btn) return;
    var act = btn.getAttribute("data-slide-action");
    var sl = btn.closest(".sl");
    var key = sl && sl.getAttribute("data-slide");
    var v = visuals[indexOfKey(key)];
    var box = v && v.querySelector(".vis");
    if (act === "goto") show(indexOfKey(btn.getAttribute("data-target")), true);
    else if (act === "replay") {
      try { document.dispatchEvent(new CustomEvent("nahlio:wa-replay")); } catch (err) {}
      schedule();
    } else if (act === "toggle") {
      if (box) box.classList.toggle("is-before");
      schedule();
    }
  });

  zoom.addEventListener("keydown", function (e) {
    if (!zoom.contains(document.activeElement)) return;
    if (e.key === "ArrowLeft" && (document.activeElement === prevBtn || document.activeElement.hasAttribute("data-slide-dot"))) { show(cur - 1, true); }
    if (e.key === "ArrowRight" && (document.activeElement === nextBtn || document.activeElement.hasAttribute("data-slide-dot"))) { show(cur + 1, true); }
  });

  document.addEventListener("visibilitychange", schedule);
  /* Wer in der WhatsApp-Vorfuehrung selbst tippt, bekommt die volle Zeit von vorn. */
  document.addEventListener("nahlio:wa-interact", schedule);

  /* Spruenge aus Fragen und Uebergang: erst das passende Beispiel waehlen, dann scrollt der Link. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("[data-show-slide]") : null;
    if (!a) return;
    show(indexOfKey(a.getAttribute("data-show-slide")), true);
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      schedule();
    }, { threshold: 0.15 }).observe(zoom);
  } else {
    inView = true;
  }
  window.addEventListener("scroll", NAHLIO.raf(function () {
    var r = zoom.getBoundingClientRect();
    var now = r.bottom > 0 && r.top < window.innerHeight;
    if (now !== inView) schedule();
  }), { passive: true });

  /* Passt der Text einer Leistung samt Hinweis in die Bildschirmhoehe? Sonst werden Schrift
     und Abstaende gemeinsam verkleinert (bis 0,7). Nur am Desktop; darunter steht alles
     untereinander und scrollt normal. */
  function fit() {
    zoom.style.setProperty("--sfit", "1");
    if (!desk.matches || !panel) return;
    var cs = window.getComputedStyle(document.documentElement);
    var navH = parseFloat(cs.getPropertyValue("--nav-h")) || 88;
    var pad = Math.min(28, Math.max(14, window.innerHeight * 0.02));   /* wie --pad in journey.css */
    var avail = window.innerHeight - navH - 2 * pad;
    var f = 1;
    for (var i = 0; i < 4; i++) {
      var need = panel.scrollHeight;
      if (!avail || need <= avail + 1 || f <= 0.7) break;
      f = Math.max(0.7, f * avail / need * 0.985);
      zoom.style.setProperty("--sfit", f.toFixed(3));
    }
  }

  NAHLIO.onRecalc(fit);
  NAHLIO.onMedia(desk, fit);

  show(0, false);
  fit();
})();

/* ==== 45-wa.js ==== */
/* ==========================================================================
   NAHLIO — WhatsApp: Termin buchen (Darstellung "Kontakt & WhatsApp")
   Alle Darstellungen [data-wa] zeigen die naechsten sechs Oeffnungstage (Mo-Sa,
   ab morgen) — gerechnet im Browser, damit die Woche immer stimmt.
   Live-Vorfuehrung nur in den Beispielen ([data-wa-live]) und ohne Reduced
   Motion: Ein Finger tippt "Termin buchen", waehlt einen Tag und eine Uhrzeit,
   der Termin wird bestaetigt; dann beginnt sie von vorn. Sie laeuft nur, solange
   das Beispiel aktiv und im Bild ist. Wer selbst tippt, uebernimmt (Tage und
   Zeiten sind anklickbar); 40-journey.js haelt den Wechsel dann an.
   Ereignisse: nahlio:slide (Beispiel gewechselt), nahlio:wa-replay (neu starten).
   ========================================================================== */
(function () {
  "use strict";

  var WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  var WDL = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  var MON = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function openDays(n) {
    var out = [], d = new Date();
    d.setHours(12, 0, 0, 0);
    while (out.length < n) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0) out.push(new Date(d.getTime()));
    }
    return out;
  }
  function longDay(d) { return WDL[d.getDay()] + ", " + d.getDate() + ". " + MON[d.getMonth()]; }

  all("[data-wa]").forEach(function (wa) {
    var days = openDays(6);
    var FULL = +wa.getAttribute("data-full") || 0;
    var PICK = +wa.getAttribute("data-pick") || 0;
    var TPICK = +wa.getAttribute("data-tpick") || 0;
    var dayBtns = all("[data-wa-day]", wa);
    var timeBtns = all("[data-wa-time]", wa);
    var selDay = PICK, selTime = TPICK;

    dayBtns.forEach(function (b, i) {
      var d = days[i];
      if (!d) return;
      b.querySelector("small").textContent = WD[d.getDay()];
      b.querySelector("b").textContent = String(d.getDate());
      if (i !== FULL) b.querySelector("em").textContent = MON[d.getMonth()].slice(0, 3) + ".";
    });

    function setText(sel, txt) { all(sel, wa).forEach(function (e) { e.textContent = txt; }); }
    function labels() {
      var d = days[selDay] || days[0];
      var tm = timeBtns[selTime] ? timeBtns[selTime].getAttribute("data-wa-time") : "";
      setText("[data-wa-day-label]", longDay(d));
      setText("[data-wa-day-short]", WDL[d.getDay()]);
      setText("[data-wa-time-label]", tm);
      setText("[data-wa-conf]", longDay(d) + " · " + tm + " Uhr");
    }
    labels();

    if (!wa.hasAttribute("data-wa-live") || NAHLIO.isReduced()) return;   /* statisch: fertiger Ablauf */

    /* --- Live-Vorfuehrung -------------------------------------------------------------------- */
    wa.classList.add("is-js");
    var rows = all(".wa__row[data-step]", wa);
    var tap = wa.querySelector("[data-wa-tap]");
    var book = wa.querySelector("[data-wa-book]");
    var frame = wa.closest(".zoom__vis");
    var step = 0, tok = 0, timer = 0, active = false, visible = false;

    function show(n) {
      step = n;
      rows.forEach(function (r) { r.classList.toggle("is-off", +r.getAttribute("data-step") > n); });
    }
    function typing(on) { wa.classList.toggle("is-typing", !!on); }
    function mark(list, i) { list.forEach(function (b, k) { b.classList.toggle("is-sel", k === i); }); }

    /* Lage eines Knopfes in .wa (Layoutmass, unabhaengig von Verschiebungen der Schiene) */
    function pos(el) {
      var x = 0, y = 0, n = el;
      while (n && n !== wa) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 };
    }
    function tapTo(el) {
      if (!el) return;
      var p = pos(el);
      tap.classList.add("is-on");
      tap.style.transform = "translate(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px)";
    }
    function tapHome() {
      tap.style.transform = "translate(" + (wa.clientWidth * 0.66).toFixed(1) + "px," + (wa.clientHeight * 1.02).toFixed(1) + "px)";
    }
    function press(el) { tap.classList.add("is-down"); if (el) el.classList.add("is-press"); }
    function release(el) {
      tap.classList.remove("is-down");
      (el ? [el] : all(".is-press", wa)).forEach(function (e) { e.classList.remove("is-press"); });
    }
    function hideTap() { tap.classList.remove("is-on"); }

    function cancel() { tok++; window.clearTimeout(timer); }
    function run(seq) {
      cancel();
      var my = tok, i = 0;
      (function next() {
        if (my !== tok || i >= seq.length) return;
        var s = seq[i++];
        timer = window.setTimeout(function () {
          if (my !== tok) return;
          s[1]();
          next();
        }, s[0]);
      })();
    }
    function reset() {
      cancel();
      typing(false);
      release();
      hideTap();
      selDay = PICK; selTime = TPICK;
      mark(dayBtns, -1); mark(timeBtns, -1);
      labels();
      show(0);
      tap.style.transition = "none";
      tapHome();
      void tap.offsetWidth;
      tap.style.transition = "";
    }

    function demo() {
      var d = dayBtns[PICK], tm = timeBtns[TPICK];
      run([
        [650, function () { tap.classList.add("is-on"); }],
        [140, function () { tapTo(book); }],
        [820, function () { press(book); }],
        [230, function () { release(book); show(1); }],
        [420, function () { typing(true); }],
        [900, function () { typing(false); show(2); }],
        [1150, function () { tapTo(d); }],
        [820, function () { press(d); }],
        [230, function () { release(d); selDay = PICK; mark(dayBtns, PICK); labels(); }],
        [380, function () { show(3); }],
        [420, function () { typing(true); }],
        [850, function () { typing(false); show(4); }],
        [1150, function () { tapTo(tm); }],
        [820, function () { press(tm); }],
        [230, function () { release(tm); selTime = TPICK; mark(timeBtns, TPICK); labels(); }],
        [380, function () { show(5); }],
        [420, function () { typing(true); hideTap(); }],
        [950, function () { typing(false); show(6); }],
        [6200, function () { if (active) { reset(); demo(); } }]
      ]);
    }

    /* Selbst tippen: die Vorfuehrung stoppt, der Ablauf folgt der Auswahl. */
    function poke() {
      try { document.dispatchEvent(new CustomEvent("nahlio:wa-interact")); } catch (e) {}
    }
    function user(seq) { hideTap(); release(); run(seq); poke(); }
    wa.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button") : null;
      if (!b || !wa.contains(b)) return;
      if (b.hasAttribute("data-wa-book")) {
        if (step >= 1) return;
        user([[0, function () { show(1); }], [380, function () { typing(true); }], [800, function () { typing(false); show(2); }]]);
      } else if (b.hasAttribute("data-wa-day")) {
        if (b.classList.contains("is-full") || step < 2) return;
        selDay = +b.getAttribute("data-wa-day");
        mark(dayBtns, selDay); labels();
        if (step < 3) user([[260, function () { show(3); }], [380, function () { typing(true); }], [800, function () { typing(false); show(4); }]]);
        else { cancel(); hideTap(); poke(); }
      } else if (b.hasAttribute("data-wa-time")) {
        if (step < 4) return;
        selTime = timeBtns.indexOf(b);
        mark(timeBtns, selTime); labels();
        if (step < 5) user([[260, function () { show(5); }], [380, function () { typing(true); }], [850, function () { typing(false); show(6); }]]);
        else { cancel(); hideTap(); poke(); }
      }
    });

    /* Nur laufen, wenn das Beispiel aktiv, im Bild und der Tab sichtbar ist. */
    function isActive() { return !frame || frame.classList.contains("is-active"); }
    function check() {
      var on = isActive() && visible && !document.hidden;
      if (on && !active) { active = true; reset(); demo(); poke(); }
      else if (!on && active) { active = false; cancel(); hideTap(); }
    }
    document.addEventListener("nahlio:slide", check);
    document.addEventListener("visibilitychange", check);
    document.addEventListener("nahlio:wa-replay", function () {
      if (!isActive()) return;
      active = true; reset(); demo(); poke();
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        check();
      }, { threshold: 0.35 }).observe(wa);
    } else {
      visible = true;
    }
    reset();
    check();
  });
})();

/* ==== 50-faq.js ==== */
/* ==========================================================================
   NAHLIO — FAQ
   Eine Antwort ist jeweils offen; die geoeffnete Karte hebt sich ab
   (Stil in sections.css). Schaltflaechen mit aria-expanded, Tastatur wie
   bei jeder Schaltflaeche.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.querySelector("[data-faq]");
  if (!root) return;
  var items = Array.prototype.slice.call(root.querySelectorAll("[data-faq-item]"));

  function setOpen(item, open) {
    var btn = item.querySelector(".faq__q");
    item.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  items.forEach(function (item) {
    var btn = item.querySelector(".faq__q");
    btn.addEventListener("click", function () {
      var willOpen = !item.classList.contains("is-open");
      items.forEach(function (other) { if (other !== item) setOpen(other, false); });
      setOpen(item, willOpen);
      /* Die geoeffnete Karte bleibt im Blick, auch wenn darueber eine zugeht. */
      if (willOpen) {
        window.setTimeout(function () {
          var r = item.getBoundingClientRect();
          var navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 84;
          if (r.top < navH + 8 || r.bottom > window.innerHeight - 8) {
            item.scrollIntoView({ behavior: NAHLIO.isReduced() ? "auto" : "smooth", block: "center" });
          }
        }, 540);
      }
    });
  });
})();

/* ==== 60-form.js ==== */
/* ==========================================================================
   NAHLIO — Kontaktformular (contact.docx)
   Vier Felder: Name und Betrieb sind Pflicht, dazu mindestens eine Kontaktangabe
   (E-Mail oder WhatsApp-Nummer, einzeln optional). Jede angegebene Kontaktangabe
   wird geprueft. Fehler stehen als Text im Formular (aria-describedby, role="alert"),
   die Eingaben bleiben erhalten. Abgeschickt wird nur an den hinterlegten Empfaenger;
   "Vielen Dank ..." erscheint erst, wenn der Empfaenger die Anfrage bestaetigt hat.
   Fehlt der Empfaenger, steht ehrlich, dass das Formular noch nicht verbunden ist.
   ========================================================================== */
(function () {
  "use strict";

  var form = document.querySelector("[data-form]");
  if (!form) return;

  var status = form.querySelector("[data-form-status]");
  function isMissing() { return form.getAttribute("data-endpoint-missing") === "true"; }
  var msg = {};
  try { msg = JSON.parse(form.getAttribute("data-messages") || "{}"); } catch (e) { msg = {}; }

  var f = {
    name: form.elements["name"],
    betrieb: form.elements["betrieb"],
    email: form.elements["email"],
    whatsapp: form.elements["whatsapp"],
    consent: form.elements["einwilligung"]
  };
  var contactBox = document.getElementById("f-contact-error");

  function show(box, text) { if (box) box.textContent = text || ""; }
  function boxOf(input) { return document.getElementById((input.id || "") + "-error"); }
  function mark(input, text) {
    if (!input) return;
    show(boxOf(input), text);
    if (text) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }

  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(v); }
  /* Internationale Schreibweisen: +49 170 1234567, 0049 ..., (0170) 123-4567, 0170/1234567.
     Erlaubt sind Ziffern, Leerzeichen, + am Anfang sowie ( ) . / -; 6 bis 15 Ziffern. */
  function phoneOk(v) {
    if (!/^\+?[\d\s().\/-]+$/.test(v)) return false;
    var digits = v.replace(/\D/g, "").length;
    return digits >= 6 && digits <= 15;
  }

  function check(which) {
    var v;
    if (which === "name") {
      v = f.name.value.trim();
      mark(f.name, v ? "" : msg.name); return !!v;
    }
    if (which === "betrieb") {
      v = f.betrieb.value.trim();
      mark(f.betrieb, v ? "" : msg.betrieb); return !!v;
    }
    if (which === "email") {
      v = f.email.value.trim();
      var okE = !v || emailOk(v);
      mark(f.email, okE ? "" : msg.email); return okE;
    }
    if (which === "whatsapp") {
      v = f.whatsapp.value.trim();
      var okW = !v || phoneOk(v);
      mark(f.whatsapp, okW ? "" : msg.whatsapp); return okW;
    }
    if (which === "contact") {
      var any = f.email.value.trim() || f.whatsapp.value.trim();
      show(contactBox, any ? "" : msg.contact);
      [f.email, f.whatsapp].forEach(function (i) {
        if (!any) i.setAttribute("aria-invalid", "true");
        else if (!boxOf(i).textContent) i.removeAttribute("aria-invalid");
      });
      return !!any;
    }
    if (which === "consent") {
      var okC = !f.consent || !f.consent.required || f.consent.checked;
      show(document.getElementById("f-consent-error"), okC ? "" : msg.consent);
      if (f.consent) { if (okC) f.consent.removeAttribute("aria-invalid"); else f.consent.setAttribute("aria-invalid", "true"); }
      return okC;
    }
    return true;
  }

  /* Beim Verlassen und Tippen: nur bereits markierte Felder neu pruefen, damit nichts
     schimpft, waehrend noch getippt wird. */
  [["name", f.name], ["betrieb", f.betrieb], ["email", f.email], ["whatsapp", f.whatsapp]].forEach(function (p) {
    p[1].addEventListener("blur", function () { if (p[1].value.trim() || p[0] === "name" || p[0] === "betrieb") check(p[0]); });
    p[1].addEventListener("input", function () {
      if (p[1].getAttribute("aria-invalid") === "true") check(p[0]);
      if (p[0] === "email" || p[0] === "whatsapp") { if (contactBox && contactBox.textContent) check("contact"); }
    });
  });
  if (f.consent) f.consent.addEventListener("change", function () { check("consent"); });

  function setStatus(text, kind) {
    if (!status) return;
    status.textContent = text || "";
    status.classList.toggle("is-ok", kind === "ok");
    status.classList.toggle("is-error", kind === "error");
  }

  function validateAll() {
    var order = [["name", f.name], ["betrieb", f.betrieb], ["email", f.email], ["whatsapp", f.whatsapp]];
    var first = null;
    order.forEach(function (p) { if (!check(p[0]) && !first) first = p[1]; });
    if (!check("contact") && !first) first = f.email;
    if (!check("consent") && !first) first = f.consent;
    return first;
  }

  form.addEventListener("submit", function (e) {
    var bad = validateAll();
    if (bad) {
      e.preventDefault();
      bad.focus();
      setStatus(msg.summary, "error");
      return;
    }

    if (isMissing()) {
      e.preventDefault();
      setStatus(form.getAttribute("data-unavailable"), "error");
      return;
    }

    /* Mit Skript: im Hintergrund senden und erst nach bestaetigter Zustellung danken.
       Ohne Skript sendet der Browser das Formular ganz normal. */
    if (!window.fetch || !window.FormData) return;
    e.preventDefault();
    var btn = form.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    setStatus(msg.sending, "");
    fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.reset();
        [f.name, f.betrieb, f.email, f.whatsapp].forEach(function (i) { i.removeAttribute("aria-invalid"); });
        setStatus(form.getAttribute("data-success"), "ok");
      })
      .catch(function () {
        /* Eingaben bleiben stehen, damit nichts verloren geht. */
        setStatus(form.getAttribute("data-error"), "error");
      })
      .then(function () { if (btn) btn.disabled = false; });
  });
})();

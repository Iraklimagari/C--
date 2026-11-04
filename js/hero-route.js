/* ==========================================================================
   NAHLIO — Hero: Die Linie bringt einen Betrieb nach oben
   Rechts im Hero zeichnet sich die Linie (Farben der Seitenlinie) einen Zickzack-Weg hinauf und
   schiebt einen Betrieb (Ladensymbol) vor sich her. Die Leistungen sind Wegmarken: Die Linie erreicht
   eine Marke (Haken, Name erscheint), geht ein Stueck hinab und steigt hoeher zur naechsten. Nach der
   letzten Marke geht es ganz nach oben. Der fertige Weg bleibt als Bild stehen.
   Unten beginnt an derselben Stelle die Seitenlinie (25-line.js, data-line-exit) und folgt dem Scrollen.
   Weniger Bewegung: fertiger Weg sofort. Ausserdem: Woerter der Ueberschrift fuer den Text-Auftakt
   fassen (premium.css) und das kleine Logo oben links im Hero ausblenden.
   ========================================================================== */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var deskQ = window.matchMedia("(min-width: 64em)");

  /* --- Text-Auftakt: Woerter einzeln fassen (Bewegung in premium.css) ----------------------- */
  (function splitWords(h) {
    if (!h || h.classList.contains("is-split")) return;
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 1) { walk(child); return; }
        if (child.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement("span");
          w.className = "hw"; w.style.setProperty("--i", String(i++)); w.textContent = part;
          frag.appendChild(w);
        });
        node.replaceChild(frag, child);
      });
    })(h);
    h.classList.add("is-split");
  })(document.querySelector(".hero--mark .hero__title"));

  /* --- Kleines Logo oben links: im Hero ausgeblendet, nach dem Hero wieder da ---------------- */
  var heroSec = document.querySelector(".hero--mark");
  if (heroSec && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      document.documentElement.classList.toggle("hero-in-view", es[0].intersectionRatio >= 0.3);
    }, { threshold: [0, 0.3, 0.6] }).observe(heroSec);
  }

  var root = document.querySelector("[data-route]");
  if (!root) return;
  var svg = root.querySelector("[data-route-svg]");
  var exitEl = root.querySelector("[data-line-exit]");

  /* Leistungen in der Reihenfolge der Seite */
  var STOPS = ["Google-Profil", "Website", "Digitale Karte", "WhatsApp", "Fotos & Kurzvideos"];
  /* Weg in Anteilen der Flaeche (x nach rechts, y nach unten): Start unten, je Leistung eine Marke,
     danach ein Stueck hinab, die naechste Marke liegt hoeher; zuletzt ganz nach oben. */
  var ROUTE = [
    { x: 0.05, y: 1.0 },
    { x: 0.2, y: 0.8, stop: 0 }, { x: 0.28, y: 0.87 },
    { x: 0.39, y: 0.66, stop: 1 }, { x: 0.47, y: 0.73 },
    { x: 0.57, y: 0.52, stop: 2 }, { x: 0.64, y: 0.59 },
    { x: 0.74, y: 0.38, stop: 3 }, { x: 0.8, y: 0.44 },
    { x: 0.88, y: 0.24, stop: 4 }, { x: 0.92, y: 0.29 },
    { x: 0.97, y: 0.07, top: true }
  ];

  /* Zeit: Weg in gleichmaessigem Tempo, an jeder Marke weich abbremsen (ease-in-out je Abschnitt), kurz halten */
  var SPEED = 0.5;                  /* px je ms */
  var HOLD = 220;                   /* ms an jeder Marke */
  var START = 450;                  /* ms nach dem Laden: die Ueberschrift kommt zuerst */
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  var line, track, badge, nodes = [], legs = [], total = 0, W = 0, H = 0, t0 = 0, raf = 0, done = reduce, extraL = 0;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* Punkte in Pixel, mit etwas Rand fuer Namen und Marke oben */
  function points() {
    var padL = W * 0.02 + extraL, padR = W * 0.06, padT = H * 0.1;
    return ROUTE.map(function (p) {
      return { x: padL + p.x * (W - padL - padR), y: padT + p.y * (H - padT), stop: p.stop, top: p.top };
    });
  }

  /* Zickzack mit leicht gerundeten Ecken; Lage der Marken genau auf der Linie */
  function buildPath(pts) {
    var r = Math.max(8, Math.min(W, H) * 0.02), d = "M" + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
    var marks = [];
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i];
      if (i === pts.length - 1) { d += " L" + p.x.toFixed(1) + " " + p.y.toFixed(1); marks.push({ p: p, x: p.x, y: p.y }); continue; }
      var a = pts[i - 1], b = pts[i + 1];
      var ax = p.x - a.x, ay = p.y - a.y, la = Math.sqrt(ax * ax + ay * ay);
      var bx = b.x - p.x, by = b.y - p.y, lb = Math.sqrt(bx * bx + by * by);
      var rr = Math.min(r, la / 2, lb / 2);
      var inx = p.x - ax / la * rr, iny = p.y - ay / la * rr, outx = p.x + bx / lb * rr, outy = p.y + by / lb * rr;
      d += " L" + inx.toFixed(1) + " " + iny.toFixed(1) + " Q" + p.x.toFixed(1) + " " + p.y.toFixed(1) + " " + outx.toFixed(1) + " " + outy.toFixed(1);
      marks.push({ p: p, x: 0.25 * inx + 0.5 * p.x + 0.25 * outx, y: 0.25 * iny + 0.5 * p.y + 0.25 * outy });
    }
    return { d: d, marks: marks };
  }

  function lengthAt(path, x, y, from) {
    /* Laenge bis zu dem Punkt der Linie, der (x, y) am naechsten liegt (ab "from") */
    var best = from, bd = Infinity, step = 3;
    for (var l = from; l <= total; l += step) {
      var q = path.getPointAtLength(l), dd = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y);
      if (dd < bd) { bd = dd; best = l; }
      else if (dd > bd + 4000 && l - best > 60) break;
    }
    return best;
  }

  function build(again) {
    W = root.clientWidth; H = root.clientHeight;
    if (!W || !H) return;
    if (!again) extraL = 0;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var desk = deskQ.matches;
    var defs = el("defs", {}, svg);
    var grad = el("linearGradient", { id: "route-grad", gradientUnits: "userSpaceOnUse", x1: "0", y1: String(H), x2: String(W), y2: "0" }, defs);
    el("stop", { offset: "0", "class": "pageline__stop--a" }, grad);
    el("stop", { offset: "0.5", "class": "pageline__stop--b" }, grad);
    el("stop", { offset: "1", "class": "pageline__stop--c" }, grad);

    var pts = points(), built = buildPath(pts);
    track = el("path", { d: built.d, "class": "route__track" }, svg);
    line = el("path", { d: built.d, "class": "route__line" }, svg);
    total = line.getTotalLength();
    line.style.strokeDasharray = total + " " + (total + 10);

    /* Marken und Namen */
    nodes = []; legs = [];
    var lastLen = 0;
    built.marks.forEach(function (m) {
      var len = lengthAt(line, m.x, m.y, lastLen);
      lastLen = len;
      if (m.p.stop === undefined) return;
      var g = el("g", { "class": "route__stop", transform: "translate(" + m.x.toFixed(1) + " " + m.y.toFixed(1) + ")" }, svg);
      var dot = el("g", { "class": "route__dot" }, g);
      var R = desk ? 17 : 12;
      el("circle", { r: String(R) }, dot);
      el("path", { "class": "route__check", d: desk ? "M-7 0.5l4.6 4.6L7.5-5" : "M-5 0.5l3.3 3.3L5.3-3.6" }, dot);
      var label = el("text", { "class": "route__label", x: String(-(R + 10)), y: String(-(R + 6)), "text-anchor": "end" }, g);
      label.textContent = STOPS[m.p.stop];
      nodes.push({ g: g, len: len });
      legs.push(len);
    });
    legs.push(total);                                       /* zuletzt: ganz nach oben */

    /* Namen duerfen nicht ueber den linken Rand ragen: sonst den Weg nach rechts einruecken und neu bauen */
    var minLeft = Infinity;
    nodes.forEach(function (n) {
      var t = n.g.querySelector("text"), bb = t.getBBox(), m = n.g.transform.baseVal.consolidate();
      minLeft = Math.min(minLeft, (m ? m.matrix.e : 0) + bb.x);
    });
    if (minLeft < 8 && !again) { extraL = 8 - minLeft; build(true); return; }

    /* der Betrieb, den die Linie nach oben bringt */
    badge = el("g", { "class": "route__badge" }, svg);
    var inner = el("g", { "class": "route__badge-in" }, badge);
    var BR = desk ? 30 : 22;
    el("circle", { r: String(BR) }, inner);
    var s = BR / 30;
    el("path", { "class": "route__shop", transform: "scale(" + s.toFixed(3) + ")",
      d: "M-13-5h26l-2.5-8h-21z M-11-5v15h22v-15 M-3.5 10v-8h7v8 M-13-5c0 3.2 4.3 3.2 4.3 0c0 3.2 4.3 3.2 4.3 0c0 3.2 4.3 3.2 4.4 0c0 3.2 4.3 3.2 4.3 0c0 3.2 4.3 3.2 4.3 0c0 3.2 4.4 3.2 4.4 0" }, inner);

    /* Startpunkt der Seitenlinie: wo der Weg unten beginnt */
    var ex = pts[0].x, ey = H - 2;
    if (Math.abs(exitEl.offsetLeft - ex) > 0.5 || Math.abs(exitEl.offsetTop - ey) > 0.5) {
      exitEl.style.left = ex.toFixed(1) + "px"; exitEl.style.top = ey.toFixed(1) + "px"; exitEl.style.bottom = "auto";
      if (window.NAHLIO && window.NAHLIO.recalc) window.NAHLIO.recalc();
    }
    paint(done ? total : drawnAt(now() - t0));
  }

  function now() { return window.performance.now(); }
  /* Zeitplan: je Abschnitt (bis zur naechsten Marke) Dauer nach Laenge, ease-in-out, dann kurz halten */
  function drawnAt(t) {
    t -= START;
    if (t <= 0) return 0;
    var from = 0;
    for (var i = 0; i < legs.length; i++) {
      var len = legs[i] - from, dur = len / SPEED;
      if (t < dur) return from + len * easeInOut(t / dur);
      t -= dur;
      if (i < legs.length - 1) { if (t < HOLD) return legs[i]; t -= HOLD; }
      from = legs[i];
    }
    return total;
  }

  function paint(l) {
    line.style.strokeDashoffset = String(total - l);
    line.style.visibility = l > 0.5 ? "" : "hidden";
    nodes.forEach(function (n) { n.g.classList.toggle("is-reached", l >= n.len - 1); });
    var q = line.getPointAtLength(Math.max(0, Math.min(total, l)));
    badge.setAttribute("transform", "translate(" + q.x.toFixed(1) + " " + q.y.toFixed(1) + ")");
    badge.classList.toggle("is-on", l > 0.5);
    root.classList.toggle("is-done", l >= total - 0.5);
  }

  function tick() {
    raf = 0;
    var l = drawnAt(now() - t0);
    paint(l);
    if (l < total) raf = requestAnimationFrame(tick); else done = true;
  }

  t0 = now();
  build();
  if (!done) raf = requestAnimationFrame(tick);
  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { build(); }, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { build(); });
})();

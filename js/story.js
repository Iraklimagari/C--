/* ==========================================================================
   NAHLIO — Scroll-Geschichten (Wunsch 05.11.), Stil in css/story.css
   1. Kundenweg (.ks): Der Scrollweg der Sektion ist in 10 Stufen geteilt. Jede Stufe setzt eine Klasse
      (.is-s0 ... .is-s9, aufsteigend). Die Bewegung selbst laeuft mit Zeit (CSS-Uebergaenge), damit sie
      ruhig aussieht; zurueckscrollen nimmt sie wieder weg. Getippt werden die Suche (ab Stufe 1) und die
      Bewertung (ab Stufe 8).
   2. Fragen (.bq): Der Titel loest sich mit dem Scrollen auf (--t von 0 bis 1, direkt an den Scrollweg
      gekoppelt), danach steht jeweils eine der drei Fragen vorn im Kreis.
   Ohne Skript stehen beide Sektionen als normale Inhalte da (siehe story.css).
   ========================================================================== */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var jobs = [];
  var queued = false;
  function frame() { queued = false; jobs.forEach(function (fn) { fn(); }); }
  function request() { if (!queued) { queued = true; window.requestAnimationFrame(frame); } }

  /* Fortschritt innerhalb einer hohen Sektion mit stehender Buehne: 0 = Buehne erreicht den oberen Rand,
     1 = Buehne loest sich wieder. */
  function progress(track) {
    var r = track.getBoundingClientRect(), span = r.height - window.innerHeight;
    return { y: -r.top, span: span > 1 ? span : 1 };
  }

  /* --- 1. Kundenweg --------------------------------------------------------------------------- */
  var ks = document.querySelector("[data-ks]");
  if (ks) (function () {
    var track = ks.querySelector(".ks__track");
    var steps = ks.querySelectorAll(".ks__step"), bars = ks.querySelectorAll(".ks__bar i");
    var N = 10;
    var STEP_OF = [0, 0, 0, 1, 1, 2, 3, 3, 4, 4];       /* welche Erklaerung links zu welcher Stufe gehoert */
    var typers = [];
    each(ks.querySelectorAll("[data-ks-type]"), function (el) {
      typers.push({ el: el, wrap: el.parentNode, text: el.getAttribute("data-ks-type"), timer: 0 });
    });
    var TYPE_AT = [1, 8];                               /* Suche ab Stufe 1, Bewertung ab Stufe 8 */
    var cur = -1;

    function type(t, on, j) {
      window.clearTimeout(t.timer);
      if (!on) {
        t.el.textContent = "";
        t.wrap.classList.remove("has-text");
        if (j === 1) ks.classList.remove("is-review-typed");
        return;
      }
      t.wrap.classList.add("has-text");
      if (reduce) { t.el.textContent = t.text; if (j === 1) ks.classList.add("is-review-typed"); return; }
      var i = 0, speed = t.text.length > 40 ? 16 : 52;
      (function next() {
        i++;
        t.el.textContent = t.text.slice(0, i);
        if (i < t.text.length) t.timer = window.setTimeout(next, speed + (t.text.charAt(i) === " " ? speed * 0.6 : 0));
        else if (j === 1) ks.classList.add("is-review-typed");
      })();
    }

    function setState(k) {
      if (k === cur) return;
      var prev = cur;
      cur = k;
      for (var i = 0; i < N; i++) ks.classList.toggle("is-s" + i, i <= k);
      var st = STEP_OF[k];
      each(steps, function (li, n) {
        li.classList.toggle("is-active", n === st);
        li.setAttribute("aria-current", n === st ? "step" : "false");
      });
      each(bars, function (b, n) { b.classList.toggle("is-on", n <= st); });
      TYPE_AT.forEach(function (at, j) {
        var t = typers[j];
        if (!t) return;
        if (k >= at && prev < at) type(t, true, j);
        else if (k < at && prev >= at) type(t, false, j);
      });
    }

    function update() {
      var p = progress(track), len = p.span / (N - 1);
      var k = Math.floor((p.y + len * 0.5) / len);
      setState(k < 0 ? 0 : k > N - 1 ? N - 1 : k);
    }

    ks.classList.add("is-live");
    jobs.push(update);
  })();

  /* --- 2. Fragen in Quadraten ----------------------------------------------------------------- */
  var bq = document.querySelector("[data-bq]");
  if (bq) (function () {
    var track = bq.querySelector(".bq__track");
    var cards = bq.querySelectorAll(".bq__card"), dots = bq.querySelectorAll(".bq__count i");
    var sqs = Array.prototype.map.call(cards, function (c) { return c.querySelector(".bq__sq"); });
    var lastT = -1, front = -1, orbit = null, lastK = [];
    var TITLE = 0.22;                                   /* Anteil des Scrollwegs, in dem sich der Titel aufloest */
    var SHRINK = 0.34;                                  /* so viel kleiner wird ein Quadrat bis zum Wechsel */

    function setK(i, k) {
      if (Math.abs((lastK[i] || 1) - k) < 0.001 && lastK[i] !== undefined) return;
      lastK[i] = k;
      sqs[i].style.setProperty("--k", k.toFixed(4));
    }
    function setFront(f, replay) {
      if (f === front && !replay) return;
      var changed = f !== front;
      front = f;
      bq.setAttribute("data-front", String(f));
      each(cards, function (c, i) {
        c.classList.toggle("is-front", i === f);
        c.classList.toggle("is-past", i < f);
        c.classList.toggle("is-next", i > f);
        c.setAttribute("aria-hidden", i === f ? "false" : "true");
        var a = c.querySelector("a");
        if (a) a.tabIndex = i === f ? 0 : -1;
        if (i > f) setK(i, 1);
        if (i < f) setK(i, 1 - SHRINK);
      });
      each(dots, function (d, i) { d.classList.toggle("is-on", i === f); });
      /* die alte Szene im Quadrat spielt jedes Mal neu, wenn es nach vorn kommt */
      if ((changed || replay) && orbit && window.NAHLIO && NAHLIO.qaShow) NAHLIO.qaShow(cards[f]);
    }

    function update() {
      var p = progress(track);
      var t = (p.y - p.span * 0.03) / (p.span * TITLE);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      if (Math.abs(t - lastT) > 0.002) { lastT = t; bq.style.setProperty("--t", t.toFixed(3)); }
      var on = t > 0.62, turnedOn = on && orbit === false;
      if (on !== orbit) { orbit = on; bq.classList.toggle("is-orbit", on); }
      var seg = p.span * (1 - TITLE - 0.03) / 3;
      var pos = (p.y - p.span * (TITLE + 0.03)) / seg;
      var f = Math.floor(pos);
      f = !on || f < 0 ? 0 : f > 2 ? 2 : f;
      setFront(f, turnedOn);
      /* kleiner werden: kurz voll stehen lassen, dann bis zum Wechsel schrumpfen */
      var u = on ? (pos - f - 0.12) / 0.88 : 0;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      setK(f, 1 - SHRINK * (u * u * (3 - 2 * u)));
    }

    bq.classList.add("is-live");
    jobs.push(update);
  })();

  /* --- Seitenlinie: In den beiden stehenden Sektionen laeuft sie nicht hinter Text und Handy durch. Sie blendet
     kurz davor weich aus und danach wieder ein (Maske auf der Linienebene, in Seitenkoordinaten). ------------ */
  var line = document.querySelector("[data-pageline]");
  var hideIn = [document.querySelector(".ks__track"), document.querySelector(".bq__track")].filter(Boolean);
  var lastMask = "";
  function maskLine() {
    if (!line || !hideIn.length) return;
    var top = line.getBoundingClientRect().top, F = Math.min(260, window.innerHeight * 0.3);
    var ranges = hideIn.map(function (el) { var r = el.getBoundingClientRect(); return [r.top - top, r.bottom - top]; });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    ranges.forEach(function (r) {
      var m = merged[merged.length - 1];
      if (m && r[0] <= m[1] + 2) m[1] = Math.max(m[1], r[1]); else merged.push(r.slice());
    });
    var stops = ["#000 0px"];
    merged.forEach(function (r) {
      var a = Math.round(r[0]), b = Math.round(r[1]);
      stops.push("#000 " + (a - F) + "px", "transparent " + a + "px", "transparent " + b + "px", "#000 " + (b + F) + "px");
    });
    var m = "linear-gradient(to bottom, " + stops.join(", ") + ")";
    if (m === lastMask) return;
    lastMask = m;
    line.style.webkitMaskImage = m;
    line.style.maskImage = m;
  }
  if (line && hideIn.length) {
    maskLine();
    window.addEventListener("load", maskLine);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(maskLine);
    if (window.NAHLIO && NAHLIO.onRecalc) NAHLIO.onRecalc(maskLine);
    var mt = 0;
    window.addEventListener("resize", function () { window.clearTimeout(mt); mt = window.setTimeout(maskLine, 150); });
  }

  if (!jobs.length) return;
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  frame();
})();

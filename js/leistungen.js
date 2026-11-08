/* ==========================================================================
   NAHLIO — Leistungen nach der Skizze (08.11.), Stil: css/leistungen.css
   Wechsel in drei Schritten: (1) die Karte wird klein und die Nachbarn stehen gebogen daneben (.is-curve),
   (2) die Rolle dreht zur gewuenschten Leistung, (3) diese waechst wieder auf die ganze Seite, danach wischt
   "Nachher" ueber "Vorher". Pfeile, Reiter oder ein Klick auf eine Nachbarkarte (im Bogen) loesen ihn aus;
   ein weiterer Klick waehrend des Wechsels dreht einfach weiter.
   Die Mitte laesst sich ziehen; ein unsichtbarer echter Regler bedient Tastatur und Hilfstechnik.
   Erstes Erscheinen: ein Kreis wird zur Karte. Weniger Bewegung: Wechsel ohne Bogen und ohne Wischen.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.querySelector("[data-lv]");
  if (!root) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cards = Array.prototype.slice.call(root.querySelectorAll(".lv__card"));
  var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-lv-go]"));
  var live = root.querySelector("[data-lv-live]");
  var N = cards.length, active = 0, timers = [], sweepT = [];
  if (!N) return;

  function later(fn, ms, list) { (list || timers).push(window.setTimeout(fn, ms)); }
  function clear(list) { list.forEach(window.clearTimeout); list.length = 0; }
  function offsetOf(i) { var o = ((i - active) % N + N) % N; return o > N / 2 ? o - N : o; }

  function layout(instant) {
    cards.forEach(function (c, i) {
      var o = offsetOf(i), a = Math.abs(o);
      var jump = c._o !== undefined && Math.abs(c._o - o) > 2;      /* nicht quer ueber die Buehne fliegen */
      if (instant || jump) c.classList.add("is-instant");
      c.style.setProperty("--o", String(o));
      c.classList.toggle("is-active", o === 0);
      c.classList.toggle("is-side", a === 1);
      c.classList.toggle("is-far", a >= 2);
      c.setAttribute("aria-hidden", o === 0 ? "false" : "true");
      var r = c.querySelector(".lv__range");
      if (r) r.tabIndex = o === 0 ? 0 : -1;
      if (instant || jump) { void c.offsetWidth; c.classList.remove("is-instant"); }
      c._o = o;
    });
    tabs.forEach(function (t, i) { t.setAttribute("aria-current", i === active ? "true" : "false"); });
  }

  function setPos(card, v) {
    v = Math.max(0, Math.min(100, v));
    card.querySelector(".lv__cmp").style.setProperty("--pos", v.toFixed(2) + "%");
    var r = card.querySelector(".lv__range");
    if (r) { r.value = String(Math.round(v)); r.setAttribute("aria-valuetext", Math.round(v) + " % Nachher"); }
  }
  function sweep(card, delay) {
    clear(sweepT);
    if (reduce) { setPos(card, 50); return; }
    card.classList.remove("is-sweep");
    setPos(card, 4);
    later(function () {
      card.classList.add("is-sweep");
      void card.offsetWidth;
      setPos(card, 50);
      later(function () { card.classList.remove("is-sweep"); }, 1200, sweepT);
    }, delay, sweepT);
  }

  function go(i) {
    i = ((i % N) + N) % N;
    var curving = root.classList.contains("is-curve");
    if (i === active && !curving) return;
    if (live) live.textContent = "Leistung " + (i + 1) + " von " + N + ": " + (tabs[i] ? tabs[i].textContent : "");
    if (reduce) { active = i; layout(true); setPos(cards[active], 50); return; }
    clear(timers); clear(sweepT);
    var wait = curving ? 0 : 380;
    root.classList.add("is-curve");                       /* (1) klein und gebogen */
    later(function () { active = i; layout(false); }, wait);  /* (2) drehen */
    later(function () {                                       /* (3) auf die ganze Seite */
      root.classList.remove("is-curve");
      sweep(cards[active], 520);
    }, wait + 700);
  }

  /* Ziehen auf der vorderen Karte (nicht waehrend des Wechsels) */
  cards.forEach(function (card, i) {
    var cmp = card.querySelector(".lv__cmp"), range = card.querySelector(".lv__range"), drag = false;
    function move(e) { var r = cmp.getBoundingClientRect(); setPos(card, (e.clientX - r.left) / r.width * 100); }
    cmp.addEventListener("pointerdown", function (e) {
      if (!card.classList.contains("is-active") || root.classList.contains("is-curve")) return;
      clear(sweepT); card.classList.remove("is-sweep");
      drag = true;
      try { cmp.setPointerCapture(e.pointerId); } catch (err) {}
      cmp.classList.add("is-drag");
      move(e);
    });
    cmp.addEventListener("pointermove", function (e) { if (drag) move(e); });
    function end() { drag = false; cmp.classList.remove("is-drag"); }
    cmp.addEventListener("pointerup", end);
    cmp.addEventListener("pointercancel", end);
    if (range) range.addEventListener("input", function () { clear(sweepT); card.classList.remove("is-sweep"); setPos(card, Number(range.value)); });
    card.addEventListener("click", function () { if (card.classList.contains("is-side") && root.classList.contains("is-curve")) go(i); });
  });

  var prev = root.querySelector("[data-lv-prev]"), next = root.querySelector("[data-lv-next]");
  if (prev) prev.addEventListener("click", function () { go(active - 1); });
  if (next) next.addEventListener("click", function () { go(active + 1); });
  tabs.forEach(function (t) { t.addEventListener("click", function () { go(Number(t.getAttribute("data-lv-go"))); }); });

  /* Untermenue der Navigation ("Digitale Karte" usw.): die Seite scrollt zu #beispiele, dort steht gleich
     die gewaehlte Leistung (ohne Bogen, denn der Wechsel passiert ausserhalb des Blicks) */
  var keys = cards.map(function (c) { return c.getAttribute("data-key"); });
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("[data-show-slide]") : null;
    var i = a ? keys.indexOf(a.getAttribute("data-show-slide")) : -1;
    if (i < 0) return;
    clear(timers); clear(sweepT);
    root.classList.remove("is-curve");
    active = i; layout(true);
    if (live) live.textContent = "Leistung " + (i + 1) + " von " + N + ": " + (tabs[i] ? tabs[i].textContent : "");
    if (root.classList.contains("is-pre")) setPos(cards[active], 4);   /* der erste Auftritt wischt selbst */
    else sweep(cards[active], 700);
  });

  layout(true);
  cards.forEach(function (c) { setPos(c, 50); });

  /* Erstes Erscheinen: der Kreis wird zur Karte, dann die Verwandlung */
  if (reduce || !("IntersectionObserver" in window)) return;
  root.classList.add("is-pre");
  setPos(cards[active], 4);
  var io = new IntersectionObserver(function (entries) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    root.classList.remove("is-pre");
    root.classList.add("is-intro");
    sweep(cards[active], 1400);
    window.setTimeout(function () { root.classList.remove("is-intro"); }, 2600);
  }, { threshold: 0.4 });
  io.observe(root.querySelector(".lv__stage"));
})();

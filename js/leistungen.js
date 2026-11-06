/* ==========================================================================
   NAHLIO — Leistungen im Vorher-Nachher-Vergleich (Skizze des Inhabers, 06.11.), Stil: css/leistungen.css
   - Fuenf Karten auf einer Rolle: die mittlere vorn, die Nachbarn links und rechts schauen hervor, die
     uebrigen warten unsichtbar dahinter. Pfeile, Reiter, ein Klick auf eine Nachbarkarte oder die Links
     "Beispiel: ..." aus den Fragen (data-show-slide) holen eine Leistung nach vorn.
   - Kommt eine Karte nach vorn, wischt "Nachher" von links ueber "Vorher" bis zur Mitte: die Verwandlung.
   - Die Mitte laesst sich ziehen (Maus, Finger; senkrecht scrollt die Seite weiter) und mit den Pfeiltasten
     verschieben (unsichtbares Schiebe-Element, ein echter Regler fuer Hilfstechnik).
   - Beim ersten Erscheinen wird der Kreis ueber der Buehne zur Karte (Kreis-Ausschnitt waechst).
   Weniger Bewegung: kein Kreis, kein Wischen; alles steht sofort da.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.querySelector("[data-lv]");
  if (!root) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cards = Array.prototype.slice.call(root.querySelectorAll(".lv__card"));
  var copies = Array.prototype.slice.call(root.querySelectorAll(".lv__copy"));
  var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-lv-go]"));
  var live = root.querySelector("[data-lv-live]");
  var N = cards.length, active = 0, timers = [];
  if (!N) return;

  function names(i) { var t = tabs[i]; return t ? t.textContent : ""; }
  function offsetOf(i) {
    var o = ((i - active) % N + N) % N;
    return o > N / 2 ? o - N : o;                   /* -2 ... 2 bei fuenf Karten */
  }

  function layout(instant) {
    cards.forEach(function (c, i) {
      var o = offsetOf(i), a = Math.abs(o);
      var jump = c._o !== undefined && Math.abs(c._o - o) > 2;   /* von ganz links nach ganz rechts: nicht quer fliegen */
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
    copies.forEach(function (cp, i) { cp.classList.toggle("is-active", i === active); });
    tabs.forEach(function (t, i) { t.setAttribute("aria-current", i === active ? "true" : "false"); });
  }

  function setPos(card, v) {
    v = Math.max(0, Math.min(100, v));
    card.querySelector(".lv__cmp").style.setProperty("--pos", v.toFixed(2) + "%");
    var r = card.querySelector(".lv__range");
    if (r) { r.value = String(Math.round(v)); r.setAttribute("aria-valuetext", Math.round(v) + " % Nachher"); }
  }

  /* Verwandlung: fast nur "Vorher" sichtbar, dann wischt "Nachher" bis zur Mitte */
  function sweep(card, delay) {
    timers.forEach(window.clearTimeout); timers = [];
    if (reduce) { setPos(card, 50); return; }
    card.classList.remove("is-sweep");
    setPos(card, 4);
    timers.push(window.setTimeout(function () {
      card.classList.add("is-sweep");
      void card.offsetWidth;
      setPos(card, 50);
      timers.push(window.setTimeout(function () { card.classList.remove("is-sweep"); }, 1200));
    }, delay));
  }

  function go(i) {
    i = ((i % N) + N) % N;
    if (i === active) return;
    active = i;
    layout(false);
    sweep(cards[active], 420);
    if (live) live.textContent = "Leistung " + (active + 1) + " von " + N + ": " + names(active);
  }

  /* Ziehen auf der vorderen Karte */
  cards.forEach(function (card, i) {
    var cmp = card.querySelector(".lv__cmp"), range = card.querySelector(".lv__range"), drag = false;
    function move(e) {
      var r = cmp.getBoundingClientRect();
      setPos(card, (e.clientX - r.left) / r.width * 100);
    }
    cmp.addEventListener("pointerdown", function (e) {
      if (!card.classList.contains("is-active")) return;
      timers.forEach(window.clearTimeout); timers = [];
      card.classList.remove("is-sweep");
      drag = true;
      try { cmp.setPointerCapture(e.pointerId); } catch (err) {}
      cmp.classList.add("is-drag");
      move(e);
    });
    cmp.addEventListener("pointermove", function (e) { if (drag) move(e); });
    function end() { drag = false; cmp.classList.remove("is-drag"); }
    cmp.addEventListener("pointerup", end);
    cmp.addEventListener("pointercancel", end);
    if (range) range.addEventListener("input", function () { card.classList.remove("is-sweep"); setPos(card, Number(range.value)); });
    card.addEventListener("click", function () { if (card.classList.contains("is-side")) go(i); });
  });

  var prev = root.querySelector("[data-lv-prev]"), next = root.querySelector("[data-lv-next]");
  if (prev) prev.addEventListener("click", function () { go(active - 1); });
  if (next) next.addEventListener("click", function () { go(active + 1); });
  tabs.forEach(function (t) { t.addEventListener("click", function () { go(Number(t.getAttribute("data-lv-go"))); }); });

  /* Links aus den Fragen ("Beispiel: One-Page-Website" ...) holen die passende Leistung nach vorn */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("[data-show-slide]") : null;
    if (!a) return;
    var key = a.getAttribute("data-show-slide");
    cards.forEach(function (c, i) { if (c.getAttribute("data-key") === key) go(i); });
  });

  layout(true);
  cards.forEach(function (c) { setPos(c, 50); });

  /* Erstes Erscheinen: der Kreis wird zur Karte, dann die Verwandlung */
  if (reduce || !("IntersectionObserver" in window)) { sweep(cards[active], 0); return; }
  root.classList.add("is-pre");
  setPos(cards[active], 4);
  var stage = root.querySelector(".lv__stage");
  var io = new IntersectionObserver(function (entries) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    root.classList.remove("is-pre");
    root.classList.add("is-intro");
    sweep(cards[active], 1300);
    window.setTimeout(function () { root.classList.remove("is-intro"); }, 2600);
  }, { threshold: 0.35 });
  io.observe(stage);
})();

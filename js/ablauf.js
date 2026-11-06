/* NAHLIO — Ablauf (neu, 06.11.), Stil in css/ablauf.css. Die Leiste folgt dem Scrollen (--p), jeder Schritt
   erscheint, sobald sie ihn erreicht (einmal erreicht, bleibt er stehen). Weniger Bewegung: alles sofort da. */
(function () {
  "use strict";
  var root = document.querySelector("[data-ab]");
  if (!root) return;
  var steps = Array.prototype.slice.call(root.querySelectorAll(".ab__step"));
  var wrap = root.querySelector(".ab__wrap");
  if (!steps.length || !wrap) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { steps.forEach(function (s) { s.classList.add("is-on"); }); return; }
  root.classList.add("is-live");
  var queued = false, last = -1;
  function update() {
    queued = false;
    var r = wrap.getBoundingClientRect(), vh = window.innerHeight;
    /* 0, wenn die Schritte unten ins Bild kommen; 1, wenn ihr Ende 35 % ueber dem unteren Rand steht */
    var p = (vh * 0.9 - r.top) / (r.height + vh * 0.25);
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    if (Math.abs(p - last) > 0.002) { last = p; root.style.setProperty("--p", p.toFixed(3)); }
    var vertical = window.matchMedia("(max-width: 63.99em)").matches;
    steps.forEach(function (s, i) {
      var at = vertical ? (s.offsetTop) / (wrap.offsetHeight || 1) : i / steps.length;
      if (p >= at + 0.02 || p > 0.98) s.classList.add("is-on");
    });
  }
  function request() { if (!queued) { queued = true; window.requestAnimationFrame(update); } }
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  update();
})();

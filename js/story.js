/* ==========================================================================
   NAHLIO — Scroll-Geschichten, Stil in css/story.css
   1. Kundenweg (.ks): Der Scrollweg der Sektion ist in 12 Stufen geteilt. Jede Stufe setzt eine Klasse
      (.is-s0 ... .is-s11, aufsteigend). Die Bewegung selbst laeuft mit Zeit (CSS-Uebergaenge). Getippt werden
      die Suche (ab Stufe 1) und die Bewertung (ab Stufe 10).
      Wunsch 08.11.: Wer einmal ganz durch ist, muss es nicht noch einmal ansehen. Ist die Sektion oben aus dem
      Bild, faltet sie sich zu einer ruhigen Zusammenfassung (.is-done: alle Schritte, Handy im Endzustand,
      kein Festhalten); die Scrollposition wird dabei so verschoben, dass auf dem Bildschirm nichts springt.
   2. Scroll-Hinweis (.sg, Wunsch 08.11.): rechts eine Maus mit laufendem Rad (am Handy ein Wisch-Zeichen) und
      eine kleine Leiste mit dem Fortschritt, solange die Geschichte steht, damit niemand denkt, die Seite haenge.
      Auch ganz oben im Hero, wenn noch nicht gescrollt wurde.
   3. Uebergang (.ue, Wunsch 08.11.): "Ihr Online-Auftritt als Aushaengeschild ..." als kompaktes Band in der
      Mitte (keine ganze Seite), blendet beim ersten Erscheinen weich ein.
   Ohne Skript stehen alle Sektionen als normale Inhalte da (siehe story.css).
   ========================================================================== */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var jobs = [];
  var queued = false;
  function frame() { queued = false; jobs.forEach(function (fn) { fn(); }); }
  function request() { if (!queued) { queued = true; window.requestAnimationFrame(frame); } }
  function jumpBy(dy) {
    if (!dy) return;
    try { window.scrollTo({ top: window.pageYOffset + dy, left: 0, behavior: "instant" }); }
    catch (e) { window.scrollTo(0, window.pageYOffset + dy); }
  }

  /* Fortschritt innerhalb einer hohen Sektion mit stehender Buehne: 0 = Buehne erreicht den oberen Rand,
     1 = Buehne loest sich wieder. */
  function progress(track) {
    var r = track.getBoundingClientRect(), span = r.height - window.innerHeight;
    return { y: -r.top, span: span > 1 ? span : 1 };
  }

  /* --- Scroll-Hinweis rechts ------------------------------------------------------------------- */
  var guide = null;
  function makeGuide() {
    guide = document.createElement("div");
    guide.className = "sg" + (coarse ? " sg--touch" : "");
    guide.setAttribute("aria-hidden", "true");
    guide.innerHTML = (coarse
      ? '<span class="sg__swipe"><svg viewBox="0 0 24 24"><path d="M12 19V5m-5.5 5.5L12 5l5.5 5.5"/></svg></span>'
      : '<span class="sg__mouse"><i></i></span>') +
      '<span class="sg__txt">' + (coarse ? "Wischen" : "Scrollen") + '</span><span class="sg__bar"><i></i></span>';
    document.body.appendChild(guide);
  }
  function showGuide(on, p) {
    if (!guide) return;
    guide.classList.toggle("is-on", !!on);
    guide.classList.toggle("has-progress", p !== undefined);
    if (p !== undefined) guide.style.setProperty("--sgp", p.toFixed(3));
  }
  if (!reduce) makeGuide();

  /* Im Hero: nach kurzer Zeit ohne Scrollen zeigt der Hinweis, dass es nach unten weitergeht */
  var heroHint = 0, scrolledOnce = window.pageYOffset > 40;
  /* am Handy nicht: unten rechts laege der Hinweis auf den Knoepfen des Hero (Wunsch 09.11.); dort bleibt er der Geschichte */
  if (guide && !scrolledOnce && !coarse) heroHint = window.setTimeout(function () { if (!scrolledOnce) showGuide(true); }, 2400);
  window.addEventListener("scroll", function () {
    if (scrolledOnce || window.pageYOffset < 40) return;
    scrolledOnce = true;
    window.clearTimeout(heroHint);
  }, { passive: true });

  /* --- 1. Kundenweg --------------------------------------------------------------------------- */
  var finishKs = null;
  var ks = document.querySelector("[data-ks]");
  if (ks) (function () {
    var track = ks.querySelector(".ks__track");
    var steps = ks.querySelectorAll(".ks__step"), bars = ks.querySelectorAll(".ks__bar i");
    var N = 12;
    var STEP_OF = [0, 0, 0, 1, 1, 2, 3, 3, 3, 3, 4, 4];    /* welche Erklaerung links zu welcher Stufe gehoert */
    var typers = [];
    each(ks.querySelectorAll("[data-ks-type]"), function (el) {
      typers.push({ el: el, wrap: el.parentNode, text: el.getAttribute("data-ks-type"), timer: 0 });
    });
    var TYPE_AT = [1, 10];                              /* Suche ab Stufe 1, Bewertung ab Stufe 10 */
    var cur = -1, done = false, idle = 0, pauseHint = 0;

    function type(t, on, j) {
      window.clearTimeout(t.timer);
      if (!on) {
        t.el.textContent = "";
        t.wrap.classList.remove("has-text");
        if (j === 1) ks.classList.remove("is-review-typed");
        return;
      }
      t.wrap.classList.add("has-text");
      if (reduce || done) { t.el.textContent = t.text; if (j === 1) ks.classList.add("is-review-typed"); return; }
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

    /* Zusammenfalten, wenn die Geschichte einmal durch und oben aus dem Bild ist. Gemessen wird an der
       folgenden Sektion: sie bleibt auf dem Bildschirm genau dort, wo sie war. */
    finishKs = function () {
      if (done) return;
      var anchor = document.querySelector("[data-ue]") || ks.parentNode.nextElementSibling;
      var before = anchor ? anchor.getBoundingClientRect().top : 0;
      done = true;
      typers.forEach(function (t) { window.clearTimeout(t.timer); });
      window.clearTimeout(pauseHint);
      setState(N - 1);
      typers.forEach(function (t, j) { type(t, true, j); });
      ks.classList.add("is-done");
      each(steps, function (li) { li.setAttribute("aria-current", "false"); });
      var after = anchor ? anchor.getBoundingClientRect().top : 0;
      jumpBy(after - before);
      showGuide(false);
      if (window.NAHLIO && NAHLIO.recalc) NAHLIO.recalc();
      maskLine();
      request();
    };

    function update() {
      if (done) return;
      var p = progress(track), len = p.span / (N - 1), vh = window.innerHeight;
      var k = Math.floor((p.y + len * 0.5) / len);
      setState(k < 0 ? 0 : k > N - 1 ? N - 1 : k);
      /* Hinweis, solange die Geschichte steht (und kurz davor) */
      var pinned = p.y > -vh * 0.15 && p.y < p.span - vh * 0.05;
      if (guide) {
        var prog = Math.max(0, Math.min(1, p.y / p.span));
        if (pinned) { scrolledOnce = true; window.clearTimeout(heroHint); }
        window.clearTimeout(pauseHint);
        /* Am Handy liegt der Hinweis ueber dem Inhalt: er erscheint nur, wenn jemand mitten in der
           Geschichte innehaelt (genau dann koennte man meinen, die Seite haenge). */
        if (pinned && coarse) {
          showGuide(false, prog);
          pauseHint = window.setTimeout(function () { showGuide(true, prog); }, 1100);
        } else if (pinned) showGuide(true, prog);
        else if (scrolledOnce) showGuide(false);
      }
      /* ganz durch und weg: nach einer kurzen Scrollpause zusammenfalten (keine laufende Anker-Fahrt stoeren) */
      window.clearTimeout(idle);
      if (p.y > p.span + vh * 0.6) idle = window.setTimeout(function () {
        var q = progress(track);
        if (q.y > q.span + window.innerHeight * 0.6) finishKs();
      }, 180);
    }

    ks.classList.add("is-live");
    jobs.push(update);
  })();

  /* --- 3. Uebergang: kompaktes Band, blendet beim ersten Erscheinen ein --------------------------- */
  var ue = document.querySelector("[data-ue]");
  if (ue && !reduce && "IntersectionObserver" in window) {
    ue.classList.add("is-live");
    var ueIo = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { ue.classList.add("is-in"); ueIo.disconnect(); }
    }, { threshold: 0.35 });
    ueIo.observe(ue.querySelector(".ue__stage"));
  }

  /* --- 4. Strichmann mit den drei Fragen (Wunsch 10.11.) --------------------------------------------------
     Beim ersten Erscheinen (.is-play): zuerst die Ueberschrift, dann der Auftakt als Video (2 s). Danach (.is-idle)
     laeuft die ruhige Schleife als Video (.is-loop: Atmen, Kopf, Licht); die drei Fragen kreisen als Text um den Kopf
     (hinten hinter dem Kopf, kleiner und blasser, vorn davor). Videos statt SVG, weil der erzwungene Dunkelmodus von
     Samsung Internet Videos nicht umfaerbt. Faellt ein Video aus: die SVG-Zeichnung mit CSS-Bewegung. Reduced Motion:
     das Endbild steht (erstes Bild der Schleife, ohne WebM die Zeichnung). */
  var fr = document.querySelector("[data-frage]");
  if (fr) (function () {
    var scene = fr.querySelector(".frage__scene"), video = fr.querySelector(".frage__video"), loop = fr.querySelector(".frage__loop");
    var qs = Array.prototype.slice.call(fr.querySelectorAll(".frage__q"));
    var VX = 90, VY = 96, VW = 586, CX = 383, CY = 205, RX = 200, RY = 46, TILT = -8 * Math.PI / 180;
    var PERIOD = 16000, A0 = [200, 320, 80].map(function (d) { return d * Math.PI / 180; });
    var STILL = [195, 345, -90].map(function (d) { return d * Math.PI / 180; });
    var IN_FOR = 700;
    var raf = 0, inView = false, idleAt = 0, played = false, looping = false;
    var still = reduce || !("IntersectionObserver" in window);
    /* Chromium (auch Samsung Internet): WebM mit durchsichtigem Grund. Safari/Firefox: MP4 auf Weiss. */
    var alpha = !!video && /Chrome\/|Chromium\//.test(navigator.userAgent) && !!video.canPlayType && video.canPlayType('video/webm; codecs="vp09.00.10.08"') !== "";
    function place(ms, still) {
      var k = scene.clientWidth / VW, rx = scene.clientWidth < 480 ? RX * 0.74 : RX;
      var fade = still ? 1 : Math.max(0, Math.min(1, ms / IN_FOR)), turn = still ? 0 : ms / PERIOD * 2 * Math.PI;
      qs.forEach(function (q, i) {
        var a = (still ? STILL[i] : A0[i]) + turn, s = Math.sin(a);
        var ex = rx * Math.cos(a), ey = RY * s;
        var x = CX + ex * Math.cos(TILT) - ey * Math.sin(TILT), y = CY + ex * Math.sin(TILT) + ey * Math.cos(TILT);
        var front = still || s > 0;
        q.style.transform = "translate3d(" + ((x - VX) * k).toFixed(1) + "px," + ((y - VY) * k).toFixed(1) + "px,0) translate(-50%,-50%) scale(" + (still ? 1 : 0.91 + 0.09 * s).toFixed(3) + ")";
        q.style.zIndex = front ? "3" : "1";
        q.style.opacity = ((still ? 1 : 0.8 + 0.2 * s) * fade).toFixed(3);
      });
    }
    function tick(now) { raf = 0; place(now - idleAt, false); if (inView) raf = window.requestAnimationFrame(tick); }
    function run() { if (!raf && inView && idleAt && !reduce) raf = window.requestAnimationFrame(tick); }
    function idle() {
      if (idleAt) return;
      idleAt = performance.now(); fr.classList.add("is-idle"); run();
    }
    function quiet(p) { if (p && p.catch) p.catch(function () {}); }
    function noVideo() {                                               /* Video faellt aus: die Zeichnung uebernimmt */
      looping = false; fr.classList.remove("has-video", "is-loop");
      try { video.pause(); loop.pause(); } catch (e) {}
      idle();
    }
    function toLoop() {                                                /* Auftakt zu Ende: nahtlos in die Schleife */
      if (looping || !fr.classList.contains("has-video")) return;
      looping = true;
      loop.addEventListener("playing", function () { fr.classList.add("is-loop"); }, { once: true });
      try { loop.currentTime = 0; quiet(loop.play()); } catch (e) { noVideo(); return; }
      idle();                                                          /* bleibt die Schleife stehen: letztes Bild des Auftakts */
    }
    window.addEventListener("resize", function () { if (still) place(0, true); else if (!raf && idleAt) place(performance.now() - idleAt, false); });
    if (video && loop && (!still || alpha)) {
      var kind = alpha ? "data-webm" : "data-mp4";
      if (!alpha) fr.classList.add("frage--white");
      loop.src = loop.getAttribute(kind); loop.addEventListener("error", noVideo);
      if (!still) { video.src = video.getAttribute(kind); video.addEventListener("ended", toLoop); video.addEventListener("error", toLoop); }
      fr.classList.add("has-video");
    }
    if (still) {                                                       /* Endbild: erstes Bild der Schleife bzw. Zeichnung */
      fr.classList.add("is-play", "is-idle"); if (fr.classList.contains("has-video")) fr.classList.add("is-loop");
      place(0, true); return;
    }
    place(0, false);
    new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      if (inView && !played && es[0].intersectionRatio >= 0.3) {
        played = true; fr.classList.add("is-play");
        if (!fr.classList.contains("has-video")) idle();
        else {
          window.setTimeout(function () {
            var p; try { video.currentTime = 0; p = video.play(); } catch (e) { noVideo(); }
            if (p && p.catch) p.catch(noVideo);                        /* Abspielen gesperrt (Stromsparen): Zeichnung */
          }, 450);
          window.setTimeout(function () { if (!looping && (video.paused || video.ended)) toLoop(); }, 450 + 2000 + 1500);
          window.setTimeout(function () { if (!looping) toLoop(); }, 450 + 2000 + 6000);   /* Sicherheit */
        }
      }
      if (looping) { if (inView) quiet(loop.play()); else loop.pause(); }  /* ausserhalb des Bildes ruht die Schleife */
      run();
    }, { threshold: [0, 0.3] }).observe(scene);
  })();

  /* --- Seitenlinie: In den stehenden Sektionen laeuft sie nicht hinter Text und Bildern durch. Sie blendet
     kurz davor weich aus und danach wieder ein (Maske auf der Linienebene, in Seitenkoordinaten). ---------- */
  var line = document.querySelector("[data-pageline]");
  /* Wunsch 08.11.: auch im Hero keine Linie; sie erscheint erst in den freien Flaechen der folgenden Seiten */
  var hideIn = [document.querySelector(".hero"), document.querySelector(".ks__track"), document.querySelector(".frage"), document.querySelector(".ue__track")].filter(Boolean);
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

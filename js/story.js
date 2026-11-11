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
  if (ks) {                                                        /* Markerstrich im Titel, einmal beim Erscheinen */
    var ksTitle = ks.querySelector(".ks__title");
    if (reduce || !ksTitle || !("IntersectionObserver" in window)) ks.classList.add("is-hl");
    else new IntersectionObserver(function (es, o) {
      if (es[0].isIntersecting) { ks.classList.add("is-hl"); o.disconnect(); }
    }, { threshold: 0.6 }).observe(ksTitle);
  }
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
     Beim ersten Erscheinen (.is-play): zuerst die Ueberschrift, dann der Auftakt (1,5 s), danach (.is-idle) die ruhige
     Schleife (Atmen, Kopf, Licht); die drei Fragen kreisen als Text um den Kopf (hinten hinter dem Kopf - per Maske -,
     kleiner und blasser, vorn davor). Die Figur kommt aus einem Video mit Farbe (links) und Deckkraft (rechts) je
     Bild; ein WebGL-Canvas setzt beides Bild fuer Bild zusammen -> blaue Figur mit durchsichtigem Grund, auf hellem wie
     auf abgedunkeltem Grund (Samsung) gleich, ohne Kasten.
     Faellt ein Video aus: die SVG-Zeichnung mit CSS-Bewegung. Reduced Motion: das Endbild steht. */
  var fr = document.querySelector("[data-frage]");
  if (fr) (function () {
    var scene = fr.querySelector(".frage__scene");
    var intro = fr.querySelector('.frage__src[data-src="intro"]'), loop = fr.querySelector('.frage__src[data-src="loop"]');
    var cv = fr.querySelector(".frage__gl"), gl = glSetup(cv);
    var qs = Array.prototype.slice.call(fr.querySelectorAll(".frage__q"));
    var VX = 90, VY = 96, VW = 586, CX = 383, CY = 205, RX = 200, RY = 46, TILT = -8 * Math.PI / 180;
    var HX = 383, HY = 219, HR = 84, LOOP_S = 8, GAP = 16;           /* Kopf (Zeichnung), Schleifenlaenge, Spalt im Video */
    var PERIOD = 16000, A0 = [200, 320, 80].map(function (d) { return d * Math.PI / 180; });
    var STILL = [195, 345, -90].map(function (d) { return d * Math.PI / 180; });
    var IN_FOR = 700;
    var raf = 0, inView = false, idleAt = 0, played = false, looping = false, cur = null, drawing = 0;
    var still = reduce || !("IntersectionObserver" in window);
    var sizes = qs.map(function () { return null; });
    function head() {                                                  /* Kopfmitte wie in der Schleife (Atmen, Neigung) */
      var t = looping && loop ? loop.currentTime : 0, w = 2 * Math.PI * t / LOOP_S;
      var br = 0.5 - 0.5 * Math.cos(w), th = 1.3 * Math.PI / 180 * Math.sin(w);
      var x = 383 + 81 * Math.sin(th), y = 300 - 81 * Math.cos(th);
      return { x: 383 + (x - 383) * (1 + 0.006 * br), y: 560 + (y - 560) * (1 + 0.010 * br), r: HR * (1 + 0.008 * br) };
    }
    function place(ms, still) {
      var k = scene.clientWidth / VW, rx = scene.clientWidth < 480 ? RX * 0.74 : RX;
      var fade = still ? 1 : Math.max(0, Math.min(1, ms / IN_FOR)), turn = still ? 0 : ms / PERIOD * 2 * Math.PI;
      var h = head();
      qs.forEach(function (q, i) {
        var a = (still ? STILL[i] : A0[i]) + turn, s = Math.sin(a);
        var ex = rx * Math.cos(a), ey = RY * s;
        var x = CX + ex * Math.cos(TILT) - ey * Math.sin(TILT), y = CY + ex * Math.sin(TILT) + ey * Math.cos(TILT);
        var front = still || s > 0, sc = still ? 1 : 0.91 + 0.09 * s;
        var X = (x - VX) * k, Y = (y - VY) * k;
        q.style.transform = "translate3d(" + X.toFixed(1) + "px," + Y.toFixed(1) + "px,0) translate(-50%,-50%) scale(" + sc.toFixed(3) + ")";
        q.style.opacity = ((still ? 1 : 0.8 + 0.2 * s) * fade).toFixed(3);
        /* hinten: der Teil ueber dem Kopf wird ausgeblendet (die Figur liegt in den Canvas darunter) */
        var m = "none";
        if (!front) {
          if (!sizes[i]) sizes[i] = [q.offsetWidth, q.offsetHeight];
          var u = sizes[i][0] / 2 + ((h.x - VX) * k - X) / sc, v = sizes[i][1] / 2 + ((h.y - VY) * k - Y) / sc, r = h.r * k / sc;
          m = "radial-gradient(circle at " + u.toFixed(1) + "px " + v.toFixed(1) + "px, transparent " + r.toFixed(1) + "px, #000 " + (r + 1).toFixed(1) + "px)";
        }
        q.style.webkitMaskImage = m; q.style.maskImage = m;
      });
    }
    function tick(now) { raf = 0; place(now - idleAt, false); if (inView) raf = window.requestAnimationFrame(tick); }
    function run() { if (!raf && inView && idleAt && !reduce) raf = window.requestAnimationFrame(tick); }
    function idle() {
      if (idleAt) return;
      idleAt = performance.now(); fr.classList.add("is-idle"); run();
    }
    function quiet(p) { if (p && p.catch) p.catch(function () {}); }
    /* WebGL: Farbe (linke Haelfte) x Deckkraft (rechte Haelfte) -> vormultipliziertes RGBA */
    function glSetup(c) {
      if (!c || !c.getContext) return null;
      var o = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false };
      var g = null; try { g = c.getContext("webgl", o) || c.getContext("experimental-webgl", o); } catch (e) {}
      if (!g) return null;
      function sh(type, src) { var s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s); return g.getShaderParameter(s, g.COMPILE_STATUS) ? s : null; }
      var vs = sh(g.VERTEX_SHADER, "attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}");
      var fs = sh(g.FRAGMENT_SHADER, "precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 k;" +
        "void main(){vec3 c=texture2D(t,vec2(v.x*k.x,v.y)).rgb;float a=texture2D(t,vec2(v.x*k.x+k.y,v.y)).r;gl_FragColor=vec4(c*a,a);}");
      if (!vs || !fs) return null;
      var pr = g.createProgram(); g.attachShader(pr, vs); g.attachShader(pr, fs); g.linkProgram(pr);
      if (!g.getProgramParameter(pr, g.LINK_STATUS)) return null;
      g.useProgram(pr);
      var b = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, b); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
      var loc = g.getAttribLocation(pr, "p"); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
      var tx = g.createTexture(); g.bindTexture(g.TEXTURE_2D, tx);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      return { g: g, k: g.getUniformLocation(pr, "k") };
    }
    function fit() {
      var d = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(scene.clientWidth * d), h = Math.round(scene.clientHeight * d);
      if (w && h && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; return true; }
      return false;
    }
    function paint(v) {
      if (!gl || !v || v.readyState < 2 || !v.videoWidth) return false;
      var g = gl.g, W = v.videoWidth, hw = (W - GAP) / 2;
      try {
        g.viewport(0, 0, cv.width, cv.height);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, v);
        g.uniform2f(gl.k, hw / W, (hw + GAP) / W);
        g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT); g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
      } catch (e) { return false; }
      return true;
    }
    function frame() {
      drawing = 0; paint(cur);
      if (cur && !cur.paused && !cur.ended) drawing = window.requestAnimationFrame(frame);
    }
    function draw(v) { cur = v; if (!drawing) drawing = window.requestAnimationFrame(frame); }
    function noVideo() {                                               /* Video faellt aus: die Zeichnung uebernimmt */
      looping = false; fr.classList.remove("has-video");
      try { intro.pause(); loop.pause(); } catch (e) {}
      if (gl) { try { gl.g.clearColor(0, 0, 0, 0); gl.g.clear(gl.g.COLOR_BUFFER_BIT); } catch (e) {} }
      idle();
    }
    function toLoop() {                                                /* Auftakt zu Ende: nahtlos in die Schleife */
      if (looping || !fr.classList.contains("has-video")) return;
      looping = true;
      loop.addEventListener("playing", function () { draw(loop); }, { once: true });
      try { loop.currentTime = 0; quiet(loop.play()); } catch (e) { noVideo(); return; }
      idle();                                                          /* bleibt die Schleife stehen: letztes Bild des Auftakts */
    }
    window.addEventListener("resize", function () {
      if (fr.classList.contains("has-video") && fit()) paint(cur || loop);
      sizes = qs.map(function () { return null; });
      if (still) place(0, true); else if (!raf && idleAt) place(performance.now() - idleAt, false);
    });
    if (intro && loop && gl) {
      fr.classList.add("has-video"); fit();
      cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); gl = null; noVideo(); });
      var failed = function (e) { return e.target.tagName !== "SOURCE" || !e.target.nextElementSibling; };   /* erst wenn alle Quellen scheitern */
      loop.addEventListener("error", function (e) { if (failed(e)) noVideo(); }, true);
      intro.addEventListener("error", function (e) { if (failed(e) && !looping) toLoop(); }, true);
    }
    if (still) {                                                       /* Endbild: erstes Bild der Schleife bzw. Zeichnung */
      fr.classList.add("is-play", "is-idle"); place(0, true);
      if (fr.classList.contains("has-video")) {
        var shown = false, show = function () { if (!shown && paint(loop)) shown = true; };
        loop.addEventListener("loadeddata", show); loop.addEventListener("seeked", show); show();
        window.setTimeout(function () { if (!shown) noVideo(); }, 4000);
      }
      return;
    }
    place(0, false);
    if (fr.classList.contains("has-video")) intro.addEventListener("ended", toLoop);
    new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      if (inView && !played && es[0].intersectionRatio >= 0.3) {
        played = true; fr.classList.add("is-play");
        if (!fr.classList.contains("has-video")) idle();
        else {
          window.setTimeout(function () {
            var p; try { intro.currentTime = 0; p = intro.play(); } catch (e) { noVideo(); return; }
            if (p && p.then) p.then(function () { draw(intro); }, noVideo);   /* Abspielen gesperrt (Stromsparen): Zeichnung */
            else draw(intro);
          }, 450);
          window.setTimeout(function () { if (!looping && (intro.paused || intro.ended)) toLoop(); }, 450 + 1500 + 1500);
          window.setTimeout(function () { if (!looping) toLoop(); }, 450 + 1500 + 6000);   /* Sicherheit */
        }
      }
      if (looping) { if (inView) { quiet(loop.play()); draw(loop); } else loop.pause(); }   /* ausserhalb ruht die Schleife */
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

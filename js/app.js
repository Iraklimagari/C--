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
   3. Untermenue "Leistungen" (Desktop): Aufklapper nach dem Muster einer Seitennavigation
      (Knopf mit aria-expanded/aria-controls, darin echte Links; kein role="menu"). Zeigen
      oeffnet auf Geraeten mit Maus, Klick auf den Knopf immer; Escape, Klick daneben und
      Fokus ausserhalb schliessen. Fokus bleibt nie in einer verborgenen Liste.
   4. Mobiles Panel mit Escape, Fokusfuehrung (der Schliessen-Knopf gehoert zum Kreis) und
      Aufklapper fuer die Leistungen.
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
    /* Abschnittsgrenzen liegen oft auf Bruchteilen eines Pixels, Scrollpositionen auf ganzen
       Pixeln. Abgerundet zaehlt ein per Anker buendig unter die Leiste gesetzter Abschnitt
       sicher als "unter der Leiste" (sonst blieb die Leiste z. B. bei 2294,36 hell). */
    tops = themed.map(function (el) {
      return { el: el, top: Math.floor(el.getBoundingClientRect().top + y) };
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

  /* --- Untermenue "Leistungen" (Desktop) ------------------------------------- */
  var sub = nav.querySelector("[data-nav-sub]");
  var subBtn = sub && sub.querySelector("[data-nav-subbtn]");
  var subPanel = sub && sub.querySelector("[data-nav-subpanel]");
  if (sub && subBtn && subPanel) {
    var hoverable = window.matchMedia("(hover: hover) and (pointer: fine)");
    var leaveTimer = 0, barTimer = 0;
    var byHover = false;     /* nur per Zeigen geoeffnet: Verlassen schliesst; ein Klick haelt sie dann offen */
    function subIsOpen() { return subBtn.getAttribute("aria-expanded") === "true"; }
    function setSub(open, restoreFocus) {
      window.clearTimeout(leaveTimer);
      if (!open) byHover = false;
      if (open === subIsOpen()) return;
      /* Fokus nie in einer Liste lassen, die gleich unsichtbar wird. */
      if (!open && subPanel.contains(document.activeElement)) {
        if (restoreFocus) { try { subBtn.focus({ preventScroll: true }); } catch (e) { subBtn.focus(); } }
        else document.activeElement.blur();
      }
      subBtn.setAttribute("aria-expanded", open ? "true" : "false");
      subPanel.classList.toggle("is-open", open);
      /* Das Menue setzt die Leiste fort: sie bleibt deckend, bis es ganz zu ist (nav.css: 360 ms). */
      window.clearTimeout(barTimer);
      if (open) nav.classList.add("has-sub");
      else barTimer = window.setTimeout(function () { nav.classList.remove("has-sub"); }, 370);
    }
    /* Klick auf den Knopf: auf/zu. War die Liste gerade nur per Zeigen offen, bleibt sie offen (sonst wuerde
       der Klick, mit dem man auf dem Knopf ankommt, sie sofort wieder schliessen). */
    subBtn.addEventListener("click", function () {
      if (subIsOpen() && byHover) { byHover = false; window.clearTimeout(leaveTimer); return; }
      setSub(!subIsOpen(), false);
    });
    /* Zeigen oeffnet (nur mit Maus); beim Verlassen kurz warten, damit der Weg zur Liste nicht schliesst. */
    sub.addEventListener("pointerenter", function (e) {
      if (e.pointerType !== "mouse" || !hoverable.matches) return;
      window.clearTimeout(leaveTimer);
      if (!subIsOpen()) { setSub(true); byHover = true; }
    });
    sub.addEventListener("pointerleave", function (e) {
      if (e.pointerType !== "mouse" || !hoverable.matches || !byHover) return;
      window.clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(function () { if (!sub.contains(document.activeElement)) setSub(false); }, 180);
    });
    sub.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && subIsOpen()) { e.stopPropagation(); setSub(false, true); }
    });
    sub.addEventListener("focusout", function (e) {
      if (subIsOpen() && e.relatedTarget && !sub.contains(e.relatedTarget)) setSub(false);
    });
    document.addEventListener("pointerdown", function (e) { if (subIsOpen() && !sub.contains(e.target)) setSub(false); });
    /* Auswahl einer Leistung: Liste schliessen; der Link springt wie gewohnt. */
    subPanel.addEventListener("click", function (e) { if (e.target.closest("a")) setSub(false); });
  }

  /* --- Mobiles Panel -------------------------------------------------------- */
  var toggle = nav.querySelector("[data-nav-toggle]");
  var panel = document.getElementById("nav-panel");
  if (!toggle || !panel) return;

  var pSubBtn = panel.querySelector("[data-nav-panel-subbtn]");
  var pSub = pSubBtn && document.getElementById(pSubBtn.getAttribute("aria-controls"));
  function setPanelSub(open) {
    if (!pSubBtn || !pSub) return;
    pSubBtn.setAttribute("aria-expanded", open ? "true" : "false");
    pSub.hidden = !open;
  }
  if (pSubBtn) pSubBtn.addEventListener("click", function () { setPanelSub(pSubBtn.getAttribute("aria-expanded") !== "true"); });

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", toggle.getAttribute(open ? "data-label-close" : "data-label-open") || "");
    panel.hidden = !open;
    nav.classList.toggle("is-open", open);              /* Leiste und Panel: eine dunkle Flaeche (nav.css) */
    document.body.classList.toggle("nav-open", open);    /* Seite darunter scrollt nicht mit */
    if (open) {
      var first = panel.querySelector("a, button");
      if (first) first.focus();
    } else {
      setPanelSub(false);
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

  /* Fokus bleibt bei geoeffnetem Menue zwischen Schliessen-Knopf und Panel. */
  function cycle() {
    return [toggle].concat(Array.prototype.slice.call(panel.querySelectorAll("a[href], button:not([disabled])"))
      .filter(function (el) { return el.offsetParent !== null; }));
  }
  function trap(e) {
    if (e.key !== "Tab" || panel.hidden) return;
    var f = cycle(), i = f.indexOf(document.activeElement);
    if (i < 0) return;
    var to = e.shiftKey ? (i === 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
    e.preventDefault();
    f[to].focus();
  }
  panel.addEventListener("keydown", trap);
  toggle.addEventListener("keydown", trap);

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
   NAHLIO — durchgehende Linie (wie in nahlio-site-neu, etwas schneller)
   Eine durchgehende Linie ueber die ganze Startseite (eine Ebene in <main>, line.css), mit Farbverlauf und
   aus kurzen Stuecken zusammengesetzt, damit beim Scrollen nur das wachsende Stueck neu gemalt wird:
   - Hero: von links ausserhalb durch alle Geraete (weiche Kurve), HINTER allen Bildern
     (Wunsch 28.10.; data-line-front koennte sie einzeln nach vorn holen), dann NACH UNTEN in den naechsten Abschnitt — kein Ende am
     rechten Rand, kein neuer Anfang links.
   - Danach weite Schwuenge von Seite zu Seite und Schleifen als Ornament. Schleifen
     sitzen bevorzugt in freien Flaechen: Jeder Schleifenplatz wird gegen Texte, Karten
     und dunkle Abschnitte gewertet; ohne freien Platz wird es ein Schwung.
   - Gezeichnet wird bis knapp unter die Fenstermitte, mit Nachlauf (TAU).
   - Beim Oeffnen zeichnet sich die Linie zeitgesteuert durch den Hero; dieselbe Zeitachse
     blendet die Geraete nacheinander ein (html.hero-intro, hero.css) und beendet den Auftakt.
   Reduced Motion: Linie fertig gezeichnet, keine Bewegung.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var layer = document.querySelector("[data-pageline]");
  if (!layer) { root.classList.remove("hero-intro"); return; }
  var main = layer.parentElement;
  var svg = layer.querySelector("svg");
  var path = layer.querySelector("[data-line-main]");
  var NS = "http://www.w3.org/2000/svg";

  var STEPS = 40;                 /* Stuetzpunkte je Kurvenstueck fuer Laenge und Hoehe (sampleLine) */
  var TAU = 0.05;                 /* Nachlauf in Sekunden: nach ~3 x TAU = 0,15 s aufgeholt (nahlio-site-neu 0,34) */
  var LEAD = 0.55;                /* Spitze der Linie etwa in Fenstermitte: sie geht mit (Wunsch 27.10.; vorher 0,9) */
  var SMOOTH = 0.45;              /* Fensterhoehen, ueber die der Fortschritt gemittelt wird (Schleifen, flache Zuege) */
  var INTRO_DELAY = 0.15;         /* s bis die Linie im Hero loszieht */
  var INTRO_DUR = 2.2;            /* s fuer den Weg durch den Hero (nahlio-site-neu: 3,4) */

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function svgEl(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  function boxInMain(el) {
    var x = 0, y = 0, n = el;
    while (n && n !== main) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    if (n !== main) {                 /* offsetParent-Kette erreicht main nicht: ueber das Rechteck */
      var r = el.getBoundingClientRect(), m = main.getBoundingClientRect();
      return { x: r.left - m.left, y: r.top - m.top, w: r.width, h: r.height };
    }
    return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
  }
  /* Zeichenflaeche in festen Pixeln, genau so gross wie ihre viewBox (plus Reserve nach unten): Sie wird nie
     skaliert. Waechst oder schrumpft die Seite (FAQ auf/zu), bleibt die Linie, wo sie ist; den Ueberstand
     schneidet die Ebene ab (overflow: hidden). Frueher: 100 % der Seite -> Linie rutschte und sprang. */
  function sizeSvg(el, W, H, vh) {
    var h = Math.round(H + vh * 1.5);
    el.setAttribute("viewBox", "0 0 " + W + " " + h);
    el.style.width = W + "px";
    el.style.height = h + "px";
  }
  function rectInMain(el, mr) {
    var r = el.getBoundingClientRect();
    return { x0: r.left - mr.left, y0: r.top - mr.top, x1: r.right - mr.left, y1: r.bottom - mr.top };
  }

  /* --- Hero: Stationen in den Geraeten ------------------------------------------------------- */
  var heroEl = document.querySelector(".hero");
  var exitEl = document.querySelector("[data-line-exit]");
  var arts = [], artLens = [];
  function heroPoints() {
    arts = Array.prototype.slice.call(document.querySelectorAll(".hero .art"))
      .filter(function (a) { return a.offsetWidth && a.offsetHeight && getComputedStyle(a).display !== "none"; });
    var pts = arts.map(function (a) {
      var b = boxInMain(a);
      return { x: b.x + b.w / 2, y: b.y + b.h * 0.62, el: a };
    });
    pts.sort(function (p, q) { return p.x - q.x; });
    arts = pts.map(function (p) { return p.el; });     /* von links nach rechts, wie die Linie sie erreicht */
    return pts;
  }

  /* --- Dunkle Abschnitte (dort ist die Linie verdeckt) ---------------------------------------- */
  var DARK = ".zoom, .cta";
  var dark = [];
  function collect() {
    var mr = main.getBoundingClientRect();
    dark = Array.prototype.slice.call(document.querySelectorAll(DARK)).map(function (e) { return rectInMain(e, mr); });
  }
  function overlap(b, x0, y0, x1, y1) {
    var w = Math.min(x1, b.x1) - Math.max(x0, b.x0), h = Math.min(y1, b.y1) - Math.max(y0, b.y0);
    return w > 0 && h > 0 ? w * h : 0;
  }
  /* Nur der Anteil dunkler Abschnitte (dort ist die Linie verdeckt, eine Schleife waere verschenkt). */
  function darkness(cx, cy, r) {
    var x0 = cx - r, y0 = cy - r, x1 = cx + r, y1 = cy + r, s = 0;
    dark.forEach(function (b) { s += overlap(b, x0, y0, x1, y1); });
    return s / (4 * r * r);
  }

  /* --- Farbverlauf ---------------------------------------------------------------------------- */
  /* Diagonal und gespiegelt wiederholt (reflect): Entlang der grossen Boegen wechselt die Linie weich zwischen
     hellem Aqua und Himmelblau (Vorlage des Inhabers). Farben: line.css (.pageline__stop--*). Die vordere Ebene
     verweist auf denselben Verlauf. */
  var grad = svgEl("linearGradient", { id: "pageline-grad", gradientUnits: "userSpaceOnUse", spreadMethod: "reflect",
                                       x1: "0", y1: "0", x2: "1", y2: "1" });
  ["a", "b", "c"].forEach(function (k, i) { grad.appendChild(svgEl("stop", { "class": "pageline__stop--" + k, offset: String(i / 2) })); });
  var defs = svgEl("defs", {});
  defs.appendChild(grad);
  svg.insertBefore(defs, svg.firstChild);
  function setGradient(W, vh) {
    grad.setAttribute("x2", (W * 0.5).toFixed(0));
    grad.setAttribute("y2", (vh * 1.1).toFixed(0));
  }

  /* --- Stuecke ---------------------------------------------------------------------------------- */
  /* Die Linie besteht aus vielen kurzen Pfaden (Hero, dann je Schwung oder Schleife einer). Beim Scrollen aendert
     sich nur das Stueck, das gerade waechst: Der Browser malt also pro Bild ein kurzes Stueck neu statt der ganzen
     Seite (auf dem Handy war das der Hauptgrund fuers Ruckeln). Die Ebene (.pageline) traegt die Deckkraft, so
     sind die Stoesse zwischen den Stuecken unsichtbar. */
  var group = svgEl("g", {});
  svg.appendChild(group);
  group.appendChild(path);
  var parts = [path], lens = [], starts = [], shown = [];


  function setParts(list) {
    function grow(arr, grp, cls) {
      while (arr.length < list.length) { var np = svgEl("path", { "class": cls }); grp.appendChild(np); arr.push(np); }
      while (arr.length > list.length) grp.removeChild(arr.pop());
    }
    grow(parts, group, "pageline__main");
    total = 0;
    list.forEach(function (dd, i) {
      var p = parts[i];
      p.setAttribute("d", dd);
      var L = dd.indexOf("C") > 0 ? p.getTotalLength() : 0;
      lens[i] = L; starts[i] = total; total += L; shown[i] = -1;
      p.style.strokeDasharray = L + " " + (L + 4);
    });
    lens.length = starts.length = shown.length = list.length;
  }

  /* --- Vordere Ebene (nur wenn Elemente data-line-front tragen; derzeit keine): Hero-Stueck vor ihnen ---- */
  var frontLayer = null, frontSvg = null, frontClip = null, frontPath = null, frontOn = false;
  function buildFront(W, H, vh, d, L) {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-line-front]"))
      .filter(function (e) { return e.offsetWidth && e.offsetHeight && getComputedStyle(e).display !== "none"; });
    frontOn = els.length > 0;
    if (!frontOn) { if (frontLayer) frontLayer.hidden = true; return; }
    if (!frontLayer) {
      frontLayer = document.createElement("div");
      frontLayer.className = "pageline pageline--front";
      frontLayer.setAttribute("aria-hidden", "true");
      frontSvg = svgEl("svg", { "class": "pageline__svg", focusable: "false", preserveAspectRatio: "xMinYMin meet" });
      var fdefs = svgEl("defs", {});
      frontClip = svgEl("clipPath", { id: "pageline-front-clip", clipPathUnits: "userSpaceOnUse" });
      fdefs.appendChild(frontClip);
      frontSvg.appendChild(fdefs);
      frontPath = svgEl("path", { "class": "pageline__main", "clip-path": "url(#pageline-front-clip)" });
      frontSvg.appendChild(frontPath);
      frontLayer.appendChild(frontSvg);
      main.appendChild(frontLayer);
    }
    frontLayer.hidden = false;
    sizeSvg(frontSvg, W, H, vh);
    /* Eine Flaeche um alle markierten Elemente samt Schatten und Luecken (grosszuegig erweitert): Laege die Linie
       nur ueber ihnen vorn, fielen dazwischen ihre Schatten auf sie (dunkle Streifen). */
    while (frontClip.firstChild) frontClip.removeChild(frontClip.firstChild);
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    els.forEach(function (e) {
      var b = boxInMain(e);
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
    });
    var px = 80, py = 60;
    frontClip.appendChild(svgEl("rect", { x: (x0 - px).toFixed(1), y: (y0 - py).toFixed(1),
                                          width: (x1 - x0 + 2 * px).toFixed(1), height: (y1 - y0 + 2 * py).toFixed(1) }));
    frontPath.setAttribute("d", d);
    frontPath.style.strokeDasharray = L + " " + (L + 4);
  }

  /* --- Pfad --------------------------------------------------------------------------------- */
  var heroEndY = 0, heroBottom = 0, segs = [];
  function buildPath(W, H, vh) {
    var rad = Math.PI / 180;
    var x = 0, y = 0, h = 0, list = [];
    segs = [];
    function dir(a) { return [Math.cos(a * rad), Math.sin(a * rad)]; }
    function f(n) { return n.toFixed(1); }
    function piece() { list.push("M" + f(x) + " " + f(y)); }       /* neues Stueck am aktuellen Punkt */
    /* Jedes Kurvenstueck kommt in das laufende Stueck UND in segs: daraus rechnet sampleLine() Laenge und Hoehe. */
    function cub(ax, ay, bx, by, qx, qy) {
      list[list.length - 1] += " C" + f(ax) + " " + f(ay) + " " + f(bx) + " " + f(by) + " " + f(qx) + " " + f(qy);
      segs.push([x, y, ax, ay, bx, by, qx, qy]);
      x = qx; y = qy;
    }
    /* Hero: links ausserhalb -> durch die Geraete -> nach unten in den naechsten Abschnitt */
    var hb = heroEl ? boxInMain(heroEl) : { y: 0, h: 0 };
    heroBottom = hb.y + hb.h;
    var via = heroPoints();
    if (via.length >= 2) {
      var P = [{ x: -W * 0.06, y: via[0].y - vh * 0.04 }].concat(via.map(function (q) { return { x: q.x, y: q.y }; }));
      var lv = via[via.length - 1];
      var downX = Math.min(W * 0.9, Math.max(W * 0.55, lv.x - W * 0.04));
      P.push({ x: downX, y: Math.max(lv.y + vh * 0.16, heroBottom - vh * 0.02) });
      P.push({ x: downX - W * 0.03, y: heroBottom + vh * 0.22 });          /* senkrecht hinunter */
      x = P[0].x; y = P[0].y;
      piece();
      for (var j = 0; j < P.length - 1; j++) {
        var p0 = P[Math.max(0, j - 1)], p1 = P[j], p2 = P[j + 1], p3 = P[Math.min(P.length - 1, j + 2)];
        cub(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
      }
      var pe = P[P.length - 1], pp = P[P.length - 2];
      h = Math.atan2(pe.y - pp.y, pe.x - pp.x) / rad;
      heroEndY = Math.max(lv.y, heroBottom - vh * 0.02);
    } else if (exitEl) {
      /* Hero mit Bildmarke (hero-mark.js): Die Linie kommt dort als 3D-Rohr aus der Marke, wird flach und
         verlaesst den Hero an seiner Unterkante. Genau dort setzt die Seitenlinie an und laeuft nach unten. */
      var eb = boxInMain(exitEl);
      x = eb.x; y = eb.y; h = 90;
      piece();                                    /* Stueck 0: der Hero */
      heroEndY = y;                               /* nichts vorgezeichnet: die Linie kommt erst beim Scrollen (folgt) */
      /* Wunsch 03.11.: kein Schweif, keine Kruemmung nach unten: zuerst ein gerader, senkrechter Zug aus der Marke
         heraus bis unter den Hero; erst danach beginnen die grossen Boegen. */
      var drop = Math.max(heroBottom - y + vh * 0.32, vh * 0.42);
      cub(x, y + drop / 3, x, y + drop * 2 / 3, x, y + drop);
    } else {
      x = W * 0.8; y = -vh * 0.15; h = 112;
      piece();                                    /* leeres Hero-Stueck: Stueck 0 ist immer der Hero */
      heroEndY = 0;
    }

    /* Danach (Wunsch 27.10., Vorbild: riesige, weiche Linie): wenige, sehr grosse Boegen von Seite zu Seite; die
       Scheitel liegen knapp innerhalb des Seitenrands, dort wendet die Linie weich (kein Haken), bleibt aber sichtbar.
       Jede zweite Bewegung ist eine riesige Schleife, die sich selbst kreuzt (nicht in dunklen Abschnitten, dort
       waere sie verdeckt). Keine kleinen Kringel: alle Punkte werden als eine glatte Kurve verbunden (through),
       je Bogen ein Stueck. Der "Zufall" ist fest (rnd mit festem Startwert): gleiche Linie bei jedem Aufruf. */
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    /* Glatte Kurve durch Punkte: Richtung je Punkt aus den Nachbarn, Henkel = 0,42 x Abstand; am Anfang in
       Fahrtrichtung h (schliesst ohne Knick an den Hero an). */
    function through(pts) {
      var n = pts.length;
      var T = pts.map(function (p, i) {
        if (i === 0) return dir(h);
        var a = pts[i - 1], b = pts[Math.min(n - 1, i + 1)], vx = b.x - a.x, vy = b.y - a.y, l = Math.sqrt(vx * vx + vy * vy) || 1;
        return [vx / l, vy / l];
      });
      for (var i = 0; i < n - 1; i++) {
        var p = pts[i], q = pts[i + 1], d = Math.sqrt((q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y)) * 0.42;
        piece();
        cub(p.x + T[i][0] * d, p.y + T[i][1] * d, q.x - T[i + 1][0] * d, q.y - T[i + 1][1] * d, q.x, q.y);
      }
    }
    var D = vh * (W < 768 ? 0.85 : 1.1), LR = Math.min(W * 0.27, vh * 0.42);
    var side = x > W / 2 ? -1 : 1, wp = [{ x: x, y: y }], cy = y, k = 0;
    while (cy < H + vh * 1.5 && k < 60) {
      var c = { x: W * (0.5 + side * 0.06), y: cy + D * 0.95 };
      if (k % 2 === 1 && darkness(c.x, c.y, LR) < 0.2) {
        [[1.25, -0.55], [0.35, 0.95], [-0.95, 0.2], [-0.25, -0.85], [0.75, -0.2]]      /* riesige Schleife */
          .forEach(function (o) { wp.push({ x: c.x + side * LR * o[0], y: c.y + LR * o[1] }); });
        cy = c.y + LR * 0.6 + D * 0.35;
        wp.push({ x: W * (0.5 + side * 0.46), y: cy });                                 /* hinaus zum Rand */
      } else {
        cy += D * (0.9 + rnd() * 0.25);
        wp.push({ x: W * (0.5 + side * (0.43 + rnd() * 0.05)), y: cy });              /* grosser Bogen hinueber */
      }
      side = -side;
      k++;
    }
    through(wp);
    return list;
  }

  /* --- Laenge zu Hoehe ----------------------------------------------------------------------- */
  /* Frueher 900 x getPointAtLength(): kostete im Browser je Neubau ueber 3 s und liess Auftakt und Scrollen
     ruckeln. Jetzt werden die Kurvenstuecke selbst abgetastet: Laenge bis zu jedem Stuetzpunkt (cumL) und das
     bis dahin tiefste y (maxY), auf die Laenge des Browsers (getTotalLength) geeicht. */
  var total = 0, cumL = null, maxY = null, H = 1, topInDoc = 0;
  function sampleLine() {
    var c = [], m = [], len = 0, low = -Infinity, px = 0, py = 0;
    segs.forEach(function (s, k) {
      for (var j = k ? 1 : 0; j <= STEPS; j++) {
        var t = j / STEPS, u = 1 - t, a = u * u * u, b = 3 * u * u * t, e = 3 * u * t * t, g = t * t * t;
        var qx = a * s[0] + b * s[2] + e * s[4] + g * s[6], qy = a * s[1] + b * s[3] + e * s[5] + g * s[7];
        if (c.length) len += Math.sqrt((qx - px) * (qx - px) + (qy - py) * (qy - py));
        if (qy > low) low = qy;
        c.push(len); m.push(low); px = qx; py = qy;
      }
    });
    var k = len ? total / len : 1;
    for (var i = 0; i < c.length; i++) c[i] *= k;
    cumL = c; maxY = m;
    /* Wo die Linie jedes Bild erreicht: Das i-te Hero-Kurvenstueck endet im i-ten Bild. */
    artLens = arts.map(function (a, i) { return c[Math.min(c.length - 1, (i + 1) * STEPS)]; });
  }
  function lenAtY(y) {
    if (!maxY || !maxY.length || y <= maxY[0]) return 0;
    var n = maxY.length - 1;
    if (y >= maxY[n]) return total;
    var lo = 0, hi = n;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (maxY[mid] < y) lo = mid; else hi = mid; }
    return cumL[lo] + (cumL[hi] - cumL[lo]) * (y - maxY[lo]) / ((maxY[hi] - maxY[lo]) || 1);
  }
  /* Gezeichnet wird bis zur Fenstermitte. Schleifen und flache Zuege liegen fast auf einer Hoehe; damit sie nicht
     auf einen Schlag erscheinen, wird die Laenge ueber ein Hoehenfenster (SMOOTH) gemittelt: Sie wachsen beim
     Scrollen gleichmaessig mit. Der Hero ist immer ganz gezeichnet. */
  function targetLength() {
    if (!cumL) return 0;
    if (NAHLIO.isReduced()) return total;
    var vh = window.innerHeight, y = window.pageYOffset + vh * LEAD - topInDoc, w = vh * SMOOTH, s = 0;
    for (var k = 0; k <= 8; k++) s += lenAtY(y + w * (k / 8 - 0.5));
    return Math.min(total, Math.max(s / 9, lenAtY(heroEndY)));
  }

  /* --- Auftakt im Hero: Linie und Geraete auf einer Zeitachse --------------------------------- */
  var cur = 0, target = 0, running = false, lastT = 0;
  var introOn = root.classList.contains("hero-intro") && !NAHLIO.isReduced();
  var intro = true, introT0 = 0, introGoal = 0;
  /* Halb gleichmaessig, halb weich: Die Linie erreicht das erste Bild rasch und wird am Ende ruhiger. */
  function ease(t) { return 0.5 * t + 0.25 * (1 - Math.cos(Math.PI * t)); }
  function introCur(now) {
    if (!introT0) return 0;
    var t = (now - introT0) / (INTRO_DUR * 1000);
    return t <= 0 ? 0 : ease(t >= 1 ? 1 : t) * introGoal;
  }
  /* Wunsch 30.10.: Von links nach rechts, nie alle zugleich: Ein Bild springt erst auf, wenn die Linie es erreicht
     (TOUCH vor seiner Mitte, etwa seine linke Kante). Es steigt dabei von unten auf und erscheint etwas groesser (POP);
     hat die Linie seine Mitte passiert, wird es auf seine Groesse kleiner. */
  var RISE_MS = 460, RISE_PX = 70, POP = 0.12, SHRINK_LEAD = 10, SHRINK_LEN = 220, touched = [];
  function devicesTick(now) {
    if (!introOn) return;
    arts.forEach(function (a, k) {
      if (!touched[k] && cur >= (artLens[k] || 0) - a.offsetWidth * 0.55) touched[k] = now;
      var u = touched[k] ? clamp01((now - touched[k]) / RISE_MS) : 0, rise = 1 - Math.pow(1 - u, 3);
      var s = clamp01((cur - (artLens[k] || 0) - SHRINK_LEAD) / SHRINK_LEN);
      s = s * s * (3 - 2 * s);
      a.style.opacity = String(clamp01(u * 2.2));
      var v = a.querySelector(".art__visual");
      if (v) v.style.transform = "translateY(" + ((1 - rise) * RISE_PX).toFixed(1) + "px) scale(" + (1 + POP * (1 - s)).toFixed(4) + ")";
    });
  }
  function introDone() {
    intro = false;
    if (introOn) {
      arts.forEach(function (a) {
        a.style.opacity = "";
        var v = a.querySelector(".art__visual");
        if (!v) return;
        /* Wer vorher scrollt: das Bild gleitet noch auf seine Groesse, statt zu springen. */
        v.style.transition = "transform 280ms ease-out";
        v.style.transform = "";
        window.setTimeout(function () { v.style.transition = ""; }, 300);
      });
    }
    introOn = false;
    root.classList.remove("hero-intro");
  }

  /* --- Bauen -------------------------------------------------------------------------------- */
  /* Neu gebaut wird nur, wenn sich etwas oberhalb der FAQ verschiebt (Breite, Fensterhoehe, Bilder, Schriften).
     Klappt eine FAQ-Antwort auf, waechst nur die Seite darunter: dann bleibt der Pfad, nur die Zeichenflaeche
     waechst mit (sonst wuerde die Linie beim Antippen einer Frage springen). */
  /* Wichtig: Beide Zeichenflaechen haben eine feste Pixelgroesse (sizeSvg) und sind oben links verankert: beim
     Auf- und Zuklappen der FAQ wird nichts skaliert oder verschoben. */
  var lastSig = "", lastH = 0, faqSec = document.querySelector(".faq-sec");
  function layoutSig(W, vh) {
    var ex = exitEl ? boxInMain(exitEl) : null;     /* Uebergabe aus dem Hero (hero-mark.js) verschoben: neu bauen */
    return [W, vh, faqSec ? Math.round(boxInMain(faqSec).y) : 0, ex ? Math.round(ex.x) + "," + Math.round(ex.y) : ""].join("|");
  }
  /* Handy: Blendet sich beim Scrollen die Adressleiste ein oder aus, aendert sich nur die Fensterhoehe. Darauf
     baut die Linie nicht neu (sie sprang dabei); erst eine andere Breite oder ein grosser Sprung (Drehen) zaehlt. */
  var coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  var lockW = 0, lockH = 0;
  function viewH(W) {
    var h = window.innerHeight;
    if (coarse && W === lockW && Math.abs(h - lockH) < lockH * 0.25) return lockH;
    lockW = W; lockH = h;
    return h;
  }
  function build() {
    var W = main.offsetWidth;
    H = main.offsetHeight;
    if (!W || !H) return;
    var vh = viewH(W);
    if (!introT0) introT0 = window.performance.now() + INTRO_DELAY * 1000;
    topInDoc = main.getBoundingClientRect().top + window.pageYOffset;
    var sig = layoutSig(W, vh);
    if (cumL && sig === lastSig) {
      if (H !== lastH) {
        sizeSvg(svg, W, H, vh);
        if (frontSvg) sizeSvg(frontSvg, W, H, vh);
        lastH = H;
      }
      target = targetLength();
      kick();
      return;
    }
    lastSig = sig; lastH = H;
    collect();
    sizeSvg(svg, W, H, vh);
    setGradient(W, vh);
    var list = buildPath(W, H, vh);
    setParts(list);
    buildFront(W, H, vh, list[0], lens[0]);
    sampleLine();
    target = targetLength();
    introGoal = target;
    cur = intro ? introCur(window.performance.now()) : target;
    apply(cur);
    if (NAHLIO.isReduced()) { cur = target; apply(cur); introDone(); return; }
    kick();
  }

  /* Nur Stuecke anfassen, deren gezeichnete Laenge sich aendert (auf 0,5 px gerundet); leere Stuecke ganz
     ausblenden, sonst setzt die runde Kappe am Anfang einen Punkt. Das Hero-Stueck gilt auch fuer die vordere Ebene. */
  function paint(p, L, v) {
    p.style.visibility = v ? "" : "hidden";
    p.style.strokeDashoffset = String(L - v);
  }
  function apply(len) {
    if (lens.length !== parts.length) return;        /* noch nicht gebaut (Scrollen vor dem ersten build) */
    for (var i = 0; i < parts.length; i++) {
      var L = lens[i], v = len - starts[i];
      v = v <= 0.5 ? 0 : v >= L - 0.5 ? L : Math.round(v * 2) / 2;
      if (v === shown[i]) continue;
      shown[i] = v;
      paint(parts[i], L, v);
      if (i === 0 && frontOn && frontPath) paint(frontPath, L, v);
    }
  }
  function tick(now) {
    var dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;
    if (intro) {
      cur = Math.max(cur, introCur(now));
      devicesTick(now);
      if (now >= introT0 + INTRO_DUR * 1000) introDone();
    } else {
      cur += (target - cur) * (1 - Math.exp(-dt / TAU));
      if (Math.abs(target - cur) < 0.8) { cur = target; running = false; }
    }
    apply(cur);
    if (running) window.requestAnimationFrame(tick);
  }
  function kick() {
    if (running || (!intro && Math.abs(target - cur) < 0.8)) return;
    running = true;
    lastT = window.performance.now();
    window.requestAnimationFrame(tick);
  }

  /* Wer waehrend des Auftakts weiterscrollt, bekommt den fertigen Hero; die Linie folgt dann dem Scrollen. */
  window.addEventListener("scroll", function () {
    if (intro && window.pageYOffset > 40) introDone();
    target = targetLength();
    kick();
  }, { passive: true });
  window.addEventListener("load", build);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build).catch(function () {});
  NAHLIO.onRecalc(build);
  /* Ohne Hero-Auftakt (Sprungziel, Neuladen weiter unten): keine Zeitachse, nur der normale Nachlauf. */
  if (!introOn) { intro = false; root.classList.remove("hero-intro"); }
  build();
})();

/* ==== 30-pop.js ==== */
/* ==========================================================================
   NAHLIO — Einblenden (eine Engine fuer die ganze Seite)
   1. Hero: Ueberschrift und Geraete beim Laden (html.hero-intro aus dem Startskript, Stil in hero.css);
      der endliche gemeinsame Zeitplan in 25-line.js besitzt auch den Abschluss.
      Die Knoepfe sind sofort bedienbar, nichts wartet auf Bilder.
   2. Alle Elemente mit data-pop erscheinen einmal, sobald sie ins Fenster kommen (IntersectionObserver).
      Was im selben Moment sichtbar wird, bekommt in Lesereihenfolge --pop-order 0, 1, 2 ... und
      ueberlappt um --pop-step; was allein hereinkommt, startet sofort. So entsteht am Handy keine
      Warteschlange ausserhalb des Fensters. Stil in motion.css (und lokal, z. B. customer-path.css).
   Sicherheit: NAHLIO.popReady wird erst nach erfolgreicher Einrichtung gemeldet; fehlt die Meldung,
   schaltet das Startskript im Seitenkopf die Einblender nach 4 s ab. Tritt hier ein Fehler auf, wird
   sofort alles sichtbar. Reduced Motion und ohne IntersectionObserver: alles sofort sichtbar.
   ========================================================================== */
(function () {
  "use strict";

  var els = Array.prototype.slice.call(document.querySelectorAll("[data-pop]"));
  function showAll() { els.forEach(function (el) { el.classList.add("is-in"); }); }
  var MAX_ORDER = 6;                 /* laengste Ueberlappung: 6 x --pop-step */

  try {
    /* Wer per Tastatur ins noch unsichtbare Element springt, sieht es sofort. */
    document.addEventListener("focusin", function (e) {
      var el = e.target && e.target.closest ? e.target.closest("[data-pop]") : null;
      if (el) el.classList.add("is-in");
    });

    if (!els.length || !("IntersectionObserver" in window) || NAHLIO.isReduced()) {
      showAll();
    } else {
      var io = new IntersectionObserver(function (entries) {
        var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
        batch.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
        batch.forEach(function (el, i) {
          el.style.setProperty("--pop-order", String(Math.min(i, MAX_ORDER)));
          el.classList.add("is-in");
          io.unobserve(el);
        });
      }, { rootMargin: "0px 0px -4% 0px", threshold: 0 });     /* sobald etwas davon ueber dem untersten Streifen steht */
      els.forEach(function (el) { io.observe(el); });
    }
  } catch (err) {
    showAll();
  }
  NAHLIO.popReady = true;
})();

/* ==== 35-qa.js ==== */
/* ==========================================================================
   NAHLIO — Fragen "Finden Ihre Kunden online die richtigen Antworten?" (Wunsch 27.10.)
   Jede Frage spielt ab, sobald sie sichtbar ist (journey.css, .qa-anim / .is-play):
   1. Laden: Die Tuer geht auf, die Frage geht aus der dunklen Tuer hinaus (zuerst das Ende, zuletzt der
      Anfang), die Tuer geht zu, der Laden wird klein, die Antwort erscheint.
   2. Preisschild: drei Euro-Zeichen werden einzeln gestempelt, es dreht sich um, hinten steht die Frage.
   3. Nachrichtenblase: Die Frage wird getippt, mit einem kleinen Tippfehler, der korrigiert wird.
   Ohne data-qa-manual: nacheinander, sobald sichtbar (einmal). Mit data-qa-manual (Quadrate, story.js, Wunsch
   05.11.): story.js ruft NAHLIO.qaShow(frage) jedes Mal, wenn eine Frage nach vorn kommt; sie spielt dann von
   vorn. Beim Tippen stehen die Buchstaben von Anfang an an ihrem endgueltigen Platz (nur unsichtbar), deshalb
   bricht nichts anders um und nichts springt. Ohne Skript oder bei reduzierter Bewegung steht alles fertig da
   (.qa-anim wird dann gar nicht gesetzt).
   ========================================================================== */
(function () {
  "use strict";

  var list = document.querySelector(".qa-list");
  if (!list || NAHLIO.isReduced() || !("IntersectionObserver" in window)) return;
  var items = Array.prototype.slice.call(list.querySelectorAll(".qa"));
  if (!items.length) return;
  var manual = list.hasAttribute("data-qa-manual");

  /* Frage in Buchstaben zerlegen: Hilfstechnik liest den ganzen Text (visually-hidden), die Buchstaben sind
     aria-hidden. Woerter bleiben in einem nowrap-Span, Leerzeichen dazwischen, so bricht es wie vorher um. */
  function split(h) {
    var text = h.textContent, i = 0;
    var sr = document.createElement("span");
    sr.className = "visually-hidden";
    sr.textContent = text;
    var vis = document.createElement("span");
    vis.setAttribute("aria-hidden", "true");
    text.split(/(\s+)/).forEach(function (part) {
      if (!part) return;
      if (/^\s+$/.test(part)) { vis.appendChild(document.createTextNode(part)); return; }
      var w = document.createElement("span");
      w.className = "qa-w";
      Array.prototype.forEach.call(part, function (c) {
        var s = document.createElement("span");
        s.className = "qa-ch";
        s.textContent = c;
        s.style.setProperty("--i", String(i++));
        w.appendChild(s);
      });
      vis.appendChild(w);
    });
    h.textContent = "";
    h.appendChild(sr);
    h.appendChild(vis);
    return Array.prototype.slice.call(vis.querySelectorAll(".qa-ch"));
  }
  var chars = new Map(), origChars = new Map(), timers = new Map();
  items.forEach(function (it) {
    var h = it.querySelector("[data-qa-chars]");
    if (!h) return;
    var cs = split(h);
    chars.set(it, cs);
    origChars.set(it, cs.map(function (c) { return c.textContent; }));
  });
  list.classList.add("qa-anim");

  /* Zeitgeber je Frage merken, damit ein Neustart nichts Altes weiterlaufen laesst */
  function wait(item, fn, ms) {
    var id = window.setTimeout(fn, ms);
    if (!timers.has(item)) timers.set(item, []);
    timers.get(item).push(id);
  }

  /* Laden: Die Frage geht aus der Tuer hinaus. Gemessen kurz vor dem Start (Laden noch gross): --qa-exit = vom
     linken Tuerrand bis zum Anfang der Frage (bis dorthin reicht der Ausschnitt), --qa-walk = Weg, auf dem die
     Frage anfangs ganz im Laden steht. Nach dem Hinausgehen faellt der Ausschnitt weg (.is-out).
     Steht die Frage in einem skalierten Rahmen (Quadrate), werden die Masse auf ungedrehte Pixel umgerechnet. */
  function aimFromDoor(item) {
    var door = item.querySelector(".qa__door"), shop = item.querySelector(".qa__shop"), h = item.querySelector(".qa__title");
    if (!door || !shop || !h) return;
    var gap = parseFloat(getComputedStyle(item.querySelector(".qa__q")).columnGap) || 14;
    var s = shop.getBoundingClientRect(), d = door.getBoundingClientRect();
    var k = shop.offsetWidth ? s.width / shop.offsetWidth : 1;
    if (!(k > 0.05)) k = 1;
    var exit = Math.max(0, (s.right - d.left) / k + gap);
    item.style.setProperty("--qa-exit", exit.toFixed(1) + "px");
    item.style.setProperty("--qa-walk", (exit + h.offsetWidth + 4).toFixed(1) + "px");
    wait(item, function () { item.classList.add("is-out"); }, 1210);
  }

  /* Tippen: Buchstaben nacheinander sichtbar; am Ende des letzten Wortes die zwei letzten Buchstaben vertauscht
     ("erreichne"), kurz stehen lassen, zwei Mal zuruecknehmen, richtig weiter. */
  function typeIt(item, delay) {
    var cs = chars.get(item), msg = item.querySelector(".qa__msg");
    if (!cs || !cs.length) { item.classList.add("is-typed"); busy = false; next(); return; }
    var text = cs.map(function (c) { return c.textContent; }).join("");
    var m = /[A-Za-zÄÖÜäöüß]{4,}(?=[^A-Za-zÄÖÜäöüß]*$)/.exec(text);
    var steps = [], n = cs.length, k;
    function show(count, swap, ms) { steps.push({ n: count, swap: swap, wait: ms }); }
    if (m) {
      var e = m.index + m[0].length;                 /* Ende des letzten Wortes */
      for (k = 1; k <= e - 2; k++) show(k, false, 30);
      show(e - 1, true, 45);
      show(e, true, 300);                             /* Tippfehler sichtbar */
      show(e - 1, true, 80);                          /* zuruecknehmen: erst "...n", dann "..." */
      show(e - 2, false, 90);
      for (k = e - 1; k <= n; k++) show(k, false, 32);
    } else {
      for (k = 1; k <= n; k++) show(k, false, 30);
    }
    var a = m ? m.index + m[0].length - 2 : -1, b = a + 1;
    var orig = a >= 0 ? [cs[a].textContent, cs[b].textContent] : null;
    var last = null, i = 0;
    /* eigener Name: "next" ist die Warteschlange unten (vorher rief sich diese Funktion am Ende endlos selbst auf) */
    function step() {
      if (i >= steps.length) {
        if (last) last.classList.remove("is-caret");
        item.classList.add("is-typed");
        busy = false; next();
        return;
      }
      var st = steps[i++];
      if (orig) { cs[a].textContent = st.swap ? orig[1] : orig[0]; cs[b].textContent = st.swap ? orig[0] : orig[1]; }
      cs.forEach(function (c, j) { c.classList.toggle("is-on", j < st.n); });
      if (last) last.classList.remove("is-caret");
      last = st.n ? cs[st.n - 1] : null;
      if (last) last.classList.add("is-caret");
      if (msg) msg.classList.toggle("is-caret-start", !st.n);
      wait(item, step, st.wait + (i < steps.length ? Math.random() * 16 : 500));
    }
    if (msg) msg.classList.add("is-caret-start");
    wait(item, step, delay);
  }

  /* Nacheinander (Wunsch 27.10.): erst der Laden; erst wenn er fertig ist das Preisschild, danach die Nachricht.
     Die naechste Szene startet, sobald die vorige fertig UND sie selbst sichtbar ist. DONE = Dauer je Szene (ms,
     wie journey.css); die Nachricht meldet sich selbst fertig. */
  var DONE = { angebot: 2000, preise: 1850 };   /* Wunsch 28.10.: schneller (vorher 3,2 / 2,9 s) */
  var busy = false, seen = items.map(function () { return false; });
  function keyOf(it) { var m = /qa--(\w+)/.exec(it.className); return m ? m[1] : ""; }
  function play(item) {
    if (item.classList.contains("is-play")) return;
    busy = true;
    var key = keyOf(item);
    if (key === "angebot") aimFromDoor(item);
    item.classList.add("is-play");
    if (key === "kontakt") typeIt(item, 200);
    else wait(item, function () { busy = false; next(); }, DONE[key] || 2600);
  }
  function next() {
    if (busy || manual) return;
    for (var i = 0; i < items.length; i++) {
      if (items[i].classList.contains("is-play")) continue;
      if (seen[i]) play(items[i]);
      return;                                         /* immer nur die naechste in der Reihe */
    }
  }

  /* Zurueck auf Anfang: Zeitgeber stoppen, Klassen weg, Buchstaben wie vorher; danach spielt die Szene neu. */
  function reset(item) {
    (timers.get(item) || []).forEach(function (id) { window.clearTimeout(id); });
    timers.set(item, []);
    item.classList.remove("is-play", "is-out", "is-typed");
    var cs = chars.get(item), oc = origChars.get(item), msg = item.querySelector(".qa__msg");
    if (cs) cs.forEach(function (c, j) { c.textContent = oc[j]; c.classList.remove("is-on", "is-caret"); });
    if (msg) msg.classList.remove("is-caret-start");
    void item.offsetWidth;                            /* Animationen beginnen beim naechsten Setzen von vorn */
  }

  if (manual) {
    NAHLIO.qaShow = function (item) {
      if (items.indexOf(item) < 0) return;
      reset(item);
      play(item);
      busy = false;
    };
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      seen[items.indexOf(e.target)] = true;
    });
    next();
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.5 });
  items.forEach(function (it) { io.observe(it); });

  /* Zweite, einfache Pruefung beim Scrollen: Die Fragen duerfen nie unsichtbar bleiben, auch wenn der Beobachter
     einmal nicht meldet (Sprung per Anker, Hintergrund-Tab). */
  function check() {
    var vh = window.innerHeight, open = 0;
    items.forEach(function (it, i) {
      if (it.classList.contains("is-play")) return;
      open++;
      var r = it.getBoundingClientRect();
      if (r.top < vh * 0.88 && r.bottom > vh * 0.1) seen[i] = true;
    });
    next();
    if (!open) { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); }
  }
  var onScroll = NAHLIO.raf ? NAHLIO.raf(check) : check;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", check);
})();

/* ==== 40-journey.js ==== */
/* ==========================================================================
   NAHLIO — Beispiele: Leistungen im festen Rahmen
   Reiter (Tabs), Punkte, Pfeile, Wischen ueber der Buehne, Aktionen und Links mit
   data-show-slide laufen ueber EINE Funktion: select(i). Es gibt genau einen
   angezeigten Zustand (shown) und hoechstens eine offene Anfrage (pending); die
   letzte Anfrage gewinnt, nichts wird nacheinander abgespielt.
   - Vor dem Wechsel werden die Bilder der Ziel-Leistung geladen und dekodiert; bis
     dahin bleibt der bisherige Zustand stehen (Ueberschrift und Bild immer passend).
   - Gewechselt wird an Ort und Stelle: Alle Varianten liegen je Platz uebereinander
     (journey.css), nur Deckkraft und Sichtbarkeit aendern sich. Keine Hoehen, keine
     Scroll-Positionen, keine Messungen beim Wechsel.
   - Wischen: Pointer Events nur auf der Buehne (touch-action: pan-y pinch-zoom);
     senkrechte Gesten bleiben der Seite, Tippen in der Vorfuehrung bleibt Tippen.
   - Reiter nach dem ARIA-Tabs-Muster (Pfeiltasten, Pos1/Ende, automatische Auswahl).
   - Pfeile und Wischen laufen im Kreis (nach der letzten Leistung folgt die erste und umgekehrt).
   - Ein gemeinsamer Hinweis "Konzeptbeispiel" (natives popover) erklaert alle Darstellungen.
   Ereignis fuer andere Skripte: nahlio:slide (45-wa.js startet/stoppt die Vorfuehrung).
   ========================================================================== */
(function () {
  "use strict";

  var zoom = document.querySelector("[data-zoom]");
  if (!zoom) return;
  var panel = zoom.querySelector("[data-sc-panel]");
  var stage = zoom.querySelector("[data-sc-stage]");
  var strip = zoom.querySelector("[data-sc-tabs]");
  if (!panel || !stage || !strip) return;

  // Pause CSS indicators as well as the user-controlled WhatsApp sequence.
  var sceneVisible = false;
  function pauseDecorations() { zoom.classList.toggle("is-demo-paused", !sceneVisible || document.hidden); }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      sceneVisible = entries[0].isIntersecting; pauseDecorations();
    }).observe(stage);
  } else sceneVisible = true;
  document.addEventListener("visibilitychange", pauseDecorations);
  pauseDecorations();

  function all(sel, root) { return Array.prototype.slice.call((root || zoom).querySelectorAll(sel)); }

  var tabs = all("[role=tab]", strip);
  var keys = tabs.map(function (t) { return t.getAttribute("data-key"); });
  var N = keys.length;
  if (!N) return;
  var dots = all("[data-sc-dot]");
  var prevBtn = zoom.querySelector("[data-slide-prev]");
  var nextBtn = zoom.querySelector("[data-slide-next]");
  var live = zoom.querySelector("[data-sc-live]");
  /* je Leistung: ihre Varianten in allen Plaetzen (Text, Buehne, Details) */
  var items = keys.map(function (k) { return all('[data-sc-item][data-key="' + k + '"]', panel); });
  var scenes = keys.map(function (k) { return panel.querySelector('.sc__scene[data-key="' + k + '"]'); });

  var hasInert = "inert" in HTMLElement.prototype;
  var shown = 0;          /* angezeigte Leistung */
  var pending = -1;       /* angefragte Leistung, deren Bilder noch vorbereitet werden */
  var token = 0;          /* jede Anfrage bekommt eine Nummer; nur die neueste darf wechseln */
  var PREP_MAX = 900;     /* Sicherheitsgrenze: laenger wartet ein Wechsel nie auf Bilder (sie laden dann im reservierten Platz) */

  function smooth() { return !NAHLIO.isReduced(); }
  function indexOfKey(key) { return keys.indexOf(key); }

  /* --- Bilder vorbereiten ------------------------------------------------------------------- */
  /* ready[i]: Bilder der Leistung sind geladen und dekodiert (oder als fehlend markiert); dann wird ohne
     Warten gewechselt. inflight[i]: laufende Vorbereitung, wird wiederverwendet statt neu gestartet. */
  var ready = keys.map(function () { return false; });
  var inflight = keys.map(function () { return null; });
  function settleImg(im) {
    if (im.loading === "lazy") im.loading = "eager";
    var p = im.decode ? im.decode() : new Promise(function (res, rej) {
      if (im.complete) return im.naturalWidth ? res() : rej();
      im.addEventListener("load", res, { once: true });
      im.addEventListener("error", rej, { once: true });
    });
    return p.then(function () { im.classList.remove("is-broken"); }, function () {
      /* Bild fehlt: ruhige Flaeche statt Bruch-Symbol (journey.css); der Platz bleibt gleich */
      if (!im.complete || !im.naturalWidth) im.classList.add("is-broken");
    });
  }
  function prepare(i) {
    if (ready[i]) return Promise.resolve();
    if (inflight[i]) return inflight[i];
    var imgs = scenes[i] ? all("img", scenes[i]) : [];
    inflight[i] = Promise.all(imgs.map(settleImg)).then(function () { ready[i] = true; inflight[i] = null; });
    return inflight[i];
  }
  function wrap(k) { return ((k % N) + N) % N; }
  /* Nachbarn im Kreis (auch 1 <-> 5) vorsichtig vorwaermen, wenn der Browser Zeit hat. */
  var idle = window.requestIdleCallback || function (fn) { return window.setTimeout(fn, 200); };
  function warm(i) {
    idle(function () {
      [wrap(i - 1), wrap(i + 1)].forEach(function (k) { if (k !== i && !ready[k]) prepare(k); });
    });
  }

  /* --- Zustand anzeigen ------------------------------------------------------------------------- */
  function setInert(el, on) {
    if (hasInert) { el.inert = on; return; }
    if (on) el.setAttribute("aria-hidden", "true"); else if (!el.classList.contains("sc__scene")) el.removeAttribute("aria-hidden");
    all("button, a[href]", el).forEach(function (b) {
      if (b.closest(".sc__scene")) return;           /* Knoepfe der Vorfuehrung bleiben tabindex=-1 */
      b.tabIndex = on ? -1 : 0;
    });
  }
  function syncControls() {
    tabs.forEach(function (t, k) {
      t.setAttribute("aria-selected", k === shown ? "true" : "false");
      t.tabIndex = k === shown ? 0 : -1;
      t.classList.toggle("is-pending", k === pending);
    });
    dots.forEach(function (d, k) {
      d.setAttribute("aria-current", k === shown ? "true" : "false");
      d.classList.toggle("is-pending", k === pending);
    });
    /* im Kreis: beide Pfeile sind immer bedienbar (nur bei einer einzigen Leistung nicht) */
    [prevBtn, nextBtn].forEach(function (b) {
      if (!b) return;
      if (N < 2) b.setAttribute("aria-disabled", "true"); else b.removeAttribute("aria-disabled");
    });
    panel.setAttribute("aria-labelledby", tabs[shown].id);
    if (pending >= 0) panel.setAttribute("aria-busy", "true"); else panel.removeAttribute("aria-busy");
  }
  function resetStates(k) {
    if (k < 0 || !scenes[k]) return;
    all(".vis.is-before", scenes[k]).forEach(function (v) { v.classList.remove("is-before"); });
    items[k].forEach(function (el) {
      all("[aria-pressed]", el).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-compare") === "after" ? "true" : "false"); });
      all(".sc__compare.is-before", el).forEach(function (g) { g.classList.remove("is-before"); });
      all("[data-g-list]", el).forEach(function (l) { l.classList.remove("is-before"); });
    });
  }
  function announce(i) {
    if (!live) return;
    live.textContent = (live.getAttribute("data-announce") || "")
      .replace("{n}", String(i + 1)).replace("{total}", String(N)).replace("{name}", tabs[i].textContent);
  }

  function commit(i, src) {
    var prev = shown;
    pending = -1;
    if (i === prev) { syncControls(); return; }
    /* Lag der Fokus in einer Variante, die jetzt verschwindet: in denselben Platz der neuen
       Variante (sonst auf den Reiter) — ohne die Seite zu scrollen. */
    var ae = document.activeElement, slot = null;
    items[prev].forEach(function (el) { if (ae && el !== ae && el.contains(ae)) slot = el.parentElement; });
    var dir = (src === "arrow" && lastDir) ? lastDir : (function () {
      var df = i - prev; if (Math.abs(df) > N / 2) df = df > 0 ? df - N : df + N; return df >= 0 ? 1 : -1;
    })();
    lastDir = 0;
    shown = i;
    items.forEach(function (list, k) {
      list.forEach(function (el) {
        var on = k === i;
        el.classList.toggle("is-active", on);
        setInert(el, !on);
      });
    });
    resetStates(prev);
    slide(prev, i, dir);
    autoCompare(i);
    syncControls();
    closeConcept();                                    /* Hinweis gehoert zur vorigen Ansicht */
    if (slot) {
      var f = slot.querySelector('.is-active button:not([tabindex="-1"]), .is-active a[href]') || tabs[i];
      try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
    }
    if (src !== "tab" && src !== "external") announce(i);
    reveal(i);
    try { document.dispatchEvent(new CustomEvent("nahlio:slide", { detail: { key: keys[i] } })); } catch (e) {}
    warm(i);
  }

  /* Die einzige Stelle, an der eine Leistung gewaehlt wird (absolut; unbekannte Ziele werden ignoriert). */
  function select(i, src) {
    if (typeof i !== "number" || i !== Math.floor(i) || i < 0 || i >= N) return;
    var my = ++token;
    if (i === shown || ready[i]) { commit(i, src); return; }   /* sofort (hebt eine offene Anfrage auf) */
    pending = i;
    syncControls();                                            /* sofortige Rueckmeldung am Reiter/Punkt */
    Promise.race([prepare(i), new Promise(function (res) { window.setTimeout(res, PREP_MAX); })])
      .then(function () { if (my === token) commit(i, src); });
  }
  /* Vor/zurueck im Kreis: von der zuletzt angefragten Leistung aus (5 -> 1, 1 -> 5). */
  var lastDir = 0;
  function step(d) {
    if (N < 2) return;
    lastDir = d;
    select(wrap((pending >= 0 ? pending : shown) + d), "arrow");
  }

  /* --- Wechsel mit Bewegung (wie in nahlio-site-neu): die neue Leistung gleitet von der Seite herein,
     die bisherige hinaus. Richtung: Pfeil/Wischen wie gewaehlt, sonst der kuerzere Weg im Kreis. ------ */
  /* Text und Bild kommen gemeinsam (Wunsch 27.10.: vorher stand der Text schon, waehrend das Bild noch
     hereinglitt): Ueberschrift, Absatz und Details gleiten mit derselben Dauer und Kurve ein. Schneller als
     zuvor (620 statt 1000 ms, journey.css). */
  var SLIDE = ["sc-in-next", "sc-in-prev", "sc-out-next", "sc-out-prev", "sc-txt-next", "sc-txt-prev"], slideT = 0, SLIDE_MS = 620;
  function clearSlide() {
    items.forEach(function (list) {
      list.forEach(function (el) {
        el.style.transition = "none";
        SLIDE.forEach(function (c) { el.classList.remove(c); });
        void el.offsetWidth;
        el.style.transition = "";
      });
    });
  }
  function slide(a, b, dir) {
    if (!smooth() || !scenes[a] || !scenes[b]) return;
    window.clearTimeout(slideT);
    clearSlide();
    scenes[b].classList.add(dir > 0 ? "sc-in-next" : "sc-in-prev");
    scenes[a].classList.add(dir > 0 ? "sc-out-next" : "sc-out-prev");
    items[b].forEach(function (el) { if (el !== scenes[b]) el.classList.add(dir > 0 ? "sc-txt-next" : "sc-txt-prev"); });
    slideT = window.setTimeout(clearSlide, SLIDE_MS + 50);
  }

  /* --- Google: Vorher -> Nachher als Fokuswechsel (Wunsch 27.10., statt Wisch): Das Vorher-Bild wird
     unscharf und blass und tritt zurueck, das Nachher-Bild kommt scharf nach vorn; danach zeichnen sich die
     Hinweislinien (an Website UND Termin). Beim Oeffnen der Leistung einmal von selbst. ------------------ */
  var morphT = 0, autoT = 0;
  function morph(gc, state) {
    window.clearTimeout(morphT);
    gc.classList.remove("is-to-after", "is-to-before");
    void gc.offsetWidth;
    gc.classList.add("is-to-" + state);
    morphT = window.setTimeout(function () { gc.classList.remove("is-to-after", "is-to-before"); }, 400);
  }
  function autoCompare(i) {
    window.clearTimeout(autoT);
    if (keys[i] !== "google" || !smooth()) return;
    var btn = null;
    items[i].some(function (el) { btn = el.querySelector("[data-compare]"); return !!btn; });
    if (!btn) return;
    var group = btn.parentElement;
    setCompare(group, "before", true);
    autoT = window.setTimeout(function () { if (shown === i) setCompare(group, "after"); }, SLIDE_MS + 160);
  }

  /* --- Reiterleiste: gewaehlten Reiter sichtbar halten (nur waagerecht in der Leiste) -------- */
  function reveal(i) {
    var max = strip.scrollWidth - strip.clientWidth;
    if (max <= 1) return;
    var t = tabs[i], pad = 32, view = strip.scrollLeft, w = strip.clientWidth;
    var to = view;
    if (t.offsetLeft - pad < view) to = t.offsetLeft - pad;
    else if (t.offsetLeft + t.offsetWidth + pad > view + w) to = t.offsetLeft + t.offsetWidth + pad - w;
    to = Math.max(0, Math.min(max, to));
    if (Math.abs(to - view) < 1) return;
    if (strip.scrollTo) strip.scrollTo({ left: to, behavior: smooth() ? "smooth" : "auto" });
    else strip.scrollLeft = to;
  }
  /* Weicher Rand nur auf der Seite, auf der es noch weitergeht. */
  var fade = NAHLIO.raf(function () {
    var max = strip.scrollWidth - strip.clientWidth;
    strip.classList.toggle("is-fade-l", max > 1 && strip.scrollLeft > 2);
    strip.classList.toggle("is-fade-r", max > 1 && strip.scrollLeft < max - 2);
  });
  strip.addEventListener("scroll", fade, { passive: true });
  NAHLIO.onRecalc(function () { fade(); reveal(shown); });

  /* --- Eingaben ------------------------------------------------------------------------------- */
  tabs.forEach(function (t, k) { t.addEventListener("click", function () { select(k, "tab"); }); });
  strip.addEventListener("keydown", function (e) {
    var k = tabs.indexOf(document.activeElement);
    if (k < 0) return;
    var to = -1;
    if (e.key === "ArrowRight") to = (k + 1) % N;
    else if (e.key === "ArrowLeft") to = (k - 1 + N) % N;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = N - 1;
    else return;
    e.preventDefault();
    try { tabs[to].focus({ preventScroll: true }); } catch (err) { tabs[to].focus(); }
    reveal(to);
    select(to, "tab");
  });
  dots.forEach(function (d, k) { d.addEventListener("click", function () { select(k, "dot"); }); });
  /* Absicht erkennen: beim Zeigen/Fokussieren schon die Bilder der Leistung holen. */
  tabs.concat(dots).forEach(function (el) {
    var k = el.hasAttribute("data-sc-dot") ? +el.getAttribute("data-sc-dot") : indexOfKey(el.getAttribute("data-key"));
    function intent() { if (k >= 0 && !ready[k]) prepare(k); }
    el.addEventListener("pointerenter", intent);
    el.addEventListener("focus", intent);
  });
  if (prevBtn) prevBtn.addEventListener("click", function () { if (prevBtn.getAttribute("aria-disabled") !== "true") step(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { if (nextBtn.getAttribute("aria-disabled") !== "true") step(1); });

  /* Vorher / Nachher (Google): zwei Knoepfe mit eigener Beschriftung, aria-pressed zeigt den gewaehlten Zustand.
     Die Hinweise erscheinen nur im Nachher-Bild. */
  function setCompare(group, state, instant) {
    var box = scenes[shown] && scenes[shown].querySelector(".vis");
    if (!box) return;
    var gc = box.querySelector(".google-compare");
    var was = box.classList.contains("is-before") ? "before" : "after";
    if (gc && !instant && smooth() && was !== state) morph(gc, state);
    box.classList.toggle("is-before", state === "before");
    all("[data-compare]", group).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-compare") === state ? "true" : "false"); });
    group.classList.toggle("is-before", state === "before");            /* Schalter-Knopf (journey.css) */
    var item = group.closest("[data-sc-item]"), list = item && item.querySelector("[data-g-list]");
    if (list) list.classList.toggle("is-before", state === "before");
  }
  panel.addEventListener("click", function (e) {
    var seg = e.target.closest ? e.target.closest("[data-compare]") : null;
    if (seg) { window.clearTimeout(autoT); setCompare(seg.parentElement, seg.getAttribute("data-compare")); return; }
  });

  /* Hinweise am Nachher-Bild: an der tatsaechlich gezeigten Bildflaeche ausgerichtet (object-fit: contain,
     Letterbox), rechts neben dem Telefon mit feiner Linie und einem Knick. Ist dort zu wenig Platz (schmale
     Buehne), bleibt es bei der Liste unter dem Bild. Neu gesetzt bei Groessenaenderung und beim Laden des Bildes. */
  var gNotes = zoom.querySelector("[data-g-notes]");
  if (gNotes) {
    var gVis = gNotes.parentElement, gImg = gVis.querySelector("[data-google-state=after]"), gSvg = gNotes.querySelector("svg");
    var gList = zoom.querySelector("[data-g-list]"), NS = "http://www.w3.org/2000/svg";
    var layoutNotes = function () {
      var vb = gVis.getBoundingClientRect(), ib = gImg.getBoundingClientRect();
      if (!vb.width || !ib.width || !gImg.naturalWidth) return;
      var s = Math.min(ib.width / gImg.naturalWidth, ib.height / gImg.naturalHeight);
      var cw = gImg.naturalWidth * s, ch = gImg.naturalHeight * s;
      var cx = ib.left - vb.left + (ib.width - cw) / 2, cy = ib.top - vb.top + (ib.height - ch) / 2;
      /* Sichtbarer Geraeterand im Bild: 84,6 % der Bildbreite (gemessen an der Grafik). Beschriftungen duerfen
         umbrechen, brauchen aber mindestens 96 px; sonst bleibt es bei der Liste. */
      var phoneRight = cx + cw * 0.846, x0 = phoneRight + 18, avail = vb.width - 8 - x0, notes = all(".g-note", gNotes);
      var fits = window.matchMedia("(min-width: 48em)").matches && avail >= 96;
      notes.forEach(function (n) { n.style.maxWidth = Math.max(96, Math.min(avail, 220)) + "px"; });
      gNotes.classList.toggle("is-on", fits);
      if (gList) gList.classList.toggle("is-overlay", fits);
      while (gSvg.firstChild) gSvg.removeChild(gSvg.firstChild);
      if (!fits) return;
      var last = -Infinity;
      /* Wunsch 28.10.: geschwungene Linien statt Knick. Jede Ansatzstelle (data-ax "0.566,0.713" = Website UND
         Termin) bekommt ihre eigene Kurve: erst leicht nach unten weg vom Knopf, dann weich zur Spitze der
         Beschriftung. Die Linien zeichnen sich (journey.css), die Ansatzpunkte pulsieren. */
      var dip = Math.min(26, ch * 0.03);
      notes.forEach(function (n, k) {
        var axs = n.getAttribute("data-ax").split(",").map(function (v) { return cx + cw * +v; });
        var ay = cy + ch * +n.getAttribute("data-ay");
        var bws = n.getAttribute("data-bw"), boxed = !!bws;
        var bhh = boxed ? ch * +n.getAttribute("data-bh") : 0;
        /* Mit Markierung (Website + Termin): Die Beschriftung sitzt ueber den Knoepfen, die Linie fuehrt von der
           Oberkante der Rahmen nach oben und dann geradeaus; sie kreuzt keinen Knopf mehr. */
        var rise = bhh * 0.9 + 18, ty = ay - bhh / 2 - rise;
        var ly = boxed ? ty : Math.max(ay, last + n.offsetHeight + 12); last = ly;
        n.style.left = x0 + "px"; n.style.top = (ly - n.offsetHeight / 2) + "px";
        n.style.setProperty("--g-i", String(k));
        var lx = x0 - 2, d = "";
        if (boxed) {
          axs.forEach(function (px, j) {
            d += "M" + px.toFixed(1) + " " + (ay - bhh / 2).toFixed(1) + " V" + ty.toFixed(1) + " ";
            var w = cw * +bws.split(",")[j], rect = document.createElementNS(NS, "rect");
            rect.setAttribute("x", (px - w / 2 - 3).toFixed(1)); rect.setAttribute("y", (ay - bhh / 2 - 3).toFixed(1));
            rect.setAttribute("width", (w + 6).toFixed(1)); rect.setAttribute("height", (bhh + 6).toFixed(1));
            rect.setAttribute("rx", ((bhh + 6) / 2).toFixed(1));
            rect.setAttribute("class", "g-notes__box");
            rect.style.setProperty("--g-i", String(k));
            gSvg.appendChild(rect);
          });
          d += "M" + Math.min.apply(null, axs).toFixed(1) + " " + ty.toFixed(1) + " H" + lx.toFixed(1);
        } else axs.forEach(function (px) {
          var span = lx - px;
          d += "M" + px.toFixed(1) + " " + ay.toFixed(1) + " C" + (px + span * 0.15).toFixed(1) + " " + (ay + dip).toFixed(1) + " " +
               (lx - span * 0.35).toFixed(1) + " " + ly.toFixed(1) + " " + lx.toFixed(1) + " " + ly.toFixed(1) + " ";
        });
        var line = document.createElementNS(NS, "path");
        line.setAttribute("d", d);
        line.setAttribute("pathLength", "1");
        line.setAttribute("class", "g-notes__line");
        line.style.setProperty("--g-i", String(k));
        gSvg.appendChild(line);
        if (!boxed) axs.forEach(function (px) {
          ["g-notes__pulse", "g-notes__dot"].forEach(function (cls) {
            var c = document.createElementNS(NS, "circle");
            c.setAttribute("cx", px.toFixed(1)); c.setAttribute("cy", ay.toFixed(1)); c.setAttribute("r", "4.5");
            c.setAttribute("class", cls);
            c.style.setProperty("--g-i", String(k));
            gSvg.appendChild(c);
          });
        });
      });
    };
    var notesFrame = 0, queueNotes = function () { if (!notesFrame) notesFrame = window.requestAnimationFrame(function () { notesFrame = 0; layoutNotes(); }); };
    if (window.ResizeObserver) new ResizeObserver(queueNotes).observe(gVis);
    gImg.addEventListener("load", queueNotes);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueNotes);
    queueNotes();
  }

  /* Aktionen: Vorfuehrung neu starten, zum anderen Beispiel. */
  panel.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-slide-action]") : null;
    if (!btn) return;
    var act = btn.getAttribute("data-slide-action");
    if (act === "goto") select(indexOfKey(btn.getAttribute("data-target")), "action");
    else if (act === "replay") {
      try { document.dispatchEvent(new CustomEvent("nahlio:wa-replay")); } catch (err) {}
    }
  });

  /* Links aus Fragen und dem Untermenue "Leistungen": Leistung waehlen, der Link springt danach wie
     gewohnt. Klicks mit Zusatztaste (neuer Tab/neues Fenster) bleiben ganz dem Browser ueberlassen. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("[data-show-slide]") : null;
    if (!a || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    select(indexOfKey(a.getAttribute("data-show-slide")), "external");
  });
  /* Ankunft von einer anderen Seite (index.html?leistung=google#beispiele): diese Leistung zeigen. */
  var wanted = null;
  try { wanted = new URLSearchParams(window.location.search).get("leistung"); } catch (e) { wanted = null; }

  /* --- Wischen ueber der Buehne ----------------------------------------------------------------
     Nur Touch und Stift. Eine Geste wird waagerecht, wenn sie die Totzone verlaesst und deutlich
     waagerecht ist (RATIO); sonst gehoert sie der Seite (der Browser scrollt und meldet
     pointercancel). Gewechselt wird beim Loslassen ab COMMIT, hoechstens um eine Leistung. */
  var DEAD = 10, RATIO = 1.5;
  var g = null, suppressUntil = 0;
  stage.addEventListener("pointerdown", function (e) {
    if (g) { g = null; return; }                         /* zweiter Finger: Zoom, keine Wischgeste */
    if (!e.isPrimary || e.pointerType === "mouse") return;
    if (e.target.closest && e.target.closest("input, select, textarea, [data-swipe-ignore], .sc__concept-trigger, .sc__concept")) return;
    g = { id: e.pointerId, x: e.clientX, y: e.clientY, h: false,
          commit: Math.min(80, Math.max(40, stage.clientWidth * 0.12)) };
  });
  stage.addEventListener("pointermove", function (e) {
    if (!g || e.pointerId !== g.id || g.h) return;
    var ax = Math.abs(e.clientX - g.x), ay = Math.abs(e.clientY - g.y);
    if (ax < DEAD && ay < DEAD) return;
    if (ax >= ay * RATIO) g.h = true; else g = null;
  });
  stage.addEventListener("pointerup", function (e) {
    if (!g || e.pointerId !== g.id) return;
    var cur = g;
    g = null;
    var dx = e.clientX - cur.x;
    if (!cur.h || Math.abs(dx) < cur.commit || Math.abs(dx) < Math.abs(e.clientY - cur.y) * RATIO) return;
    suppressUntil = Date.now() + 450;                   /* der Klick, der diesem Loslassen folgt */
    step(dx < 0 ? 1 : -1);
  });
  stage.addEventListener("pointercancel", function () { g = null; });
  stage.addEventListener("click", function (e) {
    if (Date.now() < suppressUntil) { suppressUntil = 0; e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* --- Hinweis zum Konzeptbeispiel (ein natives popover fuer alle Leistungen) -----------------------
     Oeffnen per Klick/Tippen (popovertarget), schliessen per Knopf, Escape oder Klick daneben (Light
     Dismiss), beim Wechsel der Leistung und sobald die Buehne den nutzbaren Bereich unter der festen
     Navigation verlaesst (Scrollen, Sprung zu einem anderen Abschnitt). Dieses stille Schliessen setzt den
     Fokus nicht auf den Ausloeser zurueck (sonst zoege der Browser die Seite zurueck). Am Desktop sitzt es
     ueber der Kennzeichnung (sonst darunter), am Handy als Tafel am unteren Rand. Kein Fokusfang, kein
     aria-modal. Die Pruefung laeuft nur, solange der Hinweis offen ist. */
  var trigger = zoom.querySelector("[data-sc-concept-trigger]");
  var pop = zoom.querySelector("[data-sc-concept]");
  var hasPopover = !!pop && typeof pop.showPopover === "function";
  var desk = window.matchMedia("(min-width: 60em)");
  function conceptOpen() { return !!pop && (hasPopover ? pop.matches(":popover-open") : !pop.hidden); }
  function closeConcept() {
    if (!conceptOpen()) return;
    if (hasPopover) pop.hidePopover(); else { pop.hidden = true; onToggle(false); }
  }
  function placeConcept() {
    if (!pop) return;
    if (!desk.matches) { pop.classList.remove("is-anchored"); pop.style.left = pop.style.top = pop.style.bottom = ""; return; }
    var r = trigger.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var nav = document.querySelector("[data-nav]"), navB = nav ? nav.getBoundingClientRect().bottom : 0;
    var h = pop.offsetHeight || 190, w = Math.min(340, vw - 24);
    pop.classList.add("is-anchored");
    pop.style.left = Math.max(12, Math.min(r.left, vw - w - 12)) + "px";
    var st = stage.getBoundingClientRect();
    if (r.top - h - 10 >= navB + 8) {                                   /* 1. ueber der Kennzeichnung */
      pop.style.top = ""; pop.style.bottom = (vh - r.top + 10) + "px";
    } else if (st.right + 16 + w <= vw - 12) {                          /* 2. neben der Buehne (nicht auf dem Bild) */
      pop.style.left = (st.right + 16) + "px"; pop.style.bottom = "";
      pop.style.top = Math.max(navB + 8, Math.min(r.top, vh - h - 8)) + "px";
    } else {                                                            /* 3. sonst darunter */
      pop.style.bottom = ""; pop.style.top = Math.min(r.bottom + 10, vh - h - 8) + "px";
    }
  }
  /* Ist noch ein Stueck der Buehne zwischen Unterkante der Navigation und Fensterunterkante zu sehen? */
  function stageInView() {
    var nav = document.querySelector("[data-nav]"), navB = nav ? nav.getBoundingClientRect().bottom : 0;
    var r = stage.getBoundingClientRect();
    return r.bottom > navB + 24 && r.top < window.innerHeight - 24;
  }
  function closeQuietly() {
    var ae = document.activeElement;
    if (ae && pop.contains(ae) && ae.blur) ae.blur();   /* kein Zurueckspringen zum Ausloeser */
    closeConcept();
  }
  var follow = NAHLIO.raf(function () {
    if (!conceptOpen()) return;
    if (stageInView()) placeConcept(); else closeQuietly();
  });
  function onHash() {
    var id = (window.location.hash || "").slice(1), target = id ? document.getElementById(id) : null;
    if (conceptOpen() && (!target || !zoom.contains(target))) closeQuietly();
  }
  function onToggle(open) {
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      placeConcept();
      window.addEventListener("scroll", follow, { passive: true });
      window.addEventListener("resize", follow);
      window.addEventListener("hashchange", onHash);
    } else {
      window.removeEventListener("scroll", follow);
      window.removeEventListener("resize", follow);
      window.removeEventListener("hashchange", onHash);
    }
  }
  if (pop && trigger) {
    if (hasPopover) {
      pop.addEventListener("beforetoggle", function (e) { if (e.newState === "open") placeConcept(); });
      pop.addEventListener("toggle", function (e) { onToggle(e.newState === "open"); });
    } else {
      /* Browser ohne popover: dieselbe Bedienung von Hand */
      pop.hidden = true;
      trigger.addEventListener("click", function () { pop.hidden = !pop.hidden; onToggle(!pop.hidden); });
      pop.querySelector(".sc__concept-close").addEventListener("click", function () { closeConcept(); trigger.focus({ preventScroll: true }); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && conceptOpen()) { closeConcept(); trigger.focus({ preventScroll: true }); } });
      document.addEventListener("pointerdown", function (e) { if (conceptOpen() && !pop.contains(e.target) && !trigger.contains(e.target)) closeConcept(); });
    }
  }

  /* --- Start --------------------------------------------------------------------------------- */
  /* Bilder erst vorbereiten, wenn der Abschnitt naht (dann auch die Nachbarn vorwaermen). */
  if ("IntersectionObserver" in window) {
    var near = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      near.disconnect();
      prepare(shown);
      warm(shown);
    }, { rootMargin: "400px 0px" });
    near.observe(zoom);
  }
  items.forEach(function (list, k) { list.forEach(function (el) { setInert(el, k !== shown); }); });
  syncControls();
  fade();
  if (wanted && indexOfKey(wanted) > 0) select(indexOfKey(wanted), "external");
  zoom.classList.add("is-ready");
})();

/* ==== 45-wa.js ==== */
/* ==========================================================================
   NAHLIO — WhatsApp in den Beispielen ("WhatsApp", Salon Mara), Wunsch 09.11.
   Ablauf nach Vorgabe des Inhabers: "Hallo 👋" -> Begruessung mit Knoepfen -> "📅 Termin buchen" ->
   "Sehr gern 😊" -> WhatsApp-Formular (Mitarbeiter, Wunschtag, Uhrzeit, Name; fuellt sich in gut 2,5 s von
   selbst, ohne langsames Tippen) -> "📅 Termin buchen" -> "Termin bestaetigt ✅" -> "📅 Im Kalender speichern".
   Nur zum Ansehen: nichts ist antippbar, niemand kann etwas aendern (keine Knoepfe, keine Klick-Behandlung;
   CSS nimmt dem Chat die Zeigerereignisse, Wischen ueber das Bild wechselt weiter die Leistung). Laeuft nur,
   solange das Beispiel aktiv und im Bild ist, und beginnt dann von vorn. Reduced Motion und ohne Skript: der
   fertige Verlauf steht still da.
   Ereignisse: nahlio:slide (Beispiel gewechselt), nahlio:wa-replay (neu starten).
   ========================================================================== */
(function () {
  "use strict";
  var wa = document.querySelector("[data-wa-live]");
  if (!wa) return;
  var rows = Array.prototype.slice.call(wa.querySelectorAll(".wa__row[data-step]"));
  var frame = wa.closest("[data-slide]");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var nameEl = wa.querySelector("[data-wa-name]"), NAME = nameEl ? nameEl.getAttribute("data-wa-name") : "";
  var STATES = ["is-typing", "is-sheet", "is-f1", "is-f2", "is-f3", "is-f4", "is-ready", "is-sent", "is-saved"];
  var tok = 0, timers = [], active = false, visible = false;

  function clear() { tok++; timers.forEach(function (id) { window.clearTimeout(id); }); timers = []; }
  function at(ms, fn) { var my = tok; timers.push(window.setTimeout(function () { if (my === tok) fn(); }, ms)); }
  function show(n) { rows.forEach(function (r) { r.classList.toggle("is-off", +r.getAttribute("data-step") > n); }); }
  function set(cls, on) { wa.classList.toggle(cls, !!on); }
  function press(sel) {
    var el = wa.querySelector(sel);
    if (!el) return;
    el.classList.add("is-press");
    at(280, function () { el.classList.remove("is-press"); });
  }
  function reset() {
    clear();
    wa.classList.add("is-instant");
    STATES.forEach(function (c) { wa.classList.remove(c); });
    Array.prototype.forEach.call(wa.querySelectorAll(".is-press"), function (el) { el.classList.remove("is-press"); });
    if (nameEl) nameEl.textContent = "";
    show(0);
    void wa.offsetWidth;
    wa.classList.remove("is-instant");
  }
  function demo() {
    reset();
    [
      [500, function () { show(1); }],                                   /* Hallo 👋 */
      [1000, function () { set("is-typing", true); }],
      [1700, function () { set("is-typing", false); show(2); }],         /* Begruessung mit Knoepfen */
      [2900, function () { press('[data-wa-pick="book"]'); }],
      [3150, function () { show(3); }],                                   /* 📅 Termin buchen */
      [3550, function () { set("is-typing", true); }],
      [4150, function () { set("is-typing", false); show(4); }],         /* Sehr gern 😊 */
      [5000, function () { press('[data-wa-pick="flow"]'); }],
      [5200, function () { set("is-sheet", true); }],                     /* Formular oeffnet sich */
      [5700, function () { set("is-f1", true); }],                        /* Mara */
      [6150, function () { set("is-f2", true); }],                        /* Freitag, 13. November */
      [6600, function () { set("is-f3", true); }],                        /* 14:30 Uhr */
      [7050, function () { set("is-f4", true); }],                        /* Anna Müller (schnell) */
      [7500, function () { set("is-ready", true); }],
      [7800, function () { set("is-sent", true); }],                      /* 📅 Termin buchen */
      [8050, function () { set("is-sheet", false); }],
      [8400, function () { set("is-typing", true); }],
      [9000, function () { set("is-typing", false); show(5); }],         /* Termin bestaetigt ✅ */
      [10200, function () { press('[data-wa-pick="cal"]'); }],
      [10350, function () { set("is-saved", true); }],                    /* 📅 Im Kalender gespeichert */
      [14200, restart]
    ].forEach(function (s) { at(s[0], s[1]); });
    if (nameEl) for (var k = 1; k <= NAME.length; k++) (function (n) {
      at(7050 + n * 28, function () { nameEl.textContent = NAME.slice(0, n); });
    })(k);
  }
  function restart() {
    clear();
    wa.classList.add("is-resetting");
    at(260, function () { wa.classList.remove("is-resetting"); if (active) demo(); });
  }

  function isActive() { return !frame || frame.classList.contains("is-active"); }
  function check() {
    if (reduced.matches) {
      active = false; clear();
      STATES.forEach(function (c) { wa.classList.remove(c); });
      if (nameEl) nameEl.textContent = NAME;
      wa.classList.remove("is-js", "is-resetting");
      return;
    }
    if (!wa.classList.contains("is-js")) { wa.classList.add("is-js"); reset(); }
    var on = isActive() && visible && !document.hidden;
    if (on && !active) { active = true; wa.classList.remove("is-resetting"); demo(); }
    else if (!on && active) { active = false; wa.classList.remove("is-resetting"); reset(); }
  }
  document.addEventListener("nahlio:slide", check);
  document.addEventListener("visibilitychange", check);
  NAHLIO.onMedia(reduced, check);
  document.addEventListener("nahlio:wa-replay", function () {
    if (!isActive() || !visible || reduced.matches || document.hidden) return;
    active = true; restart();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.35; check();
    }, { threshold: [0, 0.35] }).observe(wa);
  } else visible = true;
  check();
})();

/* ==== 50-faq.js ==== */
/* FAQ: ordinary flow; only uncover an active question hidden by the fixed header.
   State lives in one place: .is-open on the item, mirrored synchronously to aria-expanded (button, which
   also carries aria-controls) and aria-hidden/inert (panel). Border, tint, plus/minus and height are CSS
   transitions on that class, so rapid repeated input simply reverses them; no timers hold UI state. */
(function () {
  "use strict";
  var root = document.querySelector("[data-faq]");
  if (!root) return;
  var items = Array.prototype.slice.call(root.querySelectorAll("[data-faq-item]"));
  var cleanup = null;
  function cancel() { if (cleanup) cleanup(); cleanup = null; }
  function setOpen(item, open) {
    item.classList.toggle("is-open", open);
    item.querySelector(".faq__q").setAttribute("aria-expanded", String(open));
    var panel = item.querySelector(".faq__panel");
    panel.setAttribute("aria-hidden", String(!open)); panel.inert = !open;
  }
  items.forEach(function (item) {
    setOpen(item, false);
    item.querySelector(".faq__q").addEventListener("click", function () {
      cancel();
      var open = !item.classList.contains("is-open");
      items.forEach(function (other) { setOpen(other, other === item && open); });
      if (!open) return;
      var panel = item.querySelector(".faq__panel");
      function correct() {
        cancel();
        if (!item.classList.contains("is-open")) return;
        var nav = document.querySelector("[data-nav]");
        var edge = nav ? nav.getBoundingClientRect().bottom : 0;
        var top = item.querySelector(".faq__q").getBoundingClientRect().top;
        if (top < edge) window.scrollBy({ top: top - edge - 8, behavior: "instant" });
      }
      function ended(e) { if (e.propertyName === "grid-template-rows") correct(); }
      var frame = 0;
      panel.addEventListener("transitionend", ended);
      if (NAHLIO.isReduced()) frame = window.requestAnimationFrame(correct);
      cleanup = function () { panel.removeEventListener("transitionend", ended); window.cancelAnimationFrame(frame); };
    });
  });
  window.addEventListener("scroll", cancel, { passive: true });
  window.addEventListener("wheel", cancel, { passive: true });
  window.addEventListener("touchmove", cancel, { passive: true });
  document.addEventListener("keydown", function (e) {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].indexOf(e.key) >= 0) cancel();
  });
})();

/* ==== 60-form.js ==== */
/* ==========================================================================
   NAHLIO — Kontaktformular (contact.docx)
   Name und E-Mail-Adresse sind Pflicht (die Adresse wird geprueft), Betrieb und
   Nachricht freiwillig. Fehler stehen als Text am Feld (aria-describedby,
   role="alert"), die Eingaben bleiben erhalten. Abgeschickt wird nur an den
   hinterlegten Empfaenger und nur einmal gleichzeitig; "Vielen Dank ..." erscheint erst,
   wenn der Empfaenger die Anfrage bestaetigt hat. Fehlt der Empfaenger, steht ein dauerhafter Hinweis ueber
   den Feldern (mit E-Mail und WhatsApp), der Knopf bleibt gesperrt und es wird nichts gesendet.
   Paketwahl: Radios "paket" (refresh | digital | unsure) und Kaestchen "care" sind der einzige
   Zustand; Paket-Knoepfe und Adresse (?paket=, ?care=1) waehlen aus, der Besucher kann jederzeit
   aendern. Daraus folgt "Ihre Anfrage zu ...". WhatsApp-Knoepfe haben einen festen Link (Hallo Artem).
   ========================================================================== */
(function () {
  "use strict";

  var form = document.querySelector("[data-form]");
  if (!form) return;

  /* Mit Skript prueft dieses Skript (deutsche Meldungen am Feld); ohne Skript der Browser. */
  form.noValidate = true;

  var status = form.querySelector("[data-form-status]");
  var btn = form.querySelector("button[type=submit]");
  function isMissing() { return form.getAttribute("data-endpoint-missing") === "true"; }
  /* Ohne Empfaenger bleibt der Knopf gesperrt (Hinweis ueber den Feldern nennt E-Mail und WhatsApp);
     sonst wird er freigegeben und dieses Skript prueft vor dem Senden. */
  if (btn) btn.disabled = isMissing();
  var msg = {};
  try { msg = JSON.parse(form.getAttribute("data-messages") || "{}"); } catch (e) { msg = {}; }

  var f = {
    name: form.elements["name"],
    email: form.elements["email"],
    consent: form.elements["einwilligung"]
  };

  function show(box, text) { if (box) box.textContent = text || ""; }
  function boxOf(input) { return document.getElementById((input.id || "") + "-error"); }
  function mark(input, text) {
    if (!input) return;
    show(boxOf(input), text);
    if (text) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }

  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(v); }

  function check(which) {
    var v;
    if (which === "name") {
      v = f.name.value.trim();
      mark(f.name, v ? "" : msg.name); return !!v;
    }
    if (which === "email") {
      v = f.email.value.trim();
      var errE = !v ? msg.email_required : (emailOk(v) ? "" : msg.email);
      mark(f.email, errE); return !errE;
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
  [["name", f.name], ["email", f.email]].forEach(function (p) {
    p[1].addEventListener("blur", function () { check(p[0]); });
    p[1].addEventListener("input", function () { if (p[1].getAttribute("aria-invalid") === "true") check(p[0]); });
  });
  if (f.consent) f.consent.addEventListener("change", function () { check("consent"); });

  /* Statusmeldung, sofort sichtbar; nur dieselbe Meldung erneut wird nach einem Bild neu gesetzt, damit sie
     wieder angesagt wird. */
  function setStatus(text, kind) {
    if (!status) return;
    status.classList.toggle("is-ok", kind === "ok");
    status.classList.toggle("is-error", kind === "error");
    if (!text || status.textContent !== text) { status.textContent = text || ""; return; }
    status.textContent = "";
    window.requestAnimationFrame(function () { status.textContent = text; });
  }

  function validateAll() {
    var order = [["name", f.name], ["email", f.email], ["consent", f.consent]];
    var first = null;
    order.forEach(function (p) { if (!check(p[0]) && !first) first = p[1]; });
    return first;
  }

  /* --- Paketwahl, CARE und Adresse -----------------------------------------------------------------
     Einziger Zustand sind die Formularelemente selbst: Radios "paket" (refresh | digital | unsure) und das
     Kaestchen "care". Ein kleiner, fester Kreislauf:
       readUrl()  Adresse -> Zustand (nur erlaubte Werte, sonst "unsure" / ohne CARE)
       apply()    Zustand -> Formularelemente
       render()   Formularelemente -> "Ihre Anfrage zu ..."
                  (WhatsApp: Wunsch 08.11. alle Knoepfe mit demselben festen Link wa.me/491603804949?text=Hallo%20Artem
                  direkt im HTML, unabhaengig von Paket und CARE; hier wird nichts mehr daran geaendert)
       writeUrl() Formularelemente -> Adresse (replace bei Aenderungen im Formular, push bei Paket-Knoepfen)
     Zurueck/Vor (popstate) liest die Adresse, schreibt aber keinen neuen Verlaufseintrag. Andere Eingaben
     (Name, Nachricht ...) bleiben immer unberuehrt. */
  var radios = form.querySelectorAll("input[type=radio][name=paket]");
  var care = form.querySelector("[data-form-care]");
  var ctxLine = form.querySelector("[data-form-context]");
  var names = {};
  try { names = JSON.parse(form.getAttribute("data-packages") || "{}"); } catch (e) { names = {}; }
  /* Erlaubt sind nur die vereinbarten Werte (data-packages), nicht, was gerade im DOM steht. */
  function allowed(v) { return typeof v === "string" && Object.prototype.hasOwnProperty.call(names, v); }
  function current() {
    for (var i = 0; i < radios.length; i++) if (radios[i].checked) return allowed(radios[i].value) ? radios[i].value : "unsure";
    return "unsure";
  }
  function stateNow() { return { pkg: current(), care: !!(care && care.checked) }; }
  function readUrl() {
    var q;
    try { q = new URLSearchParams(window.location.search); } catch (e) { return { pkg: "unsure", care: false }; }
    var pkg = q.get("paket");
    return { pkg: allowed(pkg) ? pkg : "unsure", care: q.get("care") === "1" };
  }
  function apply(st) {
    for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === st.pkg;
    if (care) care.checked = !!st.care;
  }
  function render() {
    var st = stateNow(), named = st.pkg !== "unsure" && names[st.pkg];
    if (ctxLine) ctxLine.textContent = named ? (ctxLine.getAttribute("data-label") || "") + " " + names[st.pkg] : "";
  }
  function urlFor(st, hash) {
    var u = new URL(window.location.href);
    if (st.pkg === "unsure") u.searchParams.delete("paket"); else u.searchParams.set("paket", st.pkg);
    if (st.care) u.searchParams.set("care", "1"); else u.searchParams.delete("care");
    if (hash != null) u.hash = hash;
    return u.href;
  }
  function writeUrl(mode, hash) {
    if (!window.history || !history.replaceState || !window.URL) return;
    var href = urlFor(stateNow(), hash);
    if (mode === "push") history.pushState(null, "", href);
    else if (href !== window.location.href) history.replaceState(history.state, "", href);
  }
  function syncUrl() { writeUrl("replace"); }
  /* Laden: Adresse -> Zustand; unbekannte oder ueberzaehlige Angaben werden still bereinigt. */
  apply(readUrl());
  render();
  syncUrl();
  form.addEventListener("change", function (e) {
    if (e.target === care || (e.target && e.target.name === "paket")) { render(); syncUrl(); }
  });
  window.addEventListener("popstate", function () { apply(readUrl()); render(); });

  /* Paket-Knoepfe (echte Links ?paket=...#kontakt bzw. ?care=1#kontakt): ein normaler Klick waehlt das Paket,
     behaelt eine ausdrueckliche CARE-Wahl bei, legt die vollstaendige Adresse als neuen Verlaufseintrag an
     (Zurueck fuehrt zur vorherigen Auswahl und Stelle) und scrollt mit dem bestehenden Kopf-Abstand zum Formular.
     Kein Fokus auf ein Eingabefeld (keine Handy-Tastatur); der Fokus geht auf die Ueberschrift des Abschnitts.
     Klicks mit Zusatztaste, mittlere Taste und neue Tabs bleiben Sache des Browsers. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[data-paket], a[data-care]") : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var target = document.getElementById("kontakt");
    if (!target) return;
    e.preventDefault();
    var st = stateNow();
    if (a.hasAttribute("data-paket") && allowed(a.getAttribute("data-paket"))) st.pkg = a.getAttribute("data-paket");
    if (a.hasAttribute("data-care")) st.care = true;
    apply(st);
    render();
    writeUrl("push", "#kontakt");
    target.scrollIntoView({ block: "start" });
    var h = target.querySelector("h2");
    if (h) {
      if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
      try { h.focus({ preventScroll: true }); } catch (err) { /* aeltere Browser: ohne Fokuswechsel */ }
    }
  });

  /* --- Absenden -------------------------------------------------------------------------------- */
  /* Ohne Antwort nach 20 s (oder data-timeout in ms): Fehlerzustand, erneut versuchbar. */
  function timeout() { return +form.getAttribute("data-timeout") || 20000; }
  /* Feldfehler des Empfaengers ({"errors": {"email": "invalid", ...}}) mit den Meldungen dieses Formulars;
     gibt das erste betroffene Pflichtfeld zurueck (oder null, wenn kein bekanntes Feld genannt ist). */
  function serverErrors(errors) {
    var first = null;
    if (errors.name) { mark(f.name, msg.name); first = first || f.name; }
    if (errors.email) { mark(f.email, f.email.value.trim() ? msg.email : msg.email_required); first = first || f.email; }
    if (errors.einwilligung && f.consent) {
      show(document.getElementById("f-consent-error"), msg.consent); f.consent.setAttribute("aria-invalid", "true"); first = first || f.consent;
    }
    return first;
  }
  var sending = false;
  form.addEventListener("submit", function (e) {
    if (sending) { e.preventDefault(); return; }                 /* keine doppelte Anfrage */
    var bad = validateAll();
    if (bad) {
      e.preventDefault();
      bad.focus();
      setStatus(msg.summary, "error");
      return;
    }

    if (isMissing()) {                                           /* Sicherheitsnetz: nie senden, nie Erfolg melden */
      e.preventDefault();
      return;
    }

    /* Mit Skript: im Hintergrund senden und erst danken, wenn der Empfaenger die Anfrage angenommen hat
       (2xx und JSON {"ok": true}). Das bestaetigt die Annahme, nicht die Ankunft im Postfach.
       Ohne fetch sendet der Browser das Formular ganz normal. */
    if (!window.fetch || !window.FormData) return;
    e.preventDefault();
    sending = true;
    if (btn) btn.disabled = true;
    form.setAttribute("aria-busy", "true");
    setStatus(msg.sending, "");
    /* Nutzlast (Vertrag in site.json > kurzcheck.form._payload): alle Felder des Formulars, paket immer als
       erlaubter Wert, care immer als "true" / "false". */
    var data = new FormData(form);
    data.set("paket", current());
    data.set("care", care && care.checked ? "true" : "false");
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? window.setTimeout(function () { ctrl.abort(); }, timeout()) : 0;
    fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" }, signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) {
        return res.json().catch(function () { return null; }).then(function (body) { return { res: res, body: body }; });
      })
      .then(function (r) {
        if (r.res.ok && r.body && r.body.ok === true) {
          form.reset();
          render(); syncUrl();
          [f.name, f.email, f.consent].forEach(function (i) { if (i) i.removeAttribute("aria-invalid"); });
          setStatus(form.getAttribute("data-success"), "ok");
          return;
        }
        /* 422: der Empfaenger hat einzelne Angaben abgelehnt -> Meldung am Feld wie bei der Pruefung hier. */
        var first = r.res.status === 422 && r.body && r.body.errors ? serverErrors(r.body.errors) : null;
        if (first) { first.focus(); setStatus(msg.summary, "error"); return; }
        throw new Error("HTTP " + r.res.status);
      })
      .catch(function () {
        /* Netzfehler, Zeitlimit, Ablehnung: Eingaben und Auswahl bleiben stehen, erneutes Senden ist moeglich. */
        setStatus(form.getAttribute("data-error"), "error");
      })
      .then(function () {
        window.clearTimeout(timer);
        sending = false;
        if (btn) btn.disabled = false;
        form.removeAttribute("aria-busy");
      });
  });
})();

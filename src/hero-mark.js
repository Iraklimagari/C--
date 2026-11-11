/* ==========================================================================
   NAHLIO — Bildmarke im Hero: Linie -> 2D-Marke -> 3D-Marke aus gebuerstetem Metall
   Quelle fuer js/hero-mark.js (gebaut mit tools/build-hero-mark.sh, three.js r187).

   Ablauf beim ersten Besuch (selten gesehen: Platz fuer Freude, Emil Kowalski):
   1. Die Linie schreibt die Marke (SVG, 2D): Stamm hoch, Spitze, Diagonale; am Knoten teilt
      sie sich: ein Zug schreibt die Nadel samt Ring, einer laeuft den Fuss entlang. Punkt erscheint.
   2. Die exakte Marke blendet ein (2D), WebGL uebernimmt deckungsgleich: Tiefe waechst, die Marke
      dreht sich in eine 3/4-Ansicht und wird gebuerstetes Metall in der Markenfarbe (ohne Schatten).
   3. Danach atmet die Marke: langsam heben und weiten, senken und loesen.
   Die Seitenlinie (25-line.js) ist im Hero nicht zu sehen (Wunsch 08.11.); ihr Startpunkt data-line-exit liegt
   verborgen im Fuss. Groesse und Lage: die fertige, geneigte Marke wird gemessen und ganz in die Seite eingepasst.
   Farben: die der Marke (--brand). Weniger Bewegung: fertige 3D-Marke ohne Auftakt und ohne Atmen.
   Ohne WebGL: die 2D-Marke.
   ========================================================================== */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, MeshPhysicalMaterial, MeshBasicMaterial, ExtrudeGeometry,
  PMREMGenerator, PlaneGeometry, BoxGeometry, BackSide, DoubleSide, DataTexture, RGBAFormat, RepeatWrapping,
  LinearMipmapLinearFilter, LinearFilter, NeutralToneMapping, SRGBColorSpace, NoColorSpace, Color, Vector2,
  Vector3, Matrix4, Float32BufferAttribute
} from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

const root = document.querySelector("[data-mark]");
if (root) init(root);

function init(root) {
  /* Text-Auftakt: Woerter der Ueberschrift einzeln fassen; die Bewegung selbst ist CSS (premium.css) */
  splitWords(document.querySelector(".hero--mark .hero__title"));

  const canvas = root.querySelector("[data-mark-gl]");
  const ink = root.querySelector("[data-mark-ink]");
  const inkG = root.querySelector("[data-mark-g]");
  const strokes = { a: ink.querySelector('[data-stroke="a"]'), b: ink.querySelector('[data-stroke="b"]'), c: ink.querySelector('[data-stroke="c"]') };
  const dot = ink.querySelector("[data-mark-dot]");
  const fillEl = ink.querySelector("[data-mark-fill]");
  const exitEl = root.querySelector("[data-line-exit]");
  const LOGO_D = fillEl.getAttribute("d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const deskQ = window.matchMedia("(min-width: 64em)");
  /* Wunsch 11.11.: Ueberschrift und Marke kommen zusammen. Der Text-Auftakt (premium.css) wartet auf .is-go, das im
     selben Moment gesetzt wird, in dem die Zeitachse der Marke startet (nach dem Aufbau der 3D-Szene). */
  const heroEl = root.closest(".hero");
  const go = () => { if (heroEl) heroEl.classList.add("is-go"); };
  const titleEl = document.querySelector(".hero--mark .hero__title");
  /* Unschaerfe nur auf den Linien der Marke und von oben nach unten auslaufend (Wunsch 11.11.): oben 10 px, unten
     scharf. Die unscharfe Marke wird auf ihre eigene Form beschnitten (kein Schein auf den Grund) und ueber einen
     senkrechten Verlauf mit der scharfen gemischt. Fuer die Linie (SVG) und die 3D-Marke (Canvas) derselbe Filter. */
  const NS = "http://www.w3.org/2000/svg";
  const GRAD = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="64" ' +
    'viewBox="0 0 8 64" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>' +
    '<rect width="8" height="64" fill="url(#g)"/></svg>');
  const pbDefs = document.createElementNS(NS, "defs");
  pbDefs.innerHTML = '<filter id="mark-pb" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" ' +
    'color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1">' +
    '<feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b0"/>' +
    '<feComposite in="b0" in2="SourceAlpha" operator="in" result="b"/>' +          /* nur innerhalb der Linien, kein Schein */
    '<feImage preserveAspectRatio="none" result="m"/>' +
    '<feComposite in="b" in2="m" operator="in" result="t"/><feComposite in="SourceGraphic" in2="m" operator="out" result="s"/>' +
    '<feMerge><feMergeNode in="t"/><feMergeNode in="s"/></feMerge></filter>';
  ink.insertBefore(pbDefs, ink.firstChild);
  const pbF = pbDefs.querySelector("filter"), pbBlur = pbDefs.querySelector("feGaussianBlur"), pbImg = pbDefs.querySelector("feImage");
  pbImg.setAttribute("href", GRAD); pbImg.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", GRAD);
  const inkWrap = document.createElementNS(NS, "g");             /* ohne eigene Verschiebung: Filter in Pixeln der Buehne */
  inkG.parentNode.insertBefore(inkWrap, inkG); inkWrap.appendChild(inkG);
  /* Safari zeichnet SVG-Filter auf HTML-Elementen (Canvas) unzuverlaessig: dort nur die Linie unscharf */
  const canvasPB = !/^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  /* --- Masse der Marke (Einheiten der viewBox 1095) ---------------------------------------- */
  const VB = 1095, C0 = VB / 2;
  const DEPTH = 170, BT = 4, BS = 2.5;                /* Tiefe; schmale Fase: scharfe Kanten mit feiner Lichtkante.
                                                        Fase nur nach aussen: nach innen versetzt wuerden die spitzen
                                                        Ecken (Spitze, Nadel) ueber die offenen Flaechen springen. */
  const VIS = { x0: 201, x1: 916, y0: 199, y1: 862 };  /* sichtbare Marke (ohne Rand der viewBox) */
  const EXIT = { x: 700, y: 832 };                     /* Linie: unter der Spitze der Nadel, im Fuss (dahinter verborgen) */

  /* --- Zeitplan (ms ab Start) ---------------------------------------------------------------- */
  /* Wunsch 08.11.: schneller, von einem Punkt aus, ohne Luecken. Die Linie startet an der Spitze des linken
     Fusses und fliesst in einem Zug mit gleichem Tempo: Stamm, Spitze, Diagonale, am Knoten weiter in Nadel und
     Ring (b) und zugleich in den Fuss (c). Sie ist breiter als jeder Teil der Marke und auf die Marke
     zugeschnitten: Was sie ueberstrichen hat, ist voll gefuellt. */
  /* Wunsch 08.11.: kein Stocken beim Wechsel nach 3D. Der Zug wird zum Ende nicht langsamer, WebGL uebernimmt im
     selben Bild, in dem er fertig ist, und die Drehung setzt sofort mit Schwung ein (ease-out). */
  const T = {
    draw0: 120, draw1: 1150,     /* der ganze Zug */
    dot0: 980, dot1: 1150,       /* Punkt erscheint, wenn der Ring sich schliesst (nicht aus dem Nichts: ab 0.85) */
    fill0: 1080, fill1: 1150,    /* exakte Marke ersetzt die Striche (deckungsgleich, kaum zu sehen) */
    gl: 1150,                    /* WebGL uebernimmt deckungsgleich, ohne Ueberblendung */
    d0: 1150, d1: 2300,          /* Tiefe, Drehung, Metall: beginnt ohne Pause */
    breathIn: 2300               /* Atmen blendet sich ein */
  };
  const BREATH = 9400;           /* ein Atemzug: ~9 s (Wunsch 08.11.: langsamer, weniger Bewegung) */

  /* Kurven: Eintritt ease-out, Bewegung auf dem Bildschirm ease-in-out (stark, nicht die eingebauten) */
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const span = (now, a, b) => clamp01((now - a) / (b - a));
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  const css = getComputedStyle(document.documentElement);
  const BRAND = (css.getPropertyValue("--brand").trim() || "#01ABC3");

  /* --- Layout ------------------------------------------------------------------------------- */
  let W = 0, H = 0, L = 0, cx = 0, cy = 0, s = 1;
  function layout() {
    W = root.clientWidth; H = root.clientHeight;
    const vw = VIS.x1 - VIS.x0, vh = VIS.y1 - VIS.y0;
    let vcx, vcy;
    if (deskQ.matches) {
      /* gross; schaut ein wenig heraus: ~7 % der Marke liegen jenseits des rechten Rands */
      s = Math.min((H * 0.9) / vh, (W * 1.04) / vw);
      vcx = W + vw * s * 0.07 - (vw * s) / 2; vcy = H * 0.5;
    } else {
      /* Handy und Tablet: gross hinter dem Text, rechts angeschnitten */
      s = Math.min((W * 1.08) / vw, (H * 0.62) / vh);
      vcx = W * 0.5 + vw * s * 0.12; vcy = H * 0.6;
    }
    cx = vcx - ((VIS.x0 + VIS.x1) / 2 - C0) * s;
    cy = vcy - ((VIS.y0 + VIS.y1) / 2 - C0) * s;
    place();
  }
  /* Groesse und Lage (s, cx, cy) auf die 2D-Linie und den Startpunkt der Seitenlinie uebertragen. Mit WebGL
     werden sie danach an die fertige 3D-Haltung angepasst (fit), damit die ganze Marke in die Seite passt. */
  function place() {
    L = VB * s;
    ink.setAttribute("viewBox", "0 0 " + W + " " + H);
    inkG.setAttribute("transform", "translate(" + (cx - L / 2).toFixed(2) + " " + (cy - L / 2).toFixed(2) + ") scale(" + s.toFixed(5) + ")");
    /* Verlauf der Unschaerfe: von etwas ueber der Oberkante der Marke (voll) bis zu ihrer Unterkante (scharf) */
    const mTop = cy - L / 2 + VIS.y0 * s, mBot = cy - L / 2 + VIS.y1 * s, pad = 40;
    pbF.setAttribute("width", String(W)); pbF.setAttribute("height", String(H));
    pbImg.setAttribute("x", "0"); pbImg.setAttribute("width", String(W));
    pbImg.setAttribute("y", (mTop - pad).toFixed(1)); pbImg.setAttribute("height", Math.max(1, mBot - mTop + pad).toFixed(1));
    /* Startpunkt der Seitenlinie: unter der Spitze der Nadel, im Fuss verborgen. Sie baut sich danach neu. */
    const ex = cx + (EXIT.x - C0) * s, ey = cy + (EXIT.y - C0) * s;
    if (Math.abs(exitEl.offsetLeft - ex) > 0.5 || Math.abs(exitEl.offsetTop - ey) > 0.5) {
      exitEl.style.left = ex.toFixed(1) + "px";
      exitEl.style.top = ey.toFixed(1) + "px";
      exitEl.style.bottom = "auto";
      if (window.NAHLIO && window.NAHLIO.recalc) window.NAHLIO.recalc();
    }
  }
  layout();

  /* --- 2D: Linie schreibt die Marke ------------------------------------------------------- */
  const lens = {};
  for (const k in strokes) {
    const p = strokes[k], len = p.getTotalLength();
    lens[k] = len;
    p.style.strokeDasharray = len + " " + len;
    p.style.strokeDashoffset = String(len);
  }
  dot.style.transformBox = "fill-box"; dot.style.transformOrigin = "center";
  dot.style.opacity = "0"; fillEl.style.opacity = "0";
  /* Startzustand steht: erst jetzt darf die Zeichenflaeche sichtbar werden (vorher blitzte beim Laden die fertige
     2D-Marke auf, Wunsch 09.11.; premium.css) */
  root.classList.add("is-ready");
  /* ein Weg ab dem Startpunkt: a bis zum Knoten, danach b und c gleichzeitig (gleiches Tempo, kein Halt) */
  const DIST = lens.a + Math.max(lens.b, lens.c);
  /* anfangs beschleunigen, dann gleichmaessig bis zum Ende (kein Abbremsen vor dem Wechsel nach 3D) */
  const FA = 0.25, FK = 1 / (2 * FA - FA * FA);
  const easeFlow = (t) => (t < FA ? FK * t * t : FK * FA * FA + 2 * FK * FA * (t - FA));
  function draw2d(now) {
    const d = DIST * easeFlow(span(now, T.draw0, T.draw1));
    const pa = clamp01(d / lens.a);
    const pb = clamp01((d - lens.a) / lens.b);
    const pc = clamp01((d - lens.a) / lens.c);
    strokes.a.style.strokeDashoffset = String(lens.a * (1 - pa));
    strokes.b.style.strokeDashoffset = String(lens.b * (1 - pb));
    strokes.c.style.strokeDashoffset = String(lens.c * (1 - pc));
    for (const k in strokes) strokes[k].style.visibility = (k === "a" ? pa : k === "b" ? pb : pc) > 0 ? "" : "hidden";
    const pd = easeOut(span(now, T.dot0, T.dot1));
    dot.style.opacity = String(pd);
    dot.style.transform = "scale(" + (0.85 + 0.15 * pd).toFixed(4) + ")";
    /* Die Striche sind auf die Marke zugeschnitten (clipPath): Die exakte Marke blendet einfach darueber ein. */
    fillEl.style.opacity = String(span(now, T.fill0, T.fill1));
  }

  /* --- 3D ------------------------------------------------------------------------------------ */
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { renderer = null; }
  if (!renderer || !renderer.getContext()) { root.classList.add("is-static"); go(); return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;     /* haelt die Markenfarbe treu */
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);           /* keine Schatten */

  const scene = new Scene();
  scene.environment = studioEnv(renderer);       /* Metall lebt von Spiegelungen: eigenes Studio-Licht */
  scene.environmentIntensity = 1.5;              /* auf --brand geeicht (Vorderseite im Mittel = Markenfarbe) */

  const FOV = 28;                 /* etwas staerkere Perspektive: mehr Raumgefuehl */
  const camera = new PerspectiveCamera(FOV, 1, 10, 40000);

  /* Marke als Koerper */
  const svg = new SVGLoader().parse('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1095 1095"><path d="' + LOGO_D + '"/></svg>');
  const shapes = svg.paths.flatMap((p) => p.toShapes(true));
  const geo = new ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelOffset: 0, bevelSegments: 3, curveSegments: 36 });
  /* SVG zeigt y nach unten: spiegeln, Mitte auf 0, Vorderseite auf z = 0 (Koerper liegt dahinter) */
  geo.applyMatrix4(new Matrix4().makeTranslation(-C0, -C0, -(DEPTH + BT)));
  geo.applyMatrix4(new Matrix4().makeScale(1, -1, 1));
  flipWinding(geo);
  geo.computeVertexNormals();

  /* Gebuerstetes Metall in der Markenfarbe: feine waagerechte Schliffspuren (Normal-Map), leichte Flecken
     (Rauheit), gestreckte Glanzlichter quer zum Schliff (Anisotropie) */
  const brushed = brushedMaps(512);
  const U = { uFlat: { value: 1 }, uFlatColor: { value: srgbVec(BRAND) } };
  const mat = new MeshPhysicalMaterial({
    color: new Color(BRAND), metalness: 1.0, roughness: 0.42,
    roughnessMap: brushed.rough, normalMap: brushed.normal, normalScale: new Vector2(0.6, 0.6),
    anisotropy: 0.85, anisotropyRotation: 0
  });
  injectFlat(mat, U);

  const pivot = new Group();           /* dreht um die Mitte des Koerpers */
  const inner = new Group();           /* Massstab: Einheiten der Marke -> Pixel */
  const mesh = new Mesh(geo, mat);
  inner.add(mesh); pivot.add(inner); scene.add(pivot);


  /* Endhaltung der Marke (3/4-Ansicht): rechte und obere Flanken zeigen sich.
     Wunsch 08.11.: staerker geneigt (mehr Tiefe, mehr Raum) */
  const POSE = { rx: 0.27, ry: -0.4, rz: 0.03 };

  /* --- Szene an die Buehne anpassen ----------------------------------------------------------- */
  function sizeScene() {
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const dist = (H / 2) / Math.tan((FOV / 2) * Math.PI / 180);   /* Bildebene z = 0: 1 Einheit = 1 CSS-Pixel */
    camera.position.set(0, 0, dist);
    camera.near = dist * 0.2; camera.far = dist * 4;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    inner.scale.setScalar(s);
  }

  /* --- Zustand je Bild -------------------------------------------------------------------- */
  /* Zeitachse: laeuft nur, solange gezeichnet wird (max. 50 ms je Bild): Ein langsamer erster Frame oder ein
     verdeckter Tab ueberspringt den Auftakt nicht, er wartet. Pruefen: ?mark-t=2600 haelt sie an. */
  const DBG = new URLSearchParams(window.location.search).get("mark-t");
  let clock = 0, last = 0, glOn = null;
  function pose(depthP, turnP, breath, amp, sway) {
    const Dw = (DEPTH + 2 * BT) * s * depthP;
    inner.position.set(0, 0, Dw / 2);                   /* Drehpunkt in der Mitte des Koerpers */
    pivot.position.set(cx - W / 2, H / 2 - cy + breath * 0.005 * L * amp, -Dw / 2);
    mesh.scale.z = Math.max(0.002, depthP);
    pivot.rotation.set(POSE.rx * turnP + 0.007 * breath * amp, POSE.ry * turnP + 0.012 * sway * amp, POSE.rz * turnP);
    pivot.scale.setScalar(1 + 0.009 * breath * amp);
  }
  /* --- Einpassen (Wunsch 08.11.: "passt nicht in die Seite") -------------------------------------
     Die fertige, geneigte Marke wird gemessen (Umriss auf dem Bildschirm) und so gross wie moeglich in die
     freie Flaeche gesetzt: am Rechner rechts neben dem Text, mit Rand; am Handy ganz in der Breite. Nichts
     wird mehr abgeschnitten. 3 % Reserve fuer das Atmen. */
  const posAttr = geo.attributes.position, pv = new Vector3();
  function target() {
    if (deskQ.matches) {
      const left = root.getBoundingClientRect().left;
      let copyR = 0;                                    /* wo der Text wirklich endet (Zeilen, nicht Kaesten) */
      document.querySelectorAll(".hero--mark .hero__copy > *").forEach((el) => {
        const rg = document.createRange(); rg.selectNodeContents(el);
        for (const q of rg.getClientRects()) if (q.width) copyR = Math.max(copyR, q.right);
      });
      return { x0: Math.max(W * 0.03, copyR - left + Math.max(28, W * 0.035)), x1: W - Math.max(24, window.innerWidth * 0.022),
               y0: H * 0.04, y1: H * 0.96, right: true };
    }
    /* Handy und Tablet (Wunsch 09.11.): die Marke steht zwischen Ueberschrift und Unterzeile, kein Text liegt auf
       ihr. Gemessen wird das Layout (offsetTop), nicht der Bildschirm: die Unterzeile faehrt beim Auftakt noch ein. */
    const copy = document.querySelector(".hero--mark .hero__copy");
    const ttl = copy && copy.querySelector(".hero__title"), sub = copy && copy.querySelector(".hero__sub");
    let y0 = H * 0.28, y1 = H * 0.98;
    if (ttl && sub && sub.offsetHeight) {
      const top = copy.getBoundingClientRect().top - root.getBoundingClientRect().top, gap = Math.max(10, H * 0.015);
      y0 = top + ttl.offsetTop + ttl.offsetHeight + gap;
      y1 = top + sub.offsetTop - gap;
    }
    return { x0: W * 0.03, x1: W * 0.97, y0, y1, right: false };
  }
  function screenBox() {
    inner.scale.setScalar(s);
    pose(1, 1, 0, 0, 0);
    pivot.updateMatrixWorld(true);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const take = (attr, m, step) => {
      for (let i = 0; i < attr.count; i += step) {
        pv.fromBufferAttribute(attr, i).applyMatrix4(m).project(camera);
        const x = (pv.x + 1) * W / 2, y = (1 - pv.y) * H / 2;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    };
    take(posAttr, mesh.matrixWorld, 5);
    return { x0, x1, y0, y1 };
  }
  function fit() {
    const R = target(), M = 1.015;
    for (let k = 0; k < 4; k++) {
      const b = screenBox();
      const f = Math.min((R.x1 - R.x0) / ((b.x1 - b.x0) * M), (R.y1 - R.y0) / ((b.y1 - b.y0) * M));
      const bx = (b.x0 + b.x1) / 2, by = (b.y0 + b.y1) / 2;
      const tx = R.right ? R.x1 - (b.x1 - b.x0) * f * M / 2 : (R.x0 + R.x1) / 2;
      s *= f; cx = tx + (cx - bx) * f; cy = (R.y0 + R.y1) / 2 + (cy - by) * f;
    }
    inner.scale.setScalar(s);
    place();
  }

  /* Die Leinwand ist immer sichtbar (kein Hochstufen der Ebene im Wechsel-Bild = kein Ruckler); vorher ist sie
     leer. Im Wechsel-Bild erscheint die Marke in WebGL und die 2D-Linie verschwindet: beide sind deckungsgleich. */
  function setGL(on) {
    if (on === glOn) return;
    glOn = on;
    mesh.visible = on;
    canvas.classList.toggle("is-on", on);
    ink.style.transition = "none";
    ink.style.opacity = on ? "0" : "1";
  }

  /* Wunsch 11.11.: die Marke kommt wie die Woerter der Ueberschrift - aus der Unschaerfe (oben 10 px, nach unten
     auslaufend, nur auf der Marke) und von 0,38 em weiter unten, im selben Takt (140 ms Verzug, 1 s, gleiche Kurve).
     Sie bleibt so, solange die Linie schreibt, und wird klar, sobald sie in 3D uebergeht. */
  const BLUR = 10, RISE_EM = 0.38;
  const enter = bezier(0.23, 1, 0.32, 1);
  let fxB = -1, fxR = -1;
  function intro(t) {
    const r = 1 - enter(span(t, 140, 1140));
    const b = t < T.gl ? 1 : 1 - easeOut(span(t, T.gl, T.gl + 700));
    const rise = r > 0 && titleEl ? parseFloat(getComputedStyle(titleEl).fontSize) * RISE_EM : 0;
    const bb = Math.round(b * BLUR * 20) / 20, rr = Math.round(r * rise * 10) / 10;
    if (bb === fxB && rr === fxR) return;
    fxB = bb; fxR = rr;
    const tr = rr > 0 ? "translate3d(0," + rr + "px,0)" : "";
    if (bb > 0) { pbBlur.setAttribute("stdDeviation", String(bb)); inkWrap.setAttribute("filter", "url(#mark-pb)"); }
    else inkWrap.removeAttribute("filter");
    canvas.style.filter = bb > 0 && canvasPB ? "url(#mark-pb)" : "";
    for (const el of [ink, canvas]) { el.style.transform = tr; el.style.willChange = rr > 0 ? "transform" : ""; }
  }

  function frame(now) {
    const dt = last ? Math.min(50, now - last) : 0;
    last = now; clock += dt;
    const t = DBG !== null ? Number(DBG) : reduce ? 1e9 : clock;
    intro(t);
    if (t < T.gl + 300) draw2d(t);
    setGL(t >= T.gl);
    const dp = 1 - Math.pow(1 - span(t, T.d0, T.d1), 2.2);   /* setzt mit Schwung ein, kommt weich zur Ruhe */
    U.uFlat.value = 1 - smooth(0, 0.7, span(t, T.d0, T.d1));
    let breath = 0, amp = 0, sway = 0;
    if (!reduce && t > T.breathIn) {
      const bt = t - T.breathIn;
      amp = easeInOut(clamp01(bt / 1800));
      breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * bt) / BREATH);     /* einatmen: heben, weiten; ausatmen: loesen */
      sway = Math.sin((2 * Math.PI * bt) / (BREATH * 2));
    }
    pose(dp, dp, breath, amp, sway);
    renderer.render(scene, camera);
  }

  /* --- Schleife: nur sichtbar und nur wenn noetig -------------------------------------------- */
  let raf = 0, visible = true, pageVisible = !document.hidden;
  function loop(now) {
    raf = 0;
    frame(now);
    if (!reduce && DBG === null && visible && pageVisible) raf = requestAnimationFrame(loop);
    else last = 0;                                        /* nach der Pause ohne Zeitsprung weiter */
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }, { threshold: 0 }).observe(root);
  }
  document.addEventListener("visibilitychange", () => { pageVisible = !document.hidden; if (pageVisible) kick(); });
  function rebuild() { layout(); sizeScene(); fit(); kick(); }
  let rt = 0;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(rebuild, 120); });

  /* Kleines Logo oben links: im Hero ist die grosse Marke das Logo; es blendet erst nach dem Hero ein */
  const heroSec = root.closest(".hero");
  if (heroSec && "IntersectionObserver" in window) {
    new IntersectionObserver((es) => {
      document.documentElement.classList.toggle("hero-in-view", es[0].intersectionRatio >= 0.3);
    }, { threshold: [0, 0.3, 0.6] }).observe(heroSec);
  }

  /* Alles einmal aufbauen und die Shader vorab uebersetzen, erst dann laeuft die Zeitachse */
  sizeScene();
  fit();
  pose(0.002, 0, 0, 0, 0);
  renderer.compile(scene, camera);
  renderer.initTexture(brushed.normal);                /* Texturen vorab hochladen: kein Ruckler im Wechsel-Bild */
  renderer.initTexture(brushed.rough);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);   /* Textbreite steht erst mit den Schriften fest */
  intro(DBG !== null ? Number(DBG) : reduce ? 1e9 : 0);   /* Startzustand (unscharf, tiefer) vor dem ersten Bild */
  go();
  kick();
}

/* --- Hilfen ----------------------------------------------------------------------------------- */
/* CSS-Kurve cubic-bezier(x1, y1, x2, y2) als Funktion (wie --ease-enter) */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (u) => ((ax * u + bx) * u + cx) * u, Y = (u) => ((ay * u + by) * u + cy) * u, dX = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) { const d = dX(u); if (Math.abs(d) < 1e-6) break; u -= (X(u) - x) / d; }
    u = Math.min(1, Math.max(0, u));
    return Y(u);
  };
}
function splitWords(h) {
  /* Jedes Wort in <span class="hw" style="--i:n">; Leerzeichen bleiben Text (Zeilenumbruch wie vorher),
     umgebende Spannen (z. B. die Betonung "wie vor Ort.") bleiben erhalten. */
  if (!h || h.classList.contains("is-split")) return;
  let i = 0;
  (function walk(node) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 1) { walk(child); continue; }
      if (child.nodeType !== 3) continue;
      const frag = document.createDocumentFragment();
      for (const part of child.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
        const w = document.createElement("span");
        w.className = "hw"; w.style.setProperty("--i", String(i++)); w.textContent = part;
        frag.appendChild(w);
      }
      node.replaceChild(frag, child);
    }
  })(h);
  h.classList.add("is-split");
}
function studioEnv(renderer) {
  /* Fotostudio fuer gebuerstetes Metall: dunkle Umgebung (Tiefe in den Flanken), vorn eine grosse Flaeche
     mit weichem Verlauf (oben links heller, unten rechts dunkler), seitlich breite weiche Lichtbaender wie
     ein Fenster, hinten schmale Streifen fuer die feinen Lichtkanten, unten ein dunkler Boden. */
  const env = new Scene();
  env.add(new Mesh(new BoxGeometry(60, 40, 60), new MeshBasicMaterial({ color: new Color().setScalar(0.14), side: BackSide })));
  const panel = (w, h, x, y, z, f, seg = 8) => {
    const g = new PlaneGeometry(w, h, seg, seg), m = new Mesh(g, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); m.updateMatrixWorld(true);
    const p = g.attributes.position, v = new Vector3(), cols = [];
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); const k = f(v.x, v.y); cols.push(k, k, k); }
    g.setAttribute("color", new Float32BufferAttribute(cols, 3));
    env.add(m);
  };
  /* vorn: dunkler Grund mit weichem Verlauf und einem breiten hellen Band (wie das Glanzlicht der Kugel):
     Es laeuft quer ueber die Vorderseite der Marke, die Schliffspuren werden darin sichtbar */
  panel(80, 44, 0, -2, 26, (x, y) => 0.42 + 0.3 * clamp(0.5 - x / 60 + y / 40, 0, 1) + 2.3 * Math.exp(-Math.pow((x + 12) / 4.2, 2)), 48);
  panel(10, 34, -27, 2, 10, (x, y) => 1.8 - 0.03 * Math.abs(y));                        /* links: Fensterband */
  panel(8, 30, 27, 0, 4, () => 2.2);                                                     /* rechts: Band -> helle rechte Kanten */
  panel(40, 2.6, 0, 13, -22, () => 4.2);                                                 /* hinten oben: Lichtkante */
  panel(2.6, 30, 20, 0, -22, () => 1.6);                                                 /* hinten rechts: Flanken eher dunkel */
  panel(24, 24, 0, 19.5, 6, () => 2.8);                                                  /* oben: Lichtwanne -> helle obere Kanten */
  panel(60, 60, 0, -19.5, 0, () => 0.05);                                                /* Boden */
  const pm = new PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.02).texture;
  pm.dispose();
  return tex;
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function brushedMaps(N) {
  /* Schliffspuren: je Zeile ein zufaelliger Hoehenwert, entlang der Zeile in langen Zuegen leicht wechselnd;
     daraus die Normalen (nur quer zum Schliff geneigt). Rauheit: dazu weiche Flecken (wie Fingerspuren). */
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const hgt = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    let base = rnd(), x = 0;
    while (x < N) {
      const run = 24 + Math.floor(rnd() * 180), amp = 0.25 + rnd() * 0.75, off = (rnd() - 0.5) * 0.5;
      for (let i = 0; i < run && x < N; i++, x++) hgt[y * N + x] = base * amp + off * 0.4;
      base = base * 0.7 + rnd() * 0.3;
    }
  }
  const blob = new Float32Array(N * N);                     /* weiche Flecken: wenige grosse Kreise, kachelbar */
  for (let k = 0; k < 14; k++) {
    const bx = rnd() * N, by = rnd() * N, r = N * (0.06 + rnd() * 0.16), a = (rnd() - 0.4) * 0.5;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let dx = Math.abs(x - bx), dy = Math.abs(y - by); dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy);
      const d = Math.sqrt(dx * dx + dy * dy) / r;
      if (d < 1) blob[y * N + x] += a * (1 - d * d) * (1 - d * d);
    }
  }
  const nrm = new Uint8Array(N * N * 4), rgh = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, up = ((y + N - 1) % N) * N + x, dn = ((y + 1) % N) * N + x;
    const gy = (hgt[dn] - hgt[up]) * 1.2;                   /* Neigung quer zum Schliff */
    const nx = 0, ny = -gy, nz = 1, l = Math.sqrt(ny * ny + nz * nz);
    nrm[i * 4] = Math.round((nx / l * 0.5 + 0.5) * 255);
    nrm[i * 4 + 1] = Math.round((ny / l * 0.5 + 0.5) * 255);
    nrm[i * 4 + 2] = Math.round((nz / l * 0.5 + 0.5) * 255);
    nrm[i * 4 + 3] = 255;
    const r = clamp(0.92 + (hgt[i] - 0.5) * 0.22 + blob[i] * 0.6, 0.55, 1.0);   /* Faktor auf roughness */
    rgh[i * 4] = rgh[i * 4 + 1] = rgh[i * 4 + 2] = Math.round(r * 255); rgh[i * 4 + 3] = 255;
  }
  const mk = (data) => {
    const t = new DataTexture(data, N, N, RGBAFormat);
    t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(1 / 420, 1 / 420);    /* UV der Marke in viewBox-Einheiten */
    t.minFilter = LinearMipmapLinearFilter; t.magFilter = LinearFilter; t.generateMipmaps = true;
    t.anisotropy = 4; t.colorSpace = NoColorSpace; t.needsUpdate = true;
    return t;
  };
  return { normal: mk(nrm), rough: mk(rgh) };
}
function srgbVec(hex) {
  const c = new Color(hex), o = { r: 0, g: 0, b: 0 };
  c.getRGB(o, SRGBColorSpace);
  return new Vector3(o.r, o.g, o.b);
}
function flipWinding(g) {
  /* Nach dem Spiegeln (y) zeigen die Dreiecke nach innen: Reihenfolge je Dreieck umkehren */
  const attrs = Object.values(g.attributes);
  const n = g.attributes.position.count;
  for (let i = 0; i < n; i += 3) {
    for (const a of attrs) {
      const k = a.itemSize, arr = a.array;
      for (let j = 0; j < k; j++) { const t = arr[(i + 1) * k + j]; arr[(i + 1) * k + j] = arr[(i + 2) * k + j]; arr[(i + 2) * k + j] = t; }
    }
  }
  for (const a of attrs) a.needsUpdate = true;
}
function injectFlat(mat, U) {
  /* uFlat = 1: genau die Markenfarbe (sRGB), deckungsgleich mit der 2D-Marke; 0: volles Licht */
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uFlat = U.uFlat; sh.uniforms.uFlatColor = U.uFlatColor;
    sh.fragmentShader = "uniform float uFlat;\nuniform vec3 uFlatColor;\n" + sh.fragmentShader.replace(
      "#include <dithering_fragment>",
      "#include <dithering_fragment>\n  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFlatColor, uFlat);");
  };
}

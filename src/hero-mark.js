/* ==========================================================================
   NAHLIO — Bildmarke im Hero: Linie -> 2D-Marke -> 3D-Marke -> Linie nach unten
   Quelle fuer js/hero-mark.js (gebaut mit tools/build-hero-mark.sh, three.js r187).

   Ablauf beim ersten Besuch (selten gesehen: Platz fuer Freude, Emil Kowalski):
   1. Die Linie schreibt die Marke (SVG, 2D): Stamm hoch, Spitze, Diagonale; am Knoten teilt
      sie sich: ein Zug schreibt die Nadel samt Ring, einer laeuft den Fuss entlang. Punkt erscheint.
   2. Die Striche gehen in die exakte Marke ueber (2D), dann uebernimmt WebGL deckungsgleich:
      Tiefe waechst, die Marke dreht sich in eine 3/4-Ansicht und wird zu Metall (Markenfarbe, ohne Schatten).
   3. Aus dem Fuss biegt die Linie kurz als 3D-Koerper nach unten und wird fast sofort flach (2D);
      so verlaesst sie den Hero an seiner Unterkante, dort setzt die Seitenlinie (25-line.js) an.
   4. Danach atmet die Marke: langsam heben und weiten, senken und loesen.
   Farben: unveraendert die der Marke (--brand) und der Seitenlinie. Keine neuen Farbtoene.
   Weniger Bewegung: fertige 3D-Marke ohne Auftakt und ohne Atmen. Ohne WebGL: die 2D-Marke.
   ========================================================================== */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, MeshPhysicalMaterial, MeshBasicMaterial, ExtrudeGeometry,
  PMREMGenerator, PlaneGeometry, BoxGeometry, BackSide, DoubleSide,
  NeutralToneMapping, SRGBColorSpace, Color, Vector3, Matrix4, CubicBezierCurve3, TubeGeometry,
  SphereGeometry, BufferAttribute, Float32BufferAttribute
} from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

const root = document.querySelector("[data-mark]");
if (root) init(root);

function init(root) {
  const canvas = root.querySelector("[data-mark-gl]");
  const ink = root.querySelector("[data-mark-ink]");
  const inkG = root.querySelector("[data-mark-g]");
  const strokes = { a: ink.querySelector('[data-stroke="a"]'), b: ink.querySelector('[data-stroke="b"]'), c: ink.querySelector('[data-stroke="c"]') };
  const dot = ink.querySelector("[data-mark-dot]");
  const fillEl = ink.querySelector("[data-mark-fill]");
  const exitEl = root.querySelector("[data-line-exit]");
  const LOGO_D = fillEl.getAttribute("d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phoneQ = window.matchMedia("(max-width: 47.99em)");
  const deskQ = window.matchMedia("(min-width: 64em)");

  /* --- Masse der Marke (Einheiten der viewBox 1095) ---------------------------------------- */
  const VB = 1095, C0 = VB / 2;
  const DEPTH = 170, BT = 3, BS = 2;                  /* Tiefe, Fase (Dicke/Breite): runde Kanten fangen Licht.
                                                        Fase nur nach aussen: nach innen versetzt wuerden die spitzen
                                                        Ecken (Spitze, Nadel) ueber die offenen Flaechen springen. */
  const FOOT = { x: 818, y: 829, dx: 1, dy: 0.1 };    /* Rohr-Anfang im Fuss rechts unten, Richtung nach rechts */
  const FOOT_R = 33;                                  /* halbe Fussstaerke */

  /* --- Zeitplan (ms ab Start) ---------------------------------------------------------------- */
  const T = {
    a0: 250, a1: 1150,           /* Stamm + Spitze + Diagonale bis zum Knoten */
    b1: 2050, c1: 1600,          /* vom Knoten: Nadel + Ring (b), Fuss (c) mit gleichem Tempo */
    dot0: 1880, dot1: 2200,      /* Punkt erscheint (nicht aus dem Nichts: ab 0.85) */
    fill0: 2050, fill1: 2350,    /* Striche -> exakte Marke */
    gl: 2350,                    /* WebGL uebernimmt deckungsgleich */
    d0: 2600, d1: 4100,          /* Tiefe, Drehung, Licht */
    t0: 3700, t1: 4900,          /* Linie waechst nach unten (3D -> 2D) */
    breathIn: 4100               /* Atmen blendet sich ein */
  };
  const BREATH = 6200;           /* ein Atemzug: ~6 s (ruhig, wie in Ruhe) */

  /* Kurven: Eintritt ease-out, Bewegung auf dem Bildschirm ease-in-out (stark, nicht die eingebauten) */
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const span = (now, a, b) => clamp01((now - a) / (b - a));
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  /* --- Farben: die der Marke und der Seitenlinie, unveraendert ------------------------------ */
  const css = getComputedStyle(document.documentElement);
  const BRAND = (css.getPropertyValue("--brand").trim() || "#01ABC3");
  const LINE_STOPS = ["#74EAF2", "#47D3EB", "#2BB6E2"];          /* line.css: .pageline__stop--a/b/c */

  /* --- Layout ------------------------------------------------------------------------------- */
  let W = 0, H = 0, L = 0, cx = 0, cy = 0, s = 1;
  function layout() {
    W = root.clientWidth; H = root.clientHeight;
    /* Gross (Wunsch 03.11.: doppelt so gross): Die sichtbare Marke (ohne Rand der viewBox) fuellt ~90 % der Hoehe,
       rechtsbuendig an den Seitenrand; auf dem Handy so breit wie der Bildschirm. */
    const VIS = { x0: 201, x1: 916, y0: 199, y1: 862 };          /* sichtbare Marke in viewBox-Einheiten */
    const vw = VIS.x1 - VIS.x0, vh = VIS.y1 - VIS.y0;
    let vcx, vcy;
    if (deskQ.matches) {
      /* schaut ein wenig heraus: ~7 % der Marke liegen jenseits des rechten Rands */
      s = Math.min((H * 0.9) / vh, (W * 1.04) / vw);
      vcx = W + vw * s * 0.07 - (vw * s) / 2; vcy = H * 0.5;
    } else {
      /* Handy und Tablet: gross hinter dem Text, rechts angeschnitten */
      s = Math.min((W * 1.08) / vw, (H * 0.62) / vh);
      vcx = W * 0.5 + vw * s * 0.12; vcy = H * 0.6;
    }
    L = VB * s;
    cx = vcx - ((VIS.x0 + VIS.x1) / 2 - C0) * s;
    cy = vcy - ((VIS.y0 + VIS.y1) / 2 - C0) * s;
    /* Uebergabepunkt an die Seitenlinie: unter dem Ende des Fusses; die Seitenlinie baut sich danach neu */
    const ex = Math.min(W - 18, cx + (FOOT.x + 40 - C0) * s);
    if (Math.abs(exitEl.offsetLeft - ex) > 0.5) {
      exitEl.style.left = ex.toFixed(1) + "px";
      if (window.NAHLIO && window.NAHLIO.recalc) window.NAHLIO.recalc();
    }
    ink.setAttribute("viewBox", "0 0 " + W + " " + H);
    inkG.setAttribute("transform", "translate(" + (cx - L / 2).toFixed(2) + " " + (cy - L / 2).toFixed(2) + ") scale(" + s.toFixed(5) + ")");
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
  function draw2d(now) {
    const pa = easeInOut(span(now, T.a0, T.a1));
    const pb = easeInOut(span(now, T.a1, T.b1));
    const pc = easeInOut(span(now, T.a1, T.c1));
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
  if (!renderer || !renderer.getContext()) { root.classList.add("is-static"); return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;     /* haelt die Markenfarbe treu (keine Farbverschiebung) */
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);           /* keine Schatten (Wunsch 03.11.: weniger Schatten) */

  const scene = new Scene();
  scene.environment = studioEnv(renderer);       /* Metall lebt von Spiegelungen: eigenes Studio-Licht */
  scene.environmentIntensity = 1.45;             /* matt streut das Licht: Helligkeit auf --brand geeicht */

  const FOV = 22;
  const camera = new PerspectiveCamera(FOV, 1, 10, 40000);


  /* Marke als Koerper */
  const svg = new SVGLoader().parse('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1095 1095"><path d="' + LOGO_D + '"/></svg>');
  const shapes = svg.paths.flatMap((p) => p.toShapes(true));
  const geo = new ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelOffset: 0, bevelSegments: 2, curveSegments: 36 });
  /* SVG zeigt y nach unten: spiegeln, Mitte auf 0, Vorderseite auf z = 0 (Koerper liegt dahinter) */
  geo.applyMatrix4(new Matrix4().makeTranslation(-C0, -C0, -(DEPTH + BT)));
  geo.applyMatrix4(new Matrix4().makeScale(1, -1, 1));
  flipWinding(geo);
  geo.computeVertexNormals();

  const U = { uFlat: { value: 1 }, uFlatColor: { value: srgbVec(BRAND) } };
  /* Metall in der Markenfarbe: Die Flaechen spiegeln das Studio; die Vorderseite spiegelt eine Flaeche der
     Helligkeit ~1 und zeigt damit genau --brand. Kanten fangen die hellen Lichtflaechen (metallischer Glanz). */
  const METAL = { metalness: 1.0, roughness: 0.6 };                          /* mattes Metall (satiniert) */
  const mat = new MeshPhysicalMaterial({ color: new Color(BRAND), ...METAL });
  injectFlat(mat, U);

  const pivot = new Group();           /* dreht um die Mitte des Koerpers */
  const inner = new Group();           /* Massstab: Einheiten der Marke -> Pixel */
  const mesh = new Mesh(geo, mat);
  inner.add(mesh); pivot.add(inner); scene.add(pivot);

  /* Endhaltung der Marke (3/4-Ansicht): rechte und obere Flanken zeigen sich */
  const POSE = { rx: 0.12, ry: -0.28, rz: 0.02 };    /* zur anderen Seite gedreht: rechte Flanken zeigen sich */

  /* --- Linie nach unten: Rohr (3D) -> flach (2D) ------------------------------------------- */
  const TU = { uGrow: { value: 0 }, uDelta: { value: new Vector3() }, uFlat: { value: 0 } };
  let tube = null, cap = null, tubeCurve = null, tubeR = null, tubeZ = null;
  const tubeMat = new MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, ...METAL });
  injectTube(tubeMat, TU);
  const capMat = new MeshPhysicalMaterial({ color: new Color(BRAND), ...METAL });

  function lineStartColor(px, py) {
    /* Farbe der Seitenlinie an ihrem Anfang (Verlauf wie in 25-line.js: diagonal, gespiegelt wiederholt) */
    const main = root.closest("main") || document.body;
    const mr = main.getBoundingClientRect(), rr = root.getBoundingClientRect();
    const x = rr.left - mr.left + px, y = rr.top - mr.top + py;
    const gx = main.offsetWidth * 0.5, gy = (window.innerHeight || 800) * 1.1;
    let t = (x * gx + y * gy) / (gx * gx + gy * gy);
    t = Math.abs(t) % 2; if (t > 1) t = 2 - t;                  /* reflect */
    const a = srgbVec(t < 0.5 ? LINE_STOPS[0] : LINE_STOPS[1]), b = srgbVec(t < 0.5 ? LINE_STOPS[1] : LINE_STOPS[2]);
    const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    a.lerp(b, k);                                               /* SVG-Verlaeufe mischen in sRGB: genauso */
    return new Color().setRGB(a.x, a.y, a.z, SRGBColorSpace);
  }

  function buildTube() {
    if (tube) { scene.remove(tube); tube.geometry.dispose(); tube = null; }
    if (cap) { scene.remove(cap); cap.geometry.dispose(); cap = null; }
    pivot.updateMatrixWorld(true);
    /* Anfang: im Fuss, Mitte der Tiefe */
    const p0 = new Vector3(FOOT.x - C0, -(FOOT.y - C0), -(DEPTH + 2 * BT) / 2);
    mesh.localToWorld(p0);
    const d0 = new Vector3(FOOT.dx, -FOOT.dy, 0).transformDirection(mesh.matrixWorld).normalize();
    /* Ende: Unterkante der Buehne, am Uebergabepunkt der Seitenlinie, in der Bildebene (z = 0) */
    const ex = exitEl.offsetLeft - W / 2, ey = -H / 2 - 1;
    const p3 = new Vector3(ex, ey, 0);
    const p1 = p0.clone().addScaledVector(d0, Math.min(L * 0.22, Math.max(24, (p0.y - ey) * 0.5)));
    const p2 = new Vector3(ex, ey + (p0.y - ey) * 0.55, 0);
    tubeCurve = new CubicBezierCurve3(p0, p1, p2, p3);
    const r0 = FOOT_R * s, r1 = phoneQ.matches ? 11 : 20;       /* Seitenlinie: 22 / 40 px breit */
    tubeR = (u) => r0 + (r1 - r0) * smooth(0.03, 0.2, u);
    /* Tiefe: am Fuss so tief wie die Marke, nach kurzem Bogen flach (Wunsch: fast sofort 2D) */
    const deep = ((DEPTH + 2 * BT) / 2) / FOOT_R;
    tubeZ = (u) => (deep + (1 - deep) * smooth(0.0, 0.07, u)) * (1 - 0.92 * smooth(0.05, 0.2, u));
    const TS = 220, RS = 28;
    const g = new TubeGeometry(tubeCurve, TS, 1, RS, false);
    const pos = g.attributes.position, uv = g.attributes.uv;
    const flatCol = new Float32Array(pos.count * 3), col = new Float32Array(pos.count * 3);
    const cTop = new Color(BRAND), cEnd = lineStartColor(exitEl.offsetLeft, H);
    const sTop = srgbVec(BRAND), sEnd = new Color().copy(cEnd); const sEndS = { r: 0, g: 0, b: 0 };
    sEnd.getRGB(sEndS, SRGBColorSpace);
    const c = new Vector3(), v = new Vector3(), tmp = new Color();
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i);
      tubeCurve.getPointAt(Math.min(1, Math.max(0, u)), c);
      v.fromBufferAttribute(pos, i).sub(c);                       /* Versatz vom Mittelpunkt (Laenge 1) */
      v.multiplyScalar(tubeR(u)); v.z *= tubeZ(u);             /* kurz 3D, dann flach: die 2D-Linie */
      pos.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
      const m = smooth(0.06, 0.24, u);
      tmp.copy(cTop).lerp(cEnd, m);
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
      flatCol[i * 3] = sTop.x + (sEndS.r - sTop.x) * m;
      flatCol[i * 3 + 1] = sTop.y + (sEndS.g - sTop.y) * m;
      flatCol[i * 3 + 2] = sTop.z + (sEndS.b - sTop.z) * m;
    }
    g.setAttribute("color", new BufferAttribute(col, 3));
    g.setAttribute("flatCol", new Float32BufferAttribute(flatCol, 3));
    g.computeVertexNormals();
    tube = new Mesh(g, tubeMat);
    scene.add(tube);
    cap = new Mesh(new SphereGeometry(1, 28, 18), capMat);
    scene.add(cap);
    footRest.copy(new Vector3(FOOT.x - C0, -(FOOT.y - C0), -(DEPTH + 2 * BT) / 2));
    mesh.localToWorld(footRest);
  }
  const footRest = new Vector3(), footNow = new Vector3();

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
    pivot.position.set(cx - W / 2, H / 2 - cy + breath * 0.012 * L * amp, -Dw / 2);
    mesh.scale.z = Math.max(0.002, depthP);
    pivot.rotation.set(POSE.rx * turnP + 0.018 * breath * amp, POSE.ry * turnP + 0.03 * sway * amp, POSE.rz * turnP);
    pivot.scale.setScalar(1 + 0.022 * breath * amp);
  }
  function atRest(fn) {
    const k = [pivot.position.clone(), pivot.rotation.clone(), pivot.scale.clone(), inner.position.clone(), mesh.scale.z];
    pose(1, 1, 0, 0, 0); fn();
    pivot.position.copy(k[0]); pivot.rotation.copy(k[1]); pivot.scale.copy(k[2]); inner.position.copy(k[3]); mesh.scale.z = k[4];
  }
  function setGL(on) {
    if (on === glOn) return;
    glOn = on;
    canvas.classList.toggle("is-on", on);
    ink.style.transition = DBG === null ? "opacity 240ms ease" : "none";
    ink.style.opacity = on ? "0" : "1";
  }

  function frame(now) {
    const dt = last ? Math.min(50, now - last) : 0;
    last = now; clock += dt;
    const t = DBG !== null ? Number(DBG) : reduce ? 1e9 : clock;
    if (t < T.gl + 300) draw2d(t);
    setGL(t >= T.gl);
    const dp = easeInOut(span(t, T.d0, T.d1));
    const flat = 1 - smooth(0.15, 0.85, span(t, T.d0, T.d1));
    U.uFlat.value = flat;
    let breath = 0, amp = 0, sway = 0;
    if (!reduce && t > T.breathIn) {
      const bt = t - T.breathIn;
      amp = easeInOut(clamp01(bt / 1800));
      breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * bt) / BREATH);     /* einatmen: heben, weiten; ausatmen: loesen */
      sway = Math.sin((2 * Math.PI * bt) / (BREATH * 2));
    }
    pose(dp, dp, breath, amp, sway);
    /* Linie nach unten: waechst aus dem Fuss; beim Drehen und Atmen folgt ihr oberes Ende dem Fuss */
    const g = easeInOut(span(t, T.t0, T.t1));
    TU.uGrow.value = g;
    pivot.updateMatrixWorld(true);
    footNow.set(FOOT.x - C0, -(FOOT.y - C0), -(DEPTH + 2 * BT) / 2);
    mesh.localToWorld(footNow);
    TU.uDelta.value.copy(footNow).sub(footRest);
    tube.visible = g > 0.002;
    const show = g > 0.002 && g < 0.995;
    cap.visible = show;
    if (show) {
      const c = tubeCurve.getPointAt(g), r = tubeR(g);
      cap.position.copy(c).addScaledVector(TU.uDelta.value, 1 - smooth(0, 0.55, g));
      cap.scale.set(r, r, r * tubeZ(g));
      capMat.color.copy(capTop).lerp(capEnd, smooth(0.06, 0.24, g));
    }
    renderer.render(scene, camera);
  }
  const capTop = new Color(BRAND), capEnd = new Color();

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
  function rebuild() { layout(); sizeScene(); atRest(buildTube); capEnd.copy(lineStartColor(exitEl.offsetLeft, H)); kick(); }
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
  atRest(buildTube);
  capEnd.copy(lineStartColor(exitEl.offsetLeft, H));
  tube.visible = false; cap.visible = false;
  pose(0.002, 0, 0, 0, 0);
  renderer.compile(scene, camera);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!deskQ.matches) rebuild(); });
  kick();
}

/* --- Hilfen ----------------------------------------------------------------------------------- */
function studioEnv(renderer) {
  /* Fotostudio fuer Metall: Raum in ruhigem Grau, vorn (Kameraseite) eine grosse Flaeche mit Helligkeit ~1
     (oben etwas heller, unten etwas dunkler: weicher Verlauf auf der Vorderseite), oben eine Lichtwanne,
     links und rechts schmale Lichtstreifen fuer die Kanten, unten ein dunkler Boden fuer Tiefe. */
  const env = new Scene();
  env.add(new Mesh(new BoxGeometry(60, 40, 60), new MeshBasicMaterial({ color: new Color().setScalar(0.3), side: BackSide })));
  const panel = (w, h, top, bottom, x, y, z) => {
    const g = new PlaneGeometry(w, h, 1, 1), p = g.attributes.position, cols = [];
    for (let i = 0; i < p.count; i++) { const v = p.getY(i) > 0 ? top : bottom; cols.push(v, v, v); }
    g.setAttribute("color", new Float32BufferAttribute(cols, 3));
    const m = new Mesh(g, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(70, 22, 1.2, 1.06, 0, 3, 26);       /* vorn: Vorderseite der Marke = Markenfarbe (sanfter Verlauf) */
  panel(70, 22, 1.06, 1.0, 0, -16, 25.5);   /* vorn unten: hier spiegelt sich die gedrehte Vorderseite */
  panel(2.2, 34, 1.5, 1.35, -12.5, -3, 25); /* schmaler Streifen: Glanzspur ueber die Vorderseite (Metall) */
  panel(34, 7, 3.4, 3.4, 0, 14, -24);       /* hinten oben: Lichtstreifen -> obere Kanten glaenzen */
  panel(7, 30, 3.0, 2.4, 20, 0, -22);       /* hinten rechts: Lichtstreifen -> rechte Flanken glaenzen */
  panel(5, 24, 1.8, 1.4, -22, 2, -20);      /* hinten links: feine Kante */
  panel(26, 26, 2.2, 2.2, 0, 19.5, 4);      /* oben: Lichtwanne */
  panel(60, 60, 0.08, 0.08, 0, -19.5, 0);   /* Boden: dunkel, gibt Metall Tiefe */
  const pm = new PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.012).texture;     /* wenig Unschaerfe: klare Spiegelkanten */
  pm.dispose();
  return tex;
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
function injectTube(mat, U) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGrow = U.uGrow; sh.uniforms.uDelta = U.uDelta; sh.uniforms.uFlat = U.uFlat;
    sh.vertexShader = "attribute vec3 flatCol;\nuniform vec3 uDelta;\nvarying float vU;\nvarying vec3 vFlatCol;\n" + sh.vertexShader
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n  vU = uv.x;\n  vFlatCol = flatCol;\n  transformed += uDelta * (1.0 - smoothstep(0.0, 0.55, uv.x));");
    sh.fragmentShader = "uniform float uGrow;\nuniform float uFlat;\nvarying float vU;\nvarying vec3 vFlatCol;\n" + sh.fragmentShader
      .replace("void main() {", "void main() {\n  if (vU > uGrow) discard;")
      .replace("#include <dithering_fragment>",
        "#include <dithering_fragment>\n  gl_FragColor.rgb = mix(gl_FragColor.rgb, vFlatCol, max(uFlat, smoothstep(0.07, 0.22, vU)));");
  };
}

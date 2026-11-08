# -*- coding: utf-8 -*-
"""
NAHLIO — Seitenkomponenten der neuen Startseite (Fassung 2).

Jede Funktion nimmt Inhaltsdaten entgegen und gibt HTML zurueck. Alle
sichtbaren Texte kommen aus content/*.json; hier steht nur Struktur.

Platzhalter: Werte der Form [[NAME]] werden sichtbar ausgezeichnet und in
PLACEHOLDERS gesammelt, damit build.py sie am Ende auflisten kann.
"""

import html
import io
import os
import re

PLACEHOLDERS = []
_PH_RE = re.compile(r"\[\[([^\]]+)\]\]")
HERE = os.path.dirname(os.path.abspath(__file__))


# ---------------------------------------------------------------------------
# Text-Helfer
# ---------------------------------------------------------------------------

def esc(value):
    return html.escape(u"" if value is None else unicode_str(value), quote=True)


def unicode_str(value):
    return value if isinstance(value, str) else str(value)


def t(value, where=""):
    """Maskieren und Platzhalter sichtbar auszeichnen."""
    raw = u"" if value is None else unicode_str(value)
    for m in _PH_RE.finditer(raw):
        PLACEHOLDERS.append((m.group(1), where))
    out = esc(raw)
    return _PH_RE.sub(lambda m: u'<span class="ph">[[%s]]</span>' % esc(m.group(1)), out)


def plain(value, where=""):
    raw = u"" if value is None else unicode_str(value)
    for m in _PH_RE.finditer(raw):
        PLACEHOLDERS.append((m.group(1), where))
    return esc(raw)


def has_ph(value):
    return bool(_PH_RE.search(u"" if value is None else unicode_str(value)))


def asset(path):
    """Absolute Pfade aus den Inhaltsdaten in relative umwandeln (dist/ ist flach)."""
    return esc((path or u"").lstrip(u"/"))


def read_asset(rel):
    with io.open(os.path.join(HERE, "static", rel), encoding="utf-8") as fh:
        return fh.read()


def svg_inline(rel, cls=""):
    markup = read_asset(rel).strip()
    markup = markup.replace(u'<?xml version="1.0" encoding="UTF-8"?>', u"").strip()
    if cls:
        markup = markup.replace(u"<svg ", u'<svg class="%s" ' % cls, 1)
    return markup


def wa_link(site, where):
    """WhatsApp-Adresse. Solange keine echte Nummer hinterlegt ist, fuehrt der
    Knopf zum Formular und der Platzhalter erscheint in OFFENE-INHALTE.md."""
    num = site["business"].get("whatsapp", u"")
    plain(num, where)
    if not num or has_ph(num):
        return u"#kontakt"
    digits = re.sub(r"\D", u"", num)
    return u"https://wa.me/" + digits


def mail_link(site, where):
    mail = site["business"].get("email", u"")
    plain(mail, where)
    if not mail or has_ph(mail):
        return u"#kontakt"
    return u"mailto:" + esc(mail)


ICON_ARROW_LEFT = (u'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
                   u'<path d="M15 5 8 12l7 7"/></svg>')
ICON_ARROW_RIGHT = (u'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
                    u'<path d="m9 5 7 7-7 7"/></svg>')
ICON_CHECK = (u'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
              u'<path d="m5 12.5 4.5 4.5L19 7.5"/></svg>')
ICON_WA = (u'<svg class="wa-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
           u'<path d="M12 3.2a8.7 8.7 0 0 0-7.5 13.1L3.3 20.7l4.5-1.2A8.7 8.7 0 1 0 12 3.2z"/>'
           u'<path d="M9.2 8.6c.2-.4.5-.4.8-.3l.9 2c0 .3-.3.6-.5.8.5 1 1.3 1.8 2.3 2.3.2-.2.5-.6.8-.5l2 .9c.1.3.1.6-.2 1-.5.8-1.5 1-2.6.7-2.4-.7-4.2-2.5-4.9-4.9-.3-1 0-1.6.4-2z"/></svg>')
ICON_STAR = (u'<svg class="mk-star" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
             u'<path d="M12 3.6l2.5 5.1 5.6.8-4.1 4 1 5.6L12 16.4l-5 2.7 1-5.6-4.1-4 5.6-.8z"/></svg>')


def stars(n=5):
    return u'<span class="mk-stars" aria-hidden="true">%s</span>' % (ICON_STAR * n)


# ---------------------------------------------------------------------------
# Kopf und Rahmen
# ---------------------------------------------------------------------------

# Faellt die Einblend-Logik (30-pop.js) aus, werden die Einblender nach 4 s abgeschaltet:
# Inhalte bleiben so immer sichtbar (kein Text bleibt dauerhaft unsichtbar).
BOOT_SCRIPT = (
    u"(function(d,w){var c=d.documentElement.classList;c.add('js');try{"
    u"if(!w.matchMedia('(prefers-reduced-motion: reduce)').matches)"
    u"c.add('motion-ok');}catch(e){c.add('motion-ok');}"
    u"w.setTimeout(function(){if(!(w.NAHLIO&&w.NAHLIO.popReady))c.remove('motion-ok');},4000);})(document,window);"
)


def head(site, title, description, path, extra_head=u""):
    s = site["site"]
    base = s["url"].rstrip("/")
    canonical = base + path
    ld = structured_data(site) if s.get("structured_data_enabled") else u""
    return u"""<!doctype html>
<html lang="%(lang)s">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>%(title)s</title>
<meta name="description" content="%(description)s">
<link rel="canonical" href="%(canonical)s">
<meta name="theme-color" content="#0B1114">
<meta property="og:type" content="website">
<meta property="og:locale" content="%(locale)s">
<meta property="og:site_name" content="%(name)s">
<meta property="og:title" content="%(title)s">
<meta property="og:description" content="%(description)s">
<meta property="og:url" content="%(canonical)s">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon-32x32.svg" sizes="32x32" type="image/svg+xml">
<link rel="icon" href="favicon-48x48.svg" sizes="48x48" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.svg">
<link rel="manifest" href="site.webmanifest">
<link rel="preload" href="fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/styles.css">
<script>%(boot)s</script>
%(ld)s%(extra)s</head>
<body>
""" % {
        "lang": esc(s["lang"]), "title": esc(title), "description": esc(description),
        "canonical": esc(canonical), "locale": esc(s["locale"]), "name": esc(s["name"]),
        "boot": BOOT_SCRIPT, "ld": ld, "extra": extra_head,
    }


def structured_data(site):
    import json
    b = site["business"]
    s = site["site"]
    data = {
        "@context": "https://schema.org", "@type": "ProfessionalService",
        "name": b["legal_name"], "url": s["url"], "areaServed": s["region"],
        "address": {"@type": "PostalAddress", "streetAddress": b["street"],
                    "postalCode": b["postal_code"], "addressLocality": b["city"],
                    "addressCountry": b["country"]},
        "telephone": b["phone"], "email": b["email"],
    }
    return u'<script type="application/ld+json">%s</script>\n' % json.dumps(data, ensure_ascii=False)


def nav(site, active_page="index"):
    n = site["nav"]
    prefix = u"" if active_page == "index" else u"index.html"
    wa = wa_link(site, "nav")
    links = u"".join(
        u'<li><a class="nav__link" data-nav-link href="%s%s">%s</a></li>'
        % (prefix, esc(i["href"]), t(i["label"], "nav")) for i in n["items"])
    panel_links = u"".join(
        u'<a class="nav__panel-link" data-nav-panel-link href="%s%s">%s</a>'
        % (prefix, esc(i["href"]), t(i["label"], "nav")) for i in n["items"])
    wa_href = (prefix + wa) if wa.startswith(u"#") else wa
    return u"""<a class="skip" href="#inhalt">%(skip)s</a>
<header class="nav" data-nav data-state="light">
  <div class="nav__bar">
    <div class="nav__inner shell">
      <a class="nav__logo" href="%(home)s" aria-label="NAHLIO — Startseite">%(logo)s</a>
      <nav class="nav__links" aria-label="Hauptnavigation">
        <ul class="nav__list">%(links)s</ul>
      </nav>
      <div class="nav__actions">
        <a class="btn btn--sm btn--wa nav__wa" href="%(wa)s">%(waico)s<span>%(walabel)s</span></a>
        <a class="btn btn--sm nav__cta" href="%(ctahref)s">%(cta)s</a>
      </div>
      <button class="nav__toggle" type="button" data-nav-toggle
              aria-expanded="false" aria-controls="nav-panel"
              aria-label="%(open)s" data-label-open="%(open)s" data-label-close="%(close)s">
        <span class="nav__toggle-bars" aria-hidden="true"></span>
      </button>
    </div>
  </div>
  <nav class="nav__panel" id="nav-panel" aria-label="Hauptnavigation" hidden>
    %(panel)s
    <div class="nav__panel-cta">
      <a class="btn" href="%(ctahref)s">%(cta)s</a>
      <a class="btn btn--wa" href="%(wa)s">%(waico)s<span>%(walabel)s</span></a>
    </div>
  </nav>
</header>
""" % {
        "skip": t(n["skip"], "nav"),
        "home": u"index.html" if active_page != "index" else u"#top",
        "logo": svg_inline("logo-wordmark.svg"),
        "links": links, "panel": panel_links,
        "cta": t(n["cta"]["label"], "nav"), "ctahref": prefix + esc(n["cta"]["href"]),
        "wa": wa_href, "waico": ICON_WA, "walabel": t(n["wa"]["label"], "nav"),
        "open": plain(n["menu_open"], "nav"), "close": plain(n["menu_close"], "nav"),
    }


def footer(site, active_page="index"):
    f = site["footer"]
    s = site["site"]
    prefix = u"" if active_page == "index" else u"index.html"
    nav_links = u"".join(
        u'<a href="%s%s">%s</a>' % (prefix, esc(l["href"]), t(l["label"], "footer"))
        for l in f["links"])
    legal = u"".join(
        u'<a href="%s">%s</a>' % (asset(l["href"]), t(l["label"], "footer"))
        for l in f["legal_links"])
    return u"""<footer class="footer">
  <div class="shell">
    <div class="footer__grid">
      <div>
        <div class="footer__logo">%(logo)s</div>
        <p class="footer__claim">%(claim)s</p>
        <p class="footer__claim footer__claim--2">%(claim2)s</p>
      </div>
      <div class="stack">
        <nav class="footer__links" aria-label="%(navlabel)s">%(nav)s</nav>
        <nav class="footer__links footer__links--legal" aria-label="Rechtliches">%(legal)s</nav>
      </div>
    </div>
    <div class="footer__bottom">
      <p>&copy; %(year)s %(copy)s</p>
      <p>%(region)s</p>
    </div>
  </div>
</footer>
""" % {
        "logo": svg_inline("logo-wordmark.svg"),
        "claim": t(f["claim"], "footer"), "claim2": t(f["claim2"], "footer"),
        "navlabel": plain(f["nav_label"], "footer"),
        "nav": nav_links, "legal": legal,
        "year": u"2026", "copy": t(f["copyright"], "footer"), "region": t(s["region"], "footer"),
    }


def tail():
    return u'<script src="js/app.js" defer></script>\n</body>\n</html>\n'


# ---------------------------------------------------------------------------
# Hero
# ---------------------------------------------------------------------------

def hero(site, mocks):
    """Hero: der Slogan gross, darunter die fuenf Leistungen als Bilder. Die Hintergrundlinie
    laeuft beim Laden durch die Bilder (data-line-via) und danach weiter durch die Seite.
    hero.art = "szenen" (Standard): selbst gebaute Darstellungen aus scenes.py;
    "bilder": die fuenf Bilder des Auftraggebers."""
    from scenes import scene, AR_HERO
    h = site["hero"]
    use_scenes = h.get("art", u"szenen") == u"szenen"
    headline = h["headline"]
    # Woerter einzeln (Einblenden nacheinander); der Teil nach dem Gedankenstrich wird hervorgehoben.
    if u" \u2014 " in headline:
        first, hl = headline.split(u" \u2014 ", 1)
        first = first + u" \u2014"
    else:
        first, hl = headline, u""
    words = []
    for w in first.split():
        words.append(u'<span class="hw" style="--i:%d">%s</span>' % (len(words), t(w, "hero")))
    if hl:   # die hervorgehobene Wendung bleibt als eine Einheit (ein durchgehender Farbverlauf)
        words.append(u'<span class="hw hero__hl" style="--i:%d">%s</span>' % (len(words), t(hl, "hero")))
    title = u" ".join(words)

    slides = dict((sl["key"], sl) for sl in site["beispiele"]["slides"])

    def fig(i, k):
        im = slides[k]["image"]
        if use_scenes:
            ar, inner = u"%s" % AR_HERO[k], scene(k, mocks, hero=True)
        else:
            ar = u"%d/%d" % (im["w"], im["h"])
            inner = (u'<img class="art__img" src="img/%s" width="%d" height="%d" alt="" decoding="async" fetchpriority="%s">'
                     % (esc(im["file"]), im["w"], im["h"], u"high" if k == u"karte" else u"auto"))
        return (u'<div class="art art--%s%s" data-pop="rise" data-pop-delay="%d" data-line-via="%s"%s style="--ar:%s">%s'
                u'<span class="art__tag">%s</span></div>'
                % (k, u" art--sz" if use_scenes else u"", i,
                   {u"fotos": u"0.68", u"kontakt": u"0.76", u"karte": u"0.82", u"google": u"0.76", u"website": u"0.68"}[k],
                   u" data-line-front" if k in (u"kontakt", u"google") else u"", ar, inner, t(slides[k]["label"], "hero")))

    figs = u"".join(fig(i, k) for i, k in enumerate([u"fotos", u"kontakt", u"karte", u"google", u"website"]))
    return u"""<section class="hero" id="top" data-nav-theme="light" aria-labelledby="hero-titel">
  <div class="hero__glow" aria-hidden="true"></div>
  <div class="hero__stage">
    <div class="shell hero__copy">
      <p class="hero__eyebrow" data-pop="rise" data-line-clear>%(eyebrow)s</p>
      <h1 class="hero__title" id="hero-titel" data-pop="rise" data-line-clear>%(title)s</h1>
      <p class="hero__sub" data-pop="rise" data-pop-delay="2" data-line-clear>%(sub)s</p>
      <div class="hero__actions" data-pop="rise" data-pop-delay="3">
        <a class="btn btn--brand hero__cta" href="%(p_href)s">%(p_label)s</a>
        <a class="hero__more" href="%(m_href)s">%(m_label)s<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg></a>
      </div>
    </div>
    <div class="hero__art" aria-hidden="true">%(figs)s</div>
  </div>
</section>
""" % {
        "title": title, "eyebrow": t(h["eyebrow"], "hero"), "sub": t(h["sub"], "hero"),
        "p_href": esc(h["cta_primary"]["href"]), "p_label": t(h["cta_primary"]["label"], "hero"),
        "m_href": esc(h["more"]["href"]), "m_label": t(h["more"]["label"], "hero"), "figs": figs,
    }


# ---------------------------------------------------------------------------
# Darstellungen der Beispiele (Szenen aus scenes.py)
# ---------------------------------------------------------------------------

def vis_box(key, mocks, img):
    """Die selbst gebaute Szene (bei Kontakt die Live-Vorfuehrung). Die Bilder des Auftraggebers
    (slides[].image) werden hier nicht mehr gezeigt; sie bleiben fuer hero.art = "bilder" erhalten."""
    from scenes import scene
    return u'<div class="vis vis--%s">%s</div>' % (key, scene(key, mocks, live=(key == u"kontakt")))


# ---------------------------------------------------------------------------
# Fragen nach dem Hero (fragen.docx), Uebergang (wir cool.docx), Beispiele (verbesserungen.docx)
# ---------------------------------------------------------------------------

# Optionale Bilder, die noch fehlen (build.py meldet sie am Ende des Builds).
MISSING_ASSETS = []


def png_size(path):
    """Breite und Hoehe eines PNG aus dem Dateikopf (ohne Zusatzpakete); sonst None."""
    with io.open(path, "rb") as fh:
        head = fh.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")


def blick_image(site):
    """Das freigegebene Kunden-PNG neben den Fragen. Fehlt die Datei, bleibt es bei reinem Text."""
    img = site["blick"].get("image")
    if not img:
        return u""
    path = os.path.join(HERE, "static", "img", img["file"])
    if not os.path.isfile(path):
        MISSING_ASSETS.append(u"static/img/%s (Bild neben den Fragen, siehe fragen.docx)" % img["file"])
        return u""
    size = png_size(path)
    dims = (u' width="%d" height="%d"' % size) if size else u""
    return (u'<figure class="blick__fig" data-pop="rise" data-line-clear><img src="img/%s"%s alt="%s" loading="lazy" decoding="async">'
            u'</figure>' % (esc(img["file"]), dims, esc(img.get("alt", u""))))


# Symbole der drei Fragen (Strichzeichnung, Farbe aus CSS): Angebot = Ladengeschaeft,
# Preise = Preisschild, Kontakt = Sprechblase.
BLICK_ICONS = {
    u"angebot": u'<path d="M4 9.5 5.6 4h12.8L20 9.5"/><path d="M4 9.5a2.67 2.67 0 0 0 5.33 0 2.67 2.67 0 0 0 5.34 0 2.67 2.67 0 0 0 5.33 0"/>'
                u'<path d="M5.5 12.2V20h13v-7.8"/><path d="M10 20v-4.6h4V20"/>',
    u"preise": u'<path d="M3.6 12.4V4.6a1 1 0 0 1 1-1h7.8l8 8a1.4 1.4 0 0 1 0 2l-7 7a1.4 1.4 0 0 1-2 0z"/><circle cx="8.1" cy="8.1" r="1.5"/>',
    u"kontakt": u'<path d="M20 11.6a7.6 7.6 0 0 1-11 6.8L4.4 19.6l1.3-4.3A7.6 7.6 0 1 1 20 11.6z"/><path d="M8.6 11.6h.01M12 11.6h.01M15.4 11.6h.01"/>',
}


def blick(site):
    """Fragen (fragen.docx), als Gespraech: links die Frage des Kunden als Sprechblase, rechts die
    Antwort, die ein guter Auftritt gibt, mit Sprung zum passenden Beispiel. Optional ein Bild
    (kunde-nachdenklich.png) neben der Ueberschrift."""
    bl = site["blick"]
    fig = blick_image(site)
    rows = []
    for i, it in enumerate(bl["items"]):
        ln = it.get("link")
        link = (u'<a class="qa__link" href="#beispiele" data-show-slide="%s">%s%s</a>'
                % (esc(ln["target"]), t(ln["label"], "blick"), ICON_ARROW_RIGHT)) if ln else u""
        rows.append(
            u'<li class="qa" data-pop="rise" data-pop-delay="%d">'
            u'<div class="qa__q" data-line-clear><span class="qa__ic" aria-hidden="true">'
            u'<svg viewBox="0 0 24 24" focusable="false">%s</svg></span><h3 class="qa__bubble">%s</h3></div>'
            u'<span class="qa__arrow" aria-hidden="true">%s</span>'
            u'<div class="qa__a" data-line-clear><span class="qa__check" aria-hidden="true">%s</span>'
            u'<p class="qa__body">%s</p>%s</div></li>'
            % (i + 1, BLICK_ICONS.get(it.get("key"), BLICK_ICONS[u"angebot"]), t(it["q"], "blick"),
               ICON_ARROW_RIGHT, ICON_CHECK, t(it["body"], "blick"), link))
    cols = bl.get("columns", [u"", u""])
    return u"""<section class="blick" id="blick" data-theme="white" data-nav-theme="light" aria-labelledby="blick-titel">
  <div class="shell">
    <header class="blick__head%(headimg)s">
      <div class="blick__headtext" data-line-clear>
        <h2 class="blick__title" id="blick-titel" data-pop="rise">%(h)s</h2>
        <span class="blick__accent" aria-hidden="true" data-pop="rise"></span>
      </div>
      %(fig)s
    </header>
    <div class="qa-cols" data-pop="rise" data-line-clear><p>%(c1)s</p><p>%(c2)s</p></div>
    <ol class="qa-list">%(rows)s</ol>
  </div>
</section>
""" % {"h": t(bl["headline"], "blick"), "fig": fig, "rows": u"".join(rows),
       "headimg": u" blick__head--img" if fig else u"",
       "c1": t(cols[0], "blick"), "c2": t(cols[1], "blick")}


def uebergang(site):
    """Uebergang (wir cool.docx, erweitert): dunkle Flaeche, Aussage in Weiss, vier Saeulen fuehren zu den
    passenden Beispielen. Bei 1920 x 1080 passt der ganze Abschnitt in einen Bildschirm."""
    u = site["uebergang"]
    # Woerter mit Bindestrich (Online-Auftritt) nicht am Bindestrich umbrechen
    head_ = u"".join(
        (u'<span class="uebergang__hl">%s</span>' if p.get("hl") else u"%s")
        % re.sub(r"(\w+-\w+)", r'<span class="nw">\1</span>', t(p["text"], "uebergang"))
        for p in u["headline"])
    pillars = u"".join(
        u'<a class="pillar" href="#beispiele" data-show-slide="%(k)s" data-pop="rise" data-pop-delay="%(d)d">'
        u'<span class="pillar__svc">%(svc)s%(ar)s</span><h3 class="pillar__t">%(title)s</h3>'
        u'<span class="pillar__p">%(text)s</span></a>'
        % {"k": esc(p["target"]), "d": i, "svc": t(p["service"], "uebergang"), "ar": ICON_ARROW_RIGHT,
           "title": t(p["title"], "uebergang"), "text": t(p["text"], "uebergang")}
        for i, p in enumerate(u["pillars"]))
    return u"""<section class="uebergang" data-theme="dark" data-nav-theme="dark" aria-labelledby="uebergang-titel">
  <div class="uebergang__glow" aria-hidden="true"></div>
  <div class="shell uebergang__in">
    <p class="uebergang__eyebrow" data-pop="rise">%(eyebrow)s</p>
    <h2 class="uebergang__title" id="uebergang-titel" data-pop="rise" data-pop-delay="1">%(h)s</h2>
    <p class="uebergang__statement" data-pop="rise" data-pop-delay="2">%(statement)s</p>
    <div class="pillars">%(pillars)s</div>
    <div class="uebergang__end" data-pop="rise">
      <p class="uebergang__closing">%(closing)s</p>
      <a class="uebergang__cta" href="%(href)s">%(cta)s%(ar)s</a>
    </div>
  </div>
</section>
""" % {"eyebrow": t(u["eyebrow"], "uebergang"), "h": head_, "statement": t(u["statement"], "uebergang"), "pillars": pillars,
       "closing": t(u["closing"], "uebergang"), "href": esc(u["cta"]["href"]), "cta": t(u["cta"]["label"], "uebergang"),
       "ar": ICON_ARROW_RIGHT}


def slide_text(sl, idx, total, b):
    bullets = u"".join(u"<li>%s<span>%s</span></li>" % (ICON_CHECK, t(x, "beispiele")) for x in sl["bullets"])
    closing = (u'<p class="sl__closing">%s</p>' % t(sl["closing"], "beispiele")) if sl.get("closing") else u""
    links = u"".join(
        u'<button class="sl__link" type="button" data-slide-action="%s"%s>%s%s</button>'
        % (esc(l["action"]), (u' data-target="%s"' % esc(l["target"])) if l.get("target") else u"",
           t(l["label"], "beispiele"), ICON_ARROW_RIGHT) for l in sl["links"])
    links = (u'<div class="sl__links">%s</div>' % links) if links else u""
    return u"""<article class="sl" data-slide="%(key)s" data-index="%(i)d"%(auto)s aria-hidden="true">
  <p class="sl__label t-label">%(label)s</p>
  <h2 class="sl__h">%(h)s</h2>
  <p class="sl__p">%(p)s</p>
  <ul class="sl__list">%(bullets)s</ul>
  %(closing)s
  %(links)s
</article>""" % {"key": sl["key"], "i": idx, "auto": (u' data-auto-ms="%d"' % sl["auto_ms"]) if sl.get("auto_ms") else u"",
                 "label": t(sl["label"], "beispiele"), "h": t(sl["headline"], "beispiele"),
                 "p": t(sl["paragraph"], "beispiele"), "bullets": bullets, "closing": closing, "links": links}


def beispiele(site, mocks):
    b = site["beispiele"]
    tag = t(mocks["tag"], "mocks")
    slides = b["slides"]
    vis = u"".join(
        u'<div class="zoom__vis" data-vis="%s" aria-hidden="true">%s</div>' % (sl["key"], vis_box(sl["key"], mocks, sl["image"]))
        for sl in slides)
    texts = u"".join(slide_text(sl, i, len(slides), b) for i, sl in enumerate(slides))
    dots = u"".join(
        u'<button class="zoom__dot" type="button" data-slide-dot="%d" aria-label="%s %d"></button>'
        % (i, plain(b["slides_label"], "beispiele"), i + 1) for i in range(len(slides)))
    return u"""<section class="zoom" id="beispiele" data-zoom data-theme="dark" data-nav-theme="dark" aria-label="%(label)s">
  <div class="zoom__inner">
    <div class="zoom__frame" data-zoom-frame>
      <div class="zoom__frame-in" data-zoom-visuals>%(vis)s</div>
      <p class="zoom__tag">%(tag)s</p>
    </div>
    <div class="zoom__panel" data-zoom-panel>
      <div class="zoom__slides" data-zoom-slides>%(texts)s</div>
      <p class="zoom__disclaimer">%(disclaimer)s</p>
    </div>
    <div class="zoom__controls" data-zoom-controls>
      <button class="zoom__btn zoom__btn--prev iconbtn" type="button" data-slide-prev aria-label="%(prev)s">%(al)s</button>
      <div class="zoom__dots" role="group" aria-label="%(slides_label)s">%(dots)s</div>
      <button class="zoom__btn zoom__btn--next iconbtn" type="button" data-slide-next aria-label="%(next)s">%(ar)s</button>
    </div>
  </div>
</section>
""" % {"label": plain(b["label"], "beispiele"), "vis": vis, "tag": tag, "texts": texts,
       "disclaimer": t(b["disclaimer"], "beispiele"), "prev": plain(b["prev"], "beispiele"),
       "next": plain(b["next"], "beispiele"), "slides_label": plain(b["slides_label"], "beispiele"),
       "dots": dots, "al": ICON_ARROW_LEFT, "ar": ICON_ARROW_RIGHT}


def journey(site, mocks):
    """Reihenfolge: Fragen -> kompakter Uebergang -> Beispiele."""
    return u'<div class="journey" data-journey>\n%s%s%s</div>\n' % (blick(site), uebergang(site), beispiele(site, mocks))


# ---------------------------------------------------------------------------
# Leistungen & Preise
# ---------------------------------------------------------------------------

def _plan_list(items, where):
    return u"".join(u"<li>%s<span>%s</span></li>" % (ICON_CHECK, t(x, where)) for x in items)


def pricing(site, pricing_data):
    """Leistungen & Preise (preise.docx): zwei Pakete, CARE kompakt, Anfrage-Zeile, ein Hinweis.
    Preise und Beschreibungen stehen weiter in content/pricing.json; diese Darstellung zeigt sie
    bewusst nicht. Die Ziele der Knoepfe stammen aus pricing.json und site.json."""
    ls = site["leistungen"]
    ids = dict((p["id"], p) for p in pricing_data["items"])

    def price(it, cls):
        pre = it.get("price_prefix")
        return (u'<p class="%s">%s <b>%s</b> <span class="price__per">%s</span></p>'
                % (cls, (u'<span class="price__from">%s</span>' % t(pre, "pricing")) if pre else u"",
                   t(it["price"], "pricing"), t(it.get("price_note", u""), "pricing")))

    def card(key, idx):
        d = ls[key]
        badge = (u'<span class="plan__badge">%s</span>' % t(d["badge"], "leistungen")) if d.get("badge") else u""
        return u"""<div class="plan-wrap" data-pop="rise" data-pop-delay="%(idx)d">
  <article class="plan plan--%(key)s" aria-labelledby="plan-%(key)s-h">
    <div class="plan__top"><p class="plan__label t-label">%(label)s</p>%(badge)s</div>
    <h3 class="plan__h" id="plan-%(key)s-h">%(h)s</h3>
    %(price)s
    <ul class="plan__list">%(list)s</ul>
    <a class="btn plan__cta" href="%(href)s">%(cta)s</a>
  </article>
</div>""" % {"idx": idx, "key": key, "label": t(d["label"], "leistungen"), "badge": badge,
             "h": t(d["headline"], "leistungen"), "price": price(ids[key], u"price plan__price"),
             "list": _plan_list(d["features"], "leistungen"),
             "href": esc(ids[key]["cta"]["href"]), "cta": t(d["cta"], "leistungen")}

    c = ls["care"]
    care_href = esc(pricing_data["care"]["cta"]["href"])
    e = ls["enquiry"]
    return u"""<section class="section plans" id="preise" data-theme="mist" data-nav-theme="light" aria-labelledby="preise-titel">
  <div class="shell">
    <h2 class="plans__title" id="preise-titel" data-pop="rise" data-line-clear>%(headline)s</h2>
    <div class="plans__grid">%(cards)s</div>
    <article class="care" data-pop="rise" aria-labelledby="care-h">
      <div class="care__main">
        <p class="care__meta"><span class="care__label t-label">%(c_label)s</span><span class="care__opt">%(c_sup)s</span></p>
        <h3 class="care__h" id="care-h">%(c_h)s</h3>
        <p class="care__p">%(c_p)s</p>
      </div>
      <div class="care__side">%(c_price)s<a class="btn care__cta" href="%(c_href)s">%(c_cta)s</a></div>
    </article>
    <div class="enquiry" data-pop="rise">
      <div class="enquiry__text" data-line-clear>
        <h3 class="enquiry__h">%(e_h)s</h3>
        <p class="enquiry__p">%(e_p)s</p>
      </div>
      <a class="btn btn--ghost enquiry__cta" href="%(e_href)s">%(e_cta)s</a>
    </div>
    <p class="plans__note" data-pop="rise" data-line-clear>%(tax)s %(note)s</p>
  </div>
</section>
""" % {"headline": t(ls["headline"], "leistungen"), "cards": card("refresh", 0) + card("digital", 1),
       "c_label": t(c["label"], "leistungen"), "c_sup": t(c["supporting"], "leistungen"),
       "c_h": t(c["headline"], "leistungen"), "c_p": t(c["description"], "leistungen"),
       "c_href": care_href, "c_cta": t(c["cta"], "leistungen"),
       "e_h": t(e["headline"], "leistungen"), "e_p": t(e["description"], "leistungen"),
       "e_href": esc(e["href"]), "e_cta": t(e["cta"], "leistungen"), "note": t(ls["note"], "leistungen"),
       "tax": t(ls.get("tax_note", u""), "leistungen"), "c_price": price(pricing_data["care"], u"price care__price")}


# ---------------------------------------------------------------------------
# Ablauf
# ---------------------------------------------------------------------------

def process(site):
    """Ablauf (ablauf.docx): eine H2, vier Schritte mit kurzem Text, Pfeile zwischen den Karten."""
    pr = site["process"]
    head_ = u" ".join(u'<span class="process__l">%s</span>' % t(x, "process") for x in pr["headline_lines"])
    n = len(pr["steps"])
    steps = u"".join(
        u'<li class="step"><div class="step__card" data-pop="rise" data-pop-delay="%d"><span class="step__num">%s</span>'
        u'<h3 class="step__title">%s</h3><p class="step__p">%s</p></div>%s</li>'
        % (i, t(st["num"], "process"), t(st["title"], "process"), t(st["body"], "process"),
           (u'<span class="step__arrow" aria-hidden="true">%s</span>' % ICON_ARROW_RIGHT) if i < n - 1 else u"")
        for i, st in enumerate(pr["steps"]))
    return u"""<section class="section process" id="ablauf" data-theme="white" data-nav-theme="light" aria-labelledby="ablauf-titel">
  <div class="shell">
    <h2 class="process__title" id="ablauf-titel" data-pop="rise" data-line-clear>%(h)s</h2>
    <ol class="steps" data-line-clear>%(steps)s</ol>
  </div>
</section>
""" % {"h": head_, "steps": steps}


# ---------------------------------------------------------------------------
# FAQ
# ---------------------------------------------------------------------------

def faq(site):
    fq = site["faq"]
    items = []
    for i, it in enumerate(fq["items"]):
        items.append(
            u'<div class="faq__item" data-faq-item data-pop="rise" data-pop-delay="%d">'
            u'<h3 class="faq__h"><button class="faq__q" type="button" id="faq-q%d" aria-expanded="false" aria-controls="faq-a%d">'
            u'<span>%s</span><span class="faq__icon" aria-hidden="true"></span></button></h3>'
            u'<div class="faq__panel" id="faq-a%d" role="region" aria-labelledby="faq-q%d">'
            u'<div class="faq__a"><p>%s</p></div></div></div>'
            % (min(i, 4), i, i, t(it["q"], "faq"), i, i, t(it["a"], "faq")))
    return u"""<section class="section faq-sec fit-sec" id="fragen" data-theme="white" data-nav-theme="light">
  <div class="shell">
   <div class="fit" data-fit data-fit-grow="1.5" data-fit-extra=".faq__a">
    <div class="faq-sec__grid">
    <header class="sec-head">
      <p class="t-label" data-pop="rise">%(eyebrow)s</p>
      <h2 class="t-h1 sec-head__title" data-pop="rise" data-pop-delay="1">%(headline)s</h2>
    </header>
    <div class="faq" data-faq>%(items)s</div>
    </div>
   </div>
  </div>
</section>
""" % {"eyebrow": t(fq["eyebrow"], "faq"), "headline": t(fq["headline"], "faq"), "items": u"".join(items)}


# ---------------------------------------------------------------------------
# Kostenloser Kurz-Check
# ---------------------------------------------------------------------------

def kurzcheck(site):
    """Kontakt (contact.docx): kurzer Text, Formular mit vier Feldern, direkte Kontaktwege."""
    import json as _json
    k = site["kurzcheck"]
    f = k["form"]
    endpoint_missing = has_ph(f["endpoint"])
    wa = wa_link(site, "cta/whatsapp")
    mail = mail_link(site, "cta/email")

    def field(fl, typ, required, describedby):
        fid = u"f-" + fl["name"]
        req = u" required aria-required=\"true\"" if required else u""
        extra = u""
        if typ == u"email":
            extra = u' inputmode="email" spellcheck="false" autocapitalize="off"'
        elif typ == u"tel":
            extra = u' inputmode="tel"'
        star = u' <span class="field__req" aria-hidden="true">*</span>' if required else u""
        return (u'<div class="field"><label class="field__label" for="%s">%s%s</label>'
                u'<input id="%s" name="%s" type="%s" autocomplete="%s" data-label="%s"%s%s aria-describedby="%s">'
                u'<p class="field__error" id="%s-error" role="alert"></p></div>'
                % (fid, t(fl["label"], "cta"), star, fid, esc(fl["name"]), typ, esc(fl["autocomplete"]),
                   plain(fl["label"], "cta"), req, extra, describedby, fid))

    msgs = esc(_json.dumps(f["errors"], ensure_ascii=False))
    return u"""<section class="section cta" id="kontakt" data-theme="dark" data-nav-theme="dark" aria-labelledby="kontakt-titel">
  <div class="shell">
    <div class="cta__grid">
      <div class="stack">
        <h2 class="t-h1 cta__title" id="kontakt-titel" data-pop="rise">%(headline)s</h2>
        <p class="cta__body" data-pop="rise" data-pop-delay="1">%(text)s</p>
      </div>
      <form class="form" data-form data-pop="rise" data-pop-delay="2" method="post" action="%(action)s"%(missing)s
            data-messages="%(msgs)s" data-success="%(success)s" data-error="%(error)s" data-unavailable="%(unavail)s" novalidate>
        %(name)s
        %(betrieb)s
        <div class="contact-group" role="group" aria-labelledby="f-contact-hint">
          <p class="contact-group__hint" id="f-contact-hint">%(hint)s</p>
          %(email)s
          %(whatsapp)s
          <p class="field__error" id="f-contact-error" role="alert"></p>
        </div>
        <div class="consent">
          <input type="checkbox" id="f-consent" name="einwilligung" required aria-required="true" data-label="Einwilligung" aria-describedby="f-consent-error">
          <label for="f-consent">%(consent)s <span class="field__req" aria-hidden="true">*</span></label>
        </div>
        <p class="field__error" id="f-consent-error" role="alert"></p>
        <button class="btn form__submit" type="submit">%(submit)s</button>
        <p class="form__status" data-form-status role="status" aria-live="polite"></p>
        <p class="form__note"><span aria-hidden="true">* </span>%(reqnote)s</p>
        <p class="form__note form__privacy">%(p1)s<a href="%(phref)s">%(plink)s</a>%(p2)s</p>
        <div class="form__fallback">
          <a class="btn btn--wa" href="%(wa)s">%(waico)s<span>%(d_wa)s</span></a>
          <a class="btn btn--ghost" href="%(mail)s">%(d_mail)s</a>
        </div>
      </form>
    </div>
  </div>
</section>
""" % {
        "headline": t(k["headline"], "cta"), "text": t(k["text"], "cta"),
        "action": plain(f["endpoint"], "cta/form"),
        "missing": u' data-endpoint-missing="true"' if endpoint_missing else u"",
        "msgs": msgs, "success": plain(f["success"], "cta"), "error": plain(f["error"], "cta"),
        "unavail": plain(f["unavailable"], "cta"),
        "name": field(f["name"], u"text", True, u"f-name-error"),
        "betrieb": field(f["betrieb"], u"text", True, u"f-betrieb-error"),
        "hint": t(f["contact_hint"], "cta"),
        "email": field(f["email"], u"email", False, u"f-contact-hint f-email-error"),
        "whatsapp": field(f["whatsapp"], u"tel", False, u"f-contact-hint f-whatsapp-error"),
        "consent": t(f["consent"], "cta"), "submit": t(f["submit"], "cta"),
        "reqnote": t(f["required_note"], "cta"),
        "p1": t(f["privacy_before"], "cta"), "plink": t(f["privacy_link"], "cta"), "p2": t(f["privacy_after"], "cta"),
        "phref": asset(f["privacy_href"]),
        "wa": esc(wa), "waico": ICON_WA, "d_wa": t(k["direct"]["wa"], "cta"),
        "mail": mail, "d_mail": t(k["direct"]["mail"], "cta"),
    }


def line_layer():
    """Die durchgehende Hintergrundlinie — flach (2D): eine einfarbige Linie,
    kein Leuchten, kein Glanz, kein Verlauf, kein Punkt am Ende. Der Pfad wird von 25-line.js in
    echten Pixeln aufgebaut; ohne Skript bleibt die Ebene leer."""
    return (u'<div class="pageline" data-pageline aria-hidden="true">'
            u'<svg class="pageline__svg" focusable="false">'
            u'<path class="pageline__main" data-line-main d=""/>'
            u'</svg></div>')

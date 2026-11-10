# -*- coding: utf-8 -*-
"""
NAHLIO — Generator ohne Fremdabhaengigkeiten.

    python build.py

Liest content/*.json, rendert die Seiten mit den Komponenten aus
components.py und schreibt alles nach dist/. CSS und JS werden in je eine
Datei zusammengefasst, damit im Browser nur zwei Requests entstehen.

Am Ende listet der Build alle verbliebenen [[PLATZHALTER]] auf. Solange dort
Eintraege stehen, ist die Seite nicht veroeffentlichungsreif.
"""

from __future__ import print_function

import io
import json
import os
import shutil
import sys

import components as C

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist")

# Reihenfolge ist bedeutsam: tokens zuerst, motion zuletzt (gewinnt in der Kaskade).
CSS_ORDER = ["tokens.css", "base.css", "layout.css", "nav.css", "line.css", "hero.css",
             "mocks.css", "scenes.css", "journey.css", "sections.css", "pages.css", "motion.css"]
# 22-fit.js vor 25-line.js: Die Linie misst die Seite erst, wenn die Abschnitte
# auf Bildschirmhoehe gebracht sind.
JS_ORDER = ["10-util.js", "20-nav.js", "22-fit.js", "25-line.js", "30-pop.js",
            "40-journey.js", "45-wa.js", "50-faq.js", "60-form.js"]

STATIC_COPY = ["fonts", "img"]
STATIC_FILES = ["logo-mark.svg", "logo-wordmark.svg"]
# Icon-Paket des Auftraggebers: liegt in static/favicon/, wird flach nach dist/ kopiert.
FAVICON_FILES = ["favicon.svg", "favicon-32x32.svg", "favicon-48x48.svg",
                 "apple-touch-icon.svg", "icon-192.svg", "icon-512.svg"]


def load(name):
    with io.open(os.path.join(HERE, "content", name), encoding="utf-8") as fh:
        return json.load(fh)


def write(rel, text):
    path = os.path.join(DIST, rel)
    folder = os.path.dirname(path)
    if folder and not os.path.isdir(folder):
        os.makedirs(folder)
    with io.open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    return path


def bundle(folder, order, header):
    parts = [header]
    for name in order:
        with io.open(os.path.join(HERE, "static", folder, name), encoding="utf-8") as fh:
            parts.append(u"\n/* ==== %s ==== */\n" % name + fh.read())
    return u"".join(parts)


# ---------------------------------------------------------------------------
# Seiten
# ---------------------------------------------------------------------------

def page_index(site, mocks, pricing_data):
    s = site["site"]
    # Reihenfolge wie in der Word-Datei: Kopf, Hero, Der Blick Ihrer Kunden,
    # Beispiele & Verbesserungen (Zoom), Leistungen & Preise, Ablauf, FAQ,
    # Kostenloser Kurz-Check, Fuss.
    return (
        C.head(site, s["meta_title"], s["meta_description"], "/")
        + C.nav(site)
        + u'<main id="inhalt">\n'
        + C.line_layer()
        + C.hero(site, mocks)
        + C.journey(site, mocks)
        + C.pricing(site, pricing_data)
        + C.process(site)
        + C.faq(site)
        + C.kurzcheck(site)
        + u"</main>\n"
        + C.footer(site)
        + C.tail()
    )


def page_legal(site, legal, key, path):
    doc = legal[key]
    warn = legal["warning"]
    blocks = u"".join(
        u"<section><h2>%s</h2>%s</section>"
        % (
            C.t(b["h"], "legal/" + key),
            u"".join(u"<p>%s</p>" % C.t(p, "legal/" + key) for p in b["p"]),
        )
        for b in doc["blocks"]
    )
    body = u"""<main id="inhalt">
  <section class="section" data-theme="white" data-nav-theme="light">
    <div class="shell">
      <header class="sec-head rail-inset">
        <p class="t-label">%(kicker)s</p>
        <h1 class="t-h1 sec-head__title">%(title)s</h1>
      </header>
      <div class="legal rail-inset">
        <div class="legal__warning">
          <p><strong>%(wt)s</strong></p>
          <p>%(wb)s</p>
        </div>
        %(blocks)s
        <p><a href="index.html">Zurück zur Startseite</a></p>
      </div>
    </div>
  </section>
</main>
""" % {
        "kicker": u"NAHLIO",
        "title": C.t(doc["title"], "legal/" + key),
        "wt": C.t(warn["title"], "legal"),
        "wb": C.t(warn["body"], "legal"),
        "blocks": blocks,
    }
    return (
        C.head(site, doc["meta_title"], doc["meta_description"], path)
        + C.nav(site, active_page=key)
        + body
        + C.footer(site, active_page=key)
        + C.tail()
    )


def manifest(site):
    return json.dumps({
        "name": site["site"]["name"], "short_name": site["site"]["name"],
        "lang": site["site"]["lang"], "start_url": "./index.html", "display": "browser",
        "background_color": "#F7FAFA", "theme_color": "#0B1114",
        "icons": [
            {"src": "icon-192.svg", "sizes": "192x192", "type": "image/svg+xml", "purpose": "any"},
            {"src": "icon-512.svg", "sizes": "512x512", "type": "image/svg+xml", "purpose": "any"},
        ],
    }, ensure_ascii=False, indent=2) + u"\n"


def robots(site):
    base = site["site"]["url"].rstrip("/")
    return u"User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % base


def sitemap(site):
    base = site["site"]["url"].rstrip("/")
    urls = ["/", "/impressum.html", "/datenschutz.html"]
    items = u"".join(
        u"  <url><loc>%s%s</loc><changefreq>monthly</changefreq></url>\n" % (base, u)
        for u in urls
    )
    return (
        u'<?xml version="1.0" encoding="UTF-8"?>\n'
        u'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + items
        + u"</urlset>\n"
    )


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def main():
    site = load("site.json")
    mocks = load("mocks.json")
    pricing_data = load("pricing.json")
    legal = load("legal.json")

    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)

    write("index.html", page_index(site, mocks, pricing_data))
    write("impressum.html", page_legal(site, legal, "impressum", "/impressum.html"))
    write("datenschutz.html", page_legal(site, legal, "datenschutz", "/datenschutz.html"))

    write("css/styles.css", bundle("css", CSS_ORDER,
          u"/* NAHLIO — erzeugt von build.py. Quellen liegen in static/css/. */\n"))
    write("js/app.js", bundle("js", JS_ORDER,
          u"/* NAHLIO — erzeugt von build.py. Quellen liegen in static/js/. */\n"))

    for folder in STATIC_COPY:
        src = os.path.join(HERE, "static", folder)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(DIST, folder))
    for name in STATIC_FILES:
        shutil.copy2(os.path.join(HERE, "static", name), os.path.join(DIST, name))
    for name in FAVICON_FILES:
        shutil.copy2(os.path.join(HERE, "static", "favicon", name), os.path.join(DIST, name))
    write("site.webmanifest", manifest(site))

    write("robots.txt", robots(site))
    write("sitemap.xml", sitemap(site))

    # --- Bericht ------------------------------------------------------------
    print("Build fertig ->", DIST)

    seen = {}
    for name, where in C.PLACEHOLDERS:
        seen.setdefault(name, set()).add(where or "-")

    write_open_items(seen)

    if C.MISSING_ASSETS:
        print("\nOptionale Bilder fehlen (die Seite funktioniert trotzdem, siehe Hinweis):")
        for m in C.MISSING_ASSETS:
            print("  -", m)

    if not seen:
        print("\nKeine Platzhalter. Seite ist inhaltlich veroeffentlichungsreif.")
        return 0

    print("\n%d offene Platzhalter (%d Stellen im HTML):"
          % (len(seen), len(C.PLACEHOLDERS)))
    for name in sorted(seen):
        print("  [[%s]]  ->  %s" % (name, ", ".join(sorted(seen[name]))))
    print("\nVollstaendige Liste mit Fundstellen: OFFENE-INHALTE.md")
    print("Solange hier Eintraege stehen, darf die Seite nicht veroeffentlicht werden.")
    return 0


# Klartext-Zuordnung fuer die Stellenangaben aus components.py
QUELLEN = {
    "nav": "content/site.json -> nav",
    "hero": "content/site.json -> hero",
    "blick": "content/site.json -> blick",
    "beispiele": "content/site.json -> beispiele",
    "mocks": "content/mocks.json",
    "leistungen": "content/site.json -> leistungen",
    "process": "content/site.json -> process",
    "faq": "content/site.json -> faq",
    "cta": "content/site.json -> kurzcheck",
    "cta/form": "content/site.json -> kurzcheck.form.endpoint",
    "cta/whatsapp": "content/site.json -> business.whatsapp",
    "cta/email": "content/site.json -> business.email",
    "business": "content/site.json -> business",
    "footer": "content/site.json -> footer",
    "legal": "content/legal.json -> warning",
}


def quelle(where):
    if where.startswith("pricing/"):
        return "content/pricing.json -> %s" % where.split("/", 1)[1]
    if where.startswith("legal/"):
        return "content/legal.json -> %s" % where.split("/", 1)[1]
    return QUELLEN.get(where, where)


def write_open_items(seen):
    """Schreibt OFFENE-INHALTE.md neu.

    Die Datei entsteht bei jedem Build aus den tatsaechlich gerenderten
    Platzhaltern und kann deshalb nicht veralten.
    """
    lines = [
        u"# Offene Inhalte",
        u"",
        u"**Diese Datei erzeugt `python build.py` bei jedem Lauf neu. Nicht von Hand bearbeiten.**",
        u"",
        u"Jeder Eintrag ist ein bewusster Platzhalter: Er steht in den Inhaltsdaten,",
        u"erscheint im HTML sichtbar markiert und muss vor der Veroeffentlichung durch",
        u"eine echte, gepruefte Angabe ersetzt werden.",
        u"",
    ]
    if not seen:
        lines += [u"Aktuell ist kein Platzhalter offen. Die Seite ist inhaltlich fertig.", u""]
    else:
        lines += [
            u"Offen: **%d Platzhalter** an %d Stellen im HTML."
            % (len(seen), len(C.PLACEHOLDERS)),
            u"",
            u"| Platzhalter | Wo eintragen |",
            u"| --- | --- |",
        ]
        for name in sorted(seen):
            orte = sorted(set(quelle(w) for w in seen[name]))
            lines.append(u"| `[[%s]]` | %s |" % (name, u"<br>".join(orte)))
        lines.append(u"")

    if C.MISSING_ASSETS:
        lines += [u"## Fehlende optionale Bilder", u""]
        lines += [u"- `%s`" % m for m in C.MISSING_ASSETS]
        lines.append(u"")

    with io.open(os.path.join(HERE, "OFFENE-INHALTE.md"), "w",
                 encoding="utf-8", newline="\n") as fh:
        fh.write(u"\n".join(lines))


if __name__ == "__main__":
    sys.exit(main())

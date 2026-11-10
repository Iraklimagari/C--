# NAHLIO — neue Startseite (Fassung 2)

Dieser Ordner ist die **neue** Seite. Die erste Fassung liegt unverändert im Nachbarordner
`nahlio-site` und bleibt dort erhalten.

## Öffnen

- **`START.cmd`** (Doppelklick) oder **`python start.py`**: baut die Seite, startet die Vorschau auf
  `http://127.0.0.1:8124/` (ist der Port belegt, wird der nächste freie genommen) und öffnet den Browser.
  Beenden: Fenster schließen oder Strg+C. Nur bauen: `python start.py --nur-bauen`, `BAUEN.cmd` oder
  `python build.py`.
- Ohne alles: `SEITE-OEFFNEN.cmd` bzw. `dist/index.html` per Doppelklick (manche Browser laden dabei
  die Schriften nicht).

## Aufbau der Seite (Reihenfolge)

1. Kopf: Logo, Beispiele · Leistungen & Preise · Ablauf · FAQ, Knöpfe „WhatsApp“ und „Kontakt aufnehmen“
2. **Hero** (`hero.css`, `components.py › hero()`): der Slogan groß und mittig in der Schrift der Apple-Seiten
   (SF Pro auf Apple-Geräten, sonst Inter, eng gesetzt), darunter die fünf Leistungen als Bilder in einer Reihe
   (Fotos & Kurzvideos, Kontakt & WhatsApp, Digitale Karte, Google-Profil, One-Page-Website). Die Bilder sind
   selbst gebaute Darstellungen (`scenes.py`, `scenes.css`): Geräte mit echter, lesbarer Oberfläche und
   Unsplash-Fotos; im Hero nur die Geräte. Zurück zu den fünf Bildern des Auftraggebers: in `content/site.json`
   `hero.art` auf `"bilder"` setzen. Der Hero ist genau einen Bildschirm hoch (Fensterhöhe minus Kopfleiste, mindestens 640 px);
   die Bilder beginnen knapp unter den Knöpfen (rund 32 px Abstand) und füllen den Rest, unten blenden sie in
   die nächste Fläche aus. Öffnen der Seite: Wörter, dann die Bilder von links nach rechts nacheinander; die
   durchgehende Linie zieht sich von selbst (ohne Scrollen) durch alle fünf Bilder, mal hinter, mal vor ihnen
   (Attribute `data-line-via` und `data-line-front`), und läuft unten aus dem ersten Bildschirm — erst von dort
   folgt sie dem Scrollen. Am Handy und Tablet sind es drei Bilder.
3. **Fragen** (`#blick`, `fragen.docx`): weiße Fläche als Gespräch. Links die Frage des Kunden als
   Sprechblase mit Symbol davor (Laden, Preisschild, Sprechblase; `BLICK_ICONS` in components.py) („Ihre Kunden fragen“), rechts die Antwort („Ihr Auftritt antwortet“) mit Sprung zum passenden
   Beispiel (One-Page-Website, Digitale Karte, Kontakt & WhatsApp). Texte wortgleich aus `fragen.docx`.
   Optionales Bild rechts neben der Überschrift: liegt `static/img/kunde-nachdenklich.png` im Projekt, erscheint
   es automatisch; ohne Datei bleibt es bei Text (build.py meldet das).
4. **Übergang** (`wir cool.docx`, erweitert): dunkle Fläche, große Überschrift mit „Aushängeschild“ in Türkis,
   längere Aussage in Weiß, vier Säulen (Fotos & Kurzvideos, Google-Profil, Digitale Karte & Website, Kontakt &
   WhatsApp — jede springt zum passenden Beispiel), Schlusszeile und Knopf „Beispiele ansehen“. Passt bei
   1920 × 1080 und 1920 × 950 in einen Bildschirm. Der längere Text ist ein NAHLIO-Entwurf (siehe `_hinweis`).
5. **Beispiele** (`#beispiele`, `verbesserungen.docx`): dunkle Fläche, links das Bild, rechts Etikett,
   große Überschrift, Absatz, drei Punkte, Schlusssatz; fünf Leistungen, Wechsel alle 10 s oder per Knopf
   (Kontakt & WhatsApp 17 s, `auto_ms`). Bild = selbst gebaute Darstellung (die alten Bilder des Auftraggebers
   werden in den Beispielen nicht mehr gezeigt; die Dateien `bsp-*.webp` liegen weiter im Ordner und dienen nur
   noch `hero.art = "bilder"`). Digitale Karte: iPad (Tablet-Layout) plus Handy, im Hero nur das iPad.
   Kontakt & WhatsApp ist eine Live-Vorführung (`45-wa.js`): ein
   Finger tippt „Termin buchen“, wählt einen der nächsten sechs Öffnungstage und eine Uhrzeit, der Termin wird
   bestätigt; Tage und Zeiten sind auch selbst anklickbar, „Vorführung neu starten“ beginnt von vorn.
   Google-Profil: „Vorher · Nachher“ zeigt das leere Profil. Die Speisekarte ist nur online (kein Papier,
   kein Tischaufsteller).
6. **Leistungen & Preise** (`#preise`, `preise.docx`): zentrierte Überschrift, REFRESH und DIGITAL,
   kompakter CARE-Block, Zeile „Individuell anfragen“, ein Hinweis. Preise (seit 19.10.2026 sichtbar, aus
   `content/pricing.json`): REFRESH ab 499 €, DIGITAL ab 999 € (einmalig), CARE 75 € / Monat. Der
   Umsatzsteuerhinweis ist noch ein Platzhalter (`leistungen.tax_note` in site.json).
7. **Ablauf** (`#ablauf`, `ablauf.docx`): eine H2, vier Karten mit Pfeilen.
8. **FAQ** (`#fragen`)
9. **Kontakt** (`#kontakt`, `contact.docx`): dunkle Fläche, links Überschrift und Satz, rechts das Formular mit
   vier Feldern; darunter „Per WhatsApp schreiben“ / „E-Mail schreiben“.
10. Fuß mit Impressum und Datenschutzerklärung

Alle Texte stehen in `content/site.json`, Preisdaten in `content/pricing.json`, Texte der Konzeptbilder in
`content/mocks.json`.

## Was passiert beim Scrollen

- **Durchgehende Linie** (`25-line.js`, `line.css`): eine dicke, dunkle, flache Linie ohne Punkt am Ende. Sie
  zeichnet sich beim Öffnen der Seite zeitgesteuert von links außen durch die Bilderreihe des Hero (Start nach
  0,55 s, Dauer 3,4 s, weich anfahrend und auslaufend; `INTRO_DELAY` und `INTRO_DUR` in `25-line.js`), läuft von
  dort beim Scrollen mit Nachlauf durch die Seite und hält Abstand zu Texten: Elemente mit `data-line-clear` (Fragen, Übergang, Preis-Überschrift, Ablauf,
  Bild) bekommen eine weich auslaufende Aussparung. Über der dunklen Beispiele-Fläche ist sie nicht zu sehen.
- **Beispiele** (`40-journey.js`): Die Fläche steht normal im Seitenfluss, genau eine Bildschirmhöhe unter der
  Navigation. Die Bilder liegen auf einer waagerechten Schiene und gleiten von rechts nach links; das erste
  Beispiel zeigt nach 2 s kurz (10 %), dass es weitere gibt. Die Knöpfe der Leistungen blenden die früheren
  Konzeptdarstellungen als zweiten Zustand ein (Kontakt-Beispiel, Vorher · Nachher, Bildbeispiele).
- **FAQ** (`22-fit.js`): wird mit CSS `zoom` auf eine Bildschirmhöhe gebracht (verkleinern bis 72 %,
  vergrößern bis 1,5-fach).
- **Einblenden** (`30-pop.js`, `motion.css`, abschnittsweise überschrieben in `journey.css`/`pages.css`): nur Deckkraft und
  Verschiebung; Elemente mit Tastaturfokus erscheinen sofort. Meldet 30-pop.js sich nicht (Notfall), schaltet das
  Startskript im Seitenkopf nach 4 s die Einblender ab: Inhalte bleiben immer sichtbar.
- **Anker**: `html` hat `scroll-padding-top` = Navigationshöhe + 1,5 rem. Jeder Abschnitt setzt `scroll-margin-top`
  = 28 px − Innenabstand oben (`--pt`) − 1,5 rem, so steht die Überschrift 28 px unter der Navigation (bei
  Bildschirmflächen wie FAQ und Beispiele bündig darunter). Keine festen Positionen im Code.
- **Navigation** (`20-nav.js`): Hell/Dunkel folgt der Fläche, die unter der Unterkante der Leiste beginnt, bei jedem
  Scroll-Ereignis und nach Sprüngen (Hash, Anker).
- **Formular** (`60-form.js`): Name und Betrieb Pflicht, E-Mail oder WhatsApp-Nummer (mindestens eine, beide
  einzeln geprüft), deutsche Fehlermeldungen, Eingaben bleiben erhalten; „Vielen Dank …“ erst nach bestätigter
  Zustellung. Ohne eingetragenen Empfänger (`[[FORMULAR-ENDPUNKT]]`) steht ehrlich, dass das Formular noch nicht
  verbunden ist.

Schmale Fenster, Reduced Motion und ohne JavaScript: alles ruhig untereinander, alle Inhalte vorhanden.

## Bearbeiten

- Inhalte: `content/*.json`; Aufbau: `components.py`; Stile: `static/css/*.css`; Skripte: `static/js/*.js`.
- Danach `python build.py` (oder `START.cmd`); `dist/` wird jedes Mal neu geschrieben.
- Offene Platzhalter (`[[...]]`) listet der Build und `OFFENE-INHALTE.md`.

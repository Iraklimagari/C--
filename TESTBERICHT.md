# Testbericht — neue Startseite (Fassung 2)

Stand: 08.10.2026 · Prüfstand: Chromium-Engine der eingebauten Vorschau, Windows 11.
Die Bewegung selbst war im verdeckten Vorschaufenster nicht zu sehen; gemessen wurden Zustände bei festen Scrollpositionen, nicht der flüssige Eindruck.

## Nachtrag 19.10.2026 — neue Darstellungen, WhatsApp live, Fragen und Übergang neu

Umgesetzt: fünf selbst gebaute Darstellungen (Kamera/Kurzclip, WhatsApp-Terminbuchung, Online-Speisekarte,
Google-Profil, Website des ausgedachten Restaurants „Uferhaus“ in eigenen Farben) mit 11 neuen Unsplash-Fotos
(vom Nutzer freigegeben, davon 10 verwendet, verkleinert als WebP, zusammen ~440 KB). Hero zeigt nur die Geräte.
Geprüft im **echten Chrome** (1536 × 730 bzw. 1536 × 674) und im Vorschaufenster (1920 × 1080, 1920 × 950, 390 × 844):

| Bereich | Ergebnis |
| --- | --- |
| WhatsApp live | Ablauf im echten Chrome mitgeschrieben: Start ~1 s nach Sichtbarkeit, Termin bestätigt nach ~13 s, Bestätigung bleibt ~5 s stehen, Wechsel zu Google nach ~19 s. Finger, Tageswahl, Uhrzeiten sichtbar. Tage = nächste sechs Öffnungstage ab morgen (Sonntag übersprungen, einer „voll“). |
| Gefundener Fehler | Wechsel-Takt lief schon, wenn der Abschnitt nur am Rand sichtbar war → Vorführung brach nach ~9 s ab. Jetzt startet die Vorführung den Takt neu. |
| Vorher · Nachher | leeres Profil (keine Fotos, „Noch keine Rezensionen“, „Öffnungszeiten hinzufügen“, nur „Route“), Hinweis „Vorher“ |
| Weiteres Beispiel | zeigt das Bild des Auftraggebers, `aria-pressed` wechselt, beim Wechsel des Beispiels zurück |
| Sprünge | „Beispiel: Digitale Karte“ (Fragen) und Säule „Google-Profil“ (Übergang) öffnen das richtige Beispiel, Abschnitt landet bündig unter der Leiste |
| Übergang | 794 px hoch bei 1920 × 1080 (frei 991), 780 px bei 1920 × 950 (frei 861); Text weiß, blendet als Ganzes ein; Überschrift 2 Zeilen, „Online-Auftritt“ bricht nicht mehr am Bindestrich |
| Hero-Bilder (Nachtrag) | etwas größer und mit Abstand statt Überlappung: bei 1920 × 1080 Höhen 441/481/520/461/353 px (vorher 392/456/510/432/304), Abstand 42 px, Reihe 64–1841 px; 1920 × 950, 1440 × 900, 1024 × 768 und 390 × 844 ohne Überlaufen, 33–71 px Abstand zum Text |
| iPad (Nachtrag) | Digitale Karte als iPad (Hero: nur iPad, Beispiele: iPad + Handy); Reihe passt bei 1920 × 1080 (36–1869 px), 1440 × 900 (25–1400), 1024 × 768 (16–993), 390 × 844 (12–378); im echten Chrome geprüft. Alte Bilder und Knöpfe „Weiteres Beispiel“ aus den Beispielen entfernt (Dateien bleiben). |
| Handy | keine seitliche Überlaufung; Hero zeigt drei Telefone mittig; alle fünf Darstellungen passen in den Rahmen der Beispiele |
| Konsole | keine Fehler der Seite (einzige Meldung stammt von einer Chrome-Erweiterung) |

Nicht geprüft: Safari/Firefox, echtes Handy, Reduced Motion im umgeschalteten Browser (dann: WhatsApp zeigt den
fertigen Ablauf ohne Vorführung, laut Code). Der lange Übergangstext und die Spaltenbeschriftungen der Fragen sind
NAHLIO-Entwürfe und müssen freigegeben werden.

## Nachtrag 16.10.2026 — Hero erschien erst nach dem Scrollen (behoben)

Meldung: „Die Seite kommt nicht raus, erst nachdem ich scrolle.“ Erstmals in einem **echten Chrome** geprüft
(Fenster 1536 × 730, entspricht einem Laptop mit 125 % Skalierung; das verdeckte Vorschaufenster spielt
Einblendungen nicht ab, dort hatte ich sie immer von Hand ausgelöst und den Fehler deshalb nicht gesehen).
Ursache: Alle Einblendungen hingen am Beobachter in `30-pop.js` (sichtbar ab 8 %, untere Grenze 9 % über dem
Fensterrand). Das Bild „One-Page-Website“ sitzt bei niedrigen Fenstern ganz unten und startet zusätzlich 90 px
tiefer — es lag außerhalb der Grenze, blieb auf `opacity 0` und erschien erst nach dem Scrollen. Bei 1920 × 1080
fiel das nicht auf. Behebung: Alle Teile des Hero werden 60 ms nach dem Laden von selbst eingeblendet, unabhängig
vom Beobachter (der Rest der Seite bleibt beim Scrollen eingeblendet wie bisher).
Prüfung im echten Chrome (1536 × 730): vorher 4 von 5 Bildern sichtbar, nachher 5 von 5, kein Teil des Hero
bleibt unsichtbar, Hero-Unterkante = Fensterunterkante (730), Bilder steigen nacheinander auf (gemessen:
Deckkraft der Bilder wächst von links nach rechts), Linie zieht sich bis zum Ende des Hero-Wegs. Im Testfenster
stockte die Bildtaktung zwischendurch (Fenster im Hintergrund, Chrome drosselt) — in einem Fenster im Vordergrund
nicht zu erwarten, aber auch dort nicht beurteilt. Weitere Fenstergrößen im echten Chrome nicht möglich
(Fenster ließ sich nicht verkleinern).

## Nachtrag 15.10.2026 (nachts) — Hero: kleinerer Abstand, ein Bildschirm, Linie beim Öffnen

Rückmeldung: Abstand zwischen Text und Bildern zu groß, alles soll in 1920 × 1080 passen, und die Linie soll sich beim
Öffnen von selbst (ohne Scrollen) durch alle Bilder ziehen und am Ende der ersten Seite auslaufen.
Ursache der Lücke: Der Versatz der Bilder nach unten war in Prozent der **Breite** angegeben (9 % von 1905 px = 171 px),
dadurch standen die Bilder 214–290 px unter den Knöpfen und waren unten weit abgeschnitten (Karte bis y = 1360).
Jetzt: Versatz als Anteil der Bildhöhe (`translate`), Bilder beginnen direkt unter den Knöpfen.

| Fenster | Abstand Knöpfe → höchstes Bild | Hero-Unterkante | Bilderreihe |
| --- | --- | --- | --- |
| 1920 × 1080 | 34 px (vorher 214) | 1081 | 116–1789, alle Bilder zu über 90 % sichtbar |
| 1920 × 950 | 32 px | 951 | 270–1635 |
| 1440 × 900 | 32 px | 901 | 84–1341 |
| 1280 × 720 | 31 px | 729 (Mindesthöhe 640 px) | 202–1063 |
| 1024 × 768 | 51 px (Breite begrenzt die Bildhöhe) | 769 | 14–995 |
| 768 × 1024 / 390 × 844 | 68 / 48 px | 968 / 790 | drei Bilder, nichts läuft über |

Linie beim Öffnen: zeitgesteuert statt „schießt los und bremst“. Gemessen mit einer Testseite, die die Bildtaktung des
verdeckten Fensters ersetzt (danach gelöscht): Start nach rund 0,55 s, Länge wächst weich (am Anfang und Ende langsam, in
der Mitte etwa 900 px/s), nach rund 3,95 s steht sie bei 1927 px Pfadlänge am Ende des Hero-Wegs (1679, 1042 im Seitenmaß,
also rund 50 px unter dem ersten Bildschirm von 1080 px). Hauptebene und vordere Ebene haben dabei immer denselben
Strichabstand. Die Bilder steigen nacheinander auf (Abstand 210 ms), die Linie erreicht jedes Bild kurz nach seinem Aufstieg.
Gefundener Fehler: Die Sonderregel für niedrige Fenster (< 760 px) stand vor der Grundregel und machte den Hero bei
1280 × 720 1875 px hoch — entfernt. **Nicht gesehen:** die fertige Bewegung in Echtzeit (nur Zahlen und Endzustand),
Aufsteigen der Bilder und Wörter im verdeckten Fenster.

## Nachtrag 15.10.2026 (spät) — neuer Hero im Stil der Apple-Seiten

Neu: Slogan groß und mittig (Schrift SF Pro auf Apple-Geräten, sonst Inter; gilt jetzt für die ganze Seite, Archivo
ist nicht mehr eingebunden), darunter fünf Leistungsbilder als Reihe, durch die sich die Hintergrundlinie beim Laden
zieht. Gemessen bei 1920 × 950, 1440 × 900, 1280 × 800, 1024 × 768, 768 × 1024 und 390 × 844: kein seitliches
Überlaufen, Titel 2 Zeilen (Desktop) bzw. 3–4 Zeilen (Tablet/Handy), Bilderreihe liegt komplett im Fenster
(1024 px: 18–991 px), Knöpfe und Bilder stehen im ersten Bildschirm. Gefunden und behoben: auf dem Handy war die
Rasterspalte breiter als das Fenster (Text rechts abgeschnitten) und bei 1024 px war die Reihe breiter als das
Fenster. Keine Konsolenfehler; Anker `#beispiele`, `#preise`, `#ablauf`, `#kontakt` landen unverändert unter der
Leiste. **Nicht gesehen:** die Lade-Animation selbst (Wörter nacheinander, Bilder steigen auf, Linie zeichnet sich) —
das verdeckte Vorschaufenster spielt keine Übergänge ab; geprüft wurde der Endzustand, die Linie mit von Hand
gesetztem Strichabstand. Echtes SF Pro ist nur auf Apple-Geräten zu sehen, auf Windows erscheint Inter.

## Nachtrag 15.10.2026 — Umsetzung der sechs Word-Dateien und der neuen Bilder

Umgesetzt wurden `fragen.docx`, `wir cool.docx`, `verbesserungen.docx`, `preise.docx`, `ablauf.docx`, `contact.docx`
sowie die fünf neuen Bilder; außerdem `start.py` und `START.cmd` neu angelegt. Geprüft im Browser-Fenster der
Entwicklungsumgebung (Chromium) bei 1920 × 950 und 1920 × 1080 (frühere Läufe), 1440 × 900, 1280 × 800, 1024 × 768,
768 × 1024, 390 × 844 und 360 × 740. Das Fenster ist verdeckt: Scroll-Ereignisse und Übergänge laufen dort nur
teilweise, deshalb wurden Zustände nach Sprüngen gemessen und Scroll-Ereignisse gezielt ausgelöst.

| Bereich | Ergebnis |
| --- | --- |
| Reihenfolge | Hero → Fragen → Übergang → Beispiele → Leistungen & Preise → Ablauf → FAQ → Kontakt |
| Fragen | Überschrift, drei Fragen und Zeilen wortgleich, je einmal, in `#blick`; alte Zeile „DER BLICK IHRER KUNDEN“, Schlusssatz, Nummern und Telefon-Bilder entfernt; Schrift 36/28/18 px (1440), 28/21/16 px (390); Höhe 594 px (1440), kein Zoom, kein Scrollweg |
| Übergang | Überschrift 40 px (1440) / 28 px (390), „Aushängeschild“ in tiefem Türkis, Höhe 278 px |
| Beispiele | Kein Zoom, kein festgehaltener Bereich; Abschnitt = eine Bildschirmhöhe unter der Navigation; Texte aller fünf Leistungen wortgleich, Überschrift 41 px (1440) / 28 px (390); alle Texte passen in 1280 × 800, 1440 × 900; Bilder laden (5 von 5); `#beispiele` landet bündig unter der Navigation |
| Bilder der Beispiele | Auftraggeber-Bilder als Hauptdarstellung; Knöpfe „Kontakt-Beispiel“, „Vorher · Nachher“, „Bildbeispiele“ blenden die früheren Darstellungen als zweiten Zustand ein |
| Preise | Überschrift zentriert (42 px bei 1440), keine Preise, Eyebrow, Einleitung, „Noch unsicher?“; zwei gleich breite Karten (649 px), Knöpfe bündig unten; DIGITAL mit Abzeichen und türkiser Linie; CARE und Anfrage-Zeile kompakt; Hinweis einmal; Knopfziele unverändert (`#kontakt`); der Steuer-Platzhalter ist aus dem Build verschwunden (17 statt 18 offene Platzhalter) |
| Ablauf | Eine H2 (zwei Zeilen am Desktop), vier gleich große Karten in einer Reihe ab 1120 px, zwei Spalten darunter (Pfeile nur 01→02 und 03→04), eine Spalte am Handy (Pfeile nach unten); keine Überlappung, kein seitliches Überlaufen |
| Kontakt | H2 und Satz wortgleich, genau vier Felder in der vorgegebenen Reihenfolge, Hilfstext, „Anfrage senden“, Pflichtfeld-Zeile, Datenschutz-Hinweis mit Link, zwei direkte Knöpfe; alte Texte entfernt |
| Formular | Geprüft: leer (Fehler Name/Betrieb/Kontakt/Einwilligung, Fokus auf Name), nur Name+Betrieb (Kontaktfehler, Eingaben erhalten), ungültige E-Mail und Nummer (eigene Meldungen), Nummern +49…, 0049…, (0170) 123-4567, 0170/1234567 gültig, 5 Ziffern ungültig, nur E-Mail, nur WhatsApp, beide; mit simuliertem Empfänger: Erfolg erst nach bestätigter Antwort (Felder werden geleert), bei Netzwerk- und Serverfehler Fehlermeldung mit erhaltenen Eingaben; ohne Empfänger ehrliche „noch nicht verbunden“-Meldung |
| Anker | `#preise`, `#ablauf`, `#kontakt`: Überschrift 27 px unter der Navigation (1440, 1024, 390); von oben, von unten, per Hash, über das Handy-Menü (Menü schließt, Position stimmt) |
| Navigation | Hell/Dunkel stimmt an allen 122 Messpunkten (hoch und runter) mit der Lage der Abschnitte überein; am gelandeten `#kontakt` dunkel, am gelandeten `#preise`/`#ablauf` hell |
| Notfall | Fehlt die Meldung der Einblender, sind sie nach 4 s abgeschaltet und Inhalte sichtbar |

Nicht möglich oder nicht geprüft: Firefox und Safari; echte Scroll-Bewegung (Bildtakt) im verdeckten Fenster; ein
Server-Handler für das Formular existiert im Projekt nicht (Prüfung nur im Browser); Reduced-Motion und ohne
JavaScript wurden anhand der Regeln geprüft, nicht im umgeschalteten Browser. Das Kunden-PNG für die Fragen fehlt
(Layout mit Bild wurde mit einem Prüfbild getestet und wieder entfernt).

## Nachtrag 08.10.2026 — Anpassungen nach Rückmeldung (Werte vor der „größer“-Runde)

Gemessen bei 1920 × 1080 und 1920 × 950 (so groß ist die Seitenfläche eines 1080-Bildschirms mit Browserleiste), 1440 × 900, 1366 × 650 und 390 × 844.

| Wunsch | Ergebnis | Messwert |
| --- | --- | --- |
| Hero kleiner, passt auf einen Bildschirm | erfüllt | Titel 62 px (vorher 82) in drei Zeilen; Inhalt endet bei 789 von 1080 px (1920 × 1080) und 689 von 900 px (1440 × 900) |
| Bilder der zweiten Seite kleiner, Luft oben und unten | erfüllt | Bildhöhe 43 % der Fensterhöhe bei 1920 × 1080, 49 % bei 950, 52 % bei 900 (vorher rund 72 %) |
| Auf der zweiten Seite immer WhatsApp | erfüllt | beim Zurückscrollen aus dem Beispiel „Google-Profil“ wird bei 20 % der Strecke wieder `kontakt` angezeigt |
| Dritte Seite: Bild und Text im Bildschirm | erfüllt | Rahmen 838 × 798 px bei (48, 109) in 1920 × 950, also mit Luft auf allen Seiten; Kopf beginnt bei 111 px unter der Navigation (89); Hinweis endet bei 855 von 950 px; Text passt bei allen fünf Beispielen |
| Überschrift der Beispiele etwas kleiner | erfüllt | 30 px (vorher 42) |
| Bilder der Beispiele etwas kleiner (Telefone, Karten) | erfüllt | Telefon 60 % der Rahmenbreite statt 64 %, Google-Karte 78 % statt 82 % |
| Beispiele gleiten von rechts nach links | erfüllt | beim Wechsel zu „Google-Profil“ lief das Bild von x = 864 nach x = 48; Versatz der fünf Bilder 0, 1, 2, −2, −1 |
| Kleiner Hinweis (10 %) auf weitere Beispiele | erfüllt | Schiene schiebt sich nach 2,2 s und 6,4 s kurz zur Seite und kehrt zurück; Wechsel zum nächsten Beispiel nach 10 s |
| Fünf Punkte, Karte und Website getrennt, WhatsApp zuerst | erfüllt | 01 Kontakt & Anfragen, 02 Google-Profil, 03 Neue Fotos & Kurzvideos, 04 Digitale Karte, 05 One-Page-Website; fünf Punkte |
| Keine Linie auf dem schwarzen Bildschirm beim Übergang | erfüllt | die dunkle Fläche liegt über der Linie; im Screenshot der offenen Bühne ist keine Linie zu sehen |
| Preise auf einen Bildschirm | erfüllt | 1920 × 1080: ohne Verkleinerung, Inhalt von 140 bis 1019 px; 1920 × 950: Verkleinerung auf 92 %; 1440 × 900: 86 % |
| CARE als eine lange Leiste | erfüllt | eine einzige Leiste unter beiden Paketen, 146 px hoch |
| FAQ auf einen Bildschirm | erfüllt | 1920 × 1080: 333 bis 853 px; mit der längsten Antwort offen endet die letzte Karte bei 844 von 950 px |
| Kurz-Check auf einen Bildschirm | erfüllt | 1920 × 1080: 237 bis 950 px; 1920 × 950: 171 bis 884 px |
| Ablauf auf einen Bildschirm (zusätzlich) | erfüllt | 1920 × 1080: 250 bis 936 px |
| Linie: länger, kreuzt sich, geht wieder nach oben | erfüllt | Pfadlänge 40 804 px bei 10 849 px Seitenhöhe (3,8-fach), mit großen Schleifen und langen Schwüngen |
| Linie: erst schnell, am Ende langsam | umgesetzt, Gefühl nicht beurteilt | Nachlauf mit Zeitkonstante 0,34 s (schnell zu Beginn, auslaufend); im Vorschaufenster nur Zustände messbar |
| Linie dunkler, ohne Punkt am Ende, ohne Linien am Weg | erfüllt | Strichfarbe rgb(2, 109, 125) bei 24 px; Zahl der Punkte und Hilfslinien im Dokument: 0 |

## Nachtrag 08.10.2026 (spät) — „alles, was ich geändert habe, etwas größer“

Auf Rückmeldung („sieht zu klein aus“) wurden alle zuletzt verkleinerten Teile wieder angehoben. Gemessen bei 1920 × 1080, 1920 × 950, 1440 × 900, 1536 × 730 und 390 × 844.

| Teil | vorher | jetzt |
| --- | --- | --- |
| Hero-Titel | 62 px | 72 px bei 1920 (65 px bei 1536, 62 px bei 1440); Hero endet bei 811 von 1080 px |
| Bilder der zweiten Seite | 43–52 % der Fensterhöhe | 52 % (1080), 59 % (900 und 730); Breite bis 31 rem |
| Zoom-Bühne, Rahmen | 838 × 798 px | 846 × 940 px bei 1920 × 1080; 735 × 817 bei 950; 641 × 769 bei 1440 × 900 |
| Zoom-Bühne, Text | Überschrift 30 px | größere Schriften (Überschrift bis 2,45 rem, Fließtext bis 1,05 rem); Text passt bei allen fünf Beispielen in 1080, 950, 900 und 730 (bei 730 mit Stufe „kompakt“) |
| Telefone, Karten in den Beispielen | 60 % der Rahmenbreite | 66 % |
| Preise, Ablauf, FAQ, Kurz-Check | Schriften 0,875–1,1 rem | Schriften 0,95–1,3 rem; Überschriften bis 3,5 rem |

Damit die größere Schrift auf den Seiten mit Verkleinerung nicht gleich wieder weggerechnet wird, wurde die Berechnung genauer: Der freie Platz berücksichtigt jetzt das tatsächliche Polster des Abschnitts (vorher pauschal 34 px, dabei blieb der Inhalt bei 1080 px knapp unter dem Fensterrand hängen). Die Preise-Karten sind etwas dichter gesetzt (Abstände, Polster), nicht kleiner in der Schrift.

| Fenster | Preise | Ablauf | FAQ | Kurz-Check |
| --- | --- | --- | --- | --- |
| 1920 × 1080 | ohne Verkleinerung, 106–1015 px | ohne, 204–965 | ohne, 309–861 | ohne, 207–962 |
| 1920 × 950 | 91 % (vorher 86 %) | ohne | ohne | ohne |
| 1440 × 900 | 86 % | ohne | ohne | ohne |
| 1536 × 730 | 72 % (Untergrenze) | 81 % | 90 % | 81 % |

Alle vier Seiten liegen in diesen Fenstergrößen vollständig zwischen Navigation und Fensterunterkante, wenn der Abschnitt oben anliegt. Kein seitliches Überlaufen bei 1920, 1536, 1440 und 390 px Breite.

## Nachtrag 08.10.2026 (Abend) — Linie läuft erst beim Scrollen hinein

Wunsch: Auf der Startseite soll keine Linie stehen; sie soll vom Startpunkt weich bis zu ihrer Stelle laufen, statt als ganze Linie aufzutauchen.

| Zustand (1920 × 950) | gezeichnete Länge | Spitze auf dem Bildschirm |
| --- | --- | --- |
| Seitenanfang | 15 px | 40 px über der Oberkante — nichts zu sehen |
| 0,1 Fensterhöhen gescrollt | 172 px | 4 px unter der Oberkante, rechts oben (x ≈ 1446) |
| 0,3 | 1114 px | 275 px, Linie schwingt nach links (x ≈ 650) |
| 0,5 | 1804 px | 601 px |
| ab 0,7 | 2160 px und mehr | 760 px = 80 % der Fensterhöhe, wie bisher |

Zurück am Seitenanfang zieht sich die Linie wieder nach oben aus dem Bild. Gemessen mit schrittweise gerechneter Animation (das verdeckte Vorschaufenster liefert keine Animationsbilder); das Gefühl beim echten Scrollen ist nicht beurteilt. Bei Reduced Motion steht die Linie weiterhin fertig gezeichnet da, also auch auf dem Hero.

## Nachtrag 08.10.2026 (Nacht) — weniger leere Fläche, alles noch größer

Rückmeldungen: „zu viele leere Flächen auf der ganzen Seite“, „in den Preisen darf auf dem ersten Bildschirm nur REFRESH und DIGITAL stehen, CARE kommt beim Weiterscrollen“, „das WhatsApp-Bild auf der zweiten Seite ist kleiner als die anderen“, „Kurz-Check 40 % größer“.

Ursachen und Maßnahmen:

- Der Inhalt war nur 1296 von 1920 px breit (`--page-max` 88 rem): jetzt 112 rem, Inhalt 1767 px breit.
- Abschnitte konnten nur schrumpfen: jetzt füllen sie den Bildschirm (Verkleinern **und** Vergrößern, `22-fit.js`).
- Schrift insgesamt zu klein für große Fenster: Wurzelschrift wächst mit dem Fenster; Hero-Titel 104 px statt 72 px.
- Das WhatsApp-Bild: Der Platzhalter hatte das Seitenverhältnis des Zoom-Rahmens (9 : 10), die beiden anderen Bilder 4 : 5, also war es bei gleicher Breite niedriger und sein Telefon kleiner. Jetzt ist der Rahmen ebenfalls 4 : 5.
- Preise: Bildschirm 1 = Kopf + REFRESH + DIGITAL; Bildschirm 2 = CARE (lange Leiste), Hinweise und Sonderwunsch zweispaltig. CARE „poppt“ beim Hineinscrollen auf.
- Kurz-Check: Text und Formular (Felder zweispaltig) füllen den Bildschirm; der Block „Oder direkt schreiben“ steht darunter als eigener Streifen.

| Fenster | Hero-Titel | Bilder der Fragen (CSS-Breite) | Zoom-Rahmen | Preise 1 | CARE | Ablauf | FAQ | Kurz-Check |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920 × 1080 | 105 px | 536 px, alle drei gleich | 752 × 940 | 114 % | 129 % | 109 % | 122 % | 134 % |
| 1920 × 950 | 104 px | 471 px, alle drei gleich | 654 × 817 | 108 % | 123 % | 103 % | 112 % | 126 % |
| 1440 × 900 | 82 px | | 615 × 769 | 106 % | 117 % | 99 % | 113 % | 116 % |
| 1536 × 730 | 85 px | 362 px | 486 × 607 | 90 % | 109 % | 88 % | 90 % | 107 % |

Die Zoomwerte gelten zusätzlich zur gewachsenen Wurzelschrift (1920 × 950: 18 px statt 16 px, 1920 × 1080: 19 px). Der Kurz-Check ist damit sichtbar rund 41 % (950) bzw. 59 % (1080) größer als vorher; bei 1440 × 900 rund 30 %. Alle Bildschirme liegen vollständig zwischen Navigation und Fensterunterkante; die Texte der fünf Beispiele passen in allen vier Fenstern (bei 1536 × 730 mit Stufe „kompakt“, Schrift 78 %). Auf dem Handy (390 px) kein seitliches Überlaufen.

Nicht geprüft: das Gefühl beim Scrollen, Firefox/Safari, Fenster über 2560 px.

## Nachtrag 08.10.2026 (spät) — Text sauber ordnen, Bilder größer, „Wie kann ich Sie erreichen?“

Rückmeldungen: „Texte wirken in die Box geworfen“, „Texte der dritten Seite (kleine, nicht die hervorgehobenen) etwas größer“, „bei ‚Wie kann ich Sie erreichen?‘ ist der ganze Text zu groß und passt nicht in den Bildschirm“, „das WhatsApp-Bild ist weiter klein – Bild vergrößern, nicht den Text verändern“.

- **‚Wie kann ich Sie erreichen?‘ (dritte Frage):** Fehler gefunden — in der Bühne wurde das Seitenpolster überschrieben, der Text klebte bei x = 0 am linken Rand. Jetzt mit Seitenrand; die Schriftgrößen der Fragen sind zusätzlich an die Fensterhöhe gekoppelt (`min(…vw, …svh)`), damit der ganze Text immer in den Bildschirm passt. Gemessen: 1920 × 950 Text von 281 bis 757 px, 1920 × 1080 von 327 bis 841, 1536 × 730 von 220 bis 598, 1440 × 900 von 281 bis 707 (alles innerhalb des Fensters).
- **Bilder der Fragen:** Alle drei haben jetzt dasselbe Format (das des Zoom-Rahmens, global als `--zoom-ar`) und dieselbe Höhe (64 % der Fensterhöhe); 1920 × 950: alle drei 487 × 608 px. Das Telefon füllt das Bild stärker (76 % der Breite statt 66 %, unten angeschnitten) — in den Fragen 1 und 2 und im ersten Beispiel (WhatsApp) gleich.
- **Beispiele (dritte Seite):** Die Texte sind in zwei Spalten gegliedert (Text | Liste), Hinweise (grüner Kasten, Anmerkung) in voller Breite darunter, Knopf und Hinweis in eigenen Zeilen; Zeilenlängen jetzt ruhig (vorher bis 140 Zeichen pro Zeile). Kleine Texte größer, Überschriften behalten ihre Größe (schrumpfen beim Anpassen nur halb so stark). Gemessen am ersten Beispiel (Kontakt & Anfragen): 1920 × 1080 Einleitung 22 px, Absatz/Liste 20 px, Hinweiskasten 17 px (vorher 17 / 15,6 / 12,7); 1920 × 950: 19 / 18 / 15 px; 1440 × 900 und 1536 × 730: 15 / 14 / 12 px (Platz knapp; dort entfällt bei 1536 × 730 die Einleitung).
- **Preise und Ablauf:** Pakete als Spalte mit Knopf immer unten bündig, Preis mit Trennlinie; Ablauf-Karten mit größerem Text (1,1 rem) und Titel; FAQ-Antworten und Kurz-Check-Texte größer; Überschriften laufen ausbalanciert (`text-wrap: balance`), Absätze ohne einzelne Wörter in der letzten Zeile (`pretty`).

Alle Bildschirme bleiben vollständig im Fenster (1920 × 950 und 1920 × 1080 geprüft; 1536 × 730 und 1440 × 900 siehe oben).

## Nachtrag 08.10.2026 (spät) — letzte Seite wie in der ersten Fassung

Wunsch: „Letzte Seite genauso wie in der alten, nur mit dem neuen Text.“ Verglichen mit `nahlio-site` (Port 8123, `#kontakt`):

- Dunkle Fläche, Inhaltsbreite 88 rem wie früher. Die gewölbte Oberkante der ersten Fassung (und der Schatten darüber) wurde auf Wunsch wieder entfernt: gerade Kante.
- Zwei gleich breite Spalten: links „Kostenloser Kurz-Check“ (Beschriftung), die große Überschrift (max. 16 Zeichen Breite, 72 px bei 1920), die drei Absätze und die kleine Zeile „Kostenlos und unverbindlich.“; rechts das Formular ohne Karte (Eingabefelder mit leicht heller Fläche, 48 px hoch), Einwilligung, Knopf, Hinweis, darunter durch eine Linie getrennt „Lieber direkt Kontakt aufnehmen?“ mit WhatsApp- und E-Mail-Knopf (früher: E-Mail/Telefon als Text).
- Fuß wie früher (Logo 34 px, Anspruch, Links, Rechtslinks, Zeile unten).
- Neue Texte und Felder aus der Word-Datei bleiben: Betrieb und Ort, Rückmeldung per E-Mail/WhatsApp/Telefon, E-Mail oder Telefon, aufklappbar „Weitere Informationen ergänzen“.
- Diese Seite wird **nicht** mehr auf einen Bildschirm gezwungen (wie früher normal scrollbar): 1920 × 950: 1152 px hoch; Handy 390 px: 1632 px, kein seitliches Überlaufen. Die übrigen Bildschirme (Preise 1 und 2, Ablauf, FAQ) passen weiterhin ins Fenster.
- Nicht übernommen: das „Darüberschieben“ der Fragen (Stapeleffekt) der ersten Fassung; die Seite davor ist die FAQ, die auf einen Bildschirm skaliert wird.

## Nachtrag 08.10.2026 (spät) — Hinweis „es gibt weitere Beispiele“

Wunsch: Der kleine Schub (10 % nach links und zurück) soll schon nach 2 Sekunden kommen und nur beim ersten Beispiel. Vorher: nach 2,4 s und nach 6,6 s bei jedem Beispiel. Jetzt: ein Schub nach 2 s (`NUDGE_MS`), nur wenn das erste Beispiel (Kontakt & Anfragen) zu sehen ist; bei den anderen vier Beispielen kein Schub. Der Wechsel von selbst nach 10 s bleibt.

## Nachtrag 08.10.2026 (spät) — Hero wieder wie in der ersten Fassung

Wunsch: Der Hero soll wieder so groß sein wie in der ersten Fassung (`nahlio-site`, gemessen bei 1920 × 950: Titel 56 px, Zeilenhöhe 1,08, Inhalt 736 px breit, Einleitung 18,4 px, Beschriftung 12 px, Knöpfe 15 px). Die neue Seite hat dieselben Werte, aber in px statt rem, damit die mit dem Fenster wachsende Grundschrift sie nicht vergrößert. Der Text bleibt der neue (Titel „Damit Ihr Unternehmen online genauso überzeugt — wie vor Ort.“). Der Hero steht weiter am linken Seitenrand der breiteren neuen Seite, nicht in der engeren Mitte der ersten Fassung.

### Entscheidungen, die ich getroffen habe

- **Mindestgröße der Schrift:** Die Abschnitte werden nur bis 72 % verkleinert. Bei kleinen Fenstern (zum Beispiel 1366 × 650 Seitenhöhe) passen Preise, Ablauf, FAQ und Kurz-Check deshalb nicht mehr auf einen Bildschirm, sondern laufen darüber hinaus; sonst wäre die Schrift kleiner als 10 px.
- **Kleine Fenster:** Unter 660 px Höhe gibt es keine Zoom-Bühne; Bild, Text und Beispiele stehen dann untereinander, alle Inhalte bleiben erhalten.
- **Lesbarkeit über der Linie:** Weil die Linie dunkel ist und Text kreuzt, bekommt Text in den Abschnittsköpfen einen weichen hellen Hof (`text-shadow` in Flächenfarbe).

### Linie mit weniger Kreuzungen (08.10.2026, später)

Auf Wunsch kreuzt sich die Linie deutlich seltener: überwiegend weite Schwünge von links nach rechts ohne Kreuzung, nur jede vierte Station ist eine große Schleife. Gemessen (1920 × 950, Seitenhöhe 10 845 px): 2 Kreuzungen auf der ganzen Seite, Pfadlänge 23 061 px (2,1-fach der Seitenhöhe; vorher 3,8-fach mit deutlich mehr Kreuzungen).

### Korrektur am Zoom (08.10.2026, später)

Die Zoom-Bühne war auf Fenstern unter 760 px Höhe abgeschaltet (Ursache für „der Übergang ist weg“, zum Beispiel bei 1920 × 1080 mit Windows-Skalierung 125 %, also 1536 × rund 730). Jetzt läuft sie ab 660 px Höhe. Auf niedrigen Fenstern ist das Bild nicht breiter als 86 % seiner Höhe, damit der Text mehr Breite bekommt. Gemessen: 1536 × 730: Bild 510 × 593 px, dunkle Fläche wächst (Radius 0 → 219 → 876 → 1405 px bei 0 / 20 / 40 / 88 %), Text passt bei allen fünf Beispielen (Schrift 79 %, ohne Einleitung); 1920 × 950: Bild 686 × 798 px, Schrift 100 %, alles sichtbar; 1280 × 610: reicht nicht mehr (Text 365 von 336 px) — dort steht alles untereinander.

### Nicht geprüft

- Das Gefühl der Linienbewegung und des Wechsels der Beispiele beim echten Scrollen.
- Firefox und Safari (CSS `zoom` und `clip-path` dort nicht getestet).
- Der helle Hof um Text über der Linie nur an wenigen Stellen angesehen.

---

## Inhalt und Reihenfolge

| Prüfung | Ergebnis |
| --- | --- |
| Texte wortgetreu aus der Word-Datei | erfüllt; keine zusätzlichen Inhalte außer den Darstellungen (siehe unten) |
| Reihenfolge Kopf, Hero, Der Blick, Beispiele, Leistungen & Preise, Ablauf, FAQ, Kurz-Check, Fuß | erfüllt (gemessene Abschnittslagen bei 1440 × 900: Hero 77, Blick 901, Zoom 2811, Preise 6276, Ablauf 8617, FAQ 9778, Kurz-Check 10694 px) |
| Navigation: Beispiele · Leistungen & Preise · Ablauf · FAQ, dazu „WhatsApp“ und „Online-Auftritt prüfen lassen“ | erfüllt; zwischen 1024 und 1279 px zeigt WhatsApp nur das Zeichen |
| Logo größer | 58 px hoch ab 1024 px (vorher 39), 50 px mobil (vorher 35); Leiste 88 px |
| Icon-Paket | `favicon.svg`, 32 px, 48 px, Apple-Touch, 192 und 512 px, `site.webmanifest` (SVG) |
| Preise 449 € / 799 € / CARE 49 € pro Monat | wie in der Word-Datei |
| CARE als eine lange Leiste | erfüllt: Breite 927 px = Breite beider Pakete zusammen (1024 px Fenster) |
| FAQ: acht Fragen, eine offen, geöffnete Karte hebt sich ab | erfüllt: Rahmen, Balken, Schatten, leichte Vergrößerung; `aria-expanded` wechselt |
| Formular: Felder, Auswahl E-Mail/WhatsApp/Telefon, aufklappbare weitere Angaben | erfüllt; Einwilligungsfeld aus der ersten Fassung beibehalten (Rechts- und Consent-Themen waren nicht Teil des Auftrags) |

## Linie

Flach (2D): einfarbig, kein Leuchten, kein Glanz, kein Verlauf, auf ausdrücklichen Wunsch. Eine Linie von 15 727 px Länge bei 1440 px Breite, hinter allen Bildern und Texten, über den Flächen der Abschnitte, auch über dem dunklen Kurz-Check sichtbar. Blasse gepunktete Vorzeichnung zeigt den Weg voraus.

## Zoom und Beispiele (Desktop, 1440 × 900 und 1024 × 640)

| Prüfung | Messwert |
| --- | --- |
| Bildrahmen vorher / nachher (1024 × 640) | 411 × 567 px bei x 575 → 464 × 640 px bei x 0, y 0: volle Höhe, linker Rand |
| Bildrahmen (1920 × 1080) | 876 × 1080 px bei x 0 (46 % der Breite) |
| Dunkle Fläche | Radius 0 → 141 → 559 → 879 → 896 px bei 0 / 20 / 40 / 60 / 85 % der Strecke |
| „Beispiele“ und Text zu Kontakt & Anfragen erscheinen | ab 56 % der Strecke (`is-open`) |
| Navigation wird dunkel | ja, ab 34 % der Strecke (Zustand `dark` nach Neumessung bestätigt; im verdeckten Vorschaufenster löste das Scrollen allein die Umschaltung nicht aus, weil dort die Bildtakt-Funktion nicht läuft — das ist eine Eigenheit der Testumgebung) |
| Steuerknöpfe unten links und rechts | Ecken bei (20, 621) und (989, 621) im 1024 × 640-Fenster |
| Anker `#beispiele` | landet bei 65 % der Strecke, Bereich offen |
| Automatischer Wechsel | Kontakt → Google → Fotos im Abstand von 10 s (9,3 und 19,3 s nach Start gemessen); Pause bei verdecktem Tab |
| Knöpfe, Punkte, „Vorher · Nachher“, Verweis Karte ↔ Website | wechseln sofort |
| Text passt in die Bühne (alle fünf Beispiele) | 1920 × 1080 und 1440 × 900: ja, Schrift 100 %. 1280 × 720: Einleitung und Zusatzhinweise entfallen, Schrift 85 %. 1024 × 640: Schrift 66 %, ebenfalls gekürzt |
| Kein waagerechter Überlauf | 1920, 1440, 1280, 1024, 390 px: 0 |
| Konsole | keine Fehler |

## Schmale Fenster

390 × 844: kein Zoom, Frage, Bild, Beispiele untereinander, Beispiele wechseln per Knopf; Seitenbreite exakt 390 px, kein Überlauf.

## Bilder

- Neun Fotos von Unsplash (zusammen etwa 1,7 MB), Quellen in `static/img/BILDQUELLEN.md`.
- Fotograf mit Profikamera: `foto-kamera-kueche.jpg` (Kameramann filmt einen Koch beim Anrichten) und `foto-kamera-restaurant.jpg`.
- Google-Ergebnisse mit „4,7“, Google-Profil, WhatsApp-Chat mit Terminen, digitale Speisekarte und Website auf dem Telefon sind selbst gebaut. Namen, Bewertungen, Preise und Chatverläufe sind ausgedacht und im Bild als „Konzeptdarstellung — Namen und Bewertungen sind fiktiv“ gekennzeichnet.

## Nicht geprüft

- Firefox und Safari, echte Geräte, Touchwischen, das Gefühl beim echten Mausrad.
- Reduced Motion und „ohne JavaScript“ nur durch Lesen des Codes, nicht simuliert.
- Kontrastmessung der neuen Flächen (WhatsApp-Grün mit dunkler Schrift, helle Schrift auf dem dunklen Beispiel-Bereich) nicht gerechnet.
- Der Eintrag „Bildnachweis Projektbilder“ im Impressum stammt aus der ersten Fassung und passt nicht mehr zu den Fotos; Rechtstexte wurden nicht angefasst.

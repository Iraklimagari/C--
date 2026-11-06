# Higgsfield: die ganze NAHLIO-Website als UI/UX-Design

Recherche vom 06.11.2026. Ziel: Entwürfe, die als 16:9-Bild funktionieren und auch als Handy-Ausschnitt
(Mitte, 9:16 oder 4:5) noch gut aussehen.

## Was die Recherche sagt (kurz)

- **In Schichten arbeiten:** erst das Design-System, dann Layout je Abschnitt, dann Feinschliff. Ein Abschnitt
  pro Bild ist lesbarer als die ganze Seite in einem Bild.
- **Strukturierter Prompt:** Zweck, Marke, Leinwand (16:9 Desktop, 1440 px, 12 Spalten), dann die Blöcke in
  Lesereihenfolge mit Lage („links“, „rechts“, „darunter“).
- **Lesereihenfolge nennen:** H1 → Unterzeile → Text → Knopf; große, selbstbewusste Überschriften.
- **Text:** nur kurze Überschriften und Knöpfe exakt in Anführungszeichen; Fließtext als Platzhalter
  akzeptieren (der echte Text kommt aus dem Code). Kleine Textfehler: neu erzeugen.
- **Ausschlüsse nennen:** keine überladenen Karten, keine schwache Hierarchie, kein Deko-Rauschen.
- **Handy mitdenken:** Hauptinhalt in einer **mittleren Spalte** (mittleres Drittel der Breite), Seitenbereiche
  ruhig und ohne Text; dann zeigt ein Mittelausschnitt alles.

Quellen: dev.to (GPT Image 2 für Webdesign), YouMind (JSON-Prompt für eine Studio-Website, 16:9-Raster), Felo
(ganze Seite in einem Bild, kleine Textfehler), vibecoder (mobile-first), Hostinger und Lummi (Hierarchie,
Raster, Ausschlüsse), CapCut (Platz für Text im Hero).

## Modell und Kosten (Free-Plan, Stand 06.11.)

`gpt_image_2`, 16:9, 1k, Qualität mittel = 1 Credit; einfach = 0,5. Immer nur ein Auftrag gleichzeitig.
Für alle neun Abschnitte als einzelne 16:9-Bilder: etwa 9 Credits.

## 1. Gemeinsamer Block (vor jeden Abschnitts-Prompt setzen)

```
Purpose: high-fidelity UI/UX design of one section of a German one-page website for NAHLIO, an agency that
makes local businesses look as convincing online as in person. 16:9 desktop frame of a 1440px-wide design,
flat screenshot, no device frame. The key content sits in a centred column (the middle third of the width)
so a 9:16 phone crop of the centre still shows the whole message; the outer thirds stay calm, without text.
Design system: ink #0B1114, white, light mist #E8F2F4, turquoise #01ABC3 and deep turquoise #007F91 only
as accents. Headlines in an elegant high-contrast book serif, body in a clean geometric sans. Square corners,
flat surfaces separated by tone steps, no gradients, no drop shadows, no thin divider lines, no small
uppercase labels, no rows of icon cards, no clutter. Reading order: headline, one sentence, action.
Text: render the quoted words exactly; other copy may be small realistic German placeholder text.
No watermark, no other logos.
```

## 2. Abschnitte (je ein 16:9-Bild)

1. **Hero:** soft off-white; very large serif headline "Damit Ihr Unternehmen online genauso überzeugt —
   wie vor Ort." ("wie vor Ort." deep turquoise italic), one sentence; large flat turquoise logo mark (N with
   a location pin). Navigation: "NAHLIO", "Leistungen" "Preise" "Ablauf" "FAQ", pill "Kontakt aufnehmen".
2. **So finden Kunden zu Ihnen:** white; serif headline "So finden Kunden zu Ihnen" and step "Gefunden
   werden" in the centre column; a smartphone with a local search result and yellow stars beside it.
3. **Fragen:** white; very large centred serif "Finden Ihre Kunden online die richtigen Antworten?"; one big
   ink-black square card "Was bieten Sie an?" with a small shop drawing.
4. **Leistungen:** ink-black; "So gestalten wir Ihren Online-Auftritt."; wide photo card split by a white
   divider with round handle, "Nachher" left, "Vorher" right; cards peeking at the edges; round arrows; pills
   "Google-Profil" "Website" "Digitale Karte" "WhatsApp" "Fotos".
5. **Preise:** light mist; serif "Pakete für Ihren Online-Auftritt."; white square card "REFRESH" "ab 499 €",
   ink square card "DIGITAL" "ab 999 €", white band "CARE" "75 € / Monat"; pills "REFRESH anfragen",
   "DIGITAL anfragen".
6. **Ablauf:** white; serif "Sie führen Ihren Betrieb. Wir kümmern uns um die Umsetzung."; four columns
   "Kennenlernen" "Abstimmen" "Umsetzen" "Übergeben", each a small light block "Ihr Teil" and a tall ink
   block "Unser Teil"; a turquoise progress bar across the top.
7. **FAQ:** light mist; serif "Fragen & Antworten"; flat white rows with a plus sign: "Brauche ich eine neue
   Website?", "Sind Fotos und Kurzvideos enthalten?", "Ist CARE verpflichtend?".
8. **Kontakt:** ink-black; serif "Sprechen wir über Ihren Betrieb."; button "Direkt per WhatsApp"; form with
   "Ihr Name" "Ihr Betrieb" "Ihre E-Mail-Adresse" "Ihre Nachricht"; turquoise pill "Anfrage senden".
9. **Fußzeile:** graphite; large wordmark "NAHLIO"; columns "Leistungen" "Preise" "Ablauf" "FAQ"
   "Kontakt"; "Impressum" "Datenschutzerklärung".

## 3. Mit wenig Credits: zwei hohe Entwurfsbögen

Statt neun Bildern zwei Bilder im Format 9:16, je die halbe Seite als langer Desktop-Screenshot
(„Show it as one long flat desktop screenshot, sections stacked top to bottom edge to edge“): Abschnitte 1–4
(mit Navigation) und 5–9. Überschriften sind lesbar, Fließtext nicht; gut für die Richtung, nicht für Details.

## 4. Handy-Fassung prüfen

Ein fertiges 16:9-Bild in der Mitte auf 9:16 (oder 4:5) zuschneiden: Steht die Botschaft ganz drin, passt
die Komposition. Wenn nicht: im Prompt „centred column“ und „outer thirds without text“ verstärken.

## 5. Ergebnis vom 06.11.2026

Zwei Entwurfsbögen (GPT Image 2, 9:16, mittel, je 1 Credit): `docs/design/higgsfield-website-oben.webp`
(Navigation bis Leistungen) und `docs/design/higgsfield-website-unten.webp` (Preise bis Fußzeile),
nebeneinander in `docs/design/higgsfield-website-gesamt.png`. Hinweis: Das Modell hat im Suchergebnis ein
Google-Logo und den erfundenen Namen „Autohaus Müller“ gesetzt (trotz „no other logos“); für die echte
Seite gelten unsere eigenen Texte (Motorwerk Dorsten). Die Prompts stehen oben unter 3.

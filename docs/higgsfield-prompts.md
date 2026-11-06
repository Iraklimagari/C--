# Higgsfield: Bilder für Karten, die in 16:9 und auf dem Handy gut aussehen

Recherche und Praxis vom 06.11.2026 (NAHLIO, Abschnitt „So gestalten wir Ihren Online-Auftritt“).

## Modell

- **GPT Image 2** (`gpt_image_2`): liest deutsche Texte auf Bildschirmen sauber, bearbeitet Bilder mit
  Referenz. Im Free-Plan nutzbar (16:9, 1k: mittel 1 Credit, einfach 0,5 Credit; immer nur ein Auftrag
  gleichzeitig, keine Stapel). GPT Image 2.6 und Stapel brauchen den Basic-Plan.

## Aufbau eines Prompts (Reihenfolge zählt)

1. **Zweck:** „16:9 image for a website card that will also be centre-cropped to a 9:16 phone layout.“
2. **Komposition für beide Formate:** alles Wichtige im **mittleren Drittel der Breite**, ganz sichtbar, mit
   etwas Rand; linkes und rechtes Drittel nur ruhiger, unscharfer Hintergrund **ohne Text**. Dann zeigt ein
   4:5- oder 9:16-Ausschnitt aus der Mitte immer das Ganze.
3. **Inhalt des Bildschirms** mit den **genauen Texten in Anführungszeichen** (deutsch), in Lesereihenfolge.
4. **Hintergrund und Licht:** Ort, Tageslicht, Schärfentiefe.
5. **Stil und Marke:** „photorealistic, 35mm lens, natural light, premium and calm; colours limited to ink
   black, white, light grey and turquoise #01ABC3 accents.“
6. **Grenzen:** „Only the quoted words may appear as text; no real brand logos, no watermark, no captions.“

## Vorher-Nachher, deckungsgleich

Erst das **Nachher** erzeugen, dann das **Vorher als Bearbeitung** davon (Referenzbild = Nachher):
„Edit this exact photo. Keep everything identical: same hand, same phone, same position, size and angle,
same background, same light, same framing. Change only the content of the phone screen …“
Bei ganzen Fotos (ohne Handy): „lighting and quality change ONLY. Do not move, add, remove or reframe
anything … must stay pixel-aligned with the original.“ Ohne diesen Satz verschiebt das Modell die Szene.

## Verwendete Prompts (gekürzt)

- Google-Profil, Nachher: Profil „Motorwerk Dorsten“, „4,9“ „(187)“, „Kfz-Werkstatt · Geöffnet“, Knöpfe
  „Anrufen“ „Route“ „Website“ „WhatsApp“, zwei Bewertungen. Vorher: grauer Platzhalter, „3,6“ „(5)“,
  „Öffnungszeiten hinzufügen“, nur „Route“.
- Website, Nachher: „MOTORWERK DORSTEN“, „Ihr Fahrzeug in besten Händen.“, „Termin anfragen“, „Per WhatsApp
  anfragen“, „Inspektion“ „Reifenservice“ „Bremsen“. Vorher: alte Desktop-Seite, winzig, „Willkommen auf
  unserer Homepage“.
- Digitale Karte, Nachher: „Leistungen & Preise“, „Inspektion ab 149 €“ … „Termin anfragen“. Vorher:
  zerknitterte Papierliste, unscharf, Blendlicht.
- WhatsApp, Nachher: Chat mit Antwort-Knöpfen, „Termin bestätigt“ „Do., 13.11. · 8:00 Uhr“. Vorher:
  „Besetzt“, „3 verpasste Anrufe“.
- Fotos, Nachher: helle, aufgeräumte Werkstatt, Auto auf der Hebebühne. Vorher: dieselbe Szene dunkel,
  gelbstichig, körnig (nur Licht geändert).

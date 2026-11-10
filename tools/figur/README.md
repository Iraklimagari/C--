# Figur "Fragen" (Abschnitt nach "So finden Kunden zu Ihnen")

Vektorzeichnung nach dem Referenzbild des Inhabers (10.11.) und ihr Auftakt als Video.

- `build.py` – die Bezier-Pfade der Endhaltung (Torso mit Schultern und Oberarmen als eine Silhouette,
  zeigende Hand, Telefonhand) und die auslaufenden hellen Linien -> `geo.json`.
- `fig.py`, `frames3.py` – erzeugen die 120 Bilder des Auftakts (60 fps, 2 s). Jedes Bild ist eine ganze,
  neu zusammengesetzte Silhouette: die gezeichneten Unterarm-/Handkonturen werden entlang ihrer Knochen
  gebeugt (Ellbogen, Handgelenk, Verkuerzung, Finger), mit dem Koerper vereinigt und am Ellbogen als
  runde Gelenkmasse geschlossen; helle Linien nur, wo Unterarm/Hand vor Schwarzem liegen.
  Der Koerper ist links das Spiegelbild von rechts (gleiche Ellbogen unten). Das letzte Bild ist das Endbild in `index.html` (`.frage__art`).
- `figvid.py` – die Videos der Seite: Auftakt (`intro`, 120 Bilder) und ruhige Schleife (`loop`, 8 s, 30 fps:
  Atmen, Kopf, Licht) mit durchsichtigem Grund und hellem Schein um die Figur (auf Weiss unsichtbar; im erzwungenen
  Dunkelmodus von Samsung Internet bleibt die Figur sichtbar - Videos faerbt der Browser nicht um, Inline-SVG schon).
- `renderA.js` – rendert SVG-Bilder zu PNG mit durchsichtigem Grund.

    python3 build.py                    # geo.json
    python3 figvid.py intro             # svgA/f000.svg ... f119.svg
    python3 figvid.py loop              # svgL/f000.svg ... f239.svg
    node renderA.js svgA pngA
    node renderA.js svgL pngL
    # Chromium/Samsung: WebM mit Alphakanal
    ffmpeg -framerate 60 -i pngA/f%03d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 34 -row-mt 1 -an media/frage-intro.webm
    ffmpeg -framerate 30 -i pngL/f%03d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 42 -row-mt 1 -an media/frage-ruhe.webm
    # Safari/Firefox: MP4 auf Weiss
    ffmpeg -f lavfi -i color=c=white:s=1172x968:r=60 -framerate 60 -i pngA/f%03d.png -filter_complex "[0][1]overlay=shortest=1,format=yuv420p" -c:v libx264 -crf 21 -movflags +faststart -an media/frage-intro.mp4
    ffmpeg -f lavfi -i color=c=white:s=1172x968:r=30 -framerate 30 -i pngL/f%03d.png -filter_complex "[0][1]overlay=shortest=1,format=yuv420p" -c:v libx264 -crf 23 -movflags +faststart -an media/frage-ruhe.mp4

`frames3.py` allein (mit `render.js`) erzeugt die Bilder auf weissem Grund; sein letztes Bild ist die SVG-Zeichnung in
`index.html` (`.frage__art`), die ohne Skript oder bei einem Videofehler erscheint.

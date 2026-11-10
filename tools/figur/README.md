# Figur "Fragen" (Abschnitt nach "So finden Kunden zu Ihnen")

Vektorzeichnung nach dem Referenzbild des Inhabers (10.11.) und ihr Auftakt als Video.

- `build.py` – die Bezier-Pfade der Endhaltung (Torso mit Schultern und Oberarmen als eine Silhouette,
  zeigende Hand, Telefonhand) und die auslaufenden hellen Linien -> `geo.json`.
- `fig.py`, `frames3.py` – erzeugen die 90 Bilder des Auftakts (60 fps, 1,5 s). Jedes Bild ist eine ganze,
  neu zusammengesetzte Silhouette: die gezeichneten Unterarm-/Handkonturen werden entlang ihrer Knochen
  gebeugt (Ellbogen, Handgelenk, Verkuerzung, Finger), mit dem Koerper vereinigt und am Ellbogen als
  runde Gelenkmasse geschlossen; helle Linien nur, wo Unterarm/Hand vor Schwarzem liegen.
  Der Koerper ist links das Spiegelbild von rechts (gleiche Ellbogen unten). Das letzte Bild ist das Endbild in `index.html` (`.frage__art`).
- `figvid.py` – die Bilder der Videos: Auftakt (`intro`, 90 Bilder, 60 fps, 1,5 s) und ruhige Schleife (`loop`, 8 s,
  30 fps: Atmen, Kopf, Licht), mit durchsichtigem Grund.
- `pack.py` – packt jedes Bild in zwei Ebenen nebeneinander (links D, rechts M, 16 px Spalt). Die Seite malt sie in
  zwei Canvas, die sich mit dem Seitengrund mischen: |Grund x M - D|. Auf Weiss ergibt das genau die Zeichnung; im
  erzwungenen Dunkelmodus (Samsung Internet faerbt nur den Seitengrund, nicht Video/Canvas) eine graue Figur mit
  grauem Gesicht, hellen Linien und warmem Licht - ohne Kasten.
- `renderA.js` – rendert SVG-Bilder zu PNG mit durchsichtigem Grund.

    python3 build.py                    # geo.json
    python3 figvid.py intro && node renderA.js svgA pngA && python3 pack.py pngA packA
    python3 figvid.py loop  && node renderA.js svgL pngL && python3 pack.py pngL packL
    ffmpeg -framerate 60 -i packA/f%03d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -profile:v high -level 4.2 -movflags +faststart -an media/frage-intro.mp4
    ffmpeg -framerate 30 -i packL/f%03d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -profile:v high -level 4.2 -movflags +faststart -an media/frage-ruhe.mp4
    ffmpeg -framerate 60 -i packA/f%03d.png -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 0 -crf 32 -row-mt 1 -an media/frage-intro.webm
    ffmpeg -framerate 30 -i packL/f%03d.png -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 0 -crf 36 -row-mt 1 -an media/frage-ruhe.webm

`frames3.py` allein (mit `render.js`) erzeugt die Bilder auf weissem Grund; sein letztes Bild ist die SVG-Zeichnung in
`index.html` (`.frage__art`), die ohne Skript oder bei einem Videofehler erscheint.

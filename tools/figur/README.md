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
- `pack.py` – packt jedes Bild als zwei Kacheln nebeneinander in ein normales Video (links Farbe, rechts Deckkraft,
  16 px Spalt). Die Seite setzt sie in einem WebGL-Canvas zusammen: Figur in Markenfarbe mit echtem durchsichtigem
  Grund, in jedem Browser. Video und Canvas faerbt auch der erzwungene Dunkelmodus von Samsung Internet nicht um.
- `renderA.js` – rendert SVG-Bilder zu PNG mit durchsichtigem Grund.

    python3 build.py                    # geo.json
    python3 figvid.py intro && node renderA.js svgA pngA && python3 pack.py pngA packA
    python3 figvid.py loop  && node renderA.js svgL pngL && python3 pack.py pngL packL
    ffmpeg -framerate 60 -i packA/f%03d.png -vf scale=out_color_matrix=bt709,format=yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:v libx264 -crf 18 -profile:v high -level 4.2 -movflags +faststart -an media/frage-intro.mp4
    ffmpeg -framerate 30 -i packL/f%03d.png -vf scale=out_color_matrix=bt709,format=yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:v libx264 -crf 23 -profile:v high -level 4.2 -movflags +faststart -an media/frage-ruhe.mp4
    ffmpeg -framerate 60 -i packA/f%03d.png -vf scale=out_color_matrix=bt709,format=yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:v libvpx-vp9 -b:v 0 -crf 32 -row-mt 1 -an media/frage-intro.webm
    ffmpeg -framerate 30 -i packL/f%03d.png -vf scale=out_color_matrix=bt709,format=yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -an media/frage-ruhe.webm

`frames3.py` allein (mit `render.js`) erzeugt die Bilder auf weissem Grund; sein letztes Bild ist die SVG-Zeichnung in
`index.html` (`.frage__art`), die ohne Skript oder bei einem Videofehler erscheint.

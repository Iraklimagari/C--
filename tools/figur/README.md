# Figur "Fragen" (Abschnitt nach "So finden Kunden zu Ihnen")

Vektorzeichnung nach dem Referenzbild des Inhabers (10.11.) und ihr Auftakt als Video.

- `build.py` – die Bezier-Pfade der Endhaltung (Torso mit Schultern und Oberarmen als eine Silhouette,
  zeigende Hand, Telefonhand) und die auslaufenden hellen Linien -> `geo.json`.
- `fig.py`, `frames3.py` – erzeugen die 60 Bilder des Auftakts (30 fps, 2 s). Jedes Bild ist eine ganze,
  neu zusammengesetzte Silhouette: die gezeichneten Unterarm-/Handkonturen werden entlang ihrer Knochen
  gebeugt (Ellbogen, Handgelenk, Verkuerzung, Finger), mit dem Koerper vereinigt und am Ellbogen als
  runde Gelenkmasse geschlossen; helle Linien nur, wo Unterarm/Hand vor Schwarzem liegen.
  Das letzte Bild ist das Endbild in `index.html` (`.frage__art`).
- `render.js` – rendert die SVG-Bilder zu PNG (Playwright).

    python3 build.py                    # geo.json
    python3 frames3.py                  # svg/f000.svg ... f059.svg
    node render.js                      # png/f000.png ... f059.png
    ffmpeg -framerate 30 -i png/f%03d.png -c:v libx264 -pix_fmt yuv420p -crf 21 -movflags +faststart media/frage-intro.mp4
    ffmpeg -framerate 30 -i png/f%03d.png -c:v libvpx-vp9 -b:v 0 -crf 36 media/frage-intro.webm

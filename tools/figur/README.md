# Figur "Fragen" (Abschnitt nach "So finden Kunden zu Ihnen")

Vektorzeichnung nach dem Referenzbild des Inhabers (10.11.). `build.py` enthaelt die Bezier-Pfade
(Torso mit Schultern und Oberarmen als eine Silhouette, zeigende Hand, Telefonhand) und erzeugt die
auslaufenden hellen Pinselstriche als gefuellte Pfade. Koordinaten = Pixel des Referenzbildes (765 x 1024).

    python3 build.py   # schreibt geo.json mit allen Pfaden

Die Pfade stehen fertig in `index.html` (`.frage__art`); dieses Skript ist nur fuer spaetere Aenderungen.

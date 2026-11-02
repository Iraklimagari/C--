"""NAHLIO Website lokal starten.

Doppelklick auf "Website starten.bat" (Windows) oder:  python start-website.py
Startet einen kleinen Webserver in diesem Ordner und oeffnet die Startseite im Browser.
Beenden: Fenster schliessen oder Strg+C.
Hinweis: PHP (kontakt.php, Kontaktformular) laeuft hier nicht, nur auf dem echten Server.
"""
import functools
import http.server
import os
import socket
import socketserver
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".webp": "image/webp", ".woff2": "font/woff2", ".svg": "image/svg+xml"}


def free_port(start=8000):
    for port in range(start, start + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise SystemExit("Kein freier Port gefunden (8000-8049).")


def main():
    port = free_port()
    handler = functools.partial(Handler, directory=ROOT)
    url = f"http://localhost:{port}/index.html"
    with socketserver.ThreadingTCPServer(("127.0.0.1", port), handler) as httpd:
        print(f"NAHLIO laeuft auf {url}")
        print("Beenden: dieses Fenster schliessen oder Strg+C druecken.")
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nBeendet.")


if __name__ == "__main__":
    main()

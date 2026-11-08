# -*- coding: utf-8 -*-
"""Kleiner Vorschau-Server mit Threads.

python -m http.server ist einlaeufig und bricht Verbindungen ab, sobald der
Browser mehrere Dateien gleichzeitig anfordert. Das fuehrt zu halb geladenen
Stylesheets. Diese Variante bedient jede Anfrage in einem eigenen Thread.
"""
import functools, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8124


class Handler(SimpleHTTPRequestHandler):
    # HTTP/1.1 mit Keep-Alive. Unter HTTP/1.0 schliesst der Server nach jeder
    # Datei die Verbindung; groessere Dateien wie das Stylesheet brachen so
    # gelegentlich mit ERR_CONNECTION_RESET ab.
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        SimpleHTTPRequestHandler.end_headers(self)

    def log_message(self, *a):
        pass

    def handle_one_request(self):
        try:
            SimpleHTTPRequestHandler.handle_one_request(self)
        except (ConnectionResetError, BrokenPipeError):
            self.close_connection = True


if __name__ == "__main__":
    h = functools.partial(Handler, directory=os.path.join(HERE, "dist"))
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), h)
    print("Vorschau: http://127.0.0.1:%d/" % PORT)
    srv.serve_forever()

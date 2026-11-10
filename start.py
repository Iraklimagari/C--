# -*- coding: utf-8 -*-
"""NAHLIO — Vorschau starten (Fassung 2).

    python start.py            baut die Seite und startet die Vorschau auf Port 8124
    python start.py 8200       anderer Port
    python start.py --nur-bauen   nur bauen, nichts starten

Das Programm baut zuerst die Seite (build.py), startet dann den kleinen Vorschau-Server
(serve.py) und oeffnet die Seite im Browser. Zum Beenden das Fenster schliessen oder Strg+C.
Python 3, keine Zusatzpakete noetig.
"""
from __future__ import print_function

import functools
import os
import socket
import sys
import threading
import webbrowser
from http.server import ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def port_frei(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", port))
        return True
    except OSError:
        return False
    finally:
        s.close()


def main(argv):
    nur_bauen = "--nur-bauen" in argv
    zahlen = [a for a in argv if a.isdigit()]
    port = int(zahlen[0]) if zahlen else 8124

    print("=" * 46)
    print("  NAHLIO - Vorschau")
    print("=" * 46)
    print("\nBaue die Seite ...")
    import build
    build.main()
    if nur_bauen:
        return 0

    import serve
    while not port_frei(port) and port < 8140:
        print("Port %d ist belegt - versuche %d." % (port, port + 1))
        port += 1
    if not port_frei(port):
        print("Kein freier Port gefunden. Bitte ein anderes Fenster dieser Vorschau schliessen.")
        return 1

    url = "http://127.0.0.1:%d/" % port
    handler = functools.partial(serve.Handler, directory=os.path.join(HERE, "dist"))
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    print("\nDie Vorschau laeuft auf %s" % url)
    print("Dieses Fenster bitte offen lassen. Zum Beenden schliessen oder Strg+C.\n")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nBeendet.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

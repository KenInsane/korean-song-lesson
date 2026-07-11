#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Локальный статический сервер для мобильного веб-приложения (разработка/раздача).

    python serve.py            # http://127.0.0.1:8090
    python serve.py 9000 all   # слушать всю сеть (для теста с телефона по WiFi)
"""
import http.server
import os
import socket
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
HOST = "0.0.0.0" if (len(sys.argv) > 2 and sys.argv[2] == "all") else "127.0.0.1"


class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript", ".mjs": "text/javascript",
        ".wasm": "application/wasm", ".json": "application/json",
        ".webmanifest": "application/manifest+json", ".css": "text/css",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80)); ip = s.getsockname()[0]; s.close()
        return ip
    except Exception:
        return "127.0.0.1"


if __name__ == "__main__":
    httpd = http.server.ThreadingHTTPServer((HOST, PORT), H)
    print(f"Serving mobile/ at http://127.0.0.1:{PORT}")
    if HOST == "0.0.0.0":
        print(f"  с телефона в той же WiFi: http://{lan_ip()}:{PORT}")
    httpd.serve_forever()

#!/usr/bin/env python3
import http.server, ssl


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="build/html/", **kwargs)


ssl_settings = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_settings.load_cert_chain("cert/server.crt", "cert/server.key")

server_address = ("localhost", 8443)
httpd = http.server.HTTPServer(server_address, Handler)
httpd.socket = ssl_settings.wrap_socket(httpd.socket, server_side=True)
print("Serving on https://localhost:8443")
httpd.serve_forever()

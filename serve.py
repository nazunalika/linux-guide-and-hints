#!/usr/bin/env python3
import http.server, ssl


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="build/html/", **kwargs)


server_address = ("localhost", 8443)
httpd = http.server.HTTPServer(server_address, Handler)
httpd.socket = ssl.wrap_socket(
    httpd.socket,
    server_side=True,
    certfile="cert/server.crt",
    keyfile="cert/server.key",
    ssl_version=ssl.PROTOCOL_TLS,
)
print("Serving on https://localhost:8443")
httpd.serve_forever()

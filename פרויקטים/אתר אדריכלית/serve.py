import functools
import http.server

PORT = 8721
# Hardcoded on purpose: os.path.abspath()/os.getcwd() crash with PermissionError
# in this sandboxed launcher, so we never touch the current working directory.
DIRECTORY = "/Users/lilachbenahron/Library/Mobile Documents/com~apple~CloudDocs/קלוד/פרויקטים/אתר אדריכלית"

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)
httpd = http.server.ThreadingHTTPServer(("", PORT), handler)
print(f"Serving {DIRECTORY} on port {PORT}")
httpd.serve_forever()

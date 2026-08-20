import functools
import http.server

PORT = 8722
# Hardcoded on purpose: os.path.abspath()/os.getcwd() crash with PermissionError
# in this sandboxed launcher, so we never touch the current working directory.
DIRECTORY = "/Users/lilachbenahron/Library/Mobile Documents/com~apple~CloudDocs/קלוד/פרויקטים/אתר אדריכלית"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """Dev server: never let the browser cache. Editing styles.css/script.js and
    reloading kept serving stale copies, which repeatedly looked like broken
    changes until a manual hard refresh."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


handler = functools.partial(NoCacheHandler, directory=DIRECTORY)
httpd = http.server.ThreadingHTTPServer(("", PORT), handler)
print(f"Serving {DIRECTORY} on port {PORT}")
httpd.serve_forever()

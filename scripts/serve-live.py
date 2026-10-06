#!/usr/bin/env python3
"""Serve a built site while refreshing timeline data from the Excel workbook."""

from __future__ import annotations

import argparse
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from live_content import LiveContent


PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args: object, content: LiveContent, directory: Path, **kwargs: object) -> None:
        self.content = content
        super().__init__(*args, directory=str(directory), **kwargs)

    def translate_path(self, path: str) -> str:
        prefix = "/Historical_Timeline_Images/"
        if urlsplit(path).path.startswith(prefix):
            self.directory = str(self.content.photo_root / "Historical_Timeline_Images")
            return super().translate_path("/" + path[len(prefix):])
        return super().translate_path(path)

    def do_GET(self) -> None:
        if urlsplit(self.path).path == "/timeline.json":
            self.send_timeline(False)
        else:
            super().do_GET()

    def do_HEAD(self) -> None:
        if urlsplit(self.path).path == "/timeline.json":
            self.send_timeline(True)
        else:
            super().do_HEAD()

    def send_timeline(self, head_only: bool) -> None:
        try:
            payload = self.content.output.read_bytes()
        except OSError:
            self.send_error(503, "Timeline data is not available")
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if not head_only:
            self.wfile.write(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=PROJECT_ROOT / "HKSYU Timeline.xlsx")
    parser.add_argument("--photo-root", type=Path, default=PROJECT_ROOT)
    parser.add_argument("--dist", type=Path, default=PROJECT_ROOT / "dist")
    parser.add_argument("--output", type=Path, default=PROJECT_ROOT / ".live-content/timeline.json")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--poll-seconds", type=float, default=2.0)
    args = parser.parse_args()
    if not (args.dist / "index.html").is_file():
        parser.error(f"Built site missing: {args.dist / 'index.html'}; run npm run build once")
    if args.poll_seconds <= 0:
        parser.error("--poll-seconds must be positive")
    content = LiveContent(args.workbook, args.photo_root, args.output)
    try:
        content.refresh()
    except Exception as error:
        if not args.output.is_file():
            parser.error(f"Initial import failed: {error}")
        print(f"Initial import failed; serving last good data: {error}", flush=True)
    stop = threading.Event()
    watcher = threading.Thread(target=content.watch, args=(stop, args.poll_seconds), daemon=True)
    watcher.start()
    handler = partial(Handler, content=content, directory=args.dist)
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Live site: http://{args.host}:{args.port}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
        server.server_close()
        watcher.join(timeout=2)


if __name__ == "__main__":
    main()

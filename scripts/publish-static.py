#!/usr/bin/env python3
"""Watch school-owned Excel/photos and publish them into a static web root."""

from __future__ import annotations

import argparse
import threading
from pathlib import Path

from live_content import LiveContent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, required=True)
    parser.add_argument("--photo-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True,
                        help="The static site's public timeline.json")
    parser.add_argument("--poll-seconds", type=float, default=2.0)
    parser.add_argument("--once", action="store_true",
                        help="Publish once and exit; useful for deployment checks")
    args = parser.parse_args()
    if args.output.name != "timeline.json":
        parser.error("--output must end in timeline.json")
    if args.poll_seconds <= 0:
        parser.error("--poll-seconds must be positive")

    content = LiveContent(args.workbook, args.photo_root, args.output, optimize_photos=True)
    try:
        if content.refresh():
            print(f"Timeline updated: {args.output}", flush=True)
    except Exception as error:
        if args.once or not args.output.is_file():
            parser.error(f"Initial import failed: {error}")
        print(f"Initial import failed; keeping last good data: {error}", flush=True)
    if args.once:
        return

    print(f"Watching workbook and photos every {args.poll_seconds:g} seconds", flush=True)
    stop = threading.Event()
    try:
        content.watch(stop, args.poll_seconds)
    except KeyboardInterrupt:
        stop.set()


if __name__ == "__main__":
    main()

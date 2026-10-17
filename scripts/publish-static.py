#!/usr/bin/env python3
"""Watch school-owned Excel and publish data referencing school image URLs."""

from __future__ import annotations

import argparse
import threading
from pathlib import Path

from live_content import LiveContent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, required=True)
    parser.add_argument("--photo-root", type=Path)
    parser.add_argument("--local-photos", action="store_true", help="Use the legacy local photo mirror")
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

    content = LiveContent(args.workbook, args.photo_root or args.workbook.parent, args.output,
                          optimize_photos=args.local_photos, local_photos=args.local_photos)
    try:
        if content.refresh():
            print(f"Timeline updated: {args.output}", flush=True)
    except Exception as error:
        if args.once or not args.output.is_file():
            parser.error(f"Initial import failed: {error}")
        print(f"Initial import failed; keeping last good data: {error}", flush=True)
    if args.once:
        return

    print(f"Watching workbook every {args.poll_seconds:g} seconds", flush=True)
    stop = threading.Event()
    try:
        content.watch(stop, args.poll_seconds)
    except KeyboardInterrupt:
        stop.set()


if __name__ == "__main__":
    main()

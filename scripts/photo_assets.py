"""Create web-sized JPEGs from the private original photo mirror."""

from __future__ import annotations

import os
import json
from pathlib import Path
from urllib.parse import unquote


def sync_photos(data: dict[str, object], original_root: Path, target: Path) -> int:
    try:
        from PIL import Image, ImageOps
    except ImportError as error:
        raise RuntimeError("Photo publishing requires Pillow: python -m pip install Pillow") from error

    # The local source is trusted archival material, including two very large scans.
    Image.MAX_IMAGE_PIXELS = None
    originals = (original_root / "Historical_Timeline_Images").resolve()
    target = target.resolve()
    if target == originals or originals in target.parents:
        raise ValueError("Optimized photo directory must be separate from the originals")
    manifest_path = target.parent / ".photo-source-stamps.json"
    try:
        previous = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        previous = {}
    stamps: dict[str, list[int]] = {}
    referenced: set[Path] = set()
    updated = 0
    for event in data["schoolEvents"]:  # type: ignore[index]
        for photo in event["photos"]:
            relative = Path(unquote(photo["src"]))  # type: ignore[index]
            if relative.parts[0] != "Historical_Timeline_Images" or len(relative.parts) != 3:
                raise ValueError(f"Unexpected photo path: {relative}")
            relative = Path(*relative.parts[1:])
            source = (originals / relative).resolve()
            destination = (target / relative).resolve()
            if originals not in source.parents or target not in destination.parents:
                raise ValueError(f"Photo path escapes mirror: {relative}")
            referenced.add(relative)
            stat = source.stat()
            stamp = [stat.st_size, stat.st_mtime_ns]
            stamps[relative.as_posix()] = stamp
            if destination.is_file() and previous.get(relative.as_posix()) == stamp:
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            temporary = destination.with_name(destination.name + ".tmp")
            try:
                with Image.open(source) as image:
                    image.draft("RGB", (2200, 2200))
                    displayed = ImageOps.exif_transpose(image)
                    displayed.thumbnail((2200, 2200), Image.Resampling.LANCZOS)
                    displayed.convert("RGB").save(
                        temporary, format="JPEG", quality=85, optimize=True, progressive=True
                    )
                os.replace(temporary, destination)
                os.utime(destination, ns=(stat.st_atime_ns, stat.st_mtime_ns))
                updated += 1
                if updated % 25 == 0:
                    print(f"Prepared {updated} photos", flush=True)
            finally:
                temporary.unlink(missing_ok=True)
    for path in target.rglob("*"):
        if path.is_file() and path.relative_to(target) not in referenced:
            path.unlink()
    for directory in sorted(
        (path for path in target.rglob("*") if path.is_dir()),
        key=lambda path: len(path.parts),
        reverse=True,
    ):
        if not any(directory.iterdir()):
            directory.rmdir()
    manifest_path.write_text(json.dumps(stamps, sort_keys=True), encoding="utf-8")
    return updated

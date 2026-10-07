"""Publish an Excel timeline as a replaceable runtime data file."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import threading
from math import isfinite
from pathlib import Path
from typing import Callable


def load_importer() -> Callable[[Path, Path, str], dict[str, object]]:
    path = Path(__file__).with_name("import-timeline.py")
    spec = importlib.util.spec_from_file_location("timeline_importer", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load timeline importer: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.build


def validate(data: dict[str, object]) -> None:
    """Reject bad edits before replacing the last working publication."""
    if data.get("schemaVersion") != 1:
        raise ValueError("Unsupported timeline schema")
    ids: set[str] = set()
    photo_ids: set[str] = set()
    groups: dict[str, int] = {}
    for lane in ("upperRailEvents", "schoolEvents", "educationEvents"):
        events = data.get(lane)
        if not isinstance(events, list) or not events:
            raise ValueError(f"Missing events: {lane}")
        for event in events:
            if not isinstance(event, dict):
                raise ValueError(f"Invalid event in {lane}")
            event_id = event.get("id")
            if not isinstance(event_id, str) or not event_id or event_id in ids:
                raise ValueError(f"Duplicate or missing event ID: {event_id}")
            ids.add(event_id)
            year = event.get("year")
            if not isinstance(year, int) or year < 1949:
                raise ValueError(f"Invalid year: {event_id}")
            order = event.get("orderInYear")
            if not isinstance(order, int) or order < 0:
                raise ValueError(f"Invalid event order: {event_id}")
            if lane != "schoolEvents":
                continue
            if event.get("themeId") not in {"A", "B", "C", "D", "E"}:
                raise ValueError(f"Invalid theme: {event_id}")
            group_id = event.get("photoGroupId")
            if not isinstance(group_id, str) or not group_id:
                raise ValueError(f"Missing photo group ID: {event_id}")
            photos = event.get("photos")
            if not isinstance(photos, list):
                raise ValueError(f"Invalid photos: {event_id}")
            groups[group_id] = groups.get(group_id, 0) + max(1, len(photos))
            for photo in photos:
                if not isinstance(photo, dict):
                    raise ValueError(f"Invalid photo: {event_id}")
                photo_id = photo.get("id")
                if not isinstance(photo_id, str) or not photo_id or photo_id in photo_ids:
                    raise ValueError(f"Duplicate or missing photo ID: {photo_id}")
                photo_ids.add(photo_id)
                if photo.get("kind") not in {"blank", "placeholder", "image"}:
                    raise ValueError(f"Invalid photo kind: {photo_id}")
                if photo["kind"] == "image" and not photo.get("src"):
                    raise ValueError(f"Missing photo source: {photo_id}")
                if photo["kind"] == "blank" and photo.get("src"):
                    raise ValueError(f"Blank photo cannot reference an image: {photo_id}")
                if not all(
                    isinstance(photo.get(key), (int, float))
                    and not isinstance(photo[key], bool)
                    and isfinite(photo[key])
                    and photo[key] > 0
                    for key in ("width", "height")
                ):
                    raise ValueError(f"Invalid photo size: {photo_id}")
    if any(size > 2 for size in groups.values()):
        raise ValueError("Photo group exceeds two photos")


class LiveContent:
    def __init__(
        self,
        workbook: Path,
        photo_root: Path,
        output: Path,
        builder: Callable[[Path, Path, str], dict[str, object]] | None = None,
    ) -> None:
        self.workbook = workbook
        self.photo_root = photo_root
        self.output = output
        self.builder = builder or load_importer()
        self.signature: str | None = None
        self.last_error: str | None = None

    def source_signature(self) -> str:
        digest = hashlib.sha256(self.workbook.read_bytes())
        photo_dir = self.photo_root / "Historical_Timeline_Images"
        for path in sorted(photo_dir.rglob("*")):
            if path.is_file():
                info = path.stat()
                digest.update(str(path.relative_to(self.photo_root)).encode("utf-8"))
                digest.update(f"\0{info.st_size}\0{info.st_mtime_ns}".encode("ascii"))
        return digest.hexdigest()

    def refresh(self) -> bool:
        signature = self.source_signature()
        if signature == self.signature:
            return False
        data = self.builder(self.workbook, self.photo_root, f"xlsx-{signature[:16]}")
        validate(data)
        payload = (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        self.output.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.output.with_name(self.output.name + ".tmp")
        try:
            temporary.write_bytes(payload)
            os.replace(temporary, self.output)
        finally:
            temporary.unlink(missing_ok=True)
        self.signature = signature
        self.last_error = None
        return True

    def watch(self, stop: threading.Event, interval: float) -> None:
        while not stop.wait(interval):
            try:
                if self.refresh():
                    print(f"Timeline updated: {self.output} ({self.signature[:16]})", flush=True)
            except Exception as error:
                message = str(error)
                if message != self.last_error:
                    print(f"Timeline update failed; keeping last good data: {message}", flush=True)
                    self.last_error = message

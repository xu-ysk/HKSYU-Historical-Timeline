#!/usr/bin/env python3
"""Build public/timeline.json from the supplied Excel workbook and photo mirror.

The workbook currently contains malformed style metadata that makes some Excel
readers reject it.  This importer only needs cell values, so it reads the
standard worksheet XML directly and does not depend on workbook styling.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from pathlib import Path
from typing import Iterable
from urllib.parse import quote, unquote
from xml.etree import ElementTree as ET

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
Q = lambda name: f"{{{NS}}}{name}"

LANG_COLUMNS = {
    "en": "Eng",
    "zh-Hant": "TC",
    "zh-Hans": "SC",
}


def text_value(value: object) -> str:
    if value is None:
        return ""
    return str(value).replace("\r\n", "\n").strip()


def shared_strings(archive: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    values: list[str] = []
    for item in root.findall(Q("si")):
        values.append("".join(node.text or "" for node in item.iter(Q("t"))))
    return values


def cell_value(cell: ET.Element, strings: list[str]) -> str:
    value = cell.find(Q("v"))
    raw = "" if value is None else value.text or ""
    if cell.get("t") == "s" and raw:
        return strings[int(raw)]
    if cell.get("t") == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(Q("t")))
    return raw


def column_name(reference: str) -> str:
    return re.match(r"[A-Z]+", reference).group(0)  # type: ignore[union-attr]


def worksheet_rows(archive: zipfile.ZipFile, strings: list[str]) -> list[dict[str, str]]:
    """Return rows keyed by their header names, preserving worksheet order."""
    rows: list[dict[str, str]] = []
    for sheet_name in sorted(
        name for name in archive.namelist() if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", name)
    ):
        root = ET.fromstring(archive.read(sheet_name))
        sheet_rows = root.findall(f".{Q('sheetData')}/{Q('row')}")
        if not sheet_rows:
            continue
        headers: dict[str, str] = {}
        for cell in sheet_rows[0].findall(Q("c")):
            headers[column_name(cell.get("r", ""))] = text_value(cell_value(cell, strings))
        if "id" not in headers.values() or "year" not in headers.values():
            continue
        for row in sheet_rows[1:]:
            values = {
                headers[column_name(cell.get("r", ""))]: text_value(cell_value(cell, strings))
                for cell in row.findall(Q("c"))
                if column_name(cell.get("r", "")) in headers
            }
            if values.get("id"):
                values["__sheet"] = sheet_name
                rows.append(values)
    return rows


def localized(row: dict[str, str], field: str) -> dict[str, str]:
    return {
        language: text_value(row.get(f"{field}-{suffix}"))
        for language, suffix in LANG_COLUMNS.items()
        if text_value(row.get(f"{field}-{suffix}"))
    }


def year_number(label: str) -> int:
    match = re.search(r"\d{4}", label)
    if not match:
        raise ValueError(f"Cannot determine a four-digit start year from {label!r}")
    return int(match.group(0))


def url_path(source: str) -> str:
    decoded = unquote(source.strip()).replace("\\", "/")
    if not decoded.startswith("/"):
        decoded = "/" + decoded
    return quote(decoded, safe="/()")


def local_photo_path(photo_root: Path, source: str) -> Path:
    relative = unquote(url_path(source)).lstrip("/")
    path = (photo_root / relative).resolve()
    if photo_root.resolve() not in path.parents:
        raise ValueError(f"Photo path escapes photo root: {source!r}")
    return path


def jpeg_size(path: Path) -> tuple[int, int]:
    """Read a JPEG's pixel dimensions without requiring an image package."""
    sof_markers = {
        0xC0,
        0xC1,
        0xC2,
        0xC3,
        0xC5,
        0xC6,
        0xC7,
        0xC9,
        0xCA,
        0xCB,
        0xCD,
        0xCE,
        0xCF,
    }
    with path.open("rb") as stream:
        if stream.read(2) != b"\xff\xd8":
            raise ValueError(f"Photo is not a JPEG: {path}")
        while True:
            byte = stream.read(1)
            if not byte:
                break
            if byte != b"\xff":
                continue
            while byte == b"\xff":
                byte = stream.read(1)
            marker = byte[0]
            if marker in {0xD8, 0xD9} or 0xD0 <= marker <= 0xD7:
                continue
            length_bytes = stream.read(2)
            if len(length_bytes) != 2:
                break
            length = int.from_bytes(length_bytes, "big")
            if length < 2:
                raise ValueError(f"Invalid JPEG segment in {path}")
            segment = stream.read(length - 2)
            if marker in sof_markers and len(segment) >= 5:
                height = int.from_bytes(segment[1:3], "big")
                width = int.from_bytes(segment[3:5], "big")
                return width, height
    raise ValueError(f"JPEG dimensions not found: {path}")


def photo_entries(row: dict[str, str], photo_root: Path) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    photo_indices = sorted(
        int(match.group(1))
        for key in row
        if (match := re.fullmatch(r"photo-(\d+)", key))
    )
    for index in photo_indices:
        source = text_value(row.get(f"photo-{index}"))
        if not source:
            continue
        path = local_photo_path(photo_root, source)
        if not path.is_file():
            raise FileNotFoundError(f"Photo referenced by {row['id']} is missing: {path}")
        width, height = jpeg_size(path)
        entries.append(
            {
                "id": f"{row['id']}-photo-{index}",
                "kind": "blank",
                "width": width,
                "height": height,
                "alt": {"en": f"{row['id']} photograph {index}"},
            }
        )
    return entries


def event(row: dict[str, str], order: int, photo_root: Path, category: str) -> dict[str, object]:
    label = text_value(row.get("year"))
    result: dict[str, object] = {
        "id": row["id"],
        "year": year_number(label),
        "yearLabel": label,
        "orderInYear": order,
    }
    title = localized(row, "title")
    body = localized(row, "content")
    if category == "school":
        photos = photo_entries(row, photo_root)
        if title:
            for photo in photos:
                photo["alt"] = title
        result.update(
            {
                "themeId": text_value(row.get("category")),
                "photoGroupId": row["id"],
                "title": title,
                "body": body,
                "photos": photos,
            }
        )
    else:
        result.update({"title": title, "body": body})
    return result


def build(workbook: Path, photo_root: Path, revision: str) -> dict[str, object]:
    with zipfile.ZipFile(workbook) as archive:
        rows = worksheet_rows(archive, shared_strings(archive))
    groups = {"upper": [], "school": [], "education": []}
    for row in rows:
        if "photo-1" in row:
            groups["school"].append(row)
        elif "category" in row:
            groups["upper"].append(row)
        else:
            groups["education"].append(row)
    if not groups["school"] or not groups["upper"] or not groups["education"]:
        raise ValueError("Workbook must contain upper, school, and education sheets")
    return {
        "schemaVersion": 1,
        "revision": revision,
        "upperRailEvents": [event(row, i, photo_root, "upper") for i, row in enumerate(groups["upper"])],
        "schoolEvents": [event(row, i, photo_root, "school") for i, row in enumerate(groups["school"])],
        "educationEvents": [event(row, i, photo_root, "education") for i, row in enumerate(groups["education"])],
    }


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=Path("HKSYU Timeline.xlsx"))
    parser.add_argument("--photo-root", "--public-dir", type=Path, default=Path("."))
    parser.add_argument("--output", type=Path, default=Path("public/timeline.json"))
    parser.add_argument("--revision", default="xlsx-2026-10-05")
    args = parser.parse_args(argv)
    data = build(args.workbook, args.photo_root, args.revision)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts = ", ".join(f"{key}={len(value)}" for key, value in data.items() if isinstance(value, list))
    photos = sum(len(event.get("photos", [])) for event in data["schoolEvents"])  # type: ignore[index]
    print(f"Wrote {args.output}: {counts}, photos={photos}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(f"import-timeline: {error}", file=sys.stderr)
        raise SystemExit(1)

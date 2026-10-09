#!/usr/bin/env python3
"""Build public/timeline.json from the supplied Excel workbook and photo mirror.

Read the workbook XML directly so the marked editorial corrections can be
applied without introducing an Excel dependency into the live publisher.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path
from typing import Iterable
from urllib.parse import quote, unquote, urlsplit
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


def shared_strings(archive: zipfile.ZipFile) -> list[tuple[str, list[str]]]:
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    values: list[tuple[str, list[str]]] = []
    for item in root.findall(Q("si")):
        value = "".join(node.text or "" for node in item.iter(Q("t")))
        red_spans: list[str] = []
        red_text = ""
        for run in item.findall(Q("r")):
            text = "".join(node.text or "" for node in run.iter(Q("t")))
            color = run.find(f"{Q('rPr')}/{Q('color')}")
            if color is not None and (color.get("rgb") or "").upper().endswith("FF0000"):
                red_text += text
            elif red_text:
                red_spans.append(red_text)
                red_text = ""
        if red_text:
            red_spans.append(red_text)
        values.append((value, red_spans))
    return values


def cell_value(cell: ET.Element, strings: list[tuple[str, list[str]]]) -> str:
    value = cell.find(Q("v"))
    raw = "" if value is None else value.text or ""
    if cell.get("t") == "s" and raw:
        return strings[int(raw)][0]
    if cell.get("t") == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(Q("t")))
    return raw


def column_name(reference: str) -> str:
    return re.match(r"[A-Z]+", reference).group(0)  # type: ignore[union-attr]


def yellow_style_ids(archive: zipfile.ZipFile) -> set[int]:
    root = ET.fromstring(archive.read("xl/styles.xml"))
    fills = root.find(Q("fills"))
    styles = root.find(Q("cellXfs"))
    if fills is None or styles is None:
        return set()
    yellow_fills = {
        index
        for index, fill in enumerate(fills)
        if (color := fill.find(f"{Q('patternFill')}/{Q('fgColor')}")) is not None
        and (color.get("rgb") or "").upper() in {"FFFFFF00", "00FFFF00"}
    }
    return {
        index
        for index, style in enumerate(styles)
        if int(style.get("fillId", "0")) in yellow_fills
    }


# These two entire-cell annotations cannot be inferred from a short red run.
WHOLE_CELL_CORRECTIONS = {
    ("xl/worksheets/sheet1.xml", "C12"): (
        "A Test of Graduate Qualifications and Professional Recognition (Recognition of Graduates' Professional Qualification)",
        "A Test of Recognition of Graduates' Professional Qualification",
    ),
    ("xl/worksheets/sheet1.xml", "C28"): (
        "Retitled as Hong Kong Shue Yan University: Hong Kong's First Private University (Title Changed to Hong Kong Shue Yan University—Hong Kong's First Private University)",
        "Title Changed to Hong Kong Shue Yan University—Hong Kong's First Private University",
    ),
}


def corrected_cell_value(
    cell: ET.Element,
    strings: list[tuple[str, list[str]]],
    yellow_styles: set[int],
    sheet_name: str,
) -> str:
    value = cell_value(cell, strings)
    if int(cell.get("s", "0")) not in yellow_styles:
        return value
    key = (sheet_name, cell.get("r", ""))
    if key in WHOLE_CELL_CORRECTIONS:
        original, replacement = WHOLE_CELL_CORRECTIONS[key]
        if value != original:
            raise ValueError(f"Marked correction changed; review {key}: {value!r}")
        return replacement
    # An editor's note on the English semicolon is an instruction, not copy.
    value = value.replace("；(change this to the english semicolon)", ";")
    # In this one cell the old and replacement clauses occupy separate runs.
    value = value.replace("be retitled as (change its title to)", "change its title to")
    raw = cell.find(Q("v"))
    red_spans = strings[int(raw.text)][1] if cell.get("t") == "s" and raw is not None and raw.text else []
    for span in red_spans:
        if span not in value:
            continue
        match = re.search(r"^(\s*)(.+?)\s*[（(]([^()（）]+)[）)]", span)
        if match:
            corrected = match.group(1) + match.group(3) + span[match.end():]
            value = value.replace(span, corrected, 1)
    return value


def worksheet_rows(archive: zipfile.ZipFile, strings: list[tuple[str, list[str]]]) -> list[dict[str, str]]:
    """Return rows keyed by their header names, preserving worksheet order."""
    rows: list[dict[str, str]] = []
    yellow_styles = yellow_style_ids(archive)
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
                headers[column_name(cell.get("r", ""))]: text_value(
                    corrected_cell_value(cell, strings, yellow_styles, sheet_name)
                )
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
    parsed = urlsplit(source.strip())
    if parsed.scheme:
        if parsed.scheme not in {"http", "https"} or parsed.hostname != "umtimeline.hksyu.edu":
            raise ValueError(f"Unsupported photo URL: {source!r}")
        source = parsed.path
    decoded = unquote(source.strip()).replace("\\", "/")
    if not decoded.startswith("/"):
        decoded = "/" + decoded
    if not decoded.startswith("/Historical_Timeline_Images/"):
        raise ValueError(f"Photo is outside Historical_Timeline_Images: {source!r}")
    parts = decoded.split("/")
    # A few workbook cells still name the retired event subfolders.
    if len(parts) == 5 and re.fullmatch(rf"{re.escape(parts[2])}[（(]\d+[）)]", parts[3]):
        decoded = "/".join(["", parts[1], parts[2], parts[4]])
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
    if sum(bool(text_value(row.get(f"photo-{index}"))) for index in photo_indices) > 5:
        raise ValueError(f"Photo group exceeds five photos: {row['id']}")
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
                "kind": "image",
                "src": url_path(source).lstrip("/"),
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
    sheet_categories = {
        "xl/worksheets/sheet1.xml": "upper",
        "xl/worksheets/sheet2.xml": "school",
        "xl/worksheets/sheet3.xml": "education",
    }
    for row in rows:
        sheet_name = row["__sheet"]
        if sheet_name not in sheet_categories:
            raise ValueError(f"Unexpected timeline worksheet: {sheet_name}")
        groups[sheet_categories[sheet_name]].append(row)
    if not groups["school"] or not groups["upper"] or not groups["education"]:
        raise ValueError("Workbook must contain upper, school, and education sheets")
    return {
        "schemaVersion": 1,
        "revision": revision,
        "upperRailEvents": [event(row, i, photo_root, "upper") for i, row in enumerate(groups["upper"])],
        "schoolEvents": [event(row, i, photo_root, "school") for i, row in enumerate(groups["school"])],
        "educationEvents": [event(row, i, photo_root, "education") for i, row in enumerate(groups["education"])],
    }


def source_revision(workbook: Path, photo_root: Path) -> str:
    digest = hashlib.sha256(workbook.read_bytes())
    originals = photo_root / "Historical_Timeline_Images"
    for path in sorted(originals.rglob("*")):
        if path.is_file():
            stat = path.stat()
            digest.update(path.relative_to(photo_root).as_posix().encode("utf-8"))
            digest.update(f"\0{stat.st_size}\0{stat.st_mtime_ns}".encode("ascii"))
    return f"xlsx-{digest.hexdigest()[:16]}"


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=Path("HKSYU Timeline.xlsx"))
    parser.add_argument("--photo-root", "--public-dir", type=Path, default=Path("."))
    parser.add_argument("--output", type=Path, default=Path("public/timeline.json"))
    parser.add_argument("--revision")
    parser.add_argument("--prepare-photos", action="store_true")
    args = parser.parse_args(argv)
    data = build(args.workbook, args.photo_root, args.revision or source_revision(args.workbook, args.photo_root))
    if args.prepare_photos:
        from photo_assets import sync_photos

        updated = sync_photos(
            data, args.photo_root, args.output.parent / "Historical_Timeline_Images"
        )
        print(f"Prepared {updated} web-sized photos", flush=True)
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

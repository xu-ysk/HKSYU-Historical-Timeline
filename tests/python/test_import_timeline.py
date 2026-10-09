"""Verify marked corrections without requiring the private source workbook."""

import importlib.util
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from urllib.parse import unquote
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("timeline_importer", ROOT / "scripts/import-timeline.py")
assert spec is not None and spec.loader is not None
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class ImportTimelineTest(unittest.TestCase):
    def test_revision_changes_when_a_photo_changes_at_the_same_path(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            workbook = root / "timeline.xlsx"
            photo = root / "Historical_Timeline_Images/1971/image1.jpg"
            photo.parent.mkdir(parents=True)
            workbook.write_bytes(b"workbook")
            photo.write_bytes(b"first")
            first = importer.source_revision(workbook, root)
            photo.write_bytes(b"second photo")
            self.assertNotEqual(first, importer.source_revision(workbook, root))

    def test_red_editorial_replacements_apply_only_to_marked_cells(self):
        xml = f"""<sst xmlns="{importer.NS}"><si>
          <r><rPr><color rgb="FFFF0000"/></rPr><t>認受</t></r>
          <r><rPr><color rgb="FFFF0000"/></rPr><t>(認可)</t></r>
          <r><rPr><color rgb="FF262626"/></rPr><t>的考驗</t></r>
        </si><si><r><rPr><color rgb="FFFF0000"/></rPr>
          <t>sixth form (A-level)</t></r><r><t> (S6–7)</t></r></si></sst>"""
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, "w") as archive:
            archive.writestr("xl/sharedStrings.xml", xml)
        with zipfile.ZipFile(stream) as archive:
            strings = importer.shared_strings(archive)
        cell = ET.fromstring(f'<c xmlns="{importer.NS}" r="E12" s="4" t="s"><v>0</v></c>')
        self.assertEqual(importer.corrected_cell_value(cell, strings, {4}, "sheet1"), "認可的考驗")
        self.assertEqual(importer.corrected_cell_value(cell, strings, set(), "sheet1"), "認受(認可)的考驗")
        cell.find(importer.Q("v")).text = "1"
        self.assertEqual(importer.corrected_cell_value(cell, strings, {4}, "sheet1"), "A-level (S6–7)")

    def test_new_photo_urls_use_the_flattened_local_mirror(self):
        self.assertEqual(
            importer.url_path("https://umtimeline.hksyu.edu/Historical_Timeline_Images/1971/image1.jpg"),
            "/Historical_Timeline_Images/1971/image1.jpg",
        )
        self.assertEqual(
            importer.url_path("/Historical_Timeline_Images/1995/1995%ef%bc%883%ef%bc%89/image71.jpg"),
            "/Historical_Timeline_Images/1995/image71.jpg",
        )

    def test_published_copy_has_updated_text_and_up_to_five_photos(self):
        data = json.loads((ROOT / "public/timeline.json").read_text(encoding="utf-8"))
        upper = {event["id"]: event for event in data["upperRailEvents"]}
        school = {event["id"]: event for event in data["schoolEvents"]}
        education = {event["id"]: event for event in data["educationEvents"]}
        self.assertIn("Studied", upper["T01"]["title"]["en"])
        self.assertEqual(upper["T11"]["title"]["en"],
                         "Recognition of Graduates' Professional Qualification")
        self.assertIn("認可", upper["T11"]["body"]["zh-Hant"])
        self.assertIn("社区", school["P36"]["body"]["zh-Hans"])
        self.assertIn("; Chinese University", education["B03"]["title"]["en"])
        self.assertIn("Programmes", education["B15"]["title"]["en"])
        self.assertEqual(len(upper), 28)
        self.assertEqual(len(school), 118)
        self.assertEqual(len(education), 20)
        self.assertEqual(sum(len(event["photos"]) for event in school.values()), 178)
        self.assertTrue(all(len(event["photos"]) <= 5 for event in school.values()))
        self.assertEqual(len(school["P52"]["photos"]), 1)
        self.assertEqual(len(school["P118"]["photos"]), 5)
        self.assertIn("P82", school)
        for event in school.values():
            for photo in event["photos"]:
                self.assertEqual(len(unquote(photo["src"]).split("/")), 3, photo["src"])
                self.assertTrue((ROOT / "public" / unquote(photo["src"])).is_file(), photo["src"])


if __name__ == "__main__":
    unittest.main()

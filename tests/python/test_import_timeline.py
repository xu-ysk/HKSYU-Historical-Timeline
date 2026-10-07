"""Verify marked corrections without requiring the private source workbook."""

import importlib.util
import io
import json
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

    def test_published_copy_has_corrected_text_and_only_up_to_two_photos(self):
        data = json.loads((ROOT / "public/timeline.json").read_text(encoding="utf-8"))
        upper = {event["id"]: event for event in data["upperRailEvents"]}
        school = {event["id"]: event for event in data["schoolEvents"]}
        education = {event["id"]: event for event in data["educationEvents"]}
        self.assertIn("Studied", upper["T01"]["title"]["en"])
        self.assertEqual(upper["T11"]["title"]["en"],
                         "A Test of Recognition of Graduates' Professional Qualification")
        self.assertIn("認可", upper["T11"]["body"]["zh-Hant"])
        self.assertIn("社区", school["P36"]["body"]["zh-Hans"])
        self.assertIn("; Chinese University", education["B03"]["title"]["en"])
        self.assertIn("Programmes", education["B15"]["title"]["en"])
        self.assertEqual(sum(len(event["photos"]) for event in school.values()), 181)
        self.assertTrue(all(len(event["photos"]) <= 2 for event in school.values()))
        self.assertEqual(len(school["P52"]["photos"]), 2)
        self.assertEqual(len(school["P118"]["photos"]), 1)
        for event in school.values():
            for photo in event["photos"]:
                self.assertTrue((ROOT / "public" / unquote(photo["src"])).is_file(), photo["src"])


if __name__ == "__main__":
    unittest.main()

"""Verify marked corrections without requiring the private source workbook."""

import importlib.util
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("timeline_importer", ROOT / "scripts/import-timeline.py")
assert spec is not None and spec.loader is not None
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class ImportTimelineTest(unittest.TestCase):
    def test_school_url_keeps_query_and_exact_folder_structure(self):
        source = 'https://umtimeline.hksyu.edu/Historical_Timeline_Images/1995/1995%EF%BC%883%EF%BC%89/image71.jpg?token=abc%2Fdef'
        self.assertEqual(importer.school_photo_url(source), source)
        self.assertEqual(importer.school_photo_url('/Historical_Timeline_Images/1971/image1.jpg'),
                         'https://umtimeline.hksyu.edu/Historical_Timeline_Images/1971/image1.jpg')
        for invalid in ['https://example.com/Historical_Timeline_Images/a.jpg',
                        'file:///Historical_Timeline_Images/a.jpg',
                        'https://umtimeline.hksyu.edu/Historical_Timeline_Images/../secret.jpg',
                        'https://umtimeline.hksyu.edu/Historical_Timeline_Images/%2e%2e/secret.jpg']:
            with self.subTest(source=invalid), self.assertRaises(ValueError):
                importer.school_photo_url(invalid)

    def test_remote_photo_headers_are_cached_without_saving_files(self):
        from PIL import Image
        source = 'https://umtimeline.hksyu.edu/Historical_Timeline_Images/1971/header-test.jpg'
        data = io.BytesIO()
        Image.new('RGB', (640, 480)).save(data, format='JPEG')
        response = io.BytesIO(data.getvalue())
        response.geturl = lambda: source
        importer.remote_photo_size.cache_clear()
        self.addCleanup(importer.remote_photo_size.cache_clear)
        with patch.object(importer, 'urlopen', return_value=response) as request:
            self.assertEqual(importer.remote_photo_size(source), (640, 480))
            self.assertEqual(importer.remote_photo_size(source), (640, 480))
            request.assert_called_once()

    def test_unreachable_or_non_image_url_is_not_published(self):
        importer.remote_photo_size.cache_clear()
        self.addCleanup(importer.remote_photo_size.cache_clear)
        source = 'https://umtimeline.hksyu.edu/Historical_Timeline_Images/1971/bad.jpg'
        with patch.object(importer, 'urlopen', side_effect=OSError('HTTP 404')):
            with self.assertRaisesRegex(ValueError, 'HTTP 404'):
                importer.remote_photo_size(source)
        response = io.BytesIO(b'<html>not an image</html>')
        response.geturl = lambda: source
        with patch.object(importer, 'urlopen', return_value=response):
            with self.assertRaisesRegex(ValueError, 'dimensions'):
                importer.remote_photo_size(source)

    def test_remote_photo_entries_need_no_local_mirror(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(importer, 'remote_photo_size', return_value=(640, 480)):
                photos = importer.photo_entries({
                    'id': 'P01', 'photo-1': '/Historical_Timeline_Images/1971/new.jpg',
                    'photo-2': '', 'photo-5': '/Historical_Timeline_Images/1971/second.jpg',
                }, root)
            self.assertEqual([photo['id'] for photo in photos], ['P01-photo-1', 'P01-photo-5'])
            self.assertTrue(all(photo['src'].startswith('https://umtimeline.hksyu.edu/') for photo in photos))
            self.assertEqual(list(root.iterdir()), [])

    def test_default_revision_ignores_local_photo_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            workbook = root / 'timeline.xlsx'
            workbook.write_bytes(b'first')
            first = importer.source_revision(workbook, root)
            photos = root / 'Historical_Timeline_Images'
            photos.mkdir()
            (photos / 'unrelated.jpg').write_bytes(b'unused')
            self.assertEqual(first, importer.source_revision(workbook, root))
            workbook.write_bytes(b'second')
            self.assertNotEqual(first, importer.source_revision(workbook, root))

    def test_revision_changes_when_a_photo_changes_at_the_same_path(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            workbook = root / "timeline.xlsx"
            photo = root / "Historical_Timeline_Images/1971/image1.jpg"
            photo.parent.mkdir(parents=True)
            workbook.write_bytes(b"workbook")
            photo.write_bytes(b"first")
            first = importer.source_revision(workbook, root, local_photos=True)
            photo.write_bytes(b"second photo")
            self.assertNotEqual(first, importer.source_revision(workbook, root, local_photos=True))

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
        self.assertEqual(sum(len(event["photos"]) for event in school.values()), 179)
        self.assertTrue(all(len(event["photos"]) <= 5 for event in school.values()))
        self.assertEqual(len(school["P52"]["photos"]), 1)
        self.assertEqual(school["P113"]["photos"][0]["src"],
                         "https://umtimeline.hksyu.edu/Historical_Timeline_Images/2026/image170.jpg")
        self.assertEqual(len(school["P118"]["photos"]), 5)
        self.assertIn("P82", school)
        for event in school.values():
            for photo in event["photos"]:
                url = urlsplit(photo['src'])
                self.assertEqual(url.hostname, 'umtimeline.hksyu.edu')
                self.assertEqual(len(unquote(url.path).lstrip('/').split('/')), 3, photo['src'])
                self.assertGreater(min(photo['width'], photo['height']), 0)


if __name__ == "__main__":
    unittest.main()

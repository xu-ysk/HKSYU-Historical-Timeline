import json
import importlib.util
import sys
import tempfile
import threading
import time
import unittest
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen


sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from live_content import LiveContent  # noqa: E402


serve_path = Path(__file__).resolve().parents[2] / "scripts/serve-live.py"
serve_spec = importlib.util.spec_from_file_location("serve_live", serve_path)
assert serve_spec is not None and serve_spec.loader is not None
serve_module = importlib.util.module_from_spec(serve_spec)
serve_spec.loader.exec_module(serve_module)
Handler = serve_module.Handler


class LiveContentTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.workbook = self.root / "timeline.xlsx"
        self.workbook.write_bytes(b"first")
        self.photos = self.root / "Historical_Timeline_Images"
        self.photos.mkdir()
        self.output = self.root / ".live-content/timeline.json"
        self.bad_data = False

        def builder(_workbook, _photo_root, revision):
            upper = {"id": "T01", "year": 1949, "orderInYear": 0}
            school = {
                "id": "P01" if not self.bad_data else "T01",
                "year": 1971,
                "orderInYear": 0,
                "themeId": "A",
                "photoGroupId": "P01",
                "photos": [],
                "body": {"en": self.workbook.read_text()},
            }
            education = {"id": "E01", "year": 1950, "orderInYear": 0}
            return {
                "schemaVersion": 1,
                "revision": revision,
                "upperRailEvents": [upper],
                "schoolEvents": [school],
                "educationEvents": [education],
            }

        self.content = LiveContent(self.workbook, self.root, self.output, builder)

    def read(self):
        return json.loads(self.output.read_text(encoding="utf-8"))

    def test_publishes_changed_source_without_rebuilding_site(self):
        self.assertTrue(self.content.refresh())
        first = self.read()
        self.assertEqual(first["schoolEvents"][0]["body"]["en"], "first")
        self.assertFalse(self.content.refresh())
        self.workbook.write_bytes(b"second")
        self.assertTrue(self.content.refresh())
        second = self.read()
        self.assertEqual(second["schoolEvents"][0]["body"]["en"], "second")
        self.assertNotEqual(first["revision"], second["revision"])
        (self.photos / "image.jpg").write_bytes(b"new photo")
        self.assertTrue(self.content.refresh())
        self.assertNotEqual(second["revision"], self.read()["revision"])

    def test_invalid_edit_keeps_last_good_data_and_retries(self):
        self.content.refresh()
        first = self.output.read_bytes()
        self.bad_data = True
        self.workbook.write_bytes(b"invalid")
        with self.assertRaisesRegex(ValueError, "Duplicate or missing event ID"):
            self.content.refresh()
        self.assertEqual(self.output.read_bytes(), first)
        self.bad_data = False
        self.assertTrue(self.content.refresh())
        self.assertEqual(self.read()["schoolEvents"][0]["body"]["en"], "invalid")

    def test_watcher_updates_the_served_json_and_keeps_dist_intact(self):
        self.content.refresh()
        dist = self.root / "dist"
        dist.mkdir()
        (dist / "index.html").write_text("<h1>site</h1>", encoding="utf-8")
        stop = threading.Event()
        watcher = threading.Thread(target=self.content.watch, args=(stop, 0.02), daemon=True)
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, content=self.content, directory=dist))
        serving = threading.Thread(target=server.serve_forever, daemon=True)
        watcher.start()
        serving.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        self.addCleanup(stop.set)
        base = f"http://127.0.0.1:{server.server_port}"
        with urlopen(base + "/timeline.json") as response:
            self.assertEqual(response.headers["Cache-Control"], "no-store")
            self.assertEqual(json.load(response)["schoolEvents"][0]["body"]["en"], "first")
        self.workbook.write_bytes(b"second")
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline:
            with urlopen(base + "/timeline.json") as response:
                if json.load(response)["schoolEvents"][0]["body"]["en"] == "second":
                    break
            time.sleep(0.03)
        else:
            self.fail("The open site did not receive the updated data")
        self.assertEqual((dist / "index.html").read_text(encoding="utf-8"), "<h1>site</h1>")


if __name__ == "__main__":
    unittest.main()

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("media", Path(__file__).parents[1] / "cloudflare-media.py")
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)


class MediaMigrationTests(unittest.TestCase):
    def test_checksums_paths_and_changed_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            image = root / "clinic.png"
            image.write_bytes(b"\x89PNG\r\n\x1a\nfixture")
            item = {"key": "logos/1/" + "a" * 32 + ".png", "source_key": "clinic.png", "content_type": "image/png"}
            source = root / "media.json"
            source.write_text(json.dumps([item, item]))
            target = root / "prepared.json"
            self.assertEqual(media.prepare(source, root, target), 1)
            checked = json.loads(target.read_text())[0]
            self.assertEqual(checked["size"], 15)
            self.assertEqual(target.stat().st_mode & 0o777, 0o600)
            with self.assertRaises(ValueError):
                media.prepare(source, root, target)
            image.write_bytes(b"\x89PNG\r\n\x1a\nchanged")
            with self.assertRaisesRegex(ValueError, "changed"):
                media.checked_item(checked, root)
            with self.assertRaisesRegex(ValueError, "unsafe"):
                media.source_file(root, "../outside.png")
            with self.assertRaisesRegex(ValueError, "signature"):
                media.checked_item({**item, "content_type": "image/jpeg", "key": item["key"].replace(".png", ".jpg")}, root)

    def test_upload_checks_returned_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = b"GIF89afixture"
            (root / "image.gif").write_bytes(data)
            item = {"key": "logos/1/" + "a" * 32 + ".gif", "source_key": "image.gif", "content_type": "image/gif"}
            _, item = media.checked_item(item, root)
            manifest = root / "ready.json"
            manifest.write_text(json.dumps([item]))
            calls = []
            def run(arguments):
                calls.append(arguments)
                if arguments[2] == "get":
                    Path(arguments[arguments.index("--file") + 1]).write_bytes(data)
            with patch.object(media, "wrangler", run):
                self.assertEqual(media.transfer(manifest, root, "test-bucket", False, root / "state", True), 1)
            self.assertEqual([call[2] for call in calls], ["put", "get"])
            self.assertTrue(all("--local" in call and "--remote" not in call for call in calls))
            def corrupt(arguments):
                Path(arguments[arguments.index("--file") + 1]).write_bytes(b"corrupt")
            with patch.object(media, "wrangler", corrupt), self.assertRaisesRegex(ValueError, "checksum"):
                media.transfer(manifest, root, "test-bucket", False, root / "state", False)


if __name__ == "__main__":
    unittest.main()

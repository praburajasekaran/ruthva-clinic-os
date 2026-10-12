import importlib.util
import tempfile
import unittest
from pathlib import Path


spec = importlib.util.spec_from_file_location(
    "d1_backup", Path(__file__).parents[1] / "verify-d1-backup.py"
)
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)
restore_spec = importlib.util.spec_from_file_location(
    "d1_restore", Path(__file__).parents[1] / "prepare-d1-restore.py"
)
restore = importlib.util.module_from_spec(restore_spec)
restore_spec.loader.exec_module(restore)


class D1BackupTests(unittest.TestCase):
    def test_d1_restore_creates_parent_tables_before_child_data(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, prepared = root / "source.sql", root / "prepared.sql"
            source.write_text("PRAGMA defer_foreign_keys=TRUE; CREATE TABLE children(id INTEGER PRIMARY KEY AUTOINCREMENT,parent INTEGER REFERENCES parents(id),note TEXT); INSERT INTO children VALUES(1,7,'two; lines'); CREATE TABLE parents(id INTEGER PRIMARY KEY AUTOINCREMENT); INSERT INTO parents VALUES(7); DELETE FROM sqlite_sequence; INSERT INTO sqlite_sequence VALUES('children',9); INSERT INTO sqlite_sequence VALUES('parents',12);")
            self.assertEqual(restore.prepare(source, prepared), 2)
            with backup.sqlite3.connect(":memory:") as db:
                db.execute("PRAGMA foreign_keys=ON")
                db.executescript("BEGIN;" + prepared.read_text() + "COMMIT;")
                self.assertEqual(db.execute("SELECT * FROM children").fetchall(), [(1, 7, "two; lines")])
                self.assertEqual(db.execute("PRAGMA foreign_key_check").fetchall(), [])
                self.assertEqual(db.execute("SELECT name,seq FROM sqlite_sequence ORDER BY name").fetchall(), [("children", 9), ("parents", 12)])
            with self.assertRaises(FileExistsError):
                restore.prepare(source, prepared)

    def test_download_restore_preserves_records_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, downloaded, restored = [root / name for name in ("source.sql", "download.sql", "restore.sqlite3")]
            sql = "CREATE TABLE patients(id INTEGER PRIMARY KEY,name TEXT); INSERT INTO patients VALUES(1,'கீரை');"
            source.write_text(sql)
            downloaded.write_text(sql)
            report = backup.verify(source, downloaded, restored)
            self.assertEqual(report["tables"]["patients"]["count"], 1)
            self.assertEqual(report["integrity"], "ok")
            self.assertEqual(report["restore_roundtrip"], "passed")
            self.assertEqual(restored.stat().st_mode & 0o777, 0o600)
            original = restored.read_bytes()
            with self.assertRaises(FileExistsError):
                backup.verify(source, downloaded, restored)
            self.assertEqual(restored.read_bytes(), original)

    def test_changed_download_and_broken_relationships_fail(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, downloaded, restored = [root / name for name in ("source.sql", "download.sql", "restore.sqlite3")]
            source.write_text("CREATE TABLE clinics(id INTEGER PRIMARY KEY);")
            downloaded.write_text(source.read_text() + "INSERT INTO clinics VALUES(1);")
            with self.assertRaisesRegex(ValueError, "differs"):
                backup.verify(source, downloaded, restored)
            self.assertFalse(restored.exists())
            sql = "CREATE TABLE clinics(id INTEGER PRIMARY KEY); CREATE TABLE patients(clinic INTEGER REFERENCES clinics(id)); INSERT INTO patients VALUES(99);"
            source.write_text(sql)
            downloaded.write_text(sql)
            with self.assertRaisesRegex(ValueError, "foreign-key"):
                backup.verify(source, downloaded, restored)

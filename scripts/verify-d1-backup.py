"""Verify a downloaded D1 backup and restore it into a new private SQLite file."""

import argparse
import hashlib
import json
import os
import sqlite3
from pathlib import Path


def table_hashes(db):
    result = {}
    tables = db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()
    for (table,) in tables:
        quoted = '"' + table.replace('"', '""') + '"'
        rows = db.execute(f"SELECT * FROM {quoted}").fetchall()
        encoded = sorted(
            json.dumps(row, ensure_ascii=False, default=lambda value: value.hex())
            for row in rows
        )
        result[table] = {
            "count": len(rows),
            "sha256": hashlib.sha256("\n".join(encoded).encode()).hexdigest(),
        }
    return result


def verify(source, downloaded, restored):
    expected = hashlib.sha256(source.read_bytes()).hexdigest()
    if hashlib.sha256(downloaded.read_bytes()).hexdigest() != expected:
        raise ValueError("Downloaded backup differs from the source export.")
    restored.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(restored, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    with sqlite3.connect(restored) as db:
        db.executescript(downloaded.read_text())
        if db.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
            raise ValueError("Restored database failed integrity checks.")
        violations = db.execute("PRAGMA foreign_key_check").fetchall()
        if violations:
            raise ValueError(f"Restored database has {len(violations)} foreign-key violations.")
        tables = table_hashes(db)
        with sqlite3.connect(":memory:") as roundtrip:
            roundtrip.executescript("\n".join(db.iterdump()))
            if table_hashes(roundtrip) != tables:
                raise ValueError("Restore round trip changed table contents.")
    return {
        "export_sha256": expected,
        "integrity": "ok",
        "foreign_key_violations": 0,
        "restore_roundtrip": "passed",
        "tables": tables,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("downloaded", type=Path)
    parser.add_argument("restored", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.source, args.downloaded, args.restored), indent=2))
    except (OSError, ValueError, sqlite3.Error) as error:
        parser.exit(1, f"Backup verification failed. {error}\n")

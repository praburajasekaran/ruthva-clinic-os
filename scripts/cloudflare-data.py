"""Convert a Django fixture to D1 SQL and verify a D1 export offline."""
import argparse
import base64
import hashlib
import json
import math
import re
import sqlite3
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from urllib.parse import unquote, urlsplit
from uuid import NAMESPACE_URL, uuid5

ROOT = Path(__file__).resolve().parents[1]
SHAPE = json.loads((ROOT / "worker/src/model-shape.json").read_text())
LABELS = {table.replace("_", ".", 1): table for table in SHAPE}


def literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        if not math.isfinite(value):
            raise ValueError("A numeric field is not finite.")
        return str(value)
    if "\0" in value:
        return "CAST(X'" + value.encode().hex() + "' AS TEXT)"
    return "'" + value.replace("'", "''") + "'"


def normalize(field, value):
    if value is None:
        if not field["nullable"]:
            raise ValueError(f"Required column {field['column']} is null.")
        return None
    kind = field["type"]
    if kind == "JSONField":
        return json.dumps(json.loads(value) if isinstance(value, str) else value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    if kind == "BooleanField":
        return int(bool(value))
    if "Integer" in kind or "AutoField" in kind or field["target"]:
        result = int(value)
        if abs(result) > 9007199254740991:
            raise ValueError(f"Column {field['column']} exceeds JavaScript's safe integer range.")
        return result
    if kind == "DecimalField":
        number = Decimal(str(value))
        if not number.is_finite():
            raise ValueError(f"Column {field['column']} is not finite.")
        return format(number.normalize(), "f")
    if kind == "UUIDField":
        return str(value).replace("-", "")
    if kind == "DateTimeField":
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError("Export timestamps with a timezone.")
        return parsed.astimezone(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")
    return str(value)


def empty_database():
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys=ON")
    for path in sorted((ROOT / "worker/migrations").glob("*.sql")):
        db.executescript(path.read_text())
    return db


def digest(table, rows):
    fields = SHAPE[table]["fields"]
    result = [
        [normalize(field, row[field["column"]]) for field in fields.values()]
        for row in sorted(rows, key=lambda row: row["id"])
    ]
    return hashlib.sha256(json.dumps(result, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def convert(source, output, origin):
    parsed = urlsplit(origin)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        raise ValueError("Provide the frontend HTTPS origin without a path.")
    if output.exists() and any(output.iterdir()):
        raise ValueError("Use a new empty output directory.")
    fixture = json.loads(source.read_text())
    grouped = {table: [] for table in SHAPE}
    media = []
    for item in fixture:
        table = LABELS.get(item["model"])
        if table is None:
            raise ValueError(f"Unexpected model {item['model']}. Export only application models.")
        fields = SHAPE[table]["fields"]
        row = {}
        for name, field in fields.items():
            if name == "id":
                value = item["pk"]
            elif name in item["fields"]:
                value = item["fields"][name]
            elif field["default"] is not None:
                value = field["default"]
            elif field["nullable"]:
                value = None
            elif field["blank"] and field["type"] in ("CharField", "TextField", "EmailField", "URLField"):
                value = ""
            else:
                raise ValueError(f"Missing {table}.{name}. Use a full dumpdata export.")
            row[field["column"]] = normalize(field, value)
        if table == "users_user" and not row["password"].startswith("!"):
            match = re.fullmatch(r"pbkdf2_sha256\$(\d+)\$[^$]+\$([A-Za-z0-9+/]{43}=)", row["password"])
            if not match or not 0 < int(match[1]) <= 2000000 or len(base64.b64decode(match[2])) != 32:
                raise ValueError("A user has an unsupported password hash. Use valid PBKDF2-SHA256 with 1 to 2000000 iterations or an unusable password before export.")
        for column, kind in (("logo_url", "logos"), ("screenshot_url", "feedback")):
            if not row.get(column):
                continue
            source_url = row[column]
            source_key = unquote(urlsplit(source_url).path).lstrip("/")
            if source_key.startswith("media/"):
                source_key = source_key[6:]
            extension = Path(source_key).suffix.lower().lstrip(".")
            extension = "jpg" if extension == "jpeg" else extension
            if extension not in ("png", "jpg", "gif", "webp") or ".." in Path(source_key).parts:
                raise ValueError("A media reference needs a supported image file path.")
            clinic_id = row["id"] if table == "clinics_clinic" else row["clinic_id"]
            key = f"{kind}/{clinic_id}/{uuid5(NAMESPACE_URL, source_url).hex}.{extension}"
            row[column] = origin.rstrip("/") + "/api/v1/media/" + key
            media.append({"source_url": source_url, "source_key": source_key, "key": key, "target_url": row[column], "content_type": "image/" + ("jpeg" if extension == "jpg" else extension)})
        grouped[table].append(row)
    sql = ["PRAGMA defer_foreign_keys=ON;"]
    limits = []
    ordered = []
    def visit(table):
        if table in ordered:
            return
        for field in SHAPE[table]["fields"].values():
            if field["target"] and field["target"] != table:
                visit(field["target"])
        ordered.append(table)
    for table in grouped:
        visit(table)
    for table in ordered:
        rows = grouped[table]
        for row in sorted(rows, key=lambda value: value["id"]):
            values = dict(row)
            if table == "clinics_clinic":
                limits.append(f"UPDATE clinics_clinic SET active_patient_limit={row['active_patient_limit']} WHERE id={row['id']};")
                values["active_patient_limit"] = 0
            columns = ",".join(f'"{column}"' for column in values)
            statement = f'INSERT INTO "{table}" ({columns}) VALUES ({",".join(literal(value) for value in values.values())});'
            if len(statement.encode()) > 100000:
                raise ValueError(f"A {table} row exceeds D1's SQL statement limit.")
            sql.append(statement)
    sql.extend(limits)
    data_sql = "\n".join(sql) + "\n"
    db = empty_database()
    try:
        db.executescript("BEGIN;\n" + data_sql + "COMMIT;")
        violations = db.execute("PRAGMA foreign_key_check").fetchall()
        if violations:
            raise ValueError("Source data has missing related records.")
        for table, rows in grouped.items():
            db.row_factory = sqlite3.Row
            restored = [dict(row) for row in db.execute(f'SELECT * FROM "{table}"')]
            if digest(table, restored) != digest(table, rows):
                raise ValueError(f"Conversion changed values in {table}.")
    finally:
        db.close()
    output.mkdir(parents=True, exist_ok=True)
    manifest = {"source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "sql_sha256": hashlib.sha256(data_sql.encode()).hexdigest(), "tables": {table: {"count": len(rows), "sha256": digest(table, rows)} for table, rows in grouped.items()}, "media_count": len(media)}
    for name, content in (("data.sql", data_sql), ("manifest.json", json.dumps(manifest, indent=2) + "\n"), ("media.json", json.dumps(media, indent=2) + "\n")):
        path = output / name
        path.write_text(content)
        path.chmod(0o600)
    return manifest


def verify(export, manifest_path):
    if export.suffix == ".sql":
        db = sqlite3.connect(":memory:")
        db.executescript(export.read_text())
    else:
        db = sqlite3.connect(export.resolve().as_uri() + "?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    try:
        if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok" or db.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError("The exported database failed integrity checks.")
        manifest = json.loads(manifest_path.read_text())
        for table, expected in manifest["tables"].items():
            rows = [dict(row) for row in db.execute(f'SELECT * FROM "{table}"')]
            if len(rows) != expected["count"] or digest(table, rows) != expected["sha256"]:
                raise ValueError(f"Count or content mismatch for {table}.")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("labels")
    converter = sub.add_parser("convert")
    converter.add_argument("fixture", type=Path)
    converter.add_argument("--output", type=Path, required=True)
    converter.add_argument("--origin", required=True)
    verifier = sub.add_parser("verify")
    verifier.add_argument("export", type=Path)
    verifier.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.command == "labels":
            print(" ".join(LABELS))
        elif args.command == "convert":
            manifest = convert(args.fixture, args.output, args.origin)
            print(f"Validated {sum(table['count'] for table in manifest['tables'].values())} records and {manifest['media_count']} media references. Saved {args.output}.")
        else:
            verify(args.export, args.manifest)
            print("All 26 table counts and content hashes match. Foreign keys are valid.")
    except (ValueError, sqlite3.Error, OSError) as error:
        parser.exit(1, f"Migration check failed. {error}\n")


if __name__ == "__main__":
    main()

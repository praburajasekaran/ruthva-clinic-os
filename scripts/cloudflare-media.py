"""Prepare, upload, and verify migration images from a local media backup."""
import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KEY = re.compile(r"(?:logos|feedback)/[0-9]+/[a-f0-9]{32}\.(png|jpg|gif|webp)")
TYPES = {"png": "image/png", "jpg": "image/jpeg", "gif": "image/gif", "webp": "image/webp"}


def image_type(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    raise ValueError("A media file is not a supported image.")


def source_file(media_root, source_key):
    if not isinstance(source_key, str) or "\\" in source_key:
        raise ValueError("Invalid source path.")
    path = (media_root / source_key).resolve()
    if not path.is_relative_to(media_root.resolve()) or not path.is_file():
        raise ValueError(f"Missing image or unsafe source path: {source_key}")
    return path


def checked_item(item, media_root):
    match = KEY.fullmatch(item["key"])
    if not match or item["content_type"] != TYPES[match[1]]:
        raise ValueError("Invalid R2 key or content type.")
    path = source_file(media_root, item["source_key"])
    data = path.read_bytes()
    if image_type(data) != item["content_type"]:
        raise ValueError(f"Image signature mismatch: {item['source_key']}")
    result = {**item, "size": len(data), "sha256": hashlib.sha256(data).hexdigest()}
    if "sha256" in item and (item["sha256"] != result["sha256"] or item["size"] != len(data)):
        raise ValueError(f"Image changed after preparation: {item['source_key']}")
    return path, result


def prepare(manifest, media_root, output):
    if output.exists():
        raise ValueError("Use a new manifest output path.")
    records = []
    seen = {}
    for item in json.loads(manifest.read_text()):
        _, record = checked_item(item, media_root)
        if record["key"] in seen:
            if seen[record["key"]] != record["sha256"]:
                raise ValueError("Two source images map to the same R2 key.")
            continue
        seen[record["key"]] = record["sha256"]
        records.append(record)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.touch(mode=0o600, exist_ok=False)
    output.write_text(json.dumps(records, indent=2) + "\n")
    return len(records)


def wrangler(arguments):
    result = subprocess.run(
        ["rtk", "npm", "exec", "--", "wrangler", *arguments],
        cwd=ROOT / "worker", capture_output=True, text=True,
    )
    if result.returncode:
        raise ValueError("Wrangler failed. Inspect Cloudflare access and the bucket configuration.")


def transfer(manifest, media_root, bucket, remote, persist_to, upload):
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,61}[a-z0-9]", bucket):
        raise ValueError("Invalid bucket name.")
    records = json.loads(manifest.read_text())
    checked = []
    for item in records:
        if "sha256" not in item or "size" not in item:
            raise ValueError("Run prepare before uploading or verifying.")
        checked.append(checked_item(item, media_root))
    mode = ["--remote"] if remote else ["--local", "--persist-to", str(persist_to.resolve())]
    with tempfile.TemporaryDirectory(prefix="ruthva-media-") as temporary:
        destination = Path(temporary) / "object"
        for path, item in checked:
            object_path = f"{bucket}/{item['key']}"
            if upload:
                wrangler(["r2", "object", "put", object_path, "--file", str(path), "--content-type", item["content_type"], *mode])
            destination.unlink(missing_ok=True)
            wrangler(["r2", "object", "get", object_path, "--file", str(destination), *mode])
            data = destination.read_bytes()
            if len(data) != item["size"] or hashlib.sha256(data).hexdigest() != item["sha256"]:
                raise ValueError(f"R2 checksum mismatch for {item['key']}")
    return len(checked)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    preparer = commands.add_parser("prepare")
    preparer.add_argument("manifest", type=Path)
    preparer.add_argument("--media-root", type=Path, required=True)
    preparer.add_argument("--output", type=Path, required=True)
    for name in ("upload", "verify"):
        command = commands.add_parser(name)
        command.add_argument("manifest", type=Path)
        command.add_argument("--media-root", type=Path, required=True)
        command.add_argument("--bucket", required=True)
        modes = command.add_mutually_exclusive_group(required=True)
        modes.add_argument("--remote", action="store_true")
        modes.add_argument("--local", action="store_true")
        command.add_argument("--persist-to", type=Path, default=ROOT / "worker/.wrangler/state")
    args = parser.parse_args()
    try:
        if args.command == "prepare":
            count = prepare(args.manifest, args.media_root, args.output)
            print(f"Validated {count} images. Saved checksums to {args.output}.")
        else:
            count = transfer(args.manifest, args.media_root, args.bucket, args.remote, args.persist_to, args.command == "upload")
            print(f"Verified {count} R2 objects by size and SHA-256.")
    except (ValueError, OSError, KeyError) as error:
        parser.exit(1, f"Media migration failed. {error}\n")


if __name__ == "__main__":
    main()

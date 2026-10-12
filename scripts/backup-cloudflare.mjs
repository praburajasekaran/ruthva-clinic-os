import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const directory = resolve(root, ".audit", "backups", stamp);
const bucket = "ruthva-clinic-backups";
const prefix = `snapshots/${stamp}`;
process.umask(0o077);
mkdirSync(directory, { recursive: true, mode: 0o700 });

function wrangler(args) {
  return execFileSync("rtk", ["proxy", "node", resolve(root, "worker/node_modules/wrangler/bin/wrangler.js"), ...args,
    "--config", resolve(root, "worker/wrangler.jsonc")], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function python(args) {
  return execFileSync("rtk", ["proxy", "python3", ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function copyAndCheck(source, key, destination) {
  wrangler(["r2", "object", "put", `${bucket}/${key}`, "--remote", "--file", source]);
  wrangler(["r2", "object", "get", `${bucket}/${key}`, "--remote", "--file", destination]);
  const bytes = readFileSync(source);
  if (!bytes.equals(readFileSync(destination))) throw new Error(`Backup readback differs for ${key}.`);
  return { key, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}

try {
  const source = resolve(directory, "d1.sql");
  console.log("Exporting the remote D1 database.");
  wrangler(["d1", "export", "DB", "--remote", "--output", source]);
  const database = copyAndCheck(source, `${prefix}/d1.sql`, resolve(directory, "d1-downloaded.sql"));
  const restored = resolve(directory, "restored.sqlite3");
  const verification = JSON.parse(python([resolve(root, "scripts/verify-d1-backup.py"), source,
    resolve(directory, "d1-downloaded.sql"), restored]));
  const importFile = resolve(directory, "d1-import.sql");
  python([resolve(root, "scripts/prepare-d1-restore.py"), source, importFile]);
  const d1Import = copyAndCheck(importFile, `${prefix}/d1-import.sql`, resolve(directory, "d1-import-downloaded.sql"));
  const references = JSON.parse(python(["-c", `import sqlite3,json,sys
from urllib.parse import urlsplit
d=sqlite3.connect("file:"+sys.argv[1]+"?mode=ro",uri=True)
urls=[r[0] for table,col in [("clinics_clinic","logo_url"),("feedback_feedback","screenshot_url")] for r in d.execute("SELECT "+col+" FROM "+table+" WHERE "+col+"<>''")]
keys=[]
for url in urls:
    path=urlsplit(url).path
    if not path.startswith("/api/v1/media/"): raise ValueError("Unrecognized media reference. Backup is incomplete.")
    keys.append(path.removeprefix("/api/v1/media/"))
print(json.dumps(sorted(set(keys))))`, restored]));
  const media = [];
  for (const [index, originalKey] of references.entries()) {
    console.log(`Backing up referenced image ${index + 1} of ${references.length}.`);
    const file = resolve(directory, `media-${index}`);
    wrangler(["r2", "object", "get", `ruthva-clinic-uploads/${originalKey}`, "--remote", "--file", file]);
    media.push({ originalKey, ...copyAndCheck(file, `${prefix}/media/${originalKey}`, resolve(directory, `media-${index}-downloaded`)) });
  }
  const bookmark = JSON.parse(wrangler(["d1", "time-travel", "info", "ruthva-clinic", "--json"]));
  const report = { createdAt: new Date().toISOString(), bucket, prefix, database, d1Import, verification, media,
    latestTimeTravelBookmark: bookmark.bookmark, mediaScope: "All database-referenced logos and feedback images. Unreferenced objects are excluded." };
  const manifest = resolve(directory, "manifest.json");
  writeFileSync(manifest, JSON.stringify(report, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  copyAndCheck(manifest, `${prefix}/manifest.json`, resolve(directory, "manifest-downloaded.json"));
  console.log(`Verified database restore and ${media.length} images. Private backup saved to ${bucket}/${prefix}.`);
  console.log(`Local manifest saved to ${manifest}.`);
} catch (error) {
  console.error(`Backup failed. ${error.message}`);
  console.error(`Partial files retained at ${directory}.`);
  process.exitCode = 1;
}

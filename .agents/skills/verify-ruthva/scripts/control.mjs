#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, openSync,
  readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs";

const self = fileURLToPath(import.meta.url);
const root = resolve(dirname(self), "../../../..");
const [command, run, ...args] = process.argv.slice(2);
if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(run || "")) {
  throw new Error("Usage: control.mjs launch|doctor|browser|capture|inbox|data|cleanup RUN_ID [arguments]");
}
const evidence = join(root, ".audit/verify-ruthva", run);
const manifestPath = join(evidence, "instance.json");
const readManifest = () => JSON.parse(readFileSync(manifestPath, "utf8"));
const saveManifest = (value) => writeFileSync(manifestPath, JSON.stringify(value, null, 2) + "\n");
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const sourceFiles = ["frontend/src", "frontend/public", "frontend/package.json", "frontend/package-lock.json",
  "frontend/next.config.mjs", "frontend/tsconfig.json", "frontend/tailwind.config.ts",
  "frontend/postcss.config.mjs", "worker/src", "worker/migrations", "worker/package.json",
  "worker/package-lock.json", "worker/wrangler.jsonc", "backend/fonts"];

function fingerprint() {
  const hash = createHash("sha256");
  function visit(path) {
    const absolute = join(root, path);
    if (existsSync(absolute) && readdirSafe(absolute)) {
      for (const child of readdirSync(absolute).sort()) visit(join(path, child));
    } else if (existsSync(absolute)) {
      hash.update(path).update(readFileSync(absolute));
    }
  }
  sourceFiles.forEach(visit);
  return hash.digest("hex");
}
function readdirSafe(path) {
  try { readdirSync(path); return true; } catch { return false; }
}
function exec(binary, argv, options = {}) {
  const result = spawnSync(binary, argv, { cwd: root, encoding: "utf8", ...options });
  if (result.error || result.status !== 0) {
    throw new Error(`${binary} failed (${result.status}): ${result.error?.message || result.stderr || result.stdout}`);
  }
  return result.stdout;
}
async function freePort() {
  const server = createServer();
  await new Promise((done, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", done); });
  const port = server.address().port;
  await new Promise((done) => server.close(done));
  return port;
}
function owned(manifest) {
  if (!manifest.pid || manifest.root !== root) return false;
  const result = spawnSync("ps", ["-p", String(manifest.pid), "-o", "command="], { encoding: "utf8" });
  return result.status === 0 && result.stdout.trim() === `${process.execPath} ${self} serve ${run}`;
}
async function doctor() {
  const manifest = readManifest();
  if (!owned(manifest) || manifest.cleanedAt) throw new Error("The run's own server process is absent.");
  if (manifest.sourceHash !== fingerprint()) throw new Error("Sources changed since launch. Clean up and launch a new run.");
  const portOwners = {};
  for (const origin of [manifest.api, manifest.web]) {
    const port = new URL(origin).port;
    const pids = exec("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]).trim().split(/\s+/);
    for (const pid of pids) {
      const group = Number(exec("ps", ["-p", pid, "-o", "pgid="]).trim());
      if (group !== manifest.pid) throw new Error(`Port ${port} belongs to another process group; do not drive it.`);
    }
    portOwners[port] = pids.map(Number);
  }
  for (const [url, expected] of [[manifest.api + "/api/health/", "ayush-clinic-platform"], [manifest.web + "/login", "Welcome back"]]) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok || !(await response.text()).includes(expected)) throw new Error(`Doctor failed: ${url}`);
  }
  const db = await fetch(manifest.api + "/api/v1/patients/", { signal: AbortSignal.timeout(5000) });
  if (db.status !== 401) throw new Error("The unauthenticated patient endpoint must return 401.");
  return { status: "ok", ...manifest, portOwners };
}
async function cleanup() {
  const manifest = readManifest();
  if (!manifest.cleanedAt) {
    let browserError;
    try { await browser(manifest, ["close"]); }
    catch (error) { browserError = error; appendFileSync(join(evidence, "cleanup.log"), error.message + "\n"); }
    if (owned(manifest)) {
      process.kill(-manifest.pid, "SIGTERM");
      const groupAlive = () => { try { process.kill(-manifest.pid, 0); return true; } catch { return false; } };
      for (let i = 0; i < 50 && groupAlive(); i++) await pause(100);
      if (groupAlive()) process.kill(-manifest.pid, "SIGKILL");
    }
    for (const origin of [manifest.web, manifest.api]) {
      try {
        await fetch(origin, { signal: AbortSignal.timeout(1000) });
      } catch { continue; }
      throw new Error(`The run's port still answers at ${origin}; scratch state was retained.`);
    }
    if (browserError) {
      manifest.serverStoppedAt = new Date().toISOString();
      saveManifest(manifest);
      throw new Error(`Servers stopped, but browser cleanup failed. Retry cleanup: ${browserError.message}`);
    }
    if (!manifest.scratch.startsWith(join(tmpdir(), "ruthva-verify-"))) throw new Error("Unexpected scratch directory; refusing removal.");
    rmSync(manifest.scratch, { recursive: true, force: true });
    manifest.cleanedAt = new Date().toISOString();
    saveManifest(manifest);
  }
  console.log(JSON.stringify({ cleaned: true, evidence, files: readdirSync(evidence) }, null, 2));
}
async function browser(manifest, argv) {
  if (argv[0] === "open") {
    const target = new URL(argv[1], manifest.web);
    if (target.origin !== manifest.web) throw new Error("Open only this run's own frontend origin.");
    argv = ["open", target.href, ...argv.slice(2)];
  }
  appendFileSync(join(evidence, "actions.jsonl"), JSON.stringify({ at: new Date().toISOString(), command: argv }) + "\n");
  try {
    const output = await new Promise((done, reject) => {
      const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("AGENT_BROWSER_")));
      if (process.env.AGENT_BROWSER_EXECUTABLE_PATH) env.AGENT_BROWSER_EXECUTABLE_PATH = process.env.AGENT_BROWSER_EXECUTABLE_PATH;
      const child = spawn("agent-browser", ["--session", manifest.session, ...argv],
        { cwd: root, detached: true, env, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "", stderr = "", timedOut = false;
      child.stdout.on("data", (part) => { stdout += part; });
      child.stderr.on("data", (part) => { stderr += part; });
      const timeout = setTimeout(() => {
        timedOut = true;
        try { process.kill(-child.pid, "SIGKILL"); } catch {}
      }, 30000);
      child.on("error", (error) => { clearTimeout(timeout); reject(error); });
      child.on("close", (code) => {
        clearTimeout(timeout);
        if (timedOut) reject(new Error("Browser action exceeded 30 seconds. Run doctor, inspect a fresh snapshot, and clean up the failed iteration."));
        else if (code !== 0) reject(new Error(stderr || stdout || `Browser exited ${code}`));
        else done(stdout);
      });
    });
    appendFileSync(join(evidence, "actions.jsonl"), JSON.stringify({ at: new Date().toISOString(), success: true, output }) + "\n");
    return output;
  } catch (error) {
    appendFileSync(join(evidence, "actions.jsonl"), JSON.stringify({ at: new Date().toISOString(), success: false, error: error.message }) + "\n");
    throw error;
  }
}

async function serve() {
  const manifest = readManifest();
  const require = createRequire(join(root, "worker/package.json"));
  const { Miniflare, convertV4MiniflareOptions } = require("miniflare");
  const modules = readdirSync(join(manifest.scratch, "bundle"))
    .filter((name) => name.endsWith(".js") || name.endsWith(".ttf"))
    .map((name) => ({ type: name.endsWith(".js") ? "ESModule" : "Data", path: join(manifest.scratch, "bundle", name) }));
  modules.sort((a, b) => a.type === b.type ? 0 : a.type === "ESModule" ? -1 : 1);
  const mf = new Miniflare(convertV4MiniflareOptions({
    host: "127.0.0.1", port: Number(new URL(manifest.api).port),
    resourcePersistencePath: join(manifest.scratch, "state"),
    isolatedResourcePersistencePath: join(manifest.scratch, "state"),
    resourceTmpPath: join(manifest.scratch, "resource-tmp"),
    workers: [{ name: "verify-ruthva", modules, modulesRoot: join(manifest.scratch, "bundle"),
      compatibilityDate: "2026-10-03", compatibilityFlags: ["nodejs_compat"],
      d1Databases: { DB: "verify-ruthva" }, r2Buckets: ["UPLOADS"],
      bindings: { JWT_SECRET: randomBytes(32).toString("hex"), CRON_SECRET: randomBytes(32).toString("hex"),
        ...(manifest.adminEmail ? { RUTHVA_ADMIN_EMAIL: manifest.adminEmail } : {}),
        FRONTEND_URL: manifest.web, CORS_ALLOWED_ORIGINS: manifest.web,
        DEFAULT_FROM_EMAIL: "noreply@clinic.test", AWS_SES_REGION: "us-east-1",
        AWS_ACCESS_KEY_ID: "verification-placeholder", AWS_SECRET_ACCESS_KEY: "verification-placeholder" },
      outboundService: async (request) => {
        const url = new URL(request.url);
        if (url.hostname === "email.us-east-1.amazonaws.com" && url.pathname === "/v2/email/outbound-emails" && request.method === "POST") {
          const body = await request.json();
          const html = body.Content.Simple.Body.Html.Data;
          appendFileSync(join(manifest.scratch, "inbox.jsonl"), JSON.stringify({ to: body.Destination.ToAddresses,
            subject: body.Content.Simple.Subject.Data, html }) + "\n", { mode: 0o600 });
          appendFileSync(join(evidence, "outbound.jsonl"), JSON.stringify({ at: new Date().toISOString(),
            host: url.host, path: url.pathname, to: body.Destination.ToAddresses, captured: true }) + "\n");
          return Response.json({ MessageId: "local-verification-receipt" });
        }
        appendFileSync(join(evidence, "outbound.jsonl"), JSON.stringify({ at: new Date().toISOString(), host: url.host, path: url.pathname, blocked: true }) + "\n");
        return new Response("External service is unavailable in local verification.", { status: 503 });
      },
    }],
  }));
  let web;
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    web?.kill("SIGTERM");
    await mf.dispose();
  }
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  try {
    await mf.ready;
    const db = await mf.getD1Database("DB");
    for (const name of readdirSync(join(root, "worker/migrations")).sort()) {
      const sql = readFileSync(join(root, "worker/migrations", name), "utf8");
      const statements = sql.match(/CREATE TRIGGER[\s\S]*?END;|(?:CREATE (?!TRIGGER)|ALTER TABLE )[\s\S]*?;/g) || [];
      for (const statement of statements) await db.prepare(statement).run();
    }
    console.log("Verification D1 migrations applied.");
    web = spawn(process.execPath, [join(root, "frontend/node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1",
      "--port", new URL(manifest.web).port], { cwd: join(manifest.scratch, "web"), stdio: "inherit",
      env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_API_URL: manifest.api + "/api/v1" } });
    web.on("exit", () => stop());
    web.on("error", async (error) => { console.error(error); await stop(); process.exitCode = 1; });
  } catch (error) { await stop(); throw error; }
}

async function launch() {
  if (args.length && (args.length !== 2 || args[0] !== "--admin-email" ||
    !/^[a-z0-9][a-z0-9._+-]*@clinic\.test$/.test(args[1]))) {
    throw new Error("Optional launch configuration: --admin-email verification-admin@clinic.test. Use a synthetic clinic.test address.");
  }
  if (existsSync(manifestPath)) throw new Error("Run ID already exists. Keep its evidence and use a new ID.");
  for (const area of ["worker", "frontend"]) {
    if (!existsSync(join(root, area, "node_modules"))) throw new Error(`Run rtk npm --prefix ${area} ci first.`);
  }
  exec("rtk", ["agent-browser", "--version"]);
  const scratch = mkdtempSync(join(tmpdir(), "ruthva-verify-"));
  mkdirSync(evidence, { recursive: true });
  const apiPort = await freePort();
  let webPort = await freePort();
  while (webPort === apiPort) webPort = await freePort();
  const manifest = { root, scratch, api: `http://localhost:${apiPort}`, web: `http://localhost:${webPort}`,
    session: `ruthva-${createHash("sha256").update(root).digest("hex").slice(0, 8)}-${run}`,
    sourceHash: fingerprint(), revision: exec("rtk", ["proxy", "git", "rev-parse", "HEAD"]).trim(),
    startedAt: new Date().toISOString(), adminEmail: args[1] || null, pid: null };
  saveManifest(manifest);
  try {
    const build = exec("rtk", ["proxy", "node", join(root, "worker/node_modules/wrangler/bin/wrangler.js"), "deploy",
      "--dry-run", "--outdir", join(scratch, "bundle")], { cwd: join(root, "worker"), maxBuffer: 10 * 1024 * 1024 });
    writeFileSync(join(evidence, "build.log"), build);
    const web = join(scratch, "web");
    mkdirSync(web);
    for (const file of ["src", "public", "package.json", "next.config.mjs", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs"])
      cpSync(join(root, "frontend", file), join(web, file), { recursive: true });
    symlinkSync(join(root, "frontend/node_modules"), join(web, "node_modules"), "dir");
    const log = openSync(join(evidence, "server.log"), "a");
    const child = spawn(process.execPath, [self, "serve", run], { cwd: root, detached: true, stdio: ["ignore", log, log] });
    manifest.pid = child.pid;
    saveManifest(manifest);
    child.unref();
    for (let i = 0; i < 120; i++) {
      if (!owned(manifest)) throw new Error("Server exited; inspect server.log.");
      try {
        const result = await doctor();
        writeFileSync(join(evidence, "doctor.json"), JSON.stringify(result, null, 2) + "\n");
        console.log(JSON.stringify(result, null, 2));
        return;
      } catch { await pause(1000); }
    }
    throw new Error("Startup timed out; inspect server.log.");
  } catch (error) { await cleanup(); throw error; }
}

if (command === "serve") await serve();
else if (command === "launch") await launch();
else if (command === "doctor") console.log(JSON.stringify(await doctor(), null, 2));
else if (command === "cleanup") await cleanup();
else if (command === "browser") { await doctor(); process.stdout.write(await browser(readManifest(), args)); }
else if (command === "capture") {
  await doctor();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(args[0] || "")) throw new Error("Capture requires a feature-entry-point label.");
  const manifest = readManifest();
  const path = join(evidence, args[0]);
  writeFileSync(path + ".aria.txt", await browser(manifest, ["snapshot"]));
  await browser(manifest, ["screenshot", path + ".png", "--full"]);
  writeFileSync(path + ".url.txt", await browser(manifest, ["get", "url"]));
  console.log(path);
} else if (command === "inbox") {
  await doctor();
  const path = join(readManifest().scratch, "inbox.jsonl");
  const messages = existsSync(path) ? readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : [];
  const message = messages.filter((item) => item.to.includes(args[0])).at(-1);
  if (!message) throw new Error("No captured email for this recipient. Use the UI to request it first.");
  console.log(JSON.stringify({ to: message.to, subject: message.subject, code: message.html.match(/<strong>(\d{6})<\/strong>/)?.[1] || null }));
} else if (command === "data") {
  await doctor();
  const label = args[0] || "data";
  if (!/^[a-z0-9][a-z0-9-]*$/.test(label)) throw new Error("Data requires an optional evidence label.");
  const output = exec("rtk", ["proxy", "python3", "-c", `
import json, pathlib, sqlite3, sys
tables = ['clinics_clinic', 'users_user', 'patients_patient', 'consultations_consultation', 'prescriptions_prescription', 'prescriptions_medication', 'prescriptions_procedureentry', 'pharmacy_medicine', 'pharmacy_stockentry', 'pharmacy_dispensingrecord', 'pharmacy_dispensingitem', 'treatments_treatmentplan', 'treatments_treatmentblock', 'treatments_treatmentsession', 'treatments_sessionfeedback', 'treatments_doctoractiontask']
result = {}
for path in pathlib.Path(sys.argv[1]).rglob('*.sqlite'):
    db = sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)
    names = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    for table in tables:
        if table not in names: continue
        columns = [row[1] for row in db.execute('PRAGMA table_info(' + table + ')') if row[1] not in ('password',)]
        db.row_factory = sqlite3.Row
        result[table] = [dict(row) for row in db.execute('SELECT ' + ','.join(columns) + ' FROM ' + table + ' ORDER BY id')]
    db.close()
if 'users_user' not in result: raise SystemExit('Verification D1 file was not found')
print(json.dumps(result, ensure_ascii=False, indent=2))
`, join(readManifest().scratch, "state")]);
  writeFileSync(join(evidence, label + ".json"), output);
  process.stdout.write(output);
} else throw new Error(`Unknown command: ${command}`);

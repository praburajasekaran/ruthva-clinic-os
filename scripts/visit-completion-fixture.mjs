import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const require = createRequire(new URL("../worker/package.json", import.meta.url));
const { Miniflare, convertV4MiniflareOptions } = require("miniflare");
const apiPort = 8796;
const webOrigin = "http://localhost:3006";
let signupCode;
const modules = (await readdir("worker/dist"))
  .filter((name) => name.endsWith(".js") || name.endsWith(".ttf"))
  .map((name) => ({ type: name.endsWith(".js") ? "ESModule" : "Data", path: resolve("worker/dist", name) }))
  .sort((a, b) => a.type === b.type ? 0 : a.type === "ESModule" ? -1 : 1);
const mf = new Miniflare(convertV4MiniflareOptions({
  workers: [{
    name: "visit-completion-test",
    modules,
    modulesRoot: resolve("worker/dist"),
    compatibilityDate: "2026-10-03",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: { DB: "visit-completion-test" },
    r2Buckets: ["UPLOADS"],
    outboundService: async (request) => {
      if (new URL(request.url).hostname !== "email.us-east-1.amazonaws.com") throw new Error("Unexpected outbound request");
      const body = await request.json();
      signupCode = /<strong>(\d{6})<\/strong>/.exec(body.Content.Simple.Body.Html.Data)?.[1];
      return Response.json({ MessageId: "fixture-email" });
    },
    bindings: {
      JWT_SECRET: "visit-completion-isolated-test-secret-32-characters",
      CRON_SECRET: "visit-completion-test-cron",
      FRONTEND_URL: webOrigin,
      CORS_ALLOWED_ORIGINS: webOrigin,
      DEFAULT_FROM_EMAIL: "test@clinic.test",
      AWS_SES_REGION: "us-east-1",
      AWS_ACCESS_KEY_ID: "fixture",
      AWS_SECRET_ACCESS_KEY: "fixture",
    },
  }],
}));
const db = await mf.getD1Database("DB");
for (const name of (await readdir("worker/migrations")).sort()) {
  const sql = await readFile(`worker/migrations/${name}`, "utf8");
  for (const statement of sql.match(/CREATE TRIGGER[\s\S]*?END;|(?:CREATE (?!TRIGGER)|ALTER TABLE )[\s\S]*?;/g) ?? []) {
    await db.prepare(statement).run();
  }
}
async function post(path, body) {
  const response = await mf.dispatchFetch(`http://localhost:${apiPort}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data;
}
await post("/auth/initiate-signup/", { first_name: "Doctor", email: "completion@clinic.test", discipline: "siddha" });
const doctor = await post("/auth/signup/", {
  code: signupCode,
  clinic_name: "Visit completion clinic",
  subdomain: "completion-test",
  discipline: "siddha",
  username: "completion-doctor",
  email: "completion@clinic.test",
  first_name: "Doctor",
  password: "CompletionTestPass123",
});
const roles = { doctor };
const owner = await db.prepare("SELECT * FROM users_user WHERE username='completion-doctor'").first();
for (const role of ["therapist", "admin"]) {
  const copy = { ...owner, username: `completion-${role}`, email: `${role}@clinic.test`, first_name: role, role, is_clinic_owner: 0 };
  delete copy.id;
  const keys = Object.keys(copy);
  await db.prepare(`INSERT INTO users_user (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`).bind(...Object.values(copy)).run();
  roles[role] = await post("/auth/token/", { username: copy.username, password: "CompletionTestPass123" });
}
const server = createServer(async (request, response) => {
  try {
    if (request.url === "/__fixture") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ roles, signupCode }));
      return;
    }
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const result = await mf.dispatchFetch(`http://localhost:${apiPort}${request.url}`, {
      method: request.method,
      headers: request.headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    response.writeHead(500);
    response.end(error.message);
  }
});
server.listen(apiPort, "127.0.0.1", () => console.log(`Visit completion fixture on ${apiPort}`));
async function stop() {
  server.close();
  await mf.dispose();
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);

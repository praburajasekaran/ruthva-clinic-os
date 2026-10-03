import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const require = createRequire(new URL("frontend/package.json", root));
const ts = require("typescript");
export async function preflight() {
  const load = async (path) => {
    const parsed = ts.parseConfigFileTextToJson(
      path,
      await readFile(new URL(path, root), "utf8"),
    );
    if (parsed.error) throw new Error(`Invalid configuration in ${path}.`);
    return parsed.config;
  };
  const api = await load("worker/wrangler.jsonc");
  const frontend = await load("frontend/wrangler.jsonc");
  const failures = [];
  const demand = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const origin = (value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !["localhost", "127.0.0.1"].includes(url.hostname) &&
        !url.pathname.replaceAll("/", "") &&
        !url.search &&
        !url.hash
      );
    } catch {
      return false;
    }
  };
  demand(
    api.d1_databases?.some(
      (db) =>
        db.binding === "DB" &&
        /^[a-f0-9-]{36}$/i.test(db.database_id) &&
        db.database_id !== "00000000-0000-0000-0000-000000000000",
    ),
    "Set the real D1 database_id in worker/wrangler.jsonc.",
  );
  demand(
    origin(api.vars?.FRONTEND_URL),
    "Set FRONTEND_URL to the public HTTPS frontend origin.",
  );
  demand(
    api.vars?.CORS_ALLOWED_ORIGINS?.split(",").every(origin),
    "Set CORS_ALLOWED_ORIGINS to HTTPS origins.",
  );
  demand(
    api.vars?.CORS_ALLOWED_ORIGINS?.split(",")
      .map((value) => value.trim())
      .includes(api.vars?.FRONTEND_URL),
    "Include FRONTEND_URL in CORS_ALLOWED_ORIGINS.",
  );
  demand(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(api.vars?.DEFAULT_FROM_EMAIL ?? ""),
    "Set DEFAULT_FROM_EMAIL to a verified sender address.",
  );
  demand(!api.vars?.TEST_EMAIL, "Remove TEST_EMAIL from production variables.");
  demand(
    !api.vars?.JWT_SECRET && !api.vars?.CRON_SECRET,
    "Store JWT_SECRET and CRON_SECRET with wrangler secret put.",
  );
  demand(
    !api.vars?.AWS_ACCESS_KEY_ID &&
      !api.vars?.AWS_SECRET_ACCESS_KEY &&
      !api.vars?.AWS_SESSION_TOKEN,
    "Store AWS credentials with wrangler secret put.",
  );
  demand(
    /^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(api.vars?.AWS_SES_REGION ?? ""),
    "Set AWS_SES_REGION to the region with your SES quota and verified sender.",
  );
  demand(
    api.workers_dev === false,
    "Keep the API Worker private with workers_dev=false.",
  );
  demand(
    frontend.services?.some(
      (service) => service.binding === "API" && service.service === api.name,
    ),
    "The frontend API service binding must match the API Worker name.",
  );
  demand(
    api.browser?.binding === "BROWSER",
    "Configure the Browser Rendering binding.",
  );
  demand(
    !api.vars?.RUTHVA_API_URL || api.vars.RUTHVA_API_URL.startsWith("https://"),
    "RUTHVA_API_URL must use HTTPS when enabled.",
  );
  if (failures.length) throw new Error(failures.join("\n"));
  return "Cloudflare configuration checks pass. Verify account bindings, SES sender identity, sending quota, and secrets before deployment.";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(await preflight());
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

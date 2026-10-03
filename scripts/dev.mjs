import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const apiPort = Number(process.env.API_PORT || 8797);
const webPort = Number(process.env.WEB_PORT || 3000);
const origin = `http://localhost:${webPort}`;
const children = [
  spawn(
    process.execPath,
    [
      resolve(root, "worker/node_modules/wrangler/bin/wrangler.js"),
      "dev",
      "--port",
      String(apiPort),
      "--inspector-port",
      "9297",
      "--var",
      `FRONTEND_URL:${origin}`,
      "--var",
      `CORS_ALLOWED_ORIGINS:${origin}`,
    ],
    { cwd: resolve(root, "worker"), stdio: "inherit" },
  ),
  spawn(
    process.execPath,
    [
      resolve(root, "frontend/node_modules/next/dist/bin/next"),
      "dev",
      "--port",
      String(webPort),
    ],
    {
      cwd: resolve(root, "frontend"),
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}/api/v1`,
      },
    },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

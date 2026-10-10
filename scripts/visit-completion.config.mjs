import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../", import.meta.url));

export default defineConfig({
  testDir: "./tests",
  testMatch: ["visit-completion.spec.mjs", "siddha-practice.spec.mjs"],
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3006", viewport: { width: 1280, height: 1100 }, trace: "retain-on-failure", screenshot: "only-on-failure", actionTimeout: 15_000 },
  outputDir: "../.audit/visit-completion",
  webServer: [
    { command: "node scripts/visit-completion-fixture.mjs", cwd, url: "http://127.0.0.1:8796/__fixture", timeout: 60_000 },
    {
      command: "npm --prefix frontend run dev -- --port 3006",
      cwd,
      url: "http://localhost:3006/login",
      timeout: 60_000,
      env: { NEXT_PUBLIC_API_URL: "http://127.0.0.1:8796/api/v1" },
    },
  ],
});

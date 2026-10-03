import { build } from "esbuild";
import assert from "node:assert/strict";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import QRCode from "qrcode";

const root = fileURLToPath(new URL("../../", import.meta.url));
const output = resolve(root, ".audit");
await mkdir(output, { recursive: true });
const modulePath = resolve(output, "pdf-renderer.mjs");
await build({
  entryPoints: [resolve(root, "worker/src/pdf.ts")],
  outfile: modulePath,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  loader: { ".ttf": "binary" },
});
try {
  const { prescriptionHtml } = await import(pathToFileURL(modulePath).href);
  const clinic = {
    name: "தமிழ் Clinic",
    registration_number: "REG-001",
    address: "Chennai",
    paper_size: "A4",
    primary_color: "#2c5f2d",
  };
  const qr = await QRCode.toDataURL("https://example.test/review", {
    width: 200,
    margin: 1,
  });
  const html = prescriptionHtml(
    clinic,
    { first_name: "Sample", last_name: "Doctor" },
    {
      name: "Patient <script>alert(1)</script>",
      age: 31,
      gender: "female",
      record_id: "PAT-2026-0001",
    },
    {
      consultation_date: "2026-10-03",
      chief_complaints: "Pain",
      diagnosis: "Joint pain",
      weight: "60",
      bp_systolic: 120,
      bp_diastolic: 80,
    },
    {
      diet_advice: "Vegetables",
      diet_advice_ta: "கீரை",
      follow_up_date: "2026-10-10",
    },
    [
      {
        drug_name: "Medicine",
        dosage: "1 tablet",
        frequency: "BD",
        duration: "7 days",
        instructions_ta: "உணவுக்குப் பின்",
      },
    ],
    [],
    "",
    qr,
  );
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(html.includes("உணவுக்குப் பின்"));
  assert.ok(html.includes('src="data:image/png;base64,'));
  assert.ok(html.includes("data:font/ttf;base64,"));
  assert.ok(
    !prescriptionHtml(
      { ...clinic, letterhead_mode: "preprinted" },
      {},
      {},
      {},
      {},
      [],
      [],
    ).includes("<header>"),
  );
  await writeFile(resolve(output, "prescription.html"), html);
  console.log(
    `Verified escaped bilingual HTML, embedded fonts, review QR, and preprinted mode. Saved ${resolve(output, "prescription.html")}.`,
  );
} finally {
  await rm(modulePath);
}

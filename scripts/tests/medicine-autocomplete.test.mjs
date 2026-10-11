import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

const requireWorker = createRequire(new URL("../../worker/package.json", import.meta.url));
const { build } = requireWorker("esbuild");
const root = resolve(import.meta.dirname, "../..");
const drugs = JSON.parse(await readFile(new URL("../../frontend/src/lib/data/siddha-essential-drugs-2013.json", import.meta.url), "utf8"));
let browser;
let bundle;
let stylesheet;
let searchHelpers;

before(async () => {
  const helpers = await build({ entryPoints: [resolve(root, "shared/medicine-search.ts")], bundle: true, write: false, format: "esm", platform: "node" });
  searchHelpers = await import(`data:text/javascript;base64,${Buffer.from(helpers.outputFiles[0].text).toString("base64")}`);
  const result = await build({
    stdin: {
      resolveDir: root,
      loader: "tsx",
      contents: `
        import { useState } from "react";
        import { createRoot } from "react-dom/client";
        import { MedicationRow } from "./frontend/src/components/prescriptions/MedicationRow";
        function App() {
          const fixture = window.autocompleteFixture;
          const [rows, setRows] = useState(fixture.values.map(drug_name => ({
            medicine: null, drug_name, dosage_amount: "", dosage_unit: "", frequency: "",
            frequency_tamil: "", timing: "", timing_tamil: "", duration: "",
            instructions: "", instructions_ta: "", potency: "", dilution_scale: "", pellet_count: "",
          })));
          const [saved, setSaved] = useState(null);
          return <form onSubmit={e => {e.preventDefault(); setSaved(rows);}}>
            {rows.map((data, index) => <MedicationRow key={index} index={index} data={data}
              discipline={fixture.discipline} onRemove={() => {}}
              onChange={(field, value) => setRows(current => current.map((row, i) => i === index ? {...row, [field]: value} : row))} />)}
            <button type="submit">Save test prescription</button>
            <output id="saved">{JSON.stringify(saved)}</output>
          </form>;
        }
        createRoot(document.getElementById("root")).render(<App />);
      `,
    },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    alias: {
      "@": resolve(root, "frontend/src"),
      "react": resolve(root, "frontend/node_modules/react"),
      "react-dom": resolve(root, "frontend/node_modules/react-dom"),
    },
    nodePaths: [resolve(root, "frontend/node_modules")],
    define: { "process.env.NODE_ENV": '"test"', "process.env.NEXT_PUBLIC_API_URL": '"/api/v1"' },
  });
  bundle = result.outputFiles[0].text;
  stylesheet = execFileSync(process.execPath, [
    resolve(root, "frontend/node_modules/tailwindcss/lib/cli.js"),
    "-i", "src/app/globals.css", "--config", "tailwind.config.ts",
  ], { cwd: resolve(root, "frontend"), encoding: "utf8" });
  await mkdir(resolve(root, ".audit/medicine-autocomplete"), { recursive: true });
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); });

async function openFixture({ discipline = "siddha", values = [""], medicines = [], usage = [], unavailable = false, touch = false, searchGate } = {}) {
  const context = await browser.newContext({ hasTouch: touch, viewport: { width: 1100, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((fixture) => { window.autocompleteFixture = fixture; }, { discipline, values });
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).pathname.startsWith("/api/v1/")) {
      if (searchGate) await searchGate;
      assert.equal(new URL(route.request().url()).pathname, "/api/v1/pharmacy/medicine-suggestions/");
      await route.fulfill({ status: unavailable ? 503 : 200, json: { results: medicines, usage } });
    } else {
      await route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' });
    }
  });
  await page.goto("http://autocomplete.test/");
  await page.addStyleTag({ content: stylesheet + "form { max-width: 780px; margin: 32px auto; padding: 24px; }" });
  await page.addScriptTag({ content: bundle });
  try {
    await expect(page.getByRole("combobox").first()).toBeVisible();
  } catch (error) {
    await context.close();
    throw new Error(errors.join("\n") || error.message);
  }
  return { page, context };
}

async function save(page) {
  await page.getByRole("button", { name: "Save test prescription" }).click();
  return JSON.parse(await page.locator("#saved").textContent());
}

function medicine(name, overrides = {}) {
  return { id: 42, name, name_ta: "", brand_name: "", is_active: true, dosage_form: "g", current_stock: 7, is_low_stock: false, ...overrides };
}

test("the catalogue preserves all 302 source rows and wrapped medicine names", () => {
  assert.equal(drugs.length, 302);
  assert.deepEqual(drugs.map(drug => drug.number), Array.from({ length: 302 }, (_, i) => i + 1));
  assert.equal(new Set(drugs.map(drug => drug.name.toLowerCase())).size, 302);
  assert.equal(drugs[210].name, "Nilavembu kudineer Choorarnam");
  assert.equal(drugs[210].pdfPage, 40);
  assert.equal(drugs[285].name, "Thamaraikkizhangu");
  assert.equal(drugs[301].name, "Vilva ver");
});

test("fuzzy matching accepts transliteration variants and bounded typos without changing medicine identity", () => {
  const { medicineNameMatches, normalizeMedicineName } = searchHelpers;
  for (const [query, name] of [
    ["Thiribala", "Thiripala Chooranam"], ["tiripala", "Thiripala Chooranam"], ["tiribala", "Thiripala Chooranam"],
    ["Choornam", "Chooranam"], ["sooranam", "Chooranam"], ["soornam", "Chooranam"],
    ["Vathasura", "Vatha Sura Kudineer Chooranam"], ["Vadasura", "Vatha Sura Kudineer Chooranam"], ["vadhasura", "Vatha Sura Kudineer Chooranam"],
    ["Thiripla", "Thiripala Chooranam"], ["Thiripala soornam", "Thiripala Chooranam"],
    ["CHOORANAM", "Amukkara Chooranam"], ["சூரணம்", "அமுக்கரா சூரணம்"],
  ]) assert.ok(medicineNameMatches(name, query), `${query} matches ${name}`);
  for (const [query, name] of [["zzzzz", "Thiripala Chooranam"], ["ti", "Thiripala Chooranam"], ["c", "Chooranam"], ["Tablet 101", "Tablet 100"], ["", "Chooranam"]]) {
    assert.equal(medicineNameMatches(name, query), false, `${query} does not loosely match ${name}`);
  }
  assert.notEqual(normalizeMedicineName("Thiribala"), normalizeMedicineName("Thiripala"));
});

test("generic fuzzy search works across the full PDF catalogue, not a list of named aliases", () => {
  const { medicineNameMatches, normalizeMedicineName } = searchHelpers;
  for (const drug of drugs) {
    const name = normalizeMedicineName(drug.name);
    assert.ok(medicineNameMatches(drug.name, `${name}z`), `extra letter in ${drug.name}`);
    assert.ok(medicineNameMatches(drug.name, `${name.slice(0, -1)}z`), `wrong letter in ${drug.name}`);
    if (name.length > 5) assert.ok(medicineNameMatches(drug.name, name.slice(0, -1)), `missing letter in ${drug.name}`);
  }
  for (const [query, name] of [
    ["Amukara", "Amukkara Chooranam"], ["Amukakra", "Amukkara Chooranam"],
    ["Neelavembu", "Nilavembu kudineer Choorarnam"], ["Adatodai", "Adathodai kudineer Choorarnam"],
    ["Chenthuram", "Chendhuram"], ["Sopmu", "Sombu"], ["Seerga", "Seeraga Chooranam"],
    ["Bhringarja", "Bhringaraja Tailam"], ["Ashwagnda", "Ashwagandha"], ["Belladnona", "Belladonna"],
    ["Perantha Parpam", "Peranda Parpam - 1"], ["Tbalet 100", "Tablet 100"],
  ]) assert.ok(medicineNameMatches(name, query), `${query} matches ${name} through generic rules`);
});

test("other clinic drugs get fuzzy matching and keep separate identities", async () => {
  const medicines = [medicine("Ashwagandha", {id: 101}), medicine("Belladonna", {id: 102})];
  const { page, context } = await openFixture({discipline: "homeopathy", medicines});
  try {
    const input = page.getByRole("combobox");
    for (const [query, name, id] of [["Ashwagnda", "Ashwagandha", 101], ["Belladnona", "Belladonna", 102]]) {
      await input.fill(query);
      const option = page.getByRole("option").filter({hasText: name});
      await expect(option).toBeVisible();
      await option.click();
      const saved = await save(page);
      assert.equal(saved[0].drug_name, name);
      assert.equal(saved[0].medicine, id);
    }
  } finally { await context.close(); }
});

test("all requested fuzzy spellings find their PDF names and preserve the selected source name", async () => {
  const { page, context } = await openFixture({ unavailable: true });
  try {
    const input = page.getByRole("combobox");
    for (const [queries, name] of [
      [["Thiribala", "tiripala", "tiribala"], "Thiripala Chooranam"],
      [["Choornam", "sooranam", "soornam"], "Thiripala Chooranam"],
      [["Vathasura", "Vadasura", "vadhasura"], "Vatha Sura Kudineer Chooranam"],
    ]) {
      for (const query of queries) {
        await input.fill(query);
        await expect(page.getByRole("option").filter({ hasText: name })).toBeVisible();
      }
    }
    await page.getByRole("option").filter({ hasText: "Vatha Sura Kudineer Chooranam" }).click();
    const saved = await save(page);
    assert.equal(saved[0].drug_name, "Vatha Sura Kudineer Chooranam");
    assert.equal(saved[0].medicine, null);
  } finally { await context.close(); }
});

test("fuzzy clinic matches retain their stock IDs and personalized ranking", async () => {
  const med = medicine("Thiripala Chooranam");
  const { page, context } = await openFixture({ medicines: [med], usage: [{name: med.name, doctor_count: 10, clinic_count: 10}] });
  try {
    await page.getByRole("combobox").fill("soornam");
    await expect(page.getByRole("option").first()).toContainText("Stock: 7");
    await expect(page.getByRole("option").filter({hasText: med.name})).toHaveCount(1);
    await page.getByRole("option").first().click();
    assert.equal((await save(page))[0].medicine, med.id);
  } finally { await context.close(); }
});

test("doctor usage ranks before clinic usage, with alphabetical ties across PDF and clinic drugs", async () => {
  const { page, context } = await openFixture({
    medicines: [medicine("Zebra Choorarnam"), medicine("Beta Choorarnam", { id: 43 }), medicine("Alpha Choorarnam", { id: 44 })],
    usage: [
      { name: "Zebra Choorarnam", doctor_count: 2, clinic_count: 2 },
      { name: "Nilavembu-kudineer Choorarnam", doctor_count: 3, clinic_count: 3 },
      { name: "Alpha Choorarnam", doctor_count: 1, clinic_count: 10 },
      { name: "Beta Choorarnam", doctor_count: 1, clinic_count: 10 },
      { name: "Adathodai kudineer Choorarnam", doctor_count: 0, clinic_count: 100 },
    ],
  });
  try {
    await page.getByRole("combobox").fill("Choorarnam");
    await expect(page.getByRole("option").first()).toContainText("Nilavembu kudineer Choorarnam");
    const names = await page.getByRole("option").locator("span.font-medium").allTextContents();
    assert.deepEqual(names.slice(0, 5), ["Nilavembu kudineer Choorarnam", "Zebra Choorarnam", "Alpha Choorarnam", "Beta Choorarnam", "Adathodai kudineer Choorarnam"]);
    assert.deepEqual(names.slice(5), names.slice(5).toSorted((a, b) => a.localeCompare(b)));
    await page.getByRole("combobox").press("ArrowDown");
    await page.getByRole("combobox").press("Enter");
    assert.equal((await save(page))[0].drug_name, "Nilavembu kudineer Choorarnam");
  } finally { await context.close(); }
});

test("ranking happens before the suggestion limit and no-history drugs sort alphabetically", async () => {
  const medicines = Array.from({ length: 35 }, (_, index) => medicine(`Medicine ${String(index).padStart(2, "0")}`, { id: index + 1 }));
  const { page, context } = await openFixture({ discipline: "homeopathy", medicines, usage: [{ name: "Medicine 34", doctor_count: 1, clinic_count: 1 }] });
  try {
    await page.getByRole("combobox").fill("Medicine");
    await expect(page.getByRole("option")).toHaveCount(30);
    await expect(page.getByRole("option").first()).toContainText("Medicine 34");
    const names = await page.getByRole("option").locator("span.font-medium").allTextContents();
    assert.deepEqual(names.slice(1), medicines.slice(0, 29).map(med => med.name));
  } finally { await context.close(); }
});

test("keyboard selection saves a PDF name without a stock ID even when the API fails", async () => {
  const { page, context } = await openFixture({ unavailable: true });
  try {
    const input = page.getByRole("combobox");
    await input.fill("n");
    await expect(page.getByRole("option")).toHaveCount(0);
    await input.fill("NILAVEMBUKUDINEER");
    await expect(page.getByRole("option")).toContainText("Nilavembu kudineer Choorarnam");
    await page.screenshot({ path: resolve(root, ".audit/medicine-autocomplete/desktop.png") });
    await input.press("ArrowDown");
    await expect(page.getByRole("option")).toHaveAttribute("aria-selected", "true");
    await input.press("Enter");
    await expect(input).toHaveValue("Nilavembu kudineer Choorarnam");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    assert.equal((await save(page))[0].medicine, null);
    assert.equal((await save(page))[0].drug_name, "Nilavembu kudineer Choorarnam");
  } finally { await context.close(); }
});

test("a matching clinic medicine replaces its reference and preserves its stock ID", async () => {
  const med = medicine("Nilavembu kudineer Choorarnam");
  const { page, context } = await openFixture({ medicines: [med] });
  try {
    await page.getByRole("combobox").fill("Nilavembu");
    await expect(page.getByRole("option")).toContainText("Stock: 7");
    await expect(page.getByRole("option")).toHaveCount(1);
    await page.getByRole("option").click();
    assert.equal((await save(page))[0].medicine, 42);
    await page.getByRole("combobox").fill("Custom medicine");
    const saved = await save(page);
    assert.equal(saved[0].medicine, null);
    assert.equal(saved[0].drug_name, "Custom medicine");
  } finally { await context.close(); }
});

test("PDF names stay out of other disciplines and inactive clinic medicines are excluded", async () => {
  const { page, context } = await openFixture({ discipline: "homeopathy", medicines: [medicine("Inactive Nilavembu", { is_active: false })] });
  try {
    await page.getByRole("combobox").fill("Nilavembu");
    await expect(page.getByRole("option")).toHaveCount(0);
    const saved = await save(page);
    assert.equal(saved[0].drug_name, "Nilavembu");
    assert.equal(saved[0].medicine, null);
  } finally { await context.close(); }
});

test("keyboard focus follows a reference when its clinic match arrives", async () => {
  let release;
  const searchGate = new Promise(resolve => { release = resolve; });
  const { page, context } = await openFixture({ searchGate, medicines: [medicine("Nilavembu kudineer Choorarnam")] });
  try {
    const input = page.getByRole("combobox");
    await input.fill("Nilavembu");
    await input.press("ArrowDown");
    await expect(page.getByRole("option")).toHaveAttribute("aria-selected", "true");
    release();
    await expect(page.getByRole("option")).toContainText("Stock: 7");
    await expect(page.getByRole("option")).toHaveAttribute("aria-selected", "true");
    await input.press("Enter");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    assert.equal((await save(page))[0].medicine, 42);
  } finally { release(); await context.close(); }
});

test("editing prefilled rows searches on focus and each combobox owns distinct option IDs", async () => {
  const { page, context } = await openFixture({ values: ["Nilavembu", "Kaba Sura"] });
  try {
    const inputs = page.getByRole("combobox");
    await inputs.nth(0).focus();
    await inputs.nth(0).press("ArrowDown");
    const firstId = await inputs.nth(0).getAttribute("aria-activedescendant");
    assert.ok(firstId);
    await inputs.nth(1).focus();
    await inputs.nth(1).press("ArrowDown");
    const secondId = await inputs.nth(1).getAttribute("aria-activedescendant");
    assert.ok(secondId);
    assert.notEqual(firstId, secondId);
    await inputs.nth(1).press("Enter");
    const saved = await save(page);
    assert.equal(saved[0].drug_name, "Nilavembu");
    assert.equal(saved[1].drug_name, "Kaba Sura Kudineer Choorarnam");
    assert.equal(saved[1].medicine, null);
  } finally { await context.close(); }
});

test("touch selection works and clearing or Escape removes the popup", async () => {
  const { page, context } = await openFixture({ touch: true });
  try {
    const input = page.getByRole("combobox");
    await page.setViewportSize({ width: 390, height: 844 });
    await input.fill("amukkara");
    await page.screenshot({ path: resolve(root, ".audit/medicine-autocomplete/mobile.png") });
    await page.getByRole("option").filter({ hasText: "Amukkara Chooranam" }).tap();
    await expect(input).toHaveValue("Amukkara Chooranam");
    assert.equal((await save(page))[0].medicine, null);
    await input.fill("parpam");
    await input.press("ArrowDown");
    await input.press("Escape");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).not.toHaveAttribute("aria-activedescendant");
    await input.fill("");
    await expect(page.getByRole("option")).toHaveCount(0);
  } finally { await context.close(); }
});

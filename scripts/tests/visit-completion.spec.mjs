import { test, expect } from "@playwright/test";

const apiOrigin = "http://127.0.0.1:8796";
let roles;

test.beforeAll(async ({ request }) => {
  roles = (await (await request.get(`${apiOrigin}/__fixture`)).json()).roles;
});

async function api(request, path, { method = "GET", data, role = "doctor" } = {}) {
  const response = await request.fetch(`${apiOrigin}/api/v1${path}`, {
    method, data, headers: { Authorization: `Bearer ${roles[role].access}` },
  });
  const result = await response.json();
  expect(response.ok(), JSON.stringify(result)).toBe(true);
  return result;
}

async function signIn(page, role = "doctor") {
  await page.addInitScript(({ access, refresh }) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    localStorage.setItem("clinic_slug", "completion-test");
    window.print = () => {};
  }, roles[role]);
}

async function patient(request, name) {
  return api(request, "/patients/", { method: "POST", data: {
    name, age: 30, gender: "female", phone: "9876543210", allergies: "Sesame",
    medical_history: [{ disease: "Asthma", duration: "2 years", medication: "Inhaler" }],
  } });
}

async function medicine(request, name) {
  const med = await api(request, "/pharmacy/medicines/", { method: "POST", data: {
    name, category: "tablet", dosage_form: "tablets", unit_price: "10.00",
  } });
  await api(request, `/pharmacy/medicines/${med.id}/adjust-stock/`, { method: "POST", data: { quantity: 10, entry_type: "purchase" } });
  return med;
}

async function savedVisit(request, name, medications = []) {
  const person = await patient(request, name);
  const visit = await api(request, "/consultations/", { method: "POST", data: {
    patient: person.id, consultation_date: "2026-10-10", diagnosis: "Joint pain",
  } });
  const rx = await api(request, "/prescriptions/", { method: "POST", data: { consultation: visit.id, medications } });
  return { person, visit, rx };
}

for (const returning of [false, true]) {
  test(`${returning ? "returning" : "new"} patient completes a visit without repeat records or stock changes`, async ({ page, request }, testInfo) => {
    const person = await patient(request, returning ? "Returning Patient" : "New Patient");
    const med = await medicine(request, returning ? "Returning Tablet" : "New Tablet");
    if (returning) {
      const prior = await api(request, "/consultations/", { method: "POST", data: {
        patient: person.id, consultation_date: "2026-10-01", diagnosis: "Previous joint pain",
      } });
      await api(request, "/prescriptions/", { method: "POST", data: { consultation: prior.id } });
    }
    await signIn(page);
    await page.goto(`/patients/${person.id}/consultations/new`);
    await page.getByRole("button", { name: "Save & Write Rx", exact: true }).click();
    await expect(page).toHaveURL(/\/consultations\/\d+\/prescriptions\/new$/);
    const visitId = Number(/consultations\/(\d+)/.exec(page.url())[1]);
    await page.getByPlaceholder("e.g., Nilavembu Kudineer").fill(med.name);
    await page.getByRole("option").filter({ hasText: med.name }).click();
    await page.getByRole("button", { name: returning ? "Save & Print" : "Save", exact: true }).click();
    if (returning) {
      await expect(page).toHaveURL(/\/print$/);
      await page.getByRole("link", { name: "Return to visit completion", exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: "Visit completion", exact: true })).toBeVisible();
    const prescriptionId = Number(/prescriptions\/(\d+)/.exec(page.url())[1]);
    const completionUrl = `/prescriptions/${prescriptionId}`;
    await expect(page.getByText("Allergies: Sesame")).toBeVisible();
    await expect(page.getByRole("region", { name: "Patient history", exact: true })).toContainText("Asthma, 2 years, Inhaler");
    await expect(page.getByRole("region", { name: "Patient history", exact: true })).toContainText(returning ? "Previous joint pain" : "first recorded visit");
    await expect(page.getByRole("region", { name: "Dispensing status" })).toContainText("No dispensing recorded.");
    expect((await api(request, `/pharmacy/medicines/${med.id}/`)).current_stock).toBe(10);

    await page.getByRole("link", { name: "Set follow-up date", exact: true }).click();
    await page.getByLabel(/^Follow-up Date/).click();
    const calendar = page.getByRole("dialog", { name: "Choose a date", exact: true });
    await calendar.getByRole("combobox").nth(0).selectOption("9");
    await calendar.getByRole("combobox").nth(1).selectOption("2026");
    await calendar.getByRole("button", { name: /October 17/ }).click();
    await page.getByPlaceholder("Follow-up notes...").fill("Review joint pain");
    await page.getByRole("button", { name: "Update Prescription", exact: true }).click();
    await page.getByRole("link", { name: "Print", exact: true }).click();
    await expect(page).toHaveURL(/\/print$/);
    await page.getByRole("link", { name: "Return to visit completion", exact: true }).click();
    await expect(page.getByRole("region", { name: "Follow-up status" })).toContainText("17 October 2026");
    await expect(page.getByRole("region", { name: "Follow-up status" })).toContainText("Review joint pain");

    await page.getByRole("button", { name: "Create treatment plan", exact: true }).click();
    await page.getByLabel("Total Days", { exact: true }).fill("2");
    await page.getByLabel("Block End Day", { exact: true }).fill("2");
    await page.getByRole("spinbutton").last().fill("2");
    await page.getByPlaceholder("e.g. Abhyanga").fill("Massage");
    await page.getByPlaceholder("e.g. Dhanwantharam Thailam").fill("Fixture oil");
    await page.getByRole("button", { name: "Create Treatment Plan", exact: true }).click();
    await expect(page).toHaveURL(/\/treatments\/plans\/\d+$/);
    const planId = Number(/plans\/(\d+)/.exec(page.url())[1]);
    await page.goto(completionUrl);
    await expect(page.getByRole("region", { name: "Treatment status" })).toContainText("2-day plan, active, 1 block.");
    await expect(page.getByRole("link", { name: `Open treatment plan #${planId}`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Record dispensing", exact: true }).click();
    await page.getByRole("dialog").locator('input[type="number"]').fill("2");
    await page.getByRole("dialog").getByRole("button", { name: /Dispense/ }).click();
    await expect(page.getByRole("region", { name: "Dispensing status" })).toContainText("1 dispensing record saved.");
    await expect(page.getByRole("button", { name: "Record dispensing", exact: true })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("region", { name: "Dispensing status" })).toContainText("1 dispensing record saved.");
    await page.goto(`/consultations/${visitId}`);
    await page.getByRole("link", { name: /Review visit completion/ }).click();
    await expect(page).toHaveURL(new RegExp(`${completionUrl}$`));
    await page.goto(`/consultations/${visitId}/prescriptions/new`);
    await expect(page).toHaveURL(new RegExp(`${completionUrl}$`));
    await expect(page.getByRole("heading", { name: "Visit completion", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Dispensing status" })).toContainText("1 dispensing record saved.");
    await expect(page.getByRole("region", { name: "Treatment status" })).toContainText("2-day plan, active, 1 block.");

    expect((await api(request, `/consultations/?patient=${person.id}`)).count).toBe(returning ? 2 : 1);
    expect((await api(request, `/prescriptions/?consultation__patient=${person.id}`)).count).toBe(returning ? 2 : 1);
    expect((await api(request, `/pharmacy/dispensing/?prescription=${prescriptionId}`)).length).toBe(1);
    expect((await api(request, `/treatments/plans/?patient_id=${person.id}`)).length).toBe(1);
    expect((await api(request, `/pharmacy/medicines/${med.id}/`)).current_stock).toBe(8);
    expect((await api(request, `/prescriptions/${prescriptionId}/`)).follow_up_date).toBe("2026-10-17");
    if (returning) {
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("heading", { name: "Visit completion", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("completion-mobile.png") });
      await page.getByRole("region", { name: "Follow-up status" }).scrollIntoViewIfNeeded();
    }
    await page.screenshot({ path: testInfo.outputPath("completion.png"), fullPage: true });
  });
}

test.describe("follow-up date shortcuts", () => {
  test.use({ timezoneId: "America/New_York" });

  test("visit-relative dates survive saving, manual changes, and clearing", async ({ page, request }) => {
    const person = await patient(request, "Follow-up Date Patient");
    const visit = await api(request, "/consultations/", { method: "POST", data: {
      patient: person.id, consultation_date: "2028-01-31", diagnosis: "Joint pain",
    } });
    await signIn(page);
    await page.goto(`/consultations/${visit.id}/prescriptions/new`);
    const followUp = page.locator("#follow-up");
    await expect(followUp.getByText("Return on", { exact: false })).toHaveCount(0);
    for (const [days, date, display] of [
      [7, "2028-02-07", "7 Feb 2028"],
      [14, "2028-02-14", "14 Feb 2028"],
      [30, "2028-03-01", "1 Mar 2028"],
      [45, "2028-03-16", "16 Mar 2028"],
    ]) {
      await followUp.getByRole("button", { name: `${days} days`, exact: true }).click();
      await expect(followUp.getByRole("button", { name: `${days} days`, exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(followUp.locator("time")).toHaveAttribute("datetime", date);
      await expect(followUp.locator("time")).toHaveText(display);
      await expect(followUp.locator('[aria-pressed="true"]')).toHaveCount(1);
    }
    await page.getByPlaceholder("Follow-up notes...").fill("Review progress");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Visit completion", exact: true })).toBeVisible();
    const prescriptionId = Number(/prescriptions\/(\d+)/.exec(page.url())[1]);
    expect((await api(request, `/prescriptions/${prescriptionId}/`)).follow_up_date).toBe("2028-03-16");
    await page.goto(`/prescriptions/${prescriptionId}/edit`);
    await expect(followUp.getByRole("button", { name: "45 days", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByPlaceholder("Follow-up notes...")).toHaveValue("Review progress");
    await page.getByLabel(/^Follow-up Date/).click();
    const calendar = page.getByRole("dialog", { name: "Choose a date", exact: true });
    await expect(calendar.getByRole("combobox").nth(0)).toHaveValue("2");
    await expect(calendar.getByRole("combobox").nth(1)).toHaveValue("2028");
    await calendar.getByRole("button", { name: /March 20/ }).click();
    await expect(followUp.locator('[aria-pressed="true"]')).toHaveCount(0);
    await expect(followUp.locator("time")).toHaveText("20 Mar 2028");
    await page.getByRole("button", { name: "Update Prescription", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/prescriptions/${prescriptionId}$`));
    expect((await api(request, `/prescriptions/${prescriptionId}/`)).follow_up_date).toBe("2028-03-20");
    await page.goto(`/prescriptions/${prescriptionId}/edit`);
    await expect(followUp.locator("time")).toHaveText("20 Mar 2028");
    await expect(followUp.locator('[aria-pressed="true"]')).toHaveCount(0);
    await followUp.getByRole("button", { name: "Clear date", exact: true }).click();
    await expect(followUp.locator("time")).toHaveCount(0);
    await page.getByRole("button", { name: "Update Prescription", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/prescriptions/${prescriptionId}$`));
    const stored = await api(request, `/prescriptions/${prescriptionId}/`);
    expect(stored.follow_up_date).toBe(null);
    expect(stored.follow_up_notes).toBe("Review progress");
  });
});

test("admin and therapist see saved clinical status with their existing permissions", async ({ browser, request }) => {
  const med = await medicine(request, "Role Tablet");
  const records = await savedVisit(request, "Role Patient", [{ medicine: med.id, drug_name: med.name, frequency: "BD" }]);
  for (const role of ["admin", "therapist"]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, role);
    await page.goto(`/prescriptions/${records.rx.id}`);
    await expect(page.getByRole("heading", { name: "Visit completion", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Follow-up status" })).toContainText("Ask the doctor");
    await expect(page.getByRole("region", { name: "Treatment status" })).toContainText("Ask the doctor");
    await expect(page.getByRole("link", { name: "Edit prescription", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Create treatment plan", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "WhatsApp prescription", exact: true })).toHaveCount(role === "admin" ? 1 : 0);
    await expect(page.getByRole("button", { name: "Record dispensing", exact: true })).toBeVisible();
    const denied = await request.patch(`${apiOrigin}/api/v1/prescriptions/${records.rx.id}/`, {
      data: { follow_up_date: "2026-10-17" }, headers: { Authorization: `Bearer ${roles[role].access}` },
    });
    expect(denied.status()).toBe(403);
    await context.close();
  }
  expect((await api(request, `/prescriptions/${records.rx.id}/`)).follow_up_date).toBe(null);
});

test("failed queries do not unlock repeat actions and retry restores real records", async ({ page, request }) => {
  const med = await medicine(request, "Error Tablet");
  const { rx } = await savedVisit(request, "Error Patient", [{ medicine: med.id, drug_name: med.name, frequency: "BD" }]);
  await signIn(page);
  await page.route("**/pharmacy/dispensing/?*", (route) => route.fulfill({ status: 503, json: { detail: "Unavailable" } }));
  await page.route("**/treatments/plans/?*", (route) => route.fulfill({ status: 503, json: { detail: "Unavailable" } }));
  await page.goto(`/prescriptions/${rx.id}`);
  await expect(page.getByRole("region", { name: "Dispensing status" })).toContainText("Could not load dispensing records.");
  await expect(page.getByRole("region", { name: "Treatment status" })).toContainText("Could not load treatment plans.");
  await expect(page.getByRole("button", { name: "Record dispensing", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New Treatment Plan", exact: true })).toHaveCount(0);
  await page.unroute("**/pharmacy/dispensing/?*");
  await page.unroute("**/treatments/plans/?*");
  await page.getByRole("button", { name: "Retry dispensing records", exact: true }).click();
  await page.getByRole("button", { name: "Retry treatment plans", exact: true }).click();
  await expect(page.getByRole("button", { name: "Record dispensing", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create treatment plan", exact: true })).toBeVisible();
  expect((await api(request, `/pharmacy/medicines/${med.id}/`)).current_stock).toBe(10);
});

test("partial dispensing offers only medicines with no recorded dispensing", async ({ page, request }) => {
  const first = await medicine(request, "First Partial Tablet");
  const second = await medicine(request, "Second Partial Tablet");
  const { rx } = await savedVisit(request, "Partial Patient", [first, second].map((med) => ({ medicine: med.id, drug_name: med.name, frequency: "BD" })));
  await api(request, "/pharmacy/dispensing/", { method: "POST", data: {
    prescription_id: rx.id, items: [{ medicine_id: first.id, quantity_dispensed: 2 }],
  } });
  await signIn(page, "therapist");
  await page.goto(`/prescriptions/${rx.id}`);
  await expect(page.getByRole("region", { name: "Dispensing status" })).toContainText("1 clinic medicine has no recorded dispensing.");
  await page.getByRole("button", { name: "Record dispensing", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(second.name);
  await expect(page.getByRole("dialog")).not.toContainText(first.name);
  await page.getByRole("dialog").getByRole("button", { name: /Dispense/ }).click();
  await expect(page.getByRole("region", { name: "Dispensing status" })).toContainText("2 dispensing records saved.");
  expect((await api(request, `/pharmacy/medicines/${first.id}/`)).current_stock).toBe(8);
  expect((await api(request, `/pharmacy/medicines/${second.id}/`)).current_stock).toBe(9);
  await page.getByRole("button", { name: "Record additional dispensing", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(first.name);
  await expect(page.getByRole("dialog")).toContainText(second.name);
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("region", { name: "Dispensing status" })).toContainText("2 dispensing records saved.");
  expect((await api(request, `/pharmacy/dispensing/?prescription=${rx.id}`)).length).toBe(2);
});

test("loading records keeps completion actions unavailable until the reads finish", async ({ page, request }) => {
  const med = await medicine(request, "Loading Tablet");
  const { rx } = await savedVisit(request, "Loading Patient", [{ medicine: med.id, drug_name: med.name, frequency: "BD" }]);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  for (const path of ["**/pharmacy/dispensing/?*", "**/treatments/plans/?*"]) {
    await page.route(path, async (route) => { await gate; await route.continue(); });
  }
  await signIn(page);
  try {
    await page.goto(`/prescriptions/${rx.id}`);
    await expect(page.getByRole("region", { name: "Dispensing status" })).toContainText("Loading dispensing records...");
    await expect(page.getByRole("region", { name: "Treatment status" })).toContainText("Loading treatment plans...");
    await expect(page.getByRole("button", { name: "Record dispensing", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Create treatment plan", exact: true })).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.getByRole("button", { name: "Record dispensing", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create treatment plan", exact: true })).toBeVisible();
  expect((await api(request, `/pharmacy/medicines/${med.id}/`)).current_stock).toBe(10);
});

test("completed treatment shows its stored state when the visit is reopened", async ({ page, request }) => {
  const { person, rx } = await savedVisit(request, "Completed Treatment Patient");
  const plan = await api(request, "/treatments/plans/", { method: "POST", data: {
    prescription: rx.id, total_days: 1,
    block: {
      start_day_number: 1, end_day_number: 1, start_date: "2026-10-11",
      entries: [{ entry_type: "single_day", day_number: 1, procedure_name: "Massage", medium_type: "oil", medium_name: "Fixture oil", instructions: "" }],
    },
  } });
  await api(request, `/treatments/sessions/${plan.blocks[0].sessions[0].id}/feedback/`, {
    role: "therapist", method: "POST", data: { completion_status: "done", response_score: 3, notes: "Complete", review_requested: false },
  });
  await signIn(page);
  await page.goto(`/prescriptions/${rx.id}`);
  await expect(page.getByRole("region", { name: "Treatment status" })).toContainText("1-day plan, completed, 1 block.");
  await expect(page.getByRole("region", { name: "Dispensing status" })).toContainText("No medicines prescribed.");
  await page.reload();
  await expect(page.getByRole("region", { name: "Treatment status" })).toContainText("1-day plan, completed, 1 block.");
  expect((await api(request, `/treatments/plans/?patient_id=${person.id}`)).length).toBe(1);
});

import { test, expect } from "@playwright/test";

const apiOrigin = "http://127.0.0.1:8796";

test("doctor registers, verifies email, onboards an empty clinic, and signs in again", async ({ page, request }, testInfo) => {
  const email = `onboard-${Date.now()}@clinic.test`;
  await page.goto("/signup");
  await page.getByLabel("Doctor's Name").fill("Demo Doctor");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Ayurveda", exact: true }).click();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.getByLabel("Verification code").fill("000000");
  await page.getByRole("button", { name: "Verify & continue" }).click();
  await expect(page.locator("#signup-error")).toContainText("Invalid");
  const fixture = await (await request.get(`${apiOrigin}/__fixture`)).json();
  await page.getByLabel("Verification code").fill(fixture.loginCode);
  await page.getByRole("button", { name: "Verify & continue" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.reload();
  await page.getByLabel(/^Clinic Name/).fill("Today's Doctor Clinic");
  await page.getByLabel("Phone Number").fill("9876543210");
  await page.getByPlaceholder("Address line 1", { exact: true }).fill("1 Test Street");
  await page.getByPlaceholder("City", { exact: true }).fill("Chennai");
  await page.getByPlaceholder("PIN code", { exact: true }).fill("600001");
  await page.getByLabel(/Doctor Registration Number/).fill("TEST-REG-001");
  await page.getByRole("button", { name: "Complete setup", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Today's Doctor Clinic", exact: true })).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem("access_token"));
  const headers = { Authorization: `Bearer ${token}` };
  const me = await (await request.get(`${apiOrigin}/api/v1/auth/me/`, { headers })).json();
  expect(me.email).toBe(email);
  expect(me.email_verified_at).toBeTruthy();
  expect(me.is_clinic_owner).toBe(true);
  expect(me.clinic.discipline).toBe("ayurveda");
  expect(me.clinic.registration_number).toBe("TEST-REG-001");
  const patients = await (await request.get(`${apiOrigin}/api/v1/patients/`, { headers })).json();
  expect(patients.count).toBe(0);
  await page.screenshot({ path: testInfo.outputPath("new-doctor-clinic.png"), fullPage: true });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: /Send.*code/i }).click();
  await expect(page.getByLabel(/Verification code/i)).toBeVisible();
  const login = await (await request.get(`${apiOrigin}/__fixture`)).json();
  await page.getByLabel(/Verification code/i).fill(login.loginCode);
  await page.getByRole("button", { name: /Verify/i }).click();
  await expect(page.getByRole("heading", { name: "Today's Doctor Clinic", exact: true })).toBeVisible();
});

test("owner saves preprinted letterhead and prints A4 and A5 without the clinic header", async ({ page, request }, testInfo) => {
  const { roles } = await (await request.get(`${apiOrigin}/__fixture`)).json();
  const headers = { Authorization: `Bearer ${roles.doctor.access}` };
  async function api(path, method = "GET", data) {
    const response = await request.fetch(`${apiOrigin}/api/v1${path}`, { method, data, headers });
    const result = await response.json();
    expect(response.ok(), JSON.stringify(result)).toBe(true);
    return result;
  }
  const before = (await api("/auth/me/")).clinic;
  const patient = await api("/patients/", "POST", { name: "Letterhead Test Patient", age: 30, gender: "female", phone: "9876543210" });
  const visit = await api("/consultations/", "POST", { patient: patient.id, consultation_date: "2026-10-11", diagnosis: "Joint pain" });
  const rx = await api("/prescriptions/", "POST", { consultation: visit.id, medications: [{ drug_name: "Test medicine", dosage: "1 tablet", frequency: "BD", duration: "7 days" }], diet_advice_ta: "கீரை" });
  await page.addInitScript(({ access, refresh }) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    window.__printCount = 0;
    window.print = () => { window.__printCount += 1; };
  }, roles.doctor);
  try {
    await page.goto("/settings");
    await page.getByRole("tab", { name: "Clinic", exact: true }).click();
    await page.getByLabel(/^Prescription letterhead/).selectOption("preprinted");
    await expect(page.getByLabel(/^Top margin/)).toHaveValue("52");
    await page.getByLabel(/^Top margin/).fill("55");
    await page.getByLabel(/^Bottom margin/).fill("20");
    await page.getByRole("button", { name: "Save clinic settings", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("tab", { name: "Clinic", exact: true }).click();
    await expect(page.getByLabel(/^Prescription letterhead/)).toHaveValue("preprinted");
    const saved = (await api("/auth/me/")).clinic;
    expect(saved.letterhead_mode).toBe("preprinted");
    expect(saved.top_margin_mm).toBe(55);
    expect(saved.bottom_margin_mm).toBe(20);
    for (const size of ["A4", "A5"]) {
      await api("/auth/clinic/update/", "PATCH", { paper_size: size });
      await page.goto(`/prescriptions/${rx.id}/print`);
      await expect(page.getByText("Letterhead Test Patient", { exact: true })).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.__printCount)).toBe(1);
      await page.emulateMedia({ media: "print" });
      await expect(page.getByRole("heading", { name: before.name, exact: true })).toBeHidden();
      await expect(page.getByText("Test medicine", { exact: true })).toBeVisible();
      await expect(page.locator(".print-prescription")).toContainText("கீரை");
      const css = await page.locator(".print-prescription style").textContent();
      expect(css).toContain(`size: ${size} portrait`);
      expect(css).toContain("margin: 55mm 12mm 20mm 12mm");
      await page.pdf({ path: testInfo.outputPath(`preprinted-${size}.pdf`), preferCSSPageSize: true, printBackground: true });
      await page.screenshot({ path: testInfo.outputPath(`preprinted-${size}.png`), fullPage: true });
      await page.emulateMedia({ media: "screen" });
      await page.getByRole("button", { name: "Print", exact: true }).click();
      expect(await page.evaluate(() => window.__printCount)).toBe(2);
    }
    await api("/auth/clinic/update/", "PATCH", { letterhead_mode: "digital", top_margin_mm: 15, bottom_margin_mm: 15 });
    await page.goto(`/prescriptions/${rx.id}/print`);
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("heading", { name: before.name, exact: true })).toBeVisible();
    for (const data of [{ top_margin_mm: 101 }, { bottom_margin_mm: 4 }, { letterhead_mode: "off" }]) {
      const response = await request.patch(`${apiOrigin}/api/v1/auth/clinic/update/`, { headers, data });
      expect(response.status()).toBe(400);
    }
    const denied = await request.patch(`${apiOrigin}/api/v1/auth/clinic/update/`, {
      headers: { Authorization: `Bearer ${roles.admin.access}` }, data: { letterhead_mode: "preprinted" },
    });
    expect(denied.status()).toBe(403);
  } finally {
    await api("/auth/clinic/update/", "PATCH", {
      letterhead_mode: before.letterhead_mode, paper_size: before.paper_size,
      top_margin_mm: before.top_margin_mm, bottom_margin_mm: before.bottom_margin_mm,
    });
  }
});

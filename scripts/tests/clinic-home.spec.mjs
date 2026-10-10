import { test, expect } from "@playwright/test";
const origin = "http://127.0.0.1:8796";

test("home links to the four areas and patient search covers records beyond the first page", async ({ page, request }) => {
  const { roles } = await (await request.get(`${origin}/__fixture`)).json();
  const headers = { Authorization: `Bearer ${roles.doctor.access}` };
  let first;
  for (let i = 0; i < 22; i++) {
    const response = await request.post(`${origin}/api/v1/patients/`, { headers, data: { name: `Search coverage ${i}`, age: 30, gender: "female", phone: "9876543210" } });
    expect(response.ok(), await response.text()).toBe(true);
    if (i === 0) first = await response.json();
  }
  await page.addInitScript(tokens => { localStorage.setItem("access_token", tokens.access); localStorage.setItem("refresh_token", tokens.refresh); localStorage.setItem("clinic_slug", "completion-test"); }, roles.doctor);
  await page.goto("/dashboard");
  for (const name of ["Patients", "Visits", "Medicines", "Therapies"]) await expect(page.getByRole("heading", {name, exact:true})).toBeVisible();
  await page.getByRole("link", { name: "Start visit", exact: true }).click();
  await page.getByRole("textbox", { name: "Find a patient", exact: true }).fill("Search coverage 0");
  await expect(page.getByRole("link", { name: "Search coverage 0", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Start visit", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/patients/${first.id}/consultations/new$`));
  await expect(page.getByRole("button", { name: "Save & Write Rx", exact: true })).toBeVisible();
});

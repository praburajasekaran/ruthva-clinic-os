import { test, expect } from "@playwright/test";

const apiOrigin = "http://127.0.0.1:8796";
let roles;

test.beforeAll(async ({ request }) => {
  roles = (await (await request.get(`${apiOrigin}/__fixture`)).json()).roles;
});

async function profile(request, role, method = "GET", data) {
  return request.fetch(`${apiOrigin}/api/v1/auth/me/${method === "PATCH" ? "update/" : ""}`, {
    method, data, headers: { Authorization: `Bearer ${roles[role].access}` },
  });
}

async function signIn(page, role = "doctor") {
  await page.addInitScript(({ access, refresh }) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    localStorage.setItem("clinic_slug", "completion-test");
  }, roles[role]);
}

test("qualifications save, refresh the sidebar, persist, and clear", async ({ page, request }, testInfo) => {
  expect((await profile(request, "doctor", "PATCH", { qualifications: "" })).ok()).toBe(true);
  await signIn(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Add qualifications", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  const field = page.getByLabel(/^Qualifications/);
  await expect(field).toHaveValue("");
  await field.fill("BSMS, MD (S)");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("complementary")).toContainText("BSMS, MD (S)");
  await expect(page.getByRole("complementary").getByText("doctor", { exact: true })).toHaveCount(0);
  const saved = await (await profile(request, "doctor")).json();
  expect(saved.qualifications).toBe("BSMS, MD (S)");
  expect(saved.role).toBe("doctor");
  await page.reload();
  await expect(field).toHaveValue("BSMS, MD (S)");
  await expect(page.getByRole("complementary")).toContainText("BSMS, MD (S)");
  await page.screenshot({ path: testInfo.outputPath("qualifications-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("dialog")).toContainText("BSMS, MD (S)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("qualifications-mobile.png") });
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  await field.fill("");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 1100 });
  await expect(page.getByRole("link", { name: "Add qualifications", exact: true })).toBeVisible();
  expect((await (await profile(request, "doctor")).json()).qualifications).toBe("");
});

test("profile API validates qualifications and updates only the signed-in user", async ({ request }) => {
  expect((await profile(request, "doctor", "PATCH", { qualifications: "BAMS" })).ok()).toBe(true);
  for (const value of ["A".repeat(151), null, 42]) {
    expect((await profile(request, "doctor", "PATCH", { qualifications: value })).status()).toBe(400);
    expect((await (await profile(request, "doctor")).json()).qualifications).toBe("BAMS");
  }
  const other = await (await profile(request, "admin")).json();
  expect((await profile(request, "doctor", "PATCH", {
    id: other.id, role: "admin", qualifications: " BSMS, MD (S) ",
  })).ok()).toBe(true);
  const doctor = await (await profile(request, "doctor")).json();
  expect(doctor.qualifications).toBe("BSMS, MD (S)");
  expect(doctor.role).toBe("doctor");
  expect((await (await profile(request, "admin")).json()).qualifications).toBe(other.qualifications);
  const denied = await request.patch(`${apiOrigin}/api/v1/auth/me/update/`, { data: { qualifications: "BAMS" } });
  expect(denied.status()).toBe(401);
});

for (const role of ["admin", "therapist"]) {
  test(`${role} keeps their sidebar role label`, async ({ page }) => {
    await signIn(page, role);
    await page.goto("/settings");
    await expect(page.getByRole("complementary").getByText(role, { exact: true }).last()).toBeVisible();
    await expect(page.getByLabel(/^Qualifications/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Add qualifications", exact: true })).toHaveCount(0);
  });
}

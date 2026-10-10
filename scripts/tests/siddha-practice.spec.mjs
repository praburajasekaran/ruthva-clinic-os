import { test, expect } from "@playwright/test";

const apiOrigin = "http://127.0.0.1:8796";
test.use({ reducedMotion: "reduce" });

test("Siddha homepage and signup describe the enabled practice on desktop and mobile", async ({ page }, testInfo) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your Siddha practice, in one place.");
    await expect(page.getByText("Envagai Thervu Assessments", { exact: true })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/AYUSH|Ayurveda|Homeopathy|Unani|Multi-Discipline/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`siddha-homepage-${width}.png`), fullPage: true });
  }
  await page.getByRole("link", { name: "Register Your Clinic", exact: true }).click();
  await expect(page.getByText("Create your Siddha clinic account")).toBeVisible();
  await expect(page.getByText("Siddha practice", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ayurveda|Homeopathy/ })).toHaveCount(0);
});

test("Siddha signup and onboarding submit Siddha even with a stale practice selection", async ({ page, request }) => {
  await page.goto("/signup");
  await page.getByPlaceholder("First name", { exact: true }).fill("Siddha Doctor");
  await page.getByLabel("Email", { exact: true }).fill("siddha-browser@clinic.test");
  const initiated = page.waitForRequest((req) => req.url().endsWith("/auth/initiate-signup/") && req.method() === "POST");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  expect((await initiated).postDataJSON().discipline).toBe("siddha");
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  const fixture = await (await request.get(`${apiOrigin}/__fixture`)).json();
  await page.getByLabel("Verification code", { exact: true }).fill(fixture.signupCode);
  await page.getByRole("button", { name: "Verify & continue", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.evaluate(() => sessionStorage.setItem("signup_discipline", "homeopathy"));
  await page.getByLabel("Clinic Name").fill("Siddha Browser Clinic");
  await page.getByPlaceholder("Address line 1", { exact: true }).fill("10 Clinic Road");
  await page.getByPlaceholder("City", { exact: true }).fill("Chennai");
  await page.getByPlaceholder("PIN code", { exact: true }).fill("600001");
  await page.getByLabel("Doctor Registration Number").fill("SID-001");
  const completed = page.waitForResponse((res) => res.url().endsWith("/auth/complete-onboarding/") && res.request().method() === "POST");
  await page.getByRole("button", { name: "Complete setup", exact: true }).click();
  const response = await completed;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON().discipline).toBe("siddha");
  expect((await response.json()).clinic.discipline).toBe("siddha");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("Siddha demo opens without a selector for paused practices", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Try Demo", exact: true }).click();
  await page.getByLabel("Verification code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: /Verify/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("complementary").getByText("Siddha demo", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Demo discipline" })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("clinic_slug"))).toBe("demo-siddha");
});

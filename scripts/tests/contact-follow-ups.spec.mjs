import { test, expect } from "@playwright/test";

const origin = "http://127.0.0.1:8796";

test("a doctor plans a call and an assistant retries, asks a question and completes contact after a doctor reply", async ({
  browser,
  request,
}) => {
  const { roles } = await (await request.get(`${origin}/__fixture`)).json();
  const headers = { Authorization: `Bearer ${roles.doctor.access}` };
  async function save(path, data) {
    const response = await request.post(`${origin}/api/v1${path}`, {
      headers,
      data,
    });
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  }
  async function signedPage(role) {
    const context = await browser.newContext();
    await context.addInitScript((tokens) => {
      localStorage.setItem("access_token", tokens.access);
      localStorage.setItem("refresh_token", tokens.refresh);
      localStorage.setItem("clinic_slug", "completion-test");
    }, roles[role]);
    return { context, page: await context.newPage() };
  }
  const person = await save("/patients/", {
    name: "Contact Patient",
    age: 40,
    gender: "male",
    phone: "9876543210",
  });
  const visit = await save("/consultations/", {
    patient: person.id,
    consultation_date: "2026-10-10",
  });
  const rx = await save("/prescriptions/", {
    consultation: visit.id,
    follow_up_date: "2026-11-01",
  });
  const doctor = await signedPage("doctor"),
    assistant = await signedPage("admin");
  const nextDate = new Date(Date.now() + 86400000 * 2)
    .toISOString()
    .slice(0, 10);
  try {
    await doctor.page.goto(`/prescriptions/${rx.id}`);
    await doctor.page
      .getByRole("link", { name: "Plan a patient call", exact: true })
      .click();
    await doctor.page
      .getByRole("textbox", { name: "Reason for contacting", exact: true })
      .fill("Check whether the patient can return on the recorded date.");
    await doctor.page
      .getByRole("radio", { name: "admin · Admin staff", exact: true })
      .click();
    await doctor.page
      .getByRole("button", { name: "Save follow-up", exact: true })
      .click();
    await expect(doctor.page).toHaveURL(/\/follow-ups\/contact\/\d+$/);
    const taskPath = new URL(doctor.page.url()).pathname;
    const counts = await (
      await request.get(`${origin}/api/v1/contact-follow-ups/counts/`, {
        headers,
      })
    ).json();
    const clinical = await (
      await request.get(`${origin}/api/v1/dashboard/follow-ups/?tab=all`, {
        headers,
      })
    ).json();
    const pending =
      counts.open + counts.awaiting_doctor + clinical.meta.counts.total;
    await expect(
      doctor.page.getByRole("link", {
        name: `Follow-ups ${pending} follow-ups pending`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      doctor.page.getByRole("heading", {
        name: "Follow up with Contact Patient",
        exact: true,
      }),
    ).toBeVisible();
    await assistant.page.goto(taskPath);
    await assistant.page
      .getByRole("radio", { name: "No answer", exact: true })
      .click();
    await assistant.page
      .getByRole("textbox", { name: "Call notes", exact: true })
      .fill("No answer on the first attempt.");
    await assistant.page
      .getByLabel("Next contact date", { exact: true })
      .fill(nextDate);
    await assistant.page
      .getByRole("button", { name: "Save contact", exact: true })
      .click();
    await expect(
      assistant.page.getByText(`Contact on ${nextDate} · admin`, {
        exact: true,
      }),
    ).toBeVisible();
    await assistant.page.reload();
    await expect(
      assistant.page.getByText("No answer on the first attempt.", {
        exact: true,
      }),
    ).toBeVisible();
    await assistant.page
      .getByRole("radio", { name: "Ask doctor", exact: true })
      .click();
    await assistant.page
      .getByRole("textbox", { name: "Question for doctor", exact: true })
      .fill("The patient asks whether to bring the previous reports.");
    await assistant.page
      .getByRole("button", { name: "Save contact", exact: true })
      .click();
    await expect(
      assistant.page.getByText("Waiting for a doctor’s reply.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      assistant.page.getByRole("button", {
        name: "Save doctor reply",
        exact: true,
      }),
    ).toHaveCount(0);
    await doctor.page.reload();
    await doctor.page
      .getByRole("textbox", { name: "Doctor reply", exact: true })
      .fill("Bring the previous reports to the scheduled review.");
    await doctor.page
      .getByRole("button", { name: "Save doctor reply", exact: true })
      .click();
    await expect(
      doctor.page.getByText("Ready for contact.", { exact: true }),
    ).toBeVisible();
    await assistant.page.reload();
    await expect(
      assistant.page.getByText(
        "Bring the previous reports to the scheduled review.",
        { exact: true },
      ),
    ).toBeVisible();
    await assistant.page
      .getByRole("textbox", { name: "Call notes", exact: true })
      .fill("The patient received the reply.");
    await assistant.page
      .getByRole("button", { name: "Save contact", exact: true })
      .click();
    await expect(
      assistant.page.getByText(
        "Contact completed. Clinical follow-up stays on the patient record.",
        { exact: true },
      ),
    ).toBeVisible();
    await assistant.page.reload();
    await expect(
      assistant.page.getByText("The patient received the reply.", {
        exact: true,
      }),
    ).toBeVisible();
    await assistant.page.setViewportSize({ width: 390, height: 844 });
    expect(
      await assistant.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const stored = await (
      await request.get(`${origin}/api/v1/prescriptions/${rx.id}/`, { headers })
    ).json();
    expect(stored.follow_up_date).toBe("2026-11-01");
    const task = await (
      await request.get(
        `${origin}/api/v1${taskPath.replace("/follow-ups/contact/", "/contact-follow-ups/")}/`,
        { headers },
      )
    ).json();
    expect(task.status).toBe("completed");
    expect(task.events.map((event) => event.action)).toEqual([
      "reached",
      "doctor_reply",
      "question",
      "no_answer",
    ]);
  } finally {
    await doctor.context.close();
    await assistant.context.close();
  }
});

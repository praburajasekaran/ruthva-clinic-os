import { Hono } from "hono";
import { launch } from "@cloudflare/playwright";
import QRCode from "qrcode";
import { prescriptionHtml, base64 } from "./pdf";
import {
  all,
  check,
  clinicOf,
  dbOf,
  flag,
  get,
  insert,
  now,
  num,
  one,
  output,
  owner,
  record,
  stmt,
  str,
  update,
} from "./data";
import type { App, Ctx, Env, Row } from "./data";
import { constantEqual, escape, throttle } from "./auth";
import { sendEmail } from "./email";
import { addDays } from "./treatments";

export const resources = new Hono<App>();
async function image(file: unknown, max: number) {
  check(
    file instanceof File && file.size > 0 && file.size <= max,
    `Provide an image under ${max / 1048576} MB.`,
  );
  const bytes = await file.arrayBuffer(),
    view = new Uint8Array(bytes),
    starts = (prefix: number[]) => prefix.every((b, i) => view[i] === b);
  const mime = starts([137, 80, 78, 71, 13, 10, 26, 10])
    ? "image/png"
    : starts([255, 216, 255])
      ? "image/jpeg"
      : starts([71, 73, 70, 56])
        ? "image/gif"
        : starts([82, 73, 70, 70]) &&
            new TextDecoder().decode(view.subarray(8, 12)) === "WEBP"
          ? "image/webp"
          : "";
  check(mime && mime === file.type, "Invalid image content.");
  return { bytes, mime };
}
resources.post("/auth/clinic/logo/upload/", async (c) => {
  owner(c);
  const form = await c.req.formData(),
    data = await image(form.get("logo"), 2 * 1048576);
  check(
    ["image/png", "image/jpeg"].includes(data.mime),
    "Only PNG and JPEG logos are allowed.",
  );
  const key = `logos/${clinicOf(c)}/${crypto.randomUUID()}.${data.mime === "image/png" ? "png" : "jpg"}`,
    url = `${new URL(c.req.url).origin}/api/v1/media/${key}`,
    old = str(c.get("clinic"), "logo_url");
  await c.env.UPLOADS.put(key, data.bytes, {
    httpMetadata: { contentType: data.mime },
  });
  try {
    await update(dbOf(c), "clinics_clinic", clinicOf(c), {
      logo_url: url,
    }).run();
  } catch (error) {
    await c.env.UPLOADS.delete(key);
    throw error;
  }
  if (
    old.startsWith(
      `${new URL(c.req.url).origin}/api/v1/media/logos/${clinicOf(c)}/`,
    )
  )
    await c.env.UPLOADS.delete(
      new URL(old).pathname.slice("/api/v1/media/".length),
    ).catch(() => undefined);
  return c.json({ logo_url: url });
});
resources.delete("/auth/clinic/logo/", async (c) => {
  owner(c);
  const old = str(c.get("clinic"), "logo_url");
  await update(dbOf(c), "clinics_clinic", clinicOf(c), { logo_url: "" }).run();
  if (
    old.startsWith(
      `${new URL(c.req.url).origin}/api/v1/media/logos/${clinicOf(c)}/`,
    )
  )
    await c.env.UPLOADS.delete(
      new URL(old).pathname.slice("/api/v1/media/".length),
    ).catch(() => undefined);
  return c.body(null, 204);
});
resources.get("/media/*", async (c) => {
  const key = c.req.path.slice("/api/v1/media/".length);
  check(
    /^(logos|feedback)\/\d+\/[a-f0-9-]+\.(png|jpg|gif|webp)$/.test(key),
    "Not found.",
    404,
  );
  if (key.startsWith("feedback/"))
    check(key.split("/")[1] === String(clinicOf(c)), "Not found.", 404);
  const object = await c.env.UPLOADS.get(key);
  check(object, "Not found.", 404);
  const headers = new Headers({
    "Content-Type":
      object.httpMetadata?.contentType || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    ETag: object.httpEtag,
  });
  return new Response(object.body, { headers });
});
resources.post("/feedback/", async (c) => {
  await throttle(c, `feedback:${c.get("user").id}`, 20);
  const form = await c.req.formData(),
    title = String(form.get("title") || ""),
    category = String(form.get("category") || "");
  check(
    title.trim() &&
      title.length <= 256 &&
      ["bug", "feature"].includes(category),
    "Provide a title and feedback category.",
  );
  let screenshot = "";
  if (form.get("screenshot")) {
    const data = await image(form.get("screenshot"), 5 * 1048576),
      key = `feedback/${clinicOf(c)}/${crypto.randomUUID()}.${data.mime.split("/")[1].replace("jpeg", "jpg")}`;
    await c.env.UPLOADS.put(key, data.bytes, {
      httpMetadata: { contentType: data.mime },
    });
    screenshot = `${new URL(c.req.url).origin}/api/v1/media/${key}`;
  }
  const created = insert(dbOf(c), "feedback_feedback", {
    clinic_id: clinicOf(c),
    user_id: c.get("user").id,
    category,
    title,
    description: String(form.get("description") || ""),
    screenshot_url: screenshot,
    page_url: String(form.get("page_url") || ""),
    user_role: c.get("user").role,
    browser_info: String(form.get("browser_info") || ""),
    status: "failed",
  });
  await created.statement.run();
  if (
    c.env.GITHUB_TOKEN &&
    c.env.GITHUB_FEEDBACK_REPO &&
    /^[\w.-]+\/[\w.-]+$/.test(c.env.GITHUB_FEEDBACK_REPO)
  ) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${c.env.GITHUB_FEEDBACK_REPO}/issues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${c.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "Ruthva-Clinic",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            body: `${str(created.row, "description")}\n\nPage ${str(created.row, "page_url")}\n\nSubmitted by ${str(c.get("user"), "email")}${screenshot ? `\n\nPrivate screenshot ${screenshot}` : ""}`,
            labels: [category === "bug" ? "bug" : "enhancement"],
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (response.ok) {
        const data = record(await response.json());
        await update(dbOf(c), "feedback_feedback", created.row.id, {
          status: "synced",
          github_issue_url: data.html_url,
          github_issue_number: data.number,
        }).run();
        created.row.status = "synced";
      }
    } catch {
      console.warn("Feedback issue sync failed", {
        feedbackId: created.row.id,
      });
    }
  }
  return c.json({ id: created.row.id, status: created.row.status }, 201);
});
resources.get("/prescriptions/:pk/pdf/", async (c) => {
  const rx = await get(
      dbOf(c),
      "prescriptions_prescription",
      c.req.param("pk"),
      clinicOf(c),
    ),
    consultation = await get(
      dbOf(c),
      "consultations_consultation",
      rx.consultation_id,
      clinicOf(c),
    ),
    patient = await get(
      dbOf(c),
      "patients_patient",
      consultation.patient_id,
      clinicOf(c),
    ),
    physician = consultation.conducted_by_id
      ? await get(dbOf(c), "users_user", consultation.conducted_by_id)
      : c.get("user");
  const meds = await all(
      dbOf(c),
      "SELECT * FROM prescriptions_medication WHERE prescription_id=? ORDER BY sort_order,id",
      [rx.id],
    ),
    procs = await all(
      dbOf(c),
      "SELECT * FROM prescriptions_procedureentry WHERE prescription_id=? ORDER BY id",
      [rx.id],
    );
  let logo = "";
  const logoUrl = str(c.get("clinic"), "logo_url");
  if (
    logoUrl.startsWith(
      `${new URL(c.req.url).origin}/api/v1/media/logos/${clinicOf(c)}/`,
    )
  ) {
    const object = await c.env.UPLOADS.get(
      new URL(logoUrl).pathname.slice("/api/v1/media/".length),
    );
    if (object)
      logo = `data:${object.httpMetadata?.contentType || "image/png"};base64,${base64(await object.arrayBuffer())}`;
  }
  const reviewUrl = str(c.get("clinic"), "google_review_url");
  const qr = reviewUrl.startsWith("https://")
    ? await QRCode.toDataURL(reviewUrl, { width: 200, margin: 1 })
    : "";
  check(c.env.BROWSER, "Browser rendering is not configured.", 503);
  const browser = await launch(c.env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.route("**/*", (route) =>
      route.request().url().startsWith("data:") ||
      route.request().url() === "about:blank"
        ? route.continue()
        : route.abort(),
    );
    await page.setContent(
      prescriptionHtml(
        c.get("clinic"),
        physician,
        patient,
        consultation,
        rx,
        meds,
        procs,
        logo,
        qr,
      ),
      { waitUntil: "load" },
    );
    await page.evaluate("document.fonts.ready.then(() => undefined)");
    const pdf = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
    });
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="prescription-${rx.id}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
});

export async function reminders(env: Env, enqueue = true) {
  const db = env.DB.withSession("first-primary"),
    target = addDays(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
      1,
    );
  if (enqueue)
    await stmt(
      db,
      `INSERT OR IGNORE INTO email_outbox(key,payload,status,attempts,lease_until)
      SELECT type || ':' || object_id || ':' || follow_up_date,
        json_object('type',type,'object_id',object_id,'follow_up_date',follow_up_date,'email',email,'name',name,'clinic_name',clinic_name),'pending',0,NULL
      FROM (
        SELECT 'prescription' type,r.id object_id,r.follow_up_date,p.email,p.name,c.name clinic_name
        FROM prescriptions_prescription r JOIN consultations_consultation v ON v.id=r.consultation_id
        JOIN patients_patient p ON p.id=v.patient_id JOIN clinics_clinic c ON c.id=r.clinic_id
        WHERE r.follow_up_date=? AND p.email<>'' AND c.is_active=1 AND c.is_demo=0
        UNION ALL
        SELECT 'procedure',e.id,e.follow_up_date,p.email,p.name,c.name
        FROM prescriptions_procedureentry e JOIN prescriptions_prescription r ON r.id=e.prescription_id
        JOIN consultations_consultation v ON v.id=r.consultation_id JOIN patients_patient p ON p.id=v.patient_id
        JOIN clinics_clinic c ON c.id=r.clinic_id
        WHERE e.follow_up_date=? AND p.email<>'' AND c.is_active=1 AND c.is_demo=0
      ) candidate
      WHERE NOT EXISTS(SELECT 1 FROM reminders_sentreminder sent WHERE sent.reminder_type=candidate.type AND sent.object_id=candidate.object_id AND sent.follow_up_date=candidate.follow_up_date)`,
      [target, target],
    ).run();
  const pending = await all(
    db,
    "SELECT key FROM email_outbox WHERE status<>'sent' AND attempts<5 AND (lease_until IS NULL OR lease_until<?) LIMIT 100",
    [now()],
  );
  let sent = 0,
    failed = 0;
  for (const candidate of pending) {
    const claimed = await stmt(
      db,
      "UPDATE email_outbox SET status='sending',attempts=attempts+1,lease_until=? WHERE key=? AND attempts<5 AND status<>'sent' AND (lease_until IS NULL OR lease_until<?) RETURNING *",
      [new Date(Date.now() + 300000).toISOString(), candidate.key, now()],
    ).first<Row>();
    if (!claimed) continue;
    const item = record(JSON.parse(str(claimed, "payload")));
    try {
      const result = await sendEmail(
        env,
        str(item, "email"),
        `Follow-up reminder from ${str(item, "clinic_name")}`,
        `<p>Hello ${escape(item.name)},</p><p>Your follow-up at ${escape(item.clinic_name)} is on ${escape(item.follow_up_date)}.</p>`,
      );
      const audit = insert(db, "reminders_sentreminder", {
        reminder_type: item.type,
        object_id: item.object_id,
        follow_up_date: item.follow_up_date,
        patient_email: item.email,
        resend_email_id: result.messageId,
        sent_at: now(),
      });
      await db.batch([
        stmt(
          db,
          "UPDATE email_outbox SET status='sent',lease_until=NULL WHERE key=?",
          [candidate.key],
        ),
        stmt(
          db,
          "INSERT OR IGNORE INTO reminders_sentreminder(id,reminder_type,object_id,follow_up_date,patient_email,sent_at,resend_email_id) VALUES(?,?,?,?,?,?,?)",
          [
            audit.row.id,
            item.type,
            item.object_id,
            item.follow_up_date,
            item.email,
            audit.row.sent_at,
            audit.row.resend_email_id,
          ],
        ),
      ]);
      sent++;
    } catch {
      await stmt(
        db,
        "UPDATE email_outbox SET status='pending',lease_until=NULL WHERE key=?",
        [candidate.key],
      ).run();
      failed++;
    }
  }
  await stmt(db, "DELETE FROM api_rate_limit WHERE bucket<?", [
    Math.floor(Date.now() / 3600000) - 48,
  ]).run();
  return { status: "ok", sent, failed };
}
export async function cron(c: Ctx) {
  const secret =
    c.req.header("X-Cron-Secret") ||
    c.req.header("Authorization")?.replace(/^Bearer /, "") ||
    "";
  check(
    c.env.CRON_SECRET && constantEqual(secret, c.env.CRON_SECRET),
    "Unauthorized.",
    401,
  );
  return c.json(await reminders(c.env));
}

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

const bindings = {
  JWT_SECRET: "local-feedback-test-auth-secret-at-least-32-characters",
  FRONTEND_URL: "https://clinic.test",
  CORS_ALLOWED_ORIGINS: "https://clinic.test",
  DEFAULT_FROM_EMAIL: "noreply@clinic.test",
  AWS_SES_REGION: "us-east-1",
  AWS_ACCESS_KEY_ID: "AKIDEXAMPLE",
  AWS_SECRET_ACCESS_KEY: "local-feedback-test-ses-secret",
  RUTHVA_ADMIN_EMAIL: "platform-admin@clinic.test",
};
let mf, db, staff, other, admin;
const signupCodes = new Map();
const request = async (path, init = {}) => {
  const outgoing = new Request(`https://clinic.test${path}`, init);
  const response = await mf.dispatchFetch(outgoing.url, {
    method: outgoing.method,
    headers: outgoing.headers,
    body:
      init.body === undefined
        ? undefined
        : new Uint8Array(await outgoing.arrayBuffer()),
  });
  return { response, data: await response.json() };
};
before(async () => {
  const modules = (await readdir("dist"))
    .filter((name) => name.endsWith(".js") || name.endsWith(".ttf"))
    .map((name) => ({
      type: name.endsWith(".js") ? "ESModule" : "Data",
      path: resolve("dist", name),
    }));
  modules.sort((a, b) =>
    a.type === b.type ? 0 : a.type === "ESModule" ? -1 : 1,
  );
  const options = {
    name: "feedback-api",
    modules,
    modulesRoot: resolve("dist"),
    compatibilityDate: "2026-10-03",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: { DB: "feedback-test" },
    r2Buckets: ["UPLOADS"],
    bindings,
    outboundService: async (request) => {
      assert.equal(
        new URL(request.url).hostname,
        "email.us-east-1.amazonaws.com",
      );
      const body = await request.json();
      signupCodes.set(
        body.Destination.ToAddresses[0],
        body.Content.Simple.Body.Html.Data.match(
          /<strong>(\d{6})<\/strong>/,
        )?.[1],
      );
      return Response.json({ MessageId: "feedback-test-signup" });
    },
  };
  mf = new Miniflare(convertV4MiniflareOptions({ workers: [options] }));
  db = await mf.getD1Database("DB");
  for (const name of (await readdir("migrations")).sort()) {
    const sql = await readFile(`migrations/${name}`, "utf8");
    for (const statement of sql.match(
      /CREATE TRIGGER[\s\S]*?END;|(?:CREATE (?!TRIGGER)|ALTER TABLE )[\s\S]*?;/g,
    ) || [])
      await db.prepare(statement).run();
  }
  const signup = async (name) => {
    const email = `${name}@clinic.test`;
    const pending = await request("/api/v1/auth/initiate-signup/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        first_name: "Sample",
        last_name: "Doctor",
        discipline: "siddha",
      }),
    });
    assert.equal(pending.response.status, 201);
    const created = await request("/api/v1/auth/signup/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: signupCodes.get(email),
        clinic_name: `${name} Clinic`,
        subdomain: name,
        discipline: "siddha",
        username: name,
        email,
        first_name: "Sample",
        last_name: "Doctor",
        password: "ClinicTestPass123",
      }),
    });
    assert.equal(created.response.status, 201, JSON.stringify(created.data));
    return created.data;
  };
  staff = await signup("feedback-staff");
  other = await signup("feedback-other");
  admin = await signup("platform-admin");
  await db
    .prepare(
      "UPDATE users_user SET clinic_id=NULL WHERE email='platform-admin@clinic.test'",
    )
    .run();
  const login = await request("/api/v1/auth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "platform-admin",
      password: "ClinicTestPass123",
    }),
  });
  assert.equal(login.response.status, 200);
  admin = login.data;
});

after(async () => mf?.dispose());

const headers = (account) => ({ Authorization: `Bearer ${account.access}` });
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nmXkAAAAASUVORK5CYII=",
  "base64",
);
let bugId;
const submit = (account, category, title, screenshot) => {
  const form = new FormData();
  form.set("category", category);
  form.set("title", title);
  form.set("description", "The clinic needs help with this request.");
  form.set("page_url", "https://clinic.test/patients");
  if (screenshot) form.set("screenshot", screenshot);
  return request("/api/v1/feedback/", {
    method: "POST",
    headers: headers(account),
    body: form,
  });
};

test("native feedback appears in the platform admin inbox with its private screenshot", async () => {
  const saved = await submit(
    staff,
    "bug",
    "Upload screen is unclear",
    new File([png], "screen.png", { type: "image/png" }),
  );
  assert.equal(saved.response.status, 201);
  bugId = saved.data.id;
  const feature = await submit(other, "feature", "Remember 100% zoom");
  assert.equal(feature.response.status, 201);
  const list = await request("/api/v1/admin/feedback/", {
    headers: headers(admin),
  });
  assert.equal(list.response.status, 200);
  assert.equal(list.response.headers.get("Cache-Control"), "no-store");
  assert.equal(list.data.count, 2);
  assert.deepEqual(
    list.data.results.map((row) => row.title),
    ["Remember 100% zoom", "Upload screen is unclear"],
  );
  const bug = list.data.results[1];
  assert.equal(bug.id, bugId);
  assert.equal(bug.category, "bug");
  assert.equal(bug.description, "The clinic needs help with this request.");
  assert.deepEqual(bug.clinic, {
    id: staff.clinic.id,
    name: "feedback-staff Clinic",
  });
  assert.deepEqual(bug.submitter, {
    name: "Sample Doctor",
    email: "feedback-staff@clinic.test",
  });
  assert.equal(bug.screenshot_available, true);
  assert.equal(bug.page_url, "https://clinic.test/patients");
  assert.equal(list.data.results[0].screenshot_available, false);
  const shot = await mf.dispatchFetch(
    `https://clinic.test/api/v1/admin/feedback/${bugId}/screenshot/`,
    { headers: headers(admin) },
  );
  assert.equal(shot.status, 200);
  assert.equal(shot.headers.get("Content-Type"), "image/png");
  assert.equal(shot.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(Buffer.from(await shot.arrayBuffer()), png);
  assert.equal(
    (
      await request(`/api/v1/admin/feedback/${feature.data.id}/screenshot/`, {
        headers: headers(admin),
      })
    ).response.status,
    404,
  );
});

test("admin feedback and screenshots require a verified platform admin", async () => {
  for (const path of [
    "/api/v1/admin/feedback/",
    `/api/v1/admin/feedback/${bugId}/screenshot/`,
  ]) {
    assert.equal((await request(path)).response.status, 401);
    assert.equal(
      (await request(path, { headers: headers(staff) })).response.status,
      403,
    );
    await db
      .prepare(
        "UPDATE users_user SET role='admin' WHERE email='feedback-staff@clinic.test'",
      )
      .run();
    assert.equal(
      (await request(path, { headers: headers(staff) })).response.status,
      403,
    );
  }
  const saved = await db
    .prepare("SELECT screenshot_url FROM feedback_feedback WHERE id=?")
    .bind(bugId)
    .first();
  assert.equal((await mf.dispatchFetch(saved.screenshot_url)).status, 401);
  assert.equal(
    (await mf.dispatchFetch(saved.screenshot_url, { headers: headers(other) }))
      .status,
    404,
  );
  const own = await mf.dispatchFetch(saved.screenshot_url, {
    headers: headers(staff),
  });
  assert.equal(own.status, 200);
  assert.deepEqual(Buffer.from(await own.arrayBuffer()), png);
  const platform = await db
    .prepare(
      "SELECT email_verified_at FROM users_user WHERE email='platform-admin@clinic.test'",
    )
    .first();
  await db
    .prepare(
      "UPDATE users_user SET email_verified_at=NULL WHERE email='platform-admin@clinic.test'",
    )
    .run();
  assert.equal(
    (await request("/api/v1/admin/feedback/", { headers: headers(admin) }))
      .response.status,
    401,
  );
  await db
    .prepare(
      "UPDATE users_user SET email_verified_at=? WHERE email='platform-admin@clinic.test'",
    )
    .bind(platform.email_verified_at)
    .run();
  await db
    .prepare("UPDATE clinics_clinic SET is_active=0 WHERE id=?")
    .bind(staff.clinic.id)
    .run();
  assert.equal(
    (
      await request("/api/v1/admin/feedback/?category=bug", {
        headers: headers(admin),
      })
    ).data.count,
    1,
  );
  assert.equal(
    (
      await mf.dispatchFetch(
        `https://clinic.test/api/v1/admin/feedback/${bugId}/screenshot/`,
        { headers: headers(admin) },
      )
    ).status,
    200,
  );
  await db
    .prepare("UPDATE clinics_clinic SET is_active=1 WHERE id=?")
    .bind(staff.clinic.id)
    .run();
});

test("feedback filters search literal text and reject invalid parameters", async () => {
  const bugs = await request("/api/v1/admin/feedback/?category=bug", {
    headers: headers(admin),
  });
  assert.equal(bugs.data.count, 1);
  assert.equal(bugs.data.results[0].title, "Upload screen is unclear");
  const features = await request(
    "/api/v1/admin/feedback/?category=feature&search=100%25",
    { headers: headers(admin) },
  );
  assert.equal(features.data.count, 1);
  assert.equal(features.data.results[0].title, "Remember 100% zoom");
  const clinic = await request(
    "/api/v1/admin/feedback/?search=feedback-staff",
    { headers: headers(admin) },
  );
  assert.equal(clinic.data.count, 1);
  assert.equal(clinic.data.results[0].id, bugId);
  const empty = await request("/api/v1/admin/feedback/?search=does-not-exist", {
    headers: headers(admin),
  });
  assert.deepEqual(empty.data, { count: 0, page: 1, results: [] });
  for (const query of [
    "category=other",
    "page=0",
    "page=-1",
    "page=1.5",
    "page=NaN",
    "search=" + "x".repeat(255),
  ])
    assert.equal(
      (
        await request(`/api/v1/admin/feedback/?${query}`, {
          headers: headers(admin),
        })
      ).response.status,
      400,
    );
});

test("feedback pagination has a stable order and includes requests without a submitter", async () => {
  for (let i = 1; i <= 26; i++)
    await db
      .prepare(
        `INSERT INTO feedback_feedback(id,clinic_id,user_id,category,title,description,screenshot_url,page_url,user_role,browser_info,github_issue_url,github_issue_number,status,created_at)
      SELECT ?,clinic_id,NULL,'feature',?,'','','',user_role,'','',NULL,'pending','2026-10-04T12:00:00.000Z' FROM feedback_feedback WHERE id=?`,
      )
      .bind(1000 + i, `Pagination fixture ${i}`, bugId)
      .run();
  const first = await request(
    "/api/v1/admin/feedback/?search=Pagination%20fixture",
    { headers: headers(admin) },
  );
  assert.equal(first.data.count, 26);
  assert.equal(first.data.results.length, 25);
  assert.equal(first.data.results[0].title, "Pagination fixture 26");
  assert.equal(first.data.results[24].title, "Pagination fixture 2");
  assert.equal(first.data.results[0].submitter, null);
  const second = await request(
    "/api/v1/admin/feedback/?search=Pagination%20fixture&page=2",
    { headers: headers(admin) },
  );
  assert.equal(second.data.results.length, 1);
  assert.equal(second.data.results[0].title, "Pagination fixture 1");
});

test("native feedback rejects invalid image content and the retired widget route is unavailable", async () => {
  const result = await submit(
    staff,
    "bug",
    "Invalid screenshot",
    new File(["not a PNG"], "screen.png", { type: "image/png" }),
  );
  assert.equal(result.response.status, 400);
  assert.equal(result.data.detail, "Invalid image content.");
  const list = await request(
    "/api/v1/admin/feedback/?search=Invalid%20screenshot",
    { headers: headers(admin) },
  );
  assert.equal(list.data.count, 0);
  assert.equal(
    (await request("/api/v1/feedback/widget/", { headers: headers(staff) }))
      .response.status,
    404,
  );
});

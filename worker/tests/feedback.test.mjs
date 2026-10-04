import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { jwtVerify } from "jose";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

const widgetSecret = "test-widget-secret-independent-of-ruthva-auth";
const bindings = {
  JWT_SECRET: "local-feedback-test-auth-secret-at-least-32-characters",
  FRONTEND_URL: "https://clinic.test",
  CORS_ALLOWED_ORIGINS: "https://clinic.test",
  DEFAULT_FROM_EMAIL: "noreply@clinic.test",
  AWS_SES_REGION: "us-east-1",
  AWS_ACCESS_KEY_ID: "AKIDEXAMPLE",
  AWS_SECRET_ACCESS_KEY: "local-feedback-test-ses-secret",
};
let mf, db, options, staff, signupCode;
const configure = async (url, secret = widgetSecret) => {
  options.bindings = {
    ...bindings,
    ...(url === undefined ? {} : { QUACKBACK_URL: url }),
    ...(secret === undefined ? {} : { QUACKBACK_WIDGET_SECRET: secret }),
  };
  await mf.setOptions(convertV4MiniflareOptions({ workers: [options] }));
  db = await mf.getD1Database("DB");
};
const request = async (path = "/api/v1/feedback/widget/", init = {}) => {
  const response = await mf.dispatchFetch(`https://clinic.test${path}`, init);
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
  options = {
    name: "feedback-api",
    modules,
    modulesRoot: resolve("dist"),
    compatibilityDate: "2026-10-03",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: { DB: "feedback-test" },
    r2Buckets: ["UPLOADS"],
    bindings,
    outboundService: async (request) => {
      assert.equal(new URL(request.url).hostname, "email.us-east-1.amazonaws.com");
      const body = await request.json();
      assert.deepEqual(body.Destination.ToAddresses, ["staff@clinic.test"]);
      signupCode = body.Content.Simple.Body.Html.Data.match(
        /<strong>(\d{6})<\/strong>/,
      )?.[1];
      assert.ok(signupCode, "The signup email contains a verification code");
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
  const pending = await request("/api/v1/auth/initiate-signup/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "staff@clinic.test",
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
      code: signupCode,
      clinic_name: "Feedback Test Clinic",
      subdomain: "feedback-test",
      discipline: "siddha",
      username: "feedback-staff",
      email: "staff@clinic.test",
      first_name: "Sample",
      last_name: "Doctor",
      password: "ClinicTestPass123",
    }),
  });
  assert.equal(created.response.status, 201);
  staff = created.data;
});
after(async () => mf?.dispose());

test("feedback signs only authenticated staff claims and isolates the signing key", async () => {
  await configure("https://ruthva-clinic-os.quackback.io/");
  assert.equal((await request()).response.status, 401);
  const headers = { Authorization: `Bearer ${staff.access}` };
  const { response, data } = await request(
    "/api/v1/feedback/widget/?email=attacker%40example.test&sub=attacker&name=Attacker",
    { headers },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(Object.keys(data).sort(), [
    "instance_url",
    "provider",
    "sso_token",
  ]);
  assert.equal(data.provider, "quackback");
  assert.equal(data.instance_url, "https://ruthva-clinic-os.quackback.io");
  const { payload, protectedHeader } = await jwtVerify(
    data.sso_token,
    new TextEncoder().encode(widgetSecret),
    { algorithms: ["HS256"] },
  );
  const user = await db
    .prepare("SELECT id FROM users_user WHERE username='feedback-staff'")
    .first();
  assert.equal(protectedHeader.alg, "HS256");
  assert.deepEqual(payload, {
    sub: `ruthva:user:${user.id}`,
    email: "staff@clinic.test",
    name: "Sample Doctor",
    iat: payload.iat,
    exp: payload.iat + 300,
  });
  assert.ok(Math.abs(payload.iat - Math.floor(Date.now() / 1000)) < 10);
  assert.ok(!JSON.stringify(data).includes(widgetSecret));
  await assert.rejects(
    jwtVerify(data.sso_token, new TextEncoder().encode(bindings.JWT_SECRET)),
  );
  assert.equal(
    (
      await request(undefined, {
        headers: { ...headers, "X-Clinic-Slug": "another-clinic" },
      })
    ).response.status,
    403,
  );
  assert.equal(
    (
      await request("/api/v1/auth/me/", {
        headers: { Authorization: `Bearer ${data.sso_token}` },
      })
    ).response.status,
    401,
  );
  await db
    .prepare("UPDATE users_user SET is_active=0 WHERE id=?")
    .bind(user.id)
    .run();
  assert.equal((await request(undefined, { headers })).response.status, 401);
  await db
    .prepare("UPDATE users_user SET is_active=1 WHERE id=?")
    .bind(user.id)
    .run();
});

test("feedback retains the Ruthva form without complete configuration and in demo clinics", async () => {
  const headers = { Authorization: `Bearer ${staff.access}` };
  for (const [url, secret] of [
    [undefined, widgetSecret],
    ["https://feedback.test", ""],
  ]) {
    await configure(url, secret);
    assert.deepEqual((await request(undefined, { headers })).data, {
      provider: "legacy",
    });
  }
  await configure("https://feedback.test");
  await db
    .prepare(
      "UPDATE clinics_clinic SET is_demo=1 WHERE subdomain='feedback-test'",
    )
    .run();
  assert.deepEqual((await request(undefined, { headers })).data, {
    provider: "legacy",
  });
  await db
    .prepare(
      "UPDATE clinics_clinic SET is_demo=0, is_active=0 WHERE subdomain='feedback-test'",
    )
    .run();
  assert.equal((await request(undefined, { headers })).response.status, 403);
  await db
    .prepare(
      "UPDATE clinics_clinic SET is_active=1 WHERE subdomain='feedback-test'",
    )
    .run();
});

test("feedback rejects unsafe workspace configuration and restricts HTTP fixtures to loopback", async () => {
  const headers = { Authorization: `Bearer ${staff.access}` };
  for (const url of [
    "invalid",
    "http://feedback.test",
    "https://user:password@feedback.test",
    "https://feedback.test/widget",
    "https://feedback.test/?key=value",
    "https://feedback.test/#fragment",
    "javascript:alert(1)",
    "http://localhost:8796",
  ]) {
    await configure(url);
    assert.equal(
      (await request(undefined, { headers })).response.status,
      503,
      url,
    );
  }
  await configure("https://feedback.test", "short");
  assert.equal((await request(undefined, { headers })).response.status, 503);
  await configure("http://localhost:8796");
  const local = await mf.dispatchFetch(
    "http://localhost:8797/api/v1/feedback/widget/",
    { headers },
  );
  assert.equal(local.status, 200);
  assert.equal((await local.json()).instance_url, "http://localhost:8796");
});

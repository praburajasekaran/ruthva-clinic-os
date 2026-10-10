import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash, createHmac, pbkdf2Sync } from "node:crypto";
import { unzipSync, strFromU8 } from "fflate";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

let mf, db;
const remoteCalls = [];
let remoteMode = "valid";
const consumedSso = new Set();
let ssoEmail = "clinic-a@clinic.test";
const sesCalls = [];
const summaryCalls = [];
let summaryMode = "valid";
let sesMode = "success";
const sesAccessKey = "AKIDEXAMPLE";
const sesSecret = "test-ses-secret-for-signature-verification";
function verifySesSignature(request, url, body) {
  const authorization = request.headers.get("Authorization");
  const match =
    /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/(\d{8}\/ap-south-1\/ses\/aws4_request), SignedHeaders=([^,]+), Signature=([a-f0-9]{64})$/.exec(
      authorization,
    );
  assert.ok(match, "SES uses the configured access key, region, and service");
  const [, scope, names, signature] = match;
  const timestamp = request.headers.get("X-Amz-Date");
  assert.equal(timestamp.slice(0, 8), scope.slice(0, 8));
  assert.equal(
    request.headers.get("X-Amz-Security-Token"),
    "test-session-token",
  );
  const headers =
    names
      .split(";")
      .map(
        (name) =>
          `${name}:${name === "host" ? url.host : request.headers.get(name).trim().replace(/\s+/g, " ")}`,
      )
      .join("\n") + "\n";
  const sha = (value) => createHash("sha256").update(value).digest("hex");
  const canonical = [
    request.method,
    url.pathname,
    "",
    headers,
    names,
    sha(body),
  ].join("\n");
  let key = Buffer.from(`AWS4${sesSecret}`);
  for (const part of scope.split("/"))
    key = createHmac("sha256", key).update(part).digest();
  const expected = createHmac("sha256", key)
    .update(["AWS4-HMAC-SHA256", timestamp, scope, sha(canonical)].join("\n"))
    .digest("hex");
  assert.equal(
    signature,
    expected,
    "AWS SigV4 covers the actual request headers and UTF-8 body",
  );
}
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
  mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: "api",
          modules,
          modulesRoot: resolve("dist"),
          compatibilityDate: "2026-10-03",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: { DB: "test" },
          r2Buckets: ["UPLOADS"],
          outboundService: async (request) => {
            try {
              const url = new URL(request.url);
              if (url.hostname === "openrouter.ai") {
                assert.equal(url.pathname, "/api/v1/chat/completions");
                const body = await request.json();
                summaryCalls.push(body);
                if (summaryMode === "failure") return Response.json({}, { status: 503 });
                return Response.json({ choices: [{ message: { content: summaryMode === "invalid" ? "# Summary\nInvented details" : "The recorded patient is 30 years old. Medical history includes asthma. Current medicine use has not been confirmed." } }] });
              }
              if (url.hostname === "email.ap-south-1.amazonaws.com") {
                assert.equal(request.method, "POST");
                assert.equal(url.pathname, "/v2/email/outbound-emails");
                assert.equal(
                  request.headers.get("Content-Type"),
                  "application/json",
                );
                const text = await request.text();
                verifySesSignature(request, url, text);
                const body = JSON.parse(text);
                assert.equal(body.FromEmailAddress, "noreply@clinic.test");
                assert.equal(body.Content.Simple.Subject.Charset, "UTF-8");
                assert.equal(body.Content.Simple.Body.Html.Charset, "UTF-8");
                const messageId = `ses-message-${sesCalls.length + 1}`;
                sesCalls.push({ body, messageId });
                if (sesMode === "throttled")
                  return Response.json(
                    { message: "Throttled" },
                    { status: 429 },
                  );
                if (sesMode === "rejected")
                  return Response.json(
                    { message: "Rejected" },
                    { status: 400 },
                  );
                if (sesMode === "invalid")
                  return Response.json({ MessageId: "" });
                if (sesMode === "redirect")
                  return new Response(null, {
                    status: 302,
                    headers: { Location: "https://attacker.test/" },
                  });
                return Response.json({ MessageId: messageId });
              }
              assert.equal(url.hostname, "ruthva.test");
              assert.equal(
                request.headers.get("X-Ruthva-Secret"),
                "test-ruthva-secret",
              );
              const text =
                request.method === "POST" ? await request.text() : "";
              const body = text ? JSON.parse(text) : null;
              remoteCalls.push({ path: url.pathname, body });
              if (url.pathname === "/api/sso/validate") {
                if (consumedSso.has(body.token))
                  return Response.json({ error: "expired" }, { status: 401 });
                consumedSso.add(body.token);
                return Response.json({ email: ssoEmail });
              }
              return Response.json(
                remoteMode === "invalid"
                  ? { status: "invalid", missedVisits: -1 }
                  : {
                      journeyId: "journey-001",
                      patientId: "remote-patient",
                      status: "active",
                      startDate: "2026-10-03",
                      nextVisitDate: "2026-10-10",
                      missedVisits: 0,
                    },
              );
            } catch (error) {
              console.error("Mock provider failed", error.message);
              throw error;
            }
          },
          bindings: {
            JWT_SECRET: "local-test-secret-with-at-least-32-characters",
            OPENROUTER_API_KEY: "test-provider-key",
            CRON_SECRET: "test-cron",
            FRONTEND_URL: "https://clinic.test",
            CORS_ALLOWED_ORIGINS: "https://clinic.test",
            DEFAULT_FROM_EMAIL: "noreply@clinic.test",
            AWS_SES_REGION: "ap-south-1",
            AWS_ACCESS_KEY_ID: sesAccessKey,
            AWS_SECRET_ACCESS_KEY: sesSecret,
            AWS_SESSION_TOKEN: "test-session-token",
            RUTHVA_API_URL: "https://ruthva.test",
            RUTHVA_INTEGRATION_SECRET: "test-ruthva-secret",
            RUTHVA_ADMIN_EMAIL: "platform-admin@clinic.test",
          },
        },
      ],
    }),
  );
  db = await mf.getD1Database("DB");
  for (const name of (await readdir("migrations")).sort()) {
    const sql = await readFile(`migrations/${name}`, "utf8");
    const statements =
      sql.match(
        /CREATE TRIGGER[\s\S]*?END;|(?:CREATE (?!TRIGGER)|ALTER TABLE )[\s\S]*?;/g,
      ) || [];
    for (const statement of statements) await db.prepare(statement).run();
  }
});
after(async () => mf?.dispose());
test("SES signs email requests and handles throttling, rejection, invalid receipts, and redirects", async () => {
  await signup("ses-clinic");
  const send = () =>
    request("/v1/auth/request-otp/", {
      method: "POST",
      body: { email: "ses-clinic@clinic.test" },
      headers: { "CF-Connecting-IP": "192.0.2.200" },
    });
  assert.equal((await send()).status, 200);
  assert.deepEqual(sesCalls.at(-1).body.Destination, {
    ToAddresses: ["ses-clinic@clinic.test"],
  });
  assert.equal(
    sesCalls.at(-1).body.Content.Simple.Subject.Data,
    "Your Ruthva login code",
  );
  assert.match(
    sesCalls.at(-1).body.Content.Simple.Body.Html.Data,
    /<strong>\d{6}<\/strong>/,
  );
  try {
    for (const mode of ["throttled", "rejected", "invalid", "redirect"]) {
      sesMode = mode;
      const count = sesCalls.length;
      assert.equal((await send()).status, 503, mode);
      assert.equal(
        sesCalls.length,
        count + 1,
        "SendEmail is not automatically retried",
      );
      assert.equal(
        await db
          .prepare("SELECT count(*) count FROM users_emailotp WHERE email=?")
          .bind("ses-clinic@clinic.test")
          .first("count"),
        0,
        "A failed delivery removes the unused OTP",
      );
    }
  } finally {
    sesMode = "success";
  }
});
test("Ruthva boundaries and authenticated webhooks", async () => {
  const account = await signup("journey-clinic"),
    token = account.access;
  const records = await clinicalRecords(token);
  const start = (body) =>
    request("/v1/integrations/journeys/start/", {
      token,
      method: "POST",
      body: {
        patient_id: records.patient.id,
        consultation_id: records.consultation.id,
        duration_days: 28,
        followup_interval_days: 7,
        consent_given: true,
        ...body,
      },
    });
  assert.equal((await start({ consent_given: false })).status, 400);
  assert.equal((await start({ duration_days: 6 })).status, 400);
  const created = await start({});
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.ruthva_journey_id, "journey-001");
  const call = remoteCalls.find((x) => x.path.endsWith("/journeys/start"));
  assert.equal(call.body.patientName, "Patient");
  assert.equal(
    call.body.externalConsultationId,
    String(records.consultation.id),
  );
  assert.equal(call.body.consentGiven, true);
  assert.equal((await start({})).status, 409);
  assert.equal(
    (
      await request(
        `/v1/integrations/journeys/${created.data.id}/confirm-visit/`,
        { token, method: "POST", body: {} },
      )
    ).status,
    200,
  );
  remoteMode = "invalid";
  assert.equal(
    (
      await request(
        `/v1/integrations/journeys/${created.data.id}/status/?sync=true`,
        { token },
      )
    ).status,
    502,
  );
  remoteMode = "valid";
  const webhook = (data) =>
    request("/v1/integrations/webhooks/ruthva/", {
      method: "POST",
      headers: { "X-Ruthva-Secret": "test-ruthva-secret" },
      body: { journey_id: "journey-001", event_type: "journey_dropped", data },
    });
  assert.equal((await webhook({ missedVisits: -1 })).status, 400);
  assert.equal(
    (await webhook({ missedVisits: 2, riskLevel: "at_risk" })).status,
    200,
  );
  assert.equal(
    (
      await request(`/v1/integrations/journeys/${created.data.id}/status/`, {
        token,
      })
    ).data.status,
    "dropped",
  );
});
async function request(
  path,
  { token, method = "GET", body, slug, headers: extra = {} } = {},
) {
  const multipart = body instanceof FormData;
  const headers = {
    ...(multipart ? {} : { "Content-Type": "application/json" }),
    ...extra,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (slug) headers["X-Clinic-Slug"] = slug;
  const outgoing = new Request(`https://clinic.test/api${path}`, {
    method,
    headers,
    body:
      body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  });
  const response = await mf.dispatchFetch(outgoing.url, {
    method,
    headers: outgoing.headers,
    body:
      body === undefined
        ? undefined
        : new Uint8Array(await outgoing.arrayBuffer()),
  });
  const type = response.headers.get("Content-Type") || "";
  const data =
    response.status === 204
      ? null
      : type.includes("json")
        ? await response.json()
        : type.includes("zip")
          ? new Uint8Array(await response.arrayBuffer())
          : await response.text();
  return { status: response.status, data, headers: response.headers };
}
let fixtureIp = 1;
function sentCode(email) {
  const message = sesCalls.findLast((call) =>
    call.body.Destination.ToAddresses.includes(email),
  );
  const match = /<strong>(\d{6})<\/strong>/.exec(
    message?.body.Content.Simple.Body.Html.Data ?? "",
  );
  assert.ok(match, `A verification code was sent to ${email}`);
  return match[1];
}
async function signup(slug) {
  const headers = { "CF-Connecting-IP": `192.0.2.${fixtureIp++}` };
  const pending = await request("/v1/auth/initiate-signup/", {
    method: "POST",
    headers,
    body: {
      first_name: "Doctor",
      email: `${slug}@clinic.test`,
      discipline: "siddha",
    },
  });
  assert.equal(pending.status, 201, JSON.stringify(pending.data));
  const result = await request("/v1/auth/signup/", {
    method: "POST",
    headers,
    body: {
      code: sentCode(`${slug}@clinic.test`),
      clinic_name: `Clinic ${slug}`,
      subdomain: slug,
      discipline: "siddha",
      username: slug,
      email: `${slug}@clinic.test`,
      first_name: "Doctor",
      password: "ClinicTestPass123",
    },
  });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return result.data;
}
test("account activation requires consumed email verification across signup and token routes", async () => {
  const email = "verification-required@clinic.test";
  const body = {
    clinic_name: "Verification clinic",
    subdomain: "verification-required",
    discipline: "siddha",
    username: "verification-required",
    email,
    first_name: "Doctor",
    password: "ClinicTestPass123",
    is_superuser: true,
  };
  assert.equal(
    (await request("/v1/auth/signup/", { method: "POST", body })).status,
    403,
  );
  assert.equal(
    await db
      .prepare("SELECT count(*) AS n FROM users_user WHERE email=?")
      .bind(email)
      .first("n"),
    0,
  );
  assert.equal(
    (await request("/v1/auth/initiate-signup/", { method: "POST", body }))
      .status,
    201,
  );
  assert.equal(
    await db
      .prepare("SELECT count(*) AS n FROM users_user WHERE email=?")
      .bind(email)
      .first("n"),
    0,
  );
  const code = sentCode(email);
  const wrong = code === "000000" ? "000001" : "000000";
  assert.equal(
    (
      await request("/v1/auth/signup/", {
        method: "POST",
        body: { ...body, code: wrong },
      })
    ).status,
    400,
  );
  assert.equal(
    await db
      .prepare("SELECT count(*) AS n FROM users_user WHERE email=?")
      .bind(email)
      .first("n"),
    0,
  );
  const verified = await request("/v1/auth/signup/", {
    method: "POST",
    body: { ...body, code },
  });
  assert.equal(verified.status, 201, JSON.stringify(verified.data));
  assert.equal(verified.data.user.is_platform_admin, false);
  const row = await db
    .prepare(
      "SELECT is_active,is_superuser,email_verified_at FROM users_user WHERE email=?",
    )
    .bind(email)
    .first();
  assert.equal(row.is_active, 1);
  assert.equal(row.is_superuser, 0);
  assert.ok(row.email_verified_at);
  assert.equal(
    (
      await request("/v1/auth/signup/", {
        method: "POST",
        body: { ...body, code },
      })
    ).status,
    400,
  );
  await db
    .prepare("UPDATE users_user SET email_verified_at=NULL WHERE email=?")
    .bind(email)
    .run();
  assert.equal(
    (await request("/v1/auth/me/", { token: verified.data.access })).status,
    401,
  );
  assert.equal(
    (
      await request("/v1/auth/token/refresh/", {
        method: "POST",
        body: { refresh: verified.data.refresh },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/v1/auth/token/", {
        method: "POST",
        body: { username: body.username, password: body.password },
      })
    ).status,
    403,
  );
  try {
    ssoEmail = email;
    assert.equal(
      (
        await request("/v1/auth/sso/exchange/", {
          method: "POST",
          body: { token: "c".repeat(64) },
        })
      ).status,
      403,
      "Upstream SSO cannot bypass local email verification",
    );
  } finally {
    ssoEmail = "clinic-a@clinic.test";
  }
  assert.equal(
    (
      await request("/v1/auth/request-otp/", {
        method: "POST",
        body: { email },
      })
    ).status,
    200,
  );
  const reverified = await request("/v1/auth/verify-otp/", {
    method: "POST",
    body: { email, code: sentCode(email) },
  });
  assert.equal(reverified.status, 200);
  assert.equal(
    (await request("/v1/auth/me/", { token: reverified.data.access })).status,
    200,
  );
  assert.equal(
    (await request("/v1/auth/me/", { token: verified.data.access })).status,
    401,
  );
});
test("Ruthva admin suspends whole clinics, revokes sessions, and cannot bypass owner verification", async () => {
  const platform = await signup("platform-admin"),
    clinic = await signup("managed-clinic");
  const platformMe = await request("/v1/auth/me/", { token: platform.access });
  assert.equal(platformMe.data.is_platform_admin, true);
  assert.equal(
    (await request("/v1/admin/clinics/", { token: clinic.access })).status,
    403,
  );
  await db
    .prepare("UPDATE users_user SET role='admin' WHERE id=?")
    .bind(clinic.user.id)
    .run();
  assert.equal(
    (await request("/v1/admin/clinics/", { token: clinic.access })).status,
    403,
  );
  const denied = await request("/v1/auth/me/update/", {
    token: clinic.access,
    method: "PATCH",
    body: {
      is_platform_admin: true,
      is_superuser: true,
      email_verified_at: "2099-01-01",
    },
  });
  assert.equal(denied.status, 400);
  const list = await request("/v1/admin/clinics/?search=managed-clinic", {
    token: platform.access,
  });
  assert.equal(list.status, 200);
  assert.equal(list.data.count, 1);
  assert.equal(list.data.results[0].owner.email, "managed-clinic@clinic.test");
  const change = (active, pk = clinic.clinic.id) =>
    request(`/v1/admin/clinics/${pk}/status/`, {
      token: platform.access,
      method: "PATCH",
      body: { is_active: active },
    });
  assert.equal((await change("false")).status, 400);
  assert.equal(
    (
      await request("/v1/auth/clinic/update/", {
        token: clinic.access,
        method: "PATCH",
        body: { is_active: false },
      })
    ).status,
    400,
    "Clinic owners cannot change administrative activation",
  );
  await db
    .prepare(
      "INSERT INTO users_user(id,username,email,password,first_name,last_name,is_superuser,is_staff,is_active,date_joined,role,is_clinic_owner,clinic_id,email_verified_at) SELECT 999999991,'managed-staff','managed-staff@clinic.test',password,'Staff','',0,0,1,date_joined,'therapist',0,clinic_id,email_verified_at FROM users_user WHERE id=?",
    )
    .bind(clinic.user.id)
    .run();
  const staff = await request("/v1/auth/token/", {
    method: "POST",
    body: { username: "managed-staff", password: "ClinicTestPass123" },
  });
  assert.equal(staff.status, 200);
  const suspended = await Promise.all([
    change(false),
    change(false),
    change(false),
  ]);
  assert.deepEqual(
    suspended.map((result) => result.status),
    [200, 200, 200],
  );
  assert.equal(
    (await request("/v1/patients/", { token: clinic.access })).status,
    401,
  );
  assert.equal(
    (await request("/v1/patients/", { token: staff.data.access })).status,
    401,
  );
  assert.equal(
    (
      await request("/v1/auth/token/refresh/", {
        method: "POST",
        body: { refresh: staff.data.refresh },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/v1/auth/token/", {
        method: "POST",
        body: { username: "managed-staff", password: "ClinicTestPass123" },
      })
    ).status,
    403,
  );
  try {
    ssoEmail = "managed-staff@clinic.test";
    assert.equal(
      (
        await request("/v1/auth/sso/exchange/", {
          method: "POST",
          body: { token: "d".repeat(64) },
        })
      ).status,
      403,
      "Upstream SSO cannot bypass clinic suspension",
    );
  } finally {
    ssoEmail = "clinic-a@clinic.test";
  }
  const version = await db
    .prepare("SELECT session_version FROM users_user WHERE id=?")
    .bind(clinic.user.id)
    .first("session_version");
  assert.equal((await change(false)).status, 200);
  assert.equal(
    await db
      .prepare("SELECT session_version FROM users_user WHERE id=?")
      .bind(clinic.user.id)
      .first("session_version"),
    version,
  );
  assert.equal(
    await db
      .prepare(
        "SELECT count(*) AS n FROM clinic_account_audit WHERE clinic_id=?",
      )
      .bind(clinic.clinic.id)
      .first("n"),
    1,
  );
  await db
    .prepare("UPDATE users_user SET email_verified_at=NULL WHERE id=?")
    .bind(clinic.user.id)
    .run();
  assert.equal((await change(true)).status, 409);
  await db
    .prepare("UPDATE users_user SET email_verified_at=? WHERE id=?")
    .bind(new Date().toISOString(), clinic.user.id)
    .run();
  assert.equal((await change(true)).status, 200);
  assert.equal(
    (await request("/v1/patients/", { token: staff.data.access })).status,
    401,
  );
  const newStaff = await request("/v1/auth/token/", {
    method: "POST",
    body: { username: "managed-staff", password: "ClinicTestPass123" },
  });
  assert.equal(newStaff.status, 200);
  assert.equal(
    (await request("/v1/patients/", { token: newStaff.data.access })).status,
    200,
  );
  assert.equal(
    await db
      .prepare(
        "SELECT count(*) AS n FROM clinic_account_audit WHERE clinic_id=?",
      )
      .bind(clinic.clinic.id)
      .first("n"),
    2,
  );
  assert.equal((await change(false, platform.clinic.id)).status, 200);
  assert.equal(
    (await request("/v1/admin/clinics/", { token: platform.access })).status,
    200,
  );
  assert.equal(
    (await request("/v1/auth/me/", { token: platform.access })).status,
    200,
  );
  assert.equal(
    (await request("/v1/patients/", { token: platform.access })).status,
    403,
    "Platform access does not reopen an inactive clinic's clinical records",
  );
  assert.equal((await change(true, platform.clinic.id)).status, 200);
});
test("email changes revoke verification and cannot promote an account to Ruthva admin", async () => {
  const account = await signup("email-change");
  const changed = await request("/v1/auth/me/update/", {
    token: account.access,
    method: "PATCH",
    body: { email: "changed-email@clinic.test" },
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.email_verified_at, null);
  assert.equal(changed.data.is_platform_admin, false);
  assert.equal(
    (await request("/v1/auth/me/", { token: account.access })).status,
    401,
  );
  assert.equal(
    (
      await request("/v1/auth/token/refresh/", {
        method: "POST",
        body: { refresh: account.refresh },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/v1/auth/request-otp/", {
        method: "POST",
        body: { email: changed.data.email },
      })
    ).status,
    200,
  );
  const verified = await request("/v1/auth/verify-otp/", {
    method: "POST",
    body: { email: changed.data.email, code: sentCode(changed.data.email) },
  });
  assert.equal(verified.status, 200);
  assert.equal(
    (await request("/v1/auth/me/", { token: verified.data.access })).data.email,
    changed.data.email,
  );
  assert.equal(
    (await request("/v1/admin/clinics/", { token: verified.data.access }))
      .status,
    403,
  );
});
test("concurrent email changes cannot reuse proof or revive a previous session", async () => {
  const account = await signup("concurrent-email");
  const email = "concurrent-email@clinic.test";
  const changedEmail = "concurrent-changed@clinic.test";
  const headers = { "CF-Connecting-IP": "192.0.2.210" };
  assert.equal(
    (
      await request("/v1/auth/request-otp/", {
        method: "POST",
        headers,
        body: { email },
      })
    ).status,
    200,
  );
  const [verified, changed] = await Promise.all([
    request("/v1/auth/verify-otp/", {
      method: "POST",
      headers,
      body: { email, code: sentCode(email) },
    }),
    request("/v1/auth/me/update/", {
      token: account.access,
      method: "PATCH",
      body: { email: changedEmail },
    }),
  ]);
  assert.equal(changed.status, 200, JSON.stringify(changed.data));
  assert.ok(
    [200, 401].includes(verified.status),
    JSON.stringify(verified.data),
  );
  const row = await db
    .prepare(
      "SELECT email,email_verified_at,session_version FROM users_user WHERE id=?",
    )
    .bind(account.user.id)
    .first();
  assert.equal(row.email, changedEmail);
  assert.equal(
    row.email_verified_at,
    null,
    "The new address has no email proof",
  );
  assert.equal(
    row.session_version,
    1,
    "Verification cannot reset a revoked session version",
  );
  assert.equal(
    (await request("/v1/auth/me/", { token: account.access })).status,
    401,
  );
  if (verified.status === 200)
    assert.equal(
      (await request("/v1/auth/me/", { token: verified.data.access })).status,
      401,
    );
});
test("health, authentication, tenant isolation, nested clinical records, and stock rollback", async () => {
  assert.equal((await request("/health/")).data.status, "ok");
  assert.equal((await request("/v1/patients/")).status, 401);
  const a = await signup("clinic-a"),
    b = await signup("clinic-b"),
    token = a.access;
  const patient = await request("/v1/patients/", {
    token,
    method: "POST",
    body: {
      name: "Patient A",
      age: 30,
      gender: "female",
      phone: "9876543210",
      medical_history: [{ disease: "Asthma", duration: "2 years" }],
    },
  });
  assert.equal(patient.status, 201, JSON.stringify(patient.data));
  assert.match(patient.data.record_id, /^PAT-\d{4}-0001$/);
  assert.equal(patient.data.medical_history[0].disease, "Asthma");
  assert.equal(
    (await request(`/v1/patients/${patient.data.id}/`, { token: b.access }))
      .status,
    404,
  );
  assert.equal(
    (await request("/v1/patients/", { token, slug: "clinic-b" })).status,
    403,
  );
  const consult = await request("/v1/consultations/", {
    token,
    method: "POST",
    body: {
      patient: patient.data.id,
      consultation_date: "2026-10-03",
      chief_complaints: "Pain",
      diagnosis: "Arthritis",
      diagnostic_data: { envagai_thervu: {} },
    },
  });
  assert.equal(consult.status, 201, JSON.stringify(consult.data));
  const rx = await request("/v1/prescriptions/", {
    token,
    method: "POST",
    body: {
      consultation: consult.data.id,
      medications: [
        {
          drug_name: "Medicine A",
          dosage: "1 tablet",
          frequency: "BD",
          duration: "7 days",
        },
      ],
    },
  });
  assert.equal(rx.status, 201, JSON.stringify(rx.data));
  assert.equal(rx.data.medications[0].drug_name, "Medicine A");
  const med = await request("/v1/pharmacy/medicines/", {
    token,
    method: "POST",
    body: {
      name: "Medicine A",
      category: "tablet",
      dosage_form: "tablets",
      unit_price: "10.00",
    },
  });
  assert.equal(med.status, 201, JSON.stringify(med.data));
  assert.equal(
    (
      await request(`/v1/pharmacy/medicines/${med.data.id}/adjust-stock/`, {
        token,
        method: "POST",
        body: { quantity: 10, entry_type: "purchase" },
      })
    ).data.current_stock,
    10,
  );
  const dispense = (items) =>
    request("/v1/pharmacy/dispensing/", {
      token,
      method: "POST",
      body: { prescription_id: rx.data.id, items },
    });
  assert.equal(
    (await dispense([{ medicine_id: med.data.id, quantity_dispensed: 3 }]))
      .status,
    201,
  );
  assert.equal(
    (
      await dispense([
        { medicine_id: med.data.id, quantity_dispensed: 3 },
        { medicine_id: med.data.id, quantity_dispensed: 10 },
      ])
    ).status,
    409,
  );
  assert.equal(
    (await request(`/v1/pharmacy/medicines/${med.data.id}/`, { token })).data
      .current_stock,
    7,
  );
  const concurrent = await Promise.all([
    dispense([{ medicine_id: med.data.id, quantity_dispensed: 5 }]),
    dispense([{ medicine_id: med.data.id, quantity_dispensed: 5 }]),
  ]);
  assert.deepEqual(concurrent.map((x) => x.status).sort(), [201, 409]);
  assert.equal(
    (await request(`/v1/pharmacy/medicines/${med.data.id}/`, { token })).data
      .current_stock,
    2,
  );
  assert.equal(
    (await request("/v1/patients/check_phone/?phone=9876543210", { token }))
      .data[0].id,
    patient.data.id,
  );
  const refresh = await request("/v1/auth/token/refresh/", {
    method: "POST",
    body: { refresh: a.refresh },
  });
  assert.equal(refresh.status, 200);
  const login = await request("/v1/auth/token/", {
    method: "POST",
    body: { username: "clinic-a", password: "ClinicTestPass123" },
  });
  assert.equal(login.status, 200);
});
const otpDigest = (value) =>
  createHmac("sha256", "local-test-secret-with-at-least-32-characters")
    .update(value)
    .digest("hex");

test("WhatsApp handoffs require consent and review, reuse messages, and never claim delivery", async () => {
  const account = await signup("whatsapp-clinic");
  const token = account.access;
  const records = await clinicalRecords(token, "WhatsApp Patient");
  await request(`/v1/patients/${records.patient.id}/`, {
    token,
    method: "PATCH",
    body: { whatsapp_number: "+44 7700 900123" },
  });
  await request(`/v1/prescriptions/${records.rx.id}/`, {
    token,
    method: "PATCH",
    body: { follow_up_date: "2026-10-10", follow_up_notes_ta: "மறுபரிசோதனை" },
  });
  const previewPath = `/v1/prescriptions/${records.rx.id}/whatsapp/`;
  const preview = await request(previewPath, { token });
  assert.equal(preview.status, 200, JSON.stringify(preview.data));
  assert.equal(preview.data.recipient, "447700900123");
  assert.equal(preview.data.consent.status, "not_recorded");
  assert.match(preview.data.message, /Twice daily\nஉணவுக்குப் பின்/);
  assert.match(preview.data.message, /Follow-up: 2026-10-10\nமறுபரிசோதனை/);
  const prepare = (body = {}) =>
    request(previewPath, {
      token,
      method: "POST",
      body: {
        reviewed: true,
        version: preview.data.version,
        kind: "prescription",
        ...body,
      },
    });
  assert.equal((await prepare()).status, 409);
  const consentPath = `/v1/patients/${records.patient.id}/whatsapp-consent/`;
  assert.equal(
    (
      await request(consentPath, {
        token,
        method: "POST",
        body: { status: "granted" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(consentPath, {
        token,
        method: "POST",
        body: { status: "granted", confirmed: true },
      })
    ).status,
    200,
  );
  assert.equal((await prepare({ reviewed: false })).status, 400);
  assert.equal((await prepare({ version: "stale" })).status, 409);
  const callCount = remoteCalls.length;
  const prepared = await Promise.all([prepare(), prepare()]);
  assert.deepEqual(
    prepared.map((r) => r.status),
    [200, 200],
  );
  assert.equal(prepared[0].data.id, prepared[1].data.id);
  assert.equal(prepared[0].data.status, "prepared");
  const schema = await request("/schema/");
  assert.deepEqual(
    schema.data.paths["/api/v1/whatsapp/messages/{message_id}/open/"].post
      .parameters,
    [
      {
        name: "message_id",
        in: "path",
        required: true,
        schema: { type: "string" },
      },
    ],
  );
  const messagePath = `/v1/whatsapp/messages/${prepared[0].data.id}`;
  const report = () =>
    request(`${messagePath}/report-sent/`, {
      token,
      method: "POST",
      body: { confirmed: true },
    });
  assert.equal((await report()).status, 409);
  const opened = await request(`${messagePath}/open/`, {
    token,
    method: "POST",
    body: {},
  });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  assert.equal(opened.data.status, "handoff_requested");
  const url = new URL(opened.data.url);
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/447700900123");
  assert.equal(url.searchParams.get("text"), preview.data.message);
  assert.equal((await report()).data.status, "staff_reported_sent");
  assert.equal((await report()).data.status, "staff_reported_sent");
  assert.equal(
    (await request(`${messagePath}/open/`, { token, method: "POST", body: {} }))
      .status,
    409,
  );
  assert.equal((await prepare()).data.status, "staff_reported_sent");
  assert.equal(
    remoteCalls.length,
    callCount,
    "Handoffs do not call a messaging provider",
  );
  const reminder = await request(`${previewPath}?kind=reminder`, { token });
  assert.equal(
    reminder.data.message,
    "Hello WhatsApp Patient,\n\nClinic whatsapp-clinic\nYour follow-up is due on 2026-10-10.\nContact the clinic to confirm your visit.\n\nTo stop WhatsApp messages, tell the clinic.",
  );
  const preparedReminder = await request(previewPath, {
    token,
    method: "POST",
    body: { kind: "reminder", reviewed: true, version: reminder.data.version },
  });
  assert.equal(preparedReminder.status, 200);
  await request(consentPath, {
    token,
    method: "POST",
    body: { status: "opted_out", confirmed: true },
  });
  assert.equal(
    (
      await request(`/v1/whatsapp/messages/${preparedReminder.data.id}/open/`, {
        token,
        method: "POST",
        body: {},
      })
    ).status,
    409,
  );
  assert.equal((await prepare()).status, 409);
  assert.equal(
    (await request(previewPath, { token })).data.consent.status,
    "opted_out",
  );
  const queue = await request("/v1/whatsapp/reminders/", { token });
  assert.equal(queue.status, 200);
  assert.deepEqual(
    queue.data.find((item) => item.prescription_id === records.rx.id),
    {
      prescription_id: records.rx.id,
      follow_up_date: "2026-10-10",
      patient_name: "WhatsApp Patient",
      patient_id: records.patient.id,
      consent_status: "opted_out",
    },
  );
});

test("WhatsApp rejects stale recipients, prescription edits, invalid contacts, and cross-clinic access", async () => {
  const a = await signup("whatsapp-boundary-a");
  const b = await signup("whatsapp-boundary-b");
  const records = await clinicalRecords(a.access);
  const path = `/v1/prescriptions/${records.rx.id}/whatsapp/`;
  const consentPath = `/v1/patients/${records.patient.id}/whatsapp-consent/`;
  const preview = await request(path, { token: a.access });
  assert.equal(preview.data.recipient, "919876543211");
  await request(consentPath, {
    token: a.access,
    method: "POST",
    body: { status: "granted", confirmed: true },
  });
  const prepared = await request(path, {
    token: a.access,
    method: "POST",
    body: {
      reviewed: true,
      kind: "prescription",
      version: preview.data.version,
    },
  });
  const openPath = `/v1/whatsapp/messages/${prepared.data.id}/open/`;
  assert.equal((await request(path, { token: b.access })).status, 404);
  assert.equal(
    (
      await request(consentPath, {
        token: b.access,
        method: "POST",
        body: { status: "granted", confirmed: true },
      })
    ).status,
    404,
  );
  assert.equal(
    (await request(openPath, { token: b.access, method: "POST", body: {} }))
      .status,
    404,
  );
  await request(`/v1/prescriptions/${records.rx.id}/`, {
    token: a.access,
    method: "PATCH",
    body: { diet_advice: "New diet instructions" },
  });
  assert.equal(
    (await request(openPath, { token: a.access, method: "POST", body: {} }))
      .status,
    409,
  );
  const edited = await request(path, { token: a.access });
  assert.match(edited.data.message, /Diet\nNew diet instructions/);
  assert.notEqual(edited.data.version, preview.data.version);
  await request(`/v1/patients/${records.patient.id}/`, {
    token: a.access,
    method: "PATCH",
    body: { whatsapp_number: "not-a-phone" },
  });
  const invalid = await request(path, { token: a.access });
  assert.equal(invalid.data.recipient, null);
  assert.equal(
    invalid.data.error,
    "Enter a valid WhatsApp number with its country code in the patient record.",
  );
  assert.equal(
    (
      await request(path, {
        token: a.access,
        method: "POST",
        body: {
          reviewed: true,
          kind: "prescription",
          version: invalid.data.version,
        },
      })
    ).status,
    400,
  );
  assert.equal((await request(path)).status, 401);
  await db
    .prepare("UPDATE users_user SET role='receptionist' WHERE id=?")
    .bind(a.user.id)
    .run();
  assert.equal((await request(path, { token: a.access })).status, 403);
  assert.equal(
    (await request("/v1/patients/", { token: a.access })).status,
    200,
    "Message permissions do not block normal patient routes",
  );
});

test("WhatsApp prescription text preserves homeopathic doses and refuses to truncate long prescriptions", async () => {
  const account = await signup("whatsapp-doses");
  const records = await clinicalRecords(account.access);
  const token = account.access;
  await request(`/v1/prescriptions/${records.rx.id}/`, {
    token,
    method: "PATCH",
    body: {
      medications: [
        {
          drug_name: "Arnica",
          potency: "30",
          dilution_scale: "C",
          pellet_count: 3,
          dosage: "3 pellets",
          frequency: "OD",
          timing: "before_food",
          duration: "5 days",
          instructions: "Dissolve under the tongue",
          instructions_ta: "உணவுக்கு முன்",
        },
      ],
      procedures: [
        {
          name: "Massage",
          duration: "20 minutes",
          details: "Gentle pressure",
          follow_up_date: "2026-10-12",
        },
      ],
    },
  });
  const preview = await request(
    `/v1/prescriptions/${records.rx.id}/whatsapp/`,
    { token },
  );
  assert.match(
    preview.data.message,
    /1\. Arnica 30 C\nDosage: 3 pellets\nPellets per dose: 3\nOnce daily\nBefore food\nDuration: 5 days\nDissolve under the tongue\nஉணவுக்கு முன்/,
  );
  assert.match(
    preview.data.message,
    /Procedures\nMassage\n20 minutes\nGentle pressure\nProcedure follow-up: 2026-10-12/,
  );
  await db
    .prepare("UPDATE prescriptions_prescription SET diet_advice=? WHERE id=?")
    .bind("Complete instructions ".repeat(400), records.rx.id)
    .run();
  const long = await request(`/v1/prescriptions/${records.rx.id}/whatsapp/`, {
    token,
  });
  assert.match(long.data.error, /too long/);
  assert.ok(
    long.data.message.includes("Complete instructions ".repeat(400).trim()),
  );
  assert.equal(
    (
      await request(
        `/v1/prescriptions/${records.rx.id}/whatsapp/?kind=reminder`,
        { token },
      )
    ).status,
    400,
  );
});
async function clinicalRecords(token, name = "Patient") {
  const patient = await request("/v1/patients/", {
    token,
    method: "POST",
    body: { name, age: 28, gender: "female", phone: "9876543211" },
  });
  assert.equal(patient.status, 201, JSON.stringify(patient.data));
  const consultation = await request("/v1/consultations/", {
    token,
    method: "POST",
    body: {
      patient: patient.data.id,
      consultation_date: "2026-10-03",
      diagnosis: "Pain",
    },
  });
  assert.equal(consultation.status, 201, JSON.stringify(consultation.data));
  const rx = await request("/v1/prescriptions/", {
    token,
    method: "POST",
    body: {
      consultation: consultation.data.id,
      medications: [
        {
          drug_name: "Tablet",
          frequency: "BD",
          instructions_ta: "உணவுக்குப் பின்",
        },
      ],
    },
  });
  assert.equal(rx.status, 201, JSON.stringify(rx.data));
  return {
    patient: patient.data,
    consultation: consultation.data,
    rx: rx.data,
  };
}
test("saved visits expose their prescription for repeatable completion review", async () => {
  const account = await signup("visit-completion");
  const patient = await request("/v1/patients/", {
    token: account.access,
    method: "POST",
    body: { name: "Completion Patient", age: 30, gender: "female", phone: "9876543210" },
  });
  assert.equal(patient.status, 201);
  const visit = await request("/v1/consultations/", {
    token: account.access,
    method: "POST",
    body: { patient: patient.data.id, consultation_date: "2026-10-10" },
  });
  assert.equal(visit.status, 201);
  assert.equal(visit.data.prescription, null);
  const rx = await request("/v1/prescriptions/", {
    token: account.access,
    method: "POST",
    body: { consultation: visit.data.id, follow_up_date: "2026-10-17" },
  });
  assert.equal(rx.status, 201);
  for (let i = 0; i < 2; i++) {
    const reopened = await request(`/v1/consultations/${visit.data.id}/`, { token: account.access });
    assert.equal(reopened.status, 200);
    assert.deepEqual(reopened.data.prescription, { id: rx.data.id });
    assert.equal(reopened.data.patient, patient.data.id);
  }
  const prescriptions = await request(`/v1/prescriptions/?consultation__patient=${patient.data.id}`, { token: account.access });
  assert.equal(prescriptions.data.count, 1);
  const other = await signup("other-completion");
  assert.equal((await request(`/v1/consultations/${visit.data.id}/`, { token: other.access })).status, 404);
});

test("visit conflicts explain the patient-day rule and preserve saved visits", async () => {
  const account = await signup("visit-conflict"),
    records = await clinicalRecords(account.access, "Visit Conflict Patient");
  const save = (date) =>
    request("/v1/consultations/", {
      token: account.access,
      method: "POST",
      body: {
        patient: records.patient.id,
        consultation_date: date,
        weight: null,
        height: null,
        pulse_rate: null,
        temperature: null,
        bp_systolic: null,
        bp_diastolic: null,
      },
    });
  const duplicate = await save("2026-10-03");
  assert.equal(duplicate.status, 409);
  assert.equal(
    duplicate.data.detail,
    "A visit already exists for this patient on this date. Open the existing visit from the patient's history to make changes.",
  );
  const nextDay = await save("2026-10-04");
  assert.equal(nextDay.status, 201, JSON.stringify(nextDay.data));
  assert.equal(nextDay.data.weight, null);
  const editConflict = await request(`/v1/consultations/${nextDay.data.id}/`, {
    token: account.access,
    method: "PATCH",
    body: { consultation_date: "2026-10-03" },
  });
  assert.equal(editConflict.status, 409);
  assert.equal(editConflict.data.detail, duplicate.data.detail);
  const history = await request(
    `/v1/patients/${records.patient.id}/consultations/`,
    {
      token: account.access,
    },
  );
  assert.deepEqual(
    history.data.map((visit) => [visit.id, visit.consultation_date]),
    [
      [nextDay.data.id, "2026-10-04"],
      [records.consultation.id, "2026-10-03"],
    ],
  );
});

test("OTP expiry, attempt limit, single consumption, and onboarding", async () => {
  const account = await signup("otp-clinic"),
    email = "otp-clinic@clinic.test";
  const otp = () =>
    request("/v1/auth/verify-otp/", {
      method: "POST",
      body: { email, code: "654321" },
    });
  assert.equal(
    (
      await request("/v1/auth/request-otp/", {
        method: "POST",
        body: { email },
      })
    ).status,
    200,
  );
  await db
    .prepare("UPDATE users_emailotp SET code_hash=?,expires_at=? WHERE email=?")
    .bind(otpDigest("654321"), "2000-01-01T00:00:00.000Z", email)
    .run();
  assert.equal((await otp()).status, 400);
  await db
    .prepare("UPDATE users_emailotp SET expires_at=?,attempts=4 WHERE email=?")
    .bind("2099-01-01T00:00:00.000Z", email)
    .run();
  assert.equal(
    (
      await request("/v1/auth/verify-otp/", {
        method: "POST",
        body: { email, code: "wrong" },
      })
    ).status,
    400,
  );
  assert.equal((await otp()).status, 429);
  await db
    .prepare("UPDATE users_emailotp SET attempts=0 WHERE email=?")
    .bind(email)
    .run();
  const raced = await Promise.all([otp(), otp()]);
  assert.deepEqual(raced.map((x) => x.status).sort(), [200, 400]);
  assert.equal((await otp()).status, 400);
  assert.equal(
    (await request("/v1/auth/me/", { token: account.access })).data.email,
    email,
  );
  const signupEmail = "onboarding@clinic.test";
  assert.equal(
    (
      await request("/v1/auth/initiate-signup/", {
        method: "POST",
        body: {
          first_name: "Doctor",
          email: signupEmail,
          discipline: "siddha",
        },
      })
    ).status,
    201,
  );
  await db
    .prepare("UPDATE users_pendingsignup SET otp_code_hash=? WHERE email=?")
    .bind(otpDigest("654321"), signupEmail)
    .run();
  const verified = await request("/v1/auth/verify-signup-otp/", {
    method: "POST",
    body: { email: signupEmail, code: "654321" },
  });
  assert.equal(verified.status, 201, JSON.stringify(verified.data));
  assert.equal(verified.data.onboarding_complete, false);
  const onboard = await request("/v1/auth/complete-onboarding/", {
    token: verified.data.access,
    method: "POST",
    body: {
      clinic_name: "New Siddha Clinic",
      address: "Chennai",
      registration_number: "REG-001",
      discipline: "siddha",
      plan: "pro",
      active_patient_limit: 100000,
    },
  });
  assert.equal(onboard.status, 201, JSON.stringify(onboard.data));
  assert.equal(onboard.data.clinic.plan, "free");
  assert.match(onboard.data.clinic.subdomain, /^new-siddha-clinic-/);
  assert.equal(
    (await request("/v1/patients/", { token: onboard.data.access })).status,
    200,
  );
  assert.equal(
    (await request("/v1/auth/me/", { token: verified.data.access })).status,
    401,
  );
});
test("demo login and clinic switching remain isolated and read-only", async () => {
  const requested = await request("/v1/auth/request-otp/", {
    method: "POST",
    body: { email: "demo@ruthva.com" },
  });
  assert.equal(requested.data.is_demo, true);
  const login = await request("/v1/auth/verify-otp/", {
    method: "POST",
    body: { email: "demo@ruthva.com", code: "123456" },
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.clinic_slug, "demo-ayurveda");
  assert.equal(
    (
      await request("/v1/patients/", {
        token: login.data.access,
        method: "POST",
        body: { name: "Demo", age: 25, gender: "male", phone: "9876543210" },
      })
    ).status,
    403,
  );
  const switched = await request("/v1/auth/demo/switch-clinic/", {
    token: login.data.access,
    method: "POST",
    body: { clinic_slug: "demo-siddha" },
  });
  assert.equal(switched.status, 200);
  assert.equal(switched.data.clinic_slug, "demo-siddha");
  assert.equal(
    (
      await request("/v1/auth/demo/switch-clinic/", {
        token: switched.data.access,
        method: "POST",
        body: { clinic_slug: "clinic-a" },
      })
    ).status,
    404,
  );
});
test("team capacity, invitation consumption, owner protection, and treatment transitions", async () => {
  const a = await signup("team-clinic"),
    token = a.access;
  const invite = (role) =>
    request("/v1/team/invite/", {
      token,
      method: "POST",
      body: { email: `${role}@team.test`, first_name: role, role },
    });
  assert.equal((await invite("doctor")).status, 409);
  const invited = await invite("therapist");
  assert.equal(invited.status, 201, JSON.stringify(invited.data));
  assert.equal((await invite("therapist")).status, 409);
  const invitation = await db
    .prepare("SELECT token FROM clinics_clinicinvitation WHERE id=?")
    .bind(invited.data.id)
    .first();
  assert.equal(
    (await request(`/v1/invite/details/?token=${invitation.token}`)).data
      .clinic_name,
    "Clinic team-clinic",
  );
  const accepted = await request("/v1/invite/accept/", {
    method: "POST",
    body: {
      token: invitation.token,
      username: "team-therapist",
      password: "TherapistPass123",
    },
  });
  assert.equal(accepted.status, 201, JSON.stringify(accepted.data));
  assert.equal(
    (await request(`/v1/invite/details/?token=${invitation.token}`)).status,
    404,
  );
  const therapist = accepted.data.access;
  assert.equal(
    (await request(`/v1/team/${a.user.id}/`, { token, method: "DELETE" }))
      .status,
    400,
  );
  assert.equal(
    (
      await request(`/v1/team/${a.user.id}/role/`, {
        token,
        method: "PATCH",
        body: { role: "admin" },
      })
    ).status,
    400,
  );
  const records = await clinicalRecords(token);
  assert.equal(
    (
      await request("/v1/consultations/", {
        token: therapist,
        method: "POST",
        body: { patient: records.patient.id, consultation_date: "2026-10-04" },
      })
    ).status,
    403,
  );
  const block = (start, end) => ({
    start_day_number: start,
    end_day_number: end,
    start_date: "2026-10-03",
    entries: [
      {
        entry_type: "day_range",
        start_day_number: start,
        end_day_number: end,
        procedure_name: "Massage",
        medium_type: "oil",
        medium_name: "Sesame",
      },
    ],
  });
  const created = await request("/v1/treatments/plans/", {
    token,
    method: "POST",
    body: { prescription: records.rx.id, total_days: 2, block: block(1, 1) },
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.blocks[0].block_number, 1);
  assert.equal(
    (
      await request("/v1/treatments/plans/", {
        token,
        method: "POST",
        body: {
          prescription: records.rx.id,
          total_days: 2,
          block: block(1, 1),
        },
      })
    ).status,
    409,
  );
  const firstSession = created.data.blocks[0].sessions[0].id;
  assert.equal(
    (
      await request(`/v1/treatments/sessions/${firstSession}/feedback/`, {
        token,
        method: "POST",
        body: { completion_status: "done", response_score: 4 },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/v1/treatments/sessions/${firstSession}/feedback/`, {
        token: therapist,
        method: "POST",
        body: {
          completion_status: "done",
          response_score: 4,
          review_requested: true,
        },
      })
    ).status,
    201,
  );
  const tasks = await request("/v1/dashboard/follow-ups/?tab=doctor", {
    token,
  });
  assert.deepEqual(tasks.data.items.map((x) => x.task_type).sort(), [
    "block_completed",
    "review_requested",
  ]);
  const second = await request(
    `/v1/treatments/plans/${created.data.id}/blocks/`,
    { token, method: "POST", body: block(2, 2) },
  );
  assert.equal(second.status, 201, JSON.stringify(second.data));
  assert.equal(second.data.blocks[1].block_number, 2);
  const completed = await request(
    `/v1/treatments/sessions/${second.data.blocks[1].sessions[0].id}/feedback/`,
    {
      token: therapist,
      method: "POST",
      body: { completion_status: "not_done", response_score: 2 },
    },
  );
  assert.equal(completed.status, 201, JSON.stringify(completed.data));
  assert.equal(
    (await request(`/v1/treatments/plans/${created.data.id}/`, { token })).data
      .status,
    "completed",
  );
  assert.equal(
    (
      await request(`/v1/treatments/sessions/${firstSession}/feedback/`, {
        token: therapist,
        method: "POST",
        body: { completion_status: "done", response_score: 5 },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/v1/team/${accepted.data.user.id}/`, {
        token,
        method: "DELETE",
      })
    ).status,
    204,
  );
  assert.equal(
    (await request("/v1/patients/", { token: therapist })).status,
    401,
  );
});
test("patient quotas and record numbers are safe under concurrent writes", async () => {
  const a = await signup("quota-clinic"),
    token = a.access;
  await db
    .prepare("UPDATE clinics_clinic SET active_patient_limit=2 WHERE id=?")
    .bind(a.clinic.id)
    .run();
  const create = (name) =>
    request("/v1/patients/", {
      token,
      method: "POST",
      body: { name, age: 30, gender: "male", phone: "9876543210" },
    });
  const results = await Promise.all([
    create("One"),
    create("Two"),
    create("Three"),
  ]);
  assert.deepEqual(results.map((x) => x.status).sort(), [201, 201, 409]);
  const successful = results.filter((x) => x.status === 201).map((x) => x.data);
  assert.equal(new Set(successful.map((x) => x.record_id)).size, 2);
  assert.equal(
    (
      await request(`/v1/patients/${successful[0].id}/toggle-active/`, {
        token,
        method: "POST",
        body: {},
      })
    ).data.is_active,
    false,
  );
  assert.equal((await create("Replacement")).status, 201);
  assert.equal(
    (
      await request(`/v1/patients/${successful[0].id}/toggle-active/`, {
        token,
        method: "POST",
        body: {},
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("/v1/usage/", { token })).data.active_patients,
    2,
  );
});
test("CSV preview, import, tenant exports, and ZIP audit", async () => {
  const a = await signup("import-clinic"),
    token = a.access;
  const form = () => {
    const body = new FormData();
    body.set(
      "file",
      new File(
        [
          'name,age,gender,phone,date_of_birth,diagnosis,last_seen_date\r\n"Imported, Tamil",30,F,9876543210,03/10/1996,Pain,03/10/2026\r\nInvalid,nope,F,9876543211,,Pain,\r\n',
        ],
        "patients.csv",
        { type: "text/csv" },
      ),
    );
    return body;
  };
  const preview = await request("/v1/patients/import/preview/", {
    token,
    method: "POST",
    body: form(),
  });
  assert.equal(preview.status, 200);
  assert.equal(preview.data.total_rows, 2);
  assert.equal(preview.data.error_count, 1);
  assert.equal(preview.data.preview[0].data.name, "Imported, Tamil");
  const confirm = await request("/v1/patients/import/confirm/", {
    token,
    method: "POST",
    body: form(),
  });
  assert.equal(confirm.status, 201, JSON.stringify(confirm.data));
  assert.equal(confirm.data.created, 1);
  assert.equal(confirm.data.consultation_created_count, 1);
  assert.equal(
    (
      await request("/v1/patients/import/confirm/", {
        token,
        method: "POST",
        body: form(),
      })
    ).data.skipped,
    1,
  );
  const csv = await request("/v1/export/patients/", { token });
  assert.equal(csv.status, 200);
  assert.ok(csv.data.includes('"Imported, Tamil"'));
  assert.ok(csv.data.includes('"1996-10-03"'));
  assert.ok(!csv.data.includes("Patient A"));
  const zip = await request("/v1/export/all/", { token });
  assert.equal(zip.status, 200);
  const files = unzipSync(zip.data);
  assert.deepEqual(Object.keys(files).sort(), [
    "consultations.csv",
    "patients.csv",
    "prescriptions.csv",
  ]);
  assert.ok(strFromU8(files["consultations.csv"]).includes('"Pain"'));
  assert.equal(
    (
      await db
        .prepare(
          "SELECT count(*) count FROM clinics_dataexportaudit WHERE clinic_id=?",
        )
        .bind(a.clinic.id)
        .first()
    ).count,
    2,
  );
});
test("R2 logo validation, private uploads, reminder authentication and deduplication", async () => {
  const a = await signup("resources-clinic"),
    token = a.access;
  const png = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nmXkAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const form = new FormData();
  form.set("logo", new File([png], "logo.png", { type: "image/png" }));
  const upload = await request("/v1/auth/clinic/logo/upload/", {
    token,
    method: "POST",
    body: form,
  });
  assert.equal(upload.status, 200, JSON.stringify(upload.data));
  assert.ok(upload.data.logo_url.includes(`/logos/${a.clinic.id}/`));
  assert.equal((await mf.dispatchFetch(upload.data.logo_url)).status, 200);
  const invalid = new FormData();
  invalid.set("logo", new File(["not PNG"], "bad.png", { type: "image/png" }));
  assert.equal(
    (
      await request("/v1/auth/clinic/logo/upload/", {
        token,
        method: "POST",
        body: invalid,
      })
    ).status,
    400,
  );
  const feedback = new FormData();
  feedback.set("title", "Test issue");
  feedback.set("category", "bug");
  feedback.set(
    "screenshot",
    new File([png], "screen.png", { type: "image/png" }),
  );
  const saved = await request("/v1/feedback/", {
    token,
    method: "POST",
    body: feedback,
  });
  assert.equal(saved.status, 201);
  const screenshot = await db
    .prepare("SELECT screenshot_url FROM feedback_feedback WHERE id=?")
    .bind(saved.data.id)
    .first();
  assert.equal((await mf.dispatchFetch(screenshot.screenshot_url)).status, 401);
  const b = await request("/v1/auth/token/", {
    method: "POST",
    body: { username: "clinic-b", password: "ClinicTestPass123" },
  });
  assert.equal(
    (
      await request(new URL(screenshot.screenshot_url).pathname.slice(4), {
        token: b.data.access,
      })
    ).status,
    404,
  );
  const records = await clinicalRecords(token);
  const indiaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const tomorrow = new Date(Date.parse(`${indiaDate}T00:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
  await db
    .prepare(
      "UPDATE patients_patient SET email='reminder@clinic.test' WHERE id=?",
    )
    .bind(records.patient.id)
    .run();
  await db
    .prepare(
      "UPDATE prescriptions_prescription SET follow_up_date=? WHERE id=?",
    )
    .bind(tomorrow, records.rx.id)
    .run();
  assert.equal(
    (await request("/cron/", { method: "POST", body: {} })).status,
    401,
  );
  const send = () =>
    request("/cron/", {
      method: "POST",
      body: {},
      headers: { "X-Cron-Secret": "test-cron" },
    });
  const reminders = await Promise.all([send(), send()]);
  assert.equal(
    reminders.reduce((sum, x) => sum + x.data.sent, 0),
    1,
  );
  assert.ok(reminders.every((x) => x.data.failed === 0));
  assert.equal((await send()).data.sent, 0);
  const audit = await db
    .prepare("SELECT * FROM reminders_sentreminder WHERE object_id=?")
    .bind(records.rx.id)
    .first();
  assert.equal(audit.reminder_type, "prescription");
  assert.equal(audit.follow_up_date, tomorrow);
  assert.equal(audit.patient_email, "reminder@clinic.test");
  assert.equal(
    audit.resend_email_id,
    sesCalls.find(
      (call) => call.body.Destination.ToAddresses[0] === "reminder@clinic.test",
    ).messageId,
  );
  assert.equal(
    (await request("/v1/auth/clinic/logo/", { token, method: "DELETE" }))
      .status,
    204,
  );
  assert.equal((await mf.dispatchFetch(upload.data.logo_url)).status, 404);
});
test("public schema, JSON format, and foreign keys preserve the API boundary", async () => {
  const schema = await request("/schema/");
  assert.equal(schema.status, 200);
  assert.ok(schema.data.paths["/api/v1/treatments/plans/{pk}/blocks/"]);
  const canonical = (path) =>
    path
      .replace(/\(\?P<pk>\[\^\/\.\]\+\)/g, "{id}")
      .replace(/\^|\$/g, "")
      .replace(/<int:[^>]+>/g, "{id}")
      .replace(/\{\w+\}/g, "{id}");
  const actual = new Map(
    Object.entries(schema.data.paths).map(([path, methods]) => [
      canonical(path),
      methods,
    ]),
  );
  for (const route of JSON.parse(
    await readFile("original-routes.json", "utf8"),
  )) {
    if (route.path.includes("format") || route.name === "api-root") continue;
    const methods = actual.get(canonical(`/${route.path}`));
    assert.ok(methods, `Missing original route ${route.path}`);
    for (const method of route.methods)
      if (method.toUpperCase() !== "OPTIONS")
        assert.ok(
          methods[method.toLowerCase()],
          `Missing ${method} ${route.path}`,
        );
  }
  const login = await request("/v1/auth/token/", {
      method: "POST",
      body: { username: "clinic-a", password: "ClinicTestPass123" },
    }),
    token = login.data.access;
  assert.equal((await request("/v1/patients.json", { token })).status, 200);
  const legacy = `pbkdf2_sha256$720000$legacy-salt$${pbkdf2Sync("ClinicTestPass123", "legacy-salt", 720000, 32, "sha256").toString("base64")}`;
  await db
    .prepare("UPDATE users_user SET password=? WHERE username='clinic-a'")
    .bind(legacy)
    .run();
  assert.equal(
    (
      await request("/v1/auth/token/", {
        method: "POST",
        body: { username: "clinic-a", password: "ClinicTestPass123" },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await db
        .prepare("SELECT password FROM users_user WHERE username='clinic-a'")
        .first()
    ).password,
    legacy,
  );
  const exchange = () =>
    request("/v1/auth/sso/exchange/", {
      method: "POST",
      body: { token: "a".repeat(64) },
    });
  assert.equal((await exchange()).status, 200);
  assert.equal((await exchange()).status, 401);
  const foreign = await db
    .prepare(
      "SELECT id FROM patients_patient WHERE clinic_id=(SELECT id FROM clinics_clinic WHERE subdomain='import-clinic') LIMIT 1",
    )
    .first();
  assert.equal(
    (
      await request("/v1/consultations/", {
        token,
        method: "POST",
        body: { patient: foreign.id, consultation_date: "2026-10-04" },
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request("/v1/auth/clinic/update/", {
        token,
        method: "PATCH",
        body: {
          plan: "pro",
          active_patient_limit: 100000,
          name: "Updated Clinic",
        },
      })
    ).data.plan,
    "free",
  );
  assert.equal(
    (
      await request("/v1/integrations/webhooks/ruthva/", {
        method: "POST",
        body: {},
      })
    ).status,
    401,
  );
});

test("patient summary uses saved clinic-scoped facts, caches, refreshes and falls back on provider failures", async () => {
  const account = await signup("summary-clinic"), token = account.access;
  const records = await clinicalRecords(token, "Private patient name");
  const path = `/v1/patients/${records.patient.id}/summary/`;
  const patch = body => request(`/v1/patients/${records.patient.id}/`, { token, method: "PATCH", body });
  assert.equal((await patch({ medical_history: [{ disease: "Asthma", duration: "2 years", medication: "Previous inhaler" }] })).status, 200);
  const saved = await request(path, { token });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.equal(saved.data.source, "saved_facts");
  assert.match(saved.data.summary, /Asthma/);
  const count = summaryCalls.length;
  const generated = await request(path, { token, method: "POST", body: {} });
  assert.equal(generated.data.status, "ready", JSON.stringify(generated.data));
  assert.equal(summaryCalls.length, count + 1);
  const body = summaryCalls.at(-1), facts = JSON.parse(body.messages[1].content);
  assert.equal(body.provider.data_collection, "deny");
  assert.equal(body.provider.allow_fallbacks, false);
  assert.equal(facts.patient.current_medicines_status, "unknown");
  assert.ok(!body.messages[1].content.includes("Private patient name"));
  assert.ok(!body.messages[1].content.includes("9876543210"));
  await request(path, { token, method: "POST", body: {} });
  assert.equal(summaryCalls.length, count + 1, "unchanged saved facts reuse the cached summary");
  assert.equal((await patch({ current_medicines_status: "taking", current_medicines: "Reported inhaler once daily" })).status, 200);
  await request(path, { token, method: "POST", body: {} });
  assert.equal(summaryCalls.length, count + 2);
  assert.equal(JSON.parse(summaryCalls.at(-1).messages[1].content).patient.current_medicines, "Reported inhaler once daily");
  assert.equal((await patch({ current_medicines_status: "none" })).status, 400);
  assert.equal((await patch({ current_medicines_status: "none", current_medicines: "" })).status, 200);
  summaryMode = "failure";
  try {
    const failed = await request(path, { token, method: "POST", body: {} });
    assert.equal(failed.data.status, "failed");
    assert.equal(failed.data.source, "saved_facts");
    assert.match(failed.data.summary, /No current medicines recorded/);
    summaryMode = "invalid";
    assert.equal((await request(path, { token, method: "POST", body: {} })).data.status, "failed");
  } finally { summaryMode = "valid"; }
  const other = await signup("summary-other");
  assert.equal((await request(path, { token: other.access })).status, 404);
  assert.equal((await request(path, { token: other.access, method: "POST", body: {} })).status, 404);
});

test("therapy records group case variants and link only patients in the current clinic", async () => {
  const a = await signup("therapy-a"), b = await signup("therapy-b");
  const x = await clinicalRecords(a.access, "Therapy patient A"), y = await clinicalRecords(b.access, "Therapy patient B");
  for (const [token, record, name] of [[a.access,x,"Varma"],[b.access,y,"Varma"]]) {
    const changed = await request(`/v1/prescriptions/${record.rx.id}/`, { token, method: "PATCH", body: { procedures: [{ name }] } });
    assert.equal(changed.status, 200, JSON.stringify(changed.data));
  }
  const list = await request("/v1/therapies/", { token: a.access });
  assert.equal(list.status, 200, JSON.stringify(list.data));
  assert.deepEqual(list.data.results.map(t => [t.name,t.patient_count]), [["Varma",1]]);
  const detail = await request("/v1/therapies/?name=varma", { token: a.access });
  assert.equal(detail.data.count, 1);
  assert.equal(detail.data.results[0].patient_id, x.patient.id);
  assert.ok(!JSON.stringify(detail.data).includes("Therapy patient B"));
});

import { Hono } from "hono";
import { SignJWT, jwtVerify } from "jose";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  ApiError,
  all,
  check,
  dbOf,
  flag,
  get,
  id,
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
  validate,
} from "./data";
import type { App, Clinic, Ctx, DB, Env, Row, User } from "./data";
import { sendEmail } from "./email";
import { DEFAULT_DISCIPLINE } from "../../shared/practices";
import { requireEnabledDiscipline } from "./practices";

export const auth = new Hono<App>();
const enc = new TextEncoder();
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
export function constantEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export function passwordHash(password: string, encoded?: string): string {
  const parts = encoded?.split("$");
  check(
    !parts || parts[0] === "pbkdf2_sha256",
    "Password reset is required for this password format.",
    401,
  );
  const iterations = parts ? Number(parts[1]) : 600000;
  check(
    Number.isInteger(iterations) && iterations > 0 && iterations <= 2000000,
    "Unsupported password hash.",
    401,
  );
  const salt = parts ? parts[2] : crypto.randomUUID().replaceAll("-", "");
  return `pbkdf2_sha256$${iterations}$${salt}$${base64(pbkdf2(sha256, enc.encode(password), enc.encode(salt), { c: iterations, dkLen: 32 }))}`;
}
function password(value: unknown): string {
  check(
    typeof value === "string" &&
      value.length >= 8 &&
      value.length <= 128 &&
      !/^\d+$/.test(value),
    "Use a password with 8 to 128 characters, including a letter.",
  );
  return value;
}
function signingKey(env: Env) {
  check(env.JWT_SECRET?.length >= 32, "JWT_SECRET is not configured.", 503);
  return enc.encode(env.JWT_SECRET);
}
export async function tokens(
  env: Env,
  user: User,
  clinic: Clinic | null,
): Promise<Row> {
  check(user.is_active, "Account is inactive.", 401);
  if (clinic && !platformAdmin(env, user))
    requireEnabledDiscipline(clinic.discipline, 403);
  check(
    user.email_verified_at ||
      (demoUser(user) && clinic && flag(clinic, "is_demo")),
    "Verify your email before signing in.",
    403,
  );
  check(
    !clinic || clinic.is_active || platformAdmin(env, user),
    "Clinic account is inactive. Contact Ruthva support at ekalaivan@gmail.com or call +91 97910 90710.",
    403,
  );
  const create = (type: string, ttl: number) =>
    new SignJWT({
      token_type: type,
      user_id: user.id,
      clinic_id: user.clinic_id,
      clinic_slug: clinic?.subdomain ?? null,
      role: user.role,
      session_version: user.session_version ?? 0,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setJti(crypto.randomUUID())
      .setExpirationTime(Math.floor(Date.now() / 1000) + ttl)
      .sign(signingKey(env));
  return {
    access: await create("access", 1800),
    refresh: await create("refresh", 604800),
    clinic_slug: clinic?.subdomain ?? null,
  };
}
export async function tokenUser(
  env: Env,
  db: DB,
  token: string,
  type = "access",
): Promise<User> {
  let payload;
  try {
    payload = (
      await jwtVerify(token, signingKey(env), { algorithms: ["HS256"] })
    ).payload;
  } catch {
    throw new ApiError(401, "Token is invalid or expired.");
  }
  check(
    payload.token_type === type && Number.isSafeInteger(payload.user_id),
    "Invalid token.",
    401,
  );
  const user = (await get(db, "users_user", payload.user_id)) as User;
  check(
    user.is_active &&
      user.clinic_id === payload.clinic_id &&
      (payload.session_version ?? 0) === user.session_version,
    "Account or clinic access has changed.",
    401,
  );
  check(
    user.email_verified_at || demoUser(user),
    "Verify your email before signing in.",
    401,
  );
  if (demoUser(user)) {
    const clinic = await get(db, "clinics_clinic", user.clinic_id);
    check(flag(clinic, "is_demo"), "Invalid demo account.", 401);
  }
  return user;
}
const demoUser = (user: User) =>
  str(user, "username") === "demo" && str(user, "email") === "demo@ruthva.com";
export const platformAdmin = (env: Env, user: User): boolean =>
  !!user.is_active &&
  !!user.email_verified_at &&
  (flag(user, "is_superuser") ||
    (!!env.RUTHVA_ADMIN_EMAIL &&
      str(user, "email").toLowerCase() ===
        env.RUTHVA_ADMIN_EMAIL.trim().toLowerCase()));
export async function throttle(
  c: Ctx,
  key: string,
  limit: number,
  seconds = 3600,
) {
  const bucket = Math.floor(Date.now() / 1000 / seconds);
  const result = await stmt(
    dbOf(c),
    "INSERT INTO api_rate_limit(key,bucket,hits) VALUES(?,?,1) ON CONFLICT(key,bucket) DO UPDATE SET hits=hits+1 RETURNING hits",
    [key, bucket],
  ).first<Row>();
  check(
    result && num(result, "hits") <= limit,
    "Too many requests. Try again later.",
    429,
  );
}
export const assertion = (db: DB, sql: string, values: unknown[] = []) =>
  stmt(
    db,
    `INSERT OR REPLACE INTO write_assertion(id,ok) SELECT 1,CASE WHEN (${sql}) THEN 1 ELSE 0 END`,
    values,
  );
export const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
async function otpHash(env: Env, code: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    signingKey(env),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(code))),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
function code() {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(bytes[0] % 1000000).padStart(6, "0");
}
const userOut = (env: Env, user: User, clinic: Row | null) => ({
  ...output("users_user", user, "UserSerializer"),
  clinic: clinic ? output("clinics_clinic", clinic, "ClinicSerializer") : null,
  email_verified_at: user.email_verified_at,
  is_platform_admin: platformAdmin(env, user),
  onboarding_complete: platformAdmin(env, user) || !!user.clinic_id,
});
const email = (body: Row) => {
  const value = str(body, "email").trim().toLowerCase();
  check(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254,
    "Enter a valid email address.",
  );
  return value;
};
const ip = (c: Ctx) => c.req.header("CF-Connecting-IP") || "local";
async function demoSetup(db: DB) {
  const clinics = [
    {
      subdomain: "demo-siddha",
      name: "Sivanethram Demo Clinic",
      discipline: DEFAULT_DISCIPLINE,
    },
  ];
  for (const data of clinics) {
    const item = insert(db, "clinics_clinic", {
      ...data,
      is_demo: 1,
      is_active: 1,
    });
    const existing = await one(
      db,
      "SELECT * FROM clinics_clinic WHERE subdomain=?",
      [data.subdomain],
    );
    check(
      !existing || flag(existing, "is_demo"),
      "Demo clinic configuration is invalid.",
      503,
    );
    if (!existing)
      await stmt(
        db,
        `INSERT OR IGNORE INTO clinics_clinic (${Object.keys(item.row)}) VALUES (${Object.keys(item.row).map(() => "?")})`,
        Object.values(item.row),
      ).run();
  }
  const clinic = await one(
    db,
    "SELECT * FROM clinics_clinic WHERE subdomain='demo-siddha'",
  );
  const item = insert(db, "users_user", {
    username: "demo",
    email: "demo@ruthva.com",
    first_name: "Demo",
    last_name: "Doctor",
    role: "doctor",
    is_clinic_owner: 1,
    clinic_id: clinic!.id,
    is_active: 1,
    password: "!",
    date_joined: now(),
  });
  await stmt(
    db,
    `INSERT OR IGNORE INTO users_user (${Object.keys(item.row)}) VALUES (${Object.keys(item.row).map(() => "?")})`,
    Object.values(item.row),
  ).run();
  const user = await one(
    db,
    "SELECT u.* FROM users_user u JOIN clinics_clinic c ON c.id=u.clinic_id WHERE lower(u.email)='demo@ruthva.com' AND u.username='demo' AND c.is_demo=1",
  );
  check(user, "Demo account configuration is invalid.", 503);
  if (user.clinic_id !== clinic!.id)
    await update(db, "users_user", user.id, { clinic_id: clinic!.id }).run();
}

auth.post("/token/", async (c) => {
  await throttle(c, `login:${ip(c)}`, 20);
  const body = record(await c.req.json()),
    username = str(body, "username"),
    supplied = str(body, "password");
  check(
    username.length <= 254 && supplied.length <= 128,
    "Invalid credentials.",
    401,
  );
  const user = (await one(
    dbOf(c),
    "SELECT * FROM users_user WHERE username=? OR (lower(email)=lower(?) AND email<>'')",
    [username, username],
  )) as User | null;
  const encoded = user?.password || "pbkdf2_sha256$600000$invalid$invalid";
  const candidate = passwordHash(supplied, encoded);
  check(
    user?.is_active && constantEqual(candidate, encoded),
    "No active account found with the given credentials.",
    401,
  );
  const clinic = user.clinic_id
    ? ((await get(dbOf(c), "clinics_clinic", user.clinic_id)) as Clinic)
    : null;
  return c.json(await tokens(c.env, user, clinic));
});
auth.post("/token/refresh/", async (c) => {
  const body = record(await c.req.json()),
    user = await tokenUser(c.env, dbOf(c), str(body, "refresh"), "refresh");
  const clinic = user.clinic_id
    ? ((await get(dbOf(c), "clinics_clinic", user.clinic_id)) as Clinic)
    : null;
  return c.json(await tokens(c.env, user, clinic));
});
auth.post("/sso/exchange/", async (c) => {
  await throttle(c, `sso:${ip(c)}`, 10);
  const body = record(await c.req.json());
  check(/^[a-f0-9]{64}$/i.test(str(body, "token")), "Invalid SSO token.", 401);
  const serviceUrl = c.env.RUTHVA_API_URL;
  check(
    serviceUrl &&
      serviceUrl.startsWith("https://") &&
      c.env.RUTHVA_INTEGRATION_SECRET,
    "SSO service is not configured.",
    503,
  );
  let response;
  try {
    response = await fetch(
      `${serviceUrl.replace(/\/$/, "")}/api/sso/validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Ruthva-Secret": c.env.RUTHVA_INTEGRATION_SECRET,
        },
        body: JSON.stringify({ token: body.token }),
        signal: AbortSignal.timeout(10000),
        redirect: "manual",
      },
    );
  } catch {
    throw new ApiError(502, "Could not reach the SSO service.");
  }
  check(response.ok, "Invalid or expired SSO token.", 401);
  const remote = record(await response.json());
  check(typeof remote.email === "string", "Invalid SSO response.", 502);
  const user = (await one(
    dbOf(c),
    "SELECT * FROM users_user WHERE lower(email)=? AND is_active=1",
    [remote.email.toLowerCase()],
  )) as User | null;
  check(
    user && user.clinic_id,
    "No active clinic account exists for this email.",
    401,
  );
  const clinic = (await get(
    dbOf(c),
    "clinics_clinic",
    user.clinic_id,
  )) as Clinic;
  check(!flag(clinic, "is_demo"), "Demo accounts cannot use SSO.", 403);
  return c.json(await tokens(c.env, user, clinic));
});
auth.post("/request-otp/", async (c) => {
  const body = record(await c.req.json()),
    to = email(body);
  await throttle(c, `otp-ip:${ip(c)}`, 10);
  await throttle(c, `otp:${to}`, 5);
  if (to === "demo@ruthva.com") await demoSetup(dbOf(c));
  const user = await one(
    dbOf(c),
    "SELECT id FROM users_user WHERE lower(email)=? AND is_active=1",
    [to],
  );
  if (user) {
    const value = to === "demo@ruthva.com" ? "123456" : code();
    const item = insert(dbOf(c), "users_emailotp", {
      email: to,
      code_hash: await otpHash(c.env, value),
      expires_at: new Date(Date.now() + 600000).toISOString(),
    });
    await dbOf(c).batch([
      stmt(dbOf(c), "DELETE FROM users_emailotp WHERE lower(email)=?", [to]),
      item.statement,
    ]);
    try {
      if (to !== "demo@ruthva.com")
        await sendEmail(
          c.env,
          to,
          "Your Ruthva login code",
          `<p>Your verification code is <strong>${value}</strong>.</p><p>It expires in 10 minutes.</p>`,
        );
    } catch {
      await stmt(dbOf(c), "DELETE FROM users_emailotp WHERE id=?", [
        item.row.id,
      ]).run();
      throw new ApiError(503, "Email delivery failed. Request a new code.");
    }
  }
  return c.json(
    to === "demo@ruthva.com"
      ? { detail: "Demo mode. Use code 123456.", is_demo: true }
      : { detail: "If this email is registered, a login code has been sent." },
  );
});
auth.post("/verify-otp/", async (c) => {
  const body = record(await c.req.json()),
    to = email(body);
  await throttle(c, `otp-verify:${ip(c)}`, 30);
  const otp = await stmt(
    dbOf(c),
    "UPDATE users_emailotp SET attempts=attempts+1 WHERE id=(SELECT id FROM users_emailotp WHERE lower(email)=? ORDER BY created_at DESC LIMIT 1) AND attempts<5 AND expires_at>? RETURNING *",
    [to, now()],
  ).first<Row>();
  if (!otp)
    check(
      !(await one(
        dbOf(c),
        "SELECT id FROM users_emailotp WHERE id=(SELECT id FROM users_emailotp WHERE lower(email)=? ORDER BY created_at DESC LIMIT 1) AND attempts>=5",
        [to],
      )),
      "Too many attempts. Please request a new code.",
      429,
    );
  check(
    otp &&
      constantEqual(
        str(otp, "code_hash"),
        await otpHash(c.env, str(body, "code")),
      ),
    "Invalid or expired code.",
  );
  const consumed = await stmt(
    dbOf(c),
    "DELETE FROM users_emailotp WHERE id=? RETURNING id",
    [otp.id],
  ).first();
  check(consumed, "Code was already used.");
  const user = (await one(
    dbOf(c),
    "SELECT * FROM users_user WHERE lower(email)=? AND is_active=1",
    [to],
  )) as User | null;
  check(user, "Account is inactive.", 401);
  const verified = demoUser(user)
    ? user
    : await stmt(
        dbOf(c),
        "UPDATE users_user SET session_version=session_version+CASE WHEN email_verified_at IS NULL THEN 1 ELSE 0 END,email_verified_at=coalesce(email_verified_at,?) WHERE id=? AND lower(email)=? AND is_active=1 RETURNING *",
        [now(), user.id, to],
      ).first<User>();
  check(verified, "Account has changed. Request a new code.", 401);
  const clinic = verified.clinic_id
    ? ((await get(dbOf(c), "clinics_clinic", verified.clinic_id)) as Clinic)
    : null;
  return c.json({
    ...(await tokens(c.env, verified, clinic)),
    is_platform_admin: platformAdmin(c.env, verified),
    onboarding_complete: platformAdmin(c.env, verified) || !!verified.clinic_id,
  });
});
auth.post("/initiate-signup/", async (c) => {
  const body = record(await c.req.json()),
    to = email(body);
  requireEnabledDiscipline(body.discipline);
  await throttle(c, `signup:${ip(c)}`, 10);
  await throttle(c, `signup-email:${to}`, 5);
  check(to !== "demo@ruthva.com", "This email is reserved for demo mode.");
  check(
    !(await one(dbOf(c), "SELECT id FROM users_user WHERE lower(email)=?", [
      to,
    ])),
    "This email is already registered.",
  );
  const value = code(),
    data = await validate(
      dbOf(c),
      "users_pendingsignup",
      { ...body, email: to },
      "PendingSignupSerializer",
    );
  const pending = insert(dbOf(c), "users_pendingsignup", {
    ...data,
    otp_code_hash: await otpHash(c.env, value),
    expires_at: new Date(Date.now() + 600000).toISOString(),
  });
  await dbOf(c).batch([
    stmt(dbOf(c), "DELETE FROM users_pendingsignup WHERE email=?", [to]),
    pending.statement,
  ]);
  try {
    await sendEmail(
      c.env,
      to,
      "Your Ruthva verification code",
      `<p>Your verification code is <strong>${value}</strong>.</p><p>It expires in 10 minutes.</p>`,
    );
  } catch {
    await stmt(dbOf(c), "DELETE FROM users_pendingsignup WHERE id=?", [
      pending.row.id,
    ]).run();
    throw new ApiError(503, "Email delivery failed. Request a new code.");
  }
  return c.json({ detail: "Verification code sent.", email: to }, 201);
});
async function verifiedSignup(
  c: Ctx,
  to: string,
  supplied: string,
): Promise<Row> {
  await throttle(c, `signup-verify:${ip(c)}`, 30);
  const pending = await stmt(
    dbOf(c),
    "UPDATE users_pendingsignup SET otp_attempts=otp_attempts+1 WHERE email=? AND otp_attempts<5 AND expires_at>? RETURNING *",
    [to, now()],
  ).first<Row>();
  if (!pending)
    check(
      !(await one(
        dbOf(c),
        "SELECT id FROM users_pendingsignup WHERE email=? AND otp_attempts>=5",
        [to],
      )),
      "Too many attempts. Please start registration again.",
      429,
    );
  check(
    pending &&
      constantEqual(
        str(pending, "otp_code_hash"),
        await otpHash(c.env, supplied),
      ),
    "Invalid or expired code.",
  );
  requireEnabledDiscipline(pending.discipline);
  return pending;
}
auth.post("/verify-signup-otp/", async (c) => {
  const body = record(await c.req.json()),
    to = email(body),
    pending = await verifiedSignup(c, to, str(body, "code"));
  const uid = id();
  const created = insert(dbOf(c), "users_user", {
    id: uid,
    username: `${to.split("@")[0].slice(0, 100)}-${uid}`,
    email: to,
    first_name: pending.first_name,
    last_name: pending.last_name,
    role: "doctor",
    is_clinic_owner: 1,
    is_active: 1,
    password: "!",
    date_joined: now(),
  });
  await dbOf(c).batch([
    assertion(
      dbOf(c),
      "EXISTS(SELECT 1 FROM users_pendingsignup WHERE id=? AND otp_code_hash=?)",
      [pending.id, pending.otp_code_hash],
    ),
    stmt(dbOf(c), "DELETE FROM users_pendingsignup WHERE id=?", [pending.id]),
    created.statement,
    update(dbOf(c), "users_user", uid, { email_verified_at: now() }),
  ]);
  const verified = (await get(dbOf(c), "users_user", uid)) as User;
  return c.json(
    {
      ...(await tokens(c.env, verified, null)),
      user: userOut(c.env, verified, null),
      discipline: pending.discipline,
      is_platform_admin: platformAdmin(c.env, verified),
      onboarding_complete: platformAdmin(c.env, verified),
    },
    201,
  );
});
auth.post("/signup/", async (c) => {
  await throttle(c, `signup:${ip(c)}`, 10);
  const body = record(await c.req.json()),
    slug = str(body, "subdomain");
  requireEnabledDiscipline(body.discipline);
  check(
    str(body, "code"),
    "Email verification is required. Request a signup code first.",
    403,
  );
  const pending = await verifiedSignup(c, email(body), str(body, "code"));
  check(
    str(body, "username") !== "demo" && email(body) !== "demo@ruthva.com",
    "This account is reserved for demo mode.",
  );
  check(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
      slug.length <= 63 &&
      !["www", "api", "admin", "app", "demo"].includes(slug) &&
      !slug.startsWith("demo-"),
    "Invalid clinic subdomain.",
  );
  const clinicData = await validate(
    dbOf(c),
    "clinics_clinic",
    { name: body.clinic_name, subdomain: slug, discipline: body.discipline },
    "ClinicSerializer",
  );
  const clinic = insert(dbOf(c), "clinics_clinic", clinicData);
  const user = insert(dbOf(c), "users_user", {
    username: str(body, "username"),
    email: email(body),
    first_name: str(body, "first_name"),
    last_name: str(body, "last_name"),
    password: passwordHash(password(body.password)),
    clinic_id: clinic.row.id,
    role: "doctor",
    is_clinic_owner: 1,
    is_active: 1,
    date_joined: now(),
  });
  check(
    user.row.username && user.row.first_name,
    "Username and first name are required.",
  );
  await dbOf(c).batch([
    assertion(
      dbOf(c),
      "EXISTS(SELECT 1 FROM users_pendingsignup WHERE id=? AND otp_code_hash=?)",
      [pending.id, pending.otp_code_hash],
    ),
    stmt(dbOf(c), "DELETE FROM users_pendingsignup WHERE id=?", [pending.id]),
    clinic.statement,
    user.statement,
    update(dbOf(c), "users_user", user.row.id, { email_verified_at: now() }),
  ]);
  const verified = (await get(dbOf(c), "users_user", user.row.id)) as User;
  return c.json(
    {
      ...(await tokens(c.env, verified, clinic.row as Clinic)),
      clinic: output("clinics_clinic", clinic.row, "ClinicSerializer"),
      user: userOut(c.env, verified, clinic.row),
    },
    201,
  );
});
auth.post("/check-availability/", async (c) => {
  await throttle(c, `availability:${ip(c)}`, 60);
  const body = record(await c.req.json()),
    field = str(body, "field"),
    value = str(body, "value").trim();
  check(
    ["username", "email", "subdomain"].includes(field) && value,
    "Invalid request.",
  );
  if (
    field === "subdomain" &&
    (["www", "api", "admin", "app", "demo"].includes(value) ||
      value.startsWith("demo-"))
  )
    return c.json({ available: false });
  const taken = await one(
    dbOf(c),
    field === "subdomain"
      ? "SELECT id FROM clinics_clinic WHERE subdomain=?"
      : `SELECT id FROM users_user WHERE ${field}=?`,
    [value],
  );
  return c.json({ available: !taken });
});
auth.post("/complete-onboarding/", async (c) => {
  const user = c.get("user"),
    body = record(await c.req.json());
  requireEnabledDiscipline(body.discipline);
  check(!user.clinic_id, "Onboarding already completed.");
  check(
    str(body, "address") && str(body, "registration_number"),
    "Address and registration number are required.",
  );
  const base = str(body, "clinic_name")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 45);
  check(base, "Clinic name must contain valid characters.");
  const data = await validate(
    dbOf(c),
    "clinics_clinic",
    {
      name: body.clinic_name,
      subdomain: `${base}-${crypto.randomUUID().slice(0, 8)}`,
      discipline: body.discipline,
      address: body.address,
      registration_number: body.registration_number,
      phone: body.phone,
      email: body.email,
    },
    "ClinicSerializer",
  );
  const clinic = insert(dbOf(c), "clinics_clinic", data);
  await dbOf(c).batch([
    assertion(
      dbOf(c),
      "EXISTS(SELECT 1 FROM users_user WHERE id=? AND clinic_id IS NULL)",
      [user.id],
    ),
    clinic.statement,
    update(dbOf(c), "users_user", user.id, {
      clinic_id: clinic.row.id,
      is_clinic_owner: 1,
    }),
  ]);
  return c.json(
    {
      ...(await tokens(
        c.env,
        { ...user, clinic_id: num(clinic.row, "id") },
        clinic.row as Clinic,
      )),
      clinic: output("clinics_clinic", clinic.row, "ClinicSerializer"),
      onboarding_complete: true,
    },
    201,
  );
});
auth.get("/me/", (c) =>
  c.json(userOut(c.env, c.get("user"), c.get("clinic") ?? null)),
);
auth.patch("/me/update/", async (c) => {
  const body = record(await c.req.json()),
    user = c.get("user"),
    data = await validate(
      dbOf(c),
      "users_user",
      body,
      "UserUpdateSerializer",
      user.clinic_id ?? undefined,
      true,
    );
  if (body.new_password) {
    check(
      constantEqual(
        passwordHash(str(body, "current_password"), user.password),
        user.password,
      ),
      "Current password is incorrect.",
    );
    data.password = passwordHash(password(body.new_password));
  }
  let emailChanged = false;
  if (data.email !== undefined) {
    data.email = email(data);
    emailChanged = data.email !== str(user, "email").toLowerCase();
    if (emailChanged) {
      data.email_verified_at = null;
    }
  }
  await dbOf(c).batch([
    assertion(
      dbOf(c),
      "EXISTS(SELECT 1 FROM users_user WHERE id=? AND session_version=? AND email=? AND is_active=1)",
      [user.id, user.session_version, user.email],
    ),
    update(dbOf(c), "users_user", user.id, data),
    ...(emailChanged
      ? [
          stmt(
            dbOf(c),
            "UPDATE users_user SET session_version=session_version+1 WHERE id=?",
            [user.id],
          ),
        ]
      : []),
  ]);
  return c.json(
    userOut(
      c.env,
      (await get(dbOf(c), "users_user", user.id)) as User,
      c.get("clinic") ?? null,
    ),
  );
});
auth.patch("/clinic/update/", async (c) => {
  owner(c);
  const body = record(await c.req.json());
  const data = await validate(
    dbOf(c),
    "clinics_clinic",
    body,
    "ClinicUpdateSerializer",
    c.get("clinic").id,
    true,
  );
  if (data.logo_url)
    check(
      str(data, "logo_url").startsWith(
        `${new URL(c.req.url).origin}/api/v1/media/logos/${c.get("clinic").id}/`,
      ),
      "Use an uploaded clinic logo.",
    );
  await update(dbOf(c), "clinics_clinic", c.get("clinic").id, data).run();
  return c.json(
    output(
      "clinics_clinic",
      await get(dbOf(c), "clinics_clinic", c.get("clinic").id),
      "ClinicSerializer",
    ),
  );
});
auth.post("/demo/switch-clinic/", async (c) => {
  const user = c.get("user");
  check(str(user, "username") === "demo", "Only available in demo mode.", 403);
  const body = record(await c.req.json()),
    clinic = (await one(
      dbOf(c),
      "SELECT * FROM clinics_clinic WHERE subdomain=? AND is_demo=1 AND is_active=1",
      [body.clinic_slug],
    )) as Clinic | null;
  check(clinic, "Demo clinic not found.", 404);
  requireEnabledDiscipline(clinic.discipline, 403);
  await update(dbOf(c), "users_user", user.id, { clinic_id: clinic.id }).run();
  return c.json(await tokens(c.env, { ...user, clinic_id: clinic.id }, clinic));
});

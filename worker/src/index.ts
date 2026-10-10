import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { ApiError, check, flag, get, str } from "./data";
import type { App, Clinic } from "./data";
import { auth, escape, platformAdmin, tokenUser } from "./auth";
import { admin } from "./admin";
import { clinical } from "./clinical";
import { team, invite } from "./team";
import { treatments } from "./treatments";
import { integrations } from "./integrations";
import { portability } from "./portability";
import { reports } from "./reports";
import { resources, reminders, cron } from "./resources";
import type { Env } from "./data";

const app = new Hono<App>({
  getPath: (request) =>
    new URL(request.url).pathname.replace(/\.json\/?$/, "/"),
});
app.use("*", async (c, next) => {
  c.set("db", c.env.DB.withSession("first-primary"));
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "no-store");
});
app.use(
  "*",
  cors({
    origin: (origin, c) =>
      String(c.env.CORS_ALLOWED_ORIGINS)
        .split(",")
        .map((x) => x.trim())
        .includes(origin)
        ? origin
        : "",
    allowHeaders: ["Authorization", "Content-Type", "X-Clinic-Slug"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use("*", bodyLimit({ maxSize: 5 * 1024 * 1024 }));
const publicPaths = new Set([
  "/api/health/",
  "/api/cron/",
  "/api/schema/",
  "/api/docs/",
  ...[
    "signup",
    "initiate-signup",
    "verify-signup-otp",
    "check-availability",
    "token",
    "token/refresh",
    "request-otp",
    "verify-otp",
    "sso/exchange",
  ].map((x) => `/api/v1/auth/${x}/`),
  "/api/v1/invite/details/",
  "/api/v1/invite/accept/",
  "/api/v1/integrations/webhooks/ruthva/",
]);
app.use("*", async (c, next) => {
  if (
    publicPaths.has(c.req.path) ||
    c.req.path.startsWith("/api/v1/media/logos/")
  )
    return next();
  const header = c.req.header("Authorization") || "";
  check(
    header.startsWith("Bearer "),
    "Authentication credentials were not provided.",
    401,
  );
  const user = await tokenUser(c.env, c.get("db"), header.slice(7));
  c.set("user", user);
  if (c.req.path.startsWith("/api/v1/admin/")) {
    check(platformAdmin(c.env, user), "Ruthva admin access is required.", 403);
    return next();
  }
  if (user.clinic_id) {
    const clinic = (await get(
      c.get("db"),
      "clinics_clinic",
      user.clinic_id,
    )) as Clinic;
    check(
      clinic.is_active ||
        (c.req.path === "/api/v1/auth/me/" && platformAdmin(c.env, user)),
      "Clinic account is inactive. Contact Ruthva support at ekalaivan@gmail.com or call +91 97910 90710.",
      403,
    );
    const slug = c.req.header("X-Clinic-Slug");
    check(
      !slug || slug === clinic.subdomain,
      "Token not valid for this clinic.",
      403,
    );
    const hostname = new URL(c.req.url).hostname,
      base = new URL(c.env.FRONTEND_URL).hostname;
    if (hostname.endsWith(`.${base}`))
      check(
        hostname.slice(0, -(base.length + 1)) === clinic.subdomain,
        "Token not valid for this clinic.",
        403,
      );
    c.set("clinic", clinic);
    if (
      !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
      flag(clinic, "is_demo") &&
      c.req.path !== "/api/v1/auth/demo/switch-clinic/"
    )
      check(false, "Demo accounts are read-only.", 403);
  } else
    check(
      [
        "/api/v1/auth/me/",
        "/api/v1/auth/me/update/",
        "/api/v1/auth/complete-onboarding/",
      ].includes(c.req.path),
      "Complete clinic onboarding first.",
      403,
    );
  await next();
});
app.get("/api/health/", (c) =>
  c.json({ status: "ok", app: "ayush-clinic-platform" }),
);
app.post("/api/cron/", cron);
app.route("/api/v1/auth", auth);
app.route("/api/v1/admin", admin);
app.route("/api/v1/team/", team);
app.route("/api/v1/invite", invite);
app.route("/api/v1/treatments", treatments);
app.route("/api/v1", portability);
app.route("/api/v1", integrations);
app.route("/api/v1", reports);
app.route("/api/v1", resources);
app.route("/api/v1", clinical);
app.get("/api/schema/", (c) => {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of app.routes) {
    if (
      route.method === "ALL" ||
      route.path.includes("*") ||
      !route.path.startsWith("/api/")
    )
      continue;
    const path = route.path.replace(/:([a-z_]+)/g, "{$1}");
    paths[path] ??= {};
    paths[path][route.method.toLowerCase()] = {
      responses: { "200": { description: "Success" } },
      parameters: [...path.matchAll(/\{(\w+)\}/g)].map((match) => ({
        name: match[1],
        in: "path",
        required: true,
        schema: { type: "integer" },
      })),
      ...(publicPaths.has(route.path)
        ? {}
        : { security: [{ bearerAuth: [] }] }),
    };
  }
  return c.json({
    openapi: "3.0.3",
    info: { title: "Ruthva Clinic API", version: "1.0.0" },
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  });
});
app.get("/api/docs/", (c) =>
  c.html(
    `<!doctype html><html lang="en"><title>Ruthva API</title><h1>Ruthva Clinic API</h1><p><a href="/api/schema/">OpenAPI schema</a></p><p>Send a bearer token and use the clinic returned by authentication.</p><ul>${app.routes
      .filter((route) => route.method !== "ALL")
      .map(
        (route) =>
          `<li><code>${escape(route.method)} ${escape(route.path)}</code></li>`,
      )
      .join("")}</ul></html>`,
  ),
);
app.notFound((c) => c.json({ detail: "Not found." }, 404));
app.onError((error, c) => {
  if (error instanceof ApiError)
    return c.json(
      typeof error.details === "string"
        ? { detail: error.details }
        : error.details,
      error.status as 400,
    );
  if (error instanceof SyntaxError)
    return c.json({ detail: "Invalid JSON request." }, 400);
  if (
    error.message.includes(
      "UNIQUE constraint failed: consultations_consultation.clinic_id, consultations_consultation.patient_id, consultations_consultation.consultation_date",
    )
  )
    return c.json(
      {
        detail:
          "A visit already exists for this patient on this date. Open the existing visit from the patient's history to make changes.",
      },
      409,
    );
  if (/constraint|Active patient limit|another clinic/i.test(error.message))
    return c.json(
      {
        detail:
          "This change violates a data constraint. Check limits, uniqueness, related records, and stock.",
      },
      409,
    );
  console.error("API request failed", {
    path: c.req.path,
    error: error.message,
  });
  return c.json({ detail: "The request could not be completed." }, 500);
});
export default {
  fetch: app.fetch,
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    const localHour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date(controller.scheduledTime)),
    );
    ctx.waitUntil(
      reminders(env, localHour >= 8).then((result) => {
        if (result.failed)
          throw new Error(`${result.failed} reminder emails failed.`);
      }),
    );
  },
};

import { Hono } from "hono";
import {
  all,
  check,
  dbOf,
  flag,
  get,
  id,
  now,
  num,
  one,
  record,
  stmt,
  str,
} from "./data";
import type { App, Row } from "./data";
import { assertion, platformAdmin, throttle } from "./auth";

export const admin = new Hono<App>();
const ownerJoin = `LEFT JOIN users_user u ON u.id=(SELECT id FROM users_user WHERE clinic_id=c.id AND is_clinic_owner=1 ORDER BY date_joined,id LIMIT 1)`;
const accountStatus = `CASE WHEN u.email_verified_at IS NULL THEN 'pending_verification' WHEN c.is_active=1 THEN 'active' ELSE 'inactive' END`;
const clinicColumns = `c.id,c.name,c.subdomain,c.discipline,c.is_active,c.created_at,u.id AS owner_id,u.first_name,u.last_name,u.email AS owner_email,u.email_verified_at,u.is_active AS owner_active,(SELECT count(*) FROM users_user WHERE clinic_id=c.id) AS member_count,${accountStatus} AS status`;
const clinicOutput = (row: Row) => ({
  id: row.id,
  name: row.name,
  subdomain: row.subdomain,
  discipline: row.discipline,
  is_active: flag(row, "is_active"),
  status: row.status,
  created_at: row.created_at,
  member_count: row.member_count,
  can_activate: flag(row, "owner_active") && !!row.email_verified_at,
  owner: row.owner_id
    ? {
        id: row.owner_id,
        name: `${str(row, "first_name")} ${str(row, "last_name")}`.trim(),
        email: row.owner_email,
        email_verified_at: row.email_verified_at,
      }
    : null,
});

admin.use("*", async (c, next) => {
  check(
    platformAdmin(c.env, c.get("user")),
    "Ruthva admin access is required.",
    403,
  );
  await next();
});
admin.get("/clinics/", async (c) => {
  const search = (c.req.query("search") ?? "").trim(),
    status = c.req.query("status") ?? "all",
    page = Number(c.req.query("page") ?? 1);
  check(search.length <= 254, "Search is too long.");
  check(
    ["all", "active", "inactive", "pending_verification"].includes(status),
    "Invalid account status.",
  );
  check(
    Number.isSafeInteger(page) && page > 0 && page <= 100000,
    "Invalid page.",
  );
  const where = ["c.is_demo=0"],
    values: unknown[] = [];
  if (status !== "all") {
    where.push(`${accountStatus}=?`);
    values.push(status);
  }
  if (search) {
    where.push(
      "(c.name LIKE ? ESCAPE '\\' OR c.subdomain LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\')",
    );
    const term = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    values.push(term, term, term);
  }
  const from = `FROM clinics_clinic c ${ownerJoin} WHERE ${where.join(" AND ")}`;
  const count = await one(dbOf(c), `SELECT count(*) AS total ${from}`, values);
  const results = await all(
    dbOf(c),
    `SELECT ${clinicColumns} ${from} ORDER BY c.created_at DESC,c.id DESC LIMIT 25 OFFSET ?`,
    [...values, (page - 1) * 25],
  );
  return c.json({
    count: num(count!, "total"),
    page,
    results: results.map(clinicOutput),
  });
});
admin.patch("/clinics/:pk/status/", async (c) => {
  const pk = Number(c.req.param("pk")),
    body = record(await c.req.json());
  check(Number.isSafeInteger(pk) && pk > 0, "Invalid clinic ID.");
  check(typeof body.is_active === "boolean", "is_active must be boolean.");
  await throttle(c, `clinic-status:${c.get("user").id}`, 60);
  const clinic = await get(dbOf(c), "clinics_clinic", pk);
  check(!flag(clinic, "is_demo"), "Demo clinic status cannot be changed.");
  const active = Number(body.is_active);
  if (active) {
    check(
      await one(
        dbOf(c),
        "SELECT id FROM users_user WHERE clinic_id=? AND is_clinic_owner=1 AND is_active=1 AND email_verified_at IS NOT NULL",
        [pk],
      ),
      "The clinic owner must verify their email before activation.",
      409,
    );
  }
  await dbOf(c).batch([
    ...(active
      ? [
          assertion(
            dbOf(c),
            "EXISTS(SELECT 1 FROM users_user WHERE clinic_id=? AND is_clinic_owner=1 AND is_active=1 AND email_verified_at IS NOT NULL)",
            [pk],
          ),
        ]
      : []),
    stmt(
      dbOf(c),
      "INSERT INTO clinic_account_audit(id,clinic_id,actor_id,previous_active,is_active,created_at) SELECT ?,id,?,is_active,?,? FROM clinics_clinic WHERE id=? AND is_active<>?",
      [id(), c.get("user").id, active, now(), pk, active],
    ),
    stmt(
      dbOf(c),
      "UPDATE users_user SET session_version=session_version+1 WHERE clinic_id=? AND is_superuser=0 AND (lower(email)<>lower(?) OR email_verified_at IS NULL) AND EXISTS(SELECT 1 FROM clinics_clinic WHERE id=? AND is_active<>?)",
      [pk, c.env.RUTHVA_ADMIN_EMAIL?.trim() ?? "", pk, active],
    ),
    stmt(
      dbOf(c),
      "UPDATE clinics_clinic SET is_active=? WHERE id=? AND is_active<>?",
      [active, pk, active],
    ),
  ]);
  const result = await one(
    dbOf(c),
    `SELECT ${clinicColumns} FROM clinics_clinic c ${ownerJoin} WHERE c.id=?`,
    [pk],
  );
  return c.json(clinicOutput(result!));
});

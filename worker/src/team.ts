import { Hono } from "hono";
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
  validate,
} from "./data";
import type { App, Clinic, Ctx, Row, User } from "./data";
import { assertion, escape, passwordHash, throttle, tokens } from "./auth";
import { sendEmail } from "./email";

export const team = new Hono<App>();
export const invite = new Hono<App>();
const roles = ["doctor", "therapist", "admin"];
function capacity(c: Ctx, role: string, subtract = 0, clinic = clinicOf(c)) {
  return assertion(
    dbOf(c),
    `(SELECT count(*) FROM users_user WHERE clinic_id=? AND role=?) + (SELECT count(*) FROM clinics_clinicinvitation WHERE clinic_id=? AND role=? AND accepted_at IS NULL AND expires_at>?) - ? < (SELECT CASE WHEN plan='pro' THEN 10 ELSE 1 END FROM clinics_clinic WHERE id=?)`,
    [clinic, role, clinic, role, now(), subtract, clinic],
  );
}
async function invitationOutput(c: Ctx, row: Row) {
  const user = await get(dbOf(c), "users_user", row.invited_by_id);
  return output("clinics_clinicinvitation", row, "InvitationSerializer", {
    invited_by_name:
      `${str(user, "first_name")} ${str(user, "last_name")}`.trim() ||
      user.username,
  });
}
team.get("/", async (c) =>
  c.json(
    (
      await all(
        dbOf(c),
        "SELECT * FROM users_user WHERE clinic_id=? ORDER BY is_clinic_owner DESC,first_name,last_name",
        [clinicOf(c)],
      )
    ).map((row) => output("users_user", row, "TeamMemberSerializer")),
  ),
);
team.get("/limits/", async (c) => {
  const slots: Record<string, Row> = {};
  for (const role of roles) {
    const counts = await one(
      dbOf(c),
      "SELECT (SELECT count(*) FROM users_user WHERE clinic_id=? AND role=?)+(SELECT count(*) FROM clinics_clinicinvitation WHERE clinic_id=? AND role=? AND accepted_at IS NULL AND expires_at>?) used",
      [clinicOf(c), role, clinicOf(c), role, now()],
    );
    const used = num(counts!, "used"),
      limit = c.get("clinic").plan === "pro" ? 10 : 1;
    slots[role] = { used, limit, available: used < limit };
  }
  return c.json({
    plan: c.get("clinic").plan,
    slots,
    all_slots_full: roles.every((role) => !slots[role].available),
  });
});
team.get("/invitations/", async (c) => {
  owner(c);
  return c.json(
    await Promise.all(
      (
        await all(
          dbOf(c),
          "SELECT * FROM clinics_clinicinvitation WHERE clinic_id=? ORDER BY created_at DESC",
          [clinicOf(c)],
        )
      ).map((row) => invitationOutput(c, row)),
    ),
  );
});
const createInvite = async (c: Ctx) => {
  owner(c);
  await throttle(c, `invite:${c.get("user").id}`, 30);
  const body = record(await c.req.json()),
    data = await validate(
      dbOf(c),
      "clinics_clinicinvitation",
      body,
      "InviteMemberSerializer",
      clinicOf(c),
    );
  data.email = str(data, "email").toLowerCase();
  check(
    !(await one(dbOf(c), "SELECT id FROM users_user WHERE lower(email)=?", [
      data.email,
    ])),
    "This email already has an account.",
  );
  const created = insert(dbOf(c), "clinics_clinicinvitation", {
    ...data,
    clinic_id: clinicOf(c),
    invited_by_id: c.get("user").id,
    expires_at: new Date(Date.now() + 604800000).toISOString(),
  });
  await dbOf(c).batch([
    capacity(c, str(data, "role")),
    stmt(
      dbOf(c),
      "DELETE FROM clinics_clinicinvitation WHERE clinic_id=? AND email=? AND accepted_at IS NULL AND expires_at<=?",
      [clinicOf(c), data.email, now()],
    ),
    created.statement,
  ]);
  const token = str(created.row, "token"),
    link = `${c.env.FRONTEND_URL}/invite/accept?token=${token}`;
  let sent = true;
  try {
    await sendEmail(
      c.env,
      str(data, "email"),
      `Join ${str(c.get("clinic"), "name")}`,
      `<p>${escape(c.get("clinic").name)} invited you as a ${escape(data.role)}.</p><p><a href="${escape(link)}">Accept invitation</a></p>`,
    );
  } catch {
    sent = false;
  }
  return c.json(
    { ...(await invitationOutput(c, created.row)), email_sent: sent },
    201,
  );
};
team.post("/invite/", createInvite);
team.post("/invitations/", createInvite);
team.patch("/:pk/role/", async (c) => {
  owner(c);
  const user = await get(dbOf(c), "users_user", c.req.param("pk"), clinicOf(c)),
    body = record(await c.req.json());
  check(
    !flag(user, "is_clinic_owner"),
    "The clinic owner's role cannot be changed.",
  );
  check(roles.includes(str(body, "role")), "Invalid role.");
  if (body.role !== user.role)
    await dbOf(c).batch([
      capacity(c, str(body, "role")),
      update(dbOf(c), "users_user", user.id, { role: body.role }, clinicOf(c)),
    ]);
  return c.json(
    output(
      "users_user",
      await get(dbOf(c), "users_user", user.id, clinicOf(c)),
      "TeamMemberSerializer",
    ),
  );
});
team.delete("/invitations/:pk/", async (c) => {
  owner(c);
  const item = await get(
    dbOf(c),
    "clinics_clinicinvitation",
    c.req.param("pk"),
    clinicOf(c),
  );
  check(item.accepted_at === null, "Accepted invitations cannot be cancelled.");
  await stmt(
    dbOf(c),
    "DELETE FROM clinics_clinicinvitation WHERE id=? AND clinic_id=?",
    [item.id, clinicOf(c)],
  ).run();
  return c.body(null, 204);
});
team.delete("/:pk/", async (c) => {
  owner(c);
  const user = await get(dbOf(c), "users_user", c.req.param("pk"), clinicOf(c));
  check(!flag(user, "is_clinic_owner"), "The clinic owner cannot be removed.");
  await update(
    dbOf(c),
    "users_user",
    user.id,
    { is_active: 0, clinic_id: null },
    clinicOf(c),
  ).run();
  return c.body(null, 204);
});
async function getInvite(c: Ctx, token: string) {
  check(/^[a-f0-9-]{32,36}$/i.test(token), "Invalid invitation.", 404);
  const invitation = await one(
    dbOf(c),
    "SELECT * FROM clinics_clinicinvitation WHERE token=? AND accepted_at IS NULL",
    [token.replaceAll("-", "")],
  );
  check(invitation, "Invalid or already used invitation.", 404);
  check(
    str(invitation, "expires_at") > now(),
    "This invitation has expired.",
    410,
  );
  return invitation;
}
invite.get("/details/", async (c) => {
  await throttle(
    c,
    `invite-details:${c.req.header("CF-Connecting-IP") || "local"}`,
    60,
  );
  const item = await getInvite(c, c.req.query("token") || ""),
    clinic = await get(dbOf(c), "clinics_clinic", item.clinic_id);
  check(flag(clinic, "is_active"), "Clinic is inactive.", 403);
  return c.json({
    email: item.email,
    first_name: item.first_name,
    last_name: item.last_name,
    role: item.role,
    clinic_name: clinic.name,
    logo_url: clinic.logo_url,
  });
});
invite.post("/accept/", async (c) => {
  await throttle(
    c,
    `invite-accept:${c.req.header("CF-Connecting-IP") || "local"}`,
    20,
  );
  const body = record(await c.req.json()),
    item = await getInvite(c, str(body, "token")),
    clinic = (await get(dbOf(c), "clinics_clinic", item.clinic_id)) as Clinic;
  check(
    clinic.is_active && !flag(clinic, "is_demo"),
    "Clinic is inactive.",
    403,
  );
  const username = str(body, "username"),
    pass = str(body, "password");
  check(/^[\w.@+-]{1,150}$/.test(username), "Invalid username.");
  check(username !== "demo", "This username is reserved for demo mode.");
  check(
    pass.length >= 8 && pass.length <= 128 && !/^\d+$/.test(pass),
    "Use a password with 8 to 128 characters, including a letter.",
  );
  const user = insert(dbOf(c), "users_user", {
    username,
    email: item.email,
    first_name: item.first_name,
    last_name: item.last_name,
    role: item.role,
    clinic_id: clinic.id,
    password: passwordHash(pass),
    is_active: 1,
    date_joined: now(),
  });
  await dbOf(c).batch([
    assertion(
      dbOf(c),
      "EXISTS(SELECT 1 FROM clinics_clinicinvitation WHERE id=? AND accepted_at IS NULL AND expires_at>?)",
      [item.id, now()],
    ),
    capacity(c, str(item, "role"), 1, clinic.id),
    update(dbOf(c), "clinics_clinicinvitation", item.id, {
      accepted_at: now(),
    }),
    user.statement,
    update(dbOf(c), "users_user", user.row.id, { email_verified_at: now() }),
  ]);
  const verified = (await get(dbOf(c), "users_user", user.row.id)) as User;
  return c.json(
    {
      user: output("users_user", verified, "UserSerializer"),
      ...(await tokens(c.env, verified, clinic)),
    },
    201,
  );
});

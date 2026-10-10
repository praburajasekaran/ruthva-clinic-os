import { Hono } from "hono";
import {
  all,
  check,
  clinicOf,
  dbOf,
  doctor,
  get,
  id,
  now,
  num,
  one,
  record,
  stmt,
  str,
  today,
} from "./data";
import type { App, Ctx, Row } from "./data";

export const contactFollowUps = new Hono<App>();
type Status = "open" | "awaiting_doctor" | "completed";
type Action =
  | "reached"
  | "no_answer"
  | "call_later"
  | "question"
  | "doctor_reply"
  | "reopen"
  | "assign";
const transitions: Record<
  Action,
  {
    from: Status[];
    to?: Status;
    doctorOnly?: boolean;
    retry?: boolean;
    note?: boolean;
  }
> = {
  reached: { from: ["open"], to: "completed" },
  no_answer: { from: ["open"], retry: true },
  call_later: { from: ["open"], retry: true },
  question: { from: ["open"], to: "awaiting_doctor", note: true },
  doctor_reply: {
    from: ["awaiting_doctor"],
    to: "open",
    doctorOnly: true,
    note: true,
  },
  reopen: { from: ["completed"], to: "open", doctorOnly: true, retry: true },
  assign: { from: ["open", "awaiting_doctor"], doctorOnly: true },
};
const query = `SELECT t.*,p.name patient_name,p.record_id patient_record_id,p.phone,p.whatsapp_number,r.follow_up_date clinical_return_date,coalesce(nullif(trim(u.first_name||' '||u.last_name),''),u.username,'Unassigned') assigned_to_name FROM contact_followup t JOIN patients_patient p ON p.id=t.patient_id LEFT JOIN users_user u ON u.id=t.assigned_to_id LEFT JOIN prescriptions_prescription r ON r.id=t.prescription_id`;

function access(c: Ctx) {
  check(
    ["doctor", "admin"].includes(c.get("user").role),
    "Patient contact follow-ups require doctor or admin access.",
    403,
  );
}
function contactDate(value: unknown) {
  check(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    "Enter a valid contact date.",
  );
  return value;
}
async function assignee(c: Ctx, value: unknown) {
  const user = await get(dbOf(c), "users_user", value, clinicOf(c));
  check(
    user.is_active && ["doctor", "admin"].includes(str(user, "role")),
    "Choose an active doctor or admin in this clinic.",
  );
  return Number(user.id);
}
async function task(c: Ctx) {
  access(c);
  const result = await one(dbOf(c), `${query} WHERE t.id=? AND t.clinic_id=?`, [
    c.req.param("pk"),
    clinicOf(c),
  ]);
  check(result, "Follow-up not found.", 404);
  check(
    c.get("user").role === "doctor" ||
      result.assigned_to_id === c.get("user").id,
    "This follow-up is assigned to another staff member.",
    403,
  );
  return result;
}

contactFollowUps.get("/contact-follow-ups/staff/", async (c) => {
  doctor(c);
  return c.json(
    await all(
      dbOf(c),
      "SELECT id,role,coalesce(nullif(trim(first_name||' '||last_name),''),username) name FROM users_user WHERE clinic_id=? AND is_active=1 AND role IN ('doctor','admin') ORDER BY role,name,id",
      [clinicOf(c)],
    ),
  );
});
contactFollowUps.get("/contact-follow-ups/counts/", async (c) => {
  access(c);
  const assigned = c.get("user").role === "admin" ? c.get("user").id : null;
  return c.json(
    await one(
      dbOf(c),
      "SELECT coalesce(sum(status='open'),0) open,coalesce(sum(status='open' AND contact_date<=?),0) due,coalesce(sum(status='awaiting_doctor'),0) awaiting_doctor FROM contact_followup WHERE clinic_id=? AND (? IS NULL OR assigned_to_id=?)",
      [today(), clinicOf(c), assigned, assigned],
    ),
  );
});
contactFollowUps.get("/contact-follow-ups/", async (c) => {
  access(c);
  const status = c.req.query("status") || "open";
  check(
    ["open", "awaiting_doctor", "completed"].includes(status),
    "Invalid follow-up status.",
  );
  const predicates = ["t.clinic_id=?", "t.status=?"],
    values: unknown[] = [clinicOf(c), status];
  if (c.get("user").role === "admin") {
    predicates.push("t.assigned_to_id=?");
    values.push(c.get("user").id);
  }
  if (c.req.query("patient")) {
    predicates.push("t.patient_id=?");
    values.push(c.req.query("patient"));
  }
  if (c.req.query("due") === "true") {
    predicates.push("t.contact_date<=?");
    values.push(today());
  }
  const page = Math.max(
    1,
    Number.parseInt(c.req.query("page") || "1", 10) || 1,
  );
  const where = predicates.join(" AND ");
  const count = await one(
    dbOf(c),
    `SELECT count(*) count FROM contact_followup t WHERE ${where}`,
    values,
  );
  return c.json({
    count: count?.count ?? 0,
    results: await all(
      dbOf(c),
      `${query} WHERE ${where} ORDER BY t.contact_date,t.id LIMIT 20 OFFSET ?`,
      [...values, (page - 1) * 20],
    ),
  });
});
contactFollowUps.post("/contact-follow-ups/", async (c) => {
  doctor(c);
  const body = record(await c.req.json()),
    db = dbOf(c),
    clinic = clinicOf(c);
  const patient = await get(db, "patients_patient", body.patient_id, clinic);
  const assigned = await assignee(c, body.assigned_to_id ?? c.get("user").id);
  const date = contactDate(body.contact_date),
    reason = str(body, "reason").trim(),
    requestId = str(body, "request_id");
  check(
    reason.length > 0 && reason.length <= 2000,
    "Enter a reason of at most 2000 characters.",
  );
  check(
    /^[a-zA-Z0-9-]{16,80}$/.test(requestId),
    "Provide a unique request ID.",
  );
  const rx = await one(
    db,
    "SELECT r.id FROM prescriptions_prescription r JOIN consultations_consultation c ON c.id=r.consultation_id WHERE c.patient_id=? AND r.clinic_id=? ORDER BY c.consultation_date DESC,r.id DESC LIMIT 1",
    [patient.id, clinic],
  );
  await stmt(
    db,
    "INSERT INTO contact_followup (id,clinic_id,patient_id,prescription_id,created_by_id,assigned_to_id,request_id,reason,contact_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(clinic_id,request_id) DO NOTHING",
    [
      id(),
      clinic,
      patient.id,
      rx?.id ?? null,
      c.get("user").id,
      assigned,
      requestId,
      reason,
      date,
      now(),
      now(),
    ],
  ).run();
  const created = await one(
    db,
    `${query} WHERE t.clinic_id=? AND t.request_id=?`,
    [clinic, requestId],
  );
  check(
    created &&
      created.patient_id === patient.id &&
      created.assigned_to_id === assigned &&
      created.reason === reason &&
      created.contact_date === date,
    "This request ID was already used for a different follow-up.",
    409,
  );
  return c.json(created, 201);
});
contactFollowUps.get("/contact-follow-ups/:pk/", async (c) => {
  const result = await task(c);
  const events = await all(
    dbOf(c),
    "SELECT e.*,coalesce(nullif(trim(u.first_name||' '||u.last_name),''),u.username,'Former staff') actor_name,coalesce(nullif(trim(a.first_name||' '||a.last_name),''),a.username) assigned_to_name FROM contact_followup_event e LEFT JOIN users_user u ON u.id=e.actor_id LEFT JOIN users_user a ON a.id=e.assigned_to_id WHERE e.task_id=? ORDER BY e.created_at DESC,e.id DESC LIMIT 100",
    [result.id],
  );
  const count = await one(
    dbOf(c),
    "SELECT count(*) count FROM contact_followup_event WHERE task_id=?",
    [result.id],
  );
  return c.json({ ...result, events, event_count: count?.count ?? 0 });
});
contactFollowUps.post("/contact-follow-ups/:pk/events/", async (c) => {
  const original = await task(c),
    body = record(await c.req.json()),
    action = str(body, "action") as Action;
  check(Object.hasOwn(transitions, action), "Invalid follow-up action.");
  const transition = transitions[action];
  if (transition.doctorOnly) doctor(c);
  check(
    Number.isInteger(body.expected_revision) &&
      body.expected_revision === original.revision,
    "This follow-up changed. Reload it before saving.",
    409,
  );
  check(
    transition.from.includes(original.status as Status),
    "This action is not available in the current follow-up state.",
    409,
  );
  const note = str(body, "note").trim();
  check(
    note.length <= 4000 && (!transition.note || !!note),
    "Enter a note of at most 4000 characters.",
  );
  const date = transition.retry
    ? contactDate(body.next_contact_date)
    : str(original, "contact_date");
  if (transition.retry)
    check(
      date >= today(),
      "Choose today or a future date for the next contact.",
    );
  const assigned =
    action === "assign"
      ? await assignee(c, body.assigned_to_id)
      : original.assigned_to_id;
  const eventId = id(),
    timestamp = now();
  const batch = await dbOf(c).batch([
    stmt(
      dbOf(c),
      "UPDATE contact_followup SET status=?,contact_date=?,assigned_to_id=?,revision=revision+1,last_event_id=?,updated_at=? WHERE id=? AND clinic_id=? AND revision=?",
      [
        transition.to ?? original.status,
        date,
        assigned,
        eventId,
        timestamp,
        original.id,
        clinicOf(c),
        original.revision,
      ],
    ),
    stmt(
      dbOf(c),
      "INSERT INTO contact_followup_event (id,task_id,actor_id,action,note,next_contact_date,assigned_to_id,created_at) SELECT ?,id,?,?,?,?,?,? FROM contact_followup WHERE id=? AND last_event_id=? AND revision=?",
      [
        eventId,
        c.get("user").id,
        action,
        note,
        transition.retry ? date : null,
        action === "assign" ? assigned : null,
        timestamp,
        original.id,
        eventId,
        num(original, "revision") + 1,
      ],
    ),
  ]);
  check(
    batch[0].meta.changes === 1 && batch[1].meta.changes === 1,
    "This follow-up changed. Reload it before saving.",
    409,
  );
  return c.json(
    await one(dbOf(c), `${query} WHERE t.id=? AND t.clinic_id=?`, [
      original.id,
      clinicOf(c),
    ]),
  );
});

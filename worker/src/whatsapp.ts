import { Hono } from "hono";
import {
  all,
  check,
  clinicOf,
  dbOf,
  get,
  now,
  one,
  record,
  stmt,
  str,
  today,
} from "./data";
import type { App, Ctx, Row } from "./data";
import { assertion } from "./auth";

type MessageKind = "prescription" | "reminder";
const frequency: Record<string, string> = {
  OD: "Once daily",
  BD: "Twice daily",
  TDS: "Three times daily",
  QID: "Four times daily",
  SOS: "As needed",
  HS: "At bedtime",
};
const timing: Record<string, string> = {
  before_food: "Before food",
  after_food: "After food",
  with_food: "With food",
  empty_stomach: "On an empty stomach",
};
const textFields = (row: Row, keys: string[]) =>
  keys
    .map((key) => str(row, key).trim())
    .filter(Boolean)
    .join("\n");

function messageKind(value: unknown): MessageKind {
  check(
    value === "prescription" || value === "reminder",
    "Invalid message kind.",
  );
  return value;
}

function recipientNumber(value: string): string | null {
  if (!/^[+\d\s()-]+$/.test(value)) return null;
  const compact = value.replace(/[\s()-]/g, "");
  if (/^[6-9]\d{9}$/.test(compact)) return `91${compact}`;
  if (/^\d{10}$/.test(compact)) return null;
  const international = compact.startsWith("00")
    ? compact.slice(2)
    : compact.replace(/^\+/, "");
  return /^[1-9]\d{7,14}$/.test(international) && !international.includes("+")
    ? international
    : null;
}

async function preference(c: Ctx, patientId: unknown) {
  return (
    (await one(
      dbOf(c),
      "SELECT status,updated_at FROM whatsapp_preferences WHERE clinic_id=? AND patient_id=?",
      [clinicOf(c), patientId],
    )) ?? { status: "not_recorded", updated_at: null }
  );
}

async function draft(c: Ctx, prescriptionId: unknown, kind: MessageKind) {
  const rx = await get(
    dbOf(c),
    "prescriptions_prescription",
    prescriptionId,
    clinicOf(c),
  );
  const visit = await get(
    dbOf(c),
    "consultations_consultation",
    rx.consultation_id,
    clinicOf(c),
  );
  const patient = await get(
    dbOf(c),
    "patients_patient",
    visit.patient_id,
    clinicOf(c),
  );
  const clinic = c.get("clinic");
  const contact =
    str(patient, "whatsapp_number").trim() || str(patient, "phone").trim();
  const recipient = recipientNumber(contact);
  const lines = [`Hello ${patient.name},`, "", str(clinic, "name")];
  if (kind === "reminder") {
    check(rx.follow_up_date, "This prescription has no follow-up date.");
    lines.push(
      `Your follow-up is due on ${rx.follow_up_date}.`,
      "Contact the clinic to confirm your visit.",
    );
  } else {
    lines.push(
      `Prescription dated ${visit.consultation_date}`,
      `Patient record: ${patient.record_id}`,
    );
    const physician = visit.conducted_by_id
      ? await get(dbOf(c), "users_user", visit.conducted_by_id, clinicOf(c))
      : null;
    if (physician)
      lines.push(
        `Dr. ${textFields(physician, ["first_name", "last_name"]).replaceAll("\n", " ")}`,
      );
    const meds = await all(
      dbOf(c),
      "SELECT * FROM prescriptions_medication WHERE prescription_id=? ORDER BY sort_order,id",
      [rx.id],
    );
    const procedures = await all(
      dbOf(c),
      "SELECT * FROM prescriptions_procedureentry WHERE prescription_id=? ORDER BY id",
      [rx.id],
    );
    if (meds.length) lines.push("", "Medicines");
    for (const [index, med] of meds.entries()) {
      lines.push(
        `${index + 1}. ${textFields(med, ["drug_name", "potency", "dilution_scale"]).replaceAll("\n", " ")}`,
      );
      if (med.dosage) lines.push(`Dosage: ${med.dosage}`);
      if (med.pellet_count != null)
        lines.push(`Pellets per dose: ${med.pellet_count}`);
      if (med.frequency)
        lines.push(frequency[str(med, "frequency")] || str(med, "frequency"));
      if (med.timing)
        lines.push(timing[str(med, "timing")] || str(med, "timing"));
      if (med.duration) lines.push(`Duration: ${med.duration}`);
      const instructions = textFields(med, [
        "frequency_tamil",
        "timing_tamil",
        "instructions",
        "instructions_ta",
      ]);
      if (instructions) lines.push(instructions);
      lines.push("");
    }
    if (procedures.length) lines.push("Procedures");
    for (const proc of procedures) {
      lines.push(textFields(proc, ["name", "duration", "details"]));
      if (proc.follow_up_date)
        lines.push(`Procedure follow-up: ${proc.follow_up_date}`);
      lines.push("");
    }
    for (const [label, key] of [
      ["Diet", "diet_advice"],
      ["Lifestyle", "lifestyle_advice"],
      ["Exercise", "exercise_advice"],
    ]) {
      const advice = textFields(rx, [key, `${key}_ta`]);
      if (advice) lines.push(label, advice, "");
    }
    if (rx.follow_up_date) lines.push(`Follow-up: ${rx.follow_up_date}`);
    const followUp = textFields(rx, ["follow_up_notes", "follow_up_notes_ta"]);
    if (followUp) lines.push(followUp);
  }
  if (clinic.phone) lines.push("", `Clinic phone: ${clinic.phone}`);
  lines.push("", "To stop WhatsApp messages, tell the clinic.");
  const message = lines.join("\n").trim();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify([recipient, message])),
  );
  const version = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const error = !recipient
    ? "Enter a valid WhatsApp number with its country code in the patient record."
    : message.length > 6000
      ? "This message is too long to open in WhatsApp. Use the prescription print view to share the full prescription."
      : null;
  return {
    patient_id: patient.id,
    patient_name: patient.name,
    prescription_id: rx.id,
    kind,
    contact,
    recipient,
    message,
    version,
    error,
  };
}

async function handoff(c: Ctx, id: string) {
  const row = await one(
    dbOf(c),
    "SELECT * FROM whatsapp_handoffs WHERE id=? AND clinic_id=?",
    [id, clinicOf(c)],
  );
  check(row, "Message not found.", 404);
  return row;
}

export const whatsapp = new Hono<App>();
for (const path of [
  "/patients/:pk/whatsapp-consent/",
  "/prescriptions/:pk/whatsapp/",
  "/whatsapp/*",
])
  whatsapp.use(path, async (c, next) => {
    check(
      ["doctor", "admin"].includes(str(c.get("user"), "role")),
      "Only doctors and clinic admins can manage WhatsApp messages.",
      403,
    );
    await next();
  });

whatsapp.post("/patients/:pk/whatsapp-consent/", async (c) => {
  const patient = await get(
    dbOf(c),
    "patients_patient",
    c.req.param("pk"),
    clinicOf(c),
  );
  const body = record(await c.req.json());
  check(
    body.status === "granted" || body.status === "opted_out",
    "Choose granted or opted out.",
  );
  check(body.confirmed === true, "Confirm the patient's messaging preference.");
  await stmt(
    dbOf(c),
    `INSERT INTO whatsapp_preferences(clinic_id,patient_id,status,recorded_by_id,updated_at)
    VALUES(?,?,?,?,?) ON CONFLICT(clinic_id,patient_id) DO UPDATE SET status=excluded.status,recorded_by_id=excluded.recorded_by_id,updated_at=excluded.updated_at`,
    [clinicOf(c), patient.id, body.status, c.get("user").id, now()],
  ).run();
  return c.json(await preference(c, patient.id));
});

whatsapp.get("/prescriptions/:pk/whatsapp/", async (c) => {
  const preview = await draft(
    c,
    c.req.param("pk"),
    messageKind(c.req.query("kind") || "prescription"),
  );
  const history = await all(
    dbOf(c),
    `SELECT id,kind,status,recipient,created_at,updated_at FROM whatsapp_handoffs
    WHERE clinic_id=? AND prescription_id=? AND kind=? ORDER BY created_at DESC LIMIT 5`,
    [clinicOf(c), preview.prescription_id, preview.kind],
  );
  return c.json({
    ...preview,
    consent: await preference(c, preview.patient_id),
    history,
  });
});

whatsapp.post("/prescriptions/:pk/whatsapp/", async (c) => {
  const body = record(await c.req.json());
  check(
    body.reviewed === true,
    "Review the recipient and full message before preparing it.",
  );
  const preview = await draft(c, c.req.param("pk"), messageKind(body.kind));
  check(
    body.version === preview.version,
    "The recipient or message changed. Reload and review it again.",
    409,
  );
  check(!preview.error, preview.error || "Invalid message.");
  check(
    (await preference(c, preview.patient_id)).status === "granted",
    "Patient consent is required. WhatsApp messages are blocked.",
    409,
  );
  const messageId = crypto.randomUUID();
  await dbOf(c).batch([
    assertion(
      dbOf(c),
      "EXISTS(SELECT 1 FROM whatsapp_preferences WHERE clinic_id=? AND patient_id=? AND status='granted')",
      [clinicOf(c), preview.patient_id],
    ),
    stmt(
      dbOf(c),
      `INSERT INTO whatsapp_handoffs(id,clinic_id,patient_id,prescription_id,kind,version,recipient,message,status,reviewed_by_id,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,'prepared',?,?,?) ON CONFLICT(clinic_id,prescription_id,kind,version) DO NOTHING`,
      [
        messageId,
        clinicOf(c),
        preview.patient_id,
        preview.prescription_id,
        preview.kind,
        preview.version,
        preview.recipient,
        preview.message,
        c.get("user").id,
        now(),
        now(),
      ],
    ),
  ]);
  const saved = await one(
    dbOf(c),
    `SELECT id,kind,status,recipient,created_at,updated_at FROM whatsapp_handoffs
    WHERE clinic_id=? AND prescription_id=? AND kind=? AND version=?`,
    [clinicOf(c), preview.prescription_id, preview.kind, preview.version],
  );
  return c.json(saved);
});

whatsapp.post("/whatsapp/messages/:message_id/open/", async (c) => {
  const row = await handoff(c, c.req.param("message_id"));
  const current = await draft(c, row.prescription_id, messageKind(row.kind));
  check(
    current.version === row.version,
    "The recipient or message changed. Reload and review it again.",
    409,
  );
  check(
    row.status !== "staff_reported_sent",
    "Staff already reported this message sent. Check WhatsApp before sending it again.",
    409,
  );
  check(
    (await preference(c, row.patient_id)).status === "granted",
    "Patient consent is required. WhatsApp messages are blocked.",
    409,
  );
  const opened = await dbOf(c).batch([
    assertion(
      dbOf(c),
      "EXISTS(SELECT 1 FROM whatsapp_preferences WHERE clinic_id=? AND patient_id=? AND status='granted')",
      [clinicOf(c), row.patient_id],
    ),
    stmt(
      dbOf(c),
      "UPDATE whatsapp_handoffs SET status='handoff_requested',updated_at=? WHERE id=? AND clinic_id=? AND status<>'staff_reported_sent' RETURNING id",
      [now(), row.id, clinicOf(c)],
    ),
  ]);
  check(
    opened[1].results.length === 1,
    "Staff already reported this message sent. Check WhatsApp before sending it again.",
    409,
  );
  return c.json({
    id: row.id,
    status: "handoff_requested",
    url: `https://wa.me/${row.recipient}?text=${encodeURIComponent(str(row, "message"))}`,
  });
});

whatsapp.post("/whatsapp/messages/:message_id/report-sent/", async (c) => {
  const row = await handoff(c, c.req.param("message_id"));
  const body = record(await c.req.json());
  check(body.confirmed === true, "Confirm that you pressed Send in WhatsApp.");
  check(
    row.status !== "prepared",
    "Open the message in WhatsApp before reporting it sent.",
    409,
  );
  await stmt(
    dbOf(c),
    "UPDATE whatsapp_handoffs SET status='staff_reported_sent',reported_by_id=COALESCE(reported_by_id,?),updated_at=CASE WHEN status='staff_reported_sent' THEN updated_at ELSE ? END WHERE id=? AND clinic_id=?",
    [c.get("user").id, now(), row.id, clinicOf(c)],
  ).run();
  return c.json({ id: row.id, status: "staff_reported_sent" });
});

whatsapp.get("/whatsapp/reminders/", async (c) => {
  const cutoff = new Date(`${today()}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() + 7);
  const found = await all(
    dbOf(c),
    `SELECT r.id prescription_id,r.follow_up_date,p.name patient_name,p.id patient_id,
    COALESCE(w.status,'not_recorded') consent_status
    FROM prescriptions_prescription r JOIN consultations_consultation v ON v.id=r.consultation_id AND v.clinic_id=r.clinic_id
    JOIN patients_patient p ON p.id=v.patient_id AND p.clinic_id=r.clinic_id
    LEFT JOIN whatsapp_preferences w ON w.patient_id=p.id AND w.clinic_id=r.clinic_id
    WHERE r.clinic_id=? AND p.is_active=1 AND r.follow_up_date<=? ORDER BY r.follow_up_date,r.id LIMIT 100`,
    [clinicOf(c), cutoff.toISOString().slice(0, 10)],
  );
  return c.json(found);
});

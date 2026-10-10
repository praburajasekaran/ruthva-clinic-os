import { Hono } from "hono";
import { requireEnabledDiscipline } from "./practices";
import {
  all,
  ApiError,
  check,
  clinicOf,
  dbOf,
  get,
  insert,
  now,
  num,
  one,
  output,
  record,
  rows,
  stmt,
  str,
  update,
} from "./data";
import type { App, Ctx, Row } from "./data";
import { constantEqual } from "./auth";

export const integrations = new Hono<App>();
export async function ruthva(
  c: Ctx,
  method: string,
  path: string,
  body?: Row,
): Promise<Row> {
  const apiUrl = c.env.RUTHVA_API_URL;
  check(
    apiUrl && apiUrl.startsWith("https://") && c.env.RUTHVA_INTEGRATION_SECRET,
    "Ruthva integration is not configured.",
    503,
  );
  let result: Response;
  try {
    result = await fetch(`${apiUrl.replace(/\/$/, "")}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Ruthva-Secret": c.env.RUTHVA_INTEGRATION_SECRET,
        "X-Ruthva-Subdomain":
          c.env.RUTHVA_CLINIC_SUBDOMAIN || c.get("clinic").subdomain,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
      redirect: "manual",
    });
  } catch {
    throw new ApiError(502, "Could not reach Ruthva.");
  }
  let data: Row;
  try {
    data = record(await result.json());
  } catch {
    throw new ApiError(502, "Ruthva returned invalid JSON.");
  }
  check(
    result.ok,
    str(
      data,
      "message",
      str(data, "error", "Ruthva could not complete this request."),
    ),
    result.status === 409 ? 409 : 502,
  );
  return data;
}
async function journeyOutput(c: Ctx, row: Row) {
  const patient = await get(
    dbOf(c),
    "patients_patient",
    row.patient_id,
    clinicOf(c),
  );
  return output(
    "integrations_ruthvajourneyref",
    row,
    "RuthvaJourneyRefSerializer",
    { patient_name: patient.name },
  );
}
export async function startJourney(
  c: Ctx,
  patient: Row,
  consultation: Row | null,
  duration: number,
  interval: number,
): Promise<Row> {
  check(
    Number.isInteger(duration) &&
      Number.isInteger(interval) &&
      duration >= 7 &&
      duration <= 180 &&
      interval >= 1 &&
      interval <= 30,
    "Journey duration must be 7 to 180 days and follow-up interval 1 to 30 days.",
  );
  check(
    !(await one(
      dbOf(c),
      "SELECT id FROM integrations_ruthvajourneyref WHERE patient_id=? AND clinic_id=? AND status='active'",
      [patient.id, clinicOf(c)],
    )),
    "Patient already has an active journey.",
    409,
  );
  const data = await ruthva(c, "POST", "/api/integration/v1/journeys/start", {
    patientName: patient.name,
    patientPhone: patient.whatsapp_number || patient.phone,
    durationDays: duration,
    followupIntervalDays: interval,
    consentGiven: true,
    externalConsultationId: consultation ? String(consultation.id) : null,
  });
  check(
    typeof data.journeyId === "string" &&
      data.journeyId.length > 0 &&
      data.journeyId.length <= 100 &&
      (data.patientId === undefined ||
        (typeof data.patientId === "string" && data.patientId.length <= 100)),
    "Ruthva returned an invalid journey.",
    502,
  );
  const item = insert(dbOf(c), "integrations_ruthvajourneyref", {
    ...syncFields(data),
    clinic_id: clinicOf(c),
    patient_id: patient.id,
    consultation_id: consultation?.id ?? null,
    ruthva_journey_id: data.journeyId,
    ruthva_patient_id: data.patientId || "",
    duration_days: duration,
    followup_interval_days: interval,
    consent_given_at: now(),
    last_synced_at: now(),
  });
  await item.statement.run();
  return journeyOutput(c, item.row);
}
function syncFields(data: Row, status = 502) {
  const result: Row = { last_synced_at: now() };
  for (const [remote, local] of Object.entries({
    status: "status",
    startDate: "start_date",
    riskLevel: "risk_level",
    riskReason: "risk_reason",
    nextVisitDate: "next_visit_date",
    lastVisitDate: "last_visit_date",
    missedVisits: "missed_visits",
  }))
    if (Object.hasOwn(data, remote)) {
      const value = data[remote];
      if (remote === "status")
        check(
          ["active", "completed", "dropped"].includes(String(value)),
          "Invalid journey status.",
          status,
        );
      else if (remote.includes("Date"))
        check(
          value === null ||
            (typeof value === "string" &&
              /^\d{4}-\d{2}-\d{2}$/.test(value) &&
              Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
              new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) ===
                value),
          "Invalid journey date.",
          status,
        );
      else if (remote === "missedVisits")
        check(
          Number.isSafeInteger(value) &&
            Number(value) >= 0 &&
            Number(value) <= 32767,
          "Invalid missed visit count.",
          status,
        );
      else
        check(
          value === null ||
            (typeof value === "string" &&
              value.length <= (remote === "riskReason" ? 255 : 20)),
          "Invalid journey risk data.",
          status,
        );
      result[local] = value ?? (remote.includes("Date") ? null : "");
    }
  return result;
}
integrations.post("/integrations/journeys/start/", async (c) => {
  const body = record(await c.req.json());
  check(body.consent_given === true, "Patient consent is required.");
  const patient = await get(
      dbOf(c),
      "patients_patient",
      body.patient_id,
      clinicOf(c),
    ),
    consultation = body.consultation_id
      ? await get(
          dbOf(c),
          "consultations_consultation",
          body.consultation_id,
          clinicOf(c),
        )
      : null;
  check(
    !consultation || consultation.patient_id === patient.id,
    "Consultation not found.",
    404,
  );
  return c.json(
    await startJourney(
      c,
      patient,
      consultation,
      num(body, "duration_days"),
      num(body, "followup_interval_days"),
    ),
    201,
  );
});
integrations.get("/integrations/journeys/:pk/status/", async (c) => {
  const ref = await get(
    dbOf(c),
    "integrations_ruthvajourneyref",
    c.req.param("pk"),
    clinicOf(c),
  );
  if (c.req.query("sync") === "true") {
    const data = await ruthva(
      c,
      "GET",
      `/api/integration/v1/journeys/${encodeURIComponent(str(ref, "ruthva_journey_id"))}/status`,
    );
    await update(
      dbOf(c),
      "integrations_ruthvajourneyref",
      ref.id,
      syncFields(data),
      clinicOf(c),
    ).run();
  }
  return c.json(
    await journeyOutput(
      c,
      await get(dbOf(c), "integrations_ruthvajourneyref", ref.id, clinicOf(c)),
    ),
  );
});
integrations.post("/integrations/journeys/:pk/confirm-visit/", async (c) => {
  const ref = await get(
    dbOf(c),
    "integrations_ruthvajourneyref",
    c.req.param("pk"),
    clinicOf(c),
  );
  check(ref.status === "active", "Active journey not found.", 404);
  const data = await ruthva(
    c,
    "POST",
    `/api/integration/v1/journeys/${encodeURIComponent(str(ref, "ruthva_journey_id"))}/confirm-visit`,
  );
  await update(
    dbOf(c),
    "integrations_ruthvajourneyref",
    ref.id,
    syncFields(data),
    clinicOf(c),
  ).run();
  return c.json(
    await journeyOutput(
      c,
      await get(dbOf(c), "integrations_ruthvajourneyref", ref.id, clinicOf(c)),
    ),
  );
});
integrations.get("/integrations/patients/:pk/journeys/", async (c) => {
  await get(dbOf(c), "patients_patient", c.req.param("pk"), clinicOf(c));
  return c.json(
    await Promise.all(
      (
        await all(
          dbOf(c),
          "SELECT * FROM integrations_ruthvajourneyref WHERE clinic_id=? AND patient_id=? ORDER BY created_at DESC",
          [clinicOf(c), c.req.param("pk")],
        )
      ).map((row) => journeyOutput(c, row)),
    ),
  );
});
integrations.post("/integrations/webhooks/ruthva/", async (c) => {
  check(
    c.env.RUTHVA_INTEGRATION_SECRET &&
      constantEqual(
        c.req.header("X-Ruthva-Secret") || "",
        c.env.RUTHVA_INTEGRATION_SECRET,
      ),
    "Invalid or missing X-Ruthva-Secret.",
    401,
  );
  const body = record(await c.req.json()),
    data = record(body.data || {});
  check(
    [
      "risk_level_changed",
      "visit_missed",
      "journey_completed",
      "journey_dropped",
    ].includes(str(body, "event_type")),
    "Invalid webhook event.",
  );
  const ref = await one(
    dbOf(c),
    "SELECT * FROM integrations_ruthvajourneyref WHERE ruthva_journey_id=?",
    [body.journey_id],
  );
  if (!ref) return c.json({ status: "ignored" });
  const clinic = await get(dbOf(c), "clinics_clinic", ref.clinic_id);
  requireEnabledDiscipline(clinic.discipline, 403);
  const fields = syncFields(data, 400);
  if (body.event_type === "journey_completed") fields.status = "completed";
  if (body.event_type === "journey_dropped") fields.status = "dropped";
  await update(dbOf(c), "integrations_ruthvajourneyref", ref.id, fields).run();
  return c.json({ status: "ok" });
});
integrations.post("/patients/import/retry-ruthva-sync/", async (c) => {
  const body = record(await c.req.json());
  check(
    Array.isArray(body.patient_ids) &&
      body.patient_ids.length > 0 &&
      body.patient_ids.length <= 200 &&
      body.patient_ids.every(Number.isSafeInteger),
    "Provide 1 to 200 patient IDs.",
  );
  let synced = 0;
  const failed: number[] = [];
  for (const pk of [...new Set(body.patient_ids as number[])]) {
    const patient = await get(dbOf(c), "patients_patient", pk, clinicOf(c));
    try {
      const consultation = await one(
        dbOf(c),
        "SELECT * FROM consultations_consultation WHERE patient_id=? AND clinic_id=? AND is_imported=1 ORDER BY consultation_date DESC LIMIT 1",
        [pk, clinicOf(c)],
      );
      await startJourney(c, patient, consultation, 28, 7);
      synced++;
    } catch {
      failed.push(pk);
    }
  }
  return c.json({ synced, failed: failed.length, failed_patient_ids: failed });
});

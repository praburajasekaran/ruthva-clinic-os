import { Hono } from "hono";
import {
  all,
  check,
  clinicOf,
  dbOf,
  num,
  one,
  owner,
  str,
  today,
} from "./data";
import type { App, Row } from "./data";
import { addDays } from "./treatments";

export const reports = new Hono<App>();
reports.get("/dashboard/stats/", async (c) => {
  const date = today(),
    day = new Date(`${date}T00:00:00Z`).getUTCDay(),
    week = addDays(date, -(day + 6) % 7);
  const stats = await one(
    dbOf(c),
    "SELECT count(DISTINCT CASE WHEN consultation_date=? THEN patient_id END) today_patients,count(DISTINCT CASE WHEN consultation_date>=? THEN patient_id END) week_patients,sum(CASE WHEN consultation_date=? AND NOT EXISTS(SELECT 1 FROM prescriptions_prescription WHERE consultation_id=c.id) THEN 1 ELSE 0 END) pending_prescriptions FROM consultations_consultation c WHERE clinic_id=?",
    [date, week, date, clinicOf(c)],
  );
  const due = await one(
    dbOf(c),
    "SELECT (SELECT count(*) FROM prescriptions_prescription WHERE clinic_id=? AND follow_up_date<=?)+(SELECT count(*) FROM prescriptions_procedureentry p JOIN prescriptions_prescription r ON r.id=p.prescription_id WHERE r.clinic_id=? AND p.follow_up_date<=?)+(SELECT count(*) FROM treatments_treatmentsession s JOIN treatments_treatmentblock b ON b.id=s.treatment_block_id JOIN treatments_treatmentplan p ON p.id=b.treatment_plan_id WHERE p.clinic_id=? AND s.execution_status='planned' AND s.session_date<=?)+(SELECT count(*) FROM treatments_doctoractiontask WHERE clinic_id=? AND status='open') follow_ups_due,(SELECT count(*) FROM patients_patient WHERE clinic_id=?) total_patients",
    [
      clinicOf(c),
      date,
      clinicOf(c),
      date,
      clinicOf(c),
      date,
      clinicOf(c),
      clinicOf(c),
    ],
  );
  return c.json({
    ...stats,
    pending_prescriptions: stats?.pending_prescriptions || 0,
    ...due,
  });
});
reports.get("/usage/", async (c) => {
  owner(c);
  const count = await one(
    dbOf(c),
    "SELECT (SELECT count(*) FROM patients_patient WHERE clinic_id=? AND is_active=1) active_patients,(SELECT count(*) FROM pharmacy_medicine WHERE clinic_id=? AND is_active=1) medicines_count,(SELECT count(*) FROM pharmacy_medicine WHERE clinic_id=? AND is_active=1 AND current_stock<=reorder_level) low_stock_count",
    [clinicOf(c), clinicOf(c), clinicOf(c)],
  );
  const limit = c.get("clinic").active_patient_limit;
  return c.json({
    ...count,
    patient_limit: limit,
    usage_percentage: limit
      ? Math.round((num(count!, "active_patients") / limit) * 1000) / 10
      : 0,
  });
});
reports.get("/dashboard/follow-ups/", async (c) => {
  const tab = c.req.query("tab") || "all",
    status = c.req.query("status") || "open",
    role = c.get("user").role;
  check(
    ["all", "therapist", "doctor"].includes(tab) &&
      ["open", "resolved"].includes(status),
    "Invalid follow-up tab or status.",
  );
  const date = today(),
    from = addDays(date, -30),
    to = addDays(date, 90),
    items: Row[] = [];
  if (role !== "doctor" && tab !== "doctor") {
    items.push(
      ...(await all(
        dbOf(c),
        "SELECT 'legacy' queue_type,'prescription' legacy_type,r.follow_up_date,p.name patient_name,p.record_id patient_record_id,p.id patient_id,r.follow_up_notes notes FROM prescriptions_prescription r JOIN consultations_consultation c ON c.id=r.consultation_id JOIN patients_patient p ON p.id=c.patient_id WHERE r.clinic_id=? AND r.follow_up_date BETWEEN ? AND ?",
        [clinicOf(c), from, to],
      )),
    );
    items.push(
      ...(await all(
        dbOf(c),
        "SELECT 'legacy' queue_type,'procedure' legacy_type,e.follow_up_date,p.name patient_name,p.record_id patient_record_id,p.id patient_id,e.name notes FROM prescriptions_procedureentry e JOIN prescriptions_prescription r ON r.id=e.prescription_id JOIN consultations_consultation c ON c.id=r.consultation_id JOIN patients_patient p ON p.id=c.patient_id WHERE r.clinic_id=? AND e.follow_up_date BETWEEN ? AND ?",
        [clinicOf(c), from, to],
      )),
    );
    items.push(
      ...(await all(
        dbOf(c),
        "SELECT 'therapist' queue_type,s.session_date follow_up_date,p.name patient_name,p.record_id patient_record_id,p.id patient_id,s.id treatment_session_id,t.id treatment_plan_id,b.id treatment_block_id,s.day_number,s.sequence_number,b.block_number,b.start_day_number block_start_day,b.end_day_number block_end_day,(SELECT count(*) FROM treatments_treatmentsession WHERE treatment_block_id=b.id AND execution_status<>'planned') completed_days,(SELECT count(*) FROM treatments_treatmentsession WHERE treatment_block_id=b.id AND execution_status='planned') pending_days,s.procedure_name,s.medium_type,s.medium_name,s.instructions FROM treatments_treatmentsession s JOIN treatments_treatmentblock b ON b.id=s.treatment_block_id JOIN treatments_treatmentplan t ON t.id=b.treatment_plan_id JOIN prescriptions_prescription r ON r.id=t.prescription_id JOIN consultations_consultation c ON c.id=r.consultation_id JOIN patients_patient p ON p.id=c.patient_id WHERE t.clinic_id=? AND s.execution_status='planned' AND s.session_date BETWEEN ? AND ?",
        [clinicOf(c), from, to],
      )),
    );
  }
  if (role !== "therapist" && tab !== "therapist") {
    const tasks = await all(
      dbOf(c),
      "SELECT 'doctor' queue_type,d.due_date follow_up_date,p.name patient_name,p.record_id patient_record_id,p.id patient_id,d.id doctor_action_task_id,t.id treatment_plan_id,b.id treatment_block_id,b.block_number,b.start_day_number block_start_day,b.end_day_number block_end_day,(SELECT count(*) FROM treatments_treatmentsession WHERE treatment_block_id=b.id AND execution_status<>'planned') completed_days,(SELECT count(*) FROM treatments_treatmentsession WHERE treatment_block_id=b.id AND execution_status='planned') pending_days,d.task_type,d.status task_status,t.total_days,t.status plan_status,b.replan_required FROM treatments_doctoractiontask d JOIN treatments_treatmentblock b ON b.id=d.treatment_block_id JOIN treatments_treatmentplan t ON t.id=d.treatment_plan_id JOIN prescriptions_prescription r ON r.id=t.prescription_id JOIN consultations_consultation c ON c.id=r.consultation_id JOIN patients_patient p ON p.id=c.patient_id WHERE d.clinic_id=? AND d.status=?",
      [clinicOf(c), status],
    );
    items.push(
      ...tasks.map((row) => ({
        ...row,
        replan_required: !!row.replan_required,
      })),
    );
  }
  items.sort(
    (a, b) =>
      str(a, "follow_up_date", "9999").localeCompare(
        str(b, "follow_up_date", "9999"),
      ) || str(a, "patient_name").localeCompare(str(b, "patient_name")),
  );
  const counts = {
    legacy: items.filter((x) => x.queue_type === "legacy").length,
    therapist: items.filter((x) => x.queue_type === "therapist").length,
    doctor: items.filter((x) => x.queue_type === "doctor").length,
    total: items.length,
  };
  return c.json({ items, meta: { tab, status, counts } });
});

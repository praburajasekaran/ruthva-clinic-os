import { Hono } from "hono";
import {
  all,
  check,
  clinicOf,
  dbOf,
  doctor,
  get,
  insert,
  now,
  num,
  one,
  output,
  record,
  rows,
  scope,
  stmt,
  str,
  today,
  update,
  validate,
} from "./data";
import type { App, Ctx, DB, Row } from "./data";
import { assertion } from "./auth";

export const treatments = new Hono<App>();
const planTable = "treatments_treatmentplan",
  blockTable = "treatments_treatmentblock",
  sessionTable = "treatments_treatmentsession";
export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
export async function planOutput(db: DB, row: Row, detail = true) {
  const patient = await one(
    db,
    "SELECT p.* FROM patients_patient p JOIN consultations_consultation c ON c.patient_id=p.id JOIN prescriptions_prescription r ON r.consultation_id=c.id WHERE r.id=?",
    [row.prescription_id],
  );
  check(patient, "Patient not found.", 404);
  const blocks = await all(
    db,
    "SELECT * FROM treatments_treatmentblock WHERE treatment_plan_id=? ORDER BY block_number",
    [row.id],
  );
  const extra: Row = {
    patient_id: patient.id,
    patient_name: patient.name,
    patient_record_id: patient.record_id,
    block_count: blocks.length,
  };
  if (detail) {
    const result: Row[] = [];
    for (const block of blocks) {
      const sessions = await all(
        db,
        "SELECT * FROM treatments_treatmentsession WHERE treatment_block_id=? ORDER BY day_number,sequence_number",
        [block.id],
      );
      result.push(
        output(blockTable, block, "TreatmentBlockSerializer", {
          sessions: sessions.map((x) =>
            output(sessionTable, x, "TreatmentSessionSerializer"),
          ),
        }),
      );
    }
    extra.blocks = result;
  }
  return output(
    planTable,
    row,
    detail ? "TreatmentPlanDetailSerializer" : "TreatmentPlanListSerializer",
    extra,
  );
}
function blockInput(body: Row, total: number) {
  const start = num(body, "start_day_number"),
    end = num(body, "end_day_number"),
    date = str(body, "start_date");
  check(
    Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 1 &&
      end >= start &&
      end - start < 30 &&
      end <= total,
    "Block range must fit the plan and span at most 30 days.",
  );
  check(
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(Date.parse(`${date}T00:00:00Z`)) &&
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date,
    "Invalid block start date.",
  );
  const entries = rows(body.entries);
  check(
    entries.length && entries.length <= 100,
    "Provide 1 to 100 session entries.",
  );
  const expanded: Row[] = [];
  for (const entry of entries) {
    check(
      ["single_day", "day_range"].includes(str(entry, "entry_type")),
      "Invalid entry type.",
    );
    const first = num(
        entry,
        entry.entry_type === "single_day" ? "day_number" : "start_day_number",
      ),
      last =
        entry.entry_type === "single_day"
          ? first
          : num(entry, "end_day_number");
    check(
      Number.isInteger(first) &&
        Number.isInteger(last) &&
        first >= start &&
        last <= end &&
        first <= last,
      "Entry days must stay within the block range.",
    );
    check(
      str(entry, "procedure_name").trim().length > 0 &&
        str(entry, "procedure_name").length <= 255 &&
        ["oil", "powder", "other"].includes(str(entry, "medium_type")),
      "Invalid session procedure or medium.",
    );
    for (let day = first; day <= last; day++)
      expanded.push({
        day_number: day,
        procedure_name: entry.procedure_name,
        medium_type: entry.medium_type,
        medium_name: str(entry, "medium_name"),
        instructions: str(entry, "instructions"),
        session_date: addDays(date, day - start),
      });
  }
  check(expanded.length <= 300, "A block can contain at most 300 sessions.");
  expanded.sort((a, b) => num(a, "day_number") - num(b, "day_number"));
  const counts = new Map<number, number>();
  for (const entry of expanded) {
    const day = num(entry, "day_number");
    const seq = (counts.get(day) || 0) + 1;
    counts.set(day, seq);
    entry.sequence_number = seq;
  }
  return { start, end, date, expanded };
}
function createBlock(c: Ctx, plan: Row, body: Row) {
  const parsed = blockInput(body, num(plan, "total_days"));
  const block = insert(dbOf(c), blockTable, {
    treatment_plan_id: plan.id,
    block_number: 0,
    start_day_number: parsed.start,
    end_day_number: parsed.end,
    start_date: parsed.date,
    end_date: addDays(parsed.date, parsed.end - parsed.start),
  });
  const sql = block.statement;
  return {
    block: block.row,
    statements: [
      assertion(
        dbOf(c),
        "EXISTS(SELECT 1 FROM treatments_treatmentplan WHERE id=? AND clinic_id=? AND status='active' AND total_days>=?)",
        [plan.id, clinicOf(c), parsed.end],
      ),
      sql,
      stmt(
        dbOf(c),
        "UPDATE treatments_treatmentblock SET block_number=(SELECT COALESCE(MAX(block_number),0)+1 FROM treatments_treatmentblock WHERE treatment_plan_id=? AND id<>?) WHERE id=?",
        [plan.id, block.row.id, block.row.id],
      ),
      ...parsed.expanded.map(
        (entry) =>
          insert(dbOf(c), sessionTable, {
            ...entry,
            treatment_block_id: block.row.id,
          }).statement,
      ),
      stmt(
        dbOf(c),
        "UPDATE treatments_doctoractiontask SET status='resolved',resolved_at=?,updated_at=? WHERE treatment_plan_id=? AND task_type='block_completed' AND status='open'",
        [now(), now(), plan.id],
      ),
    ],
  };
}
treatments.get("/plans/", async (c) => {
  const found = await all(
    dbOf(c),
    "SELECT t.* FROM treatments_treatmentplan t WHERE clinic_id=? AND (? IS NULL OR status=?) AND (? IS NULL OR prescription_id IN (SELECT r.id FROM prescriptions_prescription r JOIN consultations_consultation c ON c.id=r.consultation_id WHERE c.patient_id=?)) ORDER BY created_at DESC",
    [
      clinicOf(c),
      c.req.query("status") ?? null,
      c.req.query("status") ?? null,
      c.req.query("patient_id") ?? null,
      c.req.query("patient_id") ?? null,
    ],
  );
  return c.json(
    await Promise.all(found.map((row) => planOutput(dbOf(c), row, false))),
  );
});
treatments.post("/plans/", async (c) => {
  doctor(c);
  const body = record(await c.req.json()),
    rx = await get(
      dbOf(c),
      "prescriptions_prescription",
      body.prescription,
      clinicOf(c),
    ),
    total = num(body, "total_days");
  check(
    Number.isInteger(total) && total > 0 && total <= 32767,
    "Plan duration must be 1 to 32767 days.",
  );
  const plan = insert(dbOf(c), planTable, {
      clinic_id: clinicOf(c),
      prescription_id: rx.id,
      total_days: total,
    }),
    block = createBlock(c, plan.row, record(body.block));
  await dbOf(c).batch([plan.statement, ...block.statements]);
  return c.json(await planOutput(dbOf(c), plan.row), 201);
});
treatments.get("/plans/:pk/", async (c) =>
  c.json(
    await planOutput(
      dbOf(c),
      await get(dbOf(c), planTable, c.req.param("pk"), clinicOf(c)),
    ),
  ),
);
treatments.patch("/plans/:pk/", async (c) => {
  doctor(c);
  const plan = await get(dbOf(c), planTable, c.req.param("pk"), clinicOf(c)),
    body = record(await c.req.json()),
    data: Row = {};
  if (body.status !== undefined) {
    check(
      body.status === "cancelled" && plan.status === "active",
      "Only active plans can be cancelled.",
    );
    data.status = "cancelled";
  }
  if (body.total_days !== undefined) {
    const max = await one(
      dbOf(c),
      "SELECT COALESCE(MAX(end_day_number),0) highest FROM treatments_treatmentblock WHERE treatment_plan_id=?",
      [plan.id],
    );
    check(
      Number.isInteger(body.total_days) &&
        num(body, "total_days") >= Math.max(1, num(max!, "highest")) &&
        num(body, "total_days") <= 32767,
      "Plan duration cannot exclude an existing block.",
    );
    data.total_days = body.total_days;
  }
  await dbOf(c).batch([
    assertion(
      dbOf(c),
      "EXISTS(SELECT 1 FROM treatments_treatmentplan WHERE id=? AND status=?)",
      [plan.id, plan.status],
    ),
    ...(data.total_days === undefined
      ? []
      : [
          assertion(
            dbOf(c),
            "NOT EXISTS(SELECT 1 FROM treatments_treatmentblock WHERE treatment_plan_id=? AND end_day_number>?)",
            [plan.id, data.total_days],
          ),
        ]),
    update(dbOf(c), planTable, plan.id, data, clinicOf(c)),
  ]);
  return c.json(
    await planOutput(
      dbOf(c),
      await get(dbOf(c), planTable, plan.id, clinicOf(c)),
    ),
  );
});
treatments.post("/plans/:pk/blocks/", async (c) => {
  doctor(c);
  const plan = await get(dbOf(c), planTable, c.req.param("pk"), clinicOf(c));
  check(plan.status === "active", "Can only add blocks to active plans.");
  const block = createBlock(c, plan, record(await c.req.json()));
  await dbOf(c).batch(block.statements);
  return c.json(
    await planOutput(
      dbOf(c),
      await get(dbOf(c), planTable, plan.id, clinicOf(c)),
    ),
    201,
  );
});
treatments.get("/sessions/", async (c) => {
  const block = c.req.query("block_id");
  check(block, "block_id query parameter is required.");
  await get(dbOf(c), blockTable, block, clinicOf(c));
  const sessions = await all(
      dbOf(c),
      "SELECT * FROM treatments_treatmentsession WHERE treatment_block_id=? ORDER BY day_number,sequence_number",
      [block],
    ),
    result: Row[] = [];
  for (const session of sessions) {
    const feedback = await one(
      dbOf(c),
      "SELECT * FROM treatments_sessionfeedback WHERE treatment_session_id=?",
      [session.id],
    );
    result.push(
      output(sessionTable, session, "TreatmentSessionWithFeedbackSerializer", {
        feedback: feedback
          ? output(
              "treatments_sessionfeedback",
              feedback,
              "SessionFeedbackReadSerializer",
            )
          : null,
      }),
    );
  }
  return c.json(result);
});
treatments.patch("/sessions/:pk/", async (c) => {
  check(
    ["doctor", "admin"].includes(c.get("user").role),
    "Only doctors or admins can edit sessions.",
    403,
  );
  const session = await get(
    dbOf(c),
    sessionTable,
    c.req.param("pk"),
    clinicOf(c),
  );
  check(
    session.execution_status === "planned",
    "Only planned sessions can be edited.",
  );
  const data = await validate(
    dbOf(c),
    sessionTable,
    record(await c.req.json()),
    "TreatmentSessionUpdateSerializer",
    clinicOf(c),
    true,
  );
  await dbOf(c).batch([
    assertion(
      dbOf(c),
      "EXISTS(SELECT 1 FROM treatments_treatmentsession WHERE id=? AND execution_status='planned')",
      [session.id],
    ),
    update(dbOf(c), sessionTable, session.id, data),
  ]);
  return c.json(
    output(
      sessionTable,
      await get(dbOf(c), sessionTable, session.id, clinicOf(c)),
      "TreatmentSessionSerializer",
    ),
  );
});
treatments.post("/sessions/:pk/feedback/", async (c) => {
  check(
    c.get("user").role === "therapist",
    "Only therapists can submit feedback.",
    403,
  );
  const session = await get(
      dbOf(c),
      sessionTable,
      c.req.param("pk"),
      clinicOf(c),
    ),
    block = await get(
      dbOf(c),
      blockTable,
      session.treatment_block_id,
      clinicOf(c),
    ),
    plan = await get(dbOf(c), planTable, block.treatment_plan_id, clinicOf(c)),
    body = record(await c.req.json());
  check(
    ["done", "not_done"].includes(str(body, "completion_status")) &&
      Number.isInteger(body.response_score) &&
      num(body, "response_score") >= 1 &&
      num(body, "response_score") <= 5,
    "Invalid completion status or response score.",
  );
  check(
    body.review_requested === undefined ||
      typeof body.review_requested === "boolean",
    "review_requested must be boolean.",
  );
  const existing = await one(
    dbOf(c),
    "SELECT id FROM treatments_sessionfeedback WHERE treatment_session_id=?",
    [session.id],
  );
  const data = {
    treatment_session_id: session.id,
    therapist_id: c.get("user").id,
    completion_status: body.completion_status,
    response_score: body.response_score,
    notes: str(body, "notes"),
    review_requested: body.review_requested === true ? 1 : 0,
  };
  const feedback = insert(dbOf(c), "treatments_sessionfeedback", {
    ...data,
    ...(existing ? { id: existing.id } : {}),
  });
  const assigned = await one(
    dbOf(c),
    "SELECT u.id FROM users_user u WHERE u.clinic_id=? AND u.role='doctor' AND u.is_active=1 ORDER BY CASE WHEN u.id=(SELECT c.conducted_by_id FROM consultations_consultation c JOIN prescriptions_prescription r ON r.consultation_id=c.id WHERE r.id=?) THEN 0 ELSE 1 END,u.id LIMIT 1",
    [clinicOf(c), plan.prescription_id],
  );
  const task = (type: string, condition: string) => {
    const item = insert(dbOf(c), "treatments_doctoractiontask", {
      clinic_id: clinicOf(c),
      treatment_plan_id: plan.id,
      treatment_block_id: block.id,
      assigned_doctor_id: assigned?.id ?? null,
      task_type: type,
      due_date: today(),
    });
    const cols = Object.keys(item.row);
    return stmt(
      dbOf(c),
      `INSERT OR IGNORE INTO treatments_doctoractiontask (${cols}) SELECT ${cols.map(() => "?")} WHERE ${condition}`,
      [...Object.values(item.row), block.id],
    );
  };
  const completed =
    "NOT EXISTS(SELECT 1 FROM treatments_treatmentsession WHERE treatment_block_id=? AND execution_status='planned')";
  const statements = [
    assertion(
      dbOf(c),
      "EXISTS(SELECT 1 FROM treatments_treatmentblock WHERE id=? AND status<>'completed')",
      [block.id],
    ),
    ...(existing
      ? [update(dbOf(c), "treatments_sessionfeedback", existing.id, data)]
      : [feedback.statement]),
    update(dbOf(c), sessionTable, session.id, {
      execution_status: body.completion_status,
    }),
    stmt(
      dbOf(c),
      "UPDATE treatments_treatmentblock SET status='in_progress',updated_at=? WHERE id=? AND status='planned'",
      [now(), block.id],
    ),
    stmt(
      dbOf(c),
      `UPDATE treatments_treatmentblock SET status='completed',replan_required=1,completed_at=?,updated_at=? WHERE id=? AND ${completed}`,
      [now(), now(), block.id, block.id],
    ),
  ];
  if (body.review_requested === true)
    statements.push(
      task(
        "review_requested",
        "EXISTS(SELECT 1 FROM treatments_treatmentblock WHERE id=?)",
      ),
    );
  statements.push(
    task(
      num(block, "end_day_number") >= num(plan, "total_days")
        ? "plan_completed"
        : "block_completed",
      completed,
    ),
  );
  statements.push(
    stmt(
      dbOf(c),
      "UPDATE treatments_treatmentplan SET status='completed',updated_at=? WHERE id=? AND status='active' AND EXISTS(SELECT 1 FROM treatments_treatmentblock WHERE id=? AND status='completed' AND end_day_number>=treatments_treatmentplan.total_days)",
      [now(), plan.id, block.id],
    ),
  );
  await dbOf(c).batch(statements);
  const result = await one(
    dbOf(c),
    "SELECT * FROM treatments_sessionfeedback WHERE treatment_session_id=?",
    [session.id],
  );
  return c.json(
    {
      ...output(
        "treatments_sessionfeedback",
        result!,
        "SessionFeedbackReadSerializer",
      ),
      treatment_session: session.id,
    },
    201,
  );
});
treatments.post("/doctor-tasks/:pk/resolve/", async (c) => {
  doctor(c);
  const task = await get(
    dbOf(c),
    "treatments_doctoractiontask",
    c.req.param("pk"),
    clinicOf(c),
  );
  check(task.status === "open", "Task is already resolved.");
  const body = record(await c.req.json());
  const result = await stmt(
    dbOf(c),
    "UPDATE treatments_doctoractiontask SET status='resolved',notes=?,resolved_at=?,updated_at=? WHERE id=? AND clinic_id=? AND status='open' RETURNING id,status,notes,resolved_at",
    [str(body, "notes"), now(), now(), task.id, clinicOf(c)],
  ).first();
  check(result, "Task is already resolved.");
  return c.json(result);
});

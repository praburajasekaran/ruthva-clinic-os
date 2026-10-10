import { Hono } from "hono";
import {
  all,
  check,
  clinicOf,
  dbOf,
  defaults,
  doctor,
  flag,
  get,
  id,
  insert,
  now,
  num,
  one,
  output,
  quote,
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

export const clinical = new Hono<App>();
const crud = new Hono<App>();
export const tables = {
  patients: "patients_patient",
  consultations: "consultations_consultation",
  prescriptions: "prescriptions_prescription",
  medicines: "pharmacy_medicine",
  remedies: "prescriptions_remedyfollowupresponse",
};
const contracts: Record<string, [string, string]> = {
  patients_patient: ["PatientListSerializer", "PatientDetailSerializer"],
  consultations_consultation: [
    "ConsultationListSerializer",
    "ConsultationDetailSerializer",
  ],
  prescriptions_prescription: [
    "PrescriptionListSerializer",
    "PrescriptionDetailSerializer",
  ],
  pharmacy_medicine: ["MedicineListSerializer", "MedicineDetailSerializer"],
  prescriptions_remedyfollowupresponse: [
    "RemedyFollowUpResponseSerializer",
    "RemedyFollowUpResponseSerializer",
  ],
};
export async function serialize(
  db: DB,
  table: string,
  row: Row,
  detail = true,
): Promise<Row> {
  const extra: Row = {};
  if (table === tables.patients) {
    const dob = str(row, "date_of_birth"),
      date = today();
    extra.calculated_age = dob
      ? Number(date.slice(0, 4)) -
        Number(dob.slice(0, 4)) -
        Number(date.slice(5) < dob.slice(5))
      : row.age;
    const stats = await one(
      db,
      "SELECT count(*) consultation_count,max(consultation_date) last_visit FROM consultations_consultation WHERE patient_id=?",
      [row.id],
    );
    Object.assign(extra, stats);
    if (detail)
      for (const [name, child, contract] of [
        [
          "medical_history",
          "patients_medicalhistory",
          "MedicalHistorySerializer",
        ],
        ["family_history", "patients_familyhistory", "FamilyHistorySerializer"],
      ])
        extra[name] = (
          await all(
            db,
            `SELECT * FROM ${child} WHERE patient_id=? ORDER BY id`,
            [row.id],
          )
        ).map((x) => output(child, x, contract));
  }
  if (
    [
      tables.consultations,
      tables.prescriptions,
      "treatments_treatmentplan",
    ].includes(table)
  ) {
    const consultation =
      table === tables.consultations
        ? row
        : table === tables.prescriptions
          ? await get(db, tables.consultations, row.consultation_id)
          : await one(
              db,
              "SELECT c.* FROM consultations_consultation c JOIN prescriptions_prescription r ON r.consultation_id=c.id WHERE r.id=?",
              [row.prescription_id],
            );
    check(consultation, "Consultation not found.", 404);
    const patient = await get(db, tables.patients, consultation.patient_id);
    extra.patient_name = patient.name;
    extra.patient_record_id = patient.record_id;
    extra.patient_id = patient.id;
    extra.consultation_date = consultation.consultation_date;
    if (table === tables.consultations)
      extra.has_prescription = !!(await one(
        db,
        "SELECT id FROM prescriptions_prescription WHERE consultation_id=?",
        [row.id],
      ));
  }
  if (table === tables.prescriptions) {
    const meds = await all(
      db,
      "SELECT m.*,p.name medicine_name FROM prescriptions_medication m LEFT JOIN pharmacy_medicine p ON m.medicine_id=p.id WHERE m.prescription_id=? ORDER BY m.sort_order,m.id",
      [row.id],
    );
    extra.medication_count = meds.length;
    if (detail) {
      extra.medications = meds.map((x) =>
        output("prescriptions_medication", x, "MedicationSerializer", {
          medicine_id: x.medicine_id,
          medicine_name: x.medicine_name || "",
        }),
      );
      extra.procedures = (
        await all(
          db,
          "SELECT * FROM prescriptions_procedureentry WHERE prescription_id=? ORDER BY id",
          [row.id],
        )
      ).map((x) =>
        output("prescriptions_procedureentry", x, "ProcedureEntrySerializer"),
      );
    }
  }
  if (table === tables.medicines) {
    extra.is_low_stock =
      flag(row, "is_active") &&
      num(row, "current_stock") <= num(row, "reorder_level");
    if (detail)
      extra.recent_stock_entries = (
        await all(
          db,
          "SELECT e.*,trim(u.first_name||' '||u.last_name) actor_name FROM pharmacy_stockentry e LEFT JOIN users_user u ON u.id=e.actor_id WHERE e.medicine_id=? ORDER BY e.created_at DESC LIMIT 10",
          [row.id],
        )
      ).map((x) => output("pharmacy_stockentry", x, "StockEntrySerializer"));
  }
  const result = output(table, row, contracts[table][detail ? 1 : 0], extra);
  if (table === tables.consultations && detail)
    result.prescription = await one(
      db,
      "SELECT id FROM prescriptions_prescription WHERE consultation_id=? AND clinic_id=?",
      [row.id, row.clinic_id],
    );
  return result;
}
export function patientInsert(
  db: DB,
  data: Row,
): { row: Row; statement: D1PreparedStatement } {
  const row = defaults(tables.patients, data),
    keys = Object.keys(row),
    year = today().slice(0, 4),
    prefix = `PAT-${year}-`;
  const expressions = keys.map((k) =>
    k === "record_id"
      ? "(SELECT ?||printf('%04d',COALESCE(MAX(CAST(substr(record_id,10) AS INTEGER)),0)+1) FROM patients_patient WHERE clinic_id=? AND record_id LIKE ?)"
      : "?",
  );
  const values = keys.flatMap((k) =>
    k === "record_id" ? [prefix, row.clinic_id, `${prefix}%`] : [row[k]],
  );
  return {
    row,
    statement: stmt(
      db,
      `INSERT INTO patients_patient (${keys.map(quote)}) VALUES (${expressions})`,
      values,
    ),
  };
}
export async function nestedStatements(
  c: Ctx,
  table: string,
  parent: Row,
  body: Row,
  replace: boolean,
) {
  const spec =
    table === tables.patients
      ? [
          [
            "medical_history",
            "patients_medicalhistory",
            "MedicalHistorySerializer",
            "patient_id",
          ],
          [
            "family_history",
            "patients_familyhistory",
            "FamilyHistorySerializer",
            "patient_id",
          ],
        ]
      : table === tables.prescriptions
        ? [
            [
              "medications",
              "prescriptions_medication",
              "MedicationSerializer",
              "prescription_id",
            ],
            [
              "procedures",
              "prescriptions_procedureentry",
              "ProcedureEntrySerializer",
              "prescription_id",
            ],
          ]
        : [];
  const statements: D1PreparedStatement[] = [];
  for (const [name, child, contract, fk] of spec)
    if (Object.hasOwn(body, name)) {
      const items = rows(body[name]);
      if (replace)
        statements.push(
          stmt(dbOf(c), `DELETE FROM ${child} WHERE ${fk}=?`, [parent.id]),
        );
      for (const item of items) {
        const data = await validate(
          dbOf(c),
          child,
          item,
          contract,
          clinicOf(c),
        );
        statements.push(
          insert(dbOf(c), child, { ...data, [fk]: parent.id }).statement,
        );
      }
    }
  return statements;
}
async function diagnostic(c: Ctx, body: Row) {
  if (!Object.hasOwn(body, "diagnostic_data")) return;
  const value = record(body.diagnostic_data),
    discipline = c.get("clinic").discipline;
  const expected: Record<string, string> = {
    siddha: "envagai_thervu",
    ayurveda: "prakriti",
    homeopathy: "homeopathy_case",
    unani: "notes",
    yoga_naturopathy: "notes",
  };
  check(
    Object.keys(value).every((k) => k === expected[discipline]),
    "Unexpected diagnostic data for this discipline.",
  );
  if (discipline === "homeopathy" && value.homeopathy_case) {
    const homeo = record(value.homeopathy_case);
    if (homeo.chief_complaints !== undefined) rows(homeo.chief_complaints);
    check(
      [
        "psoric",
        "sycotic",
        "syphilitic",
        "tubercular",
        "cancer",
        "mixed",
        "unknown",
        "",
      ].includes(str(homeo, "miasmatic_classification")),
      "Invalid miasmatic classification.",
    );
  }
}

for (const [path, table] of [
  ["/patients", tables.patients],
  ["/consultations", tables.consultations],
  ["/prescriptions/remedy-followup", tables.remedies],
  ["/prescriptions", tables.prescriptions],
  ["/pharmacy/medicines", tables.medicines],
]) {
  crud.get(`${path}/`, async (c) => {
    const db = dbOf(c),
      where = scope(table, clinicOf(c)),
      predicates = [where.sql],
      values = [...where.values];
    const columns: Record<string, string> =
      table === tables.consultations
        ? { patient: "t.patient_id", consultation_date: "t.consultation_date" }
        : table === tables.prescriptions
          ? {
              consultation__patient:
                "t.consultation_id IN (SELECT id FROM consultations_consultation WHERE patient_id=? )",
              follow_up_date: "t.follow_up_date",
            }
          : table === tables.remedies
            ? {
                prescription: "t.prescription_id",
                prescription__consultation__patient:
                  "t.prescription_id IN (SELECT p.id FROM prescriptions_prescription p JOIN consultations_consultation c ON c.id=p.consultation_id WHERE c.patient_id=?)",
              }
            : table === tables.medicines
              ? { category: "t.category", is_active: "t.is_active" }
              : { gender: "t.gender", is_active: "t.is_active" };
    for (const [name, column] of Object.entries(columns)) {
      const value = c.req.query(name);
      if (value !== undefined) {
        predicates.push(column.includes("?") ? column : `${column}=?`);
        values.push(value === "true" ? 1 : value === "false" ? 0 : value);
      }
    }
    const search = c.req.query("search");
    if (search && table !== tables.remedies) {
      if ([tables.consultations, tables.prescriptions].includes(table))
        predicates.push(
          `${table === tables.consultations ? "t.patient_id" : "(SELECT patient_id FROM consultations_consultation WHERE id=t.consultation_id)"} IN (SELECT id FROM patients_patient WHERE name LIKE ? OR record_id LIKE ?)`,
        );
      else
        predicates.push(
          table === tables.medicines
            ? "(t.name LIKE ? OR t.name_ta LIKE ? OR t.brand_name LIKE ?)"
            : "(t.name LIKE ? OR t.record_id LIKE ? OR t.phone LIKE ?)",
        );
      values.push(`%${search}%`, `%${search}%`);
      if ([tables.patients, tables.medicines].includes(table))
        values.push(`%${search}%`);
    }
    const page = Math.max(
        1,
        Number.parseInt(c.req.query("page") || "1", 10) || 1,
      ),
      limit = 20;
    const requested =
        c.req.query("ordering") ||
        (table === tables.consultations
          ? "-consultation_date"
          : table === tables.medicines
            ? "name"
            : "-created_at"),
      order = requested.replace(/^-/, "");
    check(
      [
        "created_at",
        "consultation_date",
        "name",
        "record_id",
        "current_stock",
      ].includes(order) &&
        (order !== "consultation_date" || table === tables.consultations) &&
        (order !== "name" ||
          [tables.patients, tables.medicines].includes(table)) &&
        (order !== "record_id" || table === tables.patients) &&
        (order !== "current_stock" || table === tables.medicines),
      "Invalid ordering.",
    );
    const condition = predicates.join(" AND "),
      count = num(
        (await one(
          db,
          `SELECT count(*) count FROM ${table} t WHERE ${condition}`,
          values,
        ))!,
        "count",
      );
    const found = await all(
      db,
      `SELECT t.* FROM ${table} t WHERE ${condition} ORDER BY t.${quote(order)} ${requested.startsWith("-") ? "DESC" : "ASC"},t.id LIMIT ? OFFSET ?`,
      [...values, limit, (page - 1) * limit],
    );
    const link = (p: number) => {
      const url = new URL(c.req.url);
      url.searchParams.set("page", String(p));
      return url.href;
    };
    return c.json({
      count,
      next: page * limit < count ? link(page + 1) : null,
      previous: page > 1 ? link(page - 1) : null,
      results: await Promise.all(
        found.map((row) => serialize(db, table, row, false)),
      ),
    });
  });
  crud.post(`${path}/`, async (c) => {
    if (table !== tables.patients) doctor(c);
    const body = record(await c.req.json()),
      data = await validate(
        dbOf(c),
        table,
        body,
        contracts[table][1],
        clinicOf(c),
      );
    if (table === tables.consultations) {
      await diagnostic(c, body);
      data.conducted_by_id = c.get("user").id;
    }
    data.clinic_id = clinicOf(c);
    const created =
      table === tables.patients
        ? patientInsert(dbOf(c), data)
        : insert(dbOf(c), table, data);
    const nested = await nestedStatements(c, table, created.row, body, false);
    await dbOf(c).batch([created.statement, ...nested]);
    return c.json(
      await serialize(
        dbOf(c),
        table,
        await get(dbOf(c), table, created.row.id, clinicOf(c)),
      ),
      201,
    );
  });
  crud.get(`${path}/:pk/`, async (c) =>
    c.json(
      await serialize(
        dbOf(c),
        table,
        await get(dbOf(c), table, c.req.param("pk"), clinicOf(c)),
      ),
    ),
  );
  const mutate = async (c: Ctx) => {
    if (table !== tables.patients) doctor(c);
    const original = await get(dbOf(c), table, c.req.param("pk"), clinicOf(c)),
      body = record(await c.req.json());
    const data = await validate(
      dbOf(c),
      table,
      body,
      contracts[table][1],
      clinicOf(c),
      c.req.method === "PATCH",
    );
    for (const fk of ["patient_id", "consultation_id", "prescription_id"])
      if (Object.hasOwn(data, fk))
        check(data[fk] === original[fk], "Cannot reassign this record.");
    if (table === tables.consultations) await diagnostic(c, body);
    const nested = await nestedStatements(c, table, original, body, true);
    await dbOf(c).batch([
      ...(Object.keys(data).length
        ? [update(dbOf(c), table, original.id, data, clinicOf(c))]
        : []),
      ...nested,
    ]);
    return c.json(
      await serialize(
        dbOf(c),
        table,
        await get(dbOf(c), table, original.id, clinicOf(c)),
      ),
    );
  };
  crud.patch(`${path}/:pk/`, mutate);
  crud.put(`${path}/:pk/`, mutate);
  crud.delete(`${path}/:pk/`, async (c) => {
    if (table !== tables.patients) doctor(c);
    await get(dbOf(c), table, c.req.param("pk"), clinicOf(c));
    await stmt(dbOf(c), `DELETE FROM ${table} WHERE id=? AND clinic_id=?`, [
      c.req.param("pk"),
      clinicOf(c),
    ]).run();
    return c.body(null, 204);
  });
}

clinical.get("/patients/check_phone/", async (c) => {
  const phone = c.req.query("phone") || "";
  if (phone.length < 10) return c.json([]);
  return c.json(
    await all(
      dbOf(c),
      "SELECT id,name,record_id FROM patients_patient WHERE clinic_id=? AND phone=? AND id<>? LIMIT 5",
      [clinicOf(c), phone, c.req.query("exclude") || 0],
    ),
  );
});
clinical.get("/patients/:pk/consultations/", async (c) => {
  await get(dbOf(c), tables.patients, c.req.param("pk"), clinicOf(c));
  const found = await all(
    dbOf(c),
    "SELECT * FROM consultations_consultation WHERE patient_id=? AND clinic_id=? ORDER BY consultation_date DESC",
    [c.req.param("pk"), clinicOf(c)],
  );
  return c.json(
    await Promise.all(
      found.map((row) => serialize(dbOf(c), tables.consultations, row, false)),
    ),
  );
});
clinical.get("/patients/:pk/remedy-history/", async (c) => {
  const patient = await get(
    dbOf(c),
    tables.patients,
    c.req.param("pk"),
    clinicOf(c),
  );
  const found = await all(
    dbOf(c),
    "SELECT r.*,c.consultation_date FROM prescriptions_prescription r JOIN consultations_consultation c ON c.id=r.consultation_id WHERE c.patient_id=? AND r.clinic_id=? ORDER BY c.consultation_date",
    [patient.id, clinicOf(c)],
  );
  const timeline: Row[] = [];
  for (const rx of found) {
    const meds = await all(
      dbOf(c),
      "SELECT drug_name,potency,dilution_scale,pellet_count FROM prescriptions_medication WHERE prescription_id=? AND (potency<>'' OR dilution_scale<>'' OR pellet_count IS NOT NULL)",
      [rx.id],
    );
    if (!meds.length) continue;
    const response = await one(
      dbOf(c),
      "SELECT * FROM prescriptions_remedyfollowupresponse WHERE prescription_id=? ORDER BY created_at LIMIT 1",
      [rx.id],
    );
    timeline.push({
      date: rx.consultation_date,
      prescription_id: rx.id,
      consultation_id: rx.consultation_id,
      medications: meds,
      response_at_next_visit: response
        ? output(tables.remedies, response, "RemedyFollowUpResponseSerializer")
        : null,
    });
  }
  return c.json({
    patient_id: patient.id,
    patient_name: patient.name,
    remedy_timeline: timeline,
  });
});
clinical.post("/patients/:pk/toggle-active/", async (c) => {
  const patient = await get(
    dbOf(c),
    tables.patients,
    c.req.param("pk"),
    clinicOf(c),
  );
  const value = await stmt(
    dbOf(c),
    "UPDATE patients_patient SET is_active=1-is_active,updated_at=? WHERE id=? AND clinic_id=? RETURNING is_active",
    [now(), patient.id, clinicOf(c)],
  ).first<Row>();
  return c.json({ is_active: !!value?.is_active });
});
for (const action of ["bulk-delete", "bulk-toggle-active"])
  clinical.post(`/patients/${action}/`, async (c) => {
    const body = record(await c.req.json());
    check(
      Array.isArray(body.ids) &&
        body.ids.length > 0 &&
        body.ids.length <= 200 &&
        body.ids.every((x) => Number.isSafeInteger(x) && Number(x) > 0),
      "Provide 1 to 200 patient IDs.",
    );
    const ids = [...new Set(body.ids as number[])],
      where = ids.map(() => "?").join(",");
    if (action === "bulk-delete") {
      const result = await stmt(
        dbOf(c),
        `DELETE FROM patients_patient WHERE clinic_id=? AND id IN (${where})`,
        [clinicOf(c), ...ids],
      ).run();
      return c.json({ deleted: result.meta.changes });
    }
    check(typeof body.is_active === "boolean", "is_active must be boolean.");
    const result = await stmt(
      dbOf(c),
      `UPDATE patients_patient SET is_active=?,updated_at=? WHERE clinic_id=? AND id IN (${where})`,
      [Number(body.is_active), now(), clinicOf(c), ...ids],
    ).run();
    return c.json({ updated: result.meta.changes });
  });
clinical.get("/pharmacy/medicines/low-stock/", async (c) =>
  c.json(
    await Promise.all(
      (
        await all(
          dbOf(c),
          "SELECT * FROM pharmacy_medicine WHERE clinic_id=? AND is_active=1 AND current_stock<=reorder_level ORDER BY name",
          [clinicOf(c)],
        )
      ).map((row) => serialize(dbOf(c), tables.medicines, row, false)),
    ),
  ),
);
clinical.post("/pharmacy/medicines/:pk/adjust-stock/", async (c) => {
  const med = await get(
      dbOf(c),
      tables.medicines,
      c.req.param("pk"),
      clinicOf(c),
    ),
    body = record(await c.req.json()),
    qty = num(body, "quantity");
  check(
    Number.isSafeInteger(qty) &&
      qty >= 1 &&
      qty <= 100000000 &&
      ["purchase", "adjustment"].includes(str(body, "entry_type")),
    "Invalid stock adjustment.",
  );
  const entry = insert(dbOf(c), "pharmacy_stockentry", {
    medicine_id: med.id,
    entry_type: body.entry_type,
    quantity_change: qty,
    balance_after: 0,
    notes: str(body, "notes"),
    batch_number: str(body, "batch_number"),
    expiry_date: body.expiry_date ?? null,
    actor_id: c.get("user").id,
  });
  await dbOf(c).batch([
    stmt(
      dbOf(c),
      "UPDATE pharmacy_medicine SET current_stock=current_stock+?,updated_at=? WHERE id=? AND clinic_id=?",
      [qty, now(), med.id, clinicOf(c)],
    ),
    entry.statement,
    stmt(
      dbOf(c),
      "UPDATE pharmacy_stockentry SET balance_after=(SELECT current_stock FROM pharmacy_medicine WHERE id=?) WHERE id=?",
      [med.id, entry.row.id],
    ),
  ]);
  return c.json(
    await serialize(
      dbOf(c),
      tables.medicines,
      await get(dbOf(c), tables.medicines, med.id, clinicOf(c)),
    ),
  );
});
async function dispenseOutput(db: DB, row: Row) {
  const user = await get(db, "users_user", row.dispensed_by_id);
  const items = await all(
    db,
    "SELECT * FROM pharmacy_dispensingitem WHERE dispensing_record_id=?",
    [row.id],
  );
  return output(
    "pharmacy_dispensingrecord",
    row,
    "DispensingRecordListSerializer",
    {
      dispensed_by_name:
        `${str(user, "first_name")} ${str(user, "last_name")}`.trim(),
      items: items.map((x) =>
        output("pharmacy_dispensingitem", x, "DispensingItemSerializer"),
      ),
    },
  );
}
clinical.get("/pharmacy/dispensing/", async (c) => {
  const found = await all(
    dbOf(c),
    "SELECT * FROM pharmacy_dispensingrecord WHERE clinic_id=? AND (? IS NULL OR prescription_id=?) ORDER BY created_at DESC",
    [
      clinicOf(c),
      c.req.query("prescription") ?? null,
      c.req.query("prescription") ?? null,
    ],
  );
  return c.json(
    await Promise.all(found.map((row) => dispenseOutput(dbOf(c), row))),
  );
});
clinical.post("/pharmacy/dispensing/", async (c) => {
  const body = record(await c.req.json()),
    rx = await get(
      dbOf(c),
      tables.prescriptions,
      body.prescription_id,
      clinicOf(c),
    ),
    items = rows(body.items);
  check(items.length, "At least one item is required.");
  const created = insert(dbOf(c), "pharmacy_dispensingrecord", {
      clinic_id: clinicOf(c),
      prescription_id: rx.id,
      dispensed_by_id: c.get("user").id,
      notes: str(body, "notes"),
    }),
    statements = [created.statement];
  for (const item of items) {
    const med = await get(
        dbOf(c),
        tables.medicines,
        item.medicine_id,
        clinicOf(c),
      ),
      qty = num(item, "quantity_dispensed");
    check(
      Number.isSafeInteger(qty) && qty > 0,
      "Quantity must be a positive integer.",
    );
    statements.push(
      assertion(
        dbOf(c),
        "EXISTS(SELECT 1 FROM pharmacy_medicine WHERE id=? AND clinic_id=? AND current_stock>=?)",
        [med.id, clinicOf(c), qty],
      ),
    );
    statements.push(
      stmt(
        dbOf(c),
        "UPDATE pharmacy_medicine SET current_stock=current_stock-?,updated_at=? WHERE id=? AND clinic_id=?",
        [qty, now(), med.id, clinicOf(c)],
      ),
    );
    const entry = insert(dbOf(c), "pharmacy_stockentry", {
      medicine_id: med.id,
      entry_type: "dispense",
      quantity_change: -qty,
      balance_after: 0,
      notes: `Dispensed for Rx #${rx.id}`,
      actor_id: c.get("user").id,
    });
    statements.push(
      insert(dbOf(c), "pharmacy_dispensingitem", {
        dispensing_record_id: created.row.id,
        medicine_id: med.id,
        drug_name_snapshot: med.name,
        quantity_dispensed: qty,
        unit_price_snapshot: med.unit_price,
      }).statement,
      entry.statement,
      stmt(
        dbOf(c),
        "UPDATE pharmacy_stockentry SET balance_after=(SELECT current_stock FROM pharmacy_medicine WHERE id=?) WHERE id=?",
        [med.id, entry.row.id],
      ),
    );
  }
  await dbOf(c).batch(statements);
  return c.json(await dispenseOutput(dbOf(c), created.row), 201);
});
clinical.route("/", crud);

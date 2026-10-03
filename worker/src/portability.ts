import { Hono } from "hono";
import { zipSync, strToU8 } from "fflate";
import {
  all,
  check,
  clinicOf,
  dbOf,
  insert,
  now,
  num,
  one,
  owner,
  record,
  stmt,
  str,
  today,
  validate,
} from "./data";
import type { App, Ctx, Row } from "./data";
import { patientInsert, tables } from "./clinical";
import { startJourney } from "./integrations";

export const portability = new Hono<App>();
function parseCsv(text: string): Row[] {
  const records: string[][] = [],
    cells: string[] = [];
  let cell = "",
    quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i <= text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if ((ch === "," || ch === "\n" || ch === undefined) && !quoted) {
      cells.push(cell.replace(/\r$/, ""));
      cell = "";
      if (ch !== ",") {
        if (cells.some((x) => x.trim())) records.push(cells.splice(0));
        else cells.splice(0);
      }
    } else cell += ch;
  }
  check(!quoted, "Unclosed CSV quote.");
  const headers = records.shift() || [];
  check(
    ["name", "age", "gender", "phone"].every((key) => headers.includes(key)),
    "Missing columns. Include name, age, gender, and phone.",
  );
  check(
    records.length > 0 && records.length <= 1000,
    "Provide 1 to 1000 CSV rows.",
  );
  check(
    new Set(headers).size === headers.length,
    "CSV headers must be unique.",
  );
  return records.map((cells) =>
    Object.fromEntries(
      headers.map((name, i) => [name, cells[i]?.trim() || ""]),
    ),
  );
}
function parseDate(text: string) {
  if (!text) return null;
  let result = text;
  const match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match)
    result = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  check(
    /^\d{4}-\d{2}-\d{2}$/.test(result) &&
      Number.isFinite(Date.parse(`${result}T00:00:00Z`)) &&
      new Date(`${result}T00:00:00Z`).toISOString().slice(0, 10) === result,
    "Date format not recognized.",
  );
  return result;
}
async function importRows(c: Ctx, text: string) {
  const input = parseCsv(text),
    seen = new Set<string>(),
    result: Row[] = [];
  for (const [index, row] of input.entries()) {
    const errors: string[] = [],
      warnings: string[] = [],
      data: Row = {};
    const gender: Record<string, string> = {
      m: "male",
      male: "male",
      f: "female",
      female: "female",
      o: "other",
      other: "other",
    };
    const source: Row = {
      ...Object.fromEntries(
        [
          "name",
          "phone",
          "email",
          "address",
          "whatsapp_number",
          "blood_group",
          "occupation",
          "allergies",
          "food_habits",
        ]
          .filter((key) => Object.hasOwn(row, key))
          .map((key) => [key, row[key]]),
      ),
      gender: gender[str(row, "gender").toLowerCase()] || str(row, "gender"),
      age: str(row, "age"),
      blood_group: str(row, "blood_group").toUpperCase(),
      food_habits: str(row, "food_habits").toLowerCase(),
    };
    if (str(row, "date_of_birth"))
      try {
        source.date_of_birth = parseDate(str(row, "date_of_birth"));
      } catch {
        errors.push("Date format not recognized.");
      }
    try {
      check(str(row, "age") !== "", "age is required.");
      Object.assign(
        data,
        await validate(
          dbOf(c),
          tables.patients,
          source,
          "PatientDetailSerializer",
          clinicOf(c),
        ),
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid row.");
    }
    const phone = str(row, "phone");
    if (!phone) errors.push("phone is required");
    if (seen.has(phone)) errors.push("duplicate phone number in CSV");
    seen.add(phone);
    if (
      await one(
        dbOf(c),
        "SELECT id FROM patients_patient WHERE clinic_id=? AND phone=?",
        [clinicOf(c), phone],
      )
    )
      warnings.push("phone already exists in clinic");
    try {
      for (const key of ["date_of_birth", "last_seen_date", "next_review_date"])
        if (str(row, key)) {
          const date = parseDate(str(row, key));
          if (key === "last_seen_date")
            check(date! <= today(), "last_seen_date cannot be in the future.");
          data[key === "date_of_birth" ? key : `_${key}`] = date;
        }
    } catch (error) {
      errors.push((error as Error).message);
    }
    data._diagnosis = str(row, "diagnosis");
    result.push({ line: index + 2, data, errors, warnings, raw: row });
  }
  return result;
}
for (const mode of ["preview", "confirm"])
  portability.post(`/patients/import/${mode}/`, async (c) => {
    const form = await c.req.formData(),
      file = form.get("file");
    check(
      file instanceof File &&
        file.name.toLowerCase().endsWith(".csv") &&
        file.size <= 2 * 1024 * 1024,
      "Provide a CSV file under 2 MB.",
    );
    const checked = await importRows(c, await file.text()),
      errors = checked.filter((row) => (row.errors as string[]).length),
      warnings = checked.filter((row) => (row.warnings as string[]).length);
    if (mode === "preview")
      return c.json({
        valid: errors.length === 0,
        total_rows: checked.length,
        error_count: errors.length,
        warning_count: warnings.length,
        preview: checked.slice(0, 10),
        errors: errors.slice(0, 20),
        warnings: warnings.slice(0, 20),
      });
    const skip = form.get("skip_duplicates") !== "false",
      statements: D1PreparedStatement[] = [],
      pending: { patient: Row; consultation: Row | null; date: string }[] = [];
    let created = 0,
      skipped = 0,
      consultations = 0;
    for (const row of checked) {
      if ((row.errors as string[]).length) continue;
      const data = record(row.data);
      if (
        skip &&
        (row.warnings as string[]).includes("phone already exists in clinic")
      ) {
        skipped++;
        continue;
      }
      const patient = patientInsert(dbOf(c), {
        ...data,
        clinic_id: clinicOf(c),
      });
      statements.push(patient.statement);
      created++;
      let consultation: Row | null = null;
      if (data._diagnosis) {
        const item = insert(dbOf(c), "consultations_consultation", {
          clinic_id: clinicOf(c),
          patient_id: patient.row.id,
          conducted_by_id: c.get("user").id,
          diagnosis: data._diagnosis,
          consultation_date: data._last_seen_date || today(),
          is_imported: 1,
        });
        statements.push(item.statement);
        consultation = item.row;
        consultations++;
      }
      if (data._next_review_date)
        pending.push({
          patient: patient.row,
          consultation,
          date: str(data, "_next_review_date"),
        });
    }
    if (statements.length) await dbOf(c).batch(statements);
    const sync: Row = { synced: 0, failed: 0, failed_patient_ids: [] };
    if (c.env.RUTHVA_API_URL)
      for (const item of pending) {
        try {
          const interval = Math.max(
            1,
            Math.ceil((Date.parse(item.date) - Date.parse(today())) / 86400000),
          );
          await startJourney(
            c,
            item.patient,
            item.consultation,
            interval * 4,
            interval,
          );
          sync.synced = num(sync, "synced") + 1;
        } catch {
          sync.failed = num(sync, "failed") + 1;
          (sync.failed_patient_ids as unknown[]).push(item.patient.id);
        }
      }
    return c.json(
      {
        created,
        skipped,
        consultation_created_count: consultations,
        errors,
        warnings,
        ruthva_sync: sync,
      },
      201,
    );
  });

const exportSpecs = {
  patients: [
    "record_id",
    "name",
    "age",
    "gender",
    "phone",
    "whatsapp_number",
    "email",
    "address",
    "blood_group",
    "occupation",
    "allergies",
    "food_habits",
    "date_of_birth",
    "created_at",
  ],
  consultations: [
    "patient_record_id",
    "patient_phone",
    "consultation_date",
    "chief_complaints",
    "history_of_present_illness",
    "diagnosis",
    "weight",
    "height",
    "bp_systolic",
    "bp_diastolic",
    "pulse_rate",
    "temperature",
    "diagnostic_data",
    "created_at",
  ],
  prescriptions: [
    "patient_phone",
    "consultation_date",
    "diet_advice",
    "lifestyle_advice",
    "exercise_advice",
    "follow_up_date",
    "follow_up_notes",
    "row_type",
    "drug_name",
    "dosage",
    "frequency",
    "duration",
    "instructions",
    "sort_order",
    "procedure_name",
    "procedure_details",
    "procedure_duration",
    "procedure_follow_up_date",
    "created_at",
  ],
};
function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
async function exportRows(c: Ctx, name: keyof typeof exportSpecs) {
  if (name === "patients")
    return all(
      dbOf(c),
      "SELECT * FROM patients_patient WHERE clinic_id=? ORDER BY id",
      [clinicOf(c)],
    );
  if (name === "consultations")
    return all(
      dbOf(c),
      "SELECT c.*,p.record_id patient_record_id,p.phone patient_phone FROM consultations_consultation c JOIN patients_patient p ON p.id=c.patient_id WHERE c.clinic_id=? ORDER BY c.id",
      [clinicOf(c)],
    );
  const found = await all(
      dbOf(c),
      "SELECT r.*,c.consultation_date,p.phone patient_phone FROM prescriptions_prescription r JOIN consultations_consultation c ON c.id=r.consultation_id JOIN patients_patient p ON p.id=c.patient_id WHERE r.clinic_id=? ORDER BY r.id",
      [clinicOf(c)],
    ),
    result: Row[] = [];
  for (const rx of found) {
    const meds = await all(
        dbOf(c),
        "SELECT * FROM prescriptions_medication WHERE prescription_id=? ORDER BY sort_order,id",
        [rx.id],
      ),
      procs = await all(
        dbOf(c),
        "SELECT * FROM prescriptions_procedureentry WHERE prescription_id=? ORDER BY id",
        [rx.id],
      );
    result.push(
      ...meds.map((x) => ({
        ...rx,
        drug_name: x.drug_name,
        dosage: x.dosage,
        frequency: x.frequency,
        duration: x.duration,
        instructions: x.instructions,
        sort_order: x.sort_order,
        row_type: "medication",
      })),
      ...procs.map((x) => ({
        ...rx,
        row_type: "procedure",
        procedure_name: x.name,
        procedure_details: x.details,
        procedure_duration: x.duration,
        procedure_follow_up_date: x.follow_up_date,
      })),
    );
    if (!meds.length && !procs.length) result.push(rx);
  }
  return result;
}
for (const name of [
  "patients",
  "consultations",
  "prescriptions",
  "all",
] as const)
  portability.get(`/export/${name}/`, async (c) => {
    owner(c);
    const files: Record<string, Uint8Array> = {};
    let count = 0;
    for (const kind of name === "all"
      ? (["patients", "consultations", "prescriptions"] as const)
      : [name]) {
      const found = await exportRows(c, kind),
        headers = exportSpecs[kind];
      count += found.length;
      files[`${kind}.csv`] = strToU8(
        `\uFEFF${headers.map(csvCell).join(",")}\r\n${found.map((row) => headers.map((key) => csvCell(row[key])).join(",")).join("\r\n")}\r\n`,
      );
    }
    await insert(dbOf(c), "clinics_dataexportaudit", {
      clinic_id: clinicOf(c),
      actor_id: c.get("user").id,
      endpoint: `/api/v1/export/${name}/`,
      row_count: count,
    }).statement.run();
    const bytes = name === "all" ? zipSync(files) : files[`${name}.csv`];
    return new Response(bytes, {
      headers: {
        "Content-Type":
          name === "all" ? "application/zip" : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name === "all" ? "clinic-export.zip" : `${name}.csv`}"`,
      },
    });
  });

import models from "./model-shape.json";
import serializers from "./serializer-shape.json";
import type { Context } from "hono";

export type Row = Record<string, unknown>;
export interface Clinic extends Row {
  id: number;
  subdomain: string;
  discipline: string;
  plan: string;
  is_active: number;
  active_patient_limit: number;
}
export interface User extends Row {
  id: number;
  clinic_id: number | null;
  role: string;
  is_clinic_owner: number;
  is_active: number;
  password: string;
  email_verified_at: string | null;
  session_version: number;
}
export interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
  BROWSER: Fetcher;
  JWT_SECRET: string;
  CRON_SECRET: string;
  FRONTEND_URL: string;
  CORS_ALLOWED_ORIGINS: string;
  DEFAULT_FROM_EMAIL: string;
  AWS_SES_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_SESSION_TOKEN?: string;
  GITHUB_TOKEN?: string;
  GITHUB_FEEDBACK_REPO?: string;
  QUACKBACK_URL?: string;
  QUACKBACK_WIDGET_SECRET?: string;
  RUTHVA_API_URL?: string;
  RUTHVA_INTEGRATION_SECRET?: string;
  RUTHVA_CLINIC_SUBDOMAIN?: string;
  RUTHVA_ADMIN_EMAIL?: string;
  TEST_EMAIL?: string;
}
export type App = {
  Bindings: Env;
  Variables: { user: User; clinic: Clinic; db: D1DatabaseSession };
};
export type Ctx = Context<App>;
export type DB = D1Database | D1DatabaseSession;
type Field = {
  column: string;
  type: string;
  nullable: boolean;
  blank: boolean;
  maxLength: number | null;
  decimalPlaces?: number | null;
  maxDigits?: number | null;
  choices: string[];
  default: unknown;
  factory: string | null;
  auto: boolean;
  target: string | null;
  min: number | null;
  max: number | null;
};
const shape: Record<
  string,
  { fields: Record<string, Field>; ordering: string[] }
> = models;
export const now = () => new Date().toISOString();
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const str = (row: Row, key: string, fallback = "") =>
  typeof row[key] === "string" ? (row[key] as string) : fallback;
export const num = (row: Row, key: string) => Number(row[key]);
export const flag = (row: Row, key: string) =>
  row[key] === true || row[key] === 1;
export const id = () =>
  Number.parseInt(crypto.randomUUID().replaceAll("-", "").slice(0, 12), 16);
export class ApiError extends Error {
  constructor(
    public status: number,
    public details: Row | string,
  ) {
    super(typeof details === "string" ? details : "Invalid request");
  }
}
export function check(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new ApiError(status, message);
}
export function record(value: unknown): Row {
  check(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "Expected an object.",
  );
  return value as Row;
}
export function rows(value: unknown): Row[] {
  check(
    Array.isArray(value) && value.length <= 1000,
    "Expected at most 1000 items.",
  );
  return value.map(record);
}
export const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
export const stmt = (db: DB, sql: string, values: unknown[] = []) =>
  db
    .prepare(sql)
    .bind(
      ...values.map((v) =>
        v === undefined ? null : typeof v === "boolean" ? Number(v) : v,
      ),
    );
export async function all(
  db: DB,
  sql: string,
  values: unknown[] = [],
): Promise<Row[]> {
  return (await stmt(db, sql, values).all<Row>()).results;
}
export async function one(
  db: DB,
  sql: string,
  values: unknown[] = [],
): Promise<Row | null> {
  return stmt(db, sql, values).first<Row>();
}

const parents: Record<string, [string, string]> = {
  patients_medicalhistory: ["patient_id", "patients_patient"],
  patients_familyhistory: ["patient_id", "patients_patient"],
  prescriptions_medication: ["prescription_id", "prescriptions_prescription"],
  prescriptions_procedureentry: [
    "prescription_id",
    "prescriptions_prescription",
  ],
  treatments_treatmentblock: ["treatment_plan_id", "treatments_treatmentplan"],
  treatments_treatmentsession: [
    "treatment_block_id",
    "treatments_treatmentblock",
  ],
  treatments_sessionfeedback: [
    "treatment_session_id",
    "treatments_treatmentsession",
  ],
  pharmacy_stockentry: ["medicine_id", "pharmacy_medicine"],
  pharmacy_dispensingitem: [
    "dispensing_record_id",
    "pharmacy_dispensingrecord",
  ],
};
export function scope(
  table: string,
  clinic: number,
  alias = "t",
): { sql: string; values: unknown[] } {
  if (shape[table].fields.clinic)
    return { sql: `${alias}.clinic_id=?`, values: [clinic] };
  if (table === "clinics_clinic")
    return { sql: `${alias}.id=?`, values: [clinic] };
  const parent = parents[table];
  check(parent, "This model has no clinic scope.", 500);
  const sub = scope(parent[1], clinic, `${alias}p`);
  return {
    sql: `${alias}.${parent[0]} IN (SELECT ${alias}p.id FROM ${parent[1]} ${alias}p WHERE ${sub.sql})`,
    values: sub.values,
  };
}
export async function get(
  db: DB,
  table: string,
  pk: unknown,
  clinic?: number,
): Promise<Row> {
  const where =
    clinic === undefined ? { sql: "1=1", values: [] } : scope(table, clinic);
  const result = await one(
    db,
    `SELECT t.* FROM ${quote(table)} t WHERE t.id=? AND ${where.sql}`,
    [pk, ...where.values],
  );
  check(result, "Not found.", 404);
  return result;
}
export function defaults(table: string, input: Row): Row {
  const result: Row = {};
  for (const field of Object.values(shape[table].fields)) {
    let value = input[field.column];
    if (value === undefined) {
      if (field.column === "id") value = id();
      else if (field.factory === "now") value = now();
      else if (field.factory === "uuid")
        value = crypto.randomUUID().replaceAll("-", "");
      else if (field.factory === "json") value = "{}";
      else if (field.default !== null) value = field.default;
      else if (field.nullable) value = null;
      else if (
        [
          "CharField",
          "TextField",
          "EmailField",
          "URLField",
          "SlugField",
        ].includes(field.type)
      )
        value = "";
      else value = 0;
    }
    result[field.column] =
      typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : value;
  }
  return result;
}
export function insert(
  db: DB,
  table: string,
  input: Row,
): { row: Row; statement: D1PreparedStatement } {
  const row = defaults(table, input),
    keys = Object.keys(row);
  return {
    row,
    statement: stmt(
      db,
      `INSERT INTO ${quote(table)} (${keys.map(quote)}) VALUES (${keys.map(() => "?")})`,
      Object.values(row),
    ),
  };
}
export function update(
  db: DB,
  table: string,
  pk: unknown,
  input: Row,
  clinic?: number,
): D1PreparedStatement {
  const row = { ...input };
  if (shape[table].fields.updated_at) row.updated_at = now();
  check(Object.keys(row).length, "No fields to update.");
  const where =
    clinic === undefined ? { sql: "1=1", values: [] } : scope(table, clinic);
  return stmt(
    db,
    `UPDATE ${quote(table)} AS t SET ${Object.keys(row).map((k) => `${quote(k)}=?`)} WHERE t.id=? AND ${where.sql}`,
    [...Object.values(row), pk, ...where.values],
  );
}
export async function validate(
  db: DB,
  table: string,
  input: Row,
  contract: string,
  clinic?: number,
  partial = false,
): Promise<Row> {
  const allowed = (
    serializers as Record<
      string,
      Record<
        string,
        {
          readOnly: boolean;
          required: boolean;
          nullable: boolean;
          maxLength?: number | null;
          blank?: boolean | null;
          choices?: string[];
          min?: number | null;
          max?: number | null;
        }
      >
    >
  )[contract];
  check(allowed, `Unknown serializer ${contract}`, 500);
  const result: Row = {};
  for (const [name, spec] of Object.entries(allowed)) {
    const field = shape[table].fields[name];
    if (!field || spec.readOnly) continue;
    let value = input[name];
    if (value === undefined) {
      check(partial || !spec.required, `${name} is required.`);
      continue;
    }
    if (value === null) {
      check(field.nullable || spec.nullable, `${name} cannot be null.`);
      result[field.column] = null;
      continue;
    }
    if (field.type === "BooleanField") {
      check(
        [true, false, 1, 0, "true", "false"].includes(value as never),
        `${name} must be boolean.`,
      );
      value = value === true || value === 1 || value === "true" ? 1 : 0;
    } else if (
      field.type.includes("Integer") ||
      field.target ||
      field.type === "DecimalField"
    ) {
      check(
        typeof value === "number" ||
          (typeof value === "string" && value.trim() !== ""),
        `${name} must be a number.`,
      );
      value = Number(value);
      check(Number.isFinite(value), `${name} must be a number.`);
      if (field.type !== "DecimalField")
        check(Number.isSafeInteger(value), `${name} must be an integer.`);
      if (field.type.startsWith("Positive"))
        check(Number(value) >= 0, `${name} cannot be negative.`);
      if (field.min !== null)
        check(Number(value) >= field.min, `${name} is below its minimum.`);
      if (field.max !== null)
        check(Number(value) <= field.max, `${name} exceeds its maximum.`);
      if (spec.min != null)
        check(Number(value) >= spec.min, `${name} is below its minimum.`);
      if (spec.max != null)
        check(Number(value) <= spec.max, `${name} exceeds its maximum.`);
      if (
        field.type === "DecimalField" &&
        field.maxDigits != null &&
        field.decimalPlaces != null
      ) {
        const places = field.decimalPlaces,
          factor = 10 ** places;
        check(
          Math.abs(Number(value)) < 10 ** (field.maxDigits - places) &&
            Math.abs(
              Number(value) * factor - Math.round(Number(value) * factor),
            ) < 0.00001,
          `${name} has too many digits or decimal places.`,
        );
      }
    } else if (field.type === "JSONField") {
      const text = JSON.stringify(value);
      check(text.length <= 32768, `${name} exceeds 32KB.`);
      const inspect = (node: unknown, depth = 0): void => {
        check(depth <= 4, `${name} nesting is too deep.`);
        if (node && typeof node === "object")
          for (const [key, val] of Object.entries(node)) {
            check(
              !["__proto__", "constructor", "prototype"].includes(key),
              "Disallowed JSON key.",
            );
            inspect(val, depth + 1);
          }
      };
      inspect(value);
      value = text;
    } else {
      check(typeof value === "string", `${name} must be text.`);
      const text = value.trim();
      check(
        (spec.blank ?? field.blank) || text !== "",
        `${name} cannot be blank.`,
      );
      if (field.maxLength)
        check(text.length <= field.maxLength, `${name} is too long.`);
      if (spec.maxLength)
        check(text.length <= spec.maxLength, `${name} is too long.`);
      if (field.type === "DateField")
        check(
          /^\d{4}-\d{2}-\d{2}$/.test(text) &&
            Number.isFinite(Date.parse(`${text}T00:00:00Z`)) &&
            new Date(`${text}T00:00:00Z`).toISOString().slice(0, 10) === text,
          `${name} must be a valid ISO date.`,
        );
      if (field.type === "EmailField" && text)
        check(
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text),
          `${name} must be an email address.`,
        );
      if (field.type === "URLField" && text)
        check(/^https:\/\//.test(text), `${name} must use HTTPS.`);
      value = text;
    }
    if (field.choices.length && value !== "")
      check(
        field.choices.includes(String(value)),
        `${name} has an invalid choice.`,
      );
    if (spec.choices?.length && value !== "")
      check(
        spec.choices.includes(String(value)),
        `${name} has an invalid choice.`,
      );
    if (field.target && value !== null) {
      check(clinic !== undefined, "Missing clinic context.", 403);
      await get(db, field.target, value, clinic);
    }
    result[field.column] = value;
  }
  return result;
}
export function output(
  table: string,
  row: Row,
  contract: string,
  extra: Row = {},
): Row {
  const specs = (
    serializers as Record<
      string,
      Record<string, { writeOnly: boolean; source: string; type: string }>
    >
  )[contract];
  const result: Row = {};
  for (const [name, spec] of Object.entries(specs)) {
    if (spec.writeOnly) continue;
    if (Object.hasOwn(extra, name)) {
      result[name] = extra[name];
      continue;
    }
    const field = shape[table].fields[name];
    let value = field ? row[field.column] : row[name];
    if (field?.type === "BooleanField") value = Boolean(value);
    if (field?.type === "JSONField" && typeof value === "string")
      value = JSON.parse(value);
    if (field?.type === "DecimalField" && value !== null && value !== undefined)
      value = Number(value).toFixed(field.decimalPlaces ?? 2);
    if (
      field?.type === "UUIDField" &&
      typeof value === "string" &&
      value.length === 32
    )
      value = value.replace(
        /(.{8})(.{4})(.{4})(.{4})(.{12})/,
        "$1-$2-$3-$4-$5",
      );
    result[name] = value === undefined ? null : value;
  }
  return result;
}
export const owner = (c: Ctx) =>
  check(
    flag(c.get("user"), "is_clinic_owner"),
    "Only clinic owners can perform this action.",
    403,
  );
export const doctor = (c: Ctx) =>
  check(
    c.get("user").role === "doctor",
    "Only doctors can perform this action.",
    403,
  );
export const dbOf = (c: Ctx) => c.get("db");
export const clinicOf = (c: Ctx) => c.get("clinic").id;

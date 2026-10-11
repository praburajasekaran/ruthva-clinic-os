import type { Row } from "./data";
import { normalizeMedicineName } from "../../shared/medicine-search";

export { normalizeMedicineName } from "../../shared/medicine-search";

// Count a drug once per saved prescription, even if it has several dosage lines.
export function medicineUsage(history: Row[], doctorId: number) {
  const drugs = new Map<
    string,
    { name: string; clinic: Set<number>; doctor: Set<number> }
  >();
  for (const row of history) {
    const name = String(row.drug_name);
    const key = normalizeMedicineName(name);
    if (!key) continue;
    let drug = drugs.get(key);
    if (!drug) {
      drug = { name, clinic: new Set(), doctor: new Set() };
      drugs.set(key, drug);
    }
    const prescriptionId = Number(row.prescription_id);
    drug.clinic.add(prescriptionId);
    if (row.conducted_by_id === doctorId) drug.doctor.add(prescriptionId);
  }
  return [...drugs.values()].map((drug) => ({
    name: drug.name,
    doctor_count: drug.doctor.size,
    clinic_count: drug.clinic.size,
  }));
}

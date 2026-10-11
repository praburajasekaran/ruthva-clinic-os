import siddhaDrugs from "./data/siddha-essential-drugs-2013.json";
import type { Discipline, Medicine } from "./types";
import {
  medicineNameMatches,
  normalizeMedicineName,
} from "../../../shared/medicine-search";

export { normalizeMedicineName } from "../../../shared/medicine-search";

export type MedicineSuggestion = {
  key: string;
  name: string;
  medicine?: Medicine;
};

export type MedicineUsage = {
  name: string;
  doctor_count: number;
  clinic_count: number;
};

export type MedicineSuggestionResponse = {
  results: Medicine[];
  usage: MedicineUsage[];
};

export function getMedicineSuggestions(
  query: string,
  medicines: Medicine[],
  discipline?: Discipline,
  usage: MedicineUsage[] = [],
): MedicineSuggestion[] {
  const search = normalizeMedicineName(query);
  if (search.length < 2) return [];

  const suggestions: MedicineSuggestion[] = medicines
    .filter(
      (medicine) =>
        medicine.is_active &&
        [medicine.name, medicine.name_ta, medicine.brand_name].some((name) =>
          medicineNameMatches(name ?? "", query),
        ),
    )
    .map((medicine) => ({
      key: `medicine-${medicine.id}`,
      name: medicine.name,
      medicine,
    }));

  if (discipline === "siddha") {
    const clinicNames = new Set(
      suggestions.map((suggestion) => normalizeMedicineName(suggestion.name)),
    );
    const references = siddhaDrugs
      .filter(
        (drug) =>
          medicineNameMatches(drug.name, query) &&
          !clinicNames.has(normalizeMedicineName(drug.name)),
      )
      .map((drug) => ({ key: `siddha-${drug.number}`, name: drug.name }));
    suggestions.push(...references);
  }

  const counts = new Map(
    usage.map((item) => [normalizeMedicineName(item.name), item]),
  );
  return suggestions
    .sort((a, b) => {
      const aUsage = counts.get(normalizeMedicineName(a.name));
      const bUsage = counts.get(normalizeMedicineName(b.name));
      return (
        (bUsage?.doctor_count ?? 0) - (aUsage?.doctor_count ?? 0) ||
        (bUsage?.clinic_count ?? 0) - (aUsage?.clinic_count ?? 0) ||
        a.name.localeCompare(b.name) ||
        a.key.localeCompare(b.key)
      );
    })
    .slice(0, 30);
}

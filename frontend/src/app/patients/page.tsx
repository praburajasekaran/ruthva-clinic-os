import type { Metadata } from "next";
import { PatientTable } from "@/components/patients/PatientTable";

export const metadata: Metadata = {
  title: "Patients",
};

async function getPatients() {
  try {
    const res = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:8000"}/api/v1/patients/`,
      { cache: "no-store" },
    );
    if (!res.ok) return { count: 0, next: null, previous: null, results: [] };
    return res.json();
  } catch {
    return { count: 0, next: null, previous: null, results: [] };
  }
}

export default async function PatientsPage() {
  const data = await getPatients();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Patients</h1>
      <PatientTable initialData={data} />
    </div>
  );
}

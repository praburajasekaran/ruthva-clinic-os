"use client";

import { PatientTable } from "@/components/patients/PatientTable";
import { useApi } from "@/hooks/useApi";
import type { PaginatedResponse, PatientListItem } from "@/lib/types";

export default function PatientsPage() {
  const { data } = useApi<PaginatedResponse<PatientListItem>>("/patients/");
  const initialData = data ?? {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Patients</h1>
      <PatientTable initialData={initialData} />
    </div>
  );
}

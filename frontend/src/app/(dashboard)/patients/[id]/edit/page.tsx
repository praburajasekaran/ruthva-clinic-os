"use client";
import { Spinner } from "@/components/ui/Spinner";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PatientForm } from "@/components/patients/PatientForm";
import api from "@/lib/api";
import type { Patient, PatientFormState } from "@/lib/types";

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [initialData, setInitialData] = useState<Partial<PatientFormState> | null>(null);

  useEffect(() => {
    api
      .get<Patient>(`/patients/${id}/`)
      .then((res) => {
        const p = res.data;
        // Convert API response (numbers/nulls) to form state (strings)
        setInitialData({
          name: p.name ?? "",
          age: String(p.age ?? ""),
          date_of_birth: p.date_of_birth ?? "",
          gender: p.gender ?? "",
          phone: p.phone ?? "",
          email: p.email ?? "",
          address: p.address ?? "",
          blood_group: p.blood_group ?? "",
          occupation: p.occupation ?? "",
          marital_status: p.marital_status ?? "",
          referred_by: p.referred_by ?? "",
          allergies: p.allergies ?? "",
          food_habits: p.food_habits ?? "",
          activity_level: p.activity_level ?? "",
          menstrual_history: p.menstrual_history ?? "",
          number_of_children: String(p.number_of_children ?? ""),
          vaccination_records: p.vaccination_records ?? "",
          // Strip `id` from nested arrays — backend will recreate them
          medical_history: (p.medical_history ?? []).map(
            ({ disease, duration, medication }) => ({ disease, duration, medication }),
          ),
          family_history: (p.family_history ?? []).map(
            ({ relation, disease, duration, remarks }) => ({ relation, disease, duration, remarks }),
          ),
        });
      })
      .catch(() => setError("Failed to load patient"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error || "Patient not found"}
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-emerald-700 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Patient</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update patient details
        </p>
      </div>
      <PatientForm
        mode="edit"
        patientId={Number(id)}
        initialData={initialData}
      />
    </div>
  );
}

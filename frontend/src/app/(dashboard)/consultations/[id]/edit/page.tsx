"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConsultationForm } from "@/components/consultations/ConsultationForm";
import { PatientBanner } from "@/components/patients/PatientBanner";
import api from "@/lib/api";
import type { Consultation, Patient } from "@/lib/types";

export default function EditConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Consultation>(`/consultations/${id}/`)
      .then(async (res) => {
        setConsultation(res.data);
        try {
          const patientRes = await api.get<Patient>(
            `/patients/${res.data.patient}/`,
          );
          setPatient(patientRes.data);
        } catch {
          // Patient banner is optional
        }
      })
      .catch(() => setError("Failed to load visit"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error || "Visit not found"}
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

  // Convert API response (numbers/nulls) to form state (strings)
  const initialData = {
    weight: consultation.weight?.toString() ?? "",
    height: consultation.height?.toString() ?? "",
    pulse_rate: consultation.pulse_rate?.toString() ?? "",
    temperature: consultation.temperature?.toString() ?? "",
    bp_systolic: consultation.bp_systolic?.toString() ?? "",
    bp_diastolic: consultation.bp_diastolic?.toString() ?? "",
    appetite: consultation.appetite ?? "",
    appetite_notes: consultation.appetite_notes ?? "",
    bowel: consultation.bowel ?? "",
    bowel_notes: consultation.bowel_notes ?? "",
    micturition: consultation.micturition ?? "",
    micturition_notes: consultation.micturition_notes ?? "",
    sleep_quality: consultation.sleep_quality ?? "",
    sleep_notes: consultation.sleep_notes ?? "",
    mental_state: consultation.mental_state ?? "",
    diagnostic_data: consultation.diagnostic_data ?? {},
    chief_complaints: consultation.chief_complaints ?? "",
    history_of_present_illness: consultation.history_of_present_illness ?? "",
    diagnosis: consultation.diagnosis ?? "",
    icd_code: consultation.icd_code ?? "",
    consultation_date: consultation.consultation_date ?? "",
  };

  return (
    <div className="space-y-6">
      {patient && <PatientBanner patient={patient} />}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Edit Visit
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Update visit details for {patient?.name ?? "this patient"}
        </p>
      </div>
      <ConsultationForm
        patientId={consultation.patient}
        mode="edit"
        consultationId={consultation.id}
        initialData={initialData}
      />
    </div>
  );
}

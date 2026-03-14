"use client";

import { useParams } from "next/navigation";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { ConsultationForm } from "@/components/consultations/ConsultationForm";
import { useApi } from "@/hooks/useApi";
import type { Patient } from "@/lib/types";

export default function NewConsultationPage() {
  const params = useParams<{ id: string }>();
  const { data: patient, isLoading } = useApi<Patient>(
    `/patients/${params.id}/`,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="py-20 text-center text-gray-500">Patient not found.</div>
    );
  }

  return (
    <div className="space-y-6">
      <PatientBanner patient={patient} />
      <h1 className="text-2xl font-bold text-gray-900">Start Consultation</h1>
      <ConsultationForm patientId={patient.id} />
    </div>
  );
}

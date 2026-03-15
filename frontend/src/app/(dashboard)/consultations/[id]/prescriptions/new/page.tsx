"use client";
import { Spinner } from "@/components/ui/Spinner";

import { useParams } from "next/navigation";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { PrescriptionBuilder } from "@/components/prescriptions/PrescriptionBuilder";
import { useApi } from "@/hooks/useApi";
import type { Consultation, Patient } from "@/lib/types";

export default function NewPrescriptionPage() {
  const params = useParams<{ id: string }>();
  const { data: consultation, isLoading } = useApi<Consultation>(
    `/consultations/${params.id}/`,
  );
  const { data: patient } = useApi<Patient>(
    consultation ? `/patients/${consultation.patient}/` : null,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="py-20 text-center text-gray-500">
        Visit not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {patient && <PatientBanner patient={patient} />}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Prescription</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visit on{" "}
          {new Date(consultation.consultation_date).toLocaleDateString("en-IN")}
          {consultation.diagnosis && (
            <> &mdash; Dx: {consultation.diagnosis}</>
          )}
        </p>
      </div>
      <PrescriptionBuilder
        consultationId={consultation.id}
        patientId={patient?.id ?? 0}
      />
    </div>
  );
}

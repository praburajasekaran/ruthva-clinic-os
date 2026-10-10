"use client";
import { Spinner } from "@/components/ui/Spinner";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { PrescriptionBuilder } from "@/components/prescriptions/PrescriptionBuilder";
import { useApi } from "@/hooks/useApi";
import type { Consultation, Patient } from "@/lib/types";

export default function NewPrescriptionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: consultation, isLoading } = useApi<Consultation>(
    `/consultations/${params.id}/`,
  );
  const { data: patient } = useApi<Patient>(
    consultation ? `/patients/${consultation.patient}/` : null,
  );
  const matchesVisit = consultation?.id === Number(params.id);
  const savedPrescriptionId = matchesVisit ? consultation?.prescription?.id : undefined;

  useEffect(() => {
    if (savedPrescriptionId) router.replace(`/prescriptions/${savedPrescriptionId}`);
  }, [savedPrescriptionId, router]);

  if (isLoading || savedPrescriptionId || (consultation && !matchesVisit)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Visit not found.
      </div>
    );
  }

  if (user?.role !== "doctor") {
    return <p className="py-20 text-center text-muted-foreground">Only doctors can write prescriptions.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {patient && <PatientBanner patient={patient} />}
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Prescription</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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

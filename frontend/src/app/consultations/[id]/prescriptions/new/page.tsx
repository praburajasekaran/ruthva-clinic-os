import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { PrescriptionBuilder } from "@/components/prescriptions/PrescriptionBuilder";

type Props = {
  params: { id: string };
};

async function getConsultation(id: string) {
  try {
    const res = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:8000"}/api/v1/consultations/${id}/`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getPatient(id: string) {
  try {
    const res = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:8000"}/api/v1/patients/${id}/`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `New Prescription — Consultation #${params.id}` };
}

export default async function NewPrescriptionPage({ params }: Props) {
  const consultation = await getConsultation(params.id);
  if (!consultation) notFound();

  const patient = await getPatient(String(consultation.patient));
  if (!patient) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PatientBanner patient={patient} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Prescription</h1>
        <p className="mt-1 text-sm text-gray-500">
          Consultation on{" "}
          {new Date(consultation.consultation_date).toLocaleDateString("en-IN")}
          {consultation.diagnosis && (
            <> &mdash; Dx: {consultation.diagnosis}</>
          )}
        </p>
      </div>
      <PrescriptionBuilder
        consultationId={consultation.id}
        patientId={patient.id}
      />
    </div>
  );
}

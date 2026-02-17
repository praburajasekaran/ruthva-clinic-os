import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { ConsultationForm } from "@/components/consultations/ConsultationForm";

type Props = {
  params: { id: string };
};

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
  const patient = await getPatient(params.id);
  return {
    title: patient ? `New Consultation — ${patient.name}` : "New Consultation",
  };
}

export default async function NewConsultationPage({ params }: Props) {
  const patient = await getPatient(params.id);
  if (!patient) notFound();

  return (
    <div className="space-y-6">
      <PatientBanner patient={patient} />
      <h1 className="text-2xl font-bold text-gray-900">New Consultation</h1>
      <ConsultationForm patientId={patient.id} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { PatientShortcutsInit } from "@/components/patients/PatientShortcutsInit";
import { KbdBadge } from "@/components/ui/KbdBadge";
import { Calendar, Pencil, Printer } from "lucide-react";
import { FREQUENCY_OPTIONS } from "@/lib/constants/envagai-options";

type Props = {
  params: { id: string };
};

async function getPrescription(id: string) {
  try {
    const res = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:8000"}/api/v1/prescriptions/${id}/`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

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
  return { title: `Prescription #${params.id}` };
}

export default async function PrescriptionDetailPage({ params }: Props) {
  const prescription = await getPrescription(params.id);
  if (!prescription) notFound();

  const consultation = await getConsultation(String(prescription.consultation));
  const patient = consultation
    ? await getPatient(String(consultation.patient))
    : null;

  const medications = prescription.medications ?? [];
  const procedures = prescription.procedures ?? [];

  return (
    <div className="space-y-6">
      {patient && <PatientShortcutsInit patientId={patient.id} />}
      {patient && <PatientBanner patient={patient} />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescription</h1>
          {consultation && (
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(consultation.consultation_date).toLocaleDateString(
                "en-IN",
                { day: "numeric", month: "long", year: "numeric" },
              )}
              {consultation.diagnosis && (
                <> &mdash; Dx: {consultation.diagnosis}</>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          {patient && (
            <Link
              href={`/patients/${patient.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Patient
              <KbdBadge keys={["H"]} aria-label="Press H to go to patient detail" />
            </Link>
          )}
          <Link
            href={`/prescriptions/${params.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <Link
            href={`/prescriptions/${params.id}/print`}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Printer className="h-4 w-4" />
            Print
          </Link>
        </div>
      </div>

      {/* Medications */}
      {medications.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Medications
          </h2>
          <div className="space-y-3">
            {medications.map(
              (med: {
                id: number;
                drug_name: string;
                dosage: string;
                frequency: string;
                frequency_tamil: string;
                duration: string;
                instructions: string;
                instructions_ta: string;
              }) => {
                const freqOpt = FREQUENCY_OPTIONS.find(
                  (f) => f.value === med.frequency,
                );
                return (
                  <div
                    key={med.id}
                    className="rounded-lg border border-gray-100 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-gray-900">
                        {med.drug_name}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {med.duration}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {med.dosage} &mdash;{" "}
                      {freqOpt ? freqOpt.label : med.frequency}
                    </p>
                    {med.frequency_tamil && (
                      <p className="font-tamil text-xs text-gray-500">
                        {med.frequency_tamil}
                      </p>
                    )}
                    {med.instructions && (
                      <p className="mt-1 text-sm text-gray-500">
                        {med.instructions}
                      </p>
                    )}
                    {med.instructions_ta && (
                      <p className="mt-0.5 font-tamil text-sm text-emerald-700">
                        {med.instructions_ta}
                      </p>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* Procedures */}
      {procedures.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Procedures
          </h2>
          <div className="space-y-2">
            {procedures.map(
              (proc: {
                id: number;
                name: string;
                details: string;
                duration: string;
              }) => (
                <div key={proc.id} className="text-sm">
                  <span className="font-medium text-gray-900">{proc.name}</span>
                  {proc.duration && (
                    <span className="ml-2 text-gray-500">({proc.duration})</span>
                  )}
                  {proc.details && (
                    <p className="text-gray-600">{proc.details}</p>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Advice */}
      {(prescription.diet_advice ||
        prescription.lifestyle_advice ||
        prescription.exercise_advice) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Advice</h2>
          <dl className="space-y-3 text-sm">
            {(prescription.diet_advice || prescription.diet_advice_ta) && (
              <div>
                <dt className="font-medium text-gray-700">Diet</dt>
                {prescription.diet_advice && (
                  <dd className="text-gray-600">{prescription.diet_advice}</dd>
                )}
                {prescription.diet_advice_ta && (
                  <dd className="font-tamil text-emerald-700">{prescription.diet_advice_ta}</dd>
                )}
              </div>
            )}
            {(prescription.lifestyle_advice || prescription.lifestyle_advice_ta) && (
              <div>
                <dt className="font-medium text-gray-700">Lifestyle</dt>
                {prescription.lifestyle_advice && (
                  <dd className="text-gray-600">{prescription.lifestyle_advice}</dd>
                )}
                {prescription.lifestyle_advice_ta && (
                  <dd className="font-tamil text-emerald-700">{prescription.lifestyle_advice_ta}</dd>
                )}
              </div>
            )}
            {(prescription.exercise_advice || prescription.exercise_advice_ta) && (
              <div>
                <dt className="font-medium text-gray-700">Exercise</dt>
                {prescription.exercise_advice && (
                  <dd className="text-gray-600">{prescription.exercise_advice}</dd>
                )}
                {prescription.exercise_advice_ta && (
                  <dd className="font-tamil text-emerald-700">{prescription.exercise_advice_ta}</dd>
                )}
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Follow-up */}
      {prescription.follow_up_date && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Follow-up:{" "}
            {new Date(prescription.follow_up_date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {prescription.follow_up_notes && (
            <p className="mt-1 text-sm text-amber-700">
              {prescription.follow_up_notes}
            </p>
          )}
          {prescription.follow_up_notes_ta && (
            <p className="mt-0.5 font-tamil text-sm text-amber-700">
              {prescription.follow_up_notes_ta}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

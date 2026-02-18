import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { Calendar, FileText, Pencil, Plus } from "lucide-react";
import { ENVAGAI_OPTIONS, type EnvagaiTool } from "@/lib/constants/envagai-options";

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
  return { title: `Consultation #${params.id}` };
}

function parseEnvagaiValue(raw: string): Record<string, string> {
  if (!raw) return {};
  const result: Record<string, string> = {};
  for (const part of raw.split("|")) {
    const [k, ...v] = part.split(":");
    if (k) result[k] = v.join(":");
  }
  return result;
}

export default async function ConsultationDetailPage({ params }: Props) {
  const consultation = await getConsultation(params.id);
  if (!consultation) notFound();

  const patient = await getPatient(String(consultation.patient));

  return (
    <div className="space-y-6">
      {patient && <PatientBanner patient={patient} />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultation</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(consultation.consultation_date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/consultations/${params.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          {consultation.prescription ? (
            <Link
              href={`/prescriptions/${consultation.prescription.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText className="h-4 w-4" />
              View Prescription
            </Link>
          ) : (
            <Link
              href={`/consultations/${params.id}/prescriptions/new`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Write Prescription
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vitals */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Vitals</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Weight", value: consultation.weight, unit: "kg" },
              { label: "Height", value: consultation.height, unit: "cm" },
              { label: "Pulse Rate", value: consultation.pulse_rate, unit: "bpm" },
              { label: "Temperature", value: consultation.temperature, unit: "\u00b0F" },
              { label: "BP", value: consultation.bp_systolic && consultation.bp_diastolic ? `${consultation.bp_systolic}/${consultation.bp_diastolic}` : null, unit: "mmHg" },
            ].map(({ label, value, unit }) => (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">
                  {value ? `${value} ${unit}` : "\u2014"}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* General Assessment */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">General Assessment</h2>
          <dl className="space-y-3 text-sm">
            {[
              { label: "Appetite", value: consultation.appetite, notes: consultation.appetite_notes },
              { label: "Bowel", value: consultation.bowel, notes: consultation.bowel_notes },
              { label: "Micturition", value: consultation.micturition, notes: consultation.micturition_notes },
              { label: "Sleep", value: consultation.sleep_quality, notes: consultation.sleep_notes },
            ].map(({ label, value, notes }) => (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900 capitalize">
                  {value || "\u2014"}
                  {notes && <span className="ml-2 font-normal text-gray-600">({notes})</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Envagai Thervu */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Envagai Thervu
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.entries(ENVAGAI_OPTIONS) as [EnvagaiTool, (typeof ENVAGAI_OPTIONS)[EnvagaiTool]][]).map(
            ([key, tool]) => {
              const raw = consultation[key] as string;
              const values = parseEnvagaiValue(raw);
              const hasData = Object.keys(values).length > 0;
              return (
                <div key={key} className="rounded-lg border border-gray-100 p-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    {tool.label}{" "}
                    <span className="font-tamil text-xs text-gray-400">
                      ({tool.labelTamil})
                    </span>
                  </h4>
                  {hasData ? (
                    <dl className="mt-2 space-y-1 text-xs">
                      {Object.entries(values).map(([field, val]) => (
                        <div key={field}>
                          <dt className="inline capitalize text-gray-500">
                            {field.replace(/_/g, " ")}:
                          </dt>{" "}
                          <dd className="inline text-gray-700">{val}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-2 text-xs text-gray-400">Not assessed</p>
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* Diagnosis */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Diagnosis</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Chief Complaints</dt>
            <dd className="font-medium text-gray-900">
              {consultation.chief_complaints || "\u2014"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">History of Present Illness</dt>
            <dd className="text-gray-900">
              {consultation.history_of_present_illness || "\u2014"}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-gray-500">Diagnosis</dt>
              <dd className="font-medium text-gray-900">
                {consultation.diagnosis || "\u2014"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">ICD Code</dt>
              <dd className="font-mono text-gray-900">
                {consultation.icd_code || "\u2014"}
              </dd>
            </div>
          </div>
        </dl>
      </div>
    </div>
  );
}

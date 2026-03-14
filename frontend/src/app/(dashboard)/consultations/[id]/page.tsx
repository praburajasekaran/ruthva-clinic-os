"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { PatientShortcutsInit } from "@/components/patients/PatientShortcutsInit";
import { DiagnosticDataDisplay } from "@/components/consultations/DiagnosticDataDisplay";
import { KbdBadge } from "@/components/ui/KbdBadge";
import { Calendar, FileText, Pencil, Plus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DIAGNOSTIC_SECTION_LABELS } from "@/lib/constants/bilingual-labels";
import { useApi } from "@/hooks/useApi";
import type { Consultation, Patient } from "@/lib/types";

export default function ConsultationDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const discipline = user?.clinic?.discipline ?? "siddha";
  const { data: consultation, isLoading } = useApi<
    Consultation & { prescription?: { id: number } }
  >(`/consultations/${params.id}/`);
  const { data: patient } = useApi<Patient>(
    consultation ? `/patients/${consultation.patient}/` : null,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="py-20 text-center text-gray-500">
        Consultation not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {patient && (
        <PatientShortcutsInit
          patientId={patient.id}
          consultationId={consultation.id}
          prescriptionId={consultation.prescription?.id}
        />
      )}
      {patient && <PatientBanner patient={patient} />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultation</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(consultation.consultation_date).toLocaleDateString(
              "en-IN",
              {
                day: "numeric",
                month: "long",
                year: "numeric",
              },
            )}
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
          {patient && (
            <Link
              href={`/patients/${patient.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Patient
              <KbdBadge
                keys={["H"]}
                aria-label="Press H to go to patient detail"
              />
            </Link>
          )}
          {consultation.prescription ? (
            <Link
              href={`/prescriptions/${consultation.prescription.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText className="h-4 w-4" />
              View Prescription
              <KbdBadge
                keys={["P"]}
                aria-label="Press P to view prescription"
              />
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
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Vitals
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Weight", value: consultation.weight, unit: "kg" },
              { label: "Height", value: consultation.height, unit: "cm" },
              {
                label: "Pulse Rate",
                value: consultation.pulse_rate,
                unit: "bpm",
              },
              {
                label: "Temperature",
                value: consultation.temperature,
                unit: "\u00b0F",
              },
              {
                label: "BP",
                value:
                  consultation.bp_systolic && consultation.bp_diastolic
                    ? `${consultation.bp_systolic}/${consultation.bp_diastolic}`
                    : null,
                unit: "mmHg",
              },
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
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            General Assessment
          </h2>
          <dl className="space-y-3 text-sm">
            {[
              {
                label: "Appetite",
                value: consultation.appetite,
                notes: consultation.appetite_notes,
              },
              {
                label: "Bowel",
                value: consultation.bowel,
                notes: consultation.bowel_notes,
              },
              {
                label: "Micturition",
                value: consultation.micturition,
                notes: consultation.micturition_notes,
              },
              {
                label: "Sleep",
                value: consultation.sleep_quality,
                notes: consultation.sleep_notes,
              },
            ].map(({ label, value, notes }) => (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium capitalize text-gray-900">
                  {value || "\u2014"}
                  {notes && (
                    <span className="ml-2 font-normal text-gray-600">
                      ({notes})
                    </span>
                  )}
                </dd>
              </div>
            ))}
            {consultation.mental_state && (
              <div>
                <dt className="text-gray-500">Mental State</dt>
                <dd className="font-medium text-gray-900">
                  {consultation.mental_state}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Discipline-specific Diagnostics */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          {(DIAGNOSTIC_SECTION_LABELS[discipline] ?? DIAGNOSTIC_SECTION_LABELS.siddha).en}
        </h2>
        <DiagnosticDataDisplay
          discipline={discipline}
          data={consultation.diagnostic_data}
        />
      </div>

      {/* Diagnosis */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Diagnosis
        </h2>
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

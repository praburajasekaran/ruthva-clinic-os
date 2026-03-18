"use client";
import { Spinner } from "@/components/ui/Spinner";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { PatientShortcutsInit } from "@/components/patients/PatientShortcutsInit";
import { DispenseModal } from "@/components/pharmacy/DispenseModal";
import { KbdBadge } from "@/components/ui/KbdBadge";
import { Calendar, Package, Pencil, Printer } from "lucide-react";
import { FREQUENCY_OPTIONS } from "@/lib/constants/envagai-options";
import { useApi } from "@/hooks/useApi";
import type { Prescription, Consultation, Patient, DispensingRecord } from "@/lib/types";

export default function PrescriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const [showDispense, setShowDispense] = useState(false);
  const { data: prescription, isLoading } = useApi<Prescription>(
    `/prescriptions/${params.id}/`,
  );
  const { data: consultation } = useApi<Consultation>(
    prescription ? `/consultations/${prescription.consultation}/` : null,
  );
  const { data: patient } = useApi<Patient>(
    consultation ? `/patients/${consultation.patient}/` : null,
  );
  const { data: dispensingRecords, refetch: refreshDispensing } = useApi<DispensingRecord[]>(
    prescription ? `/pharmacy/dispensing/?prescription=${prescription.id}` : null,
  );

  const hasLinkedMeds = prescription?.medications?.some((m) => m.medicine_id || m.medicine) ?? false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="py-20 text-center text-gray-500">
        Prescription not found.
      </div>
    );
  }

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
              <KbdBadge
                keys={["H"]}
                aria-label="Press H to go to patient detail"
              />
            </Link>
          )}
          {hasLinkedMeds && (
            <button
              type="button"
              onClick={() => setShowDispense(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              <Package className="h-4 w-4" />
              Dispense
            </button>
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
            {medications.map((med) => {
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
                    <p lang="ta" className="text-xs text-gray-500">
                      {med.frequency_tamil}
                    </p>
                  )}
                  {med.instructions && (
                    <p className="mt-1 text-sm text-gray-500">
                      {med.instructions}
                    </p>
                  )}
                  {med.instructions_ta && (
                    <p lang="ta" className="mt-0.5 text-sm text-emerald-700">
                      {med.instructions_ta}
                    </p>
                  )}
                </div>
              );
            })}
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
            {procedures.map((proc) => (
              <div key={proc.id} className="text-sm">
                <span className="font-medium text-gray-900">{proc.name}</span>
                {proc.duration && (
                  <span className="ml-2 text-gray-500">({proc.duration})</span>
                )}
                {proc.details && (
                  <p className="text-gray-600">{proc.details}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advice */}
      {(prescription.diet_advice ||
        prescription.lifestyle_advice ||
        prescription.exercise_advice) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Advice
          </h2>
          <dl className="space-y-3 text-sm">
            {(prescription.diet_advice || prescription.diet_advice_ta) && (
              <div>
                <dt className="font-medium text-gray-700">Diet</dt>
                {prescription.diet_advice && (
                  <dd className="text-gray-600">{prescription.diet_advice}</dd>
                )}
                {prescription.diet_advice_ta && (
                  <dd lang="ta" className="text-emerald-700">
                    {prescription.diet_advice_ta}
                  </dd>
                )}
              </div>
            )}
            {(prescription.lifestyle_advice ||
              prescription.lifestyle_advice_ta) && (
              <div>
                <dt className="font-medium text-gray-700">Lifestyle</dt>
                {prescription.lifestyle_advice && (
                  <dd className="text-gray-600">
                    {prescription.lifestyle_advice}
                  </dd>
                )}
                {prescription.lifestyle_advice_ta && (
                  <dd lang="ta" className="text-emerald-700">
                    {prescription.lifestyle_advice_ta}
                  </dd>
                )}
              </div>
            )}
            {(prescription.exercise_advice ||
              prescription.exercise_advice_ta) && (
              <div>
                <dt className="font-medium text-gray-700">Exercise</dt>
                {prescription.exercise_advice && (
                  <dd className="text-gray-600">
                    {prescription.exercise_advice}
                  </dd>
                )}
                {prescription.exercise_advice_ta && (
                  <dd lang="ta" className="text-emerald-700">
                    {prescription.exercise_advice_ta}
                  </dd>
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
            <p lang="ta" className="mt-0.5 text-sm text-amber-700">
              {prescription.follow_up_notes_ta}
            </p>
          )}
        </div>
      )}

      {/* Dispensing History */}
      {dispensingRecords && dispensingRecords.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <Package className="h-4 w-4" />
            Dispensing History
          </h2>
          <div className="space-y-3">
            {dispensingRecords.map((record) => (
              <div key={record.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {new Date(record.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-gray-500">by {record.dispensed_by_name}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {record.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.drug_name_snapshot}</span>
                      <span className="text-gray-500">x{item.quantity_dispensed}</span>
                    </div>
                  ))}
                </div>
                {record.notes && (
                  <p className="mt-1 text-xs text-gray-400">{record.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispense Modal */}
      {showDispense && (
        <DispenseModal
          prescriptionId={prescription.id}
          medications={medications}
          onClose={() => setShowDispense(false)}
          onDispensed={() => {
            setShowDispense(false);
            refreshDispensing();
          }}
        />
      )}
    </div>
  );
}

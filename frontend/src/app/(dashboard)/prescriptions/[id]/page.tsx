"use client";
import { Spinner } from "@/components/ui/Spinner";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { PatientShortcutsInit } from "@/components/patients/PatientShortcutsInit";
import { DispenseModal } from "@/components/pharmacy/DispenseModal";
import { VisitCompletion } from "@/components/prescriptions/VisitCompletion";
import { TreatmentPlanCreateForm } from "@/components/treatments/TreatmentPlanCreateForm";
import { KbdBadge } from "@/components/ui/KbdBadge";
import { Calendar, Package, Pencil, Printer } from "lucide-react";
import { FREQUENCY_OPTIONS, TIMING_OPTIONS } from "@/lib/constants/envagai-options";
import { useApi } from "@/hooks/useApi";
import type { Prescription, Consultation, Patient, DispensingRecord, TreatmentPlanListItem } from "@/lib/types";

export default function PrescriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [dispensingIntent, setDispensingIntent] = useState<"unrecorded" | "additional" | null>(null);
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  useEffect(() => {
    setDispensingIntent(null);
    setShowTreatmentForm(false);
  }, [params.id]);
  const { data: prescription, isLoading, error: prescriptionError, refetch: refreshPrescription } = useApi<Prescription>(
    `/prescriptions/${params.id}/`,
  );
  const { data: consultation, error: consultationError, refetch: refreshConsultation } = useApi<Consultation>(
    prescription ? `/consultations/${prescription.consultation}/` : null,
  );
  const { data: patient, error: patientError, refetch: refreshPatient } = useApi<Patient>(
    consultation ? `/patients/${consultation.patient}/` : null,
  );
  const dispensing = useApi<DispensingRecord[]>(
    prescription ? `/pharmacy/dispensing/?prescription=${prescription.id}` : null,
  );
  const planQuery = useApi<TreatmentPlanListItem[]>(
    consultation ? `/treatments/plans/?patient_id=${consultation.patient}` : null,
  );

  const { data: dispensingRecords, refetch: refreshDispensing } = dispensing;
  const { data: plans, isLoading: plansLoading, error: plansError } = planQuery;

  if (prescriptionError || consultationError || patientError) {
    return (
      <div className="space-y-3 py-20 text-center">
        <p role="alert" className="text-sm text-red-600">
          {prescriptionError?.detail || consultationError?.detail || patientError?.detail || "Could not load this visit."}
        </p>
        <Button variant="outline" onClick={() => {
          if (prescriptionError) refreshPrescription();
          else if (consultationError) refreshConsultation();
          else refreshPatient();
        }}>Retry visit</Button>
      </div>
    );
  }

  if (isLoading || !prescription || prescription.id !== Number(params.id) || !consultation || consultation.id !== prescription.consultation || !patient || patient.id !== consultation.patient) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const medications = prescription.medications ?? [];
  const procedures = prescription.procedures ?? [];
  const treatmentPlans = plans?.filter((plan) => plan.prescription === prescription.id) ?? [];
  const canEdit = user?.role === "doctor";
  const hasActivePlan = treatmentPlans.some((plan) => plan.status === "active");
  const recordedMedicineIds = new Set(dispensingRecords?.flatMap((record) => record.items.map((item) => item.medicine)) ?? []);
  const linkedMedications = [...new Map(medications
    .filter((med) => med.medicine_id || med.medicine)
    .map((med) => [med.medicine_id ?? med.medicine, med])).values()];
  const unrecordedMedications = linkedMedications.filter((med) => {
    const medicineId = med.medicine_id ?? med.medicine;
    return medicineId != null && !recordedMedicineIds.has(medicineId);
  });

  return (
    <div className="space-y-6">
      <PatientShortcutsInit patientId={patient.id} consultationId={consultation.id} prescriptionId={prescription.id} />
      <PatientBanner patient={patient} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visit completion</h1>
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
        <div className="flex flex-wrap gap-3">
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
          {canEdit && <Link
            href={`/prescriptions/${params.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4" />
            Edit prescription
          </Link>}
          <Link
            href={`/prescriptions/${params.id}/print`}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Printer className="h-4 w-4" />
            Print
          </Link>
        </div>
      </div>

      <VisitCompletion
        prescription={prescription}
        consultation={consultation}
        patient={patient}
        dispensing={dispensing}
        plans={planQuery}
        canEdit={canEdit}
        unrecordedMedicationCount={unrecordedMedications.length}
        onDispense={() => setDispensingIntent("unrecorded")}
        onAdditionalDispense={() => setDispensingIntent("additional")}
        onCreatePlan={() => {
          setShowTreatmentForm(true);
          document.getElementById("treatment-plans-heading")?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <h2 id="saved-prescription" className="text-lg font-semibold text-gray-900">Saved prescription</h2>

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
              const timingOpt = TIMING_OPTIONS.find((t) => t.value === med.timing);
              const timingTamil = med.timing_tamil || timingOpt?.tamil;
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
                  {med.timing && (
                    <p className="mt-1 text-sm text-gray-600">
                      {timingOpt?.label || med.timing}
                    </p>
                  )}
                  {timingTamil && (
                    <p lang="ta" className="text-xs text-gray-500">
                      {timingTamil}
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


      <section aria-labelledby="treatment-plans-heading" className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="treatment-plans-heading" className="text-base font-semibold text-gray-900">
            Treatment plans
          </h2>
          {canEdit && !hasActivePlan && plans !== null && !plansLoading && !plansError && !showTreatmentForm && (
            <Button size="sm" onClick={() => setShowTreatmentForm(true)}>
              New Treatment Plan
            </Button>
          )}
        </div>
        {showTreatmentForm && (
          <TreatmentPlanCreateForm
            prescriptionId={prescription.id}
            onCancel={() => setShowTreatmentForm(false)}
            onCreated={(plan) => router.push(`/treatments/plans/${plan.id}`)}
          />
        )}
        {plansLoading ? (
          <p className="text-sm text-gray-500">Loading treatment plans...</p>
        ) : plansError ? (
          <p role="alert" className="text-sm text-red-600">
            {plansError.detail || "Could not load treatment plans."}
          </p>
        ) : treatmentPlans.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {treatmentPlans.map((plan) => (
              <li key={plan.id}>
                <Link href={`/treatments/plans/${plan.id}`} className="text-sm text-emerald-700 hover:underline">
                  {plan.total_days}-day treatment plan ({plan.status}), {plan.block_count} blocks
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-gray-500">No treatment plans for this prescription.</p>
        )}
      </section>

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
      {dispensingIntent && (
        <DispenseModal
          prescriptionId={prescription.id}
          medications={dispensingIntent === "additional" ? linkedMedications : unrecordedMedications}
          onClose={() => setDispensingIntent(null)}
          onDispensed={() => {
            setDispensingIntent(null);
            refreshDispensing();
          }}
        />
      )}
    </div>
  );
}

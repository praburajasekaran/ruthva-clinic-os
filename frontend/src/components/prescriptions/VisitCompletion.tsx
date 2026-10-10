"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/hooks/useApi";
import type { ApiError, Consultation, DispensingRecord, Patient, Prescription, TreatmentPlanListItem } from "@/lib/types";

type RecordQuery<T> = {
  data: T[] | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
};

type VisitCompletionProps = {
  prescription: Prescription;
  consultation: Consultation;
  patient: Patient;
  dispensing: RecordQuery<DispensingRecord>;
  plans: RecordQuery<TreatmentPlanListItem>;
  canEdit: boolean;
  unrecordedMedicationCount: number;
  onDispense: () => void;
  onAdditionalDispense: () => void;
  onCreatePlan: () => void;
};

function dateLabel(value: string) {
  return new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

const linkClasses = "inline-flex min-h-11 items-center text-sm font-medium text-emerald-700 hover:underline";
const cardClasses = "rounded-xl border border-gray-200 bg-white p-5";

export function VisitCompletion({
  prescription, consultation, patient, dispensing, plans, canEdit,
  unrecordedMedicationCount, onDispense, onAdditionalDispense, onCreatePlan,
}: VisitCompletionProps) {
  const history = useApi<Consultation[]>(`/patients/${patient.id}/consultations/`);
  const otherVisits = history.data?.filter((visit) => visit.id !== consultation.id).slice(0, 3) ?? [];
  const linkedPlans = plans.data?.filter((plan) => plan.prescription === prescription.id) ?? [];
  const hasLinkedMedicines = prescription.medications.some((med) => med.medicine_id || med.medicine);
  const hasActivePlan = linkedPlans.some((plan) => plan.status === "active");

  return (
    <section aria-labelledby="visit-completion-heading" className="space-y-4">
      <div>
        <h2 id="visit-completion-heading" className="text-lg font-semibold text-gray-900">Visit status and next actions</h2>
        <p className="mt-1 text-sm text-gray-600">Review the saved records before the patient leaves.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-label="Prescription status" className={cardClasses}>
          <h3 className="font-semibold text-gray-900">Prescription saved</h3>
          <p className="mt-2 text-sm text-gray-600">
            {prescription.medications.length} {prescription.medications.length === 1 ? "medication" : "medications"}, {prescription.procedures.length} {prescription.procedures.length === 1 ? "procedure" : "procedures"}.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4">
            <a href="#saved-prescription" className={linkClasses}>Review saved prescription</a>
            <Link href={`/consultations/${consultation.id}`} className={linkClasses}>Review consultation</Link>
          </div>
        </section>

        <section aria-label="Dispensing status" className={cardClasses}>
          <h3 className="font-semibold text-gray-900">Dispensing</h3>
          {dispensing.error ? (
            <div className="mt-2">
              <p role="alert" className="text-sm text-red-600">Could not load dispensing records.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => dispensing.refetch()}>Retry dispensing records</Button>
            </div>
          ) : dispensing.isLoading || !dispensing.data ? (
            <p role="status" className="mt-2 text-sm text-gray-500">Loading dispensing records...</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-gray-600">
                {dispensing.data.length > 0
                  ? `${dispensing.data.length} dispensing ${dispensing.data.length === 1 ? "record" : "records"} saved.`
                  : "No dispensing recorded."}
              </p>
              {dispensing.data.length > 0 && (
                <p className="mt-1 text-sm text-gray-600">
                  Last recorded {dateLabel(dispensing.data[0].created_at)} by {dispensing.data[0].dispensed_by_name}.
                </p>
              )}
              {!hasLinkedMedicines ? (
                <p className="mt-2 text-sm text-gray-500">
                  {prescription.medications.length === 0 ? "No medicines prescribed." : "Prescribed medicines are not linked to clinic stock."}
                  {canEdit && prescription.medications.length > 0 && <Link href={`/prescriptions/${prescription.id}/edit`} className={`ml-2 ${linkClasses}`}>Link clinic medicines</Link>}
                </p>
              ) : unrecordedMedicationCount > 0 ? (
                <div className="mt-3">
                  <p className="mb-2 text-sm text-gray-600">{unrecordedMedicationCount} clinic {unrecordedMedicationCount === 1 ? "medicine has" : "medicines have"} no recorded dispensing.</p>
                  <Button size="sm" onClick={onDispense}>Record dispensing</Button>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Dispensing has been recorded for each linked clinic medicine. Review quantities in the history below.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={onAdditionalDispense}>Record additional dispensing</Button>
                </div>
              )}
            </>
          )}
          <p className="mt-3 text-xs text-gray-500">Stock changes only when dispensing is recorded.</p>
        </section>

        <section aria-label="Follow-up status" className={cardClasses}>
          <h3 className="font-semibold text-gray-900">Next follow-up</h3>
          <p className="mt-2 text-sm text-gray-600">
            {prescription.follow_up_date ? `Recorded for ${dateLabel(prescription.follow_up_date)}.` : "No follow-up date recorded."}
          </p>
          {prescription.follow_up_notes && <p className="mt-1 text-sm text-gray-600">{prescription.follow_up_notes}</p>}
          {canEdit ? (
            <Link href={`/prescriptions/${prescription.id}/edit#follow-up`} className={linkClasses}>
              {prescription.follow_up_date ? "Edit follow-up" : "Set follow-up date"}
            </Link>
          ) : !prescription.follow_up_date && <p className="mt-3 text-sm text-gray-500">Ask the doctor to record the next follow-up.</p>}
        </section>

        <section aria-label="Treatment status" className={cardClasses}>
          <h3 className="font-semibold text-gray-900">Treatment plan</h3>
          {plans.error ? (
            <div className="mt-2">
              <p role="alert" className="text-sm text-red-600">Could not load treatment plans.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => plans.refetch()}>Retry treatment plans</Button>
            </div>
          ) : plans.isLoading || !plans.data ? (
            <p role="status" className="mt-2 text-sm text-gray-500">Loading treatment plans...</p>
          ) : (
            <>
              {linkedPlans.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {linkedPlans.map((plan) => (
                    <li key={plan.id}>
                      <p className="text-sm text-gray-600">{plan.total_days}-day plan, {plan.status}, {plan.block_count} {plan.block_count === 1 ? "block" : "blocks"}.</p>
                      <Link href={`/treatments/plans/${plan.id}`} className={linkClasses}>Open treatment plan #{plan.id}</Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-gray-600">No treatment plan linked to this prescription.</p>}
              {!hasActivePlan && (canEdit ? (
                <Button size="sm" className="mt-3" onClick={onCreatePlan}>Create treatment plan</Button>
              ) : linkedPlans.length === 0 && <p className="mt-3 text-sm text-gray-500">Ask the doctor to create a plan if treatment is needed.</p>)}
            </>
          )}
        </section>
      </div>

      <section aria-label="Patient history" className={cardClasses}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-900">Patient history</h3>
          <Link href={`/patients/${patient.id}`} className={linkClasses}>Open full patient history</Link>
        </div>
        {patient.medical_history.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            Medical history. {patient.medical_history.map((entry) => [entry.disease, entry.duration, entry.medication].filter(Boolean).join(", ")).join("; ")}
          </p>
        )}
        {history.error ? (
          <div className="mt-2">
            <p role="alert" className="text-sm text-red-600">Could not load visit history.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => history.refetch()}>Retry visit history</Button>
          </div>
        ) : history.isLoading || !history.data ? (
          <p role="status" className="mt-2 text-sm text-gray-500">Loading visit history...</p>
        ) : otherVisits.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {otherVisits.map((visit) => (
              <li key={visit.id} className="text-sm text-gray-600">
                <Link href={`/consultations/${visit.id}`} className={linkClasses}>{dateLabel(visit.consultation_date)}</Link>
                <span className="ml-2">{visit.diagnosis || visit.chief_complaints || "No diagnosis recorded"}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-gray-500">This is the patient&apos;s first recorded visit.</p>}
      </section>
    </section>
  );
}

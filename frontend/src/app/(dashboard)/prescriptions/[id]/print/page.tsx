"use client";

import { useParams } from "next/navigation";
import { FREQUENCY_OPTIONS } from "@/lib/constants/envagai-options";
import {
  PRINT_LABELS,
  ADVICE_LABELS,
  MEDICATION_LABELS,
} from "@/lib/constants/bilingual-labels";
import { PrintTrigger } from "./PrintTrigger";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Prescription, Consultation, Patient } from "@/lib/types";

const tamil = { style: { fontFamily: "var(--font-tamil)" } };

function TamilHeader({ ta, en }: { ta: string; en: string }) {
  return (
    <span>
      <span {...tamil} className="font-semibold">
        {ta}
      </span>{" "}
      <span className="text-[8pt] font-normal text-gray-400">{en}</span>
    </span>
  );
}

function BilingualTh({ ta, en }: { ta: string; en: string }) {
  return (
    <>
      <span {...tamil}>{ta}</span>
      <br />
      <span className="text-[7pt] font-normal text-gray-400">{en}</span>
    </>
  );
}

export default function PrintPrescriptionPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: prescription, isLoading } = useApi<Prescription>(
    `/prescriptions/${params.id}/`,
  );
  const { data: consultation } = useApi<Consultation>(
    prescription ? `/consultations/${prescription.consultation}/` : null,
  );
  const { data: patient } = useApi<Patient>(
    consultation ? `/patients/${consultation.patient}/` : null,
  );

  if (isLoading || !prescription) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  const clinicName = user?.clinic?.name ?? "AYUSH Clinic";
  const medications = prescription.medications ?? [];
  const procedures = prescription.procedures ?? [];

  return (
    <div className="print-prescription mx-auto bg-white p-[10mm]">
      <style>{`
        .print-prescription {
          max-width: 210mm;
          font-size: 11pt;
          line-height: 1.4;
          color: black;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 52mm 12mm 20mm 12mm;
          }
          body {
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-prescription {
            max-width: 100% !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
        .print-prescription table {
          border-collapse: collapse;
          width: 100%;
        }
        .print-prescription th,
        .print-prescription td {
          border: 1px solid #ccc;
          padding: 4px 8px;
          text-align: left;
          font-size: 10pt;
        }
        .print-prescription th {
          background: #f5f5f5;
          font-weight: 600;
          font-size: 9pt;
        }
        .medication-item {
          break-inside: avoid;
        }
      `}</style>

      {/* Screen-only header */}
      <div className="no-print mb-4 border-b-2 border-gray-300 pb-3 text-center">
        <h1 className="text-lg font-bold">{clinicName}</h1>
        <p className="text-xs">
          {user?.first_name} {user?.last_name}
        </p>
        <p className="text-[8pt] italic text-gray-400">
          This header is hidden when printing — pre-printed letterhead is used
        </p>
      </div>

      {/* Patient Info */}
      {patient && (
        <div className="mb-3 text-[10pt]">
          <div className="flex items-baseline justify-between">
            <div>
              {patient.name} &bull; {patient.age}y &bull;{" "}
              {patient.gender.charAt(0).toUpperCase()}
              <span className="ml-3 text-[9pt] text-gray-500">
                ({patient.record_id})
              </span>
            </div>
            <div>
              {consultation
                ? new Date(consultation.consultation_date).toLocaleDateString(
                    "en-IN",
                  )
                : new Date().toLocaleDateString("en-IN")}
            </div>
          </div>
          {consultation?.diagnosis && (
            <div className="mt-1">
              <TamilHeader
                ta={PRINT_LABELS.diagnosis.ta + ":"}
                en={PRINT_LABELS.diagnosis.en}
              />{" "}
              {consultation.diagnosis}
            </div>
          )}
        </div>
      )}

      {/* Rx Symbol */}
      <div className="mb-3 text-xl font-bold">&#8478;</div>

      {/* Medications Table */}
      {medications.length > 0 && (
        <table className="mb-4">
          <thead>
            <tr>
              <th className="w-8">#</th>
              <th>
                <BilingualTh
                  ta={MEDICATION_LABELS.drugName.ta}
                  en="Medicine"
                />
              </th>
              <th>
                <BilingualTh ta={MEDICATION_LABELS.dosage.ta} en="Dosage" />
              </th>
              <th>
                <BilingualTh
                  ta={MEDICATION_LABELS.frequency.ta}
                  en="Frequency"
                />
              </th>
              <th>
                <BilingualTh
                  ta={MEDICATION_LABELS.duration.ta}
                  en="Duration"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {medications.map((med, idx) => {
              const freqOpt = FREQUENCY_OPTIONS.find(
                (f) => f.value === med.frequency,
              );
              const instrText = med.instructions_ta || med.instructions;
              return (
                <tr key={med.id} className="medication-item">
                  <td>{idx + 1}</td>
                  <td>
                    {med.drug_name}
                    {instrText && (
                      <div
                        className="text-[8pt] text-gray-500"
                        {...(med.instructions_ta ? tamil : {})}
                      >
                        ({instrText})
                      </div>
                    )}
                  </td>
                  <td>{med.dosage}</td>
                  <td>
                    {med.frequency_tamil ? (
                      <>
                        <span {...tamil}>{med.frequency_tamil}</span>
                        <div className="text-[7pt] text-gray-400">
                          {freqOpt
                            ? freqOpt.label.split(" \u2014 ")[0]
                            : med.frequency}
                        </div>
                      </>
                    ) : freqOpt ? (
                      freqOpt.label.split(" \u2014 ")[0]
                    ) : (
                      med.frequency
                    )}
                  </td>
                  <td>{med.duration}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Procedures */}
      {procedures.length > 0 && (
        <div className="mb-4">
          <p className="font-semibold">
            <TamilHeader
              ta={PRINT_LABELS.procedures.ta + ":"}
              en={PRINT_LABELS.procedures.en}
            />
          </p>
          <ul className="list-inside list-disc text-[10pt]">
            {procedures.map((proc) => (
              <li key={proc.id}>
                {proc.name}
                {proc.duration && ` (${proc.duration})`}
                {proc.details && ` — ${proc.details}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advice */}
      {(prescription.diet_advice ||
        prescription.diet_advice_ta ||
        prescription.lifestyle_advice ||
        prescription.lifestyle_advice_ta ||
        prescription.exercise_advice ||
        prescription.exercise_advice_ta) && (
        <div className="mb-4 text-[10pt]">
          <p className="font-semibold">
            <TamilHeader
              ta={PRINT_LABELS.advice.ta + ":"}
              en={PRINT_LABELS.advice.en}
            />
          </p>
          {(prescription.diet_advice_ta || prescription.diet_advice) && (
            <p {...(prescription.diet_advice_ta ? tamil : {})}>
              <strong {...tamil}>{ADVICE_LABELS.diet.ta}:</strong>{" "}
              {prescription.diet_advice_ta || prescription.diet_advice}
            </p>
          )}
          {(prescription.lifestyle_advice_ta ||
            prescription.lifestyle_advice) && (
            <p {...(prescription.lifestyle_advice_ta ? tamil : {})}>
              <strong {...tamil}>{ADVICE_LABELS.lifestyle.ta}:</strong>{" "}
              {prescription.lifestyle_advice_ta ||
                prescription.lifestyle_advice}
            </p>
          )}
          {(prescription.exercise_advice_ta ||
            prescription.exercise_advice) && (
            <p {...(prescription.exercise_advice_ta ? tamil : {})}>
              <strong {...tamil}>{ADVICE_LABELS.exercise.ta}:</strong>{" "}
              {prescription.exercise_advice_ta || prescription.exercise_advice}
            </p>
          )}
        </div>
      )}

      {/* Follow-up */}
      {prescription.follow_up_date && (
        <div className="mb-4 text-[10pt]">
          <strong>
            <TamilHeader
              ta={PRINT_LABELS.followUp.ta + ":"}
              en={PRINT_LABELS.followUp.en}
            />
          </strong>{" "}
          {new Date(prescription.follow_up_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {(prescription.follow_up_notes_ta ||
            prescription.follow_up_notes) && (
            <span {...(prescription.follow_up_notes_ta ? tamil : {})}>
              {" — "}
              {prescription.follow_up_notes_ta || prescription.follow_up_notes}
            </span>
          )}
        </div>
      )}

      <PrintTrigger />
    </div>
  );
}

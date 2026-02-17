import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  FREQUENCY_OPTIONS,
} from "@/lib/constants/envagai-options";
import {
  PRINT_LABELS,
  ADVICE_LABELS,
  MEDICATION_LABELS,
} from "@/lib/constants/bilingual-labels";
import { PrintTrigger } from "./PrintTrigger";

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

export const metadata: Metadata = {
  title: "Print Prescription",
};

const tamil = { style: { fontFamily: "var(--font-tamil)" } };

/** Tamil-primary label with small English underneath */
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

/** Small English-only label (used in table headers) */
function BilingualTh({ ta, en }: { ta: string; en: string }) {
  return (
    <>
      <span {...tamil}>{ta}</span>
      <br />
      <span className="text-[7pt] font-normal text-gray-400">{en}</span>
    </>
  );
}

export default async function PrintPrescriptionPage({ params }: Props) {
  const prescription = await getPrescription(params.id);
  if (!prescription) notFound();

  const consultation = await getConsultation(
    String(prescription.consultation),
  );
  const patient = consultation
    ? await getPatient(String(consultation.patient))
    : null;

  const medications = prescription.medications ?? [];
  const procedures = prescription.procedures ?? [];

  return (
    <div className="print-prescription mx-auto bg-white p-[10mm]">
      <style>{`
        /* A4 layout to match pre-printed letterhead */
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

      {/* Clinic header is NOT rendered — doctor prints on pre-printed letterhead */}
      {/* Screen-only header for reference */}
      <div className="no-print mb-4 border-b-2 border-gray-300 pb-3 text-center">
        <h1 className="text-lg font-bold">SIVANETHRA SIDDHA CLINIC</h1>
        <p className="text-xs">Dr. M. Subashini, BSMS, MD (Siddha)</p>
        <p className="text-[8pt] italic text-gray-400">
          This header is hidden when printing — pre-printed letterhead is used
        </p>
      </div>

      {/* Patient Info — matches letterhead "Name • Age • Sex" and "Date" layout */}
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

      {/* Medications Table — Tamil-primary headers */}
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
            {medications.map(
              (
                med: {
                  id: number;
                  drug_name: string;
                  dosage: string;
                  frequency: string;
                  frequency_tamil: string;
                  duration: string;
                  instructions: string;
                  instructions_ta: string;
                },
                idx: number,
              ) => {
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
                      ) : (
                        freqOpt
                          ? freqOpt.label.split(" \u2014 ")[0]
                          : med.frequency
                      )}
                    </td>
                    <td>{med.duration}</td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      )}

      {/* Procedures — Tamil-primary header */}
      {procedures.length > 0 && (
        <div className="mb-4">
          <p className="font-semibold">
            <TamilHeader
              ta={PRINT_LABELS.procedures.ta + ":"}
              en={PRINT_LABELS.procedures.en}
            />
          </p>
          <ul className="list-inside list-disc text-[10pt]">
            {procedures.map(
              (proc: {
                id: number;
                name: string;
                details: string;
                duration: string;
              }) => (
                <li key={proc.id}>
                  {proc.name}
                  {proc.duration && ` (${proc.duration})`}
                  {proc.details && ` — ${proc.details}`}
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      {/* Advice — Tamil-primary labels, prefer Tamil content */}
      {(prescription.diet_advice || prescription.diet_advice_ta ||
        prescription.lifestyle_advice || prescription.lifestyle_advice_ta ||
        prescription.exercise_advice || prescription.exercise_advice_ta) && (
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
          {(prescription.lifestyle_advice_ta || prescription.lifestyle_advice) && (
            <p {...(prescription.lifestyle_advice_ta ? tamil : {})}>
              <strong {...tamil}>{ADVICE_LABELS.lifestyle.ta}:</strong>{" "}
              {prescription.lifestyle_advice_ta || prescription.lifestyle_advice}
            </p>
          )}
          {(prescription.exercise_advice_ta || prescription.exercise_advice) && (
            <p {...(prescription.exercise_advice_ta ? tamil : {})}>
              <strong {...tamil}>{ADVICE_LABELS.exercise.ta}:</strong>{" "}
              {prescription.exercise_advice_ta || prescription.exercise_advice}
            </p>
          )}
        </div>
      )}

      {/* Follow-up — Tamil-primary */}
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
          {(prescription.follow_up_notes_ta || prescription.follow_up_notes) && (
            <span {...(prescription.follow_up_notes_ta ? tamil : {})}>
              {" — "}
              {prescription.follow_up_notes_ta || prescription.follow_up_notes}
            </span>
          )}
        </div>
      )}

      {/* Signature area — not rendered, pre-printed on letterhead */}

      {/* Print trigger */}
      <PrintTrigger />
    </div>
  );
}

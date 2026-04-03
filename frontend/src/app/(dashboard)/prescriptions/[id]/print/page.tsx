"use client";
import { Spinner } from "@/components/ui/Spinner";

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
import { QRCodeSVG } from "qrcode.react";
import type { Prescription, Consultation, Patient } from "@/lib/types";

function TamilHeader({ ta, en }: { ta: string; en: string }) {
  return (
    <span>
      <span className="font-semibold">{en}</span>{" "}
      <span lang="ta" className="text-[9pt] font-normal text-gray-400">
        {ta}
      </span>
    </span>
  );
}

function BilingualTh({ ta, en }: { ta: string; en: string }) {
  return (
    <>
      <span>{en}</span>
      <br />
      <span lang="ta" className="text-[8pt] font-normal text-gray-400">
        {ta}
      </span>
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
        <Spinner />
      </div>
    );
  }

  const clinicName = user?.clinic?.name ?? "AYUSH Clinic";
  const medications = prescription.medications ?? [];
  const procedures = prescription.procedures ?? [];
  const primaryColor = user?.clinic?.primary_color || "#059669";
  const topMargin = user?.clinic?.top_margin_mm ?? 15;
  const bottomMargin = user?.clinic?.bottom_margin_mm ?? 15;
  const googleReviewUrl = user?.clinic?.google_review_url || "";

  return (
    <div className="print-prescription mx-auto bg-white p-[10mm]">
      <style>{`
        .print-prescription {
          max-width: 210mm;
          font-size: 12pt;
          line-height: 1.4;
          color: black;
        }
        @media print {
          @page {
            size: ${user?.clinic?.paper_size || "A4"} portrait;
            margin: ${topMargin}mm 12mm ${bottomMargin}mm 12mm;
          }
          body {
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-prescription {
            max-width: 100% !important;
            padding: 0 !important;
            min-height: 0 !important;
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
          padding: 6px 10px;
          text-align: left;
          font-size: 11pt;
          vertical-align: top;
        }
        .print-prescription th {
          background: ${primaryColor}15;
          color: ${primaryColor};
          font-weight: 600;
          font-size: 10pt;
          border-bottom: 2px solid ${primaryColor};
        }
        .print-prescription td {
          border-bottom: 1px solid #e5e7eb;
        }
        .print-prescription tr:nth-child(even) {
          background: #f9fafb;
        }
        .medication-item {
          break-inside: avoid;
        }
      `}</style>

      {/* Letterhead header — digital mode prints it, preprinted mode hides on print */}
      <div
        className={`mb-3 border-b-2 pb-3 text-center ${user?.clinic?.letterhead_mode === "digital" ? "border-gray-300" : "no-print border-gray-300"}`}
        style={
          user?.clinic?.letterhead_mode === "digital"
            ? { borderColor: primaryColor }
            : undefined
        }
      >
        {user?.clinic?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.clinic.logo_url}
            alt=""
            className="mx-auto mb-1"
            style={{ maxHeight: "60px", maxWidth: "200px" }}
          />
        )}
        <h1
          className="text-lg font-bold"
          style={
            user?.clinic?.letterhead_mode === "digital"
              ? { color: primaryColor }
              : undefined
          }
        >
          {clinicName}
        </h1>
        {user?.clinic?.tagline && (
          <p className="text-[9pt] text-gray-500">{user.clinic.tagline}</p>
        )}
        {user?.clinic?.address && (
          <p className="text-[8pt] text-gray-500">{user.clinic.address}</p>
        )}
        {user?.clinic?.phone && (
          <p className="text-[8pt] text-gray-500">
            {user.clinic.phone}
            {user?.clinic?.email ? ` | ${user.clinic.email}` : ""}
          </p>
        )}
        {user?.clinic?.letterhead_mode !== "digital" && (
          <p className="text-[8pt] italic text-gray-400">
            This header is hidden when printing — pre-printed letterhead is used
          </p>
        )}
      </div>

      {/* Patient Info */}
      {patient && (
        <div className="mb-2 rounded bg-gray-50 px-3 py-2 text-[10pt]">
          <div className="flex items-baseline justify-between">
            <div>
              <strong>{patient.name}</strong> &bull; {patient.age}y &bull;{" "}
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
        </div>
      )}

      {/* Vitals */}
      {consultation &&
        (consultation.weight ||
          consultation.pulse_rate ||
          consultation.bp_systolic ||
          consultation.temperature) && (
          <div className="mb-2 flex flex-wrap gap-4 rounded bg-green-50 px-3 py-1.5 text-[10pt]">
            {consultation.weight && (
              <span>
                <span className="font-semibold text-gray-500">Weight:</span>{" "}
                {consultation.weight} kg
              </span>
            )}
            {consultation.pulse_rate && (
              <span>
                <span className="font-semibold text-gray-500">Pulse:</span>{" "}
                {consultation.pulse_rate}/min
              </span>
            )}
            {consultation.bp_systolic && (
              <span>
                <span className="font-semibold text-gray-500">BP:</span>{" "}
                {consultation.bp_systolic}/{consultation.bp_diastolic} mmHg
              </span>
            )}
            {consultation.temperature && (
              <span>
                <span className="font-semibold text-gray-500">Temp:</span>{" "}
                {consultation.temperature}&deg;F
              </span>
            )}
          </div>
        )}

      {/* Chief Complaints & Diagnosis */}
      {consultation &&
        (consultation.chief_complaints || consultation.diagnosis) && (
          <div className="mb-2 text-[10pt]">
            {consultation.chief_complaints && (
              <div>
                <span className="font-semibold text-gray-500">
                  Complaints:
                </span>{" "}
                {consultation.chief_complaints}
              </div>
            )}
            {consultation.diagnosis && (
              <div>
                <span className="font-semibold text-gray-500">Diagnosis:</span>{" "}
                {consultation.diagnosis}
              </div>
            )}
          </div>
        )}

      {/* Rx Symbol */}
      <div
        className="mb-2 text-[18pt] font-bold italic"
        style={{ color: primaryColor }}
      >
        &#8478;
      </div>

      {/* Medications Table */}
      {medications.length > 0 && (
        <table className="mb-3">
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
              // English label: "Once daily" (strip "OD — " prefix)
              const freqEnglish = freqOpt
                ? freqOpt.label.split(" \u2014 ")[1] || freqOpt.label
                : med.frequency;
              // Tamil label from option or from med field
              const freqTamil =
                med.frequency_tamil || (freqOpt ? freqOpt.tamil : "");
              return (
                <tr key={med.id} className="medication-item">
                  <td>{idx + 1}</td>
                  <td>
                    <div className="text-[13pt] font-bold">{med.drug_name}</div>
                    {instrText && (
                      <div
                        className="text-[9pt] text-gray-500"
                        {...(med.instructions_ta ? { lang: "ta" } : {})}
                      >
                        ({instrText})
                      </div>
                    )}
                  </td>
                  <td>{med.dosage}</td>
                  <td>
                    <div>{freqEnglish}</div>
                    {freqTamil && (
                      <div className="text-[9pt] text-gray-400" lang="ta">
                        {freqTamil}
                      </div>
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
        <div className="mb-3">
          <p
            className="mb-1 border-b pb-1 font-semibold"
            style={{
              color: primaryColor,
              borderColor: primaryColor,
            }}
          >
            <TamilHeader
              ta={PRINT_LABELS.procedures.ta}
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
        <div className="mb-3 text-[10pt]">
          <p
            className="mb-1 border-b pb-1 font-semibold"
            style={{
              color: primaryColor,
              borderColor: primaryColor,
            }}
          >
            <TamilHeader
              ta={PRINT_LABELS.advice.ta}
              en={PRINT_LABELS.advice.en}
            />
          </p>
          {(prescription.diet_advice_ta || prescription.diet_advice) && (
            <p>
              <strong>{ADVICE_LABELS.diet.en}:</strong>{" "}
              {prescription.diet_advice || prescription.diet_advice_ta}
              {prescription.diet_advice_ta && prescription.diet_advice && (
                <span className="text-[9pt] text-gray-400" lang="ta">
                  {" "}
                  ({ADVICE_LABELS.diet.ta})
                </span>
              )}
            </p>
          )}
          {(prescription.lifestyle_advice_ta ||
            prescription.lifestyle_advice) && (
            <p>
              <strong>{ADVICE_LABELS.lifestyle.en}:</strong>{" "}
              {prescription.lifestyle_advice ||
                prescription.lifestyle_advice_ta}
              {prescription.lifestyle_advice_ta &&
                prescription.lifestyle_advice && (
                  <span className="text-[9pt] text-gray-400" lang="ta">
                    {" "}
                    ({ADVICE_LABELS.lifestyle.ta})
                  </span>
                )}
            </p>
          )}
          {(prescription.exercise_advice_ta ||
            prescription.exercise_advice) && (
            <p>
              <strong>{ADVICE_LABELS.exercise.en}:</strong>{" "}
              {prescription.exercise_advice || prescription.exercise_advice_ta}
              {prescription.exercise_advice_ta &&
                prescription.exercise_advice && (
                  <span className="text-[9pt] text-gray-400" lang="ta">
                    {" "}
                    ({ADVICE_LABELS.exercise.ta})
                  </span>
                )}
            </p>
          )}
        </div>
      )}

      {/* Follow-up */}
      {prescription.follow_up_date && (
        <div className="mb-3 text-[10pt]">
          <strong>
            <TamilHeader
              ta={PRINT_LABELS.followUp.ta}
              en={PRINT_LABELS.followUp.en}
            />
            :{" "}
          </strong>
          {new Date(prescription.follow_up_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {(prescription.follow_up_notes_ta ||
            prescription.follow_up_notes) && (
            <span>
              {" — "}
              {prescription.follow_up_notes || prescription.follow_up_notes_ta}
            </span>
          )}
        </div>
      )}

      {/* Footer: branding + QR side by side */}
      <div className="mt-4 flex items-end justify-between border-t border-gray-200 pt-2">
        <div className="text-[8pt] text-gray-400">
          Powered by Ruthva.com — AYUSH Clinic OS
        </div>
        {googleReviewUrl && (
          <div className="flex items-center gap-2">
            <span className="text-[8pt] text-gray-400">
              Leave us a review
            </span>
            <QRCodeSVG value={googleReviewUrl} size={80} level="M" />
          </div>
        )}
      </div>

      <PrintTrigger
        patientName={patient?.name}
        consultationDate={consultation?.consultation_date}
      />
    </div>
  );
}

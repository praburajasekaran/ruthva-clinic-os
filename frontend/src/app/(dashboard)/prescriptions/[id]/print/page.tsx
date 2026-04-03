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

function BilingualTh({ ta, en }: { ta: string; en: string }) {
  return (
    <>
      <span>{en}</span>
      <br />
      <span lang="ta" className="text-[8pt] font-normal opacity-60">
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
  const isDigital = user?.clinic?.letterhead_mode !== "preprinted";

  const hasVitals =
    consultation &&
    (consultation.weight ||
      consultation.pulse_rate ||
      consultation.bp_systolic ||
      consultation.temperature);

  return (
    <div
      className="print-prescription mx-auto bg-white p-[10mm]"
      style={{ "--rx-primary": primaryColor } as React.CSSProperties}
    >
      <style>{`
        .print-prescription {
          max-width: 210mm;
          font-size: 11pt;
          line-height: 1.45;
          color: #1a1a1a;
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
        .print-prescription table.rx-table {
          border-collapse: collapse;
          width: 100%;
        }
        .print-prescription table.rx-table th {
          background: #f3f4f6;
          color: #111;
          padding: 7px 10px;
          text-align: left;
          font-size: 9pt;
          font-weight: 700;
          border-bottom: 2px solid #333;
        }
        .print-prescription table.rx-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #d1d5db;
          font-size: 10pt;
          vertical-align: top;
        }
        .print-prescription table.rx-table tbody tr:nth-child(even) {
          background: #f9fafb;
        }
        .medication-item {
          break-inside: avoid;
        }
      `}</style>

      {/* ── LETTERHEAD — always visible on screen; hidden on print if preprinted ── */}
      <div className={`mb-6 text-center ${isDigital ? "" : "no-print"}`}>
        {user?.clinic?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.clinic.logo_url}
            alt=""
            className="mx-auto mb-1"
            style={{ maxHeight: "60px", maxWidth: "200px" }}
          />
        )}
        <h1 className="text-[16pt] font-bold text-gray-900">
          {clinicName}
        </h1>
        {user && (user.first_name || user.last_name) && (
          <p className="text-[10pt] font-semibold text-gray-700">
            Dr. {user.first_name} {user.last_name}
          </p>
        )}
        {user?.clinic?.registration_number && (
          <p className="text-[8pt] text-gray-500">
            Reg. No: {user.clinic.registration_number}
          </p>
        )}
        {user?.clinic?.tagline && (
          <p className="text-[9pt] text-gray-500">{user.clinic.tagline}</p>
        )}
        {user?.clinic?.address && (
          <p className="text-[8pt] text-gray-500">{user.clinic.address}</p>
        )}
        {(user?.clinic?.phone || user?.clinic?.email) && (
          <p className="text-[8pt] text-gray-500">
            {user?.clinic?.phone}
            {user?.clinic?.phone && user?.clinic?.email ? " | " : ""}
            {user?.clinic?.email}
          </p>
        )}
        {!isDigital && (
          <p className="mt-1 text-[7pt] italic text-gray-400">
            (Hidden on print — pre-printed letterhead)
          </p>
        )}
      </div>

      {/* ── PATIENT INFO ── */}
      {patient && (
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[14pt] font-bold">{patient.name}</span>
              <span className="ml-3 text-[10pt] text-gray-500">
                {patient.age}y &bull; {patient.gender.charAt(0).toUpperCase()}
              </span>
              <span className="ml-2 text-[9pt] text-gray-400">
                {patient.record_id}
              </span>
            </div>
            <div className="text-[11pt] font-semibold">
              {consultation
                ? new Date(consultation.consultation_date).toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "short", year: "numeric" },
                  )
                : new Date().toLocaleDateString("en-IN")}
            </div>
          </div>
        </div>
      )}

      {/* ── VITALS ── */}
      {hasVitals && (
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-[9pt] text-gray-600">
          {consultation.weight && (
            <span>
              <span className="font-bold">Weight:</span>{" "}
              {String(consultation.weight)} kg
            </span>
          )}
          {consultation.pulse_rate && (
            <span>
              <span className="font-bold">Pulse:</span>{" "}
              {consultation.pulse_rate}/min
            </span>
          )}
          {consultation.bp_systolic && (
            <span>
              <span className="font-bold">BP:</span>{" "}
              {consultation.bp_systolic}/{consultation.bp_diastolic} mmHg
            </span>
          )}
          {consultation.temperature && (
            <span>
              <span className="font-bold">Temp:</span>{" "}
              {String(consultation.temperature)}&deg;F
            </span>
          )}
        </div>
      )}

      {/* ── COMPLAINTS & DIAGNOSIS ── */}
      {consultation &&
        (consultation.chief_complaints || consultation.diagnosis) && (
          <div className="mb-5 text-[10pt]">
            {consultation.chief_complaints && (
              <div>
                <span className="font-bold text-gray-600">Complaints:</span>{" "}
                {consultation.chief_complaints}
              </div>
            )}
            {consultation.diagnosis && (
              <div className="mt-0.5">
                <span className="font-bold text-gray-600">Diagnosis:</span>{" "}
                <span className="font-semibold">{consultation.diagnosis}</span>
              </div>
            )}
          </div>
        )}

      {/* ── Rx MEDICATIONS ── */}
      {medications.length > 0 && (
        <div className="mb-5">
          <div className="mb-2">
            <span className="text-[20pt] font-bold italic leading-none text-gray-900">
              &#8478;
            </span>
          </div>

          <table className="rx-table">
            <thead>
              <tr>
                <th style={{ width: "28px" }}>#</th>
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
                const freqEnglish = freqOpt
                  ? freqOpt.label.split(" \u2014 ")[1] || freqOpt.label
                  : med.frequency;
                const freqTamil =
                  med.frequency_tamil || (freqOpt ? freqOpt.tamil : "");
                return (
                  <tr key={med.id} className="medication-item">
                    <td className="text-center font-bold text-gray-400">
                      {idx + 1}.
                    </td>
                    <td>
                      <div className="text-[12pt] font-bold">
                        {med.drug_name}
                      </div>
                      {instrText && (
                        <div
                          className="text-[8pt] italic text-gray-500"
                          {...(med.instructions_ta ? { lang: "ta" } : {})}
                        >
                          ({instrText})
                        </div>
                      )}
                    </td>
                    <td>{med.dosage}</td>
                    <td>
                      <div className="text-[10pt]">{freqEnglish}</div>
                      {freqTamil && (
                        <div className="text-[8pt] text-gray-400" lang="ta">
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
        </div>
      )}

      {/* ── PROCEDURES ── */}
      {procedures.length > 0 && (
        <div className="mb-5">
          <p
            className="mb-1 text-[11pt] font-bold uppercase tracking-wide text-gray-900"
          >
            {PRINT_LABELS.procedures.en}{" "}
            <span className="text-[9pt] font-normal text-gray-400" lang="ta">
              {PRINT_LABELS.procedures.ta}
            </span>
          </p>
          <ul className="list-inside list-disc pl-1 text-[10pt]">
            {procedures.map((proc) => (
              <li key={proc.id}>
                <span className="font-semibold">{proc.name}</span>
                {proc.duration && ` (${proc.duration})`}
                {proc.details && ` — ${proc.details}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── ADVICE ── */}
      {(prescription.diet_advice ||
        prescription.diet_advice_ta ||
        prescription.lifestyle_advice ||
        prescription.lifestyle_advice_ta ||
        prescription.exercise_advice ||
        prescription.exercise_advice_ta) && (
        <div className="mb-5">
          <p
            className="mb-1 text-[11pt] font-bold uppercase tracking-wide text-gray-900"
          >
            {PRINT_LABELS.advice.en}{" "}
            <span className="text-[9pt] font-normal text-gray-400" lang="ta">
              {PRINT_LABELS.advice.ta}
            </span>
          </p>
          <div className="space-y-0.5 pl-1 text-[10pt]">
            {(prescription.diet_advice_ta || prescription.diet_advice) && (
              <p>
                <span className="font-bold">{ADVICE_LABELS.diet.en}:</span>{" "}
                {prescription.diet_advice || prescription.diet_advice_ta}
              </p>
            )}
            {(prescription.lifestyle_advice_ta ||
              prescription.lifestyle_advice) && (
              <p>
                <span className="font-bold">
                  {ADVICE_LABELS.lifestyle.en}:
                </span>{" "}
                {prescription.lifestyle_advice ||
                  prescription.lifestyle_advice_ta}
              </p>
            )}
            {(prescription.exercise_advice_ta ||
              prescription.exercise_advice) && (
              <p>
                <span className="font-bold">
                  {ADVICE_LABELS.exercise.en}:
                </span>{" "}
                {prescription.exercise_advice ||
                  prescription.exercise_advice_ta}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── FOLLOW-UP ── */}
      {prescription.follow_up_date && (
        <div className="mb-5 rounded bg-gray-100 px-3 py-2">
          <span className="text-[10pt] font-bold">Follow-up: </span>
          <span className="text-[10pt] font-semibold">
            {(() => {
              const d = new Date(prescription.follow_up_date);
              const formatted = d.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              });
              // Friendly hint: "3rd Wednesday", "1st of next month", etc.
              const today = new Date();
              const diffDays = Math.round(
                (d.getTime() - today.getTime()) / 86400000,
              );
              const nth = Math.ceil(d.getDate() / 7);
              const ordinal = ["", "1st", "2nd", "3rd", "4th", "5th"][nth] || `${nth}th`;
              const dayName = d.toLocaleDateString("en-IN", { weekday: "long" });
              let hint = `${ordinal} ${dayName}`;
              if (d.getDate() === 1) {
                hint = "1st of the month";
              } else if (d.getDate() <= 3) {
                hint = `${d.getDate()}${d.getDate() === 2 ? "nd" : "rd"} of the month`;
              }
              if (diffDays <= 7) {
                hint = `This ${dayName}`;
              } else if (diffDays <= 14) {
                hint = `Next ${dayName}`;
              }
              return (
                <>
                  {formatted}
                  <span className="ml-2 text-[9pt] font-normal text-gray-500">
                    ({hint}{diffDays > 0 ? ` — ${diffDays} days` : ""})
                  </span>
                </>
              );
            })()}
          </span>
          {(prescription.follow_up_notes ||
            prescription.follow_up_notes_ta) && (
            <span className="text-[10pt]">
              {" — "}
              {prescription.follow_up_notes || prescription.follow_up_notes_ta}
            </span>
          )}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className="mt-8 flex items-end justify-between pt-2">
        <div className="text-[7pt] text-gray-400">
          Powered by Ruthva.com — AYUSH Clinic OS
        </div>
        {googleReviewUrl && (
          <div className="flex items-center gap-2">
            <span className="text-[7pt] text-gray-400">
              Leave us a review
            </span>
            <QRCodeSVG value={googleReviewUrl} size={72} level="M" />
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

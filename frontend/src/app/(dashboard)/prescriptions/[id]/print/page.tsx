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
      <span lang="ta" className="font-semibold">
        {ta}
      </span>{" "}
      <span className="text-[8pt] font-normal text-gray-400">{en}</span>
    </span>
  );
}

function BilingualTh({ ta, en }: { ta: string; en: string }) {
  return (
    <>
      <span lang="ta">{ta}</span>
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
          padding: 8px 10px;
          text-align: left;
          font-size: 11pt;
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
      <div className={`mb-4 border-b-2 pb-3 text-center ${user?.clinic?.letterhead_mode === "digital" ? "border-gray-300" : "no-print border-gray-300"}`}
        style={user?.clinic?.letterhead_mode === "digital" ? { borderColor: primaryColor } : undefined}
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
        <h1 className="text-lg font-bold" style={user?.clinic?.letterhead_mode === "digital" ? { color: primaryColor } : undefined}>
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
            {user.clinic.phone}{user?.clinic?.email ? ` | ${user.clinic.email}` : ""}
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
      <div className="mb-3 text-[18pt] font-bold italic" style={{ color: primaryColor }}>&#8478;</div>

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
                    <div className="text-[13pt] font-bold">{med.drug_name}</div>
                    {instrText && (
                      <div
                        className="text-[10pt] italic text-gray-500"
                        {...(med.instructions_ta ? { lang: "ta" } : {})}
                      >
                        ({instrText})
                      </div>
                    )}
                  </td>
                  <td>{med.dosage}</td>
                  <td>
                    {med.frequency_tamil ? (
                      <>
                        <span lang="ta">{med.frequency_tamil}</span>
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
          <p className="font-semibold" style={{ color: primaryColor, borderBottom: `1px solid ${primaryColor}`, paddingBottom: "3px", marginBottom: "8px" }}>
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
          <p className="font-semibold" style={{ color: primaryColor, borderBottom: `1px solid ${primaryColor}`, paddingBottom: "3px", marginBottom: "8px" }}>
            <TamilHeader
              ta={PRINT_LABELS.advice.ta + ":"}
              en={PRINT_LABELS.advice.en}
            />
          </p>
          {(prescription.diet_advice_ta || prescription.diet_advice) && (
            <p {...(prescription.diet_advice_ta ? { lang: "ta" } : {})}>
              <strong lang="ta">{ADVICE_LABELS.diet.ta}:</strong>{" "}
              {prescription.diet_advice_ta || prescription.diet_advice}
            </p>
          )}
          {(prescription.lifestyle_advice_ta ||
            prescription.lifestyle_advice) && (
            <p {...(prescription.lifestyle_advice_ta ? { lang: "ta" } : {})}>
              <strong lang="ta">{ADVICE_LABELS.lifestyle.ta}:</strong>{" "}
              {prescription.lifestyle_advice_ta ||
                prescription.lifestyle_advice}
            </p>
          )}
          {(prescription.exercise_advice_ta ||
            prescription.exercise_advice) && (
            <p {...(prescription.exercise_advice_ta ? { lang: "ta" } : {})}>
              <strong lang="ta">{ADVICE_LABELS.exercise.ta}:</strong>{" "}
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
            <span {...(prescription.follow_up_notes_ta ? { lang: "ta" } : {})}>
              {" — "}
              {prescription.follow_up_notes_ta || prescription.follow_up_notes}
            </span>
          )}
        </div>
      )}

      {/* Google Review QR */}
      {googleReviewUrl && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="text-[8pt] text-gray-400">Leave us a review</span>
          <QRCodeSVG
            value={googleReviewUrl}
            size={94}
            level="M"
          />
        </div>
      )}

      {/* Footer branding */}
      <div className="mt-6 border-t border-gray-200 pt-2 text-center text-[8pt] text-gray-400">
        Powered by Ruthva.com — AYUSH Clinic OS
      </div>

      <PrintTrigger patientName={patient?.name} consultationDate={consultation?.consultation_date} />
    </div>
  );
}

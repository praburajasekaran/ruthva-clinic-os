import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FREQUENCY_OPTIONS } from "@/lib/constants/envagai-options";
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

export default async function PrintPrescriptionPage({ params }: Props) {
  const prescription = await getPrescription(params.id);
  if (!prescription) notFound();

  const consultation = await getConsultation(String(prescription.consultation));
  const patient = consultation
    ? await getPatient(String(consultation.patient))
    : null;

  const medications = prescription.medications ?? [];
  const procedures = prescription.procedures ?? [];

  return (
    <div className="print-prescription mx-auto max-w-[148mm] bg-white p-[10mm]">
      <style>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 15mm 10mm 20mm 10mm;
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
        .print-prescription {
          font-size: 11pt;
          line-height: 1.4;
          color: black;
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
        }
        .medication-item {
          break-inside: avoid;
        }
      `}</style>

      {/* Clinic Header */}
      <div className="mb-4 border-b-2 border-black pb-3 text-center">
        <h1 className="text-lg font-bold">SIVANETHRAM</h1>
        <p className="text-xs">Siddha Clinic & Research Centre</p>
        <p className="text-xs text-gray-600">
          Doctor Name | BSMS, MD(S) | Reg. No: XXXXX
        </p>
      </div>

      {/* Patient Info */}
      {patient && (
        <div className="mb-4 grid grid-cols-2 gap-1 text-[10pt]">
          <div>
            <strong>Name:</strong> {patient.name}
          </div>
          <div>
            <strong>Record ID:</strong> {patient.record_id}
          </div>
          <div>
            <strong>Age/Gender:</strong> {patient.age}y /{" "}
            {patient.gender.charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>Date:</strong>{" "}
            {consultation
              ? new Date(consultation.consultation_date).toLocaleDateString(
                  "en-IN",
                )
              : new Date().toLocaleDateString("en-IN")}
          </div>
          {consultation?.diagnosis && (
            <div className="col-span-2">
              <strong>Diagnosis:</strong> {consultation.diagnosis}
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
              <th>Medicine</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
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
                },
                idx: number,
              ) => {
                const freqOpt = FREQUENCY_OPTIONS.find(
                  (f) => f.value === med.frequency,
                );
                return (
                  <tr key={med.id} className="medication-item">
                    <td>{idx + 1}</td>
                    <td>
                      {med.drug_name}
                      {med.instructions && (
                        <div className="text-[8pt] text-gray-500">
                          ({med.instructions})
                        </div>
                      )}
                    </td>
                    <td>{med.dosage}</td>
                    <td>
                      {freqOpt ? freqOpt.label.split(" \u2014 ")[0] : med.frequency}
                      {med.frequency_tamil && (
                        <div
                          className="text-[8pt]"
                          style={{ fontFamily: "var(--font-tamil)" }}
                        >
                          {med.frequency_tamil}
                        </div>
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

      {/* Procedures */}
      {procedures.length > 0 && (
        <div className="mb-4">
          <p className="font-semibold">Procedures:</p>
          <ul className="list-inside list-disc text-[10pt]">
            {procedures.map(
              (proc: { id: number; name: string; details: string; duration: string }) => (
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

      {/* Advice */}
      {(prescription.diet_advice ||
        prescription.lifestyle_advice ||
        prescription.exercise_advice) && (
        <div className="mb-4 text-[10pt]">
          <p className="font-semibold">Advice:</p>
          {prescription.diet_advice && (
            <p>
              <strong>Diet:</strong> {prescription.diet_advice}
            </p>
          )}
          {prescription.lifestyle_advice && (
            <p>
              <strong>Lifestyle:</strong> {prescription.lifestyle_advice}
            </p>
          )}
          {prescription.exercise_advice && (
            <p>
              <strong>Exercise:</strong> {prescription.exercise_advice}
            </p>
          )}
        </div>
      )}

      {/* Follow-up */}
      {prescription.follow_up_date && (
        <div className="mb-4 text-[10pt]">
          <strong>Follow-up Date:</strong>{" "}
          {new Date(prescription.follow_up_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {prescription.follow_up_notes && (
            <span> — {prescription.follow_up_notes}</span>
          )}
        </div>
      )}

      {/* Signature */}
      <div className="mt-12 text-right">
        <div className="mb-1 inline-block border-b border-black" style={{ width: "150px" }} />
        <p className="text-[10pt] font-semibold">Doctor&apos;s Signature</p>
      </div>

      {/* Print trigger */}
      <PrintTrigger />
    </div>
  );
}

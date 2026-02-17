"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PrescriptionBuilder } from "@/components/prescriptions/PrescriptionBuilder";
import { PatientBanner } from "@/components/patients/PatientBanner";
import api from "@/lib/api";
import type { Consultation, Patient, Prescription } from "@/lib/types";

function parseDosage(dosage: string): { amount: string; unit: string } {
  const match = dosage.match(/^([\d.]+)\s*(.*)$/);
  if (match) return { amount: match[1], unit: match[2].trim() };
  return { amount: dosage, unit: "" };
}

export default function EditPrescriptionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Prescription>(`/prescriptions/${id}/`)
      .then(async (res) => {
        setPrescription(res.data);
        try {
          const consultRes = await api.get<Consultation>(
            `/consultations/${res.data.consultation}/`,
          );
          setConsultation(consultRes.data);
          const patientRes = await api.get<Patient>(
            `/patients/${consultRes.data.patient}/`,
          );
          setPatient(patientRes.data);
        } catch {
          // Banner data is optional
        }
      })
      .catch(() => setError("Failed to load prescription"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error || "Prescription not found"}
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-emerald-700 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  // Convert API medication format to form format (split dosage into amount+unit)
  const initialData = {
    medications: (prescription.medications ?? []).map((med) => {
      const { amount, unit } = parseDosage(med.dosage);
      return {
        drug_name: med.drug_name,
        dosage_amount: amount,
        dosage_unit: unit,
        frequency: med.frequency,
        frequency_tamil: med.frequency_tamil ?? "",
        timing: "",
        timing_tamil: "",
        duration: med.duration,
        instructions: med.instructions,
        instructions_ta: med.instructions_ta ?? "",
      };
    }),
    procedures: (prescription.procedures ?? []).map((proc) => ({
      name: proc.name,
      details: proc.details,
      duration: proc.duration,
    })),
    diet_advice: prescription.diet_advice ?? "",
    diet_advice_ta: prescription.diet_advice_ta ?? "",
    lifestyle_advice: prescription.lifestyle_advice ?? "",
    lifestyle_advice_ta: prescription.lifestyle_advice_ta ?? "",
    exercise_advice: prescription.exercise_advice ?? "",
    exercise_advice_ta: prescription.exercise_advice_ta ?? "",
    follow_up_date: prescription.follow_up_date ?? "",
    follow_up_notes: prescription.follow_up_notes ?? "",
    follow_up_notes_ta: prescription.follow_up_notes_ta ?? "",
  };

  return (
    <div className="space-y-6">
      {patient && <PatientBanner patient={patient} />}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Edit Prescription
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Update prescription for {patient?.name ?? "this patient"}
        </p>
      </div>
      <PrescriptionBuilder
        consultationId={prescription.consultation}
        patientId={consultation?.patient ?? 0}
        mode="edit"
        prescriptionId={prescription.id}
        initialData={initialData}
      />
    </div>
  );
}

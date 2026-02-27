import type { Metadata } from "next";
import { PatientForm } from "@/components/patients/PatientForm";

export const metadata: Metadata = {
  title: "Register New Patient",
};

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Register New Patient
      </h1>
      <PatientForm />
    </div>
  );
}

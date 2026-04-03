import type { Metadata } from "next";
import { PatientForm } from "@/components/patients/PatientForm";

export const metadata: Metadata = {
  title: "Register New Patient",
};

export default function NewPatientPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Register New Patient
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new patient to your clinic
        </p>
      </div>
      <PatientForm />
    </div>
  );
}

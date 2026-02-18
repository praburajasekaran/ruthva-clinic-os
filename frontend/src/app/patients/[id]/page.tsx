import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { PatientShortcutsInit } from "@/components/patients/PatientShortcutsInit";
import { KbdBadge } from "@/components/ui/KbdBadge";
import {
  Calendar,
  FileText,
  Plus,
  Stethoscope,
  User,
} from "lucide-react";

type Props = {
  params: { id: string };
};

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

async function getConsultations(patientId: string) {
  try {
    const res = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:8000"}/api/v1/consultations/?patient=${patientId}`,
      { cache: "no-store" },
    );
    if (!res.ok) return { results: [] };
    return res.json();
  } catch {
    return { results: [] };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const patient = await getPatient(params.id);
  return {
    title: patient ? patient.name : "Patient Not Found",
  };
}

export default async function PatientDetailPage({ params }: Props) {
  const [patient, consultationsData] = await Promise.all([
    getPatient(params.id),
    getConsultations(params.id),
  ]);

  if (!patient) notFound();

  const consultations = consultationsData.results ?? [];

  return (
    <div className="space-y-6">
      <PatientShortcutsInit patientId={patient.id} />
      <PatientBanner patient={patient} />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/patients/${params.id}/consultations/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          New Consultation
          <KbdBadge keys={["C"]} aria-label="Press C to start a new consultation" />
        </Link>
      </div>

      {/* Patient Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <User className="h-4 w-4" />
            Patient Details
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Gender</dt>
              <dd className="font-medium text-gray-900 capitalize">{patient.gender}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Age</dt>
              <dd className="font-medium text-gray-900">{patient.age} years</dd>
            </div>
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd className="font-medium text-gray-900">{patient.phone}</dd>
            </div>
            {patient.email && (
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium text-gray-900">{patient.email}</dd>
              </div>
            )}
            {patient.blood_group && (
              <div>
                <dt className="text-gray-500">Blood Group</dt>
                <dd className="font-medium text-gray-900">{patient.blood_group}</dd>
              </div>
            )}
            {patient.occupation && (
              <div>
                <dt className="text-gray-500">Occupation</dt>
                <dd className="font-medium text-gray-900">{patient.occupation}</dd>
              </div>
            )}
            {patient.food_habits && (
              <div>
                <dt className="text-gray-500">Food Habits</dt>
                <dd className="font-medium text-gray-900 capitalize">
                  {patient.food_habits.replace("_", "-")}
                </dd>
              </div>
            )}
            {patient.allergies && (
              <div>
                <dt className="text-gray-500">Allergies</dt>
                <dd className="font-medium text-red-700">{patient.allergies}</dd>
              </div>
            )}
            {patient.address && (
              <div>
                <dt className="text-gray-500">Address</dt>
                <dd className="font-medium text-gray-900">{patient.address}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Consultation History */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <Stethoscope className="h-4 w-4" />
            Consultation History
          </h2>
          {consultations.length === 0 ? (
            <p className="text-sm text-gray-500">No consultations yet.</p>
          ) : (
            <div className="space-y-3">
              {consultations.map(
                (c: {
                  id: number;
                  consultation_date: string;
                  chief_complaints: string;
                  diagnosis: string;
                  prescription?: { id: number };
                }) => (
                  <Link
                    key={c.id}
                    href={`/consultations/${c.id}`}
                    className="block rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(c.consultation_date).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </div>
                        {c.chief_complaints && (
                          <p className="mt-1 text-sm text-gray-700">
                            {c.chief_complaints}
                          </p>
                        )}
                        {c.diagnosis && (
                          <p className="mt-0.5 text-sm font-medium text-gray-900">
                            Dx: {c.diagnosis}
                          </p>
                        )}
                      </div>
                      {c.prescription && (
                        <Link
                          href={`/prescriptions/${c.prescription.id}`}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText className="h-3 w-3" />
                          Rx
                        </Link>
                      )}
                    </div>
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      </div>

      {/* Medical History */}
      {patient.medical_history?.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Medical History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 font-medium text-gray-700">Disease</th>
                  <th className="pb-2 font-medium text-gray-700">Duration</th>
                  <th className="pb-2 font-medium text-gray-700">Medication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patient.medical_history.map(
                  (mh: { id: number; disease: string; duration: string; medication: string }) => (
                    <tr key={mh.id}>
                      <td className="py-2 text-gray-900">{mh.disease}</td>
                      <td className="py-2 text-gray-600">{mh.duration}</td>
                      <td className="py-2 text-gray-600">{mh.medication || "—"}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Family History */}
      {patient.family_history?.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Family History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 font-medium text-gray-700">Relation</th>
                  <th className="pb-2 font-medium text-gray-700">Disease</th>
                  <th className="pb-2 font-medium text-gray-700">Duration</th>
                  <th className="pb-2 font-medium text-gray-700">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patient.family_history.map(
                  (fh: { id: number; relation: string; disease: string; duration: string; remarks: string }) => (
                    <tr key={fh.id}>
                      <td className="py-2 text-gray-900">{fh.relation}</td>
                      <td className="py-2 text-gray-600">{fh.disease}</td>
                      <td className="py-2 text-gray-600">{fh.duration || "—"}</td>
                      <td className="py-2 text-gray-600">{fh.remarks || "—"}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

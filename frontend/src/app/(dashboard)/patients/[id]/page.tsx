"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { PatientShortcutsInit } from "@/components/patients/PatientShortcutsInit";
import { KbdBadge } from "@/components/ui/KbdBadge";
import {
  Archive,
  ArchiveRestore,
  Calendar,
  FileText,
  Pencil,
  Plus,
  Stethoscope,
  User,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { pharmacyApi } from "@/lib/api";
import type { Patient, PaginatedResponse } from "@/lib/types";

type ConsultationListItem = {
  id: number;
  consultation_date: string;
  chief_complaints: string;
  diagnosis: string;
  has_prescription: boolean;
};

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: patient, isLoading, refetch } = useApi<Patient>(
    `/patients/${params.id}/`,
  );
  const { data: consultationsData } =
    useApi<PaginatedResponse<ConsultationListItem>>(
      `/consultations/?patient=${params.id}`,
    );
  const [toggling, setToggling] = useState(false);

  const handleToggleActive = async () => {
    if (!patient) return;
    setToggling(true);
    try {
      await pharmacyApi.togglePatientActive(patient.id);
      refetch();
    } finally {
      setToggling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="py-20 text-center text-gray-500">Patient not found.</div>
    );
  }

  const consultations = consultationsData?.results ?? [];

  return (
    <div className="space-y-6">
      <PatientShortcutsInit patientId={patient.id} />
      <PatientBanner patient={patient} />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/patients/${params.id}/edit`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Pencil className="h-4 w-4" />
          Edit Patient
        </Link>
        <Link
          href={`/patients/${params.id}/consultations/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          New Consultation
          <KbdBadge
            keys={["C"]}
            aria-label="Press C to start a new consultation"
          />
        </Link>
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={toggling}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${
            patient.is_active
              ? "border-gray-300 text-gray-700 hover:bg-gray-50"
              : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {patient.is_active ? (
            <><Archive className="h-4 w-4" /> Archive Patient</>
          ) : (
            <><ArchiveRestore className="h-4 w-4" /> Reactivate Patient</>
          )}
        </button>
      </div>

      {/* Archived banner */}
      {!patient.is_active && (
        <div className="rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
          This patient is archived and does not count toward your active patient limit.
        </div>
      )}

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
              <dd className="font-medium capitalize text-gray-900">
                {patient.gender}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Age</dt>
              <dd className="font-medium text-gray-900">
                {patient.age} years
              </dd>
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
                <dd className="font-medium text-gray-900">
                  {patient.blood_group}
                </dd>
              </div>
            )}
            {patient.occupation && (
              <div>
                <dt className="text-gray-500">Occupation</dt>
                <dd className="font-medium text-gray-900">
                  {patient.occupation}
                </dd>
              </div>
            )}
            {patient.food_habits && (
              <div>
                <dt className="text-gray-500">Food Habits</dt>
                <dd className="font-medium capitalize text-gray-900">
                  {patient.food_habits.replace("_", "-")}
                </dd>
              </div>
            )}
            {patient.whatsapp_number && (
              <div>
                <dt className="text-gray-500">WhatsApp</dt>
                <dd className="font-medium text-gray-900">{patient.whatsapp_number}</dd>
              </div>
            )}
            {patient.marital_status && (
              <div>
                <dt className="text-gray-500">Marital Status</dt>
                <dd className="font-medium capitalize text-gray-900">{patient.marital_status}</dd>
              </div>
            )}
            {patient.referred_by && (
              <div>
                <dt className="text-gray-500">Referred By</dt>
                <dd className="font-medium text-gray-900">{patient.referred_by}</dd>
              </div>
            )}
            {patient.activity_level && (
              <div>
                <dt className="text-gray-500">Activity Level</dt>
                <dd className="font-medium capitalize text-gray-900">{patient.activity_level}</dd>
              </div>
            )}
            {patient.allergies && (
              <div>
                <dt className="text-gray-500">Allergies</dt>
                <dd className="font-medium text-red-700">
                  {patient.allergies}
                </dd>
              </div>
            )}
            {patient.menstrual_history && (
              <div>
                <dt className="text-gray-500">Menstrual History</dt>
                <dd className="font-medium text-gray-900">{patient.menstrual_history}</dd>
              </div>
            )}
            {patient.number_of_children != null && (
              <div>
                <dt className="text-gray-500">Number of Children</dt>
                <dd className="font-medium text-gray-900">{patient.number_of_children}</dd>
              </div>
            )}
            {patient.vaccination_records && (
              <div>
                <dt className="text-gray-500">Vaccination Records</dt>
                <dd className="font-medium text-gray-900">{patient.vaccination_records}</dd>
              </div>
            )}
            {patient.address && (
              <div>
                <dt className="text-gray-500">Address</dt>
                <dd className="font-medium text-gray-900">
                  {patient.address}
                </dd>
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
              {consultations.map((c) => (
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
                    {c.has_prescription && (
                      <span className="flex items-center gap-1 rounded px-2 py-1 text-xs text-emerald-700">
                        <FileText className="h-3 w-3" />
                        Rx
                      </span>
                    )}
                  </div>
                </Link>
              ))}
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
                  <th className="pb-2 font-medium text-gray-700">
                    Medication
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patient.medical_history.map((mh) => (
                  <tr key={mh.id}>
                    <td className="py-2 text-gray-900">{mh.disease}</td>
                    <td className="py-2 text-gray-600">{mh.duration}</td>
                    <td className="py-2 text-gray-600">
                      {mh.medication || "\u2014"}
                    </td>
                  </tr>
                ))}
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
                {patient.family_history.map((fh) => (
                  <tr key={fh.id}>
                    <td className="py-2 text-gray-900">{fh.relation}</td>
                    <td className="py-2 text-gray-600">{fh.disease}</td>
                    <td className="py-2 text-gray-600">
                      {fh.duration || "\u2014"}
                    </td>
                    <td className="py-2 text-gray-600">
                      {fh.remarks || "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

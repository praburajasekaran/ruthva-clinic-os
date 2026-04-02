"use client";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Plus, Search, Stethoscope } from "lucide-react";
import type { PaginatedResponse, PatientListItem } from "@/lib/types";

interface Consultation {
    id: number;
    patient: number;
    patient_name: string;
    patient_record_id: string;
    consultation_date: string;
    diagnosis: string;
    has_prescription: boolean;
    created_at: string;
}

export default function ConsultationsPage() {
    const router = useRouter();
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showPatientPicker, setShowPatientPicker] = useState(false);
    const [patients, setPatients] = useState<PatientListItem[]>([]);
    const [patientsLoading, setPatientsLoading] = useState(false);
    const [patientSearch, setPatientSearch] = useState("");

    useEffect(() => {
        api
            .get("/consultations/")
            .then((res) => setConsultations(res.data.results ?? res.data))
            .catch((err) => setError(err.message || "Failed to load visits"))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!showPatientPicker) return;
        setPatientsLoading(true);
        api
            .get("/patients/")
            .then((res) => {
                const data = res.data as PaginatedResponse<PatientListItem>;
                setPatients(data.results);
            })
            .catch(() => setPatients([]))
            .finally(() => setPatientsLoading(false));
    }, [showPatientPicker]);

    const filteredPatients = useMemo(() => {
        if (!patientSearch.trim()) return patients;
        const q = patientSearch.toLowerCase();
        return patients.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.record_id.toLowerCase().includes(q) ||
                p.phone.includes(q),
        );
    }, [patients, patientSearch]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Spinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                {error}
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Visits</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {consultations.length} visit{consultations.length !== 1 ? "s" : ""} recorded in the care flow
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setPatientSearch("");
                        setShowPatientPicker(true);
                    }}
                    size="sm"
                >
                    <Plus className="h-4 w-4" />
                    New Consultation
                </Button>
            </div>

            <Modal
                open={showPatientPicker}
                onClose={() => setShowPatientPicker(false)}
                title="Select Patient"
                size="md"
            >
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search by name, record ID, or phone..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="pl-9"
                        autoFocus
                    />
                </div>
                {patientsLoading ? (
                    <div className="flex justify-center py-8">
                        <Spinner />
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">
                        {patientSearch ? "No patients match your search" : "No patients found"}
                    </p>
                ) : (
                    <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
                        {filteredPatients.map((p) => (
                            <li key={p.id}>
                                <button
                                    type="button"
                                    onClick={() => router.push(`/patients/${p.id}/consultations/new`)}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {p.record_id} &middot; {p.phone}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Modal>

            {consultations.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-16">
                    <Stethoscope className="mb-3 h-12 w-12 text-gray-400" />
                    <p className="text-lg font-medium text-gray-600">No visits yet</p>
                    <p className="mt-1 text-sm text-gray-400">
                        Visits will appear here once clinical assessments are recorded
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                    <table aria-label="Consultations" className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Date
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Patient
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Record ID
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Diagnosis
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Prescription
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {consultations.map((c) => (
                                <tr
                                    key={c.id}
                                    onClick={() => router.push(`/consultations/${c.id}`)}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            router.push(`/consultations/${c.id}`);
                                        }
                                    }}
                                    className="cursor-pointer transition-colors hover:bg-gray-50"
                                >
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                        <Link href={`/consultations/${c.id}`}>
                                            {c.consultation_date}
                                        </Link>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                        {c.patient_name}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-emerald-700">
                                        {c.patient_record_id}
                                    </td>
                                    <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-600">
                                        {c.diagnosis || "—"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                                        {c.has_prescription ? (
                                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                                                No
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

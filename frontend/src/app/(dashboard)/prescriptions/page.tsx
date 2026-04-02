"use client";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { AlertTriangle, FileText, Plus, Search } from "lucide-react";

interface Prescription {
    id: number;
    consultation: number;
    patient_name: string;
    patient_record_id: string;
    consultation_date: string;
    follow_up_date: string | null;
    medication_count: number;
    created_at: string;
}

interface ConsultationOption {
    id: number;
    patient_name: string;
    patient_record_id: string;
    consultation_date: string;
    diagnosis: string;
    has_prescription: boolean;
}

export default function PrescriptionsPage() {
    const router = useRouter();
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showPicker, setShowPicker] = useState(false);
    const [consultations, setConsultations] = useState<ConsultationOption[]>([]);
    const [consultationsLoading, setConsultationsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [confirmConsultation, setConfirmConsultation] = useState<ConsultationOption | null>(null);

    useEffect(() => {
        api
            .get("/prescriptions/")
            .then((res) => setPrescriptions(res.data.results ?? res.data))
            .catch((err) => setError(err.message || "Failed to load prescriptions"))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!showPicker) return;
        setConsultationsLoading(true);
        api
            .get("/consultations/")
            .then((res) => {
                const data = res.data.results ?? res.data;
                setConsultations(data);
            })
            .catch(() => setConsultations([]))
            .finally(() => setConsultationsLoading(false));
    }, [showPicker]);

    const filteredConsultations = useMemo(() => {
        if (!searchQuery.trim()) return consultations;
        const q = searchQuery.toLowerCase();
        return consultations.filter(
            (c) =>
                c.patient_name.toLowerCase().includes(q) ||
                c.patient_record_id.toLowerCase().includes(q) ||
                c.consultation_date.includes(q) ||
                (c.diagnosis && c.diagnosis.toLowerCase().includes(q)),
        );
    }, [consultations, searchQuery]);

    function handleSelectConsultation(c: ConsultationOption) {
        if (c.has_prescription) {
            setConfirmConsultation(c);
        } else {
            router.push(`/consultations/${c.id}/prescriptions/new`);
        }
    }

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
                    <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {prescriptions.length} prescription{prescriptions.length !== 1 ? "s" : ""} recorded
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setSearchQuery("");
                        setConfirmConsultation(null);
                        setShowPicker(true);
                    }}
                    size="sm"
                >
                    <Plus className="h-4 w-4" />
                    New Prescription
                </Button>
            </div>

            {/* Consultation picker modal */}
            <Modal
                open={showPicker && !confirmConsultation}
                onClose={() => setShowPicker(false)}
                title="Select Consultation"
                size="lg"
            >
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search by patient name, record ID, date, or diagnosis..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                        autoFocus
                    />
                </div>
                {consultationsLoading ? (
                    <div className="flex justify-center py-8">
                        <Spinner />
                    </div>
                ) : filteredConsultations.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">
                        {searchQuery ? "No consultations match your search" : "No consultations found"}
                    </p>
                ) : (
                    <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
                        {filteredConsultations.map((c) => (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    onClick={() => handleSelectConsultation(c)}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900">
                                            {c.patient_name}
                                            <span className="ml-2 text-xs font-normal text-emerald-700">{c.patient_record_id}</span>
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {c.consultation_date}
                                            {c.diagnosis && <> &middot; {c.diagnosis}</>}
                                        </p>
                                    </div>
                                    {c.has_prescription && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                            <AlertTriangle className="h-3 w-3" />
                                            Has Rx
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Modal>

            {/* Confirmation modal for consultations that already have a prescription */}
            <Modal
                open={!!confirmConsultation}
                onClose={() => setConfirmConsultation(null)}
                title="Prescription Already Exists"
                size="sm"
            >
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                        <AlertTriangle className="h-6 w-6 text-amber-600" />
                    </div>
                    <p className="text-sm text-gray-700">
                        <strong>{confirmConsultation?.patient_name}</strong>&apos;s consultation on{" "}
                        <strong>{confirmConsultation?.consultation_date}</strong> already has a prescription.
                    </p>
                    <p className="text-sm text-gray-500">
                        Do you want to create another prescription for this consultation?
                    </p>
                    <div className="mt-2 flex gap-3">
                        <Button variant="secondary" size="sm" onClick={() => setConfirmConsultation(null)}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                if (confirmConsultation) {
                                    router.push(`/consultations/${confirmConsultation.id}/prescriptions/new`);
                                }
                            }}
                        >
                            Continue Anyway
                        </Button>
                    </div>
                </div>
            </Modal>

            {prescriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-16">
                    <FileText className="mb-3 h-12 w-12 text-gray-400" />
                    <p className="text-lg font-medium text-gray-600">No prescriptions yet</p>
                    <p className="mt-1 text-sm text-gray-400">
                        Prescriptions will appear here once created
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Patient
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Record ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Visit Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Follow-up Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Medications
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {prescriptions.map((rx) => (
                                <tr
                                    key={rx.id}
                                    onClick={() => router.push(`/prescriptions/${rx.id}`)}
                                    className="cursor-pointer transition-colors hover:bg-gray-50"
                                >
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                        {rx.patient_name}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-emerald-700">
                                        {rx.patient_record_id}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                        {rx.consultation_date}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                        {rx.follow_up_date ?? "—"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                            {rx.medication_count ?? 0} med{(rx.medication_count ?? 0) !== 1 ? "s" : ""}
                                        </span>
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

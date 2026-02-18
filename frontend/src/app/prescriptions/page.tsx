"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { FileText } from "lucide-react";

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

export default function PrescriptionsPage() {
    const router = useRouter();
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        api
            .get("/prescriptions/")
            .then((res) => setPrescriptions(res.data.results ?? res.data))
            .catch((err) => setError(err.message || "Failed to load prescriptions"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
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
            </div>

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
                                    Consultation Date
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

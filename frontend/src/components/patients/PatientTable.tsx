"use client";

import { ChevronLeft, ChevronRight, Phone, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import api from "@/lib/api";
import type { PaginatedResponse, PatientListItem } from "@/lib/types";

type PatientTableProps = {
  initialData: PaginatedResponse<PatientListItem>;
};

export function PatientTable({ initialData }: PatientTableProps) {
  const router = useRouter();
  const [paginatedData, setPaginatedData] = useState(initialData);
  const [paginatingDir, setPaginatingDir] = useState<"next" | "prev" | null>(null);

  const paginate = useCallback(async (url: string | null, dir: "next" | "prev") => {
    if (!url) return;
    setPaginatingDir(dir);
    try {
      const { data } = await api.get<PaginatedResponse<PatientListItem>>(url);
      setPaginatedData(data);
    } finally {
      setPaginatingDir(null);
    }
  }, []);
  const {
    query,
    setQuery,
    results: searchResults,
    isLoading: searchLoading,
  } = useDebouncedSearch<PaginatedResponse<PatientListItem>>({
    endpoint: "/patients/",
    queryParam: "search",
  });

  const data = query.length >= 2 ? searchResults : paginatedData;
  const isLoading = query.length >= 2 && searchLoading;
  const patients = data?.results ?? [];
  const hasNext = !!data?.next;
  const hasPrev = !!data?.previous;
  const totalCount = data?.count ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 sm:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone, or ID..."
              className="pl-10"
            />
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
            <Phone className="h-3 w-3" />
            <span>Tip: Enter phone number for fastest lookup</span>
          </p>
        </div>
        <Link href="/patients/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Patient
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : patients.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">
              {query
                ? "No patients found matching your search."
                : "No patients yet. Register your first patient."}
            </p>
            {!query && (
              <Link href="/patients/new" className="mt-3 inline-block">
                <Button variant="secondary" size="sm">
                  <Plus className="h-4 w-4" />
                  Register Patient
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">
                  Record ID
                </th>
                <th className="px-4 py-3 font-medium text-gray-700">Name</th>
                <th className="hidden px-4 py-3 font-medium text-gray-700 sm:table-cell">
                  Age/Gender
                </th>
                <th className="hidden px-4 py-3 font-medium text-gray-700 md:table-cell">
                  Phone
                </th>
                <th className="hidden px-4 py-3 font-medium text-gray-700 lg:table-cell">
                  Visits
                </th>
                <th className="hidden px-4 py-3 font-medium text-gray-700 lg:table-cell">
                  Last Visit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  onClick={() => router.push(`/patients/${patient.id}`)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {patient.record_id}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {patient.name}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                    {patient.age}y / {patient.gender.charAt(0).toUpperCase()}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                    {patient.phone}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 lg:table-cell">
                    {patient.consultation_count}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">
                    {patient.last_visit
                      ? new Date(patient.last_visit).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{totalCount} patient{totalCount !== 1 ? "s" : ""}</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasPrev || paginatingDir === "prev"}
              onClick={() => paginate(data?.previous ?? null, "prev")}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasNext || paginatingDir === "next"}
              onClick={() => paginate(data?.next ?? null, "next")}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { Spinner } from "@/components/ui/Spinner";

import { ChevronLeft, ChevronRight, Eye, EyeOff, FileSpreadsheet, Phone, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { dataPortabilityApi } from "@/lib/api";
import api from "@/lib/api";
import type { PaginatedResponse, PatientListItem } from "@/lib/types";

type PatientTableProps = {
  initialData: PaginatedResponse<PatientListItem>;
};

export function PatientTable({ initialData }: PatientTableProps) {
  const router = useRouter();
  const [paginatedData, setPaginatedData] = useState(initialData);
  const [paginatingDir, setPaginatingDir] = useState<"next" | "prev" | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    setPaginatedData(initialData);
  }, [initialData]);

  const paginate = useCallback(async (url: string | null, dir: "next" | "prev") => {
    if (!url) return;
    setPaginatingDir(dir);
    try {
      const { data } = await api.get<PaginatedResponse<PatientListItem>>(url);
      setPaginatedData(data);
      setSelectedIds(new Set());
    } finally {
      setPaginatingDir(null);
    }
  }, []);

  const refetch = useCallback(async () => {
    try {
      const { data } = await api.get<PaginatedResponse<PatientListItem>>("/patients/");
      setPaginatedData(data);
      setSelectedIds(new Set());
    } catch {
      // keep existing data
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
  const allPatients = data?.results ?? [];
  const patients = showArchived ? allPatients : allPatients.filter((p) => p.is_active !== false);
  const hasNext = !!data?.next;
  const hasPrev = !!data?.previous;
  const totalCount = data?.count ?? 0;

  const toggleSelect = useCallback((id: number, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === patients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(patients.map((p) => p.id)));
    }
  }, [patients, selectedIds.size]);

  const handleBulkDelete = useCallback(async () => {
    setBulkActionLoading(true);
    try {
      await dataPortabilityApi.bulkDeletePatients(Array.from(selectedIds));
      setShowDeleteModal(false);
      await refetch();
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedIds, refetch]);

  const handleBulkToggleActive = useCallback(async (isActive: boolean) => {
    setBulkActionLoading(true);
    try {
      await dataPortabilityApi.bulkToggleActivePatients(Array.from(selectedIds), isActive);
      await refetch();
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedIds, refetch]);

  return (
    <div className={`space-y-4 ${selectedIds.size > 0 ? "pb-20 sm:pb-0" : ""}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 sm:max-w-sm">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone, or ID..."
              aria-label="Search patients"
              className="pl-10"
            />
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Tip: Enter phone number for fastest lookup</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`inline-flex min-h-12 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors md:min-h-0 ${
              showArchived
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {showArchived ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {showArchived ? "Showing All" : "Active Only"}
          </button>
          <Link href="/patients/import">
            <Button variant="secondary" className="w-full sm:w-auto">
              <FileSpreadsheet className="h-4 w-4" />
              Import
            </Button>
          </Link>
          <Link href="/patients/new" className="col-span-2 sm:col-span-1">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              New Patient
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="sm" />
          </div>
        ) : patients.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">
              {query
                ? "No patients found matching your search."
                : "No patients yet. Register your first patient."}
            </p>
            {!query && (
              <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/patients/new">
                  <Button variant="secondary" size="sm">
                    <Plus className="h-4 w-4" />
                    Register Patient
                  </Button>
                </Link>
                <Link href="/patients/import">
                  <Button variant="secondary" size="sm">
                    <FileSpreadsheet className="h-4 w-4" />
                    Import CSV
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <table aria-label="Patients" className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th scope="col" className="w-12 px-1 py-2 sm:w-10 sm:px-3 sm:py-3">
                  <label className="flex min-h-11 min-w-11 items-center justify-center sm:min-h-0 sm:min-w-0">
                    <input
                      type="checkbox"
                      checked={patients.length > 0 && selectedIds.size === patients.length}
                      onChange={toggleSelectAll}
                      className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 sm:h-4 sm:w-4"
                      aria-label="Select all patients"
                    />
                  </label>
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium text-gray-700 sm:table-cell">
                  Record ID
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-gray-700">Name</th>
                <th scope="col" className="hidden px-4 py-3 font-medium text-gray-700 sm:table-cell">
                  Age/Gender
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium text-gray-700 md:table-cell">
                  Phone
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium text-gray-700 lg:table-cell">
                  Visits
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium text-gray-700 lg:table-cell">
                  Last Visit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  onClick={() => router.push(`/patients/${patient.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/patients/${patient.id}`);
                    }
                  }}
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedIds.has(patient.id) ? "bg-emerald-50" : ""
                  }`}
                >
                  <td className="w-12 px-1 py-3 sm:w-10 sm:px-3" onClick={(e) => e.stopPropagation()}>
                    <label className="flex min-h-11 min-w-11 items-center justify-center sm:min-h-0 sm:min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(patient.id)}
                        onChange={(e) => toggleSelect(patient.id, e)}
                        className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 sm:h-4 sm:w-4"
                        aria-label={`Select ${patient.name}`}
                      />
                    </label>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-gray-500 sm:table-cell">
                    {patient.record_id}
                  </td>
                  <td className="break-words px-4 py-4 font-medium text-gray-900 sm:py-3">
                    <Link href={`/patients/${patient.id}`} className="text-base sm:text-sm">
                      {patient.name}
                    </Link>
                    {patient.is_active === false && (
                      <span className="ml-2 inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-500">
                        Archived
                      </span>
                    )}
                    <div className="mt-1 space-y-1 font-normal text-gray-500 sm:hidden">
                      <p className="font-mono text-xs">{patient.record_id}</p>
                      <p className="text-sm">{patient.age}y · {patient.gender.charAt(0).toUpperCase()} · {patient.phone}</p>
                    </div>
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
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
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

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xl sm:w-auto sm:flex-nowrap">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.size} selected
          </span>
          <div className="h-5 w-px bg-gray-200" />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleBulkToggleActive(false)}
            isLoading={bulkActionLoading}
          >
            <EyeOff className="h-4 w-4" />
            Archive
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleBulkToggleActive(true)}
            isLoading={bulkActionLoading}
          >
            <Eye className="h-4 w-4" />
            Activate
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 md:h-7 md:w-7"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Patients"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete{" "}
            <span className="font-medium text-gray-900">
              {selectedIds.size} patient{selectedIds.size !== 1 ? "s" : ""}
            </span>
            ? This will also remove their consultations, prescriptions, and treatment data.
          </p>
          <p className="text-xs text-amber-600">
            This action cannot be undone. Consider archiving instead.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
              isLoading={bulkActionLoading}
            >
              Delete {selectedIds.size} Patient{selectedIds.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

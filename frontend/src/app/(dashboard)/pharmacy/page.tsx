"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { MedicineCatalogTable } from "@/components/pharmacy/MedicineCatalogTable";
import { MedicineForm } from "@/components/pharmacy/MedicineForm";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/auth/AuthProvider";
import type { PaginatedResponse, Medicine } from "@/lib/types";

export default function PharmacyPage() {
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();
  const { data, refetch } = useApi<PaginatedResponse<Medicine>>("/pharmacy/medicines/");
  const canWrite = user?.role === "doctor" || user?.is_clinic_owner;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pharmacy</h1>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Medicine
          </button>
        )}
      </div>

      {showForm && (
        <MedicineForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            refetch();
          }}
        />
      )}

      <MedicineCatalogTable
        data={data}
        onRefresh={refetch}
      />
    </div>
  );
}

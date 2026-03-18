"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Package, Power } from "lucide-react";
import Link from "next/link";
import { MedicineForm } from "@/components/pharmacy/MedicineForm";
import { StockAdjustmentForm } from "@/components/pharmacy/StockAdjustmentForm";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/auth/AuthProvider";
import { pharmacyApi } from "@/lib/api";
import type { Medicine } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  kashayam: "Kashayam", choornam: "Choornam", lehyam: "Lehyam",
  tailam: "Tailam", arishtam: "Arishtam", asavam: "Asavam",
  gulika: "Gulika", parpam: "Parpam", chenduram: "Chenduram",
  nei: "Nei", tablet: "Tablet", capsule: "Capsule",
  syrup: "Syrup", external: "External", other: "Other",
  mother_tincture: "Mother Tincture (Q)", trituration: "Trituration",
  centesimal: "Centesimal (C)", lm_potency: "LM Potency", biochemic: "Biochemic",
};

export default function MedicineDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = Number(params.id);
  const { data: medicine, refetch } = useApi<Medicine>(`/pharmacy/medicines/${id}/`);
  const [editing, setEditing] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const canWrite = user?.role === "doctor" || user?.is_clinic_owner;

  if (!medicine) {
    return <div className="text-gray-500">Loading...</div>;
  }

  const handleToggleActive = async () => {
    await pharmacyApi.updateMedicine(id, { is_active: !medicine.is_active });
    refetch();
  };

  return (
    <div>
      <Link
        href="/pharmacy"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pharmacy
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {medicine.name}
            {!medicine.is_active && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                Inactive
              </span>
            )}
          </h1>
          {medicine.brand_name && (
            <p className="text-sm text-gray-400">{medicine.brand_name}</p>
          )}
          {medicine.name_ta && (
            <p className="text-sm text-emerald-600">{medicine.name_ta}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {CATEGORY_LABELS[medicine.category] || medicine.category} &middot; {medicine.dosage_form}
          </p>
        </div>

        {canWrite && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleToggleActive}
              className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm ${
                medicine.is_active
                  ? "text-red-600 hover:bg-red-50"
                  : "text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              {medicine.is_active ? "Deactivate" : "Reactivate"}
            </button>
          </div>
        )}
      </div>

      {editing && (
        <MedicineForm
          medicine={medicine}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            refetch();
          }}
        />
      )}

      {/* Stock overview */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`rounded-lg border p-4 ${medicine.is_low_stock ? "border-amber-200 bg-amber-50" : "bg-white"}`}>
          <p className="text-sm text-gray-500">Current Stock</p>
          <p className={`text-2xl font-bold ${medicine.is_low_stock ? "text-amber-700" : "text-gray-900"}`}>
            {medicine.current_stock}
          </p>
          {medicine.is_low_stock && (
            <p className="mt-1 text-xs text-amber-600">Below reorder level ({medicine.reorder_level})</p>
          )}
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Reorder Level</p>
          <p className="text-2xl font-bold text-gray-900">{medicine.reorder_level}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Unit Price</p>
          <p className="text-2xl font-bold text-gray-900">₹{medicine.unit_price}</p>
        </div>
      </div>

      {/* Add stock */}
      {canWrite && (
        <div className="mb-6">
          {showStock ? (
            <StockAdjustmentForm
              medicineId={id}
              onClose={() => setShowStock(false)}
              onSaved={() => {
                setShowStock(false);
                refetch();
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowStock(true)}
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              <Package className="h-4 w-4" />
              Add Stock
            </button>
          )}
        </div>
      )}

      {/* Stock history */}
      {medicine.recent_stock_entries && medicine.recent_stock_entries.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Stock History</h2>
          <div className="rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Change</th>
                  <th className="px-4 py-2 text-right">Balance</th>
                  <th className="px-4 py-2">Batch</th>
                  <th className="px-4 py-2">Expiry</th>
                  <th className="px-4 py-2">By</th>
                  <th className="px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {medicine.recent_stock_entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.entry_type === "purchase" ? "bg-green-100 text-green-700" :
                        entry.entry_type === "dispense" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {entry.entry_type}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-right font-mono ${
                      entry.quantity_change > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {entry.quantity_change > 0 ? "+" : ""}{entry.quantity_change}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-700">
                      {entry.balance_after}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{entry.batch_number || "—"}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {entry.expiry_date ? new Date(entry.expiry_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{entry.actor_name}</td>
                    <td className="px-4 py-2 text-gray-500">{entry.notes}</td>
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

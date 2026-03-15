"use client";

import { useState } from "react";
import { X, Package } from "lucide-react";
import { pharmacyApi } from "@/lib/api";
import type { Medication } from "@/lib/types";

type DispenseLineItem = {
  medicine_id: number;
  drug_name: string;
  quantity_dispensed: number;
  current_stock: number;
};

type Props = {
  prescriptionId: number;
  medications: Medication[];
  onClose: () => void;
  onDispensed: () => void;
};

export function DispenseModal({ prescriptionId, medications, onClose, onDispensed }: Props) {
  const linkedMeds = medications.filter((m) => m.medicine_id || m.medicine);
  const [items, setItems] = useState<DispenseLineItem[]>(
    linkedMeds.map((m) => ({
      medicine_id: (m.medicine_id ?? m.medicine) as number,
      drug_name: m.medicine_name ?? m.drug_name,
      quantity_dispensed: 1,
      current_stock: 0,
    })),
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateQuantity = (idx: number, qty: number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity_dispensed: qty } : item)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setSaving(true);
    setError("");
    try {
      await pharmacyApi.dispense({
        prescription_id: prescriptionId,
        notes,
        items: items.map((it) => ({
          medicine_id: it.medicine_id,
          quantity_dispensed: it.quantity_dispensed,
        })),
      });
      onDispensed();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Failed to dispense.")
          : "Failed to dispense.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Dispense Medicines</h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="p-6">
          {items.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              No medications linked to pharmacy catalog. Link medicines in the prescription to enable dispensing.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.medicine_id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.drug_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity_dispensed}
                      onChange={(e) => updateQuantity(idx, Math.max(1, Number(e.target.value)))}
                      className="w-16 rounded border px-2 py-1 text-center text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Optional dispensing notes..."
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || items.length === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Dispensing..." : "Confirm Dispense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

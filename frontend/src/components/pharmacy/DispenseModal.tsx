"use client";

import { useState } from "react";
import { X, Package } from "lucide-react";
import { pharmacyApi } from "@/lib/api";
import type { Medication } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";

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
    <Modal open title="Dispense Medicines" onClose={onClose} size="md">
      <div className="flex items-center gap-2 -mt-1 mb-4">
        <Package aria-hidden="true" className="h-5 w-5 text-emerald-600" />
        <span className="text-sm text-gray-500">Confirm quantities below</span>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
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
                    className="w-16 rounded border px-2 py-1 text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  aria-label={`Remove ${item.drug_name}`}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
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
            className="w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
            placeholder="Optional dispensing notes"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || items.length === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {saving ? "Dispensing..." : "Confirm Dispense"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useRef, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Column = {
  key: string;
  label: string;
  placeholder?: string;
};

type DynamicTableProps = {
  columns: Column[];
  rows: Record<string, string>[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, key: string, value: string) => void;
  addLabel?: string;
};

export function DynamicTable({
  columns,
  rows,
  onAdd,
  onRemove,
  onChange,
  addLabel = "Add Row",
}: DynamicTableProps) {
  // 2D grid of input refs: cellRefs.current[rowIdx][colIdx]
  const cellRefs = useRef<(HTMLInputElement | null)[][]>([]);

  // Keep the ref grid sized to match rows × columns on every render
  cellRefs.current = rows.map(
    (_, rowIdx) =>
      cellRefs.current[rowIdx] ?? new Array(columns.length).fill(null)
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      rowIdx: number,
      colIdx: number
    ) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextRow = rowIdx + 1;
        if (nextRow < rows.length) {
          // Move to same column in the next row
          cellRefs.current[nextRow]?.[colIdx]?.focus();
        } else {
          // On last row: add a new row, then focus its cell after state update
          onAdd();
          setTimeout(() => {
            cellRefs.current[nextRow]?.[colIdx]?.focus();
          }, 0);
        }
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevRow = rowIdx - 1;
        if (prevRow >= 0) {
          cellRefs.current[prevRow]?.[colIdx]?.focus();
        }
      }
    },
    [rows.length, onAdd]
  );

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div className="space-y-2">
          {/* Header - hidden on mobile */}
          <div className="hidden grid-cols-[1fr_auto] gap-2 md:grid">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
              }}
            >
              {columns.map((col) => (
                <span
                  key={col.key}
                  className="text-sm font-medium text-gray-700"
                >
                  {col.label}
                </span>
              ))}
            </div>
            <div className="w-9" />
          </div>

          {/* Rows */}
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_auto] items-start gap-2"
            >
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
                }}
              >
                {columns.map((col, colIdx) => (
                  <Input
                    key={col.key}
                    ref={(el) => {
                      if (!cellRefs.current[idx]) {
                        cellRefs.current[idx] = new Array(columns.length).fill(null);
                      }
                      cellRefs.current[idx][colIdx] = el;
                    }}
                    value={row[col.key] ?? ""}
                    onChange={(e) => onChange(idx, col.key, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, idx, colIdx)}
                    placeholder={col.placeholder ?? col.label}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="mt-2 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove row ${idx + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAdd}
        className="text-emerald-700"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}

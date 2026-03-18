"use client";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { dataPortabilityApi } from "@/lib/api";
import type {
  ImportConfirmResult,
  ImportPreviewResult,
  ImportPreviewRow,
  RuthvaSyncResult,
} from "@/lib/types";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

type ImportStep = "upload" | "preview" | "results";

const CSV_TEMPLATE =
  "name,age,gender,phone,diagnosis,last_seen_date,next_review_date,email,date_of_birth,blood_group,address,whatsapp_number,occupation,allergies,food_habits\n" +
  "Ravi Kumar,45,male,9876543210,Chronic sinusitis,2026-03-01,2026-04-01,ravi@example.com,1981-05-15,B+,Chennai,9876543210,Engineer,,vegetarian\n";

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "patient-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function PatientImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [results, setResults] = useState<ImportConfirmResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryingSync, setRetryingSync] = useState(false);
  const [syncResult, setSyncResult] = useState<RuthvaSyncResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Only CSV files are supported.");
        return;
      }
      setFile(selectedFile);
      setError("");
      setIsLoading(true);
      try {
        const result = await dataPortabilityApi.previewPatientImport(
          selectedFile,
        );
        if (result.error) {
          setError(result.error);
          setIsLoading(false);
          return;
        }
        setPreview(result);
        setStep("preview");
      } catch {
        setError("Failed to preview file. Please check the format and try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect],
  );

  const handleConfirm = useCallback(async () => {
    if (!file) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await dataPortabilityApi.confirmPatientImport(file);
      setResults(result);
      if (result.ruthva_sync) {
        setSyncResult(result.ruthva_sync);
      }
      setStep("results");
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  const handleRetrySync = useCallback(async () => {
    if (!syncResult?.failed_patient_ids.length) return;
    setRetryingSync(true);
    try {
      const result = await dataPortabilityApi.retryRuthvaSync(
        syncResult.failed_patient_ids,
      );
      setSyncResult({
        synced: (syncResult.synced || 0) + result.data.synced,
        failed: result.data.failed,
        failed_patient_ids: result.data.failed_patient_ids,
      });
    } catch {
      // Keep existing sync result
    } finally {
      setRetryingSync(false);
    }
  }, [syncResult]);

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setResults(null);
    setError("");
    setSyncResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/patients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Patients</h1>
          <p className="text-sm text-gray-500">
            Upload a CSV file to bulk-import your existing patients
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2">
        {(["upload", "preview", "results"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-gray-200" />}
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? "bg-emerald-600 text-white"
                  : (["upload", "preview", "results"].indexOf(step) >
                      ["upload", "preview", "results"].indexOf(s))
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${step === s ? "font-medium text-gray-900" : "text-gray-500"}`}
            >
              {s === "upload" ? "Upload" : s === "preview" ? "Preview" : "Results"}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-16 transition-colors hover:border-emerald-400 hover:bg-emerald-50/30"
          >
            {isLoading ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Upload className="mb-3 h-10 w-10 text-gray-400" />
                <p className="mb-1 text-sm font-medium text-gray-700">
                  Drag & drop your CSV file here
                </p>
                <p className="mb-4 text-xs text-gray-500">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Choose File
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Need a template?
              </p>
              <p className="text-xs text-gray-500">
                Download a sample CSV with all supported columns
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Template
            </Button>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              Supported columns
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
              <div>
                <span className="font-medium text-gray-700">Required:</span>{" "}
                name, age, gender, phone
              </div>
              <div>
                <span className="font-medium text-emerald-600">New:</span>{" "}
                diagnosis, last_seen_date, next_review_date
              </div>
              <div className="col-span-2">
                <span className="font-medium text-gray-700">Optional:</span>{" "}
                email, date_of_birth, blood_group, address, whatsapp_number,
                occupation, allergies, food_habits
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && preview && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {preview.total_rows}
              </p>
              <p className="text-xs text-gray-500">Total rows</p>
            </div>
            <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">
                {(preview.total_rows || 0) - (preview.error_count || 0)}
              </p>
              <p className="text-xs text-emerald-600">Will import</p>
            </div>
            {(preview.error_count || 0) > 0 && (
              <div className="flex-1 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                <p className="text-2xl font-bold text-red-700">
                  {preview.error_count}
                </p>
                <p className="text-xs text-red-600">Errors</p>
              </div>
            )}
            {(preview.warning_count || 0) > 0 && (
              <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">
                  {preview.warning_count}
                </p>
                <p className="text-xs text-amber-600">Warnings</p>
              </div>
            )}
          </div>

          {/* Error rows */}
          {preview.errors && preview.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-red-700">
                <XCircle className="h-4 w-4" />
                Rows with errors (will be skipped)
              </h3>
              <div className="space-y-1">
                {preview.errors.map((row: ImportPreviewRow) => (
                  <div
                    key={row.line}
                    className="text-xs text-red-600"
                  >
                    <span className="font-medium">Row {row.line}:</span>{" "}
                    {row.errors.join(", ")}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning rows */}
          {preview.warnings && preview.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Rows with warnings (will still import)
              </h3>
              <div className="space-y-1">
                {preview.warnings.map((row: ImportPreviewRow) => (
                  <div
                    key={row.line}
                    className="text-xs text-amber-600"
                  >
                    <span className="font-medium">Row {row.line}:</span>{" "}
                    {(row.warnings as string[] | undefined)?.join(", ")}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview table */}
          {preview.preview && preview.preview.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <h3 className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                Preview (first {preview.preview.length} rows)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 font-medium text-gray-600">
                        Row
                      </th>
                      <th className="px-3 py-2 font-medium text-gray-600">
                        Name
                      </th>
                      <th className="px-3 py-2 font-medium text-gray-600">
                        Phone
                      </th>
                      <th className="px-3 py-2 font-medium text-gray-600">
                        Age/Gender
                      </th>
                      <th className="px-3 py-2 font-medium text-gray-600">
                        Diagnosis
                      </th>
                      <th className="px-3 py-2 font-medium text-gray-600">
                        Last Seen
                      </th>
                      <th className="px-3 py-2 font-medium text-gray-600">
                        Next Review
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.preview.map((row: ImportPreviewRow) => {
                      const d = (row.data ?? row.raw ?? {}) as Record<string, unknown>;
                      const hasError = row.errors.length > 0;
                      return (
                        <tr
                          key={row.line}
                          className={hasError ? "bg-red-50" : ""}
                        >
                          <td className="px-3 py-2 text-gray-400">
                            {row.line}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {String(d.name || d._name || "")}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {String(d.phone || d._phone || "")}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {String(d.age || "")}/{String(d.gender || "").charAt(0).toUpperCase()}
                          </td>
                          <td className="max-w-[200px] truncate px-3 py-2 text-gray-600">
                            {String(d._diagnosis || d.diagnosis || "—")}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {String(d._last_seen_date || d.last_seen_date || "—")}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {String(d._next_review_date || d.next_review_date || "—")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="secondary" onClick={reset}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              isLoading={isLoading}
              disabled={!preview.valid}
            >
              {preview.valid
                ? `Import ${(preview.total_rows || 0) - (preview.error_count || 0)} Patients`
                : "Fix Errors to Continue"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === "results" && results && (
        <div className="space-y-4">
          {/* Success banner */}
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-800">
                Import complete
              </p>
              <p className="text-sm text-emerald-600">
                {results.created} patient{results.created !== 1 ? "s" : ""} created
                {results.consultation_created_count
                  ? `, ${results.consultation_created_count} baseline consultation${results.consultation_created_count !== 1 ? "s" : ""} added`
                  : ""}
                {results.skipped > 0
                  ? `, ${results.skipped} skipped (duplicates)`
                  : ""}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-emerald-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">
                {results.created}
              </p>
              <p className="text-xs text-gray-500">Patients Created</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-gray-700">
                {results.consultation_created_count || 0}
              </p>
              <p className="text-xs text-gray-500">Consultations Added</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-gray-400">
                {results.skipped}
              </p>
              <p className="text-xs text-gray-500">Skipped (Duplicates)</p>
            </div>
          </div>

          {/* Ruthva sync status */}
          {syncResult && (syncResult.synced > 0 || syncResult.failed > 0) && (
            <div
              className={`rounded-lg border p-4 ${
                syncResult.failed > 0
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <h3 className="mb-1 text-sm font-medium text-gray-700">
                Ruthva Adherence Sync
              </h3>
              <p className="text-sm text-gray-600">
                {syncResult.synced} patient{syncResult.synced !== 1 ? "s" : ""}{" "}
                synced for adherence tracking
                {syncResult.failed > 0 && (
                  <span className="text-amber-700">
                    , {syncResult.failed} failed
                  </span>
                )}
              </p>
              {syncResult.failed > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={handleRetrySync}
                  isLoading={retryingSync}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry Failed ({syncResult.failed})
                </Button>
              )}
            </div>
          )}

          {/* Warnings */}
          {results.warnings && results.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-medium text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Warnings
              </h3>
              <ul className="space-y-0.5 text-xs text-amber-600">
                {results.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="secondary" onClick={reset}>
              Import More
            </Button>
            <Link href="/patients">
              <Button>View Patients</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

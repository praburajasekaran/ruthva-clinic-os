"use client";

import { useState } from "react";
import { CheckCircle, Building2, User, ImageIcon, FileUp, Download, Database } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ImportPreviewTable } from "@/components/data-portability/ImportPreviewTable";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import api, { dataPortabilityApi } from "@/lib/api";
import type {
  ApiError,
  User as UserType,
  ClinicInfo,
  ImportConfirmResult,
  ImportPreviewResult,
} from "@/lib/types";

function extractError(err: unknown, field: string): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const data = (err as { response?: { data?: ApiError } }).response?.data;
  if (!data) return undefined;
  const val = data[field];
  if (Array.isArray(val)) return val[0];
  if (typeof val === "string") return val;
  return undefined;
}

function extractDetail(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const data = (err as { response?: { data?: ApiError } }).response?.data;
  return typeof data?.detail === "string" ? data.detail : undefined;
}

// ── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({ user, onSaved }: { user: UserType; onSaved: (u: UserType) => void }) {
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      setErrors({ confirm_password: "Passwords do not match." });
      return;
    }

    const payload: Record<string, string> = { first_name: firstName, last_name: lastName, email };
    if (newPassword) {
      payload.current_password = currentPassword;
      payload.new_password = newPassword;
    }

    setIsLoading(true);
    try {
      const res = await api.patch<UserType & { clinic: ClinicInfo | null }>("/auth/me/update/", payload);
      onSaved(res.data);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const fieldErrors: Record<string, string> = {};
      for (const field of ["first_name", "last_name", "email", "current_password", "new_password"]) {
        const msg = extractError(err, field);
        if (msg) fieldErrors[field] = msg;
      }
      const detail = extractDetail(err);
      if (detail) fieldErrors._general = detail;
      if (Object.keys(fieldErrors).length === 0) fieldErrors._general = "Something went wrong.";
      setErrors(fieldErrors);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Personal Information">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="First name" required error={errors.first_name}>
              {(props) => (
                <Input
                  {...props}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  hasError={!!errors.first_name}
                />
              )}
            </FormField>
            <FormField label="Last name" error={errors.last_name}>
              {(props) => (
                <Input
                  {...props}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  hasError={!!errors.last_name}
                />
              )}
            </FormField>
          </div>
          <FormField label="Email" required error={errors.email}>
            {(props) => (
              <Input
                {...props}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                hasError={!!errors.email}
              />
            )}
          </FormField>
          <FormField label="Username" hint="Username cannot be changed.">
            {(props) => (
              <Input {...props} value={user.username} disabled />
            )}
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Change Password" defaultOpen={false}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Leave blank to keep your current password.</p>
          <FormField label="Current password" error={errors.current_password}>
            {(props) => (
              <Input
                {...props}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                hasError={!!errors.current_password}
              />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="New password" error={errors.new_password}>
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  hasError={!!errors.new_password}
                />
              )}
            </FormField>
            <FormField label="Confirm new password" error={errors.confirm_password}>
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  hasError={!!errors.confirm_password}
                />
              )}
            </FormField>
          </div>
        </div>
      </FormSection>

      {errors._general && (
        <p className="text-sm text-red-600">{errors._general}</p>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" isLoading={isLoading}>
          Save profile
        </Button>
        {success && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}

// ── Clinic section ────────────────────────────────────────────────────────────

function ClinicSection({ clinic, onSaved }: { clinic: ClinicInfo; onSaved: () => void }) {
  const [name, setName] = useState(clinic.name);
  const [address, setAddress] = useState(clinic.address);
  const [phone, setPhone] = useState(clinic.phone);
  const [email, setEmail] = useState(clinic.email);
  const [tagline, setTagline] = useState(clinic.tagline);
  const [paperSize, setPaperSize] = useState(clinic.paper_size);
  const [logoUrl, setLogoUrl] = useState(clinic.logo_url);
  const [primaryColor, setPrimaryColor] = useState(clinic.primary_color || "#2c5f2d");

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoError, setLogoError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);
    setIsLoading(true);

    try {
      await api.patch("/auth/clinic/update/", {
        name,
        address,
        phone,
        email,
        tagline,
        paper_size: paperSize,
        logo_url: logoUrl,
        primary_color: primaryColor,
      });
      setSuccess(true);
      onSaved();
    } catch (err) {
      const fieldErrors: Record<string, string> = {};
      for (const field of ["name", "address", "phone", "email", "tagline", "paper_size", "logo_url", "primary_color"]) {
        const msg = extractError(err, field);
        if (msg) fieldErrors[field] = msg;
      }
      const detail = extractDetail(err);
      if (detail) fieldErrors._general = detail;
      if (Object.keys(fieldErrors).length === 0) fieldErrors._general = "Something went wrong.";
      setErrors(fieldErrors);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Clinic Details">
        <div className="space-y-4">
          <FormField label="Clinic name" required error={errors.name}>
            {(props) => (
              <Input
                {...props}
                value={name}
                onChange={(e) => setName(e.target.value)}
                hasError={!!errors.name}
              />
            )}
          </FormField>
          <FormField label="Tagline" error={errors.tagline}>
            {(props) => (
              <Input
                {...props}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Healing with nature"
                hasError={!!errors.tagline}
              />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Phone" error={errors.phone}>
              {(props) => (
                <Input
                  {...props}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  hasError={!!errors.phone}
                />
              )}
            </FormField>
            <FormField label="Email" error={errors.email}>
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  hasError={!!errors.email}
                />
              )}
            </FormField>
          </div>
          <FormField label="Address" error={errors.address}>
            {(props) => (
              <textarea
                id={props.id}
                aria-describedby={props["aria-describedby"]}
                aria-invalid={props["aria-invalid"]}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className={`w-full rounded-lg border px-3 py-2.5 text-base placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 ${
                  errors.address
                    ? "border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500"
                    : "border-gray-300 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"
                }`}
              />
            )}
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Branding">
        <div className="space-y-4">
          <FormField label="Logo URL" hint="Paste a URL to your clinic logo (PNG or JPEG)." error={errors.logo_url}>
            {(props) => (
              <Input
                {...props}
                type="url"
                value={logoUrl}
                onChange={(e) => {
                  setLogoUrl(e.target.value);
                  setLogoError(false);
                }}
                placeholder="https://example.com/logo.png"
                hasError={!!errors.logo_url}
              />
            )}
          </FormField>
          {logoUrl && (
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                {logoError ? (
                  <ImageIcon className="h-6 w-6 text-gray-300" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="max-h-14 max-w-14 object-contain"
                    onError={() => setLogoError(true)}
                    onLoad={() => setLogoError(false)}
                  />
                )}
              </div>
              <p className="text-xs text-gray-500">
                {logoError ? "Could not load image from this URL." : "Logo preview"}
              </p>
            </div>
          )}

          <FormField label="Primary color" hint="Used in prescription PDFs and branding." error={errors.primary_color}>
            {(props) => (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id={props.id}
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-gray-300"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="max-w-[120px] font-mono text-sm"
                  hasError={!!errors.primary_color}
                />
              </div>
            )}
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Prescription Settings">
        <div className="space-y-4">
          <FormField label="Paper size" hint="Used for prescription printouts.">
            {(props) => (
              <Select
                {...props}
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="max-w-[160px]"
              >
                <option value="A4">A4</option>
                <option value="A5">A5</option>
              </Select>
            )}
          </FormField>
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">Discipline</p>
            <p className="text-sm text-gray-500 capitalize">{clinic.discipline.replace("_", " ")}</p>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">Subdomain</p>
            <p className="text-sm text-gray-500">{clinic.subdomain}</p>
          </div>
        </div>
      </FormSection>

      {errors._general && (
        <p className="text-sm text-red-600">{errors._general}</p>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" isLoading={isLoading}>
          Save clinic settings
        </Button>
        {success && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}

function DataPortabilitySection() {
  const [consultationFile, setConsultationFile] = useState<File | null>(null);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [consultationPreview, setConsultationPreview] = useState<ImportPreviewResult | null>(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState<ImportPreviewResult | null>(null);
  const [consultationResult, setConsultationResult] = useState<ImportConfirmResult | null>(null);
  const [prescriptionResult, setPrescriptionResult] = useState<ImportConfirmResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleConsultationPreview = async () => {
    if (!consultationFile) return;
    setErrorMessage(null);
    setIsBusy(true);
    try {
      const result = await dataPortabilityApi.previewConsultationsImport(
        consultationFile,
        skipDuplicates,
      );
      setConsultationPreview(result);
    } catch (err) {
      setErrorMessage(extractDetail(err) || "Failed to preview consultation import.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleConsultationConfirm = async () => {
    if (!consultationFile) return;
    setErrorMessage(null);
    setIsBusy(true);
    try {
      const result = await dataPortabilityApi.confirmConsultationsImport(
        consultationFile,
        skipDuplicates,
      );
      setConsultationResult(result);
    } catch (err) {
      const data = (err as { response?: { data?: ImportConfirmResult } }).response?.data;
      if (data) setConsultationResult(data);
      setErrorMessage(extractDetail(err) || "Consultation import failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrescriptionPreview = async () => {
    if (!prescriptionFile) return;
    setErrorMessage(null);
    setIsBusy(true);
    try {
      const result = await dataPortabilityApi.previewPrescriptionsImport(
        prescriptionFile,
        skipDuplicates,
      );
      setPrescriptionPreview(result);
    } catch (err) {
      setErrorMessage(extractDetail(err) || "Failed to preview prescription import.");
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrescriptionConfirm = async () => {
    if (!prescriptionFile) return;
    setErrorMessage(null);
    setIsBusy(true);
    try {
      const result = await dataPortabilityApi.confirmPrescriptionsImport(
        prescriptionFile,
        skipDuplicates,
      );
      setPrescriptionResult(result);
    } catch (err) {
      const data = (err as { response?: { data?: ImportConfirmResult } }).response?.data;
      if (data) setPrescriptionResult(data);
      setErrorMessage(extractDetail(err) || "Prescription import failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleExport = async (
    exporter: () => Promise<Blob>,
    filename: string,
  ) => {
    setErrorMessage(null);
    setIsBusy(true);
    try {
      const blob = await exporter();
      triggerDownload(blob, filename);
    } catch (err) {
      setErrorMessage(extractDetail(err) || "Export failed.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <FormSection title="Import CSV Data">
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
            />
            Skip duplicates during confirm
          </label>

          <div className="rounded-lg border border-gray-200 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">Consultations Import</p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setConsultationFile(e.target.files?.[0] || null)}
              className="mb-3 block w-full text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleConsultationPreview} disabled={!consultationFile || isBusy}>
                <FileUp className="mr-1 h-4 w-4" />
                Preview
              </Button>
              <Button type="button" onClick={handleConsultationConfirm} disabled={!consultationFile || isBusy}>
                Confirm Import
              </Button>
            </div>
            {consultationPreview && (
              <p className="mt-3 text-sm text-gray-700">
                Total: {consultationPreview.total_rows ?? 0}, Errors: {consultationPreview.error_count ?? 0}
              </p>
            )}
            {consultationResult && (
              <p className="mt-2 text-sm text-emerald-700">
                Created: {consultationResult.created}, Skipped: {consultationResult.skipped}
              </p>
            )}
            <div className="mt-3 space-y-3">
              <ImportPreviewTable
                title="Consultation Preview Rows"
                rows={consultationPreview?.preview || []}
              />
              <ImportPreviewTable
                title="Consultation Import Errors"
                rows={consultationResult?.errors || consultationPreview?.errors || []}
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">Prescriptions Import</p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setPrescriptionFile(e.target.files?.[0] || null)}
              className="mb-3 block w-full text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handlePrescriptionPreview} disabled={!prescriptionFile || isBusy}>
                <FileUp className="mr-1 h-4 w-4" />
                Preview
              </Button>
              <Button type="button" onClick={handlePrescriptionConfirm} disabled={!prescriptionFile || isBusy}>
                Confirm Import
              </Button>
            </div>
            {prescriptionPreview && (
              <p className="mt-3 text-sm text-gray-700">
                Total: {prescriptionPreview.total_rows ?? 0}, Errors: {prescriptionPreview.error_count ?? 0}
              </p>
            )}
            {prescriptionResult && (
              <p className="mt-2 text-sm text-emerald-700">
                Created: {prescriptionResult.created}, Skipped: {prescriptionResult.skipped}
              </p>
            )}
            <div className="mt-3 space-y-3">
              <ImportPreviewTable
                title="Prescription Preview Rows"
                rows={prescriptionPreview?.preview || []}
              />
              <ImportPreviewTable
                title="Prescription Import Errors"
                rows={prescriptionResult?.errors || prescriptionPreview?.errors || []}
              />
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Export Clinic Data">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={() => handleExport(dataPortabilityApi.exportPatients, "patients.csv")} disabled={isBusy}>
            <Download className="mr-1 h-4 w-4" />
            Export Patients CSV
          </Button>
          <Button type="button" onClick={() => handleExport(dataPortabilityApi.exportConsultations, "consultations.csv")} disabled={isBusy}>
            <Download className="mr-1 h-4 w-4" />
            Export Consultations CSV
          </Button>
          <Button type="button" onClick={() => handleExport(dataPortabilityApi.exportPrescriptions, "prescriptions.csv")} disabled={isBusy}>
            <Download className="mr-1 h-4 w-4" />
            Export Prescriptions CSV
          </Button>
          <Button type="button" onClick={() => handleExport(dataPortabilityApi.exportAll, "clinic-export.zip")} disabled={isBusy}>
            <Database className="mr-1 h-4 w-4" />
            Export All (ZIP)
          </Button>
        </div>
      </FormSection>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "profile" | "clinic" | "portability";

export default function SettingsPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [localUser, setLocalUser] = useState<UserType | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  if (!user) return null;

  const displayUser = localUser ?? user;

  const tabs: { id: Tab; label: string; icon: React.ElementType; show: boolean }[] = [
    { id: "profile", label: "Profile", icon: User, show: true },
    { id: "clinic", label: "Clinic", icon: Building2, show: !!user.is_clinic_owner },
    { id: "portability", label: "Data Portability", icon: Database, show: !!user.is_clinic_owner },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-600">Manage your account and clinic preferences.</p>
      </div>

      {/* Tab nav */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {tabs.filter((t) => t.show).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <ProfileSection user={displayUser} onSaved={setLocalUser} />
      )}
      {activeTab === "clinic" && user.is_clinic_owner && user.clinic && (
        <ClinicSection clinic={user.clinic} onSaved={refreshUser} />
      )}
      {activeTab === "portability" && user.is_clinic_owner && (
        <DataPortabilitySection />
      )}
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { CheckCircle, Building2, BarChart3, User, Download, Upload, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { UsageDashboard } from "@/components/pharmacy/UsageDashboard";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import api, { dataPortabilityApi, uploadClinicLogo, deleteClinicLogo } from "@/lib/api";
import type {
  ApiError,
  User as UserType,
  ClinicInfo,
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
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    const payload: Record<string, string> = { first_name: firstName, last_name: lastName, email };

    setIsLoading(true);
    try {
      const res = await api.patch<UserType & { clinic: ClinicInfo | null }>("/auth/me/update/", payload);
      onSaved(res.data);
      setSuccess(true);
    } catch (err) {
      const fieldErrors: Record<string, string> = {};
      for (const field of ["first_name", "last_name", "email"]) {
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
        </div>
      </FormSection>

      {errors._general && (
        <p className="text-sm text-red-600">{errors._general}</p>
      )}

      {/* Pre-rendered for screen reader announcement — content changes trigger polite announcement */}
      <div role="status" aria-live="polite" className="sr-only" aria-atomic="true">
        {success ? 'Changes saved successfully.' : ''}
      </div>

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
  const [letterheadMode, setLetterheadMode] = useState(clinic.letterhead_mode || "digital");

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoError, setLogoError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, logo_url: "File must be under 2 MB." }));
      return;
    }
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setErrors((prev) => ({ ...prev, logo_url: "Only PNG and JPEG files are allowed." }));
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next.logo_url;
      return next;
    });
    setIsUploading(true);
    try {
      const { logo_url } = await uploadClinicLogo(file);
      setLogoUrl(logo_url);
      setLogoError(false);
      onSaved();
    } catch {
      setErrors((prev) => ({ ...prev, logo_url: "Upload failed. Please try again." }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setIsUploading(true);
    try {
      await deleteClinicLogo();
      setLogoUrl("");
      setLogoError(false);
      onSaved();
    } catch {
      setErrors((prev) => ({ ...prev, logo_url: "Failed to remove logo." }));
    } finally {
      setIsUploading(false);
    }
  };

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
        letterhead_mode: letterheadMode,
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
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">Clinic logo</p>
            <p className="mb-2 text-xs text-gray-500">Upload your clinic logo (PNG or JPEG, max 2 MB)</p>
            {errors.logo_url && (
              <p className="mb-2 text-sm text-red-600">{errors.logo_url}</p>
            )}

            {logoUrl && !logoError ? (
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="max-h-14 max-w-14 object-contain"
                    onError={() => setLogoError(true)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Remove
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleLogoFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
                  isDragging
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                }`}
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-emerald-700">Click to upload</span> or drag and drop
                    </p>
                    <p className="mt-1 text-xs text-gray-400">PNG or JPEG, max 2 MB</p>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoFile(file);
                e.target.value = "";
              }}
            />
          </div>

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
          <FormField label="Prescription letterhead" hint="Controls whether your logo and clinic details appear on printed prescriptions.">
            {(props) => (
              <Select
                {...props}
                value={letterheadMode}
                onChange={(e) => setLetterheadMode(e.target.value as "digital" | "preprinted")}
                className="max-w-[320px]"
              >
                <option value="digital">Digital — logo + clinic details printed</option>
                <option value="preprinted">Pre-printed — blank header for stationery</option>
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

      {/* Pre-rendered for screen reader announcement — content changes trigger polite announcement */}
      <div role="status" aria-live="polite" className="sr-only" aria-atomic="true">
        {success ? 'Changes saved successfully.' : ''}
      </div>

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

function ExportSection() {
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
      <FormSection title="Export Data">
        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-3">Download your clinic data as CSV files.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => handleExport(dataPortabilityApi.exportPatients, "patients.csv")} disabled={isBusy}>
              <Download className="h-3.5 w-3.5" />
              Patients
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => handleExport(dataPortabilityApi.exportConsultations, "consultations.csv")} disabled={isBusy}>
              <Download className="h-3.5 w-3.5" />
              Consultations
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => handleExport(dataPortabilityApi.exportPrescriptions, "prescriptions.csv")} disabled={isBusy}>
              <Download className="h-3.5 w-3.5" />
              Prescriptions
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => handleExport(dataPortabilityApi.exportAll, "clinic-export.zip")} disabled={isBusy}>
              <Download className="h-3.5 w-3.5" />
              Everything (ZIP)
            </Button>
          </div>
        </div>
      </FormSection>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "profile" | "clinic" | "usage" | "export";

export default function SettingsPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [localUser, setLocalUser] = useState<UserType | null>(null);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement>>>({});

  function handleTabKeyDown(e: React.KeyboardEvent, currentTab: Tab) {
    const visibleTabs = (Object.keys(tabRefs.current) as Tab[]).filter(
      (t) => !!tabRefs.current[t]
    );
    if (!visibleTabs.length) return;
    const idx = visibleTabs.indexOf(currentTab);
    let nextTab: Tab | undefined;
    if (e.key === 'ArrowRight') nextTab = visibleTabs[(idx + 1) % visibleTabs.length];
    else if (e.key === 'ArrowLeft') nextTab = visibleTabs[(idx - 1 + visibleTabs.length) % visibleTabs.length];
    else if (e.key === 'Home') nextTab = visibleTabs[0];
    else if (e.key === 'End') nextTab = visibleTabs[visibleTabs.length - 1];
    if (!nextTab) return;
    e.preventDefault();
    setActiveTab(nextTab);
    // Tab buttons are always in the DOM — safe to focus immediately
    tabRefs.current[nextTab]?.focus();
  }

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
    { id: "usage", label: "Usage", icon: BarChart3, show: !!user.is_clinic_owner },
    { id: "export", label: "Export", icon: Download, show: !!user.is_clinic_owner },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-600">Manage your account and clinic preferences.</p>
      </div>

      {/* Tab nav */}
      <div role="tablist" aria-label="Settings sections" className="mb-6 flex gap-1 border-b border-gray-200">
        {tabs.filter((t) => t.show).map((tab) => (
          <button
            key={tab.id}
            ref={(el) => { if (el) tabRefs.current[tab.id] = el; }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <tab.icon aria-hidden="true" className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="tabpanel-profile"
        aria-labelledby="tab-profile"
        tabIndex={0}
        hidden={activeTab !== "profile"}
      >
        <ProfileSection user={displayUser} onSaved={setLocalUser} />
      </div>

      {user.is_clinic_owner && user.clinic && (
        <div
          role="tabpanel"
          id="tabpanel-clinic"
          aria-labelledby="tab-clinic"
          tabIndex={0}
          hidden={activeTab !== "clinic"}
        >
          <ClinicSection clinic={user.clinic} onSaved={refreshUser} />
        </div>
      )}

      {user.is_clinic_owner && (
        <div
          role="tabpanel"
          id="tabpanel-usage"
          aria-labelledby="tab-usage"
          tabIndex={0}
          hidden={activeTab !== "usage"}
        >
          {activeTab === "usage" && <UsageDashboard />}
        </div>
      )}

      {user.is_clinic_owner && (
        <div
          role="tabpanel"
          id="tabpanel-export"
          aria-labelledby="tab-export"
          tabIndex={0}
          hidden={activeTab !== "export"}
        >
          <ExportSection />
        </div>
      )}
    </div>
  );
}

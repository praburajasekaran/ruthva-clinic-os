"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Discipline } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, completeOnboarding } = useAuth();

  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [country, setCountry] = useState("India");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Redirect unauthenticated users to login
  if (!isLoading && !isAuthenticated) {
    router.push("/login");
    return null;
  }

  // Redirect already-onboarded users to dashboard
  if (!isLoading && user?.onboarding_complete) {
    router.push("/dashboard");
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-600" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    // Get discipline from session storage (set during signup OTP verification)
    const discipline =
      (sessionStorage.getItem("signup_discipline") as Discipline) || "siddha";

    try {
      await completeOnboarding({
        clinic_name: clinicName.trim(),
        phone: phone.trim(),
        address: [addressLine1, addressLine2, city, state, pinCode, country]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(", "),
        registration_number: registrationNumber.trim(),
        discipline,
      });
      sessionStorage.removeItem("signup_discipline");
      // completeOnboarding redirects to /dashboard
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data;
        if (typeof data === "object" && data !== null) {
          const fErrors: Record<string, string> = {};
          let hasFieldErrors = false;
          for (const [k, v] of Object.entries(data)) {
            if (k === "detail") continue;
            fErrors[k] = Array.isArray(v) ? v.join(", ") : String(v);
            hasFieldErrors = true;
          }
          if (hasFieldErrors) {
            setFieldErrors(fErrors);
          } else if (data.detail) {
            setError(String(data.detail));
          }
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const formValid =
    clinicName.trim() && addressLine1.trim() && city.trim() && pinCode.trim() && registrationNumber.trim();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/ruthva-logo.png"
            alt="Ruthva"
            width={120}
            height={40}
            className="mx-auto mb-6 h-10 w-auto"
          />
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <Building2 className="h-6 w-6 text-emerald-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Set up your clinic
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome, Dr. {user?.first_name}! Let&apos;s set up your clinic
            details.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="clinic_name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Clinic Name <span className="text-red-500">*</span>
            </label>
            <input
              id="clinic_name"
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Sivanethram Siddha Clinic"
              className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                fieldErrors.clinic_name
                  ? "border-red-400 focus-visible:ring-red-500"
                  : "border-gray-300 focus-visible:ring-emerald-500"
              }`}
            />
            {fieldErrors.clinic_name && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.clinic_name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="mb-1 block text-sm font-medium text-gray-700">
              Clinic Address <span className="text-red-500">*</span>
            </legend>
            <input
              id="address_line1"
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              required
              placeholder="Address line 1"
              className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                fieldErrors.address
                  ? "border-red-400 focus-visible:ring-red-500"
                  : "border-gray-300 focus-visible:ring-emerald-500"
              }`}
            />
            <input
              id="address_line2"
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Address line 2 (optional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
            />
            <div className="flex gap-2">
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                placeholder="City"
                className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  fieldErrors.address
                    ? "border-red-400 focus-visible:ring-red-500"
                    : "border-gray-300 focus-visible:ring-emerald-500"
                }`}
              />
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              <input
                id="pin_code"
                type="text"
                inputMode="numeric"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                placeholder="PIN code"
                className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  fieldErrors.address
                    ? "border-red-400 focus-visible:ring-red-500"
                    : "border-gray-300 focus-visible:ring-emerald-500"
                }`}
              />
              <input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
              />
            </div>
            {fieldErrors.address && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>
            )}
          </fieldset>

          <div>
            <label
              htmlFor="registration_number"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Doctor Registration Number <span className="text-red-500">*</span>
            </label>
            <input
              id="registration_number"
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              required
              placeholder="e.g. TNMC/2015/12345"
              className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                fieldErrors.registration_number
                  ? "border-red-400 focus-visible:ring-red-500"
                  : "border-gray-300 focus-visible:ring-emerald-500"
              }`}
            />
            {fieldErrors.registration_number && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.registration_number}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !formValid}
            className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Setting up..." : "Complete setup"}
          </button>
        </form>
      </div>
    </main>
  );
}

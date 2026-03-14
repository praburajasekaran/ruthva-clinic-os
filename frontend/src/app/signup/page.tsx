"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Leaf, Loader2, CircleCheck, CircleX } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { SignupRequest } from "@/lib/types";

const DISCIPLINES = [
  { value: "siddha", label: "Siddha" },
  { value: "ayurveda", label: "Ayurveda" },
  { value: "yoga_naturopathy", label: "Yoga & Naturopathy" },
  { value: "unani", label: "Unani" },
  { value: "homeopathy", label: "Homeopathy" },
];

const AVAILABILITY_FIELDS = ["username", "email", "subdomain"] as const;
type AvailabilityField = (typeof AVAILABILITY_FIELDS)[number];
type AvailabilityStatus = "idle" | "checking" | "available" | "taken";

export default function SignupPage() {
  const { signup } = useAuth();
  const [form, setForm] = useState<SignupRequest>({
    clinic_name: "",
    subdomain: "",
    discipline: "siddha",
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<
    Record<AvailabilityField, AvailabilityStatus>
  >({
    username: "idle",
    email: "idle",
    subdomain: "idle",
  });
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const checkAvailability = useCallback(
    async (field: AvailabilityField, value: string) => {
      if (!value.trim()) {
        setAvailability((prev) => ({ ...prev, [field]: "idle" }));
        return;
      }
      setAvailability((prev) => ({ ...prev, [field]: "checking" }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/check-availability/`,
          { field, value: value.trim() },
        );
        setAvailability((prev) => ({
          ...prev,
          [field]: data.available ? "available" : "taken",
        }));
        if (!data.available) {
          const messages: Record<AvailabilityField, string> = {
            username: "This username is already taken.",
            email: "This email is already registered.",
            subdomain: "This subdomain is already taken.",
          };
          setErrors((prev) => ({ ...prev, [field]: messages[field] }));
        }
      } catch {
        setAvailability((prev) => ({ ...prev, [field]: "idle" }));
      }
    },
    [],
  );

  function debouncedCheck(field: AvailabilityField, value: string) {
    if (debounceTimers.current[field]) {
      clearTimeout(debounceTimers.current[field]);
    }
    debounceTimers.current[field] = setTimeout(() => {
      checkAvailability(field, value);
    }, 500);
  }

  function update(field: keyof SignupRequest, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value } as SignupRequest;
      // Auto-generate subdomain from clinic name
      if (field === "clinic_name") {
        next.subdomain = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 63);
        debouncedCheck("subdomain", next.subdomain);
      }
      return next;
    });
    // Clear error and trigger availability check on typing
    if (AVAILABILITY_FIELDS.includes(field as AvailabilityField)) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      debouncedCheck(field as AvailabilityField, value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      await signup(form);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data;
        if (typeof data === "object" && data !== null && !Array.isArray(data)) {
          const fieldErrors: Record<string, string> = {};
          for (const [k, v] of Object.entries(data)) {
            fieldErrors[k] = Array.isArray(v) ? v.join(", ") : String(v);
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ _general: "Something went wrong. Please try again." });
        }
      } else {
        setErrors({ _general: "Something went wrong. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  function AvailabilityIndicator({ field }: { field: AvailabilityField }) {
    const s = availability[field];
    if (s === "idle") return null;
    if (s === "checking")
      return <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin text-gray-400" />;
    if (s === "available")
      return <CircleCheck className="h-4 w-4 text-emerald-500" />;
    return <CircleX className="h-4 w-4 text-red-500" />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <Leaf className="h-6 w-6 text-emerald-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Register your clinic
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Get started with AYUSH Clinic Platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors._general && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {errors._general}
            </div>
          )}

          <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
            <legend className="px-2 text-sm font-medium text-gray-700">
              Clinic Details
            </legend>

            <div>
              <label
                htmlFor="clinic_name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Clinic Name
              </label>
              <input
                id="clinic_name"
                type="text"
                value={form.clinic_name}
                onChange={(e) => update("clinic_name", e.target.value)}
                required
                autoFocus
                placeholder="e.g. Sivanethram Siddha Clinic"
                className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${errors.clinic_name ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500" : "border-gray-300 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"}`}
              />
              {errors.clinic_name && <p className="mt-1 text-xs text-red-600">{errors.clinic_name}</p>}
            </div>

            <div>
              <label
                htmlFor="subdomain"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Subdomain
              </label>
              <div className="flex items-center">
                <div className="relative w-full">
                  <input
                    id="subdomain"
                    type="text"
                    value={form.subdomain}
                    onChange={(e) => update("subdomain", e.target.value)}
                    required
                    pattern="[a-z0-9\-]+"
                    className={`w-full rounded-l-lg border px-3 py-2 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${errors.subdomain ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500" : availability.subdomain === "available" ? "border-emerald-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500" : "border-gray-300 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"}`}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                    <AvailabilityIndicator field="subdomain" />
                  </span>
                </div>
                <span className="rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  .ayushclinic.com
                </span>
              </div>
              {errors.subdomain && <p className="mt-1 text-xs text-red-600">{errors.subdomain}</p>}
            </div>

            <div>
              <label
                htmlFor="discipline"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Discipline
              </label>
              <select
                id="discipline"
                value={form.discipline}
                onChange={(e) => update("discipline", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
              >
                {DISCIPLINES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
            <legend className="px-2 text-sm font-medium text-gray-700">
              Your Account
            </legend>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="first_name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  First Name
                </label>
                <input
                  id="first_name"
                  type="text"
                  value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
                />
              </div>
              <div>
                <label
                  htmlFor="last_name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Last Name
                </label>
                <input
                  id="last_name"
                  type="text"
                  value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="username"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={form.username}
                  onChange={(e) => update("username", e.target.value)}
                  required
                  className={`w-full rounded-lg border px-3 py-2 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${errors.username ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500" : availability.username === "available" ? "border-emerald-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500" : "border-gray-300 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"}`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  <AvailabilityIndicator field="username" />
                </span>
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.username}{" "}
                  {availability.username === "taken" && (
                    <Link href="/login" className="font-medium text-emerald-700 hover:text-emerald-700 underline">
                      Sign in instead?
                    </Link>
                  )}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                  className={`w-full rounded-lg border px-3 py-2 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${errors.email ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500" : availability.email === "available" ? "border-emerald-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500" : "border-gray-300 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"}`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  <AvailabilityIndicator field="email" />
                </span>
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email}{" "}
                  {availability.email === "taken" && (
                    <Link href="/login" className="font-medium text-emerald-700 hover:text-emerald-700 underline">
                      Sign in instead?
                    </Link>
                  )}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                minLength={8}
                className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${errors.password ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500" : "border-gray-300 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"}`}
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Creating clinic..." : "Create clinic & account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-700 hover:text-emerald-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

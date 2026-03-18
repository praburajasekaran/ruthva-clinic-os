"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Leaf, Loader2, CircleX } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Discipline } from "@/lib/types";

const DISCIPLINES = [
  { value: "siddha", label: "Siddha" },
  { value: "ayurveda", label: "Ayurveda" },
  { value: "yoga_naturopathy", label: "Yoga & Naturopathy" },
  { value: "unani", label: "Unani" },
  { value: "homeopathy", label: "Homeopathy" },
];

type Step = "form" | "otp";

export default function SignupPage() {
  const router = useRouter();
  const { initiateSignup, verifySignupOTP } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [discipline, setDiscipline] = useState<Discipline>("siddha");
  const [code, setCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const checkEmailAvailability = useCallback(async (value: string) => {
    if (!value.trim()) {
      setEmailChecking(false);
      setEmailTaken(false);
      return;
    }
    setEmailChecking(true);
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/check-availability/`,
        { field: "email", value: value.trim().toLowerCase() },
      );
      setEmailTaken(!data.available);
      if (!data.available) {
        setFieldErrors((prev) => ({
          ...prev,
          email: "This email is already registered.",
        }));
      } else {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.email;
          return next;
        });
      }
    } catch {
      setEmailTaken(false);
    } finally {
      setEmailChecking(false);
    }
  }, []);

  function handleEmailChange(value: string) {
    setEmail(value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.email;
      return next;
    });
    setEmailTaken(false);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      checkEmailAvailability(value);
    }, 500);
  }

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, 6));
  }

  function extractError(err: unknown): string | null {
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data;
      if (typeof data === "object" && data !== null) {
        // Check for field-level errors
        const fErrors: Record<string, string> = {};
        let hasFieldErrors = false;
        for (const [k, v] of Object.entries(data)) {
          if (k === "detail") continue;
          fErrors[k] = Array.isArray(v) ? v.join(", ") : String(v);
          hasFieldErrors = true;
        }
        if (hasFieldErrors) {
          setFieldErrors(fErrors);
          return null;
        }
        if (data.detail) return String(data.detail);
      }
    }
    return null;
  }

  async function handleInitiateSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      await initiateSignup({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        discipline,
      });
      setStep("otp");
      setResendCooldown(60);
    } catch (err: unknown) {
      const msg = extractError(err);
      if (msg) setError(msg);
      else if (Object.keys(fieldErrors).length === 0) {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await verifySignupOTP({
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      // Store discipline for onboarding
      sessionStorage.setItem("signup_discipline", result.discipline);
      router.push("/onboarding");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : null;
      setError(msg || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    if (resendCooldown > 0) return;
    setError(null);
    try {
      await initiateSignup({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        discipline,
      });
      setResendCooldown(60);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : null;
      setError(msg || "Failed to resend code. Please try again.");
    }
  }

  const formValid =
    firstName.trim() && email.trim() && discipline && !emailTaken;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div aria-live="polite" className="sr-only" aria-atomic="true">
          {step === "otp"
            ? "A verification code has been sent to your email."
            : ""}
        </div>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <Leaf className="h-6 w-6 text-emerald-700" />
          </div>

          {step === "form" ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900">
                Register your clinic
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create your AYUSH clinic account
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">
                Check your email
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                We sent a code to <strong>{email}</strong>
              </p>
            </>
          )}
        </div>

        <div
          id="signup-error"
          role="alert"
          className={`mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700${!error ? " hidden" : ""}`}
        >
          {error?.slice(0, 200)}
        </div>

        {step === "form" ? (
          <form onSubmit={handleInitiateSignup} className="space-y-4">
            {/* Dr. prefix + name fields */}
            <div>
              <label
                htmlFor="first_name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Doctor&apos;s Name
              </label>
              <div className="flex gap-2">
                <span className="flex items-center rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600">
                  Dr.
                </span>
                <input
                  id="first_name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoFocus
                  placeholder="First name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                />
                <input
                  id="last_name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                />
              </div>
              {fieldErrors.first_name && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.first_name}
                </p>
              )}
            </div>

            {/* Email */}
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
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  placeholder="doctor@clinic.com"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={
                    fieldErrors.email ? "email-error" : undefined
                  }
                  className={`w-full rounded-lg border px-3 py-2 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    fieldErrors.email
                      ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500"
                      : "border-gray-300 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"
                  }`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  {emailChecking && (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 motion-safe:animate-spin text-gray-400"
                    />
                  )}
                  {!emailChecking && emailTaken && (
                    <CircleX className="h-4 w-4 text-red-500" />
                  )}
                </span>
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.email}{" "}
                  {emailTaken && (
                    <Link
                      href="/login"
                      className="font-medium text-emerald-700 underline hover:text-emerald-800"
                    >
                      Sign in instead?
                    </Link>
                  )}
                </p>
              )}
            </div>

            {/* Discipline */}
            <div>
              <label
                htmlFor="discipline"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Discipline
              </label>
              <select
                id="discipline"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as Discipline)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
              >
                {DISCIPLINES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !formValid}
              className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Sending code..." : "Create account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Verification code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                required
                autoFocus
                maxLength={6}
                placeholder="000000"
                aria-invalid={!!error}
                aria-describedby={error ? "signup-error" : undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] shadow-sm focus:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & continue"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("form");
                setCode("");
                setError(null);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <p className="text-center text-xs text-gray-400">
              Didn&apos;t receive the code? Check your spam folder or{" "}
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0}
                className="text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "resend"}
              </button>
            </p>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-700 hover:text-emerald-800"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

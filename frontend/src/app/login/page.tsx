"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

type Step = "email" | "otp";

export default function LoginPage() {
  const { requestOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Task 5: Cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleRequestOTP(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await requestOTP({ email: email.trim().toLowerCase() });
      setStep("otp");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : null;
      setError(msg || "Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await verifyOTP({ email: email.trim().toLowerCase(), code: code.trim() });
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

  // Task 5: Dedicated resend handler — calls requestOTP without needing a form event
  async function handleResendOTP() {
    if (resendCooldown > 0) return;
    setError(null);
    try {
      await requestOTP({ email: email.trim().toLowerCase() });
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

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, 6));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Task 4: Always-rendered live region for step transition announcements */}
        <div aria-live="polite" className="sr-only" aria-atomic="true">
          {step === "otp" ? "A verification code has been sent to your email." : ""}
        </div>

        <div className="mb-8 text-center">
          <Image
            src="/ruthva-logo.png"
            alt="Ruthva"
            width={120}
            height={40}
            className="mx-auto mb-6 h-10 w-auto"
          />
          {/* Single error region — hoisted above both form branches so it persists across step transitions */}
        <div
          id="login-error"
          role="alert"
          className={`mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700${!error ? " hidden" : ""}`}
        >
          {error?.slice(0, 200)}
        </div>

        {step === "email" ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="mt-1 text-sm text-gray-500">
                Sign in to your clinic dashboard
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
              <p className="mt-1 text-sm text-gray-500">
                We sent a code to <strong>{email}</strong>
              </p>
            </>
          )}
        </div>

        {step === "email" ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              {/* Task 1: focus-visible ring / Task 3: aria-invalid + aria-describedby */}
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="doctor@clinic.com"
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Sending code..." : "Send login code"}
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
              {/* Task 1: focus-visible ring / Task 3: aria-invalid + aria-describedby */}
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
                aria-describedby={error ? "login-error" : undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] shadow-sm focus:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
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
              {/* Task 5: Dedicated resend handler with cooldown */}
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0}
                className="text-emerald-700 hover:text-emerald-700 disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "resend"}
              </button>
            </p>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-emerald-700 hover:text-emerald-800"
          >
            Register your clinic &rarr;
          </Link>
        </p>
      </div>
    </main>
  );
}

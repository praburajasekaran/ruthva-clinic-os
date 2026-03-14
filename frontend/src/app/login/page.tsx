"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

type Step = "email" | "otp";

export default function LoginPage() {
  const { requestOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequestOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
    setError("");
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

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, 6));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/ruthva-logo.png"
            alt="Ruthva"
            className="mx-auto mb-6 h-10"
          />
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
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="doctor@clinic.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Sending code..." : "Send login code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

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
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
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
                onClick={handleRequestOTP as () => void}
                className="text-emerald-600 hover:text-emerald-700"
              >
                resend
              </button>
            </p>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          New clinic?{" "}
          <Link
            href="/signup"
            className="font-medium text-emerald-600 hover:text-emerald-700"
          >
            Register your clinic
          </Link>
        </p>
      </div>
    </div>
  );
}

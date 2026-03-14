"use client";

import { Leaf, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type { InviteDetails } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { Input } from "@/components/ui/Input";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { setTokens } = useAuth();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("No invitation token provided.");
      setIsLoadingInvite(false);
      return;
    }

    api
      .get<InviteDetails>(`/invite/details/?token=${token}`)
      .then((res) => {
        setInvite(res.data);
      })
      .catch((err) => {
        const detail = err?.response?.data?.detail ?? "Invalid invitation.";
        setLoadError(detail);
      })
      .finally(() => setIsLoadingInvite(false));
  }, [token]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setFieldErrors({});

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setLoading(true);
      try {
        const res = await api.post("/invite/accept/", {
          token,
          username,
          password,
        });

        // Store tokens via AuthProvider and redirect to dashboard
        await setTokens({
          access: res.data.access,
          refresh: res.data.refresh,
          clinic_slug: res.data.clinic_slug,
        });
        router.push("/");
      } catch (err: unknown) {
        const data =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: Record<string, unknown> } })
                .response?.data
            : null;

        if (data) {
          const errors: Record<string, string> = {};
          for (const [key, val] of Object.entries(data)) {
            if (Array.isArray(val)) errors[key] = val[0] as string;
            else if (typeof val === "string" && key !== "detail")
              errors[key] = val;
          }
          if (Object.keys(errors).length > 0) setFieldErrors(errors);
          if (data.detail) setError(data.detail as string);
          else if (Object.keys(errors).length === 0)
            setError("Something went wrong. Please try again.");
        } else {
          setError("Network error. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [token, username, password, confirmPassword, router, setTokens],
  );

  if (isLoadingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 aria-hidden="true" className="h-8 w-8 motion-safe:animate-spin text-emerald-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <Leaf className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Invalid Invitation
          </h1>
          <p className="mt-2 text-sm text-gray-500">{loadError}</p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <Leaf className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Join {invite?.clinic_name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            You&apos;ve been invited as a{" "}
            <span className="font-medium text-emerald-700">
              {invite?.role}
            </span>
          </p>
        </div>

        <div className="mb-6 rounded-lg bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-800">
            <span className="font-medium">{invite?.first_name} {invite?.last_name}</span>
            <br />
            <span className="text-emerald-600">{invite?.email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Choose a username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="your_username"
              hasError={!!fieldErrors.username}
            />
            {fieldErrors.username && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.username}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Create a password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              hasError={!!fieldErrors.password}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Confirm password
            </label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {fieldErrors.token && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {fieldErrors.token}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Accept & Join"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-600 hover:text-emerald-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 aria-hidden="true" className="h-8 w-8 motion-safe:animate-spin text-emerald-600" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}

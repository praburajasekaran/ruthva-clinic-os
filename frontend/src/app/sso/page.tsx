"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import axios from "axios";

function SsoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens } = useAuth();
  const [error, setError] = useState("");
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setError("Missing SSO token.");
      return;
    }

    async function validateToken() {
      try {
        // Frontend calls Django's public SSO exchange endpoint.
        // Django internally calls ruthva /api/sso/validate with X-Ruthva-Secret.
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/sso/exchange/`,
          { token }
        );

        await setTokens({
          access: res.data.access,
          refresh: res.data.refresh,
          clinic_slug: res.data.clinic_slug,
        });

        router.push("/");
      } catch {
        setError("Invalid or expired login link. Please sign in again.");
      }
    }

    validateToken();
  }, [searchParams, setTokens, router]);

  const ruthvaUrl = process.env.NEXT_PUBLIC_RUTHVA_URL ?? "https://ruthva.com";

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <Leaf className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="mb-2 text-lg font-semibold text-gray-900">
            Sign-in failed
          </h1>
          <p className="mb-6 text-sm text-gray-500">{error}</p>
          <a
            href={`${ruthvaUrl}/login`}
            className="inline-block rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Return to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500">Signing you in...</p>
      </div>
    </main>
  );
}

export default function SsoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </main>
      }
    >
      <SsoContent />
    </Suspense>
  );
}

"use client";
import { Spinner } from "@/components/ui/Spinner";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Redirect to onboarding if clinic is not set up
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !user.onboarding_complete) {
      router.push("/onboarding");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (user && !user.onboarding_complete) return null;

  return <>{children}</>;
}

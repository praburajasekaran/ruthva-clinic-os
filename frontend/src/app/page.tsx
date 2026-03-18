"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { OnboardingSimulation } from "@/components/landing/OnboardingSimulation";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // While checking auth, show nothing (avoids flash)
  if (isLoading) {
    return null;
  }

  // Authenticated users get redirected above
  if (isAuthenticated) {
    return null;
  }

  // Unauthenticated users see the landing page
  return (
    <main className="min-h-screen bg-surface" id="main-content">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-brand-950 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand-400"
      >
        Skip to main content
      </a>
      <Navbar />
      <Hero />
      <ProblemSolution />
      <OnboardingSimulation />
      <Pricing />
      <Footer />
    </main>
  );
}

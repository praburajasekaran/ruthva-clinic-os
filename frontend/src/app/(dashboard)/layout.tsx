"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { KeyboardProvider } from "@/components/layout/KeyboardProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { FloatingFeedbackButton } from "@/components/feedback/FloatingFeedbackButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthGuard>
      <KeyboardProvider>
        <div className="flex h-screen">
          <Sidebar onMobileOpenChange={setMobileOpen} />
          {/* Single inert container covers skip link + main so neither is reachable during mobile overlay */}
          <div inert={mobileOpen || undefined} className="flex flex-1 flex-col">
            <a
              href="#main-content"
              className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-[100] focus-visible:rounded-md focus-visible:bg-emerald-800 focus-visible:px-4 focus-visible:py-2 focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              Skip to main content
            </a>
            <main
              id="main-content"
              className="flex min-h-screen flex-1 flex-col overflow-auto bg-[color:var(--color-canvas)] p-6 pt-16 md:p-8 md:pt-8"
            >
              <div className="flex-1">{children}</div>
            </main>
          </div>
        </div>
        <FloatingFeedbackButton />
      </KeyboardProvider>
    </AuthGuard>
  );
}

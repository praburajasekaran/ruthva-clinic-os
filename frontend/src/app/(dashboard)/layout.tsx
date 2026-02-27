"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { KeyboardProvider } from "@/components/layout/KeyboardProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <KeyboardProvider>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-gray-50 p-6 pt-16 md:p-8 md:pt-8">
            {children}
          </main>
        </div>
      </KeyboardProvider>
    </AuthGuard>
  );
}

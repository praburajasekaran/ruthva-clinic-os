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
          <main className="flex min-h-screen flex-1 flex-col overflow-auto bg-[color:var(--color-canvas)] p-6 pt-16 md:p-8 md:pt-8">
            <div className="flex-1">{children}</div>
            <footer className="no-print mt-12 border-t border-gray-100 py-4 text-center text-xs text-gray-400">
              <a
                href="https://ruthva.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-emerald-700"
              >
                Powered by
                <img
                  src="/ruthva-logo.png"
                  alt="Ruthva"
                  className="inline-block h-4"
                />
              </a>
            </footer>
          </main>
        </div>
      </KeyboardProvider>
    </AuthGuard>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";

function AdminContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  if (!user?.is_platform_admin)
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold">
          Ruthva admin access is required
        </h1>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-emerald-700 underline"
        >
          Return to your clinic
        </Link>
      </main>
    );
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Image
              src="/ruthva-logo.png"
              alt="Ruthva"
              width={120}
              height={40}
              className="h-8 w-auto"
            />
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Ruthva
              admin
            </span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <Link
              href="/dashboard"
              className="text-emerald-700 hover:underline"
            >
              Dashboard
            </Link>
            <span className="text-gray-500">{user.email}</span>
            <button onClick={logout} className="text-gray-700 hover:underline">
              Sign out
            </button>
          </div>
        </div>
        <nav
          aria-label="Ruthva admin"
          className="mx-auto mt-5 flex max-w-6xl gap-2"
        >
          {[
            { href: "/admin/clinics", label: "Clinic accounts" },
            { href: "/admin/feedback", label: "Feedback" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${pathname === item.href ? "bg-emerald-50 text-emerald-800" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AdminContent>{children}</AdminContent>
    </AuthGuard>
  );
}

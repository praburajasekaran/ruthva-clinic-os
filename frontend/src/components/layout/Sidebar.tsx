"use client";

import {
  LayoutDashboard,
  Users,
  Users2,
  Stethoscope,
  FileText,
  Menu,
  X,
  Search,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { KbdBadge } from "@/components/ui/KbdBadge";
import { useShortcuts } from "@/components/layout/KeyboardProvider";
import { useAuth } from "@/components/auth/AuthProvider";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/consultations", label: "Consultations", icon: Stethoscope },
  { href: "/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/team", label: "Team", icon: Users2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openSearch } = useShortcuts();
  const { user, logout } = useAuth();

  const clinicName = user?.clinic?.name ?? "Clinic";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const nav = (
    <div className="flex flex-1 flex-col">
      <div>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="truncate text-xl font-bold text-emerald-700">
            {clinicName}
          </h1>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search button */}
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            openSearch();
          }}
          className="no-print mb-4 flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          aria-label="Search patients (Ctrl+K)"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Search patients…</span>
          <KbdBadge keys={["Ctrl", "K"]} />
        </button>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-emerald-50 font-medium text-emerald-700"
                    : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/patients" && (
                  <KbdBadge
                    keys={["N"]}
                    aria-label="Press N to register a new patient"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User info + logout */}
      <div className="mt-auto border-t pt-4">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-medium text-gray-900">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="truncate text-xs text-gray-500">{user?.role}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-gray-200 bg-white p-2 shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-white p-4 transition-transform md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nav}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-white p-4 md:flex md:flex-col">
        {nav}
      </aside>
    </>
  );
}

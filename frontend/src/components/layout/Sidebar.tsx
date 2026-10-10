"use client";

import {
  LayoutDashboard,
  Users,
  Users2,
  Stethoscope,
  Hand,
  CalendarClock,
  Pill,
  Menu,
  X,
  Search,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KbdBadge } from "@/components/ui/KbdBadge";
import { useShortcuts } from "@/components/layout/KeyboardProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { DemoClinicSwitcher } from "@/components/demo/DemoClinicSwitcher";
import { useApi } from "@/hooks/useApi";
import type { FollowUpsResponse, Medicine } from "@/lib/types";

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/consultations", label: "Visits", icon: Stethoscope },
  { href: "/therapies", label: "Therapies", icon: Hand },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { href: "/pharmacy", label: "Medicines", icon: Pill },
  { href: "/team", label: "Team", icon: Users2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  onMobileOpenChange?: (open: boolean) => void;
}

export function Sidebar({ onMobileOpenChange }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openSearch } = useShortcuts();
  const { user, logout } = useAuth();
  const { data: contactCounts, refetch: reloadContacts } = useApi<{
    open: number;
    awaiting_doctor: number;
  }>(user && user.role !== "therapist" ? "/contact-follow-ups/counts/" : null);
  const [logoError, setLogoError] = useState(false);
  const { data: followUpsData } = useApi<FollowUpsResponse>(
    "/dashboard/follow-ups/?tab=all",
  );
  const { data: lowStockData } = useApi<Medicine[]>(
    "/pharmacy/medicines/low-stock/",
  );
  const triggerRef = useRef<HTMLElement | null>(null);

  const clinicName = user?.clinic?.name ?? "Clinic";
  const clinicLogoUrl = user?.clinic?.logo_url ?? "";
  const clinicInitial = clinicName.trim().charAt(0).toUpperCase() || "C";

  useEffect(() => {
    setLogoError(false);
  }, [clinicLogoUrl]);

  useEffect(() => {
    const refresh = () => void reloadContacts();
    window.addEventListener("contact-follow-ups-updated", refresh);
    return () =>
      window.removeEventListener("contact-follow-ups-updated", refresh);
  }, [reloadContacts]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  function openMobileMenu() {
    triggerRef.current = document.activeElement as HTMLElement;
    setMobileOpen(true);
    onMobileOpenChange?.(true);
  }

  function closeMobileMenu() {
    setMobileOpen(false);
    onMobileOpenChange?.(false);
    setTimeout(() => triggerRef.current?.focus(), 0);
  }

  const followUpCount =
    (followUpsData?.meta?.counts?.total ?? 0) +
    (contactCounts?.open ?? 0) +
    (contactCounts?.awaiting_doctor ?? 0);
  const lowStockCount = lowStockData?.length ?? 0;

  const nav = (
    <div className="flex min-h-full flex-1 flex-col gap-6">
      <div>
        <div className="mb-6 flex flex-col items-center border-b border-gray-200 pb-6">
          <button
            type="button"
            onClick={closeMobileMenu}
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <a
            href="https://ruthva.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
          >
            <Image
              src="/ruthva-logo.png"
              alt="Ruthva"
              width={140}
              height={35}
              unoptimized
              className="h-10 w-auto"
            />
          </a>
        </div>

        <DemoClinicSwitcher />

        {/* Search button */}
        <button
          type="button"
          onClick={() => {
            closeMobileMenu();
            openSearch();
          }}
          className="no-print mb-4 flex min-h-12 w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 md:min-h-0"
          aria-label="Search patients (Ctrl+K)"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">Search patients…</span>
          <span className="hidden md:inline-flex">
            <KbdBadge keys={["Ctrl", "K"]} aria-hidden="true" />
          </span>
        </button>

        <nav className="space-y-1">
          {[
            ...navItems,
            ...(user?.is_platform_admin
              ? [
                  {
                    href: "/admin/clinics",
                    label: "Ruthva admin",
                    icon: ShieldCheck,
                  },
                ]
              : []),
          ].map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-base transition-colors md:min-h-0 md:text-sm ${
                  active
                    ? "bg-emerald-50 font-medium text-emerald-700"
                    : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/patients" && (
                  <span className="hidden md:inline-flex">
                    <KbdBadge keys={["N"]} aria-hidden="true" />
                  </span>
                )}
                {item.href === "/follow-ups" && followUpCount > 0 && (
                  <span
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
                    aria-label={`${followUpCount} follow-ups pending`}
                  >
                    {followUpCount}
                  </span>
                )}
                {item.href === "/pharmacy" && lowStockCount > 0 && (
                  <span
                    className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700"
                    aria-label={`${lowStockCount} low stock items`}
                  >
                    {lowStockCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Clinic info + user + logout */}
      <div className="mt-auto border-t pt-4">
        <div className="mb-3 flex items-center gap-3 px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700">
            {clinicLogoUrl && !logoError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clinicLogoUrl}
                alt={`${clinicName} logo`}
                className="h-full w-full object-cover"
                onError={() => setLogoError(true)}
              />
            ) : (
              clinicInitial
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-emerald-700">
              {clinicName}
            </p>
          </div>
        </div>
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-medium text-gray-900">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="truncate text-xs text-gray-500">{user?.role}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-700 md:min-h-0"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-[calc(4rem+env(safe-area-inset-top))] items-center gap-3 border-b border-gray-200 bg-white px-4 pt-[env(safe-area-inset-top)] md:hidden">
        <button
          type="button"
          onClick={openMobileMenu}
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 shadow-sm"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-700" aria-hidden="true" />
        </button>
        <Image
          src="/ruthva-logo.png"
          alt="Ruthva"
          width={100}
          height={25}
          unoptimized
          className="h-7 w-auto"
        />
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen || undefined}
        className={`fixed inset-y-0 left-0 z-50 w-[min(20rem,calc(100vw-3rem))] transform overflow-y-auto overscroll-contain border-r bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] transition-transform md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nav}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r bg-white p-4 md:flex md:flex-col">
        {nav}
      </aside>
    </>
  );
}

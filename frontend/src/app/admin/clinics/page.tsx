"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { ShieldCheck, Search } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { Modal } from "@/components/ui/Modal";
import { useApi } from "@/hooks/useApi";
import api from "@/lib/api";
import type { ClinicAccount } from "@/lib/types";

type AccountList = { count: number; page: number; results: ClinicAccount[] };
const filters = [
  { value: "all", label: "All clinics" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending_verification", label: "Needs verification" },
];

function ClinicAccounts() {
  const { user, logout } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ClinicAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const params = new URLSearchParams({ search, status, page: String(page) });
  const { data, error, isLoading, refetch } = useApi<AccountList>(
    user?.is_platform_admin ? `/admin/clinics/?${params}` : null,
  );

  async function changeStatus() {
    if (!selected || saving) return;
    setSaving(true);
    setActionError("");
    try {
      const result = await api.patch<ClinicAccount>(
        `/admin/clinics/${selected.id}/status/`,
        { is_active: !selected.is_active },
      );
      await refetch();
      setNotice(
        `${result.data.name} is now ${result.data.is_active ? "active" : "inactive"}.`,
      );
      setSelected(null);
    } catch (err) {
      setActionError(
        axios.isAxiosError(err)
          ? err.response?.data?.detail || "Could not change clinic status."
          : "Could not change clinic status.",
      );
    } finally {
      setSaving(false);
    }
  }

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
              <ShieldCheck className="h-5 w-5" />
              Ruthva admin
            </span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            {user.clinic?.is_active && (
              <Link
                href="/dashboard"
                className="text-emerald-700 hover:underline"
              >
                My clinic
              </Link>
            )}
            <span className="text-gray-500">{user.email}</span>
            <button onClick={logout} className="text-gray-700 hover:underline">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Clinic accounts
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage access for each clinic and its staff. Owners must verify
            their email before activation.
          </p>
        </div>
        {notice && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            className="flex flex-wrap gap-2"
            aria-label="Filter clinic accounts"
          >
            {filters.map((filter) => (
              <button
                key={filter.value}
                aria-pressed={status === filter.value}
                onClick={() => {
                  setStatus(filter.value);
                  setPage(1);
                }}
                className={`rounded-lg border px-3 py-2 text-sm ${status === filter.value ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-300 bg-white text-gray-700"}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchInput.trim());
              setPage(1);
            }}
            className="flex gap-2"
          >
            <label htmlFor="clinic-search" className="sr-only">
              Search clinic or owner email
            </label>
            <input
              id="clinic-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search clinic or owner email"
              maxLength={254}
              className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              aria-label="Search clinics"
              className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700"
            >
              <Search className="h-5 w-5" />
            </button>
          </form>
        </div>
        {error && (
          <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
            {error.detail}
            <button onClick={() => void refetch()} className="ml-3 underline">
              Retry
            </button>
          </div>
        )}
        {isLoading ? (
          <p role="status" className="py-10 text-center text-gray-500">
            Loading clinic accounts...
          </p>
        ) : (
          data && (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-gray-600">
                    <tr>
                      {[
                        "Clinic",
                        "Owner",
                        "Email verification",
                        "Account status",
                        "Members",
                        "Action",
                      ].map((label) => (
                        <th
                          key={label}
                          scope="col"
                          className="whitespace-nowrap px-5 py-3 font-medium"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.results.map((clinic) => (
                      <tr key={clinic.id}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {clinic.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {clinic.subdomain}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p>{clinic.owner?.name || "No owner"}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {clinic.owner?.email}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={
                              clinic.owner?.email_verified_at
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }
                          >
                            {clinic.owner?.email_verified_at
                              ? "Verified"
                              : "Not verified"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${clinic.status === "active" ? "bg-emerald-50 text-emerald-800" : clinic.status === "inactive" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}
                          >
                            {clinic.status === "pending_verification"
                              ? "Verification required"
                              : clinic.status === "active"
                                ? "Active"
                                : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-4">{clinic.member_count}</td>
                        <td className="px-5 py-4">
                          <button
                            aria-label={`${clinic.is_active ? "Deactivate" : "Activate"} ${clinic.name}`}
                            disabled={!clinic.is_active && !clinic.can_activate}
                            onClick={() => {
                              setSelected(clinic);
                              setActionError("");
                            }}
                            title={
                              !clinic.is_active && !clinic.can_activate
                                ? "The owner must verify their email before activation."
                                : undefined
                            }
                            className={`rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${clinic.is_active ? "border-red-200 text-red-700 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                          >
                            {clinic.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.results.length === 0 && (
                  <p className="p-10 text-center text-gray-500">
                    No clinics match this search.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{data.count} clinic accounts</span>
                <div className="flex items-center gap-4">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                    className="text-emerald-700 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>Page {page}</span>
                  <button
                    disabled={page * 25 >= data.count}
                    onClick={() => setPage((value) => value + 1)}
                    className="text-emerald-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )
        )}
      </main>
      <Modal
        open={selected !== null}
        onClose={() => {
          if (!saving) setSelected(null);
        }}
        title={`${selected?.is_active ? "Deactivate" : "Activate"} clinic account`}
        size="sm"
      >
        {selected && (
          <>
            <p className="text-sm text-gray-600">
              {selected.is_active
                ? `Everyone in ${selected.name} will lose access and must sign in again after activation. Clinic records are retained.`
                : `${selected.name} and its staff can sign in again after activation.`}
            </p>
            {actionError && (
              <p role="alert" className="mt-4 text-sm text-red-700">
                {actionError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={saving}
                onClick={() => setSelected(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={() => void changeStatus()}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${selected.is_active ? "bg-red-700" : "bg-emerald-700"}`}
              >
                {saving
                  ? "Saving..."
                  : selected.is_active
                    ? "Deactivate clinic"
                    : "Activate clinic"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default function ClinicAccountsPage() {
  return (
    <AuthGuard>
      <ClinicAccounts />
    </AuthGuard>
  );
}

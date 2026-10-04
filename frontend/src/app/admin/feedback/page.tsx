"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Bug, ImageIcon, Lightbulb, Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useApi } from "@/hooks/useApi";
import api from "@/lib/api";
import type { AdminFeedback, FeedbackCategory } from "@/lib/types";

type FeedbackList = { count: number; page: number; results: AdminFeedback[] };
type ScreenshotState =
  { kind: "loading" } | { kind: "error" } | { kind: "ready"; url: string };
const categories = [
  { value: "all", label: "All feedback" },
  { value: "bug", label: "Bug reports" },
  { value: "feature", label: "Feature requests" },
];
const categoryLabels: Record<FeedbackCategory, string> = {
  bug: "Bug report",
  feature: "Feature request",
};
const dateLabel = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

function FeedbackScreenshot({ id }: { id: number }) {
  const [state, setState] = useState<ScreenshotState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let url = "";
    setState({ kind: "loading" });
    api
      .get<Blob>(`/admin/feedback/${id}/screenshot/`, {
        responseType: "blob",
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(data);
        setState({ kind: "ready", url });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: "error" });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, attempt]);
  if (state.kind === "loading")
    return (
      <p role="status" className="text-sm text-gray-500">
        Loading screenshot...
      </p>
    );
  if (state.kind === "error")
    return (
      <p role="alert" className="text-sm text-red-700">
        Could not load the screenshot.{" "}
        <button
          onClick={() => setAttempt((value) => value + 1)}
          className="underline"
        >
          Retry
        </button>
      </p>
    );
  return (
    <a
      href={state.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open full screenshot"
    >
      <Image
        unoptimized
        width={1280}
        height={720}
        src={state.url}
        alt="Feedback screenshot"
        className="h-auto w-auto max-h-96 max-w-full rounded-lg border object-contain"
      />
      <span className="mt-2 block text-sm text-emerald-700 underline">
        Open full screenshot
      </span>
    </a>
  );
}

export default function AdminFeedbackPage() {
  const [category, setCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminFeedback | null>(null);
  const params = new URLSearchParams({ category, search, page: String(page) });
  const { data, error, isLoading, refetch } = useApi<FeedbackList>(
    `/admin/feedback/?${params}`,
  );
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Feedback</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review bug reports and feature requests from clinic staff.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" aria-label="Filter feedback">
          {categories.map((item) => (
            <button
              key={item.value}
              aria-pressed={category === item.value}
              onClick={() => {
                setCategory(item.value);
                setPage(1);
              }}
              className={`rounded-lg border px-3 py-2 text-sm ${category === item.value ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-300 bg-white text-gray-700"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchInput.trim());
            setPage(1);
          }}
          className="flex w-full gap-2 sm:w-auto"
        >
          <label htmlFor="feedback-search" className="sr-only">
            Search feedback, clinic or email
          </label>
          <input
            id="feedback-search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            maxLength={254}
            placeholder="Search feedback, clinic or email"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-72"
          />
          <button
            type="submit"
            aria-label="Search feedback"
            className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
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
          Loading feedback...
        </p>
      ) : (
        data && (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-gray-600">
                  <tr>
                    {[
                      "Request",
                      "Clinic",
                      "Submitted by",
                      "Received",
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
                  {data.results.map((item) => (
                    <tr key={item.id}>
                      <td className="max-w-sm px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${item.category === "bug" ? "text-red-700" : "text-emerald-700"}`}
                        >
                          {item.category === "bug" ? (
                            <Bug className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Lightbulb
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          )}
                          {categoryLabels[item.category]}
                        </span>
                        <p className="mt-1 break-words font-semibold text-gray-900">
                          {item.title}
                        </p>
                        {item.screenshot_available && (
                          <span className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
                            <ImageIcon
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Screenshot attached
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">{item.clinic.name}</td>
                      <td className="px-5 py-4">
                        <p>{item.submitter?.name || "Former staff member"}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.submitter?.email}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                        {dateLabel(item.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelected(item)}
                          aria-label={`View ${item.title}`}
                          className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.results.length === 0 && (
                <p className="p-10 text-center text-gray-500">
                  {category === "all" && !search
                    ? "No feedback yet. Reports from the clinic feedback form will appear here."
                    : "No feedback matches these filters."}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{data.count} requests</span>
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
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Feedback details"
        size="lg"
      >
        {selected && (
          <div className="max-h-[70dvh] space-y-5 overflow-y-auto break-words">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                {categoryLabels[selected.category]}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900">
                {selected.title}
              </h2>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Clinic</dt>
                <dd>{selected.clinic.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Received</dt>
                <dd>{dateLabel(selected.created_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Submitted by</dt>
                <dd>
                  {selected.submitter?.name || "Former staff member"}
                  <br />
                  {selected.submitter?.email}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Role</dt>
                <dd className="capitalize">{selected.user_role}</dd>
              </div>
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm text-gray-600">
                {selected.description || "No description provided."}
              </p>
            </div>
            {selected.page_url && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-700">
                  Reported page
                </h3>
                <p className="text-sm text-gray-600">{selected.page_url}</p>
              </div>
            )}
            {selected.screenshot_available && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-700">
                  Screenshot
                </h3>
                <FeedbackScreenshot key={selected.id} id={selected.id} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </main>
  );
}

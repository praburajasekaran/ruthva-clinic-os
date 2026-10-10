"use client";

import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import api from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type ConsentStatus = "not_recorded" | "granted" | "opted_out";
type MessageStatus = "prepared" | "handoff_requested" | "staff_reported_sent";
type Handoff = {
  id: string;
  status: MessageStatus;
  recipient: string;
  updated_at: string;
};
type Preview = {
  patient_id: number;
  patient_name: string;
  kind: "prescription" | "reminder";
  contact: string;
  recipient: string | null;
  message: string;
  version: string;
  error: string | null;
  consent: { status: ConsentStatus; updated_at: string | null };
  history: Handoff[];
};
const consentLabels: Record<ConsentStatus, string> = {
  not_recorded: "Consent not recorded",
  granted: "Patient consent recorded",
  opted_out: "Patient opted out. WhatsApp messages are blocked.",
};
const statusLabels: Record<MessageStatus, string> = {
  prepared: "Prepared. Send unconfirmed.",
  handoff_requested: "WhatsApp handoff requested. Send unconfirmed.",
  staff_reported_sent: "Staff reported sent. Delivery unconfirmed.",
};
function errorMessage(error: unknown): string {
  const detail = isAxiosError(error) ? error.response?.data?.detail : null;
  return typeof detail === "string"
    ? detail
    : "Could not complete this request. Try again.";
}

export function WhatsAppMessage({
  prescriptionId,
  kind = "prescription",
  onChanged,
}: {
  prescriptionId: number;
  kind?: Preview["kind"];
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [prepared, setPrepared] = useState<Handoff | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [sentConfirmed, setSentConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const path = `/prescriptions/${prescriptionId}/whatsapp/`;

  async function load() {
    setPreview(null);
    setPrepared(null);
    setReviewed(false);
    setConsentConfirmed(false);
    setSentConfirmed(false);
    const response = await api.get<Preview>(path, { params: { kind } });
    setPreview(response.data);
  }
  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function show() {
    setOpen(true);
    void run(load);
  }
  async function saveConsent(status: "granted" | "opted_out") {
    if (!preview) return;
    await api.post(`/patients/${preview.patient_id}/whatsapp-consent/`, {
      status,
      confirmed: true,
    });
    await load();
    onChanged?.();
  }
  async function prepare() {
    if (!preview) return;
    const response = await api.post<Handoff>(path, {
      kind,
      version: preview.version,
      reviewed,
    });
    setPrepared(response.data);
  }
  function openWhatsApp() {
    if (!prepared || pending.current) return;
    const tab = window.open("about:blank", "_blank");
    if (!tab) {
      setError(
        "Your browser blocked the WhatsApp tab. Allow popups for this site, then try again.",
      );
      return;
    }
    tab.opener = null;
    void run(async () => {
      try {
        const response = await api.post<{ url: string; status: MessageStatus }>(
          `/whatsapp/messages/${prepared.id}/open/`,
          {},
        );
        tab.location.href = response.data.url;
        setPrepared({ ...prepared, status: response.data.status });
      } catch (error) {
        tab.close();
        throw error;
      }
    });
  }
  async function reportSent() {
    if (!prepared) return;
    const response = await api.post<{ status: MessageStatus }>(
      `/whatsapp/messages/${prepared.id}/report-sent/`,
      { confirmed: sentConfirmed },
    );
    setPrepared({ ...prepared, status: response.data.status });
    onChanged?.();
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={show}>
        <MessageCircle className="h-4 w-4" />
        {kind === "prescription" ? "WhatsApp prescription" : "Review reminder"}
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title={
          kind === "prescription"
            ? "Review WhatsApp prescription"
            : "Review WhatsApp reminder"
        }
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Open the prepared message in your signed-in WhatsApp account. Check
            the sender and recipient there, then press Send. Ruthva cannot
            confirm WhatsApp delivery.
          </p>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          {!preview && (
            <p className="text-sm text-gray-500">
              {busy ? "Loading message..." : "Could not load the message."}
            </p>
          )}
          {preview && (
            <>
              <div className="rounded-lg border border-gray-200 p-3 text-sm">
                <p className="font-semibold text-gray-900">
                  {preview.patient_name}
                </p>
                <p>
                  Recipient:{" "}
                  {preview.recipient
                    ? `+${preview.recipient}`
                    : preview.contact || "No number recorded"}
                </p>
                <p className="mt-2" role="status">
                  {consentLabels[preview.consent.status]}
                </p>
                {preview.consent.status !== "granted" && (
                  <>
                    <label className="mt-3 flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={consentConfirmed}
                        onChange={(event) =>
                          setConsentConfirmed(event.target.checked)
                        }
                        disabled={busy}
                      />
                      <span>
                        {preview.consent.status === "opted_out"
                          ? "The patient has renewed consent for WhatsApp prescriptions and reminders."
                          : "The patient consents to WhatsApp prescriptions and reminders."}
                      </span>
                    </label>
                    <Button
                      className="mt-3"
                      size="sm"
                      disabled={busy || !consentConfirmed}
                      onClick={() => void run(() => saveConsent("granted"))}
                    >
                      Record consent
                    </Button>
                  </>
                )}
                {preview.consent.status !== "opted_out" && (
                  <Button
                    className="ml-2 mt-3"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => void run(() => saveConsent("opted_out"))}
                  >
                    Record patient opt-out
                  </Button>
                )}
                <Link
                  className="ml-3 text-emerald-700 underline"
                  href={`/patients/${preview.patient_id}/edit`}
                >
                  Edit patient contact
                </Link>
              </div>
              {preview.error && (
                <p role="alert" className="text-sm text-red-700">
                  {preview.error}
                </p>
              )}
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  Message preview
                </p>
                <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 p-4 font-sans text-sm text-gray-800">
                  {preview.message}
                </pre>
              </div>
              {!prepared && (
                <>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={reviewed}
                      onChange={(event) => setReviewed(event.target.checked)}
                      disabled={busy}
                    />
                    <span>
                      I reviewed the full message and verified the recipient for
                      this patient.
                    </span>
                  </label>
                  <Button
                    disabled={
                      busy ||
                      !reviewed ||
                      preview.consent.status !== "granted" ||
                      !!preview.error
                    }
                    onClick={() => void run(prepare)}
                  >
                    Prepare WhatsApp message
                  </Button>
                </>
              )}
              {prepared && (
                <div className="space-y-3 rounded-lg bg-emerald-50 p-3">
                  <p
                    role="status"
                    className="text-sm font-medium text-emerald-900"
                  >
                    {statusLabels[prepared.status]}
                  </p>
                  {prepared.status !== "staff_reported_sent" && (
                    <Button disabled={busy} onClick={openWhatsApp}>
                      Open WhatsApp
                    </Button>
                  )}
                  {prepared.status === "handoff_requested" && (
                    <>
                      <p className="text-sm text-emerald-900">
                        Before you reopen the message, check WhatsApp to avoid
                        sending it twice.
                      </p>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={sentConfirmed}
                          onChange={(event) =>
                            setSentConfirmed(event.target.checked)
                          }
                          disabled={busy}
                        />
                        <span>I pressed Send in WhatsApp.</span>
                      </label>
                      <Button
                        variant="secondary"
                        disabled={busy || !sentConfirmed}
                        onClick={() => void run(reportSent)}
                      >
                        Record that I sent it
                      </Button>
                    </>
                  )}
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void run(load)}
              >
                Reload message and consent
              </Button>
              {preview.history.length > 0 && (
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-sm font-semibold text-gray-900">
                    Recent message records
                  </p>
                  <ul className="mt-2 space-y-2 text-xs text-gray-600">
                    {preview.history.map((item) => (
                      <li key={item.id}>
                        +{item.recipient}. {statusLabels[item.status]}{" "}
                        {new Date(item.updated_at).toLocaleString("en-IN")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <p className="text-xs text-gray-500">
            Sending a reminder does not confirm the patient&apos;s visit.
          </p>
        </div>
      </Modal>
    </>
  );
}

type Reminder = {
  prescription_id: number;
  patient_name: string;
  patient_id: number;
  follow_up_date: string;
  consent_status: ConsentStatus;
};
export function WhatsAppReminderQueue() {
  const { data, error, isLoading, refetch } = useApi<Reminder[]>(
    "/whatsapp/reminders/",
  );
  return (
    <section
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-5"
      aria-labelledby="whatsapp-reminders-heading"
    >
      <h2
        id="whatsapp-reminders-heading"
        className="text-heading-section text-gray-900"
      >
        WhatsApp follow-up reminders
      </h2>
      <p className="text-sm text-gray-600">
        Review due and overdue follow-ups through the next seven days. Each
        reminder opens in your WhatsApp account for you to send. Shows up to 100
        prescriptions.
      </p>
      {isLoading && (
        <p className="text-sm text-gray-500">Loading reminders...</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error.detail || "Could not load reminders."}
        </p>
      )}
      {data?.length === 0 && (
        <p className="text-sm text-gray-500">
          No prescription follow-ups due in this period.
        </p>
      )}
      <ul className="space-y-3">
        {data?.map((item) => (
          <li
            key={item.prescription_id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
          >
            <div className="text-sm">
              <Link
                href={`/patients/${item.patient_id}`}
                className="font-medium text-emerald-700 hover:underline"
              >
                {item.patient_name}
              </Link>
              <p>Follow-up due {item.follow_up_date}</p>
              <p className="text-xs text-gray-500">
                {consentLabels[item.consent_status]}
              </p>
            </div>
            <WhatsAppMessage
              prescriptionId={item.prescription_id}
              kind="reminder"
              onChanged={refetch}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

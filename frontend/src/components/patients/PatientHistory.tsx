"use client";

import { useState } from "react";
import api from "@/lib/api";
import type { Patient } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { PillGroup } from "@/components/ui/PillGroup";

export function patientGaps(patient: Patient) {
  return [
    !patient.allergies.trim() && patient.allergies_review !== "none"
      ? "Confirm allergies"
      : null,
    !patient.medical_history.length &&
    patient.medical_history_review !== "none" &&
    patient.medical_history_review !== "reviewed"
      ? "Review medical history"
      : null,
    patient.current_medicines_status === "unknown" ||
    (patient.current_medicines_status === "taking" &&
      !patient.current_medicines.trim())
      ? "Confirm current medicines"
      : null,
  ].filter((x): x is string => x !== null);
}

export function PatientHistory({
  patient,
  onSaved,
  canEdit,
}: {
  patient: Patient;
  onSaved: () => Promise<void>;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(patient);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/patients/${patient.id}/`, {
        allergies: draft.allergies.trim(),
        allergies_review: draft.allergies_review,
        medical_history_review: draft.medical_history_review,
        current_medicines_status: draft.current_medicines_status,
        current_medicines: draft.current_medicines.trim(),
        medical_history: draft.medical_history.map(
          ({ disease, duration, medication }) => ({
            disease,
            duration,
            medication,
          }),
        ),
        family_history: draft.family_history.map(
          ({ relation, disease, duration, remarks }) => ({
            relation,
            disease,
            duration,
            remarks,
          }),
        ),
      });
      await onSaved();
      setEditing(false);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        .response?.data?.detail;
      setError(
        detail ||
          "Could not save. Check each history entry has a disease and duration, then try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const inputClass =
    "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-base";
  if (!editing)
    return (
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl">Health history</h2>
          {canEdit && (
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(patient);
                setError("");
                setEditing(true);
              }}
            >
              Add or edit history
            </Button>
          )}
        </div>
        <dl className="space-y-4">
          {patient.allergies && (
            <div>
              <dt className="text-sm text-text-muted">Allergies</dt>
              <dd>{patient.allergies}</dd>
            </div>
          )}
          {!patient.allergies && patient.allergies_review === "none" && (
            <div>
              <dt className="text-sm text-text-muted">Allergies</dt>
              <dd>No known allergies</dd>
            </div>
          )}
          {patient.current_medicines_status === "taking" &&
            patient.current_medicines && (
              <div>
                <dt className="text-sm text-text-muted">Current medicines</dt>
                <dd className="whitespace-pre-wrap">
                  {patient.current_medicines}
                </dd>
              </div>
            )}
          {patient.current_medicines_status === "none" && (
            <div>
              <dt className="text-sm text-text-muted">Current medicines</dt>
              <dd>None reported</dd>
            </div>
          )}
        </dl>
        <div className="mt-6 space-y-3">
          <h3 className="text-lg">Medical history</h3>
          {patient.medical_history.map((row) => (
            <p key={row.id}>
              <strong>{row.disease}</strong>
              {row.duration && ` · ${row.duration}`}
              {row.medication && ` · ${row.medication}`}
            </p>
          ))}
          {!patient.medical_history.length && (
            <p className="text-text-muted">
              {patient.medical_history_review === "none"
                ? "No known medical history"
                : patient.medical_history_review === "reviewed"
                  ? "Reviewed; no entries recorded"
                  : "History has not been reviewed"}
            </p>
          )}
        </div>
        <div className="mt-6 space-y-3">
          <h3 className="text-lg">Family history</h3>
          {patient.family_history.map((row) => (
            <p key={row.id}>
              <strong>
                {row.relation} · {row.disease}
              </strong>
              {row.duration && ` · ${row.duration}`}
              {row.remarks && ` · ${row.remarks}`}
            </p>
          ))}
          {!patient.family_history.length && (
            <p className="text-text-muted">No family history recorded</p>
          )}
        </div>
      </section>
    );
  return (
    <form
      className="space-y-6 rounded-2xl border border-border bg-white p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2 className="text-xl">Update health history</h2>
      <fieldset disabled={busy} className="space-y-6">
        <div>
          <p className="mb-2 font-semibold">Allergies</p>
          <PillGroup
            label="Allergy review"
            value={draft.allergies_review}
            options={[
              { value: "unknown", label: "Not confirmed" },
              { value: "none", label: "None known" },
              { value: "recorded", label: "Has allergies" },
            ]}
            onChange={(v) =>
              setDraft({
                ...draft,
                allergies_review: (v ||
                  "unknown") as Patient["allergies_review"],
                allergies: v === "none" ? "" : draft.allergies,
              })
            }
          />
          {draft.allergies_review !== "none" && (
            <label className="mt-3 block text-sm">
              Recorded allergies
              <textarea
                className={inputClass}
                value={draft.allergies}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    allergies: e.target.value,
                    allergies_review: e.target.value.trim()
                      ? "recorded"
                      : "unknown",
                  })
                }
              />
            </label>
          )}
        </div>
        <div>
          <p className="mb-2 font-semibold">Current medicines</p>
          <PillGroup
            label="Current medicine review"
            value={draft.current_medicines_status}
            options={[
              { value: "unknown", label: "Not confirmed" },
              { value: "none", label: "None" },
              { value: "taking", label: "Taking medicines" },
            ]}
            onChange={(v) =>
              setDraft({
                ...draft,
                current_medicines_status: (v ||
                  "unknown") as Patient["current_medicines_status"],
                current_medicines: v === "none" ? "" : draft.current_medicines,
              })
            }
          />
          {draft.current_medicines_status === "taking" && (
            <label className="mt-3 block text-sm">
              Medicine names, doses and frequency
              <textarea
                required
                className={inputClass}
                value={draft.current_medicines}
                onChange={(e) =>
                  setDraft({ ...draft, current_medicines: e.target.value })
                }
              />
            </label>
          )}
        </div>
        <div>
          <p className="mb-2 font-semibold">Medical history review</p>
          <PillGroup
            label="Medical history review"
            value={draft.medical_history_review}
            options={[
              { value: "unknown", label: "Not reviewed" },
              { value: "reviewed", label: "Reviewed" },
              ...(!draft.medical_history.length
                ? [{ value: "none", label: "None known" }]
                : []),
            ]}
            onChange={(v) =>
              setDraft({
                ...draft,
                medical_history_review: (v ||
                  "unknown") as Patient["medical_history_review"],
              })
            }
          />
        </div>
        <div className="space-y-3">
          <h3 className="text-lg">Medical history</h3>
          {draft.medical_history.map((row, i) => (
            <div key={i} className="rounded-xl border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {(["disease", "duration", "medication"] as const).map((key) => (
                  <label key={key} className="text-sm capitalize">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    <input
                      className={inputClass}
                      required={key !== "medication"}
                      value={row[key]}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          medical_history: draft.medical_history.map((r, n) =>
                            n === i ? { ...r, [key]: e.target.value } : r,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setDraft({
                    ...draft,
                    medical_history: draft.medical_history.filter(
                      (_, n) => n !== i,
                    ),
                  })
                }
              >
                Remove history entry {i + 1}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setDraft({
                ...draft,
                medical_history_review: "reviewed",
                medical_history: [
                  ...draft.medical_history,
                  {
                    id: -Date.now(),
                    disease: "",
                    duration: "",
                    medication: "",
                  },
                ],
              })
            }
          >
            Add medical history
          </Button>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg">Family history</h3>
          {draft.family_history.map((row, i) => (
            <div key={i} className="rounded-xl border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {(["relation", "disease", "duration", "remarks"] as const).map(
                  (key) => (
                    <label key={key} className="text-sm capitalize">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                      <input
                        className={inputClass}
                        required={key === "relation" || key === "disease"}
                        value={row[key]}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            family_history: draft.family_history.map((r, n) =>
                              n === i ? { ...r, [key]: e.target.value } : r,
                            ),
                          })
                        }
                      />
                    </label>
                  ),
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setDraft({
                    ...draft,
                    family_history: draft.family_history.filter(
                      (_, n) => n !== i,
                    ),
                  })
                }
              >
                Remove family entry {i + 1}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setDraft({
                ...draft,
                family_history: [
                  ...draft.family_history,
                  {
                    id: -Date.now(),
                    relation: "",
                    disease: "",
                    duration: "",
                    remarks: "",
                  },
                ],
              })
            }
          >
            Add family history
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save history"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

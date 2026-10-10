import assert from "node:assert/strict";

const origin = "http://127.0.0.1:8796";
const { roles } = await (await fetch(`${origin}/__fixture`)).json();
const headers = {
  Authorization: `Bearer ${roles.doctor.access}`,
  "Content-Type": "application/json",
};

async function api(path, method = "GET", body) {
  const response = await fetch(`${origin}/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  assert.ok(response.ok, JSON.stringify(data));
  return data;
}

const patient = await api("/patients/", "POST", {
  name: "Preview Patient",
  age: 40,
  gender: "female",
  phone: "9876543210",
  allergies: "Sesame",
  medical_history_review: "reviewed",
  medical_history: [
    { disease: "Asthma", duration: "2 years", medication: "Previous inhaler" },
  ],
  current_medicines_status: "taking",
  current_medicines: "Patient reports inhaler once daily",
});
const visit = await api("/consultations/", "POST", {
  patient: patient.id,
  consultation_date: "2026-10-10",
  chief_complaints: "Joint pain for one week",
  diagnosis: "Joint pain",
  weight: 62,
  bp_systolic: 120,
  bp_diastolic: 80,
});
await api("/prescriptions/", "POST", {
  consultation: visit.id,
  follow_up_date: "2026-10-17",
  procedures: [{ name: "Massage", duration: "20 minutes" }],
});
const staff = await api("/contact-follow-ups/staff/");
const task = await api("/contact-follow-ups/", "POST", {
  patient_id: patient.id,
  assigned_to_id: staff.find((s) => s.role === "admin").id,
  contact_date: "2026-10-12",
  reason: "Ask the patient to bring previous reports to the next visit.",
  request_id: crypto.randomUUID(),
});
const path = `/patients/${patient.id}/summary/`;
const initial = await api(path, "POST", {});
assert.equal(
  initial.source,
  "ai",
  `Live generation returned ${initial.status}`,
);
assert.equal(initial.status, "ready");
assert.ok(initial.summary.split(/\s+/).length <= 100);
assert.ok(!/[\r\n]/.test(initial.summary));
assert.match(initial.summary, /sesame/i);
assert.ok(!initial.summary.includes(patient.name));
assert.equal((await api(path)).fingerprint, initial.fingerprint);
await api(`/patients/${patient.id}/`, "PATCH", { allergies: "Peanut" });
const updated = await api(path, "POST", {});
assert.equal(updated.source, "ai", `Live refresh returned ${updated.status}`);
assert.notEqual(updated.fingerprint, initial.fingerprint);
assert.match(updated.summary, /peanut/i);
assert.ok(!/sesame/i.test(updated.summary));
console.log(
  JSON.stringify({
    patient_id: patient.id,
    contact_id: task.id,
    source: updated.source,
    words: updated.summary.split(/\s+/).length,
    summary: updated.summary,
  }),
);

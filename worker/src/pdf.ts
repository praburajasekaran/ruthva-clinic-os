import { str } from "./data";
import type { Row } from "./data";
import { escape } from "./auth";
import fontLatin from "../../backend/fonts/google-sans/GoogleSans-Regular-latin.ttf";
import fontExt from "../../backend/fonts/google-sans/GoogleSans-Regular-ext.ttf";

export const base64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let result = "";
  for (let i = 0; i < bytes.length; i += 16384)
    result += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return btoa(result);
};
export function prescriptionHtml(
  clinic: Row,
  doctor: Row,
  patient: Row,
  consultation: Row,
  rx: Row,
  meds: Row[],
  procs: Row[],
  logo = "",
  qr = "",
) {
  const color = /^#[a-f0-9]{6}$/i.test(str(clinic, "primary_color"))
    ? clinic.primary_color
    : "#2c5f2d";
  const margin = (key: string) =>
    Math.min(100, Math.max(0, clinic[key] == null ? 15 : Number(clinic[key])));
  const freq: Record<string, string> = {
    OD: "Once daily / ஒரு முறை",
    BD: "Twice daily / இரு முறை",
    TDS: "Three times daily / மூன்று முறை",
    QID: "Four times daily / நான்கு முறை",
    SOS: "As needed / தேவைக்கேற்ப",
    HS: "At bedtime / படுக்கும்போது",
  };
  const advice = [
    ["Diet", "உணவு ஆலோசனை", "diet_advice"],
    ["Lifestyle", "வாழ்க்கை முறை", "lifestyle_advice"],
    ["Exercise", "உடற்பயிற்சி", "exercise_advice"],
  ]
    .map(([label, tamil, key]) =>
      rx[key] || rx[`${key}_ta`]
        ? `<p><strong>${label} / ${tamil}</strong><br>${escape(rx[key])}<br>${escape(rx[`${key}_ta`])}</p>`
        : "",
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>@font-face{font-family:Clinic;src:url(data:font/ttf;base64,${base64(fontLatin)})}@font-face{font-family:ClinicTamil;src:url(data:font/ttf;base64,${base64(fontExt)})} @page{size:${clinic.paper_size === "A5" ? "A5" : "A4"};margin:${margin("top_margin_mm")}mm 12mm ${margin("bottom_margin_mm")}mm}body{font:11pt Clinic,ClinicTamil,sans-serif;color:#222}h1{color:${color};margin:0}header{text-align:center;border-bottom:2px solid ${color};padding-bottom:10px}table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left;border-bottom:1px solid #ddd}th{background:#f3f4f6}tr{break-inside:avoid}p{white-space:pre-wrap}small{color:#666}footer{margin-top:30px;font-size:8pt}</style></head><body>${clinic.letterhead_mode === "preprinted" ? "" : `<header>${logo ? `<img src="${logo}" style="max-height:60px;max-width:180px">` : ""}<h1>${escape(clinic.name)}</h1><p>Dr. ${escape(doctor.first_name)} ${escape(doctor.last_name)}<br>${escape(clinic.registration_number)}<br>${escape(clinic.tagline)}<br>${escape(clinic.address)}<br>${escape(clinic.phone)} ${escape(clinic.email)}</p></header>`}<p><strong>${escape(patient.name)}</strong> ${escape(patient.age)}y ${escape(patient.gender)}<br>${escape(patient.record_id)}<span style="float:right">${escape(consultation.consultation_date)}</span></p><p>Complaints / நோய்க்குறிகள்<br>${escape(consultation.chief_complaints)}<br><strong>Diagnosis / நோய் கணிப்பு</strong><br>${escape(consultation.diagnosis)}</p><p>${consultation.weight ? `Weight ${escape(consultation.weight)} kg ` : ""}${consultation.bp_systolic ? `BP ${escape(consultation.bp_systolic)}/${escape(consultation.bp_diastolic)} mmHg ` : ""}${consultation.pulse_rate ? `Pulse ${escape(consultation.pulse_rate)}/min ` : ""}${consultation.temperature ? `Temperature ${escape(consultation.temperature)}°F` : ""}</p>${meds.length ? `<h2>℞</h2><table><thead><tr><th>#</th><th>Medicine / மருந்து</th><th>Dosage / அளவு</th><th>Frequency / வேளை</th><th>Duration / காலம்</th></tr></thead><tbody>${meds.map((med, i) => `<tr><td>${i + 1}</td><td><strong>${escape(med.drug_name)}</strong> ${escape(med.potency)} ${escape(med.dilution_scale)}<br><small>${escape(med.instructions)} ${escape(med.instructions_ta)}</small></td><td>${escape(med.dosage)}</td><td>${escape(freq[str(med, "frequency")] || med.frequency)}<br>${escape(med.frequency_tamil)}<br>${escape(med.timing)} ${escape(med.timing_tamil)}</td><td>${escape(med.duration)}</td></tr>`).join("")}</tbody></table>` : ""}${procs.length ? `<h3>Procedures / சிகிச்சை</h3>${procs.map((proc) => `<p><strong>${escape(proc.name)}</strong> ${escape(proc.duration)}<br>${escape(proc.details)}</p>`).join("")}` : ""}${advice}${rx.follow_up_date ? `<p><strong>Follow-up / மறுபரிசோதனை ${escape(rx.follow_up_date)}</strong><br>${escape(rx.follow_up_notes)} ${escape(rx.follow_up_notes_ta)}</p>` : ""}<footer>${qr ? `<img alt="Review this clinic" src="${qr}" width="70" height="70"><p>Scan to review this clinic</p>` : ""}Powered by Ruthva.com</footer></body></html>`;
}

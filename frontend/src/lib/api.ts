import axios from "axios";
import type { ImportConfirmResult, ImportPreviewResult } from "@/lib/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;

  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // In dev, send clinic slug as header (production uses subdomains)
  const slug = localStorage.getItem("clinic_slug");
  if (slug) {
    config.headers["X-Clinic-Slug"] = slug;
  }

  return config;
});

// Auto-redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/signup")
    ) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("clinic_slug");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

async function postCsvImportPreview(
  endpoint: string,
  file: File,
  skipDuplicates = true,
): Promise<ImportPreviewResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("skip_duplicates", String(skipDuplicates));
  const res = await api.post<ImportPreviewResult>(endpoint, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

async function postCsvImportConfirm(
  endpoint: string,
  file: File,
  skipDuplicates = true,
): Promise<ImportConfirmResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("skip_duplicates", String(skipDuplicates));
  const res = await api.post<ImportConfirmResult>(endpoint, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

async function downloadExport(endpoint: string): Promise<Blob> {
  const res = await api.get(endpoint, { responseType: "blob" });
  return res.data;
}

export const dataPortabilityApi = {
  previewConsultationsImport: (file: File, skipDuplicates = true) =>
    postCsvImportPreview("/consultations/import/preview/", file, skipDuplicates),
  confirmConsultationsImport: (file: File, skipDuplicates = true) =>
    postCsvImportConfirm("/consultations/import/confirm/", file, skipDuplicates),
  previewPrescriptionsImport: (file: File, skipDuplicates = true) =>
    postCsvImportPreview("/prescriptions/import/preview/", file, skipDuplicates),
  confirmPrescriptionsImport: (file: File, skipDuplicates = true) =>
    postCsvImportConfirm("/prescriptions/import/confirm/", file, skipDuplicates),
  exportPatients: () => downloadExport("/export/patients/"),
  exportConsultations: () => downloadExport("/export/consultations/"),
  exportPrescriptions: () => downloadExport("/export/prescriptions/"),
  exportAll: () => downloadExport("/export/all/"),
};

export default api;

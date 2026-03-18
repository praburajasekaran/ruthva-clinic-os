import axios from "axios";
import type {
  DispensingRecord,
  ImportConfirmResult,
  ImportPreviewResult,
  Medicine,
  PaginatedResponse,
  RuthvaSyncResult,
  UsageDashboard,
} from "@/lib/types";

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

// Token refresh state — shared across concurrent requests
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  refreshQueue = [];
}

function forceLogout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("clinic_slug");
  window.location.href = "/login";
}

// Attempt token refresh on 401, fall back to logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      typeof window === "undefined" ||
      window.location.pathname === "/" ||
      window.location.pathname.startsWith("/login") ||
      window.location.pathname.startsWith("/signup") ||
      window.location.pathname.startsWith("/invite") ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      forceLogout();
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/token/refresh/`,
        { refresh: refreshToken },
      );
      const newAccess: string = res.data.access;
      localStorage.setItem("access_token", newAccess);
      if (res.data.refresh) {
        localStorage.setItem("refresh_token", res.data.refresh);
      }
      processQueue(null, newAccess);
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
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
  previewPatientImport: (file: File, skipDuplicates = true) =>
    postCsvImportPreview("/patients/import/preview/", file, skipDuplicates),
  confirmPatientImport: (file: File, skipDuplicates = true) =>
    postCsvImportConfirm("/patients/import/confirm/", file, skipDuplicates),
  retryRuthvaSync: (patientIds: number[]) =>
    api.post<RuthvaSyncResult>("/patients/import/retry-ruthva-sync/", {
      patient_ids: patientIds,
    }),
  bulkDeletePatients: (ids: number[]) =>
    api.post<{ deleted: number }>("/patients/bulk-delete/", { ids }),
  bulkToggleActivePatients: (ids: number[], isActive: boolean) =>
    api.post<{ updated: number }>("/patients/bulk-toggle-active/", {
      ids,
      is_active: isActive,
    }),
  exportPatients: () => downloadExport("/export/patients/"),
  exportConsultations: () => downloadExport("/export/consultations/"),
  exportPrescriptions: () => downloadExport("/export/prescriptions/"),
  exportAll: () => downloadExport("/export/all/"),
};

export const pharmacyApi = {
  listMedicines: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Medicine>>("/pharmacy/medicines/", { params }),
  getMedicine: (id: number) =>
    api.get<Medicine>(`/pharmacy/medicines/${id}/`),
  createMedicine: (data: Partial<Medicine>) =>
    api.post<Medicine>("/pharmacy/medicines/", data),
  updateMedicine: (id: number, data: Partial<Medicine>) =>
    api.patch<Medicine>(`/pharmacy/medicines/${id}/`, data),
  lowStock: () =>
    api.get<Medicine[]>("/pharmacy/medicines/low-stock/"),
  adjustStock: (id: number, data: { quantity: number; entry_type: string; notes?: string; batch_number?: string; expiry_date?: string | null }) =>
    api.post<Medicine>(`/pharmacy/medicines/${id}/adjust-stock/`, data),
  dispense: (data: { prescription_id: number; notes?: string; items: { medicine_id: number; quantity_dispensed: number }[] }) =>
    api.post<DispensingRecord>("/pharmacy/dispensing/", data),
  listDispensing: (prescriptionId: number) =>
    api.get<DispensingRecord[]>("/pharmacy/dispensing/", { params: { prescription: prescriptionId } }),
  usageDashboard: () =>
    api.get<UsageDashboard>("/usage/"),
  togglePatientActive: (patientId: number) =>
    api.post<{ is_active: boolean }>(`/patients/${patientId}/toggle-active/`),
};

export default api;

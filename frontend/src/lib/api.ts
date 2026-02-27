import axios from "axios";

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

export default api;

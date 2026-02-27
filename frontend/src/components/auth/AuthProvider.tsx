"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { User, LoginRequest, SignupRequest } from "@/lib/types";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  login: (data: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const res = await api.get<User>("/auth/me/");
      if (res.data.clinic?.subdomain) {
        localStorage.setItem("clinic_slug", res.data.clinic.subdomain);
      }
      setState({ user: res.data, isLoading: false, isAuthenticated: true });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("clinic_slug");
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(
    async (data: LoginRequest) => {
      const res = await api.post("/auth/token/", data);
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      if (res.data.clinic_slug) {
        localStorage.setItem("clinic_slug", res.data.clinic_slug);
      }
      await fetchUser();
      router.push("/");
    },
    [fetchUser, router],
  );

  const signup = useCallback(
    async (data: SignupRequest) => {
      const res = await api.post("/auth/signup/", data);
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      if (res.data.clinic?.subdomain) {
        localStorage.setItem("clinic_slug", res.data.clinic.subdomain);
      }
      await fetchUser();
      router.push("/");
    },
    [fetchUser, router],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("clinic_slug");
    setState({ user: null, isLoading: false, isAuthenticated: false });
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ ...state, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

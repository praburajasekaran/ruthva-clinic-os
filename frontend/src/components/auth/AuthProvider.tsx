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
import type { User, SignupRequest, RequestOTPRequest, VerifyOTPRequest } from "@/lib/types";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  requestOTP: (data: RequestOTPRequest) => Promise<void>;
  verifyOTP: (data: VerifyOTPRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setTokens: (tokens: {
    access: string;
    refresh: string;
    clinic_slug?: string;
  }) => Promise<void>;
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

  const setTokens = useCallback(
    async (tokens: {
      access: string;
      refresh: string;
      clinic_slug?: string;
    }) => {
      localStorage.setItem("access_token", tokens.access);
      localStorage.setItem("refresh_token", tokens.refresh);
      if (tokens.clinic_slug) {
        localStorage.setItem("clinic_slug", tokens.clinic_slug);
      }
      await fetchUser();
    },
    [fetchUser],
  );

  const requestOTP = useCallback(
    async (data: RequestOTPRequest) => {
      await api.post("/auth/request-otp/", data);
    },
    [],
  );

  const verifyOTP = useCallback(
    async (data: VerifyOTPRequest) => {
      const res = await api.post("/auth/verify-otp/", data);
      await setTokens({
        access: res.data.access,
        refresh: res.data.refresh,
        clinic_slug: res.data.clinic_slug,
      });
      router.push("/dashboard");
    },
    [setTokens, router],
  );

  const signup = useCallback(
    async (data: SignupRequest) => {
      const res = await api.post("/auth/signup/", data);
      await setTokens({
        access: res.data.access,
        refresh: res.data.refresh,
        clinic_slug: res.data.clinic?.subdomain,
      });
      router.push("/dashboard");
    },
    [setTokens, router],
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
      value={{ ...state, requestOTP, verifyOTP, signup, logout, refreshUser: fetchUser, setTokens }}
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

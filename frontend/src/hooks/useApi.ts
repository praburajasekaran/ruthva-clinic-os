"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import type { ApiError } from "@/lib/types";

type UseApiState<T> = {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
};

export function useApi<T>(url: string | null) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: url !== null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (fetchUrl?: string) => {
      const target = fetchUrl ?? url;
      if (!target) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const res = await api.get<T>(target, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setState({ data: res.data, error: null, isLoading: false });
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const apiErr =
          err && typeof err === "object" && "response" in err
            ? ((err as { response?: { data?: ApiError } }).response?.data ?? {
                detail: "Something went wrong",
              })
            : { detail: "Network error" };
        setState({ data: null, error: apiErr as ApiError, isLoading: false });
      }
    },
    [url],
  );

  useEffect(() => {
    if (url) fetchData();
    return () => abortRef.current?.abort();
  }, [url, fetchData]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  return { ...state, refetch };
}

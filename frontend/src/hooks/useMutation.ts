"use client";

import { useCallback, useState } from "react";
import api from "@/lib/api";
import type { ApiError } from "@/lib/types";

type MutationMethod = "post" | "put" | "patch" | "delete";

type UseMutationState<TResponse> = {
  data: TResponse | null;
  error: ApiError | null;
  isLoading: boolean;
};

export function useMutation<TPayload = unknown, TResponse = unknown>(
  method: MutationMethod,
  url: string,
) {
  const [state, setState] = useState<UseMutationState<TResponse>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const mutate = useCallback(
    async (payload?: TPayload): Promise<TResponse | null> => {
      setState({ data: null, error: null, isLoading: true });

      try {
        const res = await api[method]<TResponse>(url, payload);
        setState({ data: res.data, error: null, isLoading: false });
        return res.data;
      } catch (err: unknown) {
        const apiErr =
          err && typeof err === "object" && "response" in err
            ? ((err as { response?: { data?: ApiError } }).response?.data ?? {
                detail: "Something went wrong",
              })
            : { detail: "Network error" };
        setState({ data: null, error: apiErr as ApiError, isLoading: false });
        return null;
      }
    },
    [method, url],
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false });
  }, []);

  return { ...state, mutate, reset };
}

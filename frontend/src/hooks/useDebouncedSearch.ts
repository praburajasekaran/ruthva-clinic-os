"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";

type Options = {
  endpoint: string;
  queryParam?: string;
  debounceMs?: number;
  minChars?: number;
};

export function useDebouncedSearch<T>({
  endpoint,
  queryParam = "search",
  debounceMs = 300,
  minChars = 2,
}: Options) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.length < minChars) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await api.get<T>(endpoint, {
          params: { [queryParam]: query },
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setResults(res.data);
          setIsLoading(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, endpoint, queryParam, debounceMs, minChars]);

  const clear = useCallback(() => {
    setQuery("");
    setResults(null);
    abortRef.current?.abort();
  }, []);

  return { query, setQuery, results, isLoading, clear };
}

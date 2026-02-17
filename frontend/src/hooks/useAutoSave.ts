"use client";

import { useEffect, useRef } from "react";

export function useAutoSave<T>(key: string, data: T, debounceMs = 2000) {
  const dataRef = useRef(data);
  dataRef.current = data;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            data: dataRef.current,
            savedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // storage full — silently ignore
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [key, data, debounceMs]);
}

export function loadDraft<T>(key: string): { data: T; savedAt: string } | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

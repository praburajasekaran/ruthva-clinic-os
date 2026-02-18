"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { isShortcutSuppressed } from "@/lib/keyboard";
import { CommandPalette } from "./CommandPalette";

type ShortcutsContextValue = {
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

const ShortcutsContext = createContext<ShortcutsContextValue>({
  searchOpen: false,
  openSearch: () => {},
  closeSearch: () => {},
});

export function useShortcuts() {
  return useContext(ShortcutsContext);
}

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // N — new patient (global, context-aware)
      if (e.key === "n" || e.key === "N") {
        if (isShortcutSuppressed(e)) return;
        if (searchOpen) return; // modal is open
        if (pathname === "/patients/new") return; // already there
        e.preventDefault();
        router.push("/patients/new");
        return;
      }

      // / — open search (suppressed when typing in an input)
      if (e.key === "/") {
        if (isShortcutSuppressed(e)) return;
        e.preventDefault();
        openSearch();
        return;
      }

      // Ctrl+K — open search (never suppressed by input focus)
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        if (e.isComposing) return;
        e.preventDefault();
        openSearch();
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router, pathname, searchOpen, openSearch]);

  return (
    <ShortcutsContext.Provider value={{ searchOpen, openSearch, closeSearch }}>
      {children}
      <CommandPalette open={searchOpen} onClose={closeSearch} />
    </ShortcutsContext.Provider>
  );
}

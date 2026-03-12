"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "oxp-r1-release";

type R1ReleaseContextValue = {
  isR1Release: boolean;
  toggleR1Release: () => void;
  setR1Release: (value: boolean) => void;
};

const R1ReleaseContext = createContext<R1ReleaseContextValue | null>(null);

export function R1ReleaseProvider({ children }: { children: React.ReactNode }) {
  const [isR1Release, setIsR1Release] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setIsR1Release(stored === "true");
    } catch { /* ignore */ }
  }, []);

  const setR1Release = useCallback((value: boolean) => {
    setIsR1Release(value);
    try { localStorage.setItem(STORAGE_KEY, String(value)); } catch { /* ignore */ }
  }, []);

  const toggleR1Release = useCallback(() => {
    setR1Release(!isR1Release);
  }, [isR1Release, setR1Release]);

  return (
    <R1ReleaseContext.Provider value={{ isR1Release, toggleR1Release, setR1Release }}>
      {children}
    </R1ReleaseContext.Provider>
  );
}

export function useR1Release() {
  const ctx = useContext(R1ReleaseContext);
  if (!ctx) throw new Error("useR1Release must be used within R1ReleaseProvider");
  return ctx;
}

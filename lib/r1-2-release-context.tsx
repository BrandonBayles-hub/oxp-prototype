"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "oxp-r1-2-release";

type R1_2ReleaseContextValue = {
  isR1_2Release: boolean;
  toggleR1_2Release: () => void;
  setR1_2Release: (value: boolean) => void;
};

const R1_2ReleaseContext = createContext<R1_2ReleaseContextValue | null>(null);

export function R1_2ReleaseProvider({ children }: { children: React.ReactNode }) {
  const [isR1_2Release, setIsR1_2Release] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setIsR1_2Release(stored === "true");
    } catch { /* ignore */ }
  }, []);

  const setR1_2Release = useCallback((value: boolean) => {
    setIsR1_2Release(value);
    try { localStorage.setItem(STORAGE_KEY, String(value)); } catch { /* ignore */ }
  }, []);

  const toggleR1_2Release = useCallback(() => {
    setR1_2Release(!isR1_2Release);
  }, [isR1_2Release, setR1_2Release]);

  return (
    <R1_2ReleaseContext.Provider value={{ isR1_2Release, toggleR1_2Release, setR1_2Release }}>
      {children}
    </R1_2ReleaseContext.Provider>
  );
}

export function useR1_2Release() {
  const ctx = useContext(R1_2ReleaseContext);
  if (!ctx) throw new Error("useR1_2Release must be used within R1_2ReleaseProvider");
  return ctx;
}

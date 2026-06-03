"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Demo control for the R2 release prototype state. When enabled:
//   • Command Center renders in its R1-style layout.
//   • Sidebar hides Entrata Experts, Performance, Admin Insights, Agent Voice
//     & Tone, Brand Center, and Governance.
//   • AI & Agent Activation hides the Entrata Experts setup link.
//   • Communications, Escalations, Agent Roster (card view), Workforce, Agent
//     Builder, and Trainings & SOP keep their Full Version behavior.
//
// R1 and R2 are mutually exclusive — selecting one clears the other in the
// demo dropdown.

const STORAGE_KEY = "oxp-r2-release";

type R2ReleaseContextValue = {
  isR2Release: boolean;
  toggleR2Release: () => void;
  setR2Release: (value: boolean) => void;
};

const R2ReleaseContext = createContext<R2ReleaseContextValue | null>(null);

export function R2ReleaseProvider({ children }: { children: React.ReactNode }) {
  const [isR2Release, setIsR2Release] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setIsR2Release(stored === "true");
    } catch { /* ignore */ }
  }, []);

  const setR2Release = useCallback((value: boolean) => {
    setIsR2Release(value);
    try { localStorage.setItem(STORAGE_KEY, String(value)); } catch { /* ignore */ }
  }, []);

  const toggleR2Release = useCallback(() => {
    setR2Release(!isR2Release);
  }, [isR2Release, setR2Release]);

  return (
    <R2ReleaseContext.Provider value={{ isR2Release, toggleR2Release, setR2Release }}>
      {children}
    </R2ReleaseContext.Provider>
  );
}

export function useR2Release() {
  const ctx = useContext(R2ReleaseContext);
  if (!ctx) throw new Error("useR2Release must be used within R2ReleaseProvider");
  return ctx;
}

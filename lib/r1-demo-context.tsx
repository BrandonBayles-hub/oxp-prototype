"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "oxp-r1-preview";

type R1DemoContextValue = {
  isR1Preview: boolean;
  toggleR1Preview: () => void;
  setR1Preview: (value: boolean) => void;
};

const R1DemoContext = createContext<R1DemoContextValue | null>(null);

export function R1DemoProvider({ children }: { children: React.ReactNode }) {
  const [isR1Preview, setIsR1Preview] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setIsR1Preview(stored === "true");
    } catch { /* ignore */ }
  }, []);

  const setR1Preview = useCallback((value: boolean) => {
    setIsR1Preview(value);
    try { localStorage.setItem(STORAGE_KEY, String(value)); } catch { /* ignore */ }
  }, []);

  const toggleR1Preview = useCallback(() => {
    setR1Preview(!isR1Preview);
  }, [isR1Preview, setR1Preview]);

  return (
    <R1DemoContext.Provider value={{ isR1Preview, toggleR1Preview, setR1Preview }}>
      {children}
    </R1DemoContext.Provider>
  );
}

export function useR1Demo() {
  const ctx = useContext(R1DemoContext);
  if (!ctx) throw new Error("useR1Demo must be used within R1DemoProvider");
  return ctx;
}

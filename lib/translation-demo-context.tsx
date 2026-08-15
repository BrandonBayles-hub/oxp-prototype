"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TranslationDemoContextValue = {
  /**
   * When true, Communications surfaces language detection + inline translation
   * on non-English conversations, and enables live auto-translate for the
   * staff composer.
   */
  translationEnabled: boolean;
  setTranslationEnabled: (value: boolean) => void;
  toggleTranslationEnabled: () => void;
};

const TranslationDemoContext = createContext<TranslationDemoContextValue | null>(null);

export function TranslationDemoProvider({ children }: { children: ReactNode }) {
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const toggleTranslationEnabled = useCallback(() => {
    setTranslationEnabled((v) => !v);
  }, []);

  const value = useMemo(
    () => ({
      translationEnabled,
      setTranslationEnabled,
      toggleTranslationEnabled,
    }),
    [translationEnabled, toggleTranslationEnabled]
  );

  return (
    <TranslationDemoContext.Provider value={value}>{children}</TranslationDemoContext.Provider>
  );
}

export function useTranslationDemo() {
  const ctx = useContext(TranslationDemoContext);
  if (!ctx) {
    throw new Error("useTranslationDemo must be used within TranslationDemoProvider");
  }
  return ctx;
}

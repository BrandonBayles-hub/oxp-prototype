"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type EliPlusSetupContextValue = {
  eliPlusSetupEnabled: boolean;
  setEliPlusSetupEnabled: (value: boolean) => void;
  toggleEliPlusSetup: () => void;
};

const EliPlusSetupContext = createContext<EliPlusSetupContextValue | null>(null);

export function EliPlusSetupProvider({ children }: { children: ReactNode }) {
  const [eliPlusSetupEnabled, setEliPlusSetupEnabled] = useState(false);
  const toggleEliPlusSetup = useCallback(() => {
    setEliPlusSetupEnabled((v) => !v);
  }, []);

  const value = useMemo(
    () => ({
      eliPlusSetupEnabled,
      setEliPlusSetupEnabled,
      toggleEliPlusSetup,
    }),
    [eliPlusSetupEnabled, toggleEliPlusSetup]
  );

  return (
    <EliPlusSetupContext.Provider value={value}>{children}</EliPlusSetupContext.Provider>
  );
}

export function useEliPlusSetup() {
  const ctx = useContext(EliPlusSetupContext);
  if (!ctx) {
    throw new Error("useEliPlusSetup must be used within EliPlusSetupProvider");
  }
  return ctx;
}

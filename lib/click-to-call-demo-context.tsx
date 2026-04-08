"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ClickToCallDemoContextValue = {
  clickToCallEnabled: boolean;
  setClickToCallEnabled: (value: boolean) => void;
  toggleClickToCallEnabled: () => void;
};

const ClickToCallDemoContext = createContext<ClickToCallDemoContextValue | null>(null);

export function ClickToCallDemoProvider({ children }: { children: ReactNode }) {
  const [clickToCallEnabled, setClickToCallEnabled] = useState(false);
  const toggleClickToCallEnabled = useCallback(() => {
    setClickToCallEnabled((v) => !v);
  }, []);

  const value = useMemo(
    () => ({
      clickToCallEnabled,
      setClickToCallEnabled,
      toggleClickToCallEnabled,
    }),
    [clickToCallEnabled, toggleClickToCallEnabled]
  );

  return (
    <ClickToCallDemoContext.Provider value={value}>{children}</ClickToCallDemoContext.Provider>
  );
}

export function useClickToCallDemo() {
  const ctx = useContext(ClickToCallDemoContext);
  if (!ctx) {
    throw new Error("useClickToCallDemo must be used within ClickToCallDemoProvider");
  }
  return ctx;
}

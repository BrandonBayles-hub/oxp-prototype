"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CallSystemDemoContextValue = {
  callSystemEnabled: boolean;
  setCallSystemEnabled: (value: boolean) => void;
  toggleCallSystemEnabled: () => void;
  /** Increments each time a simulated inbound call should fire */
  inboundCallRequest: number;
  simulateInboundCall: () => void;
};

const CallSystemDemoContext = createContext<CallSystemDemoContextValue | null>(null);

export function CallSystemDemoProvider({ children }: { children: ReactNode }) {
  const [callSystemEnabled, setCallSystemEnabled] = useState(false);
  const [inboundCallRequest, setInboundCallRequest] = useState(0);

  const toggleCallSystemEnabled = useCallback(() => {
    setCallSystemEnabled((v) => !v);
  }, []);

  const simulateInboundCall = useCallback(() => {
    setInboundCallRequest((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      callSystemEnabled,
      setCallSystemEnabled,
      toggleCallSystemEnabled,
      inboundCallRequest,
      simulateInboundCall,
    }),
    [callSystemEnabled, toggleCallSystemEnabled, inboundCallRequest, simulateInboundCall]
  );

  return (
    <CallSystemDemoContext.Provider value={value}>{children}</CallSystemDemoContext.Provider>
  );
}

export function useCallSystemDemo() {
  const ctx = useContext(CallSystemDemoContext);
  if (!ctx) {
    throw new Error("useCallSystemDemo must be used within CallSystemDemoProvider");
  }
  return ctx;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type IncomingCallerType = "prospect" | "lead" | "resident";

type CallSystemDemoContextValue = {
  callSystemEnabled: boolean;
  setCallSystemEnabled: (value: boolean) => void;
  toggleCallSystemEnabled: () => void;
  /** Increments each time a simulated inbound call should fire */
  inboundCallRequest: number;
  inboundCallerType: IncomingCallerType | null;
  simulateInboundCall: (callerType?: IncomingCallerType) => void;
};

const CallSystemDemoContext = createContext<CallSystemDemoContextValue | null>(null);

export function CallSystemDemoProvider({ children }: { children: ReactNode }) {
  const [callSystemEnabled, setCallSystemEnabled] = useState(false);
  const [inboundCallRequest, setInboundCallRequest] = useState(0);
  const [inboundCallerType, setInboundCallerType] = useState<IncomingCallerType | null>(null);

  const toggleCallSystemEnabled = useCallback(() => {
    setCallSystemEnabled((v) => !v);
  }, []);

  const simulateInboundCall = useCallback((callerType: IncomingCallerType = "resident") => {
    setInboundCallerType(callerType);
    setInboundCallRequest((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      callSystemEnabled,
      setCallSystemEnabled,
      toggleCallSystemEnabled,
      inboundCallRequest,
      inboundCallerType,
      simulateInboundCall,
    }),
    [callSystemEnabled, toggleCallSystemEnabled, inboundCallRequest, inboundCallerType, simulateInboundCall]
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

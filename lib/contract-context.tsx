"use client";

import { createContext, useContext, useState } from "react";

type ContractContextValue = {
  contracted: boolean;
  setContracted: (v: boolean) => void;
  r1Mode: boolean;
  setR1Mode: (v: boolean) => void;
};

const ContractContext = createContext<ContractContextValue | null>(null);

export function ContractProvider({ children }: { children: React.ReactNode }) {
  const [contracted, setContracted] = useState(true);
  const [r1Mode, setR1Mode] = useState(false);

  return (
    <ContractContext.Provider value={{ contracted, setContracted, r1Mode, setR1Mode }}>
      {children}
    </ContractContext.Provider>
  );
}

export function useContract() {
  const ctx = useContext(ContractContext);
  if (!ctx) throw new Error("useContract must be used within ContractProvider");
  return ctx;
}

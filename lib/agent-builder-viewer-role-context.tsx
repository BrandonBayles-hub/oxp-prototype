"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ViewerRole = "admin-with-flag" | "read-only";

const STORAGE_KEY = "oxp:agent-builder-viewer-role";
const CONTRACT_STORAGE_KEY = "oxp:agent-builder-contracted-properties";

interface AgentBuilderViewerRoleContextValue {
  viewerRole: ViewerRole;
  setViewerRole: (role: ViewerRole) => void;
  canCreate: boolean;
  canEdit: boolean;
  /** True when at least one property is contracted */
  isContracted: boolean;
  /** IDs of properties that have been contracted for premium/AI agents */
  contractedPropertyIds: string[];
  /** Replace the full set of contracted property IDs */
  setContractedPropertyIds: (ids: string[]) => void;
  /** Add properties to the contracted set (merges with existing) */
  addContractedProperties: (ids: string[]) => void;
  /** Reset to non-contracted state */
  clearContract: () => void;
}

const Ctx = createContext<AgentBuilderViewerRoleContextValue | null>(null);

export function AgentBuilderViewerRoleProvider({ children }: { children: React.ReactNode }) {
  const [viewerRole, setRoleState] = useState<ViewerRole>("admin-with-flag");
  const [contractedPropertyIds, setContractedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "read-only") setRoleState(stored);
      const contractStored = localStorage.getItem(CONTRACT_STORAGE_KEY);
      if (contractStored) {
        const parsed = JSON.parse(contractStored);
        if (Array.isArray(parsed)) setContractedIds(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const setViewerRole = useCallback((role: ViewerRole) => {
    setRoleState(role);
    try { localStorage.setItem(STORAGE_KEY, role); } catch { /* ignore */ }
  }, []);

  const persistIds = useCallback((ids: string[]) => {
    setContractedIds(ids);
    try { localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }, []);

  const setContractedPropertyIds = useCallback((ids: string[]) => {
    persistIds(ids);
  }, [persistIds]);

  const addContractedProperties = useCallback((ids: string[]) => {
    setContractedIds((prev) => {
      const merged = Array.from(new Set([...prev, ...ids]));
      try { localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
      return merged;
    });
  }, []);

  const clearContract = useCallback(() => {
    persistIds([]);
  }, [persistIds]);

  const isContracted = contractedPropertyIds.length > 0;

  const value = useMemo<AgentBuilderViewerRoleContextValue>(() => ({
    viewerRole,
    setViewerRole,
    canCreate: viewerRole !== "read-only",
    canEdit: viewerRole !== "read-only",
    isContracted,
    contractedPropertyIds,
    setContractedPropertyIds,
    addContractedProperties,
    clearContract,
  }), [viewerRole, setViewerRole, isContracted, contractedPropertyIds, setContractedPropertyIds, addContractedProperties, clearContract]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAgentBuilderViewerRole() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAgentBuilderViewerRole must be used within AgentBuilderViewerRoleProvider");
  return ctx;
}

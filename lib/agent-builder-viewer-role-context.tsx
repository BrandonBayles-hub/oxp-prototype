"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ViewerRole = "admin-with-flag" | "read-only";

const STORAGE_KEY = "oxp:agent-builder-viewer-role";

interface AgentBuilderViewerRoleContextValue {
  viewerRole: ViewerRole;
  setViewerRole: (role: ViewerRole) => void;
  canCreate: boolean;
  canEdit: boolean;
}

const Ctx = createContext<AgentBuilderViewerRoleContextValue | null>(null);

export function AgentBuilderViewerRoleProvider({ children }: { children: React.ReactNode }) {
  const [viewerRole, setRoleState] = useState<ViewerRole>("admin-with-flag");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "read-only") setRoleState(stored);
    } catch { /* ignore */ }
  }, []);

  const setViewerRole = useCallback((role: ViewerRole) => {
    setRoleState(role);
    try { localStorage.setItem(STORAGE_KEY, role); } catch { /* ignore */ }
  }, []);

  const value = useMemo<AgentBuilderViewerRoleContextValue>(() => ({
    viewerRole,
    setViewerRole,
    canCreate: viewerRole !== "read-only",
    canEdit: viewerRole !== "read-only",
  }), [viewerRole, setViewerRole]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAgentBuilderViewerRole() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAgentBuilderViewerRole must be used within AgentBuilderViewerRoleProvider");
  return ctx;
}

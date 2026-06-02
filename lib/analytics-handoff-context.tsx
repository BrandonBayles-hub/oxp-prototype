"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Artifact } from "@/lib/entrata-experts-v2/types";
import {
  SendToAnalyticsDialog,
  type HandoffContext,
} from "@/components/entrata-experts-v2/chat/send-to-analytics-dialog";

// ──────────────────────────────────────────────────────────────────────────
// Entrata Analyst → Analytics Platform handoff
// -----------------------------------------------------------------------------
// Demo-gated bridge that lets a user publish an Analyst answer artifact (table,
// chart, KPI strip) into the Analytics Platform library / My Workspace /
// Company Menu. Implements the handoff design doc:
//   docs/product/ENTRATA-ANALYST-AND-ANALYTICS-PLATFORM-HANDOFF.md
//
// The provider owns:
//   • the demo toggle (`handoffEnabled`, persisted to localStorage)
//   • the single shared destination dialog (opened from an artifact button or
//     the `/send-to-analytics` chat command)
//
// Default OFF — this is an internal/demo capability surfaced via the Demo menu.
// ──────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "oxp:analytics-handoff";

interface HandoffTarget {
  artifact: Artifact;
  context?: HandoffContext;
}

interface AnalyticsHandoffContextValue {
  handoffEnabled: boolean;
  setHandoffEnabled: (v: boolean) => void;
  toggleHandoffEnabled: () => void;
  /** Open the destination dialog for a given artifact. */
  openHandoff: (artifact: Artifact, context?: HandoffContext) => void;
}

const Ctx = createContext<AnalyticsHandoffContextValue | null>(null);

export function AnalyticsHandoffProvider({ children }: { children: React.ReactNode }) {
  const [handoffEnabled, setEnabledState] = useState(false);
  const [target, setTarget] = useState<HandoffTarget | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setEnabledState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setHandoffEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleHandoffEnabled = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const openHandoff = useCallback(
    (artifact: Artifact, context?: HandoffContext) => {
      setTarget({ artifact, context });
    },
    [],
  );

  const value = useMemo<AnalyticsHandoffContextValue>(
    () => ({ handoffEnabled, setHandoffEnabled, toggleHandoffEnabled, openHandoff }),
    [handoffEnabled, setHandoffEnabled, toggleHandoffEnabled, openHandoff],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {target && (
        <SendToAnalyticsDialog
          open={!!target}
          artifact={target.artifact}
          context={target.context}
          onClose={() => setTarget(null)}
        />
      )}
    </Ctx.Provider>
  );
}

export function useAnalyticsHandoff() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useAnalyticsHandoff must be used within AnalyticsHandoffProvider",
    );
  }
  return ctx;
}

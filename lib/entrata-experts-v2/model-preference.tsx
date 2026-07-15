"use client";

import * as React from "react";
import type { ModelId } from "./types";

// =============================================================================
// User model preference — the "sticky last-selected model"
// -----------------------------------------------------------------------------
// Layer 2 of the model resolution stack (see admin-policy-context.tsx). When a
// user picks a model in any user-initiated composer (Analyst, Report Analyzer
// follow-ups, …) we remember it here as their personal default. The next
// conversation opens on that model instead of asking again — the same sticky
// behavior as Cursor's model picker.
//
// Persisted globally per user (one preference across surfaces), not per thread.
// The admin allow-list still gates it: resolution helpers re-point to the admin
// default if a remembered model is no longer permitted.
// =============================================================================

const STORAGE_KEY = "oxp:experts:last-model:v1";

interface ModelPreferenceContextValue {
  /** The user's last explicitly-selected model, or null if they've never picked. */
  lastModel: ModelId | null;
  /** Remember a model as the user's personal default. Ignores "auto". */
  setLastModel: (model: ModelId) => void;
  /** Forget the preference (falls back to the admin default everywhere). */
  clearLastModel: () => void;
}

const ModelPreferenceContext =
  React.createContext<ModelPreferenceContextValue | null>(null);

export function ModelPreferenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lastModel, setLast] = React.useState<ModelId | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLast(JSON.parse(raw) as ModelId);
    } catch {
      /* ignore corrupted state */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      if (lastModel) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lastModel));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore quota */
    }
  }, [lastModel, hydrated]);

  const setLastModel = React.useCallback((model: ModelId) => {
    // "auto" is a routing placeholder, not a real pick — never make it sticky.
    if (!model || model === "auto") return;
    setLast(model);
  }, []);

  const clearLastModel = React.useCallback(() => setLast(null), []);

  return (
    <ModelPreferenceContext.Provider
      value={{ lastModel, setLastModel, clearLastModel }}
    >
      {children}
    </ModelPreferenceContext.Provider>
  );
}

export function useModelPreference(): ModelPreferenceContextValue {
  const ctx = React.useContext(ModelPreferenceContext);
  if (!ctx) {
    throw new Error(
      "useModelPreference must be used within a ModelPreferenceProvider",
    );
  }
  return ctx;
}

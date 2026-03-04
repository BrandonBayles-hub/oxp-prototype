"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/* ─────────────────────────────── Types ──────────────────────────────── */

export type FeatureId =
  | "ai-agents"
  | "workflows"
  | "voice"
  | "governance"
  | "performance-analytics"
  | "trainings-sop"
  | "command-center"
  | "escalations";

export type ContractedView = "contracted" | "not-contracted";

export type Feature = {
  id: FeatureId;
  name: string;
  route: string;
  contracted: boolean;
};

/* ─────────────────────────────── Defaults ───────────────────────────── */

const DEFAULT_FEATURES: Feature[] = [
  { id: "ai-agents", name: "AI Agents", route: "/agent-roster", contracted: true },
  { id: "workflows", name: "Workflows", route: "/workflows", contracted: true },
  { id: "voice", name: "Voice", route: "/voice", contracted: true },
  { id: "governance", name: "Governance", route: "/governance", contracted: true },
  { id: "performance-analytics", name: "Performance Analytics", route: "/performance", contracted: true },
  { id: "trainings-sop", name: "Trainings & SOP", route: "/trainings-sop", contracted: true },
  { id: "command-center", name: "Command Center", route: "/command-center", contracted: true },
  { id: "escalations", name: "Escalations", route: "/escalations", contracted: true },
];

/* ─────────────────────────────── Storage ────────────────────────────── */

const STORAGE_KEY = "janet-poc-feature-entitlements";
const VIEW_MODE_KEY = "janet-poc-contracted-view";

function loadFeatures(): Feature[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveFeatures(features: Feature[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
  } catch { /* ignore */ }
}

function loadViewMode(): ContractedView {
  if (typeof window === "undefined") return "contracted";
  try {
    const raw = localStorage.getItem(VIEW_MODE_KEY);
    if (raw === "contracted" || raw === "not-contracted") return raw;
  } catch { /* ignore */ }
  return "contracted";
}

function saveViewMode(mode: ContractedView) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch { /* ignore */ }
}

function mergeFeatures(saved: Feature[] | null): Feature[] {
  if (!saved) return DEFAULT_FEATURES;
  return DEFAULT_FEATURES.map((def) => {
    const s = saved.find((f) => f.id === def.id);
    return s ? { ...def, contracted: s.contracted } : def;
  });
}

/* ─────────────────────────────── Context ────────────────────────────── */

type FeatureEntitlementsContextValue = {
  features: Feature[];
  viewMode: ContractedView;
  setViewMode: (mode: ContractedView) => void;
  /** Returns false when the global toggle is "not-contracted", true when "contracted". */
  isContracted: (featureId: FeatureId) => boolean;
  toggleFeature: (featureId: FeatureId) => void;
};

const FeatureEntitlementsContext = createContext<FeatureEntitlementsContextValue | null>(null);

export function FeatureEntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<Feature[]>(() => mergeFeatures(null));
  const [viewMode, setViewModeState] = useState<ContractedView>("contracted");

  useEffect(() => {
    setFeatures(mergeFeatures(loadFeatures()));
    setViewModeState(loadViewMode());
  }, []);

  const setViewMode = useCallback((mode: ContractedView) => {
    setViewModeState(mode);
    saveViewMode(mode);
  }, []);

  const isContracted = useCallback(
    (featureId: FeatureId) => {
      if (viewMode === "not-contracted") return false;
      return DEFAULT_FEATURES.find((f) => f.id === featureId)?.contracted ?? true;
    },
    [viewMode],
  );

  const toggleFeature = useCallback((featureId: FeatureId) => {
    setFeatures((prev) => {
      const next = prev.map((f) =>
        f.id === featureId ? { ...f, contracted: !f.contracted } : f,
      );
      saveFeatures(next);
      return next;
    });
  }, []);

  return (
    <FeatureEntitlementsContext.Provider value={{ features, viewMode, setViewMode, isContracted, toggleFeature }}>
      {children}
    </FeatureEntitlementsContext.Provider>
  );
}

export function useFeatureEntitlements() {
  const ctx = useContext(FeatureEntitlementsContext);
  if (!ctx) throw new Error("useFeatureEntitlements must be used within FeatureEntitlementsProvider");
  return ctx;
}

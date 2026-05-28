"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// ──────────────────────────────────────────────────────────────────────────────
// Entrata Experts release versioning
// -----------------------------------------------------------------------------
// Demo/internal-only control that lets the team flip between progressively
// richer release scopes for the Entrata Experts product surface:
//
//   v1.0  — MVP. Hub + Entrata Analyst + all pre-built Assistants + Report
//           Analyzer + suggested prompts + citations + artifacts + threads
//           sidebar + recent-conversations hub rail. No admin, no billing.
//   v1.1  — Admin observability lands: Admin Insights → Entrata Experts with
//           Activity log + Knowledge gaps. Memory chips unlock for users.
//   v1.2  — Scale story: Tokens & Usage tab (all sub-tabs) + full Admin
//           Insights tab set (Clusters + Automation candidates).
//   full  — Everything in v1.2 + future surface area.
//
// Components read `useEntrataExpertsRelease()` and call `atLeast("v1.1")` to
// gate features. The default is "full" so the prototype renders the complete
// experience unless someone explicitly downgrades via the demo selector.
// ──────────────────────────────────────────────────────────────────────────────

export type EntrataExpertsVersion = "v1.0" | "v1.1" | "v1.2" | "full";

export const ENTRATA_EXPERTS_VERSIONS: {
  id: EntrataExpertsVersion;
  label: string;
  tagline: string;
}[] = [
  { id: "v1.0", label: "v1.0", tagline: "MVP — Hub, Analyst, Assistants, Report Analyzer, history" },
  { id: "v1.1", label: "v1.1", tagline: "+ Admin Insights, memory" },
  { id: "v1.2", label: "v1.2", tagline: "+ Tokens & Usage" },
  { id: "full", label: "Full", tagline: "All current + roadmap features" },
];

const VERSION_ORDER: EntrataExpertsVersion[] = [
  "v1.0",
  "v1.1",
  "v1.2",
  "full",
];

const STORAGE_KEY = "oxp:entrata-experts-release";
const DEFAULT_VERSION: EntrataExpertsVersion = "full";

interface EntrataExpertsReleaseContextValue {
  version: EntrataExpertsVersion;
  setVersion: (v: EntrataExpertsVersion) => void;
  /** Returns true if the current version is >= the target version. */
  atLeast: (target: EntrataExpertsVersion) => boolean;
}

const Ctx = createContext<EntrataExpertsReleaseContextValue | null>(null);

export function EntrataExpertsReleaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [version, setVersionState] =
    useState<EntrataExpertsVersion>(DEFAULT_VERSION);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VERSION_ORDER.includes(stored as EntrataExpertsVersion)) {
        setVersionState(stored as EntrataExpertsVersion);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setVersion = useCallback((v: EntrataExpertsVersion) => {
    setVersionState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<EntrataExpertsReleaseContextValue>(() => {
    const currentIdx = VERSION_ORDER.indexOf(version);
    return {
      version,
      setVersion,
      atLeast: (target) => VERSION_ORDER.indexOf(target) <= currentIdx,
    };
  }, [version, setVersion]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntrataExpertsRelease() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useEntrataExpertsRelease must be used within EntrataExpertsReleaseProvider",
    );
  }
  return ctx;
}

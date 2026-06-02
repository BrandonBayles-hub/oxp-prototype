"use client";

import * as React from "react";
import { MODELS, type ModelDef } from "./lenses";
import type { ModelId } from "./types";

// =============================================================================
// Entrata Experts admin policy
// -----------------------------------------------------------------------------
// Modeled on Cursor's enterprise admin pattern: an org-wide default plus a
// sparse map of overrides keyed by scope. At runtime the effective policy for
// a given user is computed by walking from broadest scope (org) to narrowest
// (user), with later layers overriding earlier ones:
//
//     org default → property override → group override → user override
//
// In v1 only spend caps and model access are scope-overridable. Surface
// toggles (Analyst / Assistants / Report Analyzer) are global only.
// =============================================================================

export type ScopeKind = "user" | "group" | "property";

/** Composite key used as the override map key, e.g. "group:eg-leasing". */
export type ScopeKey = `${ScopeKind}:${string}`;

export function makeScopeKey(kind: ScopeKind, id: string): ScopeKey {
  return `${kind}:${id}` as ScopeKey;
}

export function parseScopeKey(key: ScopeKey): { kind: ScopeKind; id: string } {
  const [kind, ...rest] = key.split(":");
  return { kind: kind as ScopeKind, id: rest.join(":") };
}

// -----------------------------------------------------------------------------
// Policy shapes
// -----------------------------------------------------------------------------

export interface SurfacePolicy {
  analyst: boolean;
  assistants: boolean;
  reportAnalyzer: boolean;
}

export interface SpendPolicy {
  /** Monthly token cap. `null` means no cap. */
  monthlyTokenCap: number | null;
  /** Monthly on-demand $ cap (for overage beyond included tokens). `null` means no cap. */
  monthlyDollarCap: number | null;
  /** Soft-alert thresholds as percentages, e.g. [50, 80, 100]. */
  alertThresholds: number[];
}

export interface ModelPolicy {
  /**
   * Set of model ids the scope is allowed to use. Treated as an allow-list:
   * - empty array → no model access at all
   * - all model ids → unrestricted (matches the org default behavior today)
   */
  allowedModels: ModelId[];
}

export interface ExpertsPolicy {
  surfaces: SurfacePolicy;
  spend: {
    default: SpendPolicy;
    overrides: Record<ScopeKey, Partial<SpendPolicy>>;
  };
  models: {
    default: ModelPolicy;
    overrides: Record<ScopeKey, ModelPolicy>;
  };
}

// -----------------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------------

export const DEFAULT_SURFACE_POLICY: SurfacePolicy = {
  analyst: true,
  assistants: true,
  reportAnalyzer: true,
};

export const DEFAULT_SPEND_POLICY: SpendPolicy = {
  // Mirrors the existing TOKEN_CAP / ON_DEMAND_CAP constants in the
  // credits-usage component so the seeded policy tracks reality.
  monthlyTokenCap: 50_000_000,
  monthlyDollarCap: 250,
  alertThresholds: [50, 80, 100],
};

export const DEFAULT_MODEL_POLICY: ModelPolicy = {
  allowedModels: MODELS.map((m) => m.id),
};

export const DEFAULT_EXPERTS_POLICY: ExpertsPolicy = {
  surfaces: DEFAULT_SURFACE_POLICY,
  spend: { default: DEFAULT_SPEND_POLICY, overrides: {} },
  models: { default: DEFAULT_MODEL_POLICY, overrides: {} },
};

// -----------------------------------------------------------------------------
// Resolution helpers
// -----------------------------------------------------------------------------

export interface ResolutionContext {
  userId?: string;
  /** All groups the user belongs to. Order is irrelevant — first override wins. */
  groupIds?: string[];
  propertyId?: string;
}

/** Walk org → property → group → user, collecting the most specific override. */
export function resolveEffectiveSpend(
  policy: ExpertsPolicy,
  ctx: ResolutionContext,
): SpendPolicy {
  let effective: SpendPolicy = { ...policy.spend.default };

  if (ctx.propertyId) {
    const o = policy.spend.overrides[makeScopeKey("property", ctx.propertyId)];
    if (o) effective = { ...effective, ...o };
  }
  if (ctx.groupIds?.length) {
    for (const gid of ctx.groupIds) {
      const o = policy.spend.overrides[makeScopeKey("group", gid)];
      if (o) effective = { ...effective, ...o };
    }
  }
  if (ctx.userId) {
    const o = policy.spend.overrides[makeScopeKey("user", ctx.userId)];
    if (o) effective = { ...effective, ...o };
  }

  return effective;
}

/**
 * Model overrides are not partial — a scope either has a full allow-list or
 * uses the default. If multiple scopes match, the narrowest wins (user >
 * group > property > org).
 */
export function resolveEffectiveModels(
  policy: ExpertsPolicy,
  ctx: ResolutionContext,
): ModelPolicy {
  if (ctx.userId) {
    const o = policy.models.overrides[makeScopeKey("user", ctx.userId)];
    if (o) return o;
  }
  if (ctx.groupIds?.length) {
    for (const gid of ctx.groupIds) {
      const o = policy.models.overrides[makeScopeKey("group", gid)];
      if (o) return o;
    }
  }
  if (ctx.propertyId) {
    const o = policy.models.overrides[makeScopeKey("property", ctx.propertyId)];
    if (o) return o;
  }
  return policy.models.default;
}

/** Convenience: list `ModelDef`s matching the effective allow-list. */
export function resolveEffectiveModelDefs(
  policy: ExpertsPolicy,
  ctx: ResolutionContext,
): ModelDef[] {
  const allowed = new Set(resolveEffectiveModels(policy, ctx).allowedModels);
  return MODELS.filter((m) => allowed.has(m.id));
}

// -----------------------------------------------------------------------------
// Provider + persistence
// -----------------------------------------------------------------------------

const STORAGE_KEY = "oxp:experts:admin-policy:v1";

interface ExpertsPolicyContextValue {
  policy: ExpertsPolicy;
  setPolicy: React.Dispatch<React.SetStateAction<ExpertsPolicy>>;
  /** Replace policy entirely (used by Save in the admin sheet). */
  savePolicy: (next: ExpertsPolicy) => void;
  /** Reset to seeded defaults (no overrides). */
  resetPolicy: () => void;
}

const ExpertsPolicyContext =
  React.createContext<ExpertsPolicyContextValue | null>(null);

export function ExpertsPolicyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [policy, setPolicy] = React.useState<ExpertsPolicy>(
    DEFAULT_EXPERTS_POLICY,
  );
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ExpertsPolicy>;
        // Merge against defaults so newly-added fields (e.g. a future
        // alertThresholds change) don't break older persisted state.
        setPolicy({
          surfaces: {
            ...DEFAULT_SURFACE_POLICY,
            ...(parsed.surfaces ?? {}),
          },
          spend: {
            default: {
              ...DEFAULT_SPEND_POLICY,
              ...(parsed.spend?.default ?? {}),
            },
            overrides: parsed.spend?.overrides ?? {},
          },
          models: {
            default: {
              ...DEFAULT_MODEL_POLICY,
              ...(parsed.models?.default ?? {}),
            },
            overrides: parsed.models?.overrides ?? {},
          },
        });
      }
    } catch {
      /* ignore corrupted state */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(policy));
    } catch {
      /* ignore quota */
    }
  }, [policy, hydrated]);

  const savePolicy = React.useCallback(
    (next: ExpertsPolicy) => setPolicy(next),
    [],
  );
  const resetPolicy = React.useCallback(
    () => setPolicy(DEFAULT_EXPERTS_POLICY),
    [],
  );

  return (
    <ExpertsPolicyContext.Provider
      value={{ policy, setPolicy, savePolicy, resetPolicy }}
    >
      {children}
    </ExpertsPolicyContext.Provider>
  );
}

export function useExpertsPolicy(): ExpertsPolicyContextValue {
  const ctx = React.useContext(ExpertsPolicyContext);
  if (!ctx) {
    throw new Error(
      "useExpertsPolicy must be used within an ExpertsPolicyProvider",
    );
  }
  return ctx;
}

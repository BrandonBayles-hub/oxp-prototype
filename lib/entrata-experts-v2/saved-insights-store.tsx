"use client";
import * as React from "react";
import type { Artifact, Depth, LensId, ModelId, SavedInsight, Scope } from "./types";

// =============================================================================
// Saved Insights store
// -----------------------------------------------------------------------------
// Entrata Experts owns the Saved Insights library. A Saved Insight is just a
// condensed, parameterized prompt — it re-runs live each time it's called.
// The library lives in localStorage (durable across tabs/sessions), unlike
// the per-session shared chat history in history-store.tsx.
//
// Surfaces that read this:
//   - Composer slash-command popover (`/insight-name` to re-run)
//   - Saved Insights library panel (run / rename / delete / send to AP)
//   - Send-to-Analytics dialog (when target = dashboard or packet)
//
// Surfaces that write this:
//   - Chat artifact "Save to Insights"
//   - Admin "Promote to a Saved Insight" (cluster-list + automation-candidates)
// =============================================================================

interface CreateInput {
  name: string;
  prompt: string;
  lens: LensId;
  depth: Depth;
  model: ModelId;
  scope: Scope;
  source: SavedInsight["source"];
  lastResult?: Artifact[];
}

interface RenameInput {
  name: string;
}

export interface SavedInsightsValue {
  /** All saved insights, newest-updated first. */
  insights: SavedInsight[];
  /** Look up by slug — used by the `/` command resolver. */
  getBySlug: (slug: string) => SavedInsight | undefined;
  /** Look up by id — used by management UI. */
  getById: (id: string) => SavedInsight | undefined;
  /** Create and persist; returns the new insight (with id + slug assigned). */
  create: (input: CreateInput) => SavedInsight;
  rename: (id: string, patch: RenameInput) => void;
  remove: (id: string) => void;
  /** Update the cached `lastResult` artifacts after a re-run. */
  recordRun: (id: string, lastResult: Artifact[]) => void;
  clearAll: () => void;

  // ---------------------------------------------------------------------------
  // Cross-surface "run this insight inside Analyst" handoff.
  //
  // The Saved Insights library panel is a sibling of `AnalystChat` (each
  // surface mounts its own `useChatStore`), so the panel can't fire
  // `store.send` directly. Instead it queues a `pendingRun` and navigates
  // the hub to Analyst; `ChatView` calls `consumePendingRun()` on mount and
  // dispatches the actual send.
  // ---------------------------------------------------------------------------
  pendingRun: SavedInsight | null;
  setPendingRun: (i: SavedInsight | null) => void;
  consumePendingRun: () => SavedInsight | null;
}

const Ctx = React.createContext<SavedInsightsValue | null>(null);

const STORAGE_KEY = "oxp:experts-v2:saved-insights";

/**
 * Normalize an arbitrary name into a `/`-safe, hyphenated slug.
 * Reserved words are stripped so we don't collide with `/send-to-analytics`.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Ensure a slug is unique across the library by appending `-2`, `-3`, …
 * Used both when creating from scratch and (rare) when an existing slug
 * collides on rename.
 */
function uniqueSlug(base: string, existing: SavedInsight[]): string {
  const used = new Set(existing.map((i) => i.slug));
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function loadPersisted(): SavedInsight[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedInsight[]) : [];
  } catch {
    return [];
  }
}

export function SavedInsightsProvider({ children }: { children: React.ReactNode }) {
  const [insights, setInsights] = React.useState<SavedInsight[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  // pendingRun is deliberately not persisted — it's a transient navigation
  // hint between the library panel and AnalystChat.
  const [pendingRun, setPendingRunState] = React.useState<SavedInsight | null>(null);

  React.useEffect(() => {
    setInsights(loadPersisted());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(insights));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [insights, hydrated]);

  const getBySlug = React.useCallback(
    (slug: string) => insights.find((i) => i.slug === slug),
    [insights],
  );
  const getById = React.useCallback(
    (id: string) => insights.find((i) => i.id === id),
    [insights],
  );

  const create = React.useCallback((input: CreateInput): SavedInsight => {
    const now = new Date().toISOString();
    let made!: SavedInsight;
    setInsights((prev) => {
      const slug = uniqueSlug(slugify(input.name) || "insight", prev);
      made = {
        id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        slug,
        name: input.name.trim() || "Untitled insight",
        prompt: input.prompt,
        lens: input.lens,
        depth: input.depth,
        model: input.model,
        scope: input.scope,
        source: input.source,
        createdAt: now,
        updatedAt: now,
        lastResult: input.lastResult,
      };
      return [made, ...prev];
    });
    return made;
  }, []);

  const rename = React.useCallback((id: string, patch: RenameInput) => {
    setInsights((prev) => {
      const others = prev.filter((i) => i.id !== id);
      const target = prev.find((i) => i.id === id);
      if (!target) return prev;
      const desired = slugify(patch.name) || target.slug;
      const slug = desired === target.slug ? target.slug : uniqueSlug(desired, others);
      const updated: SavedInsight = {
        ...target,
        name: patch.name.trim() || target.name,
        slug,
        updatedAt: new Date().toISOString(),
      };
      return [updated, ...others];
    });
  }, []);

  const remove = React.useCallback((id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const recordRun = React.useCallback((id: string, lastResult: Artifact[]) => {
    setInsights((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const updated: SavedInsight = {
        ...prev[idx],
        lastResult,
        updatedAt: new Date().toISOString(),
      };
      const rest = prev.filter((_, i) => i !== idx);
      return [updated, ...rest];
    });
  }, []);

  const clearAll = React.useCallback(() => setInsights([]), []);

  const setPendingRun = React.useCallback(
    (i: SavedInsight | null) => setPendingRunState(i),
    [],
  );

  const consumePendingRun = React.useCallback(() => {
    const next = pendingRun;
    if (next) setPendingRunState(null);
    return next;
  }, [pendingRun]);

  const value = React.useMemo<SavedInsightsValue>(
    () => ({
      insights,
      getBySlug,
      getById,
      create,
      rename,
      remove,
      recordRun,
      clearAll,
      pendingRun,
      setPendingRun,
      consumePendingRun,
    }),
    [
      insights,
      getBySlug,
      getById,
      create,
      rename,
      remove,
      recordRun,
      clearAll,
      pendingRun,
      setPendingRun,
      consumePendingRun,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSavedInsights(): SavedInsightsValue {
  const v = React.useContext(Ctx);
  if (!v) {
    throw new Error(
      "useSavedInsights must be used within a SavedInsightsProvider",
    );
  }
  return v;
}

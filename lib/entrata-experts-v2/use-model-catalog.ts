"use client";
import * as React from "react";
import { MODELS } from "./lenses";
import type { ModelOption } from "./llm/model-catalog";

// =============================================================================
// useModelCatalog — the model picker's source of truth.
// -----------------------------------------------------------------------------
// Fetches the live model list from the LiteLLM proxy (via /api/experts/models)
// once per session and caches it. Falls back to the curated static defaults
// (MODELS) when the proxy is unconfigured or unreachable, so the picker always
// has something sensible to show.
// =============================================================================

// The curated defaults shipped with the prototype (includes the leading "auto").
const STATIC: ModelOption[] = MODELS.map((m) => ({ ...m }));
const AUTO: ModelOption = STATIC.find((m) => m.id === "auto") ?? STATIC[0];

export type CatalogSource = "static" | "live";

export interface ModelCatalog {
  /** Full option list, "auto" first. */
  models: ModelOption[];
  byId: Record<string, ModelOption>;
  source: CatalogSource;
  loading: boolean;
}

// Module-level cache so every picker instance shares one fetch per page load.
let cache: ModelOption[] | null = null;

export function useModelCatalog(): ModelCatalog {
  const [models, setModels] = React.useState<ModelOption[]>(cache ?? STATIC);
  const [source, setSource] = React.useState<CatalogSource>(cache ? "live" : "static");
  const [loading, setLoading] = React.useState(!cache);

  React.useEffect(() => {
    if (cache) return; // already resolved this session
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/experts/models/");
        const data = await res.json().catch(() => null);
        if (
          !cancelled &&
          res.ok &&
          data?.ok &&
          Array.isArray(data.models) &&
          data.models.length > 0
        ) {
          const live = (data.models as ModelOption[]).filter((m) => m.id !== "auto");
          const next = [AUTO, ...live];
          cache = next;
          setModels(next);
          setSource("live");
        }
      } catch {
        /* keep the static fallback */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = React.useMemo(
    () =>
      models.reduce<Record<string, ModelOption>>((acc, m) => {
        acc[m.id] = m;
        return acc;
      }, {}),
    [models],
  );

  return { models, byId, source, loading };
}

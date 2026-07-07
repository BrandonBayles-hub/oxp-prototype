/**
 * Catalog of Entrata APIs surfaced to the Agent Builder wizard.
 *
 * The raw data is generated from the authoritative OpenAPI YAML specs shipped
 * with the Entrata monolith (the same specs that power
 * https://docs.entrata.com/api/v1/documentation for public RPCs, plus the
 * per-domain internal Slim Swagger specs). See:
 *   - `entrata-api-catalog.generated.ts`   — raw endpoints + source metadata
 *   - `scripts/build-api-catalog.mjs`      — generator (regen via
 *                                            `npm run gen:api-catalog`)
 *   - `Applications/Entrata/Api/app/Actions/Internal/AgentBuilder/V1/
 *      GetApiCatalogAction.php`            — PHP Action that produces the
 *                                            identical shape at runtime
 *                                            (scaffolded, not yet wired)
 *
 * This file is the *view* the wizard consumes — it maps the raw entries into
 * the shape the UI already renders, including:
 *   - `operation` → Data Access (reads) vs. Skills (actions)
 *   - `exposure`  → public (partner) vs. private (internal REST)
 *   - `category`  → UI bucket derived via `mapApiCategory()`
 *
 * If you see a bug in the list, regenerate first — odds are the source YAML
 * changed.
 */

import {
  GENERATED_API_ENTRIES,
  type GeneratedApiEntry,
} from "./entrata-api-catalog.generated";
import { mapApiCategory } from "./entrata-api-catalog-categories";

export type ApiExposure = "public" | "private";
export type ApiOperation = "read" | "action";

/**
 * Category is now a derived string (not a fixed union) because the set of
 * categories is driven by the generator's bucket list and the tags present
 * in the specs. The wizard treats it as an opaque grouping key.
 */
export type ApiCategory = string;

export type EntrataApiEntry = {
  /** Stable, prefixed id used for form state. */
  id: string;
  /** Short, human-facing label — displayed in the list. */
  label: string;
  /** One-liner describing what the endpoint does. */
  description: string;
  /** Which wizard section this belongs under. */
  operation: ApiOperation;
  /** Public partner API or internal REST? */
  exposure: ApiExposure;
  category: ApiCategory;
  /**
   * Representative method / route shown as secondary text in the picker. For
   * public RPCs this is the `resource/method` pair (e.g. `applications/
   * getCompanyApplications`); for private REST APIs it's `VERB path`.
   */
  method?: string;
  /**
   * Sensitivity tier for "Data Access" entries only (read APIs). We can't
   * infer this from the spec; leave undefined until a human classifies.
   */
  sensitivity?: "low" | "medium" | "high";
  /** Whether an action requires a human sign-off before the agent runs it. */
  requiresApproval?: boolean;
  /** Keywords used by the inference layer to auto-select entries from a prompt. */
  keywords?: string[];
  /** Surfacing metadata retained so the UI / debug panels can cite the source. */
  httpVerb?: string;
  path?: string;
  /** Repo-relative YAML file this came from. */
  sourceFile?: string;
};

function methodDisplay(e: GeneratedApiEntry): string {
  if (e.surface === "public-rpc") {
    // The RPC URL template is `/{orgs}/v1/<resource>`; the partner-facing
    // method name is e.method. Show `resource/method` — matches the format
    // in the docs.entrata.com payload examples.
    const lastSeg = e.path
      .split("/")
      .filter((s) => s && !s.startsWith("{") && s !== "v1" && s !== "v2")
      .pop();
    return `${lastSeg ?? e.resource}/${e.method}`;
  }
  return `${e.httpVerb} ${e.path}`;
}

function keywordsFor(e: GeneratedApiEntry): string[] {
  const out = new Set<string>();
  for (const s of [e.resource, e.method, e.summary, e.path]) {
    if (!s) continue;
    for (const token of String(s)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2)) {
      out.add(token);
    }
  }
  return Array.from(out);
}

function toEntrataApiEntry(e: GeneratedApiEntry): EntrataApiEntry {
  const exposure: ApiExposure = e.surface === "public-rpc" ? "public" : "private";
  return {
    id: e.id,
    label: e.summary,
    description: e.description ?? e.summary,
    operation: e.operation,
    exposure,
    category: mapApiCategory(e.resource),
    method: methodDisplay(e),
    keywords: keywordsFor(e),
    httpVerb: e.httpVerb,
    path: e.path,
    sourceFile: e.sourceFile,
  };
}

/**
 * The catalog the wizard consumes — a pure derivation of the generated raw
 * entries. Order is preserved from the generator (sorted by surface →
 * resource → method).
 */
export const ENTRATA_API_CATALOG: EntrataApiEntry[] = GENERATED_API_ENTRIES.map(
  toEntrataApiEntry
);

/**
 * Convenience: the ordered list of categories that actually have entries.
 * Used by the wizard to render grouped sections.
 *
 * Ordering preference: categories that appear earlier in the generated list
 * come first, so the UI shows the same grouping the generator produced.
 */
export const ENTRATA_API_CATEGORIES: ApiCategory[] = Array.from(
  new Set(ENTRATA_API_CATALOG.map((e) => e.category))
);

export function filterApis(
  operation: ApiOperation,
  {
    query = "",
    exposure,
    category,
  }: {
    query?: string;
    exposure?: ApiExposure | "all";
    category?: ApiCategory | "all";
  } = {}
): EntrataApiEntry[] {
  const q = query.trim().toLowerCase();
  return ENTRATA_API_CATALOG.filter((e) => {
    if (e.operation !== operation) return false;
    if (exposure && exposure !== "all" && e.exposure !== exposure) return false;
    if (category && category !== "all" && e.category !== category) return false;
    if (!q) return true;
    return (
      e.label.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.method?.toLowerCase().includes(q) ?? false) ||
      (e.path?.toLowerCase().includes(q) ?? false) ||
      (e.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false)
    );
  });
}

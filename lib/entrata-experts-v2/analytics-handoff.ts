// Entrata Analyst → Analytics Platform handoff
// -----------------------------------------------------------------------------
// Pure (client-safe) helpers that turn an Analyst answer artifact into a
// payload the Analytics Platform can ingest via its chat-driven save endpoint
// (`POST /api/agent/dashboard/save`). The actual network call is proxied
// server-side through `/api/analytics-handoff` to dodge CORS and keep the
// platform URL off the client.
//
// Design doc: docs/product/ENTRATA-ANALYST-AND-ANALYTICS-PLATFORM-HANDOFF.md
//
// Two binding modes, matching the doc's phased build order:
//   • "snapshot"  (Phase 1, v1.0–v1.2) — the literal rows/series Analyst already
//                  computed, emitted as a `dash.text` markdown block. No metric
//                  catalog binding required, so it always compiles.
//   • "live"      (Phase 2, V1.3) — labels resolved to real Analytics Platform
//                  metric slugs (see metric-map.ts) and emitted as native
//                  `dash.kpi_strip` / `dash.line` / `dash.bar` / `dash.table`
//                  blocks the platform re-queries against the shared dictionary.

import type { Artifact, ArtifactKind } from "./types";
import { resolveDimensionSlug, resolveMetricSlug } from "./metric-map";

// ──────────────────────────────────────────────────────────────────────────
// Configuration + destinations
// ──────────────────────────────────────────────────────────────────────────

/** Client-visible base URL for deep links into the Analytics Platform. */
export const ANALYTICS_PLATFORM_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_ANALYTICS_PLATFORM_URL) ||
  "http://127.0.0.1:3001";

export type Tier = "PERSONAL" | "TEAM" | "COMPANY";

export interface Destination {
  tier: Tier;
  label: string;
  hint: string;
}

/** The three audience tiers, mapped 1:1 to the platform's `tier` field. */
export const DESTINATIONS: Destination[] = [
  { tier: "PERSONAL", label: "My Workspace", hint: "Only you" },
  { tier: "TEAM", label: "My Team", hint: "Your team" },
  { tier: "COMPANY", label: "Company Menu", hint: "Everyone" },
];

/** Preset Company Menu folders surfaced when COMPANY tier is chosen. */
export const COMPANY_FOLDERS = [
  "Operations",
  "Finance",
  "Leasing",
  "Renewals",
  "Executive",
] as const;

export type HandoffMode = "snapshot" | "live";

// ──────────────────────────────────────────────────────────────────────────
// Eligibility
// ──────────────────────────────────────────────────────────────────────────

const ELIGIBLE_KINDS: ReadonlySet<ArtifactKind> = new Set([
  "table",
  "bar-chart",
  "line-chart",
  "kpi-strip",
]);

/** Analytics artifacts can be handed off; a draft email cannot. */
export function isHandoffEligible(artifact: Pick<Artifact, "kind">): boolean {
  return ELIGIBLE_KINDS.has(artifact.kind);
}

// ──────────────────────────────────────────────────────────────────────────
// Python/DSL string helpers
// ──────────────────────────────────────────────────────────────────────────

function pyStr(s: string): string {
  return (
    '"' +
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n") +
    '"'
  );
}

function pyTriple(s: string): string {
  // Triple-quoted string for multi-line markdown. Defuse any embedded """.
  return '"""\n' + String(s).replace(/"""/g, '\\"\\"\\"') + '\n"""';
}

function pyList(items: string[]): string {
  return "[" + items.map((m) => `"${m}"`).join(", ") + "]";
}

// ──────────────────────────────────────────────────────────────────────────
// Snapshot mode — literal data as a markdown text block
// ──────────────────────────────────────────────────────────────────────────

function artifactToMarkdown(a: Artifact): string {
  const lines: string[] = [];
  if (a.kind === "table" && a.columns?.length) {
    lines.push("| " + a.columns.join(" | ") + " |");
    lines.push("| " + a.columns.map(() => "---").join(" | ") + " |");
    for (const row of a.rows ?? []) {
      lines.push("| " + row.map((c) => String(c)).join(" | ") + " |");
    }
  } else if (a.kind === "kpi-strip" && a.kpis?.length) {
    lines.push("| Metric | Value | Change |");
    lines.push("| --- | --- | --- |");
    for (const k of a.kpis) {
      lines.push(`| ${k.label} | ${k.value} | ${k.delta ?? "—"} |`);
    }
  } else if (
    (a.kind === "bar-chart" || a.kind === "line-chart") &&
    a.series?.length
  ) {
    const series = a.series;
    const xs = series[0]?.data.map((d) => d.x) ?? [];
    lines.push("| " + ["Period", ...series.map((s) => s.name)].join(" | ") + " |");
    lines.push("| " + ["---", ...series.map(() => "---")].join(" | ") + " |");
    xs.forEach((x, i) => {
      const cells = series.map((s) => String(s.data[i]?.y ?? ""));
      lines.push("| " + [x, ...cells].join(" | ") + " |");
    });
  } else {
    lines.push(`_${a.title}_`);
  }
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────────────────
// Live mode — native, catalog-bound dashboard blocks
// ──────────────────────────────────────────────────────────────────────────

interface LiveResult {
  blocks: string[];
  mapped: string[];
  unmapped: string[];
}

function dedupe(slugs: (string | null)[]): { mapped: string[]; unmapped: string[] } {
  const mapped: string[] = [];
  const unmapped: string[] = [];
  for (const s of slugs) {
    if (s && !mapped.includes(s)) mapped.push(s);
  }
  return { mapped, unmapped };
}

function artifactToLiveBlocks(a: Artifact): LiveResult {
  const unmapped: string[] = [];

  if (a.kind === "table" && a.columns?.length) {
    const [dimCol, ...metricCols] = a.columns;
    const groupBy = resolveDimensionSlug(dimCol);
    const mapped: string[] = [];
    for (const col of metricCols) {
      const slug = resolveMetricSlug(col);
      if (slug && !mapped.includes(slug)) mapped.push(slug);
      else if (!slug) unmapped.push(col);
    }
    if (mapped.length === 0) return { blocks: [], mapped: [], unmapped };
    return {
      blocks: [
        `dash.table(metrics=${pyList(mapped)}, group_by="${groupBy}", title=${pyStr(a.title)})`,
      ],
      mapped,
      unmapped,
    };
  }

  if (a.kind === "kpi-strip" && a.kpis?.length) {
    const mapped: string[] = [];
    for (const k of a.kpis) {
      const slug = resolveMetricSlug(k.label);
      if (slug && !mapped.includes(slug)) mapped.push(slug);
      else if (!slug) unmapped.push(k.label);
    }
    if (mapped.length === 0) return { blocks: [], mapped: [], unmapped };
    return {
      blocks: [`dash.kpi_strip(metrics=${pyList(mapped)}, title=${pyStr(a.title)})`],
      mapped,
      unmapped,
    };
  }

  if ((a.kind === "bar-chart" || a.kind === "line-chart") && a.series?.length) {
    const labels = a.series.map((s) => s.name);
    // Series names first; fall back to the artifact title (e.g. "Delinquency trend").
    const resolved = labels.map((l) => resolveMetricSlug(l));
    const titleSlug = resolveMetricSlug(a.title);
    const { mapped } = dedupe([...resolved, titleSlug]);
    labels.forEach((l, i) => {
      if (!resolved[i]) unmapped.push(l);
    });
    if (mapped.length === 0) return { blocks: [], mapped: [], unmapped };
    const verb = a.kind === "line-chart" ? "line" : "bar";
    const groupByArg = a.kind === "bar-chart" ? `, group_by="property"` : "";
    return {
      blocks: [
        `dash.${verb}(metrics=${pyList(mapped)}${groupByArg}, title=${pyStr(a.title)})`,
      ],
      mapped,
      unmapped,
    };
  }

  return { blocks: [], mapped: [], unmapped };
}

// ──────────────────────────────────────────────────────────────────────────
// Artifact → dashboard.py source
// ──────────────────────────────────────────────────────────────────────────

export interface DashboardSourceResult {
  /** The compilable dashboard.py source. */
  source: string;
  /** True when the artifact was emitted as live, catalog-bound blocks. */
  live: boolean;
  /** Metric slugs bound (live mode). */
  mappedMetrics: string[];
  /** Labels that couldn't be bound to a metric slug (live mode). */
  unmappedLabels: string[];
}

/**
 * Build the dashboard.py source for an artifact. In "live" mode we emit native
 * blocks when at least one metric resolves; otherwise we fall back to the
 * snapshot so the handoff always succeeds.
 */
export function artifactToDashboardSource(
  artifact: Artifact,
  opts: { mode: HandoffMode; title?: string },
): DashboardSourceResult {
  const title = (opts.title || artifact.title).trim() || "Untitled report";

  if (opts.mode === "live") {
    const { blocks, mapped, unmapped } = artifactToLiveBlocks(artifact);
    if (blocks.length > 0) {
      const source = [
        "import ap",
        `dash = ap.Dashboard(title=${pyStr(title)}, description=${pyStr(
          "Imported from Entrata Analyst — live metrics (V1.3)",
        )})`,
        `dash.section(${pyStr(artifact.title)})`,
        ...blocks,
      ].join("\n");
      return { source, live: true, mappedMetrics: mapped, unmappedLabels: unmapped };
    }
  }

  // Snapshot fallback / Phase 1.
  const markdown = artifactToMarkdown(artifact);
  const source = [
    "import ap",
    `dash = ap.Dashboard(title=${pyStr(title)}, description=${pyStr(
      "Imported from Entrata Analyst — snapshot; rebind to live metrics",
    )})`,
    `dash.section(${pyStr(artifact.title)})`,
    `dash.text(content=${pyTriple(markdown)})`,
  ].join("\n");
  return { source, live: false, mappedMetrics: [], unmappedLabels: [] };
}

// ──────────────────────────────────────────────────────────────────────────
// Payload + deep links
// ──────────────────────────────────────────────────────────────────────────

export interface HandoffPayload {
  name: string;
  tier: Tier;
  dashboardSource: string;
  /** Company Menu folder (cosmetic in the prototype). */
  menuFolder?: string;
  sessionId?: string | null;
}

/** Human-readable one-liner describing what will be created. */
export function describeArtifact(artifact: Artifact, mode: HandoffMode): string {
  if (mode === "live") {
    const { live, mappedMetrics } = artifactToDashboardSource(artifact, { mode });
    if (live) {
      const kindLabel: Record<string, string> = {
        table: "table",
        "bar-chart": "bar chart",
        "line-chart": "line chart",
        "kpi-strip": "KPI strip",
      };
      return `Live ${kindLabel[artifact.kind] ?? "block"} · ${mappedMetrics.length} metric${
        mappedMetrics.length === 1 ? "" : "s"
      } bound`;
    }
    return "No metrics matched yet — will send as a snapshot";
  }
  return "Snapshot block (literal data from this answer)";
}

export function reportUrl(base: string, id: string): string {
  return `${base.replace(/\/$/, "")}/workspace/reports/${id}`;
}

export function libraryUrl(base: string): string {
  return `${base.replace(/\/$/, "")}/library`;
}

export function companyMenuUrl(base: string): string {
  return `${base.replace(/\/$/, "")}/my-reports`;
}

/** Mode B (Phase 3): deep link to the platform's composer, seeded with the ask. */
export function continueBuildingUrl(
  base: string,
  opts: { prompt?: string; title?: string },
): string {
  const url = new URL(`${base.replace(/\/$/, "")}/create`);
  url.searchParams.set("source", "entrata-analyst");
  if (opts.prompt) url.searchParams.set("prompt", opts.prompt);
  if (opts.title) url.searchParams.set("title", opts.title);
  return url.toString();
}

// ──────────────────────────────────────────────────────────────────────────
// Delivery
// ──────────────────────────────────────────────────────────────────────────
//
// The Analyst app ships as a static export (no server routes), and the
// Analytics Platform doesn't expose CORS headers. We therefore POST straight
// from the browser to the platform's save endpoint as a CORS "simple request":
// a `text/plain` body skips the preflight, so the request reaches the platform
// and the report is genuinely created. The response is opaque cross-origin, so
// we can't read the new report id — we deep-link to the library / Company Menu
// (where the report appears) instead. A thrown fetch means the platform is
// unreachable (e.g. not running on :3001).

export interface DeliveryResult {
  /** True when the request reached the platform (report created). */
  delivered: boolean;
  /** Populated when delivery failed (platform unreachable). */
  error?: string;
  /** Base URL the report was sent to. */
  baseUrl: string;
}

export async function deliverHandoff(
  payload: HandoffPayload,
  base: string = ANALYTICS_PLATFORM_URL,
): Promise<DeliveryResult> {
  const target = `${base.replace(/\/$/, "")}/api/agent/dashboard/save`;
  const body = JSON.stringify({
    name: payload.name,
    tier: payload.tier,
    dashboardSource: payload.dashboardSource,
    sessionId: payload.sessionId ?? null,
  });
  try {
    await fetch(target, {
      method: "POST",
      mode: "no-cors",
      // text/plain keeps this a CORS-safelisted "simple request" (no preflight);
      // the platform's route parses the JSON body regardless of content type.
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body,
    });
    return { delivered: true, baseUrl: base };
  } catch (err) {
    return {
      delivered: false,
      baseUrl: base,
      error:
        err instanceof Error
          ? `Couldn't reach the Analytics Platform at ${base}. Make sure it's running on :3001.`
          : String(err),
    };
  }
}

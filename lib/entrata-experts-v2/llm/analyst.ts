/**
 * Entrata Analyst prompt construction + structured-output normalization.
 *
 * Server-side. Builds a lens/persona/scope-aware system prompt grounded in the
 * Wynbrook Living portfolio, and converts the model's JSON reply into the exact
 * `AssistantMessage` shape the chat renderer already consumes.
 */
import type {
  Artifact,
  ArtifactKind,
  AssistantMessage,
  Citation,
  Depth,
  LensId,
  ModelId,
  RoleId,
  Scope,
  TraceStep,
} from "../types";
import { LENS_BY_ID, ROLE_BY_ID } from "../lenses";
import {
  propertiesForScope,
  propertiesForScopeIds,
  type Property,
} from "../data/portfolio";

const ARTIFACT_KINDS: ArtifactKind[] = [
  "table",
  "bar-chart",
  "line-chart",
  "kpi-strip",
  "draft-email",
];
const CITATION_TYPES: Citation["type"][] = [
  "report",
  "ledger",
  "work-order",
  "lease",
  "nps",
  "ticket",
  "policy",
];

function resolveProperties(scope: Scope): Property[] {
  if (scope?.propertyIds && scope.propertyIds.length > 0) {
    return propertiesForScopeIds(scope.propertyIds);
  }
  return propertiesForScope(scope?.id ?? "portfolio");
}

/**
 * Compact JSON snapshot of the in-scope properties so the model can ground its
 * numbers in the same mock data the deterministic answer engine uses.
 */
function portfolioContext(props: Property[]): string {
  const rows = props.map((p) => ({
    property: p.shortName,
    segment: p.segment,
    units: p.units,
    occupancyPct: p.occupancyPct,
    delinquencyPct: p.delinquencyPct,
    ytdNoiPerUnit: p.ytdNoiPerUnit,
    ytdNoiBudgetPerUnit: p.ytdNoiBudgetPerUnit,
    rentGrowthPct: p.rentGrowthPct,
    workOrdersOpen: p.workOrdersOpen,
    workOrderMTTRDays: p.workOrderMTTRDays,
    appsThisWeek: p.appsThisWeek,
    toursThisWeek: p.toursThisWeek,
    leasesThisWeek: p.leasesThisWeek,
    renewalsAcceptancePct: p.renewalsAcceptancePct,
    onlinePaymentPct: p.onlinePaymentPct,
  }));
  return JSON.stringify(rows);
}

export function buildSystemPrompt(args: {
  lens: LensId;
  depth: Depth;
  role: RoleId;
  scope: Scope;
}): string {
  const props = resolveProperties(args.scope);
  const lens = LENS_BY_ID[args.lens] ?? LENS_BY_ID.auto;
  const role = ROLE_BY_ID[args.role];
  const scopeLabel = args.scope?.label || "the whole portfolio";

  const depthGuidance =
    args.depth === "fast"
      ? "Be concise — a tight, direct answer. Light reasoning."
      : args.depth === "reasoning"
        ? "Reason carefully and multi-step. Surface caveats and double-check against policy before answering."
        : "Match depth to the question's complexity.";

  return `You are **Entrata Analyst**, a data-connected analytics assistant for **Wynbrook Living**, a multifamily property-management operator. You answer questions about their portfolio with cited, scoped, trustworthy analysis.

## Who is asking
Role: ${role ? `${role.label} — ${role.blurb}` : args.role}. Write at this person's altitude.

## Active lens
${lens.label}: ${lens.blurb}
${depthGuidance}

## Scope
The user's question is scoped to: **${scopeLabel}**. Only reason about the properties listed below; do not invent properties or numbers outside this set.

## Portfolio data (authoritative — use these exact figures; compute aggregates from them)
${portfolioContext(props)}

Notes on the data: percentages are already in percent units (e.g. 93.4 means 93.4%). "ytdNoiPerUnit" vs "ytdNoiBudgetPerUnit" gives variance to budget. Estimate unpaid rent as units × (delinquencyPct/100) × $1,450 avg rent when asked for dollars.

## Guardrails (critical)
- **Never reveal resident PII** (individual names, SSNs, emails, phone numbers, addresses, or a single resident's ledger). If asked, set outcome to "refused" and explain you can only show aggregates.
- **Never fabricate.** If the data above can't answer the question (e.g. a year/metric not present), say so plainly and set outcome to "answered" with low confidence — do not invent figures.
- If the question is out-of-scope for analytics (e.g. "draft a lease amendment"), set outcome to "refused".
- If a question's premise is false per the data, correct it rather than confirming it.

## Output format (STRICT)
Reply with a SINGLE JSON object and nothing else (no markdown fences, no prose around it). Schema:
{
  "body": string,                 // markdown answer. Cite claims inline with [#1], [#2] markers that map to citations[] by 1-based order.
  "confidence": "high" | "medium" | "low",
  "outcome": "answered" | "low-confidence" | "refused" | "escalated",
  "citations": [                  // sources backing the answer; [] if none
    { "label": string, "source": string, "type": "report"|"ledger"|"work-order"|"lease"|"nps"|"ticket"|"policy" }
  ],
  "artifacts": [                  // 0-2 items; include one when a chart/table makes the answer clearer
    {
      "kind": "table"|"bar-chart"|"line-chart"|"kpi-strip"|"draft-email",
      "title": string,
      "subtitle": string,         // optional
      // table: provide columns + rows
      "columns": string[],
      "rows": (string|number)[][],
      // bar-chart / line-chart: provide series
      "series": [ { "name": string, "data": [ { "x": string, "y": number } ] } ],
      // kpi-strip: provide kpis
      "kpis": [ { "label": string, "value": string, "delta": string, "tone": "good"|"warn"|"alert"|"info" } ]
    }
  ],
  "trace": [ { "label": string, "detail": string } ],   // 2-5 short reasoning steps
  "followUps": string[]           // 2-3 natural next questions
}

Only include the artifact fields relevant to that artifact's "kind". Keep numbers consistent with body and the portfolio data. Output JSON only.`;
}

// ---------------------------------------------------------------------------
// Response normalization — defensively coerce arbitrary model JSON into the
// AssistantMessage shape the renderer expects.
// ---------------------------------------------------------------------------

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // tolerate ```json fences or surrounding prose
    const fenced = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      return JSON.parse(fenced);
    } catch {
      const first = fenced.indexOf("{");
      const last = fenced.lastIndexOf("}");
      if (first >= 0 && last > first) {
        return JSON.parse(fenced.slice(first, last + 1));
      }
      throw new Error("Model did not return parseable JSON.");
    }
  }
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function normalizeCitations(raw: unknown): Citation[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 12).map((c, i) => {
    const obj = (c ?? {}) as Record<string, unknown>;
    const type = CITATION_TYPES.includes(obj.type as Citation["type"])
      ? (obj.type as Citation["type"])
      : "report";
    return {
      id: asString(obj.id) || `c${i + 1}`,
      label: asString(obj.label, `Source ${i + 1}`),
      source: asString(obj.source, asString(obj.label, "")),
      type,
    };
  });
}

function normalizeArtifacts(raw: unknown): Artifact[] {
  if (!Array.isArray(raw)) return [];
  const out: Artifact[] = [];
  raw.slice(0, 3).forEach((a, i) => {
    const obj = (a ?? {}) as Record<string, unknown>;
    const kind = obj.kind as ArtifactKind;
    if (!ARTIFACT_KINDS.includes(kind)) return;
    const art: Artifact = {
      id: asString(obj.id) || `art-${i + 1}`,
      kind,
      title: asString(obj.title, "Result"),
    };
    if (typeof obj.subtitle === "string") art.subtitle = obj.subtitle;

    if (kind === "table") {
      art.columns = Array.isArray(obj.columns) ? (obj.columns as string[]).map((x) => asString(x)) : [];
      art.rows = Array.isArray(obj.rows)
        ? (obj.rows as unknown[][]).map((row) =>
            Array.isArray(row) ? row.map((cell) => (typeof cell === "number" ? cell : asString(cell))) : [],
          )
        : [];
    } else if (kind === "bar-chart" || kind === "line-chart") {
      art.series = Array.isArray(obj.series)
        ? (obj.series as Record<string, unknown>[]).map((s) => ({
            name: asString(s?.name, "Series"),
            data: Array.isArray(s?.data)
              ? (s.data as Record<string, unknown>[])
                  .map((d) => ({ x: asString(d?.x), y: typeof d?.y === "number" ? d.y : Number(d?.y) || 0 }))
              : [],
          }))
        : [];
    } else if (kind === "kpi-strip") {
      const tones = ["good", "warn", "alert", "info"];
      art.kpis = Array.isArray(obj.kpis)
        ? (obj.kpis as Record<string, unknown>[]).map((k) => ({
            label: asString(k?.label),
            value: asString(k?.value),
            delta: typeof k?.delta === "string" ? k.delta : undefined,
            tone: tones.includes(k?.tone as string)
              ? (k.tone as NonNullable<Artifact["kpis"]>[number]["tone"])
              : undefined,
          }))
        : [];
    } else if (kind === "draft-email") {
      art.emailTo = asString(obj.emailTo);
      art.emailSubject = asString(obj.emailSubject);
      art.emailBody = asString(obj.emailBody);
    }
    out.push(art);
  });
  return out;
}

function normalizeTrace(raw: unknown): TraceStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 8).map((t) => {
    const obj = (t ?? {}) as Record<string, unknown>;
    const step: TraceStep = { label: asString(obj.label, "Step") };
    if (typeof obj.detail === "string") step.detail = obj.detail;
    return step;
  });
}

const OUTCOMES = ["answered", "low-confidence", "refused", "escalated"] as const;
const CONFIDENCES = ["high", "medium", "low"] as const;

/**
 * Convert a raw LiteLLM completion string into an AssistantMessage (minus the
 * id/createdAt the store stamps). Throws if the JSON is unrecoverable.
 */
export function normalizeAnalystResponse(
  rawContent: string,
  ctx: { lens: LensId; depth: Depth; model: ModelId; scope: Scope },
): Omit<AssistantMessage, "id" | "createdAt"> {
  const parsed = extractJson(rawContent) as Record<string, unknown>;

  const outcome = OUTCOMES.includes(parsed.outcome as (typeof OUTCOMES)[number])
    ? (parsed.outcome as AssistantMessage["outcome"])
    : "answered";
  const confidence = CONFIDENCES.includes(parsed.confidence as (typeof CONFIDENCES)[number])
    ? (parsed.confidence as AssistantMessage["confidence"])
    : "medium";

  const followUps = Array.isArray(parsed.followUps)
    ? (parsed.followUps as unknown[]).slice(0, 4).map((f) => asString(f)).filter(Boolean)
    : [];

  return {
    role: "assistant",
    body: asString(parsed.body, "I wasn't able to produce an answer for that."),
    lens: ctx.lens,
    depth: ctx.depth,
    model: ctx.model,
    scope: ctx.scope,
    citations: normalizeCitations(parsed.citations),
    artifacts: normalizeArtifacts(parsed.artifacts),
    trace: normalizeTrace(parsed.trace),
    confidence,
    outcome,
    followUps,
  };
}

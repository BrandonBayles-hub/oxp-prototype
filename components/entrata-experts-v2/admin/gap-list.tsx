"use client";
import * as React from "react";
import type {
  Conversation,
  KnowledgeGap,
} from "@/lib/entrata-experts-v2/types";
import { buildGaps } from "@/lib/entrata-experts-v2/data/activity";
import { ROLE_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database,
  ShieldCheck,
  FileText,
  Sparkles,
  ChevronRight,
  Wrench,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Translation layer: raw eval signals → admin-actionable categories
// ──────────────────────────────────────────────────────────────────────────────
//
// The underlying data layer flags conversations with eval-flavored reasons
// (refused / low-confidence / thumbs-down / escalated). Those labels are useful
// for the AI team, but admins shouldn't have to reason about them. We translate
// each gap into one of four concrete actions an admin can take:
//
//   1. CONNECT_DATA — the expert needed a data system it wasn't connected to.
//      → Sends the admin to Marketplace Exchange or Analytics Platform · Data
//        Sources to wire it up.
//   2. ADD_POLICY  — the question crossed a policy boundary (PII, financial
//      authority, etc.). Admin can author or update the policy.
//   3. ADD_DOCUMENT — the answer would be fine if the expert had a reference
//      doc / SOP for this topic.
//   4. NEW_EXPERT  — the ask is outside the scope of any current expert.
//      Admin can spin up a new expert in OXP Studio.
//
// Pure eval signals (a stylistic thumbs-down on a working answer, a
// low-confidence reply on a topic that already has data + policy + doc) are
// filtered out — those belong on the AI team's eval dashboard, not here.
// ──────────────────────────────────────────────────────────────────────────────

type UserGapKind = "connect-data" | "add-policy" | "add-document" | "new-expert";

interface UserGap {
  raw: KnowledgeGap;
  kind: UserGapKind;
  // Headline that names the missing capability rather than the failure.
  headline: string;
  // One-sentence explanation of what's missing and why connecting it helps.
  rationale: string;
  // CTA destination metadata
  primaryCta: {
    label: string;
    destination: string; // human-readable destination
    icon: React.ComponentType<{ className?: string }>;
  };
}

const CATEGORY_META: Record<
  UserGapKind,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    variant: "secondary" | "yellow";
    accentBg: string;
    accentFg: string;
  }
> = {
  "connect-data": {
    label: "Connect a data source",
    icon: Database,
    variant: "secondary",
    accentBg: "bg-sky-50",
    accentFg: "text-sky-700",
  },
  "add-policy": {
    label: "Add a policy",
    icon: ShieldCheck,
    variant: "secondary",
    accentBg: "bg-emerald-50",
    accentFg: "text-emerald-700",
  },
  "add-document": {
    label: "Add a document",
    icon: FileText,
    variant: "secondary",
    accentBg: "bg-amber-50",
    accentFg: "text-amber-700",
  },
  "new-expert": {
    label: "Create a new expert",
    icon: Sparkles,
    variant: "secondary",
    accentBg: "bg-violet-50",
    accentFg: "text-violet-700",
  },
};

// Pattern → action mapping. Each rule looks at the asked question and returns
// the admin-ready translation. Rules are evaluated in order; the first match
// wins. Anything that doesn't match a rule is dropped (filtered out of the
// admin list) so we never surface a pure AI-eval signal here.
const RULES: Array<{
  match: RegExp;
  build: (q: string) => Pick<UserGap, "kind" | "headline" | "rationale" | "primaryCta">;
}> = [
  {
    // Variance / GL reconciliation — needs a connected data feed.
    match: /(variance|reconcile|reconciliation|tie\s*out|gl\s*mismatch)/i,
    build: () => ({
      kind: "connect-data",
      headline: "Variance Bridge data isn't connected",
      rationale:
        "When residents ask why the variance report doesn't tie to the GL, the expert can't answer because the Variance Bridge feed isn't connected to this workspace.",
      primaryCta: {
        label: "Connect in Analytics Platform",
        destination: "Analytics Platform · Data Sources",
        icon: Database,
      },
    }),
  },
  {
    // Forecasting / projections — sold as a Marketplace add-on.
    match: /(forecast|projection|q[1-4]\b|next quarter|next year|predict)/i,
    build: () => ({
      kind: "connect-data",
      headline: "Forecasting model isn't installed",
      rationale:
        "Forward-looking questions like occupancy or revenue projections require the Forecasting add-on, which isn't installed for this workspace yet.",
      primaryCta: {
        label: "Browse Marketplace Exchange",
        destination: "Marketplace Exchange · Forecasting",
        icon: ExternalLink,
      },
    }),
  },
  {
    // Lease violations, notices, etc. — a real data source the expert lacks.
    match: /(lease violation|notice to vacate|nsf|chargeback|eviction|legal hold)/i,
    build: () => ({
      kind: "connect-data",
      headline: "Lease & Compliance feed isn't connected",
      rationale:
        "The expert tried to group lease violations and notices, but the Lease & Compliance data source isn't wired into this workspace.",
      primaryCta: {
        label: "Connect in Analytics Platform",
        destination: "Analytics Platform · Data Sources",
        icon: Database,
      },
    }),
  },
  {
    // Resident PII — guardrail-gated. Treat as a policy decision.
    match: /(resident|tenant).*(name|email|phone|address|ssn|social)|every resident|all residents/i,
    build: () => ({
      kind: "add-policy",
      headline: "Resident PII disclosure isn't permitted",
      rationale:
        "Your default policy keeps residents' personal details out of expert answers. If your team needs aggregated lists for outreach, you can author an exception policy.",
      primaryCta: {
        label: "Open Policy Studio",
        destination: "OXP Studio · Policies",
        icon: ShieldCheck,
      },
    }),
  },
  {
    // Cap rate / refi / asset-management questions — out of scope for any
    // current expert.
    match: /(cap rate|refi|refinanc|underwrit|asset management|loan\s+covenant|debt service)/i,
    build: () => ({
      kind: "new-expert",
      headline: "No expert covers asset-management workflows",
      rationale:
        "Asset Management questions (cap rate, refi math, underwriting) are outside the scope of your installed experts. You can spin up a dedicated Asset Management expert.",
      primaryCta: {
        label: "Create expert in OXP Studio",
        destination: "OXP Studio · Build an expert",
        icon: Sparkles,
      },
    }),
  },
  {
    // Board deck / owner meeting / investor packet — workflow expert.
    match: /(board deck|owner meeting|investor|board meeting|capital partner)/i,
    build: () => ({
      kind: "new-expert",
      headline: "No expert assembles owner / board materials",
      rationale:
        "Generating an owner or board deck is a multi-step workflow that doesn't belong to any current expert. A dedicated Board Deck expert in OXP Studio can be templated against your latest data.",
      primaryCta: {
        label: "Create expert in OXP Studio",
        destination: "OXP Studio · Build an expert",
        icon: Sparkles,
      },
    }),
  },
  {
    // Concession / pricing approval rules — usually a document the team
    // already maintains in policy/sop form.
    match: /(concession|pricing approval|approval\s+matrix|sop|standard operating)/i,
    build: () => ({
      kind: "add-document",
      headline: "Concession / approval SOP isn't in the knowledge base",
      rationale:
        "The expert kept hedging because the team's concession-approval SOP isn't in its knowledge base yet. Upload it and the expert can quote it directly.",
      primaryCta: {
        label: "Upload to Knowledge Base",
        destination: "Entrata Experts · Knowledge Base",
        icon: FileText,
      },
    }),
  },
];

function translateGap(raw: KnowledgeGap): UserGap | null {
  for (const rule of RULES) {
    if (rule.match.test(raw.question)) {
      return { raw, ...rule.build(raw.question) };
    }
  }
  // If the underlying reason is explicitly an out-of-scope refusal, treat as
  // a "new expert" candidate. This catches refused-style gaps that didn't
  // match a more specific rule.
  if (raw.reason === "refused" || raw.reason === "escalated") {
    return {
      raw,
      kind: "new-expert",
      headline: "This ask is outside every installed expert's scope",
      rationale:
        "Your installed experts decline this kind of question by design. A new expert in OXP Studio can be scoped specifically to cover it.",
      primaryCta: {
        label: "Create expert in OXP Studio",
        destination: "OXP Studio · Build an expert",
        icon: Sparkles,
      },
    };
  }
  // Pure eval signals (thumbs-down on a working answer, generic
  // low-confidence) don't belong on the admin surface.
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────

export function GapList({ activity }: { activity: Conversation[] }) {
  const userGaps = React.useMemo(() => {
    const raw = buildGaps(activity);
    return raw
      .map(translateGap)
      .filter((g): g is UserGap => g !== null);
  }, [activity]);

  if (userGaps.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        <div className="text-sm">No knowledge gaps to address.</div>
        <div className="mt-1 text-xs">
          Every question your team asked could be answered with the data,
          policies, and experts you have installed.
        </div>
      </div>
    );
  }

  // Group by category so admins can scan by the kind of action required.
  const grouped = (["connect-data", "add-policy", "add-document", "new-expert"] as UserGapKind[])
    .map((kind) => ({ kind, items: userGaps.filter((g) => g.kind === kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Questions your team asked that your installed experts couldn&apos;t fully
        answer because something was missing in your workspace. Each row is one
        thing you can connect, add, or create to close the gap.
      </div>

      {/* Summary chips by category */}
      <div className="flex flex-wrap items-center gap-2">
        {grouped.map((g) => {
          const meta = CATEGORY_META[g.kind];
          const Icon = meta.icon;
          return (
            <span
              key={g.kind}
              className={`inline-flex items-center gap-1.5 rounded-md ${meta.accentBg} px-2.5 py-1 text-[11px] font-medium ${meta.accentFg}`}
            >
              <Icon className="h-3 w-3" />
              {meta.label}
              <span className="opacity-70">· {g.items.length}</span>
            </span>
          );
        })}
      </div>

      {grouped.map((group) => (
        <section key={group.kind} className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {CATEGORY_META[group.kind].label}
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground/80">
              {group.items.length} {group.items.length === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="space-y-3">
            {group.items.map((g) => {
              const meta = CATEGORY_META[g.kind];
              const Icon = meta.icon;
              const CtaIcon = g.primaryCta.icon;
              return (
                <div
                  key={g.raw.id}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="flex items-start gap-3 border-b border-border/60 px-4 py-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${meta.accentBg} ${meta.accentFg}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">
                        {g.headline}
                      </div>
                      <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        {g.rationale}
                      </div>
                    </div>
                    <Badge variant={meta.variant} className="text-[10px]">
                      Asked {g.raw.count}×
                    </Badge>
                  </div>

                  <div className="flex items-start gap-3 bg-muted/30 px-4 py-3">
                    <div className="mt-0.5 shrink-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground">
                        <Wrench className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Example question
                      </div>
                      <div className="mt-0.5 text-[13px] italic leading-relaxed text-foreground">
                        &ldquo;{g.raw.question}&rdquo;
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>
                          From {g.raw.exampleAskers.slice(0, 2).join(", ")}
                          {g.raw.count > g.raw.exampleAskers.length
                            ? ` + ${g.raw.count - g.raw.exampleAskers.length} more`
                            : ""}
                        </span>
                        <span>·</span>
                        <span>
                          Roles:{" "}
                          {g.raw.affectedRoles
                            .map((r) => ROLE_BY_ID[r]?.label)
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Button size="sm" className="h-7 gap-1.5 px-2.5 text-xs">
                        <CtaIcon className="h-3 w-3" />
                        {g.primaryCta.label}
                        <ArrowUpRight className="h-3 w-3 opacity-80" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Dismiss
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                      <span className="text-[10px] text-muted-foreground">
                        → {g.primaryCta.destination}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

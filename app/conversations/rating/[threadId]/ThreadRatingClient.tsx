"use client";

/**
 * ELI+ Score — full evaluation page for a single conversation thread.
 *
 * Reachable from the "Open full evaluation" button in the SA 1.2
 * Testing-mode Trace modal (see `<EliTraceModal>`). This page renders
 * the full rubric breakdown modeled after `docs/product/EVAL-REQUIREMENTS.md`:
 *
 *  ▸ Headline number with CAPPED-AT badge when a hard-cap rule fired
 *  ▸ "Score override" banner reproducing the wording from the design
 *    comp (`Score override — score capped at 70, down from a weighted
 *    89. A hard-cap rule was triggered. Triggered by check: Inputs ·
 *    context retention.`).
 *  ▸ Per-category cards (Inputs / Reasoning / Outputs / Safety) with
 *    weighted per-check breakdown, pass/warn/fail badges, and the
 *    cap-trigger check highlighted inline.
 *  ▸ Sidebar with model / latency / token telemetry so the page reads
 *    like a real eval report.
 *
 * Everything is derived from `buildRatingForThread(thread)` — the same
 * function feeds the header pill and the modal banner, so all three
 * surfaces stay in perfect sync.
 */

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Info, Lock } from "lucide-react";
import { useConversations } from "@/lib/conversations-context";
import {
  buildRatingForThread,
  buildTraceForThread,
  type EliRating,
  type EliRatingCategory,
  type EliRatingCheck,
} from "@/lib/eli-trace";
import { cn } from "@/lib/utils";

export function ThreadRatingClient({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = use(params);
  const { getConversation } = useConversations();
  const thread = getConversation(threadId);

  // If the thread id is unknown (fresh reload without demo state, or a
  // bad link), keep the page graceful with a lightweight "not found"
  // treatment rather than throwing.
  if (!thread) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <BackLink threadId={null} />
        <div className="mt-6 rounded-md border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">Conversation not found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            We couldn&apos;t find a thread with id <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{threadId}</code>.
            Return to Communications and re-open the trace from the session-id chip.
          </p>
        </div>
      </div>
    );
  }

  const rating = buildRatingForThread(thread);
  const trace = buildTraceForThread(thread);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <BackLink threadId={threadId} />

      {/* Page header — resident + property + session id chip */}
      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            ELI+ Evaluation
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {thread.resident}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {thread.property} · Unit {thread.unit ?? "—"} · {trace.domain}
          </p>
        </div>
        <SessionIdCopy sessionId={rating.sessionId} />
      </header>

      {/* Score card — big number + cap banner */}
      <ScoreCard rating={rating} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
        {/* Categories — the actual rubric breakdown */}
        <div className="space-y-4 min-w-0">
          {rating.categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} capTriggerCheck={rating.capTriggerCheck} />
          ))}
        </div>

        {/* Telemetry sidebar */}
        <aside className="space-y-4">
          <TelemetryCard rating={rating} />
          <RubricLegend />
        </aside>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function BackLink({ threadId }: { threadId: string | null }) {
  const href = threadId
    ? `/conversations/?id=${encodeURIComponent(threadId)}`
    : "/conversations/";
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      Back to conversation
    </Link>
  );
}

function SessionIdCopy({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — swallow */
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1 font-mono text-[11px] text-foreground transition-colors hover:bg-muted",
        copied && "border-emerald-300 bg-emerald-50 text-emerald-800",
      )}
      title="Copy session id"
      aria-label={`Copy session id ${sessionId}`}
    >
      {sessionId}
      {copied ? (
        <Check className="h-3 w-3" aria-hidden />
      ) : (
        <Copy className="h-3 w-3 opacity-60" aria-hidden />
      )}
    </button>
  );
}

/* ─── Headline score card ─────────────────────────────────────────── */

function ScoreCard({ rating }: { rating: EliRating }) {
  const isPass = rating.finalScore >= 85;
  const capped = rating.capped;
  return (
    <section
      className={cn(
        "mt-6 rounded-lg border bg-card px-6 py-5",
        capped ? "border-red-200" : isPass ? "border-emerald-200" : "border-amber-200",
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-end gap-4">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              ELI+ Score
            </p>
            <Info className="h-3 w-3 text-muted-foreground/60" aria-hidden />
          </div>
          <p
            className={cn(
              "text-6xl font-semibold leading-none tabular-nums",
              capped ? "text-red-700" : isPass ? "text-emerald-700" : "text-amber-700",
            )}
          >
            {rating.finalScore}
            <span className="ml-1 text-2xl font-medium text-muted-foreground">/100</span>
          </p>
          {capped && rating.capMaxScore != null && (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-700">
              <Lock className="h-3 w-3" aria-hidden />
              Capped at {rating.capMaxScore}
            </span>
          )}
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <p>
            Weighted average · <span className="font-semibold text-foreground tabular-nums">{rating.weightedScore}/100</span>
          </p>
          <p className="mt-0.5">Pass threshold ≥ 85</p>
        </div>
      </div>

      {capped && (
        <div className="mt-4 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2.5 text-xs leading-snug text-red-800">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <div>
            <p>
              Score override — score capped at{" "}
              <span className="font-semibold">{rating.capMaxScore}</span>, down from a weighted{" "}
              <span className="font-semibold">{rating.weightedScore}</span>.
            </p>
            {rating.capTriggerCheck && (
              <p className="mt-0.5">
                {rating.capMessage ?? "A hard-cap rule was triggered."} Triggered by check:{" "}
                <span className="font-semibold">{rating.capTriggerCheck}</span>.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── Category cards ──────────────────────────────────────────────── */

function CategoryCard({
  category,
  capTriggerCheck,
}: {
  category: EliRatingCategory;
  capTriggerCheck?: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{category.label}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{category.blurb}</p>
        </div>
        <ScorePill score={category.score} />
      </header>
      <ul className="divide-y divide-border">
        {category.checks.map((c) => (
          <CheckRow
            key={c.id}
            check={c}
            triggered={capTriggerCheck === `${category.label} · ${c.name}`}
          />
        ))}
      </ul>
    </section>
  );
}

function CheckRow({ check, triggered }: { check: EliRatingCheck; triggered: boolean }) {
  const badgeClass =
    check.status === "pass"
      ? "bg-emerald-100 text-emerald-700"
      : check.status === "warn"
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-700";
  return (
    <li className={cn("px-4 py-3", triggered && "bg-red-50/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{check.name}</p>
            {triggered && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-700">
                <Lock className="h-2.5 w-2.5" aria-hidden />
                Cap trigger
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{check.notes}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="tabular-nums text-[11px] text-muted-foreground">
            weight {Math.round(check.weight * 100)}%
          </span>
          <span
            className={cn(
              "inline-flex min-w-[3.5rem] justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
              badgeClass,
            )}
          >
            {check.score}
          </span>
        </div>
      </div>
    </li>
  );
}

function ScorePill({ score }: { score: number }) {
  const pass = score >= 85;
  const warn = score >= 70 && !pass;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold tabular-nums",
        pass
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : warn
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {score}
      <span className="text-[10px] font-medium text-muted-foreground">/100</span>
    </span>
  );
}

/* ─── Sidebar cards ───────────────────────────────────────────────── */

function TelemetryCard({ rating }: { rating: EliRating }) {
  const rows: Array<[string, string]> = [
    ["Model", rating.modelLabel],
    ["Latency", `${(rating.latencyMs / 1000).toFixed(2)}s`],
    ["Tokens in", rating.tokensIn.toLocaleString()],
    ["Tokens out", rating.tokensOut.toLocaleString()],
  ];
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Response telemetry
      </p>
      <dl className="mt-2 space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-xs">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="tabular-nums text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RubricLegend() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Rubric legend
      </p>
      <ul className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          Pass · score ≥ 85
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden />
          Warn · 70–84
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden />
          Fail · &lt; 70
        </li>
        <li className="mt-2 flex items-start gap-2">
          <Lock className="mt-0.5 h-3 w-3" aria-hidden />
          A single check flagged as a hard-cap trigger clamps the final score.
        </li>
      </ul>
    </div>
  );
}

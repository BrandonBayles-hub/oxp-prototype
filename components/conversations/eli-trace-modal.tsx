"use client";

/**
 * SA 1.2 "Testing" mode — Trace panel for the last Eli reply on a
 * thread. Fired from the session-id chip in the conversation header
 * (only visible when SA 1.2 + Testing are both on). The panel mirrors
 * the design comp: an "Entrata Internal" tab that shows the raw MCP
 * request/response payloads and a "User View" tab that shows a
 * plain-English recap of what Eli did.
 *
 * Content is generated deterministically by `buildTraceForThread` in
 * `lib/eli-trace.ts` — the same thread always produces the same trace
 * so a demoer can rehearse the flow.
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Copy, Lock, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ConversationItem } from "@/lib/conversations-context";
import {
  buildTraceForThread,
  buildUserViewForThread,
  buildRatingForThread,
  type EliTrace,
  type EliRating,
  type TracePlaybookStep,
  type TraceToolStep,
} from "@/lib/eli-trace";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thread: ConversationItem | null;
  /**
   * `true` once the quality-analysis round-trip has completed for the
   * current thread. Owned by the page (mirrors the header-chip state)
   * so the chip and the modal banner stay in sync — one loading state,
   * two surfaces. When `false`, the banner shows a "running analysis"
   * placeholder in place of the full rating card.
   */
  ratingReady?: boolean;
};

type TabId = "entrata" | "user";

export function EliTraceModal({ open, onOpenChange, thread, ratingReady = false }: Props) {
  const [tab, setTab] = useState<TabId>("entrata");
  const [copied, setCopied] = useState(false);

  // Recompute the trace whenever the modal opens against a different
  // thread. Cheap because `buildTraceForThread` is pure over the
  // thread's messages and id.
  const trace: EliTrace | null = useMemo(
    () => (thread ? buildTraceForThread(thread) : null),
    [thread],
  );
  const userSteps = useMemo(
    () => (thread ? buildUserViewForThread(thread) : []),
    [thread],
  );
  // Rating is computed the same way — deterministic per thread id — so
  // the banner in the modal, the pill in the header, and the full
  // evaluation page all agree on the same score.
  const rating: EliRating | null = useMemo(
    () => (thread ? buildRatingForThread(thread) : null),
    [thread],
  );

  if (!trace || !thread || !rating) return null;

  const copySessionId = async () => {
    try {
      await navigator.clipboard.writeText(trace.sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard permission denied — swallow, this is a demo affordance.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden p-0"
        overlayClassName="z-[100]"
      >
        {/* Header — sticky, borders below to visually separate from scroll region. */}
        <div className="shrink-0 border-b border-border px-6 pt-5 pb-4">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Trace for this reply
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-xs">
            Steps and context that led to this {trace.domain} response.
          </DialogDescription>

          {/* Session id chip — copy-to-clipboard, uses check-mark flash. */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Session
            </span>
            <button
              type="button"
              onClick={copySessionId}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1 font-mono text-[11px] text-foreground transition-colors hover:bg-muted",
                copied && "border-emerald-300 bg-emerald-50 text-emerald-800",
              )}
              title="Copy session id"
              aria-label={`Copy session id ${trace.sessionId}`}
            >
              {trace.sessionId}
              {copied ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : (
                <Copy className="h-3 w-3 opacity-60" aria-hidden />
              )}
            </button>
          </div>

          {/* Tabs — segmented pill matching the design comp. */}
          <div className="mt-4 inline-flex rounded-md border border-border bg-muted/40 p-0.5">
            <TabButton active={tab === "entrata"} onClick={() => setTab("entrata")}>
              Entrata Internal
            </TabButton>
            <TabButton active={tab === "user"} onClick={() => setTab("user")}>
              User View
            </TabButton>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {tab === "entrata"
              ? "Full technical trace — tools, schemas, and payloads."
              : "Plain-English recap of what Eli did to produce this reply."}
          </p>
        </div>

        {/* Body — scroll region so long traces don't blow past the viewport. */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
          {/*
            ELI+ Rating banner — sits above the trace body on both tabs
            so demoers can see the score before diving into the trace.
            Deep-links out to the full evaluation page for the whole
            rubric breakdown. While the quality-analysis tool is still
            "running" (see `ratingReady` prop), a lightweight loading
            banner takes its place so the modal never renders a stale
            or eager score ahead of the analysis.
          */}
          {ratingReady ? (
            <RatingBanner rating={rating} threadId={thread.id} />
          ) : (
            <RatingLoadingBanner />
          )}

          {tab === "entrata" ? (
            <EntrataInternalView trace={trace} />
          ) : (
            <UserView residentMessage={trace.residentMessage} agentReply={trace.agentReply} steps={userSteps} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Tabs
   ───────────────────────────────────────────────────────────────────── */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Entrata Internal view — resident msg + agent reply + trace steps.
   ───────────────────────────────────────────────────────────────────── */

function EntrataInternalView({ trace }: { trace: EliTrace }) {
  return (
    <div className="space-y-5">
      <ContextBlock label="Resident message (context)" body={trace.residentMessage} />
      <div>
        <div className="flex items-baseline gap-2">
          <SectionLabel>{trace.agentReplyIsDraft ? "Agent draft" : "Agent reply"}</SectionLabel>
          {trace.agentReplyIsDraft && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-eli-purple">
              Suggested
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground">{trace.agentReply}</p>
      </div>

      <div>
        <SectionLabel>Execution trace</SectionLabel>
        <div className="mt-2 space-y-3">
          {trace.steps.map((step, idx) => {
            if (step.kind === "playbook") {
              return <PlaybookCard key={`p-${idx}`} step={step} />;
            }
            return <ToolCard key={`t-${idx}`} step={step} />;
          })}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function ContextBlock({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-foreground">{body}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Playbook card (purple accent, matches the design comp)
   ───────────────────────────────────────────────────────────────────── */

function PlaybookCard({ step }: { step: TracePlaybookStep }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-eli-warm-bg text-eli-purple">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
              <rect x="2" y="3" width="12" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5 6h6M5 8.5h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="truncate text-sm font-medium text-foreground">{step.title}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{step.durationMs}ms</span>
        </div>
      </div>
      <div className="px-3 py-3">
        <div className="rounded-md border border-eli-purple/30 bg-eli-warm-bg px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-eli-purple">
            {step.domain} · {step.policyLabel}
          </p>
          <p className="mt-1 text-xs italic leading-relaxed text-eli-warm-bg-foreground">
            {step.body}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Tool card (request / response with JSON preformat)
   ───────────────────────────────────────────────────────────────────── */

function ToolCard({ step }: { step: TraceToolStep }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sky-50 text-sky-600">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
              <circle cx="8" cy="8" r="2.5" />
              <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M3.6 12.4l1.4-1.4M11 5l1.4-1.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="truncate text-sm font-medium text-foreground">Tool · {step.name}</span>
          <span className="shrink-0 rounded bg-sky-50 px-1.5 py-0.5 font-mono text-[10px] text-sky-700">
            {step.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{step.durationMs}ms</span>
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              step.status === "SUCCESS" ? "text-emerald-600" : "text-red-600",
            )}
          >
            {step.status}
          </span>
        </div>
      </div>
      <div className="space-y-2 px-3 py-2.5">
        <PayloadBlock label="Tool request (technical)" body={step.request} />
        <PayloadBlock label="Tool response (technical)" body={step.response} />
      </div>
    </div>
  );
}

function PayloadBlock({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40">
      <p className="border-b border-border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <pre className="max-h-64 overflow-auto px-2.5 py-2 font-mono text-[11px] leading-relaxed text-foreground">
        {body}
      </pre>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   User View — plain-English recap
   ───────────────────────────────────────────────────────────────────── */

function UserView({
  residentMessage,
  agentReply,
  steps,
}: {
  residentMessage: string;
  agentReply: string;
  steps: { title: string; detail: string }[];
}) {
  return (
    <div className="space-y-5">
      <ContextBlock label="Resident message (context)" body={residentMessage} />
      <div>
        <SectionLabel>Agent reply</SectionLabel>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground">{agentReply}</p>
      </div>
      <div>
        <SectionLabel>What Eli did</SectionLabel>
        <ol className="mt-2 space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-md border border-border bg-card px-3 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-eli-warm-bg text-[11px] font-semibold text-eli-purple">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   ELI+ Rating banner — shows the headline score, the score-override
   warning when the hard-cap is tripped, and a deep-link to the full
   evaluation page for the whole rubric breakdown.
   ───────────────────────────────────────────────────────────────────── */

/**
 * Placeholder banner shown while the quality-analysis tool is still
 * running. Same footprint as the real banner so the modal body doesn't
 * reflow when the score arrives.
 */
function RatingLoadingBanner() {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            ELI+ Score
          </p>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-muted-foreground">
              Running quality analysis…
            </p>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Handing off to the rating tool
        </span>
      </div>
    </div>
  );
}

function RatingBanner({ rating, threadId }: { rating: EliRating; threadId: string }) {
  const isPass = rating.finalScore >= 85;
  // The banner uses a red tint if the hard-cap was tripped (matches the
  // design comp) OR if the final score is below the 85 passing threshold.
  const showCapBanner = rating.capped;

  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3",
        showCapBanner
          ? "border-red-200 bg-red-50"
          : isPass
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              showCapBanner ? "text-red-700" : isPass ? "text-emerald-700" : "text-amber-700",
            )}
          >
            ELI+ Score
          </p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums leading-none",
              showCapBanner ? "text-red-800" : isPass ? "text-emerald-800" : "text-amber-800",
            )}
          >
            {rating.finalScore}
            <span className="ml-0.5 text-sm font-medium text-muted-foreground">/100</span>
          </p>
          {showCapBanner && rating.capMaxScore != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-700">
              <Lock className="h-2.5 w-2.5" aria-hidden />
              Capped at {rating.capMaxScore}
            </span>
          )}
        </div>
        <Link
          href={`/conversations/rating/${threadId}`}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Open full evaluation
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      {showCapBanner && (
        <div className="mt-2 flex items-start gap-2 rounded-md bg-red-100/60 px-3 py-2 text-[11px] leading-snug text-red-800">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <div>
            <p>
              Score override — score capped at {rating.capMaxScore}, down from a weighted{" "}
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
    </div>
  );
}

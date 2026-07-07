"use client";

import { AlertTriangle, Info } from "lucide-react";
import {
  evaluateContextUsage,
  zoneBody,
  zoneHeadline,
  type ContextInputs,
  type ContextUsage,
} from "../../lib/custom-agents-thresholds";

type Props = {
  /** Anything ContextInputs-shaped — typically the current draft version. */
  version: ContextInputs;
  /** Hide until at least this zone. "amber" (default) shows warnings at 25%+; "red" shows only at 50%+. */
  minZone?: "amber" | "red";
  /** Compact variant for narrow panels (Data / Skills sub-sections). */
  compact?: boolean;
};

/**
 * Context-utilization warning banner. Renders nothing in the green zone.
 * In amber, nudges the user. In red, warns hard about hallucination risk.
 */
export function ThresholdWarning({ version, minZone = "amber", compact }: Props) {
  const usage = evaluateContextUsage(version);
  if (usage.zone === "green") return null;
  if (minZone === "red" && usage.zone !== "red") return null;

  const tone =
    usage.zone === "red"
      ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
      : "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200";

  const Icon = usage.zone === "red" ? AlertTriangle : Info;

  return (
    <div className={`rounded-lg border ${tone} ${compact ? "px-3 py-2" : "p-3"}`}>
      <div className="flex items-start gap-2">
        <Icon className={`shrink-0 ${compact ? "mt-0.5 h-3.5 w-3.5" : "mt-0.5 h-4 w-4"}`} />
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${compact ? "text-[11px]" : "text-xs"}`}>
            {zoneHeadline(usage)}
          </p>
          {!compact && zoneBody(usage) && (
            <p className="mt-1 text-[11px] leading-relaxed">{zoneBody(usage)}</p>
          )}
          {!compact && <ContextBar usage={usage} />}
        </div>
      </div>
    </div>
  );
}

export function ContextBar({ usage }: { usage: ContextUsage }) {
  const pct = Math.min(100, Math.round(usage.ratio * 100));
  // Fixed gradient so the visualization stays intuitive even at 90%+ utilization.
  const fill =
    usage.zone === "red" ? "bg-amber-500" : usage.zone === "amber" ? "bg-amber-300" : "bg-emerald-400";

  return (
    <div className="mt-2">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
        {/* Zone markers at 25% and 50% */}
        <div className="absolute inset-y-0 left-1/4 w-px bg-foreground/20" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{usage.inputTokens.toLocaleString()} tokens / run</span>
        <span className="tabular-nums">{pct}% of 128K context</span>
      </div>
    </div>
  );
}

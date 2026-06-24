"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, type CostEstimate } from "../../lib/custom-agents-cost";
import {
  evaluateContextUsage,
  zoneBody,
  zoneHeadline,
  type ContextInputs,
} from "../../lib/custom-agents-thresholds";
import { ContextBar } from "./threshold-warning";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Full version-like object. We use every field on it. */
  version: ContextInputs;
  cost: CostEstimate | null;
  /** Label for the confirm button (e.g. "Save v2 · deploy live"). */
  confirmLabel: string;
  onConfirm: () => void;
};

/**
 * Shown when the author tries to deploy / save an agent whose single-run
 * context usage is past BLOCK_RATIO (currently 50%). In practice that means
 * real hallucination risk and materially higher cost per run.
 *
 * Callers should gate on `evaluateContextUsage(version).zone === "red"`
 * before opening this dialog — we render nothing otherwise as a safety net.
 */
export function ThresholdConfirmDialog({
  open,
  onOpenChange,
  version,
  cost,
  confirmLabel,
  onConfirm,
}: Props) {
  const usage = evaluateContextUsage(version);
  if (usage.zone !== "red") return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Heads up — this agent may hallucinate
          </DialogTitle>
          <DialogDescription>{zoneHeadline(usage)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-foreground">
          <p>{zoneBody(usage)}</p>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <ContextBar usage={usage} />
          </div>

          {cost && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-center justify-between">
                <span className="font-medium">Estimated cost at this size</span>
                <span className="tabular-nums">{formatCurrency(cost.perRunCost)} / run</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-amber-900/80">
                  Monthly (at {Math.round(cost.runsPerMonth)} runs)
                </span>
                <span className="tabular-nums">{formatCurrency(cost.monthlyCost)}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            You can continue, or trim the data sources + skills list and
            shorten the prompt. Another option: split this into two focused
            agents that delegate to each other.
          </p>
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Let me trim it down
          </Button>
          <Button
            className="bg-amber-600 text-white hover:bg-amber-700"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            Deploy anyway
            <span className="sr-only"> — {confirmLabel}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

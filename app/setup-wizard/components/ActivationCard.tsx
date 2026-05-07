"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Loader2,
  TriangleAlert,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ACTIVATION_TRIGGERS } from "../data";
import type { ActivationStatus, Property } from "../types";

type Props = {
  properties: Property[];
};

const STAGE_DELAY_MS = 600;
/** Trigger ids that intentionally fail in the demo for one property — gives
 *  the receipts log something interesting to show. Keep small. */
const DEMO_FAILED_TRIGGERS = new Set(["domain"]);

type Stage = "idle" | "running" | "complete";

export function ActivationCard({ properties }: Props) {
  const remaining = properties.filter((p) => p.progress < 100).length;
  const ready = remaining === 0;
  const prereqId = "activation-prereqs";

  const [stage, setStage] = useState<Stage>("idle");
  const [statuses, setStatuses] = useState<Record<string, ActivationStatus>>(
    () =>
      Object.fromEntries(
        ACTIVATION_TRIGGERS.map((t) => [t.id, "pending" as ActivationStatus]),
      ),
  );
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timerRef.current.forEach(clearTimeout);
    };
  }, []);

  const triggerCount = ACTIVATION_TRIGGERS.length;
  const completedTriggers = useMemo(
    () =>
      ACTIVATION_TRIGGERS.filter(
        (t) => statuses[t.id] === "done" || statuses[t.id] === "failed",
      ).length,
    [statuses],
  );
  const allFinished = completedTriggers === triggerCount;

  const startActivation = () => {
    if (!ready || stage === "running") return;
    setStage("running");
    setStatuses(
      Object.fromEntries(
        ACTIVATION_TRIGGERS.map((t) => [t.id, "firing" as ActivationStatus]),
      ),
    );
    timerRef.current.forEach(clearTimeout);
    timerRef.current = ACTIVATION_TRIGGERS.map((t, idx) =>
      setTimeout(
        () => {
          setStatuses((prev) => ({
            ...prev,
            [t.id]: DEMO_FAILED_TRIGGERS.has(t.id) ? "failed" : "done",
          }));
          if (idx === ACTIVATION_TRIGGERS.length - 1) {
            setStage("complete");
          }
        },
        STAGE_DELAY_MS * (idx + 1),
      ),
    );
  };

  const reset = () => {
    timerRef.current.forEach(clearTimeout);
    setStage("idle");
    setStatuses(
      Object.fromEntries(
        ACTIVATION_TRIGGERS.map((t) => [t.id, "pending" as ActivationStatus]),
      ),
    );
  };

  return (
    <Card className="mb-6 max-w-6xl">
      <CardContent className="py-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Zap className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              When you&apos;re ready, hit Go-Live
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              One click triggers everything below — work our team does manually
              today. Held items honor each property&apos;s anchor date (close,
              occupancy, transfer).
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {stage === "complete" && (
              <Button
                size="sm"
                variant="outline"
                onClick={reset}
                aria-label="Reset activation simulation"
              >
                Reset
              </Button>
            )}
            <Button
              size="sm"
              disabled={!ready || stage === "running"}
              onClick={startActivation}
              variant={ready ? "default" : "outline"}
              aria-describedby={!ready ? prereqId : undefined}
            >
              {stage === "running" ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Activating…
                </>
              ) : ready ? (
                <>
                  Go-Live
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </>
              ) : (
                <>
                  {remaining} item{remaining === 1 ? "" : "s"} left
                </>
              )}
            </Button>
          </div>
        </div>

        {!ready && (
          <p
            id={prereqId}
            role="status"
            aria-live="polite"
            className="mb-3 rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          >
            {remaining} {remaining === 1 ? "property is" : "properties are"} still
            below 100%. Finish setup on those properties before Go-Live unlocks.
          </p>
        )}

        {stage !== "idle" && (
          <p
            role="status"
            aria-live="polite"
            className="mb-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground"
          >
            {stage === "running"
              ? `Firing ${completedTriggers} of ${triggerCount}…`
              : `Activation complete · ${triggerCount - DEMO_FAILED_TRIGGERS.size} of ${triggerCount} succeeded`}
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIVATION_TRIGGERS.map((t) => {
            const Icon = t.icon;
            const status = statuses[t.id];
            return (
              <div
                key={t.id}
                className={cn(
                  "flex items-start gap-2 rounded-md border px-3 py-2 transition-colors",
                  status === "done"
                    ? "border-emerald-500/30 bg-emerald-50/60"
                    : status === "failed"
                      ? "border-red-500/30 bg-red-50/60"
                      : status === "firing"
                        ? "border-foreground/30 bg-muted/30"
                        : "border-border",
                )}
              >
                <div
                  className={cn(
                    "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    status === "done"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : status === "failed"
                        ? "bg-red-500/15 text-red-600"
                        : status === "firing"
                          ? "bg-foreground/10 text-foreground"
                          : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {status === "done" ? (
                    <Check className="h-3 w-3" />
                  ) : status === "failed" ? (
                    <TriangleAlert className="h-3 w-3" />
                  ) : status === "firing" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-foreground">
                      {t.title}
                    </p>
                    {status !== "pending" && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-xs",
                          status === "done" &&
                            "border-emerald-500/40 bg-emerald-50 text-emerald-800",
                          status === "failed" &&
                            "border-red-500/40 bg-red-50 text-red-700",
                          status === "firing" &&
                            "border-foreground/40 bg-muted/60 text-foreground",
                        )}
                      >
                        {status === "done"
                          ? "Done"
                          : status === "failed"
                            ? "Retry needed"
                            : "Firing"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {status === "failed"
                      ? "DNS verification failed for 1 property — retry queued, others succeeded."
                      : t.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {stage === "complete" && allFinished
            ? "Each result is logged per property in the receipts log. Open any property card to review."
            : "Today, an Entrata team member runs each of these manually. With Go-Live, the wizard fires every trigger in parallel and reports back per property in the receipts log."}
        </p>
      </CardContent>
    </Card>
  );
}

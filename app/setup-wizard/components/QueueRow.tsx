"use client";

import { ArrowRight, Check, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { MIGRATION_TYPE_META } from "../data";
import type { Property, QueueItem } from "../types";

export function affectedFor(item: QueueItem, properties: Property[]): Property[] {
  let pool: Property[] = [];
  if (item.scope === "cohort") {
    pool = properties;
  } else if (item.appliesToIds) {
    pool = properties.filter((p) => item.appliesToIds!.includes(p.id));
  }
  if (item.scope === "property" && item.id !== "confirm-migration") {
    return pool.filter((p) => p.migrationConfirmed);
  }
  return pool;
}

export function isItemDone(item: QueueItem, properties: Property[]) {
  const aff = affectedFor(item, properties);
  const completedSet = new Set(item.completedIds ?? []);
  return aff.length > 0 && aff.every((p) => completedSet.has(p.id));
}

type Props = {
  item: QueueItem;
  properties: Property[];
  /** Renders a 4px amber left border — used for the blocking gate item. */
  isBlocking?: boolean;
  /** Called when the Start/Review button is clicked — opens the task drawer. */
  onStart?: () => void;
  /** Shows the card in a disabled state with a Coming soon badge. */
  comingSoon?: boolean;
};

export function QueueRow({ item, properties, isBlocking = false, onStart, comingSoon = false }: Props) {
  if (comingSoon) {
    return (
      <div className="relative flex items-start gap-3 rounded-lg border border-border px-3 py-3">
        <div className="min-w-0 flex-1 opacity-40">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.context}</p>
        </div>
        <span className="self-center text-xs font-medium text-foreground">
          Coming soon
        </span>
      </div>
    );
  }
  const affected = affectedFor(item, properties);
  const completedSet = new Set(item.completedIds ?? []);
  const completedCount = affected.filter((p) => completedSet.has(p.id)).length;
  const total = affected.length;
  const allDone = total > 0 && completedCount === total;

  const pendingConfirmationCount =
    item.scope === "property" &&
    item.id !== "confirm-migration" &&
    item.appliesToIds
      ? properties.filter(
          (p) => item.appliesToIds!.includes(p.id) && !p.migrationConfirmed,
        ).length
      : 0;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-3",
        /* Blocking item: amber left border via box-shadow (no layout shift).
           Done item: subtle green tint. Default: standard border. */
        isBlocking && !allDone
          ? "border-amber-300 bg-amber-50/20 shadow-[inset_4px_0_0_0_theme(colors.amber.400)]"
          : allDone
            ? "border-emerald-500/30 bg-emerald-50/40"
            : "border-border",
      )}
    >
      {allDone && (
        <div
          className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"
          aria-hidden="true"
        >
          <Check className="h-3 w-3" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          {item.trigger?.toLowerCase().startsWith("first in") && (
            <Badge
              variant="outline"
              className="border-amber-400/60 bg-amber-50 text-xs font-semibold uppercase tracking-wide text-amber-800"
            >
              {item.trigger}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{item.context}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          {item.id === "confirm-migration" ? (
            /* Confirm step: show only unconfirmed chips — "X done" badge carries
               the count of confirmed. Consistent with every other row. */
            <>
              {affected
                .filter((p) => !p.migrationConfirmed)
                .map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500/60 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
                  >
                    <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                    {p.name}
                  </span>
                ))}
            </>
          ) : (
            <>
              {affected.map((p) => {
                const meta = MIGRATION_TYPE_META[p.migrationType];
                const isDone = completedSet.has(p.id);
                return (
                  <span
                    key={p.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium",
                      isDone
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800"
                        : meta.chipClass,
                    )}
                  >
                    {isDone ? (
                      <Check className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <span
                        className={cn("h-1 w-1 rounded-full", meta.dotClass)}
                        aria-hidden="true"
                      />
                    )}
                    {p.name}
                  </span>
                );
              })}
              {pendingConfirmationCount > 0 && (
                <span className="text-xs italic text-muted-foreground">
                  + {pendingConfirmationCount} pending confirmation
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <Button
        size="sm"
        variant={allDone ? "outline" : "default"}
        className="self-center w-24 shrink-0 justify-center"
        onClick={onStart}
      >
        {allDone ? "Review" : item.cta}
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

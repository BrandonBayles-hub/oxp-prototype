"use client";

import { ChevronRight, Lock, Sparkles, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

import { MIGRATION_TYPE_META } from "../data";
import type { Property } from "../types";

type Props = {
  property: Property;
  onOpen: (p: Property) => void;
};

/**
 * Fixed-slot card layout — identical structure on every card:
 *
 *   Slot 1 — Name + status chip (or warning icon for unconfirmed)
 *   Slot 2 — units · products + state label
 *   Slot 3 — anchor date / locale flag (min-h reserved for alignment)
 *   Slot 4 — progress bar
 *   Slot 5 — action footer pill (mt-auto, locked to bottom)
 *
 * Unconfirmed properties: amber dashed card border + small ⚠ icon next to
 * the name. No text chip — keeps the name fully readable. Hovering the icon
 * shows a tooltip directing the user to the "Do first" queue item.
 */
export function PropertyCard({ property: p, onOpen }: Props) {
  const isJustAdded = p.state_label === "Just added";
  const isBlocked = !p.migrationConfirmed;
  const meta = MIGRATION_TYPE_META[p.migrationType];

  return (
    <button
      type="button"
      onClick={() => onOpen(p)}
      aria-label={
        isBlocked
          ? `${p.name} — type not confirmed, see Do first on your plate`
          : `See receipts for ${p.name}`
      }
      className={cn(
        "group flex h-full flex-col items-start gap-2 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-none",
        isBlocked
          ? "border-dashed border-amber-400 bg-amber-50/30 hover:border-amber-500 hover:bg-amber-50/60 focus-visible:border-amber-500"
          : isJustAdded
            ? "border-violet-500/40 bg-violet-50/40 hover:border-violet-500/70"
            : "border-border hover:border-foreground/40",
      )}
    >
      {/* Slot 1 — name + chip */}
      <div className="flex w-full items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {p.name}
          </p>
        </div>
        {!isBlocked && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-wide",
              meta.chipClass,
            )}
          >
            <span
              className={cn("h-1 w-1 rounded-full", meta.dotClass)}
              aria-hidden="true"
            />
            {meta.label}
          </span>
        )}
      </div>

      {/* Slot 2 — units · products + state */}
      <div className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">
          {p.units} units · {p.productCount} products
        </span>
        <span className="shrink-0 tabular-nums">{p.state_label}</span>
      </div>

      {/* Slot 3 — anchor date / locale (always reserved for alignment) */}
      <div className="flex min-h-[1.5rem] w-full flex-wrap items-center gap-2">
        {!isBlocked && (
          <>
            {p.anchorDateLabel && (
              <span className="text-xs text-muted-foreground">
                {p.anchorDateLabel}
              </span>
            )}
            {p.newLocale && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                First in {p.newLocale}
              </span>
            )}
          </>
        )}
      </div>

      {/* Slot 4 — progress bar */}
      <div className="w-full">
        <div className="flex items-center justify-end text-xs text-muted-foreground">
          <span className="tabular-nums">{p.progress}%</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all",
              isBlocked
                ? "bg-amber-300"
                : isJustAdded
                  ? "bg-violet-500"
                  : "bg-emerald-600",
            )}
            style={{ width: `${p.progress}%` }}
          />
        </div>
      </div>

      {/* Slot 5 — action footer (locked to bottom) */}
      <div
        className={cn(
          "mt-auto flex w-full items-center justify-between gap-1 rounded-md border px-2 py-2 text-xs font-medium transition-colors",
          isBlocked
            ? "border-amber-400/60 bg-amber-50 text-amber-800 group-hover:bg-amber-100"
            : isJustAdded
              ? "border-violet-500/30 bg-violet-50 text-violet-700 group-hover:bg-violet-100"
              : "border-emerald-600/20 bg-emerald-50 text-emerald-800 group-hover:bg-emerald-100",
        )}
      >
        <span className="flex items-center gap-1">
          {isBlocked ? (
            <Lock className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Sparkles
              className={cn(
                "h-3 w-3",
                isJustAdded ? "text-violet-500" : "text-emerald-600",
              )}
              aria-hidden="true"
            />
          )}
          {`How we got to ${p.progress}%`}
        </span>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
      </div>
    </button>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="flex h-full flex-col items-start gap-2 rounded-lg border border-border px-3 py-3">
      <div className="flex w-full items-start justify-between gap-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="h-3 w-3/4 animate-pulse rounded bg-muted/70" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-muted/50" />
      <div className="h-1 w-full animate-pulse rounded-full bg-muted" />
      <div className="mt-auto h-7 w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}

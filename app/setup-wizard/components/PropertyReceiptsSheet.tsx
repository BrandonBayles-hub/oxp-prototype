"use client";

import {
  CheckCircle2,
  ClipboardList,
  Pencil,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { MIGRATION_TYPE_META, getPropertyReceipts } from "../data";
import type { Bucket, Property } from "../types";

type Props = {
  property: Property | null;
  bucket: Bucket;
  onClose: () => void;
};

export function PropertyReceiptsSheet({ property, bucket, onClose }: Props) {
  const receipts = property ? getPropertyReceipts(property, bucket) : [];
  const isJustAdded = property?.state_label === "Just added";
  const automatedCount = receipts.filter((r) => r.confidence >= 80).length;

  return (
    <Sheet open={!!property} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        {property && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles
                  className={cn(
                    "h-4 w-4",
                    isJustAdded ? "text-violet-500" : "text-emerald-600",
                  )}
                  aria-hidden="true"
                />
                What we did for {property.name}
              </SheetTitle>
              <SheetDescription>
                {property.city}, {property.state} · {property.units} units ·{" "}
                {property.productCount} products · {property.progress}% configured
              </SheetDescription>
            </SheetHeader>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {property.migrationConfirmed ? (
                (() => {
                  const meta = MIGRATION_TYPE_META[property.migrationType];
                  return (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-wide",
                        meta.chipClass,
                      )}
                    >
                      <span
                        className={cn("h-1 w-1 rounded-full", meta.dotClass)}
                        aria-hidden="true"
                      />
                      {meta.label}
                    </span>
                  );
                })()
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500/60 bg-amber-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                  Needs confirm
                </span>
              )}
              {property.anchorDateLabel && property.migrationConfirmed && (
                <span className="text-xs text-muted-foreground">
                  {property.anchorDateLabel}
                </span>
              )}
              {property.newLocale && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                  First in {property.newLocale}
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <div
                className={cn(
                  "rounded-lg border p-3 text-xs",
                  isJustAdded
                    ? "border-violet-500/30 bg-violet-50/50 text-violet-900"
                    : "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                {isJustAdded ? (
                  <span>
                    {property.name} was added today. We&apos;re replaying the
                    cohort&apos;s settings now — review when it finishes.
                  </span>
                ) : (
                  <span>
                    {MIGRATION_TYPE_META[property.migrationType].helper} We
                    applied {automatedCount} settings using data we already
                    had — tap any row to override.
                  </span>
                )}
              </div>

              {receipts.map((r) => {
                const Icon = r.sourceIcon;
                const lowConfidence = r.confidence > 0 && r.confidence < 80;
                const pending = r.confidence === 0;
                return (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3"
                  >
                    <div
                      className={cn(
                        "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                        pending
                          ? "bg-amber-500/10 text-amber-700"
                          : "bg-emerald-500/10 text-emerald-600",
                      )}
                      aria-hidden="true"
                    >
                      {pending ? (
                        <TriangleAlert className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {r.label}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 text-xs",
                            pending &&
                              "border-amber-400/60 bg-amber-50 text-amber-800",
                            lowConfidence &&
                              "border-amber-400/60 bg-amber-50 text-amber-800",
                          )}
                        >
                          {pending ? "Needs input" : `${r.confidence}% confident`}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-foreground">{r.value}</p>
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        <span>From: {r.sourceLabel}</span>
                      </div>
                    </div>
                    {r.editable && (
                      <button
                        type="button"
                        className="shrink-0 rounded-md border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:border-border focus-visible:text-foreground focus-visible:outline-none"
                        aria-label={`Edit ${r.label}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              <ClipboardList
                className="mt-1 h-3 w-3 shrink-0"
                aria-hidden="true"
              />
              <span>
                Receipts log — every change updates this list and is logged
                against {property.name}.
              </span>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

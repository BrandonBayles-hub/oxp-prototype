"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function LifecycleGlossary({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("rounded-lg border border-border bg-background", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-muted/40"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        Collection lifecycle — Pre-Collections, Collections &amp; PRP
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Rent Reminder → Delinquency → Pre-Collections → Collections → PRP</span>{" "}
            follow the billing cycle. Legal notices and eviction timing come from Company Settings; Payments AI cadence
            layers on top without replacing certified notices.
          </p>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">Pre-Collections</dt>
              <dd>Severely delinquent accounts before formal collections referral. Pay-or-quit and high-stakes outreach.</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Collections</dt>
              <dd>Formal collections process after pre-collections thresholds. Often overlaps with legal notice delivery.</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">PRP (Past Resident Payments)</dt>
              <dd>Post move-out balance recovery while the past resident can still pay online. PRP AI should own the gap before an external agency takes the account.</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Agency handoff window</dt>
              <dd>
                Example: accounts sent to a collections agency <span className="font-medium text-foreground">3 days after move-out</span>.
                PRP cadence targets that window aggressively so nothing falls through the cracks.
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

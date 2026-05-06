"use client";
import * as React from "react";
import type { TraceStep, Citation } from "@/lib/entrata-experts-v2/types";
import { ChevronRight, Activity, FileText, Receipt, Wrench, FileSignature, MessageSquare, Ticket, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON: Record<Citation["type"], React.ComponentType<{ className?: string }>> = {
  report: FileText,
  ledger: Receipt,
  "work-order": Wrench,
  lease: FileSignature,
  nps: MessageSquare,
  ticket: Ticket,
  policy: Shield,
};

export function TraceView({ trace, citations }: { trace: TraceStep[]; citations: Citation[] }) {
  const [open, setOpen] = React.useState(false);
  const totalMs = trace.reduce((s, st) => s + (st.durationMs ?? 0), 0);
  return (
    <div className="rounded-md border border-border bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
      >
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Trace</span>
        <span className="font-normal text-muted-foreground">
          · {trace.length} steps · {(totalMs / 1000).toFixed(1)}s
        </span>
        <ChevronRight className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <ol className="space-y-2.5 px-3 pb-3 pt-1">
          {trace.map((step, i) => (
            <li key={i} className="flex gap-3 text-xs">
              <div className="mt-0.5 flex shrink-0 flex-col items-center">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
                {i < trace.length - 1 && <div className="mt-1 min-h-[18px] w-px flex-1 bg-border" />}
              </div>
              <div className="min-w-0 flex-1 pb-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground">{step.label}</span>
                  {step.durationMs && (
                    <span className="shrink-0 tabular-nums text-muted-foreground">{step.durationMs}ms</span>
                  )}
                </div>
                {step.detail && <div className="mt-0.5 leading-relaxed text-muted-foreground">{step.detail}</div>}
                {step.cited && step.cited.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {step.cited.map((cid) => {
                      const c = citations.find((x) => x.id === cid);
                      if (!c) return null;
                      const Icon = ICON[c.type];
                      return (
                        <span
                          key={cid}
                          className="inline-flex h-[18px] items-center gap-1 rounded border border-border bg-background px-1.5 text-[10px] text-foreground"
                        >
                          <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                          {c.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

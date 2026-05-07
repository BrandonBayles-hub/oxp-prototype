"use client";
import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Citation } from "@/lib/entrata-experts-v2/types";
import { FileText, Receipt, Wrench, FileSignature, MessageSquare, Ticket, Shield } from "lucide-react";

const ICON: Record<Citation["type"], React.ComponentType<{ className?: string }>> = {
  report: FileText,
  ledger: Receipt,
  "work-order": Wrench,
  lease: FileSignature,
  nps: MessageSquare,
  ticket: Ticket,
  policy: Shield,
};

export function CitationChip({ citation, index }: { citation: Citation; index: number }) {
  const Icon = ICON[citation.type];
  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <span className="inline-flex h-5 min-w-5 cursor-help items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted/80">
          {index}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[320px]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Icon className="h-3 w-3" />
            <span>{citation.label}</span>
          </div>
          <div className="text-[11px] leading-snug text-muted-foreground">{citation.source}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

"use client";
import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Brain, ChevronDown } from "lucide-react";

export function MemoryChip({ remembered }: { remembered: string[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-[12px] text-foreground transition-colors hover:bg-muted/60">
          <Brain className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden md:inline">Remembered ({remembered.length})</span>
          <span className="md:hidden">Memory</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] p-0">
        <div className="border-b border-border px-3 py-2">
          <div className="text-sm font-medium text-foreground">What I remember about you</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            From your last 30 days of conversations · Editable
          </div>
        </div>
        <div className="space-y-1 p-2">
          {remembered.map((m, i) => (
            <div
              key={i}
              className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[13px] text-foreground"
            >
              {m}
            </div>
          ))}
        </div>
        <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          You can clear this any time from Settings.
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";
import * as React from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";

/**
 * Generic starter-prompt grid used at the bottom of any chat empty state.
 * Both Analyst (role-based prompts) and Assistant (assistant-specific
 * starters) render through this component for visual consistency.
 */
export function SuggestedStarters({
  title,
  prompts,
  onPick,
}: {
  title: string;
  prompts: string[];
  onPick: (prompt: string) => void;
}) {
  if (prompts.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        {title}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="group flex items-start justify-between gap-2 rounded-lg border border-border bg-background px-3.5 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <span className="text-sm leading-snug text-foreground">{p}</span>
            <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

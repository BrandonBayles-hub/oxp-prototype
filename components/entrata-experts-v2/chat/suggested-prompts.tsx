"use client";
import * as React from "react";
import { SUGGESTED_PROMPTS } from "@/lib/entrata-experts-v2/data/answers";
import { ROLE_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import type { RoleId } from "@/lib/entrata-experts-v2/types";
import { Sparkles, ArrowUpRight } from "lucide-react";

export function SuggestedPrompts({
  role,
  onPick,
}: {
  role: RoleId;
  onPick: (prompt: string) => void;
}) {
  const prompts = SUGGESTED_PROMPTS[role] ?? SUGGESTED_PROMPTS["vp-ops"];
  const roleDef = ROLE_BY_ID[role];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        Try a starting question · {roleDef.label}
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

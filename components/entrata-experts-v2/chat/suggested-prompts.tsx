"use client";
import * as React from "react";
import { SUGGESTED_PROMPTS } from "@/lib/entrata-experts-v2/data/answers";
import { ROLE_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import type { RoleId } from "@/lib/entrata-experts-v2/types";
import { SuggestedStarters } from "./suggested-starters";

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
    <SuggestedStarters
      title={`Try a starting question · ${roleDef.label}`}
      prompts={prompts}
      onPick={onPick}
    />
  );
}

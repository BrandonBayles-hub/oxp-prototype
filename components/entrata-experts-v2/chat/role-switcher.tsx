"use client";
import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ROLES, ROLE_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import type { RoleId } from "@/lib/entrata-experts-v2/types";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function RoleSwitcher({
  role,
  onChangeRole,
}: {
  role: RoleId;
  onChangeRole: (r: RoleId) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const r = ROLE_BY_ID[role];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-[12px] text-foreground transition-colors hover:bg-muted/60">
          <span className="text-muted-foreground">Demo as</span>
          <span className="font-medium">{r.label}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-1">
        {ROLES.map((rr) => (
          <button
            key={rr.id}
            onClick={() => {
              onChangeRole(rr.id);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted/60",
              rr.id === role && "bg-muted",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{rr.label}</span>
                {rr.id === role && <Check className="h-3.5 w-3.5 text-foreground" />}
              </div>
              <div className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{rr.blurb}</div>
            </div>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

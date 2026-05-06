"use client";
import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { PROPERTIES, REGION_DEFS } from "@/lib/entrata-experts-v2/data/portfolio";
import type { Scope } from "@/lib/entrata-experts-v2/types";
import { Building2, ChevronDown, Globe, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScopePicker({
  scope,
  onChange,
}: {
  scope: Scope;
  onChange: (scope: Scope) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const Icon = scope.kind === "portfolio" ? Globe : scope.kind === "region" ? MapPin : Building2;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 hover:bg-muted/60",
            "text-[12px] font-medium text-foreground transition-colors",
          )}
        >
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{scope.label}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-1">
        <button
          type="button"
          onClick={() => {
            onChange({ kind: "portfolio", id: "portfolio", label: "Whole portfolio" });
            setOpen(false);
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted/60",
            scope.id === "portfolio" && "bg-muted",
          )}
        >
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">Whole portfolio</span>
          <span className="ml-auto text-xs text-muted-foreground">{PROPERTIES.length} properties</span>
          {scope.id === "portfolio" && <Check className="h-3.5 w-3.5 text-foreground" />}
        </button>

        <div className="px-2.5 pb-0.5 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Regions
        </div>
        {REGION_DEFS.filter((r) => r.id !== "all").map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              onChange({ kind: "region", id: r.id, label: r.label });
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted/60",
              scope.id === r.id && "bg-muted",
            )}
          >
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{r.label}</span>
            <span className="ml-auto text-xs text-muted-foreground">{r.propertyIds.length}</span>
            {scope.id === r.id && <Check className="h-3.5 w-3.5 text-foreground" />}
          </button>
        ))}

        <div className="px-2.5 pb-0.5 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Properties
        </div>
        <div className="max-h-[180px] overflow-y-auto scrollbar-hover">
          {PROPERTIES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange({ kind: "property", id: p.id, label: p.shortName, segment: p.segment });
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted/60",
                scope.id === p.id && "bg-muted",
              )}
            >
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate">{p.shortName}</div>
                <div className="text-[11px] text-muted-foreground">
                  {p.city}, {p.state} · {p.segment}
                </div>
              </div>
              {scope.id === p.id && <Check className="h-3.5 w-3.5 text-foreground" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

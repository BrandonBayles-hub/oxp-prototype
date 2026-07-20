"use client";

import { Input } from "@/components/ui/input";
import {
  getThresholdNumericValue,
  setThresholdNumericValue,
  type BalanceThreshold,
} from "@/lib/payments-ai-thresholds";
import { cn } from "@/lib/utils";

type Props = {
  value: BalanceThreshold;
  onChange: (next: BalanceThreshold) => void;
  avgRent?: number;
  label?: string;
  className?: string;
};

export function BalanceThresholdInput({ value, onChange, label, className }: Props) {
  const numeric = getThresholdNumericValue(value);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm text-foreground">{label}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => onChange({ mode: "fixed", amount: value.mode === "fixed" ? value.amount : numeric })}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              value.mode === "fixed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Fixed $
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({ mode: "percentOfRent", percent: value.mode === "percentOfRent" ? value.percent : numeric })
            }
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              value.mode === "percentOfRent"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            % of rent
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {value.mode === "fixed" && <span className="text-sm text-muted-foreground">$</span>}
          <Input
            type="number"
            min={0}
            max={value.mode === "percentOfRent" ? 500 : undefined}
            step={value.mode === "percentOfRent" ? 1 : 1}
            value={numeric}
            onChange={(e) => onChange(setThresholdNumericValue(value, Number(e.target.value) || 0))}
            className="h-8 w-24 text-sm"
          />
          {value.mode === "percentOfRent" && <span className="text-sm text-muted-foreground">%</span>}
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  useFeatureEntitlements,
  type FeatureId,
} from "@/lib/feature-entitlements-context";
import { cn } from "@/lib/utils";

type ContractedFilterTabsProps = {
  featureId: FeatureId;
  className?: string;
};

export function ContractedFilterTabs({
  featureId,
  className,
}: ContractedFilterTabsProps) {
  const { isContracted, toggleFeature } = useFeatureEntitlements();
  const contracted = isContracted(featureId);

  return (
    <div
      className={cn(
        "inline-flex h-9 items-center rounded-lg border border-border bg-muted p-1 text-muted-foreground",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => !contracted && toggleFeature(featureId)}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
          contracted
            ? "bg-background text-foreground shadow-sm"
            : "hover:text-foreground",
        )}
      >
        Contracted
      </button>
      <button
        type="button"
        onClick={() => contracted && toggleFeature(featureId)}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
          !contracted
            ? "bg-background text-foreground shadow-sm"
            : "hover:text-foreground",
        )}
      >
        Not Contracted
      </button>
    </div>
  );
}

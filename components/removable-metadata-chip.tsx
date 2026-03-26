"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared chip style for removable tags in document metadata (Property, Viewers, etc.). */
export const metadataChipClassName =
  "inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground";

type RemovableMetadataChipProps = {
  children: React.ReactNode;
  className?: string;
  onRemove?: () => void;
  removeLabel?: string;
};

export function RemovableMetadataChip({ children, className, onRemove, removeLabel }: RemovableMetadataChipProps) {
  return (
    <span className={cn(metadataChipClassName, className)}>
      <span className="min-w-0 truncate">{children}</span>
      {onRemove != null && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded hover:bg-muted"
          aria-label={removeLabel ?? "Remove"}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

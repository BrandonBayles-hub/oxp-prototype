"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, SquarePen } from "lucide-react";

export function BackBar({
  title,
  subtitle,
  onBack,
  onNew,
  newLabel = "New chat",
  rightSlot,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack: () => void;
  onNew?: () => void;
  newLabel?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-background px-3 py-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={onBack}
        aria-label="Back to Entrata Experts"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{title}</div>
        {subtitle && <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      {rightSlot}
      {onNew && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onNew}
          aria-label={newLabel}
          title={newLabel}
        >
          <SquarePen className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

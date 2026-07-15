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
  hideBack = false,
  hideNew = false,
  leadingColumnWidth,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack: () => void;
  onNew?: () => void;
  newLabel?: string;
  rightSlot?: React.ReactNode;
  hideBack?: boolean;
  hideNew?: boolean;
  // When provided, the title/subtitle block is pinned into a fixed-width
  // column on the left (matched in styling to a sidebar below it). The rest
  // of the bar — back button, rightSlot, new-chat button — flows in the
  // remaining flex-1 space to the right of the column. Used by AnalystChat
  // in the chat-first hub to align the header with the threads sidebar.
  leadingColumnWidth?: string;
}) {
  const backButton = !hideBack && (
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
  );

  const newButton = !hideNew && onNew && (
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
  );

  if (leadingColumnWidth) {
    const hasTrailingContent = Boolean(backButton || rightSlot || newButton);
    return (
      <div className="flex items-stretch bg-background">
        <div
          className="flex shrink-0 flex-col justify-center border-r border-border bg-muted/30 px-3 py-2"
          style={{ width: leadingColumnWidth }}
        >
          <div className="truncate text-sm font-semibold text-foreground">{title}</div>
          {subtitle && (
            <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
          )}
        </div>
        {hasTrailingContent && (
          <div className="flex flex-1 items-center justify-end gap-2 px-3 py-2">
            {backButton}
            {rightSlot}
            {newButton}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-background px-3 py-2">
      {backButton}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{title}</div>
        {subtitle && <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      {rightSlot}
      {newButton}
    </div>
  );
}

"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Quiet export control for Golden Prototype metric cards / drill-ins. */
export function ExportCsvButton({
  onExport,
  label = "Export CSV",
  className,
  size = "sm",
}: {
  onExport: () => void;
  label?: string;
  className?: string;
  size?: "sm" | "icon";
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size === "icon" ? "icon" : "sm"}
      className={cn(
        size === "icon" ? "h-7 w-7" : "h-7 gap-1.5 px-2.5 text-xxs",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onExport();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      aria-label={label}
      title={label}
    >
      <Download className="h-3.5 w-3.5" />
      {size === "sm" ? <span>{label}</span> : null}
    </Button>
  );
}

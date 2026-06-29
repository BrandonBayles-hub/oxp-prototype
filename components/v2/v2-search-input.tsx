"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Version Two toolbar search input — the canonical "My Tasks" search field used
 * across escalations-v2, workforce-v2, and SOPs & Knowledge. Use this instead of
 * the shadcn `<Input>` (CLAUDE.md / v2-redesign skill): a leading `Search` icon
 * and a trailing clear (`X`) button that only appears when there's a value.
 *
 * Canonical reference: `app/escalations/escalations-v2.tsx`.
 */
export function V2SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Wrapper width override (defaults to `relative w-full sm:w-64`). */
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-7 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

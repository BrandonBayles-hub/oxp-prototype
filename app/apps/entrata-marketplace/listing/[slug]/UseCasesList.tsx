"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";

const DEFAULT_VISIBLE = 5;

function getUseCaseName(uc: string | { title?: string; name?: string; description?: string }): string {
  if (typeof uc === "string") return uc;
  return uc.name ?? uc.title ?? "";
}

export function UseCasesList({
  useCases,
  defaultVisibleCount = DEFAULT_VISIBLE,
}: {
  useCases: Array<string | { title?: string; name?: string; description?: string }>;
  defaultVisibleCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? useCases : useCases.slice(0, defaultVisibleCount);
  const hasMore = useCases.length > defaultVisibleCount;

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-foreground">
        Use Cases
      </h3>
      <ul className="space-y-2">
        {visible.map((uc, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="font-medium text-foreground">
              {getUseCaseName(uc)}
            </span>
          </li>
        ))}
      </ul>
      {hasMore && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ChevronDown className="h-4 w-4" />
          Show more ({useCases.length - defaultVisibleCount} more)
        </button>
      )}
    </div>
  );
}

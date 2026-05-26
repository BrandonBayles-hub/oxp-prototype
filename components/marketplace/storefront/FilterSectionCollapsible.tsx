"use client";

import { useState, Children } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/marketplace/utils/utils";

const DEFAULT_VISIBLE = 5;

export function FilterSectionCollapsible({
  title,
  defaultVisibleCount = DEFAULT_VISIBLE,
  children,
}: {
  title: string;
  defaultVisibleCount?: number;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  const visibleCount = defaultVisibleCount;
  const hasMore = items.length > visibleCount;
  const visible = expanded ? items : items.slice(0, visibleCount);

  return (
    <div>
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1">
        {visible}
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            )}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show more ({items.length - visibleCount} more)
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

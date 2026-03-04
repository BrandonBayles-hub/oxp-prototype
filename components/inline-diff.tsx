"use client";

import { useMemo } from "react";
import { diffWords } from "diff";

export function InlineDiff({
  oldText,
  newText,
}: {
  oldText: string;
  newText: string;
}) {
  const parts = useMemo(() => diffWords(oldText, newText), [oldText, newText]);

  const hasChanges = parts.some((p) => p.added || p.removed);

  if (!hasChanges) {
    return <span>{newText}</span>;
  }

  return (
    <span>
      {parts.map((part, i) => {
        if (part.added) {
          return (
            <mark
              key={i}
              className="rounded-sm bg-emerald-100 px-0.5 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
            >
              {part.value}
            </mark>
          );
        }
        if (part.removed) {
          return (
            <del
              key={i}
              className="rounded-sm bg-red-100 px-0.5 text-red-800 line-through dark:bg-red-900/40 dark:text-red-200"
            >
              {part.value}
            </del>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
}

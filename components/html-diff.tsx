"use client";

import { useMemo } from "react";
import diff from "node-htmldiff";

export function HtmlDiff({
  oldHtml,
  newHtml,
  className = "",
}: {
  oldHtml: string;
  newHtml: string;
  className?: string;
}) {
  const diffHtml = useMemo(() => diff(oldHtml, newHtml), [oldHtml, newHtml]);

  return (
    <div
      className={`html-diff prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: diffHtml }}
    />
  );
}

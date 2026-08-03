"use client";

// ConsoleBreadcrumb — the platform's one breadcrumb trail.
// ---------------------------------------------------------------------------
// Ported from entrata-3.0 (components/eli-console/console-breadcrumb.tsx) so
// this prototype and the 3.0 platform navigate identically. On the ELI+ agent
// reports it replaces the per-page "Back to Performance" link: the breadcrumb
// is the way back, and unlike a back link it also says where you are.
//
// Quiet, one line, sits above the page header.

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href: string;
}

export function ConsoleBreadcrumb({
  page,
  parents = [],
  root = { label: "ELI Console", href: "/eli-console" },
  action,
  className,
}: {
  /** The current page's name, e.g. "Renewals AI". Not a link. */
  page: string;
  /** Intermediate crumbs between the root and the current page. */
  parents?: Crumb[];
  /** The pillar the trail starts from. */
  root?: Crumb;
  /** Optional right-aligned control sharing the breadcrumb row. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <nav
        aria-label="Breadcrumb"
        // A constant 32px row keeps the rhythm identical whether or not the
        // row carries action buttons.
        className="flex min-h-[32px] items-center gap-1 text-xs"
      >
        {[root, ...parents].map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-1">
            <Link
              href={crumb.href}
              className="rounded-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {crumb.label}
            </Link>
            <ChevronRight aria-hidden className="h-3 w-3 text-muted-foreground/50" />
          </span>
        ))}
        <span aria-current="page" className="font-medium text-foreground">
          {page}
        </span>
      </nav>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

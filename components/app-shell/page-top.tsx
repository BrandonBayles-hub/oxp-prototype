"use client";

// PageTop — THE standardized page-top system ("quiet strip").
// ---------------------------------------------------------------------------
// Ported from entrata-3.0 (components/app-shell/page-top.tsx). The header is
// part of the canvas rather than a card, so the widgets and containers below
// it stand out more.
//
// One grammar on every page:
//   [breadcrumb row — sub-pages only, 32px]
//   [H1 (one title ramp) ......................... action cluster]
//   [description]
//   [meta slot — metrics / ticker, un-carded]
//   [hairline divider closing the zone]
//
// The action cluster's order never changes:
//   sub-page links (outline + leading icon) → ONE primary (near-black) →
//   icon utilities.
//
// NOTE: deliberately NOT classed `page-header` — a legacy
// `.page-content .page-header h1` rule would out-specify the title ramp.

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { ConsoleBreadcrumb, type Crumb } from "@/components/eli-console/console-breadcrumb";
import { cn } from "@/lib/utils";

export interface PageTopCrumb {
  /** Trail root (the section). */
  root?: Crumb;
  parents?: Crumb[];
  page: string;
}

export interface PageTopLink {
  label: string;
  icon: LucideIcon;
  href: string;
}

export interface PageTopProps {
  /** Breadcrumb — sub-pages only. Landing pages get no self-crumb. */
  crumb?: PageTopCrumb;
  /** Optional small-caps line above the title. Quiet. */
  eyebrow?: ReactNode;
  /** Page title — one ramp everywhere. */
  title: ReactNode;
  description?: ReactNode;
  /** Sub-page link buttons — always outline + leading icon, h-8. */
  linkButtons?: PageTopLink[];
  /** Right-cluster content rendered after the link buttons. */
  actions?: ReactNode;
  /** Un-carded strip below the description (metric tiles, ticker). */
  meta?: ReactNode;
  /** Hairline closing the header zone. Disable when the page opens with its
   *  own full-width divider (a tab strip, a sticky filter bar). */
  divider?: boolean;
  className?: string;
}

/** The canonical sub-page link button. */
export function PageTopLinkButton({
  icon: Icon,
  label,
  href,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const cls = cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

export function PageTop({
  crumb,
  eyebrow,
  title,
  description,
  linkButtons,
  actions,
  meta,
  divider = true,
  className,
}: PageTopProps) {
  return (
    <header data-testid="page-top" className={cn("w-full", className)}>
      {crumb ? (
        <ConsoleBreadcrumb
          root={crumb.root}
          parents={crumb.parents}
          page={crumb.page}
          className="mb-1"
        />
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-1 text-xxs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="flex items-center gap-2 text-[clamp(1.5rem,2.4vw,1.875rem)] font-semibold leading-[1.1] tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {linkButtons?.length || actions ? (
          <div className="flex shrink-0 items-center gap-1.5 pt-1">
            {linkButtons?.map((l) => (
              <PageTopLinkButton key={l.href} icon={l.icon} label={l.label} href={l.href} />
            ))}
            {actions}
          </div>
        ) : null}
      </div>
      {meta ? <div className="mt-4">{meta}</div> : null}
      {divider ? <div className="mb-5 mt-4 border-b border-border" aria-hidden /> : null}
    </header>
  );
}

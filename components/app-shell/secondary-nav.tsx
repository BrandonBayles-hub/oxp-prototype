"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface SecondaryNavItem {
  /** Stable identifier used for selection + keys. */
  id: string;
  label: string;
  /** Optional leading icon. */
  icon?: LucideIcon;
  /** Optional trailing count badge. */
  count?: number;
  /** When provided the item renders as a link instead of a button. */
  href?: string;
  /** Per-item disabled state. */
  disabled?: boolean;
}

export interface SecondaryNavAction {
  icon: LucideIcon;
  /** Accessible label (also used as the tooltip). */
  label: string;
  onClick: () => void;
}

export interface SecondaryNavProps {
  /** Heading shown at the top of the rail. */
  title: string;
  items: SecondaryNavItem[];
  /** id of the currently-active item. */
  activeId?: string;
  /** Selection handler for button-mode items. */
  onSelect?: (id: string) => void;
  /** Optional top-right action (e.g. a settings gear). */
  headerAction?: SecondaryNavAction;
  className?: string;
}

/**
 * Global secondary navigation rail. A reusable left-column nav that sits to the
 * right of the primary icon rail. Items support hover + selected states, a
 * trailing count badge, and an optional header action (top-right). Fully
 * keyboard reachable: items are native buttons/links, the active item carries
 * `aria-current`, and every interactive element exposes a focus-visible ring.
 */
export function SecondaryNav({
  title,
  items,
  activeId,
  onSelect,
  headerAction,
  className,
}: SecondaryNavProps) {
  const Action = headerAction?.icon;

  return (
    <TooltipProvider delayDuration={500}>
      <nav
        aria-label={title}
        className={cn(
          "flex h-full w-52 shrink-0 flex-col border-r border-border bg-background",
          className
        )}
      >
        {/* Header: title + optional action (top-right) */}
        <div className="flex h-14 items-center gap-2 px-4">
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {headerAction && Action && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={headerAction.onClick}
                  aria-label={headerAction.label}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Action className="h-4 w-4 shrink-0 stroke-[1.5]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{headerAction.label}</TooltipContent>
            </Tooltip>
          )}
        </div>

        <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {items.map((item) => {
            const isActive = item.id === activeId;
            const Icon = item.icon;
            const content = (
              <>
                {Icon && <Icon className="h-4 w-4 shrink-0 stroke-[1.5]" />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.count != null && (
                  <span
                    className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-xxs font-semibold leading-none text-background"
                    aria-label={`${item.count} items`}
                  >
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                )}
              </>
            );

            const sharedClass = cn(
              "flex w-full items-center gap-2.5 rounded-md border border-transparent px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              item.disabled && "pointer-events-none opacity-50",
              isActive
                ? "border-border bg-muted text-foreground"
                : "text-foreground hover:bg-muted/60"
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={sharedClass}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect?.(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    disabled={item.disabled}
                    className={sharedClass}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </TooltipProvider>
  );
}

"use client";

import { useRef, useState } from "react";

/**
 * Version Two data-grid primitives — the single source of truth for the frozen
 * left-column treatment shared by the My Tasks / escalations-v2, Playbook task,
 * Workforce, and SOPs & Knowledge tables.
 *
 * These used to be re-declared (byte-for-byte) in every V2 table file, which is
 * exactly how the grid drifts page to page. Import them instead of copying.
 * The matching CSS (`.sticky-col`, `.table-borderless`, `.escalations-table`,
 * `[data-sticky-scrolled]`, `.scrollbar-hover`) lives in `app/globals.css`.
 */

/** Background fill for a frozen (sticky) column cell. Must match the page bg so
 *  scrolled-under content doesn't bleed through the frozen column. */
export const FROZEN_COL_BG = "bg-[hsl(0_0%_98%)] dark:bg-[hsl(0_0%_9%)]";

/** Hover fill for a frozen column cell — pair with `group` on the row so the
 *  frozen cell tracks the row hover state. Apply alongside `FROZEN_COL_BG`. */
export const FROZEN_COL_BG_HOVER =
  "group-hover:bg-[hsl(0_0%_97%)] dark:group-hover:bg-[hsl(0_0%_12%)]";

/** Light-blue "on" state for toggle / segmented controls (view switchers,
 *  ToggleGroup on-state). This is the toggle/segmented family — NOT the
 *  filter-pill family (which tints its border instead). Keep these in sync with
 *  CLAUDE.md "Selected/active state — two control families". */
export const V2_SEGMENTED_ON =
  "bg-[hsl(207_73%_95%)] text-foreground dark:bg-[hsl(207_73%_20%)]";

/**
 * Drives the right-edge shadow on a frozen column while the table is scrolled
 * horizontally. Spread `stickyScrollProps` onto the `overflow-x-auto` scroll
 * wrapper:
 *
 *   const { scrollRef, stickyScrollProps } = useStickyScroll();
 *   <div {...stickyScrollProps} className="overflow-x-auto scrollbar-hover">
 *
 * `data-sticky-scrolled="true"` is read by the `.sticky-col` shadow rule in
 * `app/globals.css`.
 */
export function useStickyScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolledRight, setIsScrolledRight] = useState(false);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setIsScrolledRight(el.scrollLeft > 0);
  };
  return {
    scrollRef,
    isScrolledRight,
    onScroll,
    /** Spread onto the horizontal-scroll wrapper div. */
    stickyScrollProps: {
      ref: scrollRef,
      onScroll,
      "data-sticky-scrolled": isScrolledRight ? ("true" as const) : undefined,
    },
  };
}

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/marketplace/utils/utils";

/**
 * Marketplace Badge — semantic pill for listings, bundles, pricing tiers, and
 * merchandising callouts. Variants are mapped to CSS-variable-driven color
 * tokens defined in `src/app/globals.css`, so swapping palettes (Palette A
 * vs Palette B) only requires toggling a wrapper class — no per-variant edits.
 *
 * Variants:
 *  - included        — green / Included with subscription
 *  - addOn           — blue / paid add-on with a price label
 *  - premium         — purple (A) / amber-gold (B) / Premium tier
 *  - custom          — neutral gray / Custom Pricing, talk to sales
 *  - featured        — solid pill, Featured listings (A: vibrant blue · B: brand red)
 *  - featuredSoft    — soft variant for inline contexts
 *  - partnerTier     — tier merchandising on partner cards
 *  - tierStrategic   — partner tier highlight (top tier)
 *  - tierPreferred   — partner tier highlight (mid tier)
 *  - warning         — amber, for "Required" / caution states
 *  - neutral         — fallback gray pill
 */
export type BadgeVariant =
  | "included"
  | "addOn"
  | "premium"
  | "custom"
  | "featured"
  | "featuredSoft"
  | "partnerTier"
  | "tierStrategic"
  | "tierPreferred"
  | "warning"
  | "neutral";

export type BadgeSize = "xs" | "sm" | "md";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  included: "bg-success text-success-foreground",
  addOn: "bg-info text-info-foreground",
  premium: "bg-premium text-premium-foreground",
  custom: "bg-muted text-muted-foreground",
  featured: "bg-featured text-featured-foreground",
  featuredSoft: "bg-info text-info-foreground ring-1 ring-inset ring-info-foreground/20",
  partnerTier: "border border-border bg-muted text-muted-foreground",
  tierStrategic: "bg-tier-strategic text-tier-strategic-foreground",
  tierPreferred: "bg-tier-preferred text-tier-preferred-foreground",
  warning: "bg-warning text-warning-foreground",
  neutral: "bg-muted text-muted-foreground",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: "px-2 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
}

export function Badge({
  variant = "neutral",
  size = "xs",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap",
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/** Maps a pricing enum to the right Badge variant. */
export function pricingToVariant(pricing: string): BadgeVariant {
  switch (pricing) {
    case "INCLUDED":
      return "included";
    case "ADD_ON":
      return "addOn";
    case "PREMIUM":
      return "premium";
    case "CUSTOM":
      return "custom";
    default:
      return "neutral";
  }
}

/** Maps a partner tier enum to the right Badge variant.
 *  STRATEGIC = top tier (amber-gold), PREMIER = mid (blue), SELECT/STANDARD = neutral. */
export function partnerTierToVariant(tier: string | null): BadgeVariant {
  switch (tier) {
    case "STRATEGIC":
      return "tierStrategic";
    case "PREMIER":
      return "tierPreferred";
    default:
      return "partnerTier";
  }
}

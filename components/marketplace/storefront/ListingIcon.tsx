"use client";

import { useState } from "react";
import { cn } from "@/lib/marketplace/utils/utils";

const ICON_COLORS = [
  "bg-warm-light text-warm-dark",
  "bg-primary/10 text-primary",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-muted-foreground",
];

function getIconColor(name: string) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ICON_COLORS[hash % ICON_COLORS.length];
}

export interface ListingIconProps {
  name: string;
  iconUrl: string | null;
  /** Size class for the outer square. Defaults to h-11 w-11 (44px). */
  sizeClassName?: string;
  /** Class for the rounding/text size. Defaults to rounded-xl text-base. */
  shapeClassName?: string;
  /** Padding inside the image (Tailwind). Defaults to p-1. */
  imgPaddingClassName?: string;
}

/**
 * Renders a listing's icon as <img> when a URL is available, with a colored
 * letter-tile fallback. Swaps to the fallback automatically if the remote
 * logo fails to load (e.g. Clearbit 404 for an unknown domain).
 */
export function ListingIcon({
  name,
  iconUrl,
  sizeClassName = "h-11 w-11",
  shapeClassName = "rounded-xl text-base",
  imgPaddingClassName = "p-1",
}: ListingIconProps) {
  const [failed, setFailed] = useState(false);
  const showImage = iconUrl != null && !failed;
  const colorClass = getIconColor(name);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-bold",
        sizeClassName,
        shapeClassName,
        showImage ? "bg-white border border-border" : colorClass
      )}
    >
      {showImage ? (
        <img
          src={iconUrl as string}
          alt={name}
          className={cn("h-full w-full object-contain", shapeClassName, imgPaddingClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        name[0]
      )}
    </div>
  );
}

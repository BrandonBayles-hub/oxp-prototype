"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal ScrollArea shim — provides the same API surface as the shadcn
 * Radix-based ScrollArea (used by the sandbox `PropertyFilter`) without
 * adding a `@radix-ui/react-scroll-area` dependency to this prototype.
 *
 * Structure mirrors Radix: an outer Root (positioning + clipping, receives
 * the caller's flex-1 / min-h-0 / max-height styling) wrapping an inner
 * Viewport that owns the actual scroll. Splitting those responsibilities
 * matters when the ScrollArea is a flex child — letting one element do
 * both jobs sometimes breaks `flex-1` height resolution and stops the
 * viewport from clipping when content overflows.
 *
 * If a richer custom scrollbar is needed later, swap this for the full
 * shadcn implementation backed by `@radix-ui/react-scroll-area`.
 */
function ScrollArea({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <div
        data-slot="scroll-area-viewport"
        className="h-full w-full overflow-y-auto overflow-x-hidden"
      >
        {children}
      </div>
    </div>
  );
}

export { ScrollArea };

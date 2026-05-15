"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal Label shim — provides the same API as the shadcn Radix-based
 * Label without adding `@radix-ui/react-label` to this prototype.
 *
 * Used by the `MultiSelect` "Add new option" Dialog (a code path that the
 * voice prototype's PropertyFilterChips never triggers). If you ever wire
 * up the add-option flow elsewhere and need full label-control behavior,
 * swap this for the proper shadcn Label.
 */
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };

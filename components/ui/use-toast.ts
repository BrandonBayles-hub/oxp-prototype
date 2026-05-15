"use client";

/**
 * Minimal `useToast` shim — provides the same API surface as the shadcn
 * Radix-based toast system without pulling in the full toaster runtime.
 *
 * Currently used only by `MultiSelect`'s "Add new option" Dialog (a code
 * path the voice prototype's PropertyFilterChips never triggers). Toast
 * calls are logged to the console for parity-debugging in case the flow
 * is ever wired up. If real toast UI is needed later, swap this for the
 * proper shadcn `use-toast` hook + Toaster.
 */

type ToastVariant = "default" | "destructive";

export interface ToastInput {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

export function useToast() {
  return {
    toast: (input: ToastInput) => {
      const { title, description, variant = "default" } = input;
      const tag = variant === "destructive" ? "[toast:error]" : "[toast]";
      const message = [title, description].filter(Boolean).join(" — ");
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info(tag, message);
      }
    },
  };
}

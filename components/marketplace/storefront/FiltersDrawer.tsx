"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/marketplace/utils/utils";

interface FiltersDrawerProps {
  filterContent: React.ReactNode;
  className?: string;
}

export function FiltersDrawer({ filterContent, className }: FiltersDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted",
          className
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content
            className={cn(
              "fixed inset-y-0 left-0 z-[60] flex h-full w-80 max-w-[85vw] flex-col border-r border-border bg-white shadow-2xl transition-transform duration-200 ease-out",
              "-translate-x-full data-[state=open]:translate-x-0"
            )}
          >
            <Dialog.Title className="sr-only">Filters</Dialog.Title>
            <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 overscroll-y-contain">
              {filterContent}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

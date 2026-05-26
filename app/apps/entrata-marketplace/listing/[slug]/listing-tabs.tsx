"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/marketplace/utils/utils";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

export function ListingTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div>
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              active === tab.id
                ? "border-primary text-primary font-semibold bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="py-6">
        {tabs.find((t) => t.id === active)?.content}
      </div>
    </div>
  );
}

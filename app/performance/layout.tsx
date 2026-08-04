"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, isActiveRoute } from "@/lib/utils";
import { ReportFiltersProvider } from "@/lib/report-filters-context";
import { BarChart3, Library } from "lucide-react";

const TABS = [
  { href: "/performance", label: "Overview", icon: BarChart3, exact: true },
  { href: "/performance/library", label: "ELI+ Legacy Library", icon: Library, exact: false },
];

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Via the shared helper: `trailingSlash: true` makes usePathname() return
  // "/performance/" against the slash-less href, so the previous bare `===`
  // never matched and Overview never highlighted.
  const isActive = (tab: (typeof TABS)[number]) =>
    isActiveRoute(pathname, tab.href, { exact: true });

  // The tab strip is top-level navigation, so it belongs only on the two
  // top-level destinations. Sub-pages (the agent reports, a library dashboard)
  // carry a breadcrumb, which navigates in and out of them and also says where
  // you are — showing both is redundant, and a tab strip with nothing active
  // reads as broken.
  const showTabs = TABS.some((tab) => isActiveRoute(pathname, tab.href, { exact: true }));

  return (
    <ReportFiltersProvider>
    <div>
      {showTabs ? (
        <nav aria-label="Performance sections" className="mb-6 border-b border-border">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
      {children}
    </div>
    </ReportFiltersProvider>
  );
}

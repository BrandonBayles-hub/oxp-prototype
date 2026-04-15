"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { EntrataTopNav } from "./entrata-top-nav";
import { NotificationToast } from "@/components/notification-toast";


import { RouteGuard } from "@/components/route-guard";
import { cn } from "@/lib/utils";
import { R1ScheduleCta } from "@/components/r1-schedule-cta";
import { RoadmapOverlay } from "@/components/roadmap-overlay";

const CHROMELESS_ROUTES: string[] = [];
const FULL_BLEED_ROUTES = ["/conversations"];
const NAV_ONLY_ROUTES = ["/escalations/settings", "/communications-setup/custom-email"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chromeless = CHROMELESS_ROUTES.some((r) => pathname.startsWith(r));
  const fullBleed = FULL_BLEED_ROUTES.some((r) => pathname.startsWith(r));
  const navOnly = NAV_ONLY_ROUTES.some((r) => pathname.startsWith(r));

  if (chromeless) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background">
          <RouteGuard>{children}</RouteGuard>
        </main>
        <R1ScheduleCta />
      </div>
    );
  }

  if (navOnly) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <EntrataTopNav />
        <main className="flex-1 overflow-y-auto bg-background">
          <RouteGuard>{children}</RouteGuard>
        </main>
        <NotificationToast />
        <R1ScheduleCta />
        <RoadmapOverlay />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <EntrataTopNav />
      <MobileNav />
      <div className="flex flex-1 overflow-hidden">
        {!fullBleed && (
          <div className="hidden shrink-0 lg:block">
            <Sidebar />
          </div>
        )}
        <main className={cn(
          "flex-1 bg-muted/50",
          fullBleed ? "flex flex-col overflow-hidden" : "pt-3 lg:pt-0 overflow-y-auto"
        )}>
          {fullBleed ? (
            <RouteGuard>
              {children}
            </RouteGuard>
          ) : (
            <div className="page-content px-6 pb-3 pt-[4.5rem] sm:px-8 lg:px-10">
              <RouteGuard>
                {children}
              </RouteGuard>
            </div>
          )}
        </main>
      </div>
      <NotificationToast />
      <R1ScheduleCta />
      <RoadmapOverlay />
    </div>
  );
}

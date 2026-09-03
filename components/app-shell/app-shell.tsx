"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { EntrataTopNav } from "./entrata-top-nav";
import { NotificationToast } from "@/components/notification-toast";


import { RouteGuard } from "@/components/route-guard";
import { cn } from "@/lib/utils";
import { R1ScheduleCta } from "@/components/r1-schedule-cta";
import { RoadmapOverlay } from "@/components/roadmap-overlay";
import {
  useConversationsDemo,
  VIEWPORT_PRESET_SIZES,
} from "@/lib/conversations-demo-context";

const CHROMELESS_ROUTES: string[] = [];
// Full-bleed routes drop the standard page-content padding/scroll wrapper so
// the page can manage its own layout (e.g. fill the viewport, run a sticky
// toolbar). Matching is exact-or-segment-prefixed so siblings like
// /entrata-experts-setup don't accidentally inherit /entrata-experts chrome.
const FULL_BLEED_ROUTES = [
  "/conversations",
  "/entrata-experts",
  "/entrata-experts-setup",
  "/activity-log",
];
const NAV_ONLY_ROUTES = ["/escalations/settings", "/communications-setup/custom-email", "/communications-setup/phone-numbers"];
// Routes whose own internal nav replaces the OXP main sidebar entirely (e.g.
// Entrata Experts uses its ExpertsRail as the sole left-column nav, with a
// "← OXP Studio" back affordance in the rail's header to pop back here).
const NO_SIDEBAR_ROUTES = ["/setup-wizard", "/entrata-experts", "/activity-log"];

/**
 * Match a route prefix safely. Returns true when `pathname` is exactly `r` or
 * is a sub-path of `r` (i.e. starts with `r + "/"`). Avoids the bug where
 * `startsWith("/entrata-experts")` accidentally swallowed
 * `/entrata-experts-setup`.
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";
  // `?focus=1` is a page-driven escape hatch: any route can opt into a
  // distraction-free shell (no main sidebar, no page-content padding) by
  // setting the param. Used by Entrata Experts' chat-first layout to let
  // the page's own rail replace the OXP sidebar.
  const focusMode = searchParams.get("focus") === "1";
  const chromeless = isEmbed || matchesRoute(pathname, CHROMELESS_ROUTES);
  const fullBleed = focusMode || matchesRoute(pathname, FULL_BLEED_ROUTES);
  const navOnly = matchesRoute(pathname, NAV_ONLY_ROUTES);
  const noSidebar = focusMode || matchesRoute(pathname, NO_SIDEBAR_ROUTES);

  // Communications-demo "viewport preview" preset. When non-`off`, we
  // letter-box the whole shell inside a fixed-size frame centered in the
  // physical browser window so we can spot-check the layout at the two
  // most common laptop-monitor sizes property staff actually use
  // (1366×768 and 1600×900). To make the frame's fixed height
  // authoritative, the shell's outermost container switches from
  // `h-screen` (100vh — reads the real viewport height) to `h-full`
  // (100% of the parent, i.e. of the frame).
  const { viewportPreset } = useConversationsDemo();
  const viewportSize =
    viewportPreset === "off" ? null : VIEWPORT_PRESET_SIZES[viewportPreset];
  const outerHeightClass = viewportSize ? "h-full w-full" : "h-screen";

  let content: React.ReactNode;

  if (chromeless) {
    content = (
      <div className={cn("flex flex-col overflow-hidden", outerHeightClass)}>
        <main className="flex-1 overflow-y-auto bg-background">
          <RouteGuard>{children}</RouteGuard>
        </main>
        <R1ScheduleCta />
      </div>
    );
  } else if (navOnly) {
    content = (
      <div className={cn("flex min-h-0 flex-col overflow-hidden", outerHeightClass)}>
        <EntrataTopNav />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
          <RouteGuard>{children}</RouteGuard>
        </main>
        <NotificationToast />
        <R1ScheduleCta />
        <RoadmapOverlay />
      </div>
    );
  } else {
    content = (
      <div className={cn("flex flex-col overflow-hidden", outerHeightClass)}>
        <EntrataTopNav />
        <MobileNav />
        <div className="flex flex-1 overflow-hidden">
          {!fullBleed && !noSidebar && (
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

  if (!viewportSize) {
    return content;
  }

  // Emulator frame — a fixed-size rectangle centered in the physical
  // browser window with a dark gutter around it. Purely visual; we
  // don't touch `window.innerWidth` so Tailwind media queries still
  // key off the real viewport. OXP's layout only uses the `lg` (≥1024)
  // breakpoint for its desktop chrome and every preset here is safely
  // above that, so the boxed layout renders the same "desktop"
  // arrangement a real monitor of that size would show.
  //
  // Implementation notes:
  //   · `overflow-auto` on the gutter lets narrower physical viewports
  //     scroll to see the whole canvas instead of clipping it.
  //   · `shrink-0` on the frame prevents flexbox from shrinking the
  //     inline `width` / `height` below the target — without this the
  //     frame silently collapses to the viewport size and the preset
  //     number would be a lie.
  return (
    <div className="fixed inset-0 z-0 flex items-center justify-center overflow-auto bg-neutral-900">
      <div
        className="relative shrink-0 overflow-hidden bg-background shadow-2xl ring-1 ring-neutral-700"
        style={{ width: viewportSize.width, height: viewportSize.height }}
        aria-label={`${viewportSize.width} by ${viewportSize.height} preview frame`}
      >
        {content}
      </div>
    </div>
  );
}

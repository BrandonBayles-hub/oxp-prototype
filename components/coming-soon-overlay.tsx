"use client";

import { usePathname } from "next/navigation";
import { Clock, Sparkles } from "lucide-react";
import { useComingSoon } from "@/lib/coming-soon-context";

export function ComingSoonOverlay({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isRouteComingSoon, getRouteInfo } = useComingSoon();

  const isComingSoon = isRouteComingSoon(pathname);
  const routeInfo = getRouteInfo(pathname);

  if (!isComingSoon || !routeInfo) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Value card — sits above the blurred content */}
      <div className="relative z-10 px-4 pb-2 pt-0 sm:px-5 lg:px-6">
        <div
          className="overflow-hidden rounded-xl border border-amber-200/60 shadow-lg"
          style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)" }}
        >
          <div className="px-6 py-6">
            <div className="flex items-start gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
                style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
              >
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-amber-950">
                    {routeInfo.title}
                  </h2>
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-amber-700">
                    COMING SOON
                  </span>
                </div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-amber-900/75">
                  {routeInfo.description}
                </p>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/60 px-3.5 py-2.5 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-[13px] font-medium text-amber-900/80">
                    Entrata is actively developing this experience. Preview the interface below to see what&apos;s ahead.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blurred page content */}
      <div className="relative">
        <div className="pointer-events-none select-none" style={{ filter: "blur(1.5px)", opacity: 0.75 }}>
          {children}
        </div>
        {/* Gradient fade at bottom */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
          style={{ background: "linear-gradient(to top, hsl(var(--muted) / 0.95), transparent)" }}
        />
      </div>
    </div>
  );
}

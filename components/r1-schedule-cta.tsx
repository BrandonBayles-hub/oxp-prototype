"use client";

import { useState, useEffect } from "react";
import { CalendarDays, X } from "lucide-react";
import { useR1Release } from "@/lib/r1-release-context";

const CALENDLY_EVENT_URL =
  "https://calendly.com/d/cxt6-8qs-9gp/stage-oxp-studio-call-with-the-entrata-team";

function openCalendlyPopup() {
  if (typeof window === "undefined") return;
  window.Calendly?.initPopupWidget({ url: CALENDLY_EVENT_URL });
}

export function R1ScheduleCta() {
  const { isR1Release } = useR1Release();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(timer);
  }, []);

  if (!isR1Release) return null;

  return (
    <div
      className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3"
      style={{ pointerEvents: "none" }}
    >
      {/* Floating trigger */}
      {dismissed ? (
        <div
          role="button"
          tabIndex={0}
          onClick={openCalendlyPopup}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openCalendlyPopup();
            }
          }}
          className="group relative cursor-pointer"
          style={{ pointerEvents: "auto", padding: 2, borderRadius: 9999 }}
          title="Schedule a call with Entrata"
        >
          <div
            className="absolute inset-0 rounded-full opacity-70 blur-[6px] transition-opacity group-hover:opacity-100"
            style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%)" }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%)" }}
          />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white transition-colors group-hover:bg-gray-50 dark:bg-gray-900 dark:group-hover:bg-gray-800">
            <CalendarDays className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      ) : (
        <div
          className="flex items-center gap-2.5"
          style={{
            pointerEvents: "auto",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 500ms ease, transform 500ms ease",
          }}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={openCalendlyPopup}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openCalendlyPopup();
              }
            }}
            className="group relative cursor-pointer"
            style={{ padding: 2, borderRadius: 9999 }}
          >
            <div
              className="absolute inset-0 rounded-full opacity-60 blur-[8px] transition-opacity group-hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%)" }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%)" }}
            />
            <div className="relative flex items-center gap-3 rounded-full bg-white py-3 pl-4 pr-5 transition-colors group-hover:bg-gray-50 dark:bg-gray-900 dark:group-hover:bg-gray-800">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold text-foreground leading-tight">Need help with activation?</span>
                <span className="block text-xs text-muted-foreground leading-tight mt-0.5">Schedule a call with Entrata</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

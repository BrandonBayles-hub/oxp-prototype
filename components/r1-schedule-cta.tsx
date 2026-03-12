"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarDays, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useR1Release } from "@/lib/r1-release-context";

const R1_TIME_SLOTS = [
  { day: "Monday", date: "Mar 16", slots: ["9:00 AM", "11:00 AM", "2:00 PM"] },
  { day: "Tuesday", date: "Mar 17", slots: ["10:00 AM", "1:00 PM", "3:00 PM"] },
  { day: "Wednesday", date: "Mar 18", slots: ["9:00 AM", "11:00 AM", "2:00 PM"] },
  { day: "Thursday", date: "Mar 19", slots: ["10:00 AM", "1:00 PM", "4:00 PM"] },
  { day: "Friday", date: "Mar 20", slots: ["9:00 AM", "11:00 AM", "1:00 PM"] },
];

export function R1ScheduleCta() {
  const { isR1Release } = useR1Release();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; date: string; time: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    setDismissed(false);
    setSubmitted(false);
    setSelectedSlot(null);
  };

  if (!isR1Release) return null;
  if (submitted && !open) return null;

  return (
    <div
      ref={ref}
      className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3"
      style={{ pointerEvents: "none" }}
    >
      {/* Expanded scheduling panel */}
      <div
        style={{
          pointerEvents: open ? "auto" : "none",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.95)",
          transformOrigin: "bottom right",
          transition: "opacity 200ms ease, transform 200ms ease",
          width: 400,
          background: "hsl(var(--card))",
          borderRadius: 16,
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 16px 48px rgba(0,0,0,0.16), 0 6px 16px rgba(0,0,0,0.10)",
        }}
      >
        {open && (
          <>
            {!submitted ? (
              <>
                <div className="flex items-start justify-between px-5 pt-5 pb-2">
                  <div>
                    <p className="text-base font-semibold text-foreground">Schedule a call</p>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed pr-4">
                      OXP Studio, Entrata&apos;s AI OS, is a big update. Select a preferred time and we&apos;ll reach out to schedule a walkthrough, training, or to hear your feedback.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-5 pb-3 pt-2">
                  <div className="grid grid-cols-5 gap-2">
                    {R1_TIME_SLOTS.map((col) => (
                      <div key={col.day} className="flex flex-col gap-1.5">
                        <div className="text-center py-1">
                          <p className="text-[11px] font-semibold text-foreground">{col.day.slice(0, 3)}</p>
                          <p className="text-[10px] text-muted-foreground">{col.date}</p>
                        </div>
                        {col.slots.map((time) => {
                          const isSelected = selectedSlot?.day === col.day && selectedSlot?.time === time;
                          return (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSelectedSlot({ day: col.day, date: col.date, time })}
                              className={cn(
                                "rounded-md border px-1.5 py-1.5 text-[11px] font-medium transition-all",
                                isSelected
                                  ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                                  : "border-border bg-background text-foreground hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              )}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
                  <p className="text-xs text-muted-foreground">
                    {selectedSlot
                      ? <><span className="font-medium text-foreground">{selectedSlot.day.slice(0, 3)} {selectedSlot.date}, {selectedSlot.time}</span></>
                      : "Pick a preferred time"
                    }
                  </p>
                  <Button
                    size="sm"
                    className="h-8 text-xs px-4"
                    disabled={!selectedSlot}
                    onClick={() => setSubmitted(true)}
                  >
                    Submit
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-base font-semibold text-foreground">You&apos;re all set</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-[280px]">
                  A member of the Entrata team will reach out to confirm your call for <span className="font-medium text-foreground">{selectedSlot?.day.slice(0, 3)} {selectedSlot?.date} at {selectedSlot?.time}</span>.
                </p>
                <Button size="sm" variant="outline" className="mt-5 h-8 text-xs px-4" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating trigger */}
      {!open && (
        dismissed ? (
          <div
            onClick={handleOpen}
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
              onClick={handleOpen}
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
        )
      )}
    </div>
  );
}

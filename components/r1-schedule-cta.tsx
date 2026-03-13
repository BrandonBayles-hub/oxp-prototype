"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { CalendarDays, CheckCircle2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useR1Release } from "@/lib/r1-release-context";

const TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

export function R1ScheduleCta() {
  const { isR1Release } = useR1Release();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

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
    setSelectedDate(null);
    setSelectedTime(null);
    setNotes("");
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const isDateDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const dayOfWeek = d.getDay();
    return d < today || dayOfWeek === 0 || dayOfWeek === 6;
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day;
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return "";
    return `${MONTH_NAMES[selectedDate.getMonth()].slice(0, 3)} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
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
          width: 460,
          maxHeight: "calc(100vh - 120px)",
          background: "hsl(var(--card))",
          borderRadius: 16,
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 16px 48px rgba(0,0,0,0.16), 0 6px 16px rgba(0,0,0,0.10)",
          overflowY: "auto",
        }}
      >
        {open && (
          <>
            {!submitted ? (
              <>
                <div className="flex items-start justify-between px-6 pt-6 pb-2">
                  <div>
                    <p className="text-lg font-semibold text-foreground">Schedule a Call with the Entrata Team</p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed pr-4">
                      OXP Studio is Entrata&apos;s AI operating system. To learn more about OXP Studio, receive help with activation, or provide feedback — select a preferred time and we&apos;ll reach out to schedule a walkthrough, training, or to hear your feedback.
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

                {/* Date Picker */}
                <div className="px-6 pt-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Select a date</p>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <button type="button" onClick={prevMonth} className="rounded p-1 hover:bg-muted transition-colors">
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <p className="text-sm font-medium text-foreground">{MONTH_NAMES[viewMonth]} {viewYear}</p>
                      <button type="button" onClick={nextMonth} className="rounded p-1 hover:bg-muted transition-colors">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                      {DAY_NAMES.map(d => (
                        <div key={d} className="py-1 text-[10px] font-medium text-muted-foreground">{d}</div>
                      ))}
                      {calendarDays.map((day, i) => (
                        <div key={i} className="flex items-center justify-center">
                          {day ? (
                            <button
                              type="button"
                              disabled={isDateDisabled(day)}
                              onClick={() => setSelectedDate(new Date(viewYear, viewMonth, day))}
                              className={cn(
                                "h-8 w-8 rounded-full text-xs font-medium transition-all",
                                isDateDisabled(day)
                                  ? "text-muted-foreground/30 cursor-not-allowed"
                                  : isDateSelected(day)
                                    ? "bg-blue-500 text-white shadow-sm"
                                    : "text-foreground hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              )}
                            >
                              {day}
                            </button>
                          ) : <div className="h-8 w-8" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Time Picker */}
                <div className="px-6 pt-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Select a time</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TIME_SLOTS.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-all",
                          selectedTime === time
                            ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                            : "border-border bg-background text-foreground hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="px-6 pt-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Additional information (optional)</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Let us know what you'd like to discuss..."
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border px-6 py-4 mt-4">
                  <p className="text-xs text-muted-foreground">
                    {selectedDate && selectedTime
                      ? <><span className="font-medium text-foreground">{formatSelectedDate()} at {selectedTime}</span></>
                      : "Select a date and time"
                    }
                  </p>
                  <Button
                    size="sm"
                    className="h-8 text-xs px-4"
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setSubmitted(true)}
                  >
                    Submit
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-base font-semibold text-foreground">You&apos;re all set</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-[320px]">
                  A member of the Entrata team will reach out to confirm your call for <span className="font-medium text-foreground">{formatSelectedDate()} at {selectedTime}</span>.
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

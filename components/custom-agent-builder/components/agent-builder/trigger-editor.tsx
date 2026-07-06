"use client";

import { Clock, Zap, MessageSquare, Search, X, Check, ChevronDown } from "lucide-react";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  EVENT_BUS_DOMAINS,
  EVENT_CATALOG,
  TIME_FREQUENCIES,
  type TimeFrequency,
} from "../../lib/custom-agents-catalog";
import type { Trigger } from "../../lib/custom-agents-context";

export const DAYS_OF_WEEK = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function ordinal(n: number) {
  if (n === -1) return "last day";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Fill in sensible defaults whenever the frequency changes so the schedule
// stays unambiguous (e.g. switching to monthly picks the 1st at 09:00).
export function applyFrequencyDefaults(
  t: Extract<Trigger, { kind: "schedule" }>,
  freq: TimeFrequency
): Extract<Trigger, { kind: "schedule" }> {
  const base = { ...t, frequency: freq };
  switch (freq) {
    case "once":
      return {
        ...base,
        date: base.date ?? new Date().toISOString().slice(0, 10),
        timeOfDay: base.timeOfDay ?? "09:00",
      };
    case "hourly":
      return { ...base, timeOfDay: undefined, dayOfWeek: undefined, dayOfMonth: undefined, monthOfYear: undefined, date: undefined };
    case "daily":
      return { ...base, timeOfDay: base.timeOfDay ?? "09:00", dayOfWeek: undefined, dayOfMonth: undefined, monthOfYear: undefined, date: undefined };
    case "weekly":
      return {
        ...base,
        dayOfWeek: base.dayOfWeek ?? "mon",
        timeOfDay: base.timeOfDay ?? "09:00",
        dayOfMonth: undefined,
        monthOfYear: undefined,
        date: undefined,
      };
    case "monthly":
      return {
        ...base,
        dayOfMonth: base.dayOfMonth ?? 1,
        timeOfDay: base.timeOfDay ?? "09:00",
        dayOfWeek: undefined,
        monthOfYear: undefined,
        date: undefined,
      };
    case "annually":
      return {
        ...base,
        monthOfYear: base.monthOfYear ?? 1,
        dayOfMonth: base.dayOfMonth ?? 1,
        timeOfDay: base.timeOfDay ?? "09:00",
        dayOfWeek: undefined,
        date: undefined,
      };
    default:
      return base;
  }
}

export function newTrigger(kind: Trigger["kind"]): Trigger {
  const id = `trg_${Math.random().toString(36).slice(2, 10)}`;
  if (kind === "schedule") return { id, kind: "schedule", frequency: "daily", timeOfDay: "09:00" };
  if (kind === "event") return { id, kind: "event", eventId: EVENT_CATALOG[0].id };
  return { id, kind: "inbound_message", channel: "sms" };
}

export function TriggerEditor({
  trigger,
  onChange,
}: {
  trigger: Trigger;
  onChange: (t: Trigger) => void;
}) {
  if (trigger.kind === "schedule") {
    const freq = trigger.frequency;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-foreground">
          <Clock className="h-3 w-3" /> Schedule
        </span>
        <select
          value={freq}
          onChange={(e) => onChange(applyFrequencyDefaults(trigger, e.target.value as TimeFrequency))}
          className="rounded-md border border-border bg-white px-2 py-1 text-sm"
        >
          {TIME_FREQUENCIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {freq === "once" && (
          <>
            <span className="text-[11px] text-muted-foreground">on</span>
            <Input
              type="date"
              value={trigger.date ?? ""}
              onChange={(e) => onChange({ ...trigger, date: e.target.value })}
              className="w-40"
            />
          </>
        )}

        {freq === "weekly" && (
          <>
            <span className="text-[11px] text-muted-foreground">every</span>
            <select
              value={trigger.dayOfWeek ?? "mon"}
              onChange={(e) => onChange({ ...trigger, dayOfWeek: e.target.value })}
              className="rounded-md border border-border bg-white px-2 py-1 text-sm"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </>
        )}

        {freq === "monthly" && (
          <>
            <span className="text-[11px] text-muted-foreground">on the</span>
            <select
              value={trigger.dayOfMonth ?? 1}
              onChange={(e) => onChange({ ...trigger, dayOfMonth: Number(e.target.value) })}
              className="rounded-md border border-border bg-white px-2 py-1 text-sm"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {ordinal(d)}
                </option>
              ))}
              <option value={-1}>last day</option>
            </select>
            <span className="text-[11px] text-muted-foreground">of the month</span>
          </>
        )}

        {freq === "annually" && (
          <>
            <span className="text-[11px] text-muted-foreground">on</span>
            <select
              value={trigger.monthOfYear ?? 1}
              onChange={(e) => onChange({ ...trigger, monthOfYear: Number(e.target.value) })}
              className="rounded-md border border-border bg-white px-2 py-1 text-sm"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={trigger.dayOfMonth ?? 1}
              onChange={(e) => onChange({ ...trigger, dayOfMonth: Number(e.target.value) })}
              className="rounded-md border border-border bg-white px-2 py-1 text-sm"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {ordinal(d)}
                </option>
              ))}
            </select>
          </>
        )}

        {(freq === "daily" || freq === "weekly" || freq === "monthly" || freq === "annually" || freq === "once") && (
          <>
            <span className="text-[11px] text-muted-foreground">at</span>
            <Input
              type="time"
              value={trigger.timeOfDay ?? "09:00"}
              onChange={(e) => onChange({ ...trigger, timeOfDay: e.target.value })}
              className="w-32"
            />
          </>
        )}
      </div>
    );
  }
  if (trigger.kind === "event") {
    return <EventTriggerEditor trigger={trigger} onChange={onChange} />;
  }
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-foreground">
        <MessageSquare className="h-3 w-3" /> Inbound
      </span>
      <select
        value={trigger.channel}
        onChange={(e) => onChange({ ...trigger, channel: e.target.value as "sms" | "email" | "voice" })}
        className="rounded-md border border-border bg-white px-2 py-1 text-sm"
      >
        <option value="sms">SMS</option>
        <option value="email">Email</option>
        <option value="voice">Voice</option>
      </select>
    </div>
  );
}

/**
 * Event-trigger sub-editor with searchable multi-select dropdown.
 * Renders every event the Entrata Business Event Bus (Kafka) publishes,
 * grouped by domain. Users can search to filter, and select multiple
 * events — any of the selected events will trigger the agent.
 */
function EventTriggerEditor({
  trigger,
  onChange,
}: {
  trigger: Extract<Trigger, { kind: "event" }>;
  onChange: (t: Trigger) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedIds = useMemo(() => {
    if (trigger.eventIds && trigger.eventIds.length > 0) return trigger.eventIds;
    return trigger.eventId ? [trigger.eventId] : [];
  }, [trigger.eventId, trigger.eventIds]);

  const selectedEvents = useMemo(
    () => selectedIds.map((id) => EVENT_CATALOG.find((e) => e.id === id)).filter(Boolean),
    [selectedIds],
  );

  const eventsByDomain = useMemo(() => {
    const grouped = new Map<string, typeof EVENT_CATALOG>();
    for (const ev of EVENT_CATALOG) {
      const key = ev.bus?.domainId ?? "other";
      const bucket = grouped.get(key) ?? [];
      bucket.push(ev);
      grouped.set(key, bucket);
    }
    return grouped;
  }, []);

  const filteredByDomain = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = new Map<string, typeof EVENT_CATALOG>();
    for (const [domainId, events] of eventsByDomain) {
      const matches = q
        ? events.filter(
            (ev) =>
              ev.label.toLowerCase().includes(q) ||
              ev.id.toLowerCase().includes(q) ||
              (ev.bus?.value ?? "").toLowerCase().includes(q) ||
              (ev.description ?? "").toLowerCase().includes(q),
          )
        : events;
      if (matches.length > 0) filtered.set(domainId, matches);
    }
    return filtered;
  }, [eventsByDomain, query]);

  const totalFiltered = useMemo(
    () => Array.from(filteredByDomain.values()).reduce((s, arr) => s + arr.length, 0),
    [filteredByDomain],
  );

  const toggleEvent = useCallback(
    (eventId: string) => {
      const isSelected = selectedIds.includes(eventId);
      const next = isSelected
        ? selectedIds.filter((id) => id !== eventId)
        : [...selectedIds, eventId];
      onChange({
        ...trigger,
        eventId: next[0] ?? "",
        eventIds: next.length > 1 ? next : undefined,
      });
    },
    [selectedIds, trigger, onChange],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-foreground">
        <Zap className="h-3 w-3" /> Event bus
        {selectedIds.length > 1 && (
          <span className="text-muted-foreground">({selectedIds.length} events)</span>
        )}
      </span>

      {/* Trigger button / selected chips */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full min-h-[36px] flex-wrap items-center gap-1 rounded-md border border-border bg-white px-2 py-1.5 text-left text-sm hover:border-indigo-300 transition-colors"
      >
        {selectedEvents.length === 0 && (
          <span className="text-muted-foreground">Select events...</span>
        )}
        {selectedEvents.map((ev) =>
          ev ? (
            <Badge
              key={ev.id}
              className="gap-1 bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-medium"
            >
              {ev.label}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleEvent(ev.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    toggleEvent(ev.id);
                  }
                }}
                className="ml-0.5 cursor-pointer rounded-sm hover:bg-indigo-200/60 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </span>
            </Badge>
          ) : null,
        )}
        <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="relative z-50 rounded-lg border border-border bg-white shadow-lg">
          {/* Search input */}
          <div className="sticky top-0 z-10 border-b border-border bg-white p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search events..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {totalFiltered} event{totalFiltered !== 1 ? "s" : ""}
                {query && ` matching "${query}"`}
              </span>
              <span>{selectedIds.length} selected</span>
            </div>
          </div>

          {/* Scrollable event list */}
          <div className="max-h-[280px] overflow-y-auto p-1">
            {EVENT_BUS_DOMAINS.map((domain) => {
              const events = filteredByDomain.get(domain.id);
              if (!events || events.length === 0) return null;
              return (
                <div key={domain.id} className="mb-1">
                  <p className="sticky top-0 z-[1] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {domain.name}
                  </p>
                  {events.map((ev) => {
                    const isSelected = selectedIds.includes(ev.id);
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => toggleEvent(ev.id)}
                        className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors ${
                          isSelected
                            ? "bg-indigo-50 text-indigo-900"
                            : "text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500"
                              : "border-border bg-white"
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{ev.label}</span>
                          {ev.bus && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground font-mono">
                              {ev.bus.value}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {totalFiltered === 0 && (
              <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                No events match &ldquo;{query}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}

      {/* Selected event details */}
      {selectedEvents.length === 1 && selectedEvents[0] && (
        <div className="rounded-md bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          {selectedEvents[0].bus ? (
            <>
              <div>
                Published by{" "}
                <span className="font-medium text-foreground">{selectedEvents[0].bus.domainName}</span>
              </div>
              <div className="mt-0.5 break-all font-mono text-[10px]">
                topic: {selectedEvents[0].bus.kafkaTopicBase}
              </div>
            </>
          ) : (
            <div>{selectedEvents[0].description}</div>
          )}
        </div>
      )}
      {selectedEvents.length > 1 && (
        <div className="rounded-md bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          Agent triggers when <span className="font-medium text-foreground">any</span> of the {selectedEvents.length} selected events fire.
        </div>
      )}
    </div>
  );
}

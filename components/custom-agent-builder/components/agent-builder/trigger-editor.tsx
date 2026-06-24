"use client";

import { Clock, Zap, MessageSquare } from "lucide-react";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
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
 * Event-trigger sub-editor. Renders every event the Entrata Business Event
 * Bus (Kafka) actually publishes, grouped by the PHP enum / team that owns
 * it. The list is generated from the authoritative PHP enums by
 * `scripts/build-event-bus-catalog.mjs`, so what we render here matches
 * exactly what production publishes.
 */
function EventTriggerEditor({
  trigger,
  onChange,
}: {
  trigger: Extract<Trigger, { kind: "event" }>;
  onChange: (t: Trigger) => void;
}) {
  const selected = useMemo(
    () => EVENT_CATALOG.find((e) => e.id === trigger.eventId),
    [trigger.eventId]
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

  return (
    <div className="flex flex-col gap-1.5">
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-foreground">
        <Zap className="h-3 w-3" /> Event bus
      </span>
      <select
        value={trigger.eventId}
        onChange={(e) => onChange({ ...trigger, eventId: e.target.value })}
        className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
      >
        {EVENT_BUS_DOMAINS.map((domain) => {
          const events = eventsByDomain.get(domain.id) ?? [];
          if (events.length === 0) return null;
          return (
            <optgroup key={domain.id} label={domain.name}>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.label}
                  {ev.bus ? ` — ${ev.bus.value}` : ""}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      {selected && (
        <div className="rounded-md bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          {selected.bus ? (
            <>
              <div>
                Published by{" "}
                <span className="font-medium text-foreground">{selected.bus.domainName}</span>
              </div>
              <div className="mt-0.5 break-all font-mono text-[10px]">
                topic: {selected.bus.kafkaTopicBase}
              </div>
            </>
          ) : (
            <div>{selected.description}</div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * IVR Setup — per-property routing decision.
 *
 * System auto-applies a default mode based on the contract and detected
 * configuration. User reviews, adjusts, and confirms. Engaging with a
 * row IS the decision — no separate submit step.
 *
 * Modes:
 *   Entrata IVR  — Entrata fully manages call routing for this property.
 *   Custom IVR   — Customer's own IVR handles calls; Entrata routes overflow.
 *
 * Properties disappear from the active table once they go live.
 */

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  EyeOff,
  Info,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types & data ─────────────────────────────────────────────────────────────

type IvrMode = "entrata" | "custom";

interface IvrProperty {
  name:          string;
  vertical:      string;
  units:         number;
  defaultMode:   IvrMode;
  defaultReason: string;
  isLive?:       boolean;
}

const PROPERTIES: IvrProperty[] = [
  {
    name: "Sunset Ridge Apartments",  vertical: "Conventional", units: 240,
    defaultMode: "entrata",
    defaultReason: "No existing IVR system detected in your contract.",
  },
  {
    name: "The Reserve at Millcreek", vertical: "Conventional", units: 180,
    defaultMode: "entrata",
    defaultReason: "No existing IVR system detected in your contract.",
  },
  {
    name: "Parkside Lofts",           vertical: "Conventional", units: 96,
    defaultMode: "custom",
    defaultReason: "An existing 3rd-party phone system was detected on this property.",
  },
  {
    name: "University Commons",       vertical: "Student",      units: 320,
    defaultMode: "entrata",
    defaultReason: "No existing IVR system detected in your contract.",
  },
  {
    name: "Campus Edge",              vertical: "Student",      units: 200,
    defaultMode: "custom",
    defaultReason: "Custom vanity numbers are already assigned to this property.",
  },
  {
    name: "Oakwood Terrace",          vertical: "Affordable",   units: 150,
    defaultMode: "entrata",
    defaultReason: "No existing IVR system detected in your contract.",
  },
  {
    name: "Heritage Place",           vertical: "Affordable",   units: 88,
    defaultMode: "entrata",
    defaultReason: "No existing IVR system detected in your contract.",
  },
  {
    name: "Metro Business Center",    vertical: "Commercial",   units: 45,
    defaultMode: "custom",
    defaultReason: "An existing 3rd-party phone system was detected on this property.",
    isLive: true,
  },
];

const MODE: Record<IvrMode, { label: string; description: string; active: string; indicator: string }> = {
  entrata: {
    label:       "Entrata IVR",
    description: "Entrata manages call routing",
    active:      "border-primary/40 bg-primary/5 text-primary",
    indicator:   "border-primary bg-primary",
  },
  custom: {
    label:       "Custom IVR",
    description: "Your IVR handles calls",
    active:      "border-amber-300 bg-amber-50 text-amber-800",
    indicator:   "border-amber-500 bg-amber-500",
  },
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function IvrSetupPage() {
  const [modes, setModes] = useState<Record<string, IvrMode>>(
    Object.fromEntries(PROPERTIES.map((p) => [p.name, p.defaultMode]))
  );
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [showLive, setShowLive]   = useState(false);
  const [openReason, setOpenReason] = useState<string | null>(null);

  const active      = PROPERTIES.filter((p) => !p.isLive);
  const live        = PROPERTIES.filter((p) => p.isLive);
  const visible     = showLive ? PROPERTIES : active;
  const doneCount   = active.filter((p) => confirmed[p.name]).length;
  const totalActive = active.length;
  const allDone     = doneCount === totalActive;

  const setAll = (mode: IvrMode) => {
    setModes(Object.fromEntries(PROPERTIES.map((p) => [p.name, mode])));
    setConfirmed(Object.fromEntries(PROPERTIES.map((p) => [p.name, true])));
  };

  const select = (name: string, mode: IvrMode) => {
    setModes((prev) => ({ ...prev, [name]: mode }));
    setConfirmed((prev) => ({ ...prev, [name]: true }));
  };

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Context banner — brief */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">Review IVR routing before go-live</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            We pre-selected a routing mode for each property based on your contract and detected configuration.
            Review and adjust — your selections here drive how incoming calls are routed when agents activate.
          </p>
        </div>
      </div>

      {/* Summary + bulk actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {allDone ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              All properties confirmed
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{doneCount}</span>{" "}
              of {totalActive} confirmed
            </span>
          )}
          {!allDone && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {totalActive - doneCount} pending
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Set all to:</span>
          <button
            type="button"
            onClick={() => setAll("entrata")}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Entrata IVR
          </button>
          <button
            type="button"
            onClick={() => setAll("custom")}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Custom IVR
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-[40%]">
                Property
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                IVR Mode
              </th>
              <th className="w-[80px] px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((prop) => {
              const current    = modes[prop.name] ?? prop.defaultMode;
              const changed    = current !== prop.defaultMode;
              const isDone     = !!confirmed[prop.name];
              const isExpanded = openReason === prop.name;

              return (
                <tr
                  key={prop.name}
                  className={cn(
                    "transition-colors",
                    prop.isLive
                      ? "bg-muted/20 opacity-60"
                      : isDone
                        ? "bg-background"
                        : "bg-amber-50/25",
                  )}
                >
                  {/* Property */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-start gap-2.5">
                      {prop.isLive ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : isDone ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      <div>
                        <p className={cn("text-sm font-medium", prop.isLive ? "text-muted-foreground" : "text-foreground")}>
                          {prop.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {prop.vertical} · {prop.units} units
                          {prop.isLive && (
                            <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                              Live
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Mode selector */}
                  <td className="px-4 py-3 align-top">
                    {prop.isLive ? (
                      <span className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
                        current === "entrata"
                          ? "border-primary/20 bg-primary/5 text-primary"
                          : "border-amber-200 bg-amber-50 text-amber-700",
                      )}>
                        {MODE[current].label}
                      </span>
                    ) : (
                      <div className="space-y-2">
                        {/* Inline two-option selector */}
                        <div className="flex gap-2">
                          {(["entrata", "custom"] as IvrMode[]).map((mode) => {
                            const active = current === mode;
                            return (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => select(prop.name, mode)}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                                  active
                                    ? MODE[mode].active
                                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                                )}
                              >
                                <span className={cn(
                                  "h-3 w-3 rounded-full border-2 shrink-0 transition-all",
                                  active ? MODE[mode].indicator : "border-muted-foreground/40 bg-background",
                                )} />
                                {MODE[mode].label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Why — subtle, expandable */}
                        <button
                          type="button"
                          onClick={() => setOpenReason(isExpanded ? null : prop.name)}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        >
                          <Info className="h-3 w-3" />
                          {changed
                            ? <>Changed from default · Default was: {MODE[prop.defaultMode].label}</>
                            : "Why this was pre-selected"}
                          <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                        </button>

                        {isExpanded && (
                          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                            {prop.defaultReason}
                            {changed && (
                              <p className="mt-1 text-amber-700">
                                You changed this from the system default ({MODE[prop.defaultMode].label}).
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Confirm */}
                  <td className="px-4 py-3 align-top text-right">
                    {!prop.isLive && !isDone && (
                      <button
                        type="button"
                        onClick={() => setConfirmed((prev) => ({ ...prev, [prop.name]: true }))}
                        className="text-[11px] font-medium text-primary hover:underline whitespace-nowrap"
                      >
                        Confirm
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Live properties toggle */}
        {live.length > 0 && (
          <div className="border-t border-border bg-muted/20 px-4 py-2.5">
            <button
              type="button"
              onClick={() => setShowLive((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <EyeOff className="h-3.5 w-3.5" />
              {showLive
                ? `Hide ${live.length} live ${live.length === 1 ? "property" : "properties"}`
                : `Show ${live.length} live ${live.length === 1 ? "property" : "properties"}`}
            </button>
          </div>
        )}
      </div>

      {/* Done state */}
      {allDone && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-800">IVR routing configured</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              These selections will be applied when each property goes live. You can return here to adjust before activation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

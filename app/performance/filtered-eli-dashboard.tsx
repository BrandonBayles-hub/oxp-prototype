"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardBlock, EliDashboard } from "@/lib/eli-library";
import { LibraryDashboardView } from "./library/[slug]/dashboard-view";

const PROPERTIES = [
  "Cedar Hills",
  "Hillside Living",
  "Jamison Apartments",
  "Lakewood",
  "Maple Court",
  "Oak Terrace",
  "Parkview Flats",
  "Pine Valley",
  "Summit Ridge",
  "The Beacon",
] as const;

// -----------------------------------------------------------------------------
// Scaling helpers — extensive metrics (counts / currency / volumes) scale with
// the share of selected properties; intensive metrics (rates, %, averages,
// ratios, durations) stay stable since sub-selecting properties shouldn't move
// a per-unit figure. With all properties selected the numbers match the
// ELI+ 1.0 Library report exactly.
// -----------------------------------------------------------------------------

function scaleNumericString(raw: string, factor: number): string {
  const str = raw.trim();

  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.every((p) => /\d/.test(p))) {
      return parts.map((p) => scaleNumericString(p.trim(), factor)).join(" / ");
    }
  }

  const hasDollar = str.startsWith("$");
  const body = hasDollar ? str.slice(1) : str;
  const match = body.match(/^([\d,.]+)\s*([MKB])?$/i);
  if (!match) return raw;

  const numStr = match[1].replace(/,/g, "");
  const suffix = match[2]?.toUpperCase();
  const n = parseFloat(numStr);
  if (isNaN(n)) return raw;

  const scaled = n * factor;
  let out: string;
  if (suffix) {
    out = `${scaled.toFixed(scaled < 100 ? 1 : 0)}${suffix}`;
  } else if (numStr.includes(".")) {
    out = scaled.toFixed(1);
  } else {
    out = Math.round(scaled).toLocaleString();
  }
  return hasDollar ? `$${out}` : out;
}

function isIntensiveValue(value: string, context: string): boolean {
  const v = value.trim();
  if (v.includes("%")) return true;
  if (v.includes("/5")) return true;
  if (/\b(sec|secs|min|mins|hr|hrs|hour|hours|day|days)\b/i.test(v)) return true;
  if (/^\d+\.\d+$/.test(v)) return true; // ratios / averages like 9.2, 0.68
  if (/avg|average|per property|per unit|per staff|ratio/i.test(context)) return true;
  return false;
}

function isIntensiveChart(title: string): boolean {
  return /%|conversion|\brate\b|ratio|response|engagement|preference|language/i.test(title);
}

function scaleBlock(block: DashboardBlock, factor: number): DashboardBlock {
  const context = `${block.title ?? ""} ${block.mockSub ?? ""}`;

  if (block.type === "kpi-card") {
    if (block.mockValue == null) return block;
    const value = String(block.mockValue);
    if (isIntensiveValue(value, context)) return block;
    return { ...block, mockValue: scaleNumericString(value, factor) };
  }

  if (isIntensiveChart(block.title ?? "")) return block;

  const next: DashboardBlock = { ...block };
  if (block.mockTrend) {
    next.mockTrend = block.mockTrend.map((p) => ({
      ...p,
      value: Math.round(p.value * factor),
      ...(p.baseline !== undefined ? { baseline: Math.round(p.baseline * factor) } : {}),
    }));
  }
  if (block.mockSlices) {
    next.mockSlices = block.mockSlices.map((s) => ({ ...s, value: Math.round(s.value * factor) }));
  }
  if (block.mockStages) {
    next.mockStages = block.mockStages.map((s) => ({ ...s, value: Math.round(s.value * factor) }));
  }
  if (block.mockRows) {
    next.mockRows = block.mockRows.map((r) => ({
      ...r,
      value:
        typeof r.value === "number"
          ? Math.round(r.value * factor)
          : scaleNumericString(String(r.value), factor),
    }));
  }
  return next;
}

function scaleDashboard(dashboard: EliDashboard, factor: number): EliDashboard {
  if (factor === 1) return dashboard;

  const headlineValue = dashboard.headlineKpi.value;
  const headlineContext = dashboard.headlineKpi.label;
  const headlineKpi = isIntensiveValue(headlineValue, headlineContext)
    ? dashboard.headlineKpi
    : { ...dashboard.headlineKpi, value: scaleNumericString(headlineValue, factor) };

  return {
    ...dashboard,
    headlineKpi,
    blocks: dashboard.blocks.map((b) => scaleBlock(b, factor)),
  };
}

// -----------------------------------------------------------------------------
// Property multi-select
// -----------------------------------------------------------------------------

function PropertiesPicker({
  selected,
  setSelected,
}: {
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allSelected = selected.size === PROPERTIES.length;
  const label = allSelected
    ? "All Properties"
    : selected.size === 0
      ? "None selected"
      : `${selected.size} selected`;

  const filtered = PROPERTIES.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(p: string) {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setSelected(next);
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(PROPERTIES));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm",
          open ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
        )}
      >
        <span className="text-muted-foreground">Properties:</span>
        <span className="font-semibold text-foreground">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-[18rem] rounded-md border border-border bg-popover p-2 shadow-lg">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search properties..."
                className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-sm"
              />
            </div>
            <div className="max-h-[16rem] overflow-y-auto">
              <label className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm font-medium">All Properties</span>
              </label>
              {filtered.map((p) => (
                <label key={p} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={selected.has(p)}
                    onChange={() => toggle(p)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">{p}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Wrapper
// -----------------------------------------------------------------------------

export function FilteredEliDashboard({
  dashboard,
  backHref,
  backLabel,
}: {
  dashboard: EliDashboard;
  backHref: string;
  backLabel: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(PROPERTIES));

  const factor = selected.size / PROPERTIES.length;
  const scaled = useMemo(() => scaleDashboard(dashboard, factor), [dashboard, factor]);

  const toolbar = (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <PropertiesPicker selected={selected} setSelected={setSelected} />
      {selected.size > 0 && selected.size < PROPERTIES.length && (
        <span className="text-xs text-muted-foreground">
          Showing {selected.size} of {PROPERTIES.length} properties — volume metrics scaled to selection
        </span>
      )}
    </div>
  );

  return (
    <LibraryDashboardView
      dashboard={scaled}
      backHref={backHref}
      backLabel={backLabel}
      toolbar={toolbar}
    />
  );
}

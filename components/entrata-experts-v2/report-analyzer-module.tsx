"use client";

import * as React from "react";
import { ArrowRight, FileBarChart, Search } from "lucide-react";
import {
  REPORTS,
  type ReportDef,
  type ReportFrequency,
} from "@/lib/entrata-experts-v2/reports";
import { cn } from "@/lib/utils";

// =============================================================================
// Report Analyzer module
// -----------------------------------------------------------------------------
// Lives inside the Entrata Assistants grid as a 2-cell-wide tile (the caller
// is responsible for `sm:col-span-2 xl:col-span-2`). The internal design is
// disciplined minimalism: one-line header, one-line rows, a single moment of
// indigo on hover. Footprint is roughly two tile-rows tall.
// =============================================================================

const ACCENT = "#4338ca";
const HEADING_FONT =
  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif";

interface ReportAnalyzerModuleProps {
  onLaunchReport: (reportId: string) => void;
  /** Optional class to control grid placement from the parent layout. */
  className?: string;
}

export function ReportAnalyzerModule({
  onLaunchReport,
  className,
}: ReportAnalyzerModuleProps) {
  const [query, setQuery] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K → focus the search input
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    if (!q) return REPORTS;
    return REPORTS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q),
    );
  }, [q]);

  return (
    <section
      aria-labelledby="report-analyzer-title"
      className={cn(
        // h-full lets the section claim its grid row; max-h caps it at roughly
        // two assistant-tile rows so the inner list scrolls instead of pushing
        // the whole grid down to ~1000px.
        "flex h-full max-h-[420px] flex-col overflow-hidden rounded-lg border border-border bg-background",
        className,
      )}
    >
      {/* ── Header (single row) ──────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 border-b border-border px-3 py-2">
        <span
          aria-hidden
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{ background: `${ACCENT}14`, color: ACCENT }}
        >
          <FileBarChart className="h-3.5 w-3.5" />
        </span>
        <h3
          id="report-analyzer-title"
          className="shrink-0 text-sm font-semibold tracking-tight text-foreground"
          style={{ fontFamily: HEADING_FONT }}
        >
          Report Analyzer
        </h3>
        <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
          · {REPORTS.length} reports
        </span>
        <div className="flex-1" />
        <label className="relative flex w-full max-w-[260px] items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3 w-3 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports…"
            className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-9 text-[12px] shadow-sm placeholder:text-muted-foreground focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-300"
          />
          <kbd className="pointer-events-none absolute right-1.5 hidden items-center rounded border border-border bg-muted px-1 py-px font-mono text-[9px] text-muted-foreground sm:flex">
            ⌘K
          </kbd>
        </label>
      </div>

      {/* ── List body ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hover">
        {filtered.length === 0 ? (
          <EmptyState query={query} onClear={() => setQuery("")} />
        ) : (
          <ul className="divide-y divide-border/30">
            {filtered.map((r) => (
              <ReportRow
                key={r.id}
                report={r}
                onLaunch={() => onLaunchReport(r.id)}
                highlight={q}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Report row — single-line, ~32px tall
// -----------------------------------------------------------------------------

function ReportRow({
  report,
  onLaunch,
  highlight,
}: {
  report: ReportDef;
  onLaunch: () => void;
  highlight: string;
}) {
  const Icon = report.icon;

  return (
    <li>
      <button
        type="button"
        onClick={onLaunch}
        className={cn(
          "group flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
          "hover:bg-indigo-50/40",
          "focus-visible:bg-indigo-50/40 focus-visible:outline-none",
        )}
        title={report.description}
      >
        <span
          aria-hidden
          className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover:text-indigo-700"
        >
          <Icon className="h-3.5 w-3.5" />
        </span>

        <span className="flex-1 truncate text-[13px] leading-tight text-foreground">
          {highlight ? (
            <Highlighted text={report.name} match={highlight} />
          ) : (
            report.name
          )}
        </span>

        <span className="hidden shrink-0 items-center gap-1 font-mono text-[10px] tabular-nums text-muted-foreground/80 md:flex">
          <span>{FREQ_LABEL[report.frequency]}</span>
          <span aria-hidden className="text-muted-foreground/40">
            ·
          </span>
          <span>{report.lastRun}</span>
        </span>

        <ArrowRight
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-indigo-700"
        />
      </button>
    </li>
  );
}

const FREQ_LABEL: Record<ReportFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  "on-demand": "On-demand",
};

// -----------------------------------------------------------------------------
// Empty state (no search results)
// -----------------------------------------------------------------------------

function EmptyState({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 px-3 py-6 text-center text-xs text-muted-foreground">
      <span>
        No match for{" "}
        <span className="font-mono text-foreground">&ldquo;{query}&rdquo;</span>
      </span>
      <button
        type="button"
        onClick={onClear}
        className="rounded border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/40"
      >
        Clear
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Highlighted text — bolds matched substring inside a string.
// -----------------------------------------------------------------------------

function Highlighted({ text, match }: { text: string; match: string }) {
  if (!match) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(match.toLowerCase());
  if (idx === -1) return <>{text}</>;
  const before = text.slice(0, idx);
  const hit = text.slice(idx, idx + match.length);
  const after = text.slice(idx + match.length);
  return (
    <>
      {before}
      <mark className="rounded-sm bg-indigo-100 px-0.5 text-indigo-900">
        {hit}
      </mark>
      {after}
    </>
  );
}

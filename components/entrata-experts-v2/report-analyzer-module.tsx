"use client";

import * as React from "react";
import { ExternalLink, FileBarChart, Sparkles, Star } from "lucide-react";
import {
  favoriteReports,
  getReportUrl,
  recentReportsExcludingFavorites,
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
// indigo on hover.
//
// Two stacked groups:
//   1. My Reports    (user's starred favorites)
//   2. Recently Run  (auto, deduped against favorites)
//
// Self-sized so the row doesn't stretch adjacent assistant tiles in the grid.
// =============================================================================

const ACCENT = "#4338ca";
const HEADING_FONT =
  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif";

type ReportVariant = "list" | "tiles";

interface ReportAnalyzerModuleProps {
  onLaunchReport: (reportId: string) => void;
  /** Optional class to control grid placement from the parent layout. */
  className?: string;
  /**
   * Visual variant for rendering the reports underneath each group:
   *   "list"  — compact one-line rows (used by the hub tile in the assistants grid)
   *   "tiles" — card grid (used by the chat-first picker view where we have room)
   */
  variant?: ReportVariant;
}

export function ReportAnalyzerModule({
  onLaunchReport,
  className,
  variant = "list",
}: ReportAnalyzerModuleProps) {
  const favorites = React.useMemo(() => favoriteReports(), []);
  const recents = React.useMemo(() => recentReportsExcludingFavorites(), []);

  // In the tiles variant we're rendered inside the chat-first picker view,
  // which already provides its own header chrome and outer surface. Drop the
  // bordered <section> wrapper + internal header in that case so the tiles
  // can breathe.
  if (variant === "tiles") {
    return (
      <div
        aria-labelledby="report-analyzer-title"
        className={cn("flex flex-col self-start", className)}
      >
        <h3 id="report-analyzer-title" className="sr-only">
          Report Analyzer
        </h3>
        <DefaultBody
          favorites={favorites}
          recents={recents}
          onLaunch={onLaunchReport}
          variant={variant}
        />
      </div>
    );
  }

  return (
    <section
      aria-labelledby="report-analyzer-title"
      className={cn(
        // Self-sized: no h-full / max-h, so we don't stretch the assistant
        // tile in the same grid row. Overall height lands ~210px.
        "flex flex-col self-start overflow-hidden rounded-lg border border-border bg-background",
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
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <DefaultBody
        favorites={favorites}
        recents={recents}
        onLaunch={onLaunchReport}
        variant={variant}
      />
    </section>
  );
}

// -----------------------------------------------------------------------------
// Default body — two stacked groups: My Reports + Recently Run.
// Each group is hidden if empty; if both are empty we fall back to a hint.
// -----------------------------------------------------------------------------

function DefaultBody({
  favorites,
  recents,
  onLaunch,
  variant,
}: {
  favorites: ReportDef[];
  recents: ReportDef[];
  onLaunch: (id: string) => void;
  variant: ReportVariant;
}) {
  if (favorites.length === 0 && recents.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">
        Star a report to pin it here, or search to find any report.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {favorites.length > 0 && (
        <Group
          label="My Reports"
          count={favorites.length}
          variant={variant}
          icon={
            <Star
              className="h-2.5 w-2.5 text-amber-500"
              fill="currentColor"
              strokeWidth={0}
            />
          }
        >
          {favorites.map((r) =>
            variant === "tiles" ? (
              <ReportTile
                key={r.id}
                report={r}
                onAnalyze={() => onLaunch(r.id)}
                highlight=""
                starred
              />
            ) : (
              <ReportRow
                key={r.id}
                report={r}
                onAnalyze={() => onLaunch(r.id)}
                highlight=""
                starred
              />
            ),
          )}
        </Group>
      )}
      {recents.length > 0 && (
        <Group
          label="Recently run"
          count={recents.length}
          variant={variant}
        >
          {recents.map((r) =>
            variant === "tiles" ? (
              <ReportTile
                key={r.id}
                report={r}
                onAnalyze={() => onLaunch(r.id)}
                highlight=""
              />
            ) : (
              <ReportRow
                key={r.id}
                report={r}
                onAnalyze={() => onLaunch(r.id)}
                highlight=""
              />
            ),
          )}
        </Group>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Group — section header + list. Used by both groups in DefaultBody.
// -----------------------------------------------------------------------------

function Group({
  label,
  count,
  icon,
  children,
  variant,
}: {
  label: string;
  count: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant: ReportVariant;
}) {
  return (
    <div className={variant === "tiles" ? "pb-5 last:pb-0" : undefined}>
      <div
        className={cn(
          "flex items-center gap-1.5",
          variant === "tiles" ? "px-1 pb-2 pt-1" : "px-3 pt-1.5 pb-0.5",
        )}
      >
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
          {label}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/50">
          · {count}
        </span>
      </div>
      {variant === "tiles" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {children}
        </ul>
      ) : (
        <ul className="divide-y divide-border/30">{children}</ul>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Report row — single-line, ~32px tall
// -----------------------------------------------------------------------------

function ReportRow({
  report,
  onAnalyze,
  highlight,
  starred,
}: {
  report: ReportDef;
  /** Triggered by the explicit "Analyze" button — opens the AI analyzer chat. */
  onAnalyze: () => void;
  highlight: string;
  /** Render a subtle star marker next to the name. Used for "My Reports". */
  starred?: boolean;
}) {
  const Icon = report.icon;
  const href = getReportUrl(report);

  return (
    <li className="group/row flex items-stretch transition-colors hover:bg-muted/40">
      {/* Primary action — opens the standard Entrata report page in a new
          window. New-tab default matches how operators expect report links
          to behave inside Entrata today. */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 px-3 py-1.5 text-left",
          "focus-visible:bg-indigo-50/40 focus-visible:outline-none",
        )}
        title={`Open ${report.name} in Entrata (new window)`}
      >
        <span
          aria-hidden
          className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground"
        >
          <Icon className="h-3.5 w-3.5" />
        </span>

        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[13px] leading-tight text-foreground group-hover/row:underline group-hover/row:decoration-foreground/30 group-hover/row:underline-offset-2">
          <span className="truncate">
            {highlight ? (
              <Highlighted text={report.name} match={highlight} />
            ) : (
              report.name
            )}
          </span>
          {starred && (
            <Star
              aria-label="Starred"
              className="h-2.5 w-2.5 shrink-0 text-amber-500"
              fill="currentColor"
              strokeWidth={0}
            />
          )}
          <ExternalLink
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 text-muted-foreground/0 transition-colors group-hover/row:text-muted-foreground/60"
          />
        </span>

        <span className="hidden shrink-0 items-center gap-1 font-mono text-[10px] tabular-nums text-muted-foreground/80 md:flex">
          <span>{FREQ_LABEL[report.frequency]}</span>
          <span aria-hidden className="text-muted-foreground/40">
            ·
          </span>
          <span>{report.lastRun}</span>
        </span>
      </a>

      {/* Secondary action — opens the AI analyzer chat for this report. Kept
          visible at all times (not hover-only) so the differentiating value
          of this module is discoverable. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAnalyze();
        }}
        className={cn(
          "flex shrink-0 items-center gap-1 border-l border-border/40 px-2.5 text-[11px] font-medium",
          "text-muted-foreground transition-colors",
          "hover:bg-indigo-50/60 hover:text-indigo-700",
          "focus-visible:bg-indigo-50/60 focus-visible:text-indigo-700 focus-visible:outline-none",
        )}
        title={`Analyze ${report.name} with AI`}
        aria-label={`Analyze ${report.name} with AI`}
      >
        <Sparkles className="h-3 w-3" />
        <span className="hidden sm:inline">Analyze</span>
      </button>
    </li>
  );
}

// -----------------------------------------------------------------------------
// Report tile — card-shaped variant used in the chat-first picker view where
// we have more horizontal room. The whole tile is a "stretched link" to the
// standard Entrata report; a small Analyze button sits in the bottom-right
// corner (z-indexed above the link overlay) to launch the AI chat.
// -----------------------------------------------------------------------------

function ReportTile({
  report,
  onAnalyze,
  highlight,
  starred,
}: {
  report: ReportDef;
  onAnalyze: () => void;
  highlight: string;
  starred?: boolean;
}) {
  const Icon = report.icon;
  const href = getReportUrl(report);

  return (
    <li className="group/tile relative flex h-full min-h-[112px] flex-col gap-1.5 rounded-lg border border-border bg-background p-3 transition-all hover:border-foreground/30 hover:shadow-sm">
      {/* Stretched link — covers the entire tile so any click on the body
          opens the standard Entrata report. The Analyze button below opts
          out via a higher z-index. */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${report.name} in Entrata (new window)`}
        title={`Open ${report.name} in Entrata (new window)`}
        className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
      />

      <div className="flex items-start justify-between gap-2">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="flex items-center gap-1">
          {starred && (
            <Star
              aria-label="Starred"
              className="h-3 w-3 shrink-0 text-amber-500"
              fill="currentColor"
              strokeWidth={0}
            />
          )}
          <ExternalLink
            aria-hidden
            className="h-3 w-3 shrink-0 text-muted-foreground/0 transition-colors group-hover/tile:text-muted-foreground/60"
          />
        </div>
      </div>

      <h4 className="line-clamp-2 text-[12.5px] font-semibold leading-tight text-foreground group-hover/tile:underline group-hover/tile:decoration-foreground/30 group-hover/tile:underline-offset-2">
        {highlight ? (
          <Highlighted text={report.name} match={highlight} />
        ) : (
          report.name
        )}
      </h4>

      <div className="mt-auto flex items-center justify-between gap-1.5 pt-1">
        <span className="truncate font-mono text-[10px] tabular-nums text-muted-foreground/80">
          {FREQ_LABEL[report.frequency]} · {report.lastRun}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAnalyze();
          }}
          className={cn(
            "relative z-20 inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 bg-background px-1.5 py-0.5",
            "text-[10px] font-medium text-muted-foreground transition-colors",
            "hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700",
            "focus-visible:border-indigo-300 focus-visible:bg-indigo-50 focus-visible:text-indigo-700 focus-visible:outline-none",
          )}
          title={`Analyze ${report.name} with AI`}
          aria-label={`Analyze ${report.name} with AI`}
        >
          <Sparkles className="h-2.5 w-2.5" />
          Analyze
        </button>
      </div>
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
// Highlighted text — bolds matched substring inside a string.
// Retained from the (removed) search affordance; degrades to plain text when
// the highlight prop is "".
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

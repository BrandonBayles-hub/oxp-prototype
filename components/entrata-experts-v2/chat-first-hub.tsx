"use client";
import * as React from "react";
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  FileBarChart,
  Sparkles,
} from "lucide-react";
import { ASSISTANTS } from "@/lib/entrata-experts-v2/assistants";
import {
  REPORT_BY_ID,
  recentReports,
} from "@/lib/entrata-experts-v2/reports";
import { AnalystChat } from "./analyst-chat";
import { AssistantChat } from "./assistant-chat";
import { ReportAnalyzerChat } from "./report-analyzer-chat";
import { ReportAnalyzerModule } from "./report-analyzer-module";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =============================================================================
// Chat-first hub (prototype layout — toggle-gated by the page)
// -----------------------------------------------------------------------------
// Inspired by Gemini Gems. The user lands directly inside Entrata Analyst.
// A left rail lets them switch between Analyst, the pre-built Assistants, and
// the Report Analyzer without ever returning to a "hub" landing page.
//
// This is intentionally additive: existing chat components are reused as-is
// (their own BackBar still renders; we wire onBack to "return to Analyst").
// If this pattern wins, we'd then refactor BackBar out of the chat components
// when they're embedded inside this layout.
// =============================================================================

type Selection =
  | { kind: "analyst" }
  | { kind: "assistant"; id: string }
  | { kind: "report-picker" }
  | { kind: "report"; id: string };

const STORAGE_KEY = "oxp:experts-v2:chat-first-selection";
const DEFAULT_SELECTION: Selection = { kind: "analyst" };

function loadSelection(): Selection {
  if (typeof window === "undefined") return DEFAULT_SELECTION;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SELECTION;
    const parsed = JSON.parse(raw) as Selection;
    if (!parsed || typeof parsed !== "object") return DEFAULT_SELECTION;
    if (
      parsed.kind === "analyst" ||
      parsed.kind === "report-picker" ||
      (parsed.kind === "assistant" && typeof parsed.id === "string") ||
      (parsed.kind === "report" && typeof parsed.id === "string")
    ) {
      return parsed;
    }
    return DEFAULT_SELECTION;
  } catch {
    return DEFAULT_SELECTION;
  }
}

const HEADING_FONT =
  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif";

export function ChatFirstHub() {
  const [selection, setSelection] = React.useState<Selection>(DEFAULT_SELECTION);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setSelection(loadSelection());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      /* ignore */
    }
  }, [selection, hydrated]);

  const selectAnalyst = () => setSelection({ kind: "analyst" });
  const selectAssistant = (id: string) => setSelection({ kind: "assistant", id });
  const selectReportPicker = () => setSelection({ kind: "report-picker" });
  const selectReport = (id: string) => setSelection({ kind: "report", id });

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px] overflow-hidden rounded-lg bg-background">
      <ExpertsRail
        selection={selection}
        onSelectAnalyst={selectAnalyst}
        onSelectAssistant={selectAssistant}
        onSelectReportPicker={selectReportPicker}
        onSelectReport={selectReport}
      />
      <main className="flex min-w-0 flex-1 flex-col bg-background">
        {selection.kind === "analyst" && (
          <EmbeddedShell>
            <AnalystChat
              onBack={selectAnalyst}
              hideBack
              hideNew
              alignWithSidebar
            />
          </EmbeddedShell>
        )}
        {selection.kind === "assistant" && (
          <EmbeddedShell>
            <AssistantChat
              assistantId={selection.id}
              onBack={selectAnalyst}
              hideBack
              hideNew
            />
          </EmbeddedShell>
        )}
        {selection.kind === "report-picker" && (
          <ReportPickerView onLaunchReport={selectReport} />
        )}
        {selection.kind === "report" && (
          <EmbeddedShell>
            <ReportAnalyzerChat
              reportId={selection.id}
              onBack={selectReportPicker}
              hideBack
              hideNew
            />
          </EmbeddedShell>
        )}
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// EmbeddedShell — strips the outer chrome (border + fixed h-[calc(...)]) off
// the reused chat components and lets them claim the full height of <main>.
// The wrapper is itself a flex-1 flex-column so it fills the available
// vertical space; the CSS child-selector then forces the chat's own root div
// to fill the wrapper. This avoids refactoring each child to add an
// `embedded` prop, so the chat components remain unmodified.
// -----------------------------------------------------------------------------
function EmbeddedShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        "[&>div]:h-full [&>div]:min-h-0 [&>div]:flex-1",
        "[&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none",
      )}
    >
      {children}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ExpertsRail — left column with Analyst pinned, then Assistants, then the
// Report Analyzer entry (which deepens into a picker + per-report chats).
// -----------------------------------------------------------------------------

function ExpertsRail({
  selection,
  onSelectAnalyst,
  onSelectAssistant,
  onSelectReportPicker,
  onSelectReport,
}: {
  selection: Selection;
  onSelectAnalyst: () => void;
  onSelectAssistant: (id: string) => void;
  onSelectReportPicker: () => void;
  onSelectReport: (id: string) => void;
}) {
  const activeReport =
    selection.kind === "report" ? REPORT_BY_ID[selection.id] : undefined;

  // Pinned recents under "Report Analyzer" so the user can jump back to a
  // recent report in one click without going through the picker.
  const recents = React.useMemo(() => recentReports().slice(0, 3), []);

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="flex-1 overflow-y-auto scrollbar-hover px-2 py-3">
        {/* Entrata Analyst — pinned, primary */}
        <RailRow
          active={selection.kind === "analyst"}
          onClick={onSelectAnalyst}
          icon={
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: "#3b7a9e1a", color: "#3b7a9e" }}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </span>
          }
          title="Entrata Analyst"
          subtitle="Data-connected"
          trailing={
            <Badge variant="yellow" className="text-[9px]">
              Beta
            </Badge>
          }
        />

        <RailGroup label="Assistants">
          {ASSISTANTS.map((a) => {
            const Icon = a.icon;
            const active =
              selection.kind === "assistant" && selection.id === a.id;
            return (
              <RailRow
                key={a.id}
                active={active}
                onClick={() => onSelectAssistant(a.id)}
                icon={
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ background: `${a.hue}1a`, color: a.hue }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                }
                title={a.name}
              />
            );
          })}
        </RailGroup>

        <RailGroup label="Reports">
          <RailRow
            active={
              selection.kind === "report-picker" || selection.kind === "report"
            }
            onClick={onSelectReportPicker}
            icon={
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md"
                style={{ background: "#4338ca1a", color: "#4338ca" }}
              >
                <FileBarChart className="h-3.5 w-3.5" />
              </span>
            }
            title="Report Analyzer"
            subtitle={
              activeReport ? `Open · ${activeReport.name}` : undefined
            }
            trailing={
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            }
          />
          {recents.length > 0 && (
            <div className="ml-9 mt-0.5 space-y-0.5 border-l border-border/60 pl-2">
              {recents.map((r) => {
                const active =
                  selection.kind === "report" && selection.id === r.id;
                const RIcon = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectReport(r.id)}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/60",
                      active && "bg-muted",
                    )}
                    title={r.name}
                  >
                    <RIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate text-[11.5px] leading-tight text-muted-foreground">
                      {r.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </RailGroup>
      </div>

      <div className="border-t border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>Chat-first layout · prototype</span>
        </div>
      </div>
    </aside>
  );
}

function RailGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <div className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function RailRow({
  active,
  onClick,
  icon,
  title,
  subtitle,
  trailing,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        "hover:bg-muted/60",
        active && "bg-muted ring-1 ring-inset ring-border",
      )}
      title={title}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium leading-tight text-foreground">
          {title}
        </div>
        {subtitle && (
          <div className="truncate text-[10.5px] leading-tight text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </button>
  );
}

// -----------------------------------------------------------------------------
// ReportPickerView — main-area picker when "Report Analyzer" is selected but
// no specific report has been chosen yet. Reuses the existing module.
// -----------------------------------------------------------------------------

function ReportPickerView({
  onLaunchReport,
}: {
  onLaunchReport: (reportId: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border px-5 py-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-md"
          style={{ background: "#4338ca14", color: "#4338ca" }}
        >
          <FileBarChart className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className="text-base font-semibold leading-tight text-foreground"
            style={{ fontFamily: HEADING_FONT }}
          >
            Report Analyzer
          </h2>
          <p className="truncate text-[12px] text-muted-foreground">
            Pick a report you have access to — Entrata Experts will summarize
            trends, flag anomalies, and draft a narrative you can share.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hover px-6 py-5">
        <ReportAnalyzerModule
          onLaunchReport={onLaunchReport}
          variant="tiles"
        />
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Looking for the data view instead?</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-foreground hover:underline"
          >
            Open Entrata Analyst
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

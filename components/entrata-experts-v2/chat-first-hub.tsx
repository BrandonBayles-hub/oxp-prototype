"use client";
import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Beaker,
  ChevronDown,
  ChevronRight,
  FileBarChart,
  Sparkles,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ASSISTANTS,
  ANALYST_LOGO,
  REPORT_ANALYZER_LOGO,
} from "@/lib/entrata-experts-v2/assistants";

// Page-chrome badges authored in the production gradient-badge style so the
// top toggle reads as the same icon family as the expert rail badges.
const EXPERTS_BADGE = "/experts/experts-badge.svg";
const TOKENS_BADGE = "/experts/tokens-badge.svg";
import {
  REPORT_BY_ID,
  recentReports,
} from "@/lib/entrata-experts-v2/reports";
import { AnalystChat } from "./analyst-chat";
import { AssistantChat } from "./assistant-chat";
import { ReportAnalyzerChat } from "./report-analyzer-chat";
import { ReportAnalyzerModule } from "./report-analyzer-module";
import { CreditsUsage } from "./credits-usage";
import { SharedHistorySidebar } from "./shared-history-sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useEntrataExpertsRelease,
  ENTRATA_EXPERTS_VERSIONS,
} from "@/lib/entrata-experts-release-context";
import {
  ExpertsHistoryProvider,
  useExpertsHistory,
  type HistoryThread,
  type ThreadSource,
} from "@/lib/entrata-experts-v2/history-store";

// =============================================================================
// Chat-first hub
// -----------------------------------------------------------------------------
// The Entrata Experts surface, inspired by Gemini Gems. The user lands
// directly inside Entrata Analyst. A left rail (ExpertsRail) lets them switch
// between Analyst, the pre-built Assistants, and the Report Analyzer without
// ever returning to a separate landing page.
//
// This rail replaces the OXP main sidebar for this route — AppShell drops the
// sidebar via NO_SIDEBAR_ROUTES, and a "← OXP Studio" affordance at the top
// of the rail navigates back to the rest of OXP.
//
// Existing chat components are reused as-is: their own BackBar would normally
// render, but we set hideBack/hideNew here since the rail itself handles
// switching between experts.
// =============================================================================

type Selection =
  | { kind: "analyst" }
  | { kind: "assistant"; id: string }
  | { kind: "report-picker" }
  | { kind: "report"; id: string };

// Top-level page mode. Entrata Experts (the chat-first workspace) and Tokens &
// Usage are peer "pages" switched via the segmented toggle in the hub top bar
// — not entries inside the experts rail.
type HubMode = "experts" | "tokens";

const STORAGE_KEY = "oxp:experts-v2:chat-first-selection";
const MODE_STORAGE_KEY = "oxp:experts-v2:chat-first-mode";
const DEFAULT_SELECTION: Selection = { kind: "analyst" };
const DEFAULT_MODE: HubMode = "experts";

function loadMode(): HubMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const raw = window.sessionStorage.getItem(MODE_STORAGE_KEY);
    return raw === "tokens" ? "tokens" : "experts";
  } catch {
    return DEFAULT_MODE;
  }
}

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

export interface ChatFirstHubProps {
  /**
   * Called when the user clicks the "← OXP Studio" back affordance in the
   * rail. Caller is expected to switch the page out of chat-first mode so
   * the standard OXP sidebar comes back.
   */
  onExitFocus?: () => void;
}

function sourceToSelection(s: ThreadSource): Selection {
  if (s.kind === "analyst") return { kind: "analyst" };
  if (s.kind === "assistant") return { kind: "assistant", id: s.id };
  return { kind: "report", id: s.id };
}

// Public entry — provides the shared history context to the whole workspace so
// every surface (Analyst, Assistants, Report Analyzer) reads/writes one list.
export function ChatFirstHub(props: ChatFirstHubProps = {}) {
  return (
    <ExpertsHistoryProvider>
      <ChatFirstHubInner {...props} />
    </ExpertsHistoryProvider>
  );
}

function ChatFirstHubInner({ onExitFocus }: ChatFirstHubProps) {
  const history = useExpertsHistory();
  // `pendingSelection` is which surface to show when *no* thread is open (a
  // fresh "new conversation"). When a thread is open, the surface is derived
  // from that thread's source instead — so selection always matches history.
  const [pendingSelection, setPendingSelection] = React.useState<Selection>(DEFAULT_SELECTION);
  const [mode, setMode] = React.useState<HubMode>(DEFAULT_MODE);
  const [hydrated, setHydrated] = React.useState(false);

  // Tokens & Usage is a v1.2 surface (see entrata-experts-release-context).
  const { atLeast } = useEntrataExpertsRelease();
  const showTokens = atLeast("v1.2");

  React.useEffect(() => {
    setPendingSelection(loadSelection());
    setMode(loadMode());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pendingSelection));
      window.sessionStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [pendingSelection, mode, hydrated]);

  // If the release is downgraded below v1.2 while Tokens & Usage is open,
  // snap back to the Experts workspace so we never show a gated surface.
  React.useEffect(() => {
    if (!showTokens && mode === "tokens") setMode("experts");
  }, [showTokens, mode]);

  const activeThread = history.activeId ? history.getThread(history.activeId) : undefined;
  const selection: Selection = activeThread
    ? sourceToSelection(activeThread.source)
    : pendingSelection;

  // Rail clicks start a fresh conversation on the chosen surface. Specific
  // threads are reopened from the shared history sidebar.
  const selectAnalyst = () => {
    setPendingSelection({ kind: "analyst" });
    history.newThread();
  };
  const selectAssistant = (id: string) => {
    setPendingSelection({ kind: "assistant", id });
    history.newThread();
  };
  const selectReportPicker = () => {
    setPendingSelection({ kind: "report-picker" });
    history.newThread();
  };
  const selectReport = (id: string) => {
    setPendingSelection({ kind: "report", id });
    history.newThread();
  };
  const openThread = (thread: HistoryThread) => {
    setPendingSelection(sourceToSelection(thread.source));
    history.setActiveId(thread.id);
  };
  const newConversation = () => history.newThread();

  const showTokensView = mode === "tokens" && showTokens;

  return (
    // h-full lets the parent decide the viewport — when rendered in focus
    // mode (page sets ?focus=1, AppShell drops the page-content wrapper) we
    // fill the entire main area below the top nav. min-h-[600px] keeps the
    // layout sane on very short windows.
    <div className="flex h-full min-h-[600px] flex-col overflow-hidden bg-background">
      <HubTopBar
        mode={mode}
        onChangeMode={setMode}
        showTokens={showTokens}
        onExitFocus={onExitFocus}
      />

      {showTokensView ? (
        <TokensView />
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ExpertsRail
            selection={selection}
            onSelectAnalyst={selectAnalyst}
            onSelectAssistant={selectAssistant}
            onSelectReportPicker={selectReportPicker}
            onSelectReport={selectReport}
          />
          <SharedHistorySidebar
            threads={history.threads}
            activeId={history.activeId}
            onOpen={openThread}
            onNew={newConversation}
          />
          <main className="flex min-w-0 flex-1 flex-col bg-background">
            {selection.kind === "analyst" && (
              <EmbeddedShell>
                <AnalystChat onBack={selectAnalyst} hideBack hideNew />
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
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// HubTopBar — page-level chrome that owns the "← OXP Studio" affordance, the
// Entrata Experts identity, and the segmented page toggle. The toggle treats
// Entrata Experts and Tokens & Usage as peer pages. When Tokens & Usage is
// gated off (< v1.2) the toggle collapses to a plain wordmark so the bar still
// reads as the Entrata Experts header.
// -----------------------------------------------------------------------------

function HubTopBar({
  mode,
  onChangeMode,
  showTokens,
  onExitFocus,
}: {
  mode: HubMode;
  onChangeMode: (m: HubMode) => void;
  showTokens: boolean;
  onExitFocus?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-background px-3 py-2">
      {onExitFocus && (
        <>
          <button
            type="button"
            onClick={onExitFocus}
            className="group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            title="Return to OXP Studio"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
            <span>OXP Studio</span>
          </button>
          <span aria-hidden className="h-5 w-px bg-border" />
        </>
      )}

      {showTokens ? (
        <ModeToggle mode={mode} onChange={onChangeMode} />
      ) : (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={EXPERTS_BADGE} alt="" aria-hidden className="h-5 w-5" />
          <span
            className="text-[13px] font-semibold tracking-tight text-foreground"
            style={{ fontFamily: HEADING_FONT }}
          >
            Entrata Experts
          </span>
        </div>
      )}

      <div className="ml-auto">
        <EntrataExpertsDemoControl />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// EntrataExpertsDemoControl — inconspicuous demo affordance pinned to the
// right edge of the HubTopBar. Collapsed by default, it shows a small Beaker
// chip; on click it opens a popover with the release version picker. Lets
// internal stakeholders downgrade the prototype to v1.0/v1.1/v1.2 without
// hunting through a global menu, since the surface is scoped to Entrata
// Experts only.
// -----------------------------------------------------------------------------

function EntrataExpertsDemoControl() {
  const { version, setVersion } = useEntrataExpertsRelease();
  const [open, setOpen] = React.useState(false);
  const activeVersion = ENTRATA_EXPERTS_VERSIONS.find((v) => v.id === version);
  const isFull = version === "full";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors",
            "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            open && "bg-muted/60 text-foreground",
          )}
          aria-label="Open Entrata Experts demo controls"
        >
          <Beaker className="h-3 w-3" strokeWidth={2} />
          <span>Demo</span>
          {!isFull && (
            <span
              className="rounded-full bg-indigo-100 px-1.5 py-px text-[9.5px] font-semibold tracking-normal text-indigo-700"
              aria-label={`Current release: ${activeVersion?.label ?? version}`}
            >
              {activeVersion?.label ?? version}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              open && "rotate-180",
            )}
            strokeWidth={2}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-72 p-3"
      >
        <div className="mb-2 flex items-center gap-1.5">
          <Beaker className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Entrata Experts Demo Control
          </h3>
        </div>
        <p className="mb-2 px-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
          Release Version
        </p>
        <div className="flex flex-col gap-0.5">
          {ENTRATA_EXPERTS_VERSIONS.map((v) => {
            const isActive = version === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVersion(v.id)}
                className={cn(
                  "flex items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
                  isActive ? "bg-indigo-50" : "hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-all",
                    isActive
                      ? "bg-indigo-600"
                      : "border-2 border-muted-foreground/40 bg-transparent",
                  )}
                >
                  {isActive && (
                    <span className="h-1 w-1 rounded-full bg-white" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[12px]",
                      isActive
                        ? "font-semibold text-foreground"
                        : "font-medium text-foreground/80",
                    )}
                  >
                    {v.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-muted-foreground">
                    {v.tagline}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Segmented page toggle. Refined pill control — active segment lifts onto a
// solid background with a hairline ring; the active icon picks up its page's
// accent hue (indigo for Experts, amber for Tokens & Usage).
function ModeToggle({
  mode,
  onChange,
}: {
  mode: HubMode;
  onChange: (m: HubMode) => void;
}) {
  const items: {
    id: HubMode;
    label: string;
    badge: string;
  }[] = [
    { id: "experts", label: "Entrata Experts", badge: EXPERTS_BADGE },
    { id: "tokens", label: "Tokens & Usage", badge: TOKENS_BADGE },
  ];

  return (
    <div
      role="tablist"
      aria-label="Entrata Experts pages"
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/40 p-0.5"
    >
      {items.map((it) => {
        const active = mode === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3.5 text-[12.5px] font-medium transition-all",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.badge}
              alt=""
              aria-hidden
              className={cn(
                "h-5 w-5 shrink-0 transition-opacity",
                active ? "opacity-100" : "opacity-60",
              )}
            />
            {it.label}
          </button>
        );
      })}
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
    // Width matches the OXP main sidebar (w-64) so swapping in/out feels
    // visually stable rather than the layout jumping by 16px. The page
    // identity + "← OXP Studio" affordance now live in the HubTopBar, so the
    // rail starts directly with its nav.
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="flex-1 overflow-y-auto scrollbar-hover px-2 py-3">
        {/* Entrata Analyst — pinned, primary */}
        <RailRow
          active={selection.kind === "analyst"}
          onClick={onSelectAnalyst}
          icon={<ExpertLogo src={ANALYST_LOGO} alt="Entrata Analyst" />}
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
            const active =
              selection.kind === "assistant" && selection.id === a.id;
            return (
              <RailRow
                key={a.id}
                active={active}
                onClick={() => onSelectAssistant(a.id)}
                icon={<ExpertLogo src={a.image} alt={a.name} />}
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
            icon={<ExpertLogo src={REPORT_ANALYZER_LOGO} alt="Report Analyzer" />}
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

// Production expert badge. These SVGs (extracted from the live EntrataGPT app
// into /public/experts/) carry their own circular gradient background, so we
// render them bare at the rail icon size rather than inside a tinted square.
function ExpertLogo({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-7 w-7 shrink-0" />
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
// TokensView — main-area view for Tokens & Usage. Reuses the existing
// CreditsUsage dashboard (same component the Admin Insights page used to host)
// inside a scrollable container with a header that matches ReportPickerView.
// -----------------------------------------------------------------------------

function TokensView() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border px-5 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={TOKENS_BADGE} alt="" aria-hidden className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2
            className="text-base font-semibold leading-tight text-foreground"
            style={{ fontFamily: HEADING_FONT }}
          >
            Tokens &amp; Usage
          </h2>
          <p className="truncate text-[12px] text-muted-foreground">
            Token spend, per-expert breakdown, and conversation insights across
            your Entrata Experts usage.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hover px-6 py-5">
        <CreditsUsage />
      </div>
    </div>
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

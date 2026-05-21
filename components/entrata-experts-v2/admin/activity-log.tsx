"use client";
import * as React from "react";
import type {
  Conversation,
  AssistantMessage,
  Message,
  LensId,
  RoleId,
  Resolution,
} from "@/lib/entrata-experts-v2/types";
import { EMPLOYEE_BY_ID, avatarColor, initials } from "@/lib/entrata-experts-v2/data/employees";
import { LENS_BY_ID, LENSES, ROLES } from "@/lib/entrata-experts-v2/lenses";
import { INTENTS } from "@/lib/entrata-experts-v2/data/answers";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/entrata-experts-v2/format";
import { cn } from "@/lib/utils";
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ThumbsDown,
  ThumbsUp,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Clock,
  TrendingDown,
  ArrowRight,
} from "lucide-react";

// -----------------------------------------------------------------------------
// Filter state
// -----------------------------------------------------------------------------
// `turnBand` and `resolution` are session-level filters. The rest match the
// previous behavior so admins who already know the table don't lose anything.

type TurnBand = "any" | "single" | "short" | "investigation" | "deep";
type RegressionFilter = "any" | "regressed" | "no";

interface Filters {
  q: string;
  lens: LensId | "all";
  role: RoleId | "all";
  intent: string | "all";
  resolution: Resolution | "all";
  rating: "any" | "up" | "down" | "none";
  turnBand: TurnBand;
  regression: RegressionFilter;
}

const DEFAULT_FILTERS: Filters = {
  q: "",
  lens: "all",
  role: "all",
  intent: "all",
  resolution: "all",
  rating: "any",
  turnBand: "any",
  regression: "any",
};

const TURN_BANDS: { value: TurnBand; label: string; match: (n: number) => boolean }[] = [
  { value: "any", label: "Any length", match: () => true },
  { value: "single", label: "Single turn", match: (n) => n === 1 },
  { value: "short", label: "Short (2–3)", match: (n) => n >= 2 && n <= 3 },
  { value: "investigation", label: "Investigation (4–6)", match: (n) => n >= 4 && n <= 6 },
  { value: "deep", label: "Deep (7+)", match: (n) => n >= 7 },
];

// -----------------------------------------------------------------------------
// ActivityLog — session-level table with expandable turn timeline
// -----------------------------------------------------------------------------
export function ActivityLog({ activity }: { activity: Conversation[] }) {
  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const filtered = React.useMemo(() => {
    return activity.filter((c) => {
      // Free-text search across every user message body and every assistant
      // reply body. Lets admins hunt for "Tampa" or "MTTR" anywhere in the
      // session — including follow-up turns, which the old log missed.
      if (filters.q) {
        const hay = c.messages.map((m) => m.body).join(" ").toLowerCase();
        if (!hay.includes(filters.q.toLowerCase())) return false;
      }
      // Lens filter matches if *any* turn used the lens (sessions can pivot).
      if (filters.lens !== "all" && !c.lensesUsed.includes(filters.lens) && c.lens !== filters.lens) return false;
      const employee = EMPLOYEE_BY_ID[c.userId];
      if (filters.role !== "all" && employee?.role !== filters.role) return false;
      if (filters.intent !== "all" && c.intent !== filters.intent) return false;
      if (filters.resolution !== "all" && c.resolution !== filters.resolution) return false;
      if (filters.rating !== "any") {
        if (filters.rating === "none" && c.finalRating) return false;
        if (filters.rating === "up" && c.finalRating !== "up") return false;
        if (filters.rating === "down" && c.finalRating !== "down") return false;
      }
      const band = TURN_BANDS.find((b) => b.value === filters.turnBand);
      if (band && !band.match(c.turnCount)) return false;
      if (filters.regression === "regressed" && !c.regressed) return false;
      if (filters.regression === "no" && c.regressed) return false;
      return true;
    });
  }, [activity, filters]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasActiveFilters =
    filters.q ||
    filters.lens !== "all" ||
    filters.role !== "all" ||
    filters.intent !== "all" ||
    filters.resolution !== "all" ||
    filters.rating !== "any" ||
    filters.turnBand !== "any" ||
    filters.regression !== "any";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prompts and answers (across all turns)…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            className="pl-9"
          />
        </div>
        <FilterSelect
          label="Lens"
          value={filters.lens}
          onChange={(v) => setFilters((f) => ({ ...f, lens: v as LensId | "all" }))}
          options={[
            { value: "all", label: "All lenses" },
            ...LENSES.map((l) => ({ value: l.id, label: l.label })),
          ]}
        />
        <FilterSelect
          label="Role"
          value={filters.role}
          onChange={(v) => setFilters((f) => ({ ...f, role: v as RoleId | "all" }))}
          options={[
            { value: "all", label: "All roles" },
            ...ROLES.map((r) => ({ value: r.id, label: r.label })),
          ]}
        />
        <FilterSelect
          label="Intent"
          value={filters.intent}
          onChange={(v) => setFilters((f) => ({ ...f, intent: v }))}
          options={[
            { value: "all", label: "All intents" },
            ...INTENTS.map((i) => ({ value: i.id, label: i.label })),
            { value: "refused", label: "(Refused / out-of-scope)" },
          ]}
        />
        <FilterSelect
          label="Resolution"
          value={filters.resolution}
          onChange={(v) => setFilters((f) => ({ ...f, resolution: v as Filters["resolution"] }))}
          options={[
            { value: "all", label: "Any" },
            { value: "resolved", label: "Resolved" },
            { value: "abandoned", label: "Abandoned" },
            { value: "escalated", label: "Escalated" },
            { value: "ongoing", label: "Ongoing" },
          ]}
        />
        <FilterSelect
          label="Length"
          value={filters.turnBand}
          onChange={(v) => setFilters((f) => ({ ...f, turnBand: v as TurnBand }))}
          options={TURN_BANDS.map((b) => ({ value: b.value, label: b.label }))}
        />
        <FilterSelect
          label="Final rating"
          value={filters.rating}
          onChange={(v) => setFilters((f) => ({ ...f, rating: v as Filters["rating"] }))}
          options={[
            { value: "any", label: "Any" },
            { value: "up", label: "Thumbs up" },
            { value: "down", label: "Thumbs down" },
            { value: "none", label: "Unrated" },
          ]}
        />
        <FilterSelect
          label="Regression"
          value={filters.regression}
          onChange={(v) => setFilters((f) => ({ ...f, regression: v as RegressionFilter }))}
          options={[
            { value: "any", label: "Any" },
            { value: "regressed", label: "Started 👍 ended 👎" },
            { value: "no", label: "No regression" },
          ]}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
        {activity.length} sessions
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="w-8 px-3 py-2"></th>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Who</th>
              <th className="px-3 py-2">Topic</th>
              <th className="px-3 py-2 text-center">Turns</th>
              <th className="px-3 py-2">Lens(es)</th>
              <th className="px-3 py-2">Resolution</th>
              <th className="px-3 py-2">Rating</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  No sessions match these filters.
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const employee = EMPLOYEE_BY_ID[c.userId];
              const primaryLens = LENS_BY_ID[c.lens];
              const PrimaryIcon = primaryLens?.icon;
              const isOpen = expanded.has(c.id);

              return (
                <React.Fragment key={c.id}>
                  <tr
                    onClick={() => toggle(c.id)}
                    className={cn(
                      "cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40",
                      isOpen && "bg-muted/40",
                    )}
                  >
                    <td className="px-3 py-2 align-top">
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
                      <div className="text-foreground/80">{formatRelative(c.createdAt)}</div>
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
                        <Clock className="h-3 w-3" />
                        {formatDuration(c.durationMs)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white"
                          style={{ backgroundColor: avatarColor(employee?.avatarSeed ?? 0) }}
                          title={employee?.name}
                        >
                          {initials(employee?.name ?? "?")}
                        </span>
                        <div className="leading-tight">
                          <div className="text-[13px] font-medium text-foreground">{employee?.name}</div>
                          <div className="text-[11px] text-muted-foreground">{employee?.roleLabel}</div>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[420px] px-3 py-2">
                      <div className="truncate text-foreground">{c.messages[0].body}</div>
                      {c.regressed && (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-700">
                          <TrendingDown className="h-3 w-3" />
                          Regressed
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <TurnBadge count={c.turnCount} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {primaryLens && PrimaryIcon && (
                        <span
                          className="inline-flex items-center gap-1 text-[12px]"
                          style={{ color: primaryLens.hue }}
                        >
                          <PrimaryIcon className="h-3 w-3" />
                          <span className="text-foreground">{primaryLens.label}</span>
                        </span>
                      )}
                      {c.lensesUsed.length > 1 && (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          +{c.lensesUsed.length - 1}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <ResolutionBadge resolution={c.resolution} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {c.finalRating === "up" && <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />}
                      {c.finalRating === "down" && <ThumbsDown className="h-3.5 w-3.5 text-rose-600" />}
                      {!c.finalRating && <span className="text-xs text-muted-foreground/60">—</span>}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-muted/30">
                      <td colSpan={8} className="px-6 py-4">
                        <SessionTimeline conversation={c} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SessionTimeline — the expanded view inside an open row
// -----------------------------------------------------------------------------
// Shows every turn (user → assistant) in chronological order with per-turn
// metadata (lens, outcome, rating, confidence). This is the "forensic"
// drilldown — admins use it to find which turn within a session is where the
// AI went off the rails.
function SessionTimeline({ conversation }: { conversation: Conversation }) {
  const turns = pairTurns(conversation.messages);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {turns.length} {turns.length === 1 ? "turn" : "turns"} ·{" "}
          {formatDuration(conversation.durationMs)} ·{" "}
          <ResolutionBadge resolution={conversation.resolution} inline />
        </div>
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
          Open in chat
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
      <ol className="relative space-y-3 border-l-2 border-border/40 pl-5">
        {turns.map((turn, idx) => (
          <TurnRow key={idx} turn={turn} index={idx + 1} />
        ))}
      </ol>
    </div>
  );
}

interface TurnPair {
  user: { body: string; createdAt: string };
  assistant?: AssistantMessage;
}

function pairTurns(messages: Message[]): TurnPair[] {
  const pairs: TurnPair[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const next = messages[i + 1];
    pairs.push({
      user: { body: m.body, createdAt: m.createdAt },
      assistant: next && next.role === "assistant" ? (next as AssistantMessage) : undefined,
    });
  }
  return pairs;
}

function TurnRow({ turn, index }: { turn: TurnPair; index: number }) {
  const a = turn.assistant;
  const lens = a ? LENS_BY_ID[a.lens] : undefined;
  const LIcon = lens?.icon;

  return (
    <li className="relative">
      <span className="absolute -left-[27px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-zinc-300 bg-card font-mono text-[9px] font-medium text-zinc-700">
        {index}
      </span>
      <div className="space-y-2">
        {/* User turn */}
        <div className="rounded-md bg-muted/60 px-3 py-2 text-[13px] text-foreground">
          <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            User · {formatRelative(turn.user.createdAt)}
          </div>
          {turn.user.body}
        </div>
        {/* Assistant reply */}
        {a && (
          <div className="rounded-md border border-border bg-card px-3 py-2 text-[13px] text-foreground">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                AI ·{" "}
                {lens && LIcon && (
                  <span className="inline-flex items-center gap-0.5" style={{ color: lens.hue }}>
                    <LIcon className="h-2.5 w-2.5" />
                    <span className="text-foreground">{lens.label}</span>
                  </span>
                )}
                · {a.depth}
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <OutcomeMicroBadge outcome={a.outcome} />
                {a.rating === "up" && <ThumbsUp className="h-3 w-3 text-emerald-600" />}
                {a.rating === "down" && <ThumbsDown className="h-3 w-3 text-rose-600" />}
              </div>
            </div>
            <div className="text-foreground/90">
              {a.body.replace(/\[#\d+\]/g, "").slice(0, 280) + (a.body.length > 280 ? "…" : "")}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-3 border-t border-border/50 pt-1.5 text-[11px] text-muted-foreground">
              <span><span className="font-medium text-foreground/80">Conf:</span> {a.confidence}</span>
              <span><span className="font-medium text-foreground/80">Citations:</span> {a.citations.length}</span>
              <span><span className="font-medium text-foreground/80">Trace steps:</span> {a.trace.length}</span>
              <span><span className="font-medium text-foreground/80">Artifacts:</span> {a.artifacts.length}</span>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

// -----------------------------------------------------------------------------
// Badges
// -----------------------------------------------------------------------------

function ResolutionBadge({
  resolution,
  inline = false,
}: {
  resolution: Resolution;
  inline?: boolean;
}) {
  const wrapClass = inline ? "ml-1 inline-flex" : "inline-flex";
  if (resolution === "resolved")
    return (
      <Badge variant="green" className={cn(wrapClass, "gap-1 text-[10px]")}>
        <CheckCircle2 className="h-3 w-3" />
        Resolved
      </Badge>
    );
  if (resolution === "abandoned")
    return (
      <Badge variant="yellow" className={cn(wrapClass, "gap-1 text-[10px]")}>
        <AlertTriangle className="h-3 w-3" />
        Abandoned
      </Badge>
    );
  if (resolution === "escalated")
    return (
      <Badge variant="destructive" className={cn(wrapClass, "gap-1 text-[10px]")}>
        <ShieldX className="h-3 w-3" />
        Escalated
      </Badge>
    );
  return (
    <Badge variant="secondary" className={cn(wrapClass, "gap-1 text-[10px]")}>
      <Clock className="h-3 w-3" />
      Ongoing
    </Badge>
  );
}

function OutcomeMicroBadge({ outcome }: { outcome: AssistantMessage["outcome"] }) {
  const map = {
    answered: { label: "Answered", variant: "green" as const },
    "low-confidence": { label: "Low conf.", variant: "yellow" as const },
    refused: { label: "Refused", variant: "destructive" as const },
    escalated: { label: "Escalated", variant: "yellow" as const },
  };
  const m = map[outcome];
  return (
    <Badge variant={m.variant} className="px-1.5 py-0 text-[10px]">
      {m.label}
    </Badge>
  );
}

function TurnBadge({ count }: { count: number }) {
  // Single-turn: gray. Multi-turn: secondary. Investigation: yellow. Deep: destructive.
  const variant: "gray" | "secondary" | "yellow" | "destructive" =
    count === 1 ? "gray" : count <= 3 ? "secondary" : count <= 6 ? "yellow" : "destructive";
  return (
    <Badge variant={variant} className="gap-1 px-1.5 py-0 text-[10px] tabular-nums">
      <MessageSquare className="h-3 w-3" />
      {count}
    </Badge>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatDuration(ms: number): string {
  if (ms < 1000) return "<1s";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  if (m < 10 && s > 0) return `${m}m ${s}s`;
  return `${m}m`;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="hidden md:inline">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

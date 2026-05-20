"use client";
import * as React from "react";
import type {
  Conversation,
  AssistantMessage,
  LensId,
  RoleId,
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
} from "lucide-react";

interface Filters {
  q: string;
  lens: LensId | "all";
  role: RoleId | "all";
  intent: string | "all";
  outcome: AssistantMessage["outcome"] | "all";
  rating: "any" | "up" | "down" | "none";
}

const DEFAULT_FILTERS: Filters = {
  q: "",
  lens: "all",
  role: "all",
  intent: "all",
  outcome: "all",
  rating: "any",
};

export function ActivityLog({ activity }: { activity: Conversation[] }) {
  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const filtered = React.useMemo(() => {
    return activity.filter((c) => {
      const a = c.messages[1] as AssistantMessage | undefined;
      if (filters.q) {
        const hay = (c.messages[0].body + " " + (a?.body ?? "")).toLowerCase();
        if (!hay.includes(filters.q.toLowerCase())) return false;
      }
      if (filters.lens !== "all" && c.lens !== filters.lens) return false;
      const employee = EMPLOYEE_BY_ID[c.userId];
      if (filters.role !== "all" && employee?.role !== filters.role) return false;
      if (filters.intent !== "all" && c.intent !== filters.intent) return false;
      if (filters.outcome !== "all" && a?.outcome !== filters.outcome) return false;
      if (filters.rating !== "any") {
        if (filters.rating === "none" && a?.rating) return false;
        if (filters.rating === "up" && a?.rating !== "up") return false;
        if (filters.rating === "down" && a?.rating !== "down") return false;
      }
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
    filters.outcome !== "all" ||
    filters.rating !== "any";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prompts and answers…"
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
          label="Outcome"
          value={filters.outcome}
          onChange={(v) => setFilters((f) => ({ ...f, outcome: v as Filters["outcome"] }))}
          options={[
            { value: "all", label: "Any" },
            { value: "answered", label: "Answered" },
            { value: "low-confidence", label: "Low confidence" },
            { value: "refused", label: "Refused" },
            { value: "escalated", label: "Escalated" },
          ]}
        />
        <FilterSelect
          label="Rating"
          value={filters.rating}
          onChange={(v) => setFilters((f) => ({ ...f, rating: v as Filters["rating"] }))}
          options={[
            { value: "any", label: "Any" },
            { value: "up", label: "Thumbs up" },
            { value: "down", label: "Thumbs down" },
            { value: "none", label: "Unrated" },
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
        Showing <span className="font-medium text-foreground">{filtered.length}</span> of {activity.length} conversations
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="w-8 px-3 py-2"></th>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Who</th>
              <th className="px-3 py-2">Question</th>
              <th className="px-3 py-2">Lens</th>
              <th className="px-3 py-2">Outcome</th>
              <th className="px-3 py-2">Rating</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No conversations match these filters.
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const employee = EMPLOYEE_BY_ID[c.userId];
              const a = c.messages[1] as AssistantMessage | undefined;
              const lensDef = LENS_BY_ID[c.lens];
              const LIcon = lensDef?.icon;
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
                      {formatRelative(c.createdAt)}
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
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {lensDef && LIcon && (
                        <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: lensDef.hue }}>
                          <LIcon className="h-3 w-3" />
                          <span className="text-foreground">{lensDef.label}</span>
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <OutcomeBadge outcome={a?.outcome ?? "answered"} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {a?.rating === "up" && <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />}
                      {a?.rating === "down" && <ThumbsDown className="h-3.5 w-3.5 text-rose-600" />}
                      {!a?.rating && <span className="text-xs text-muted-foreground/60">—</span>}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-muted/30">
                      <td colSpan={7} className="px-6 py-4">
                        <ExpandedRow conversation={c} />
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

function ExpandedRow({ conversation }: { conversation: Conversation }) {
  const a = conversation.messages[1] as AssistantMessage | undefined;
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          User asked
        </div>
        <div className="rounded-md bg-muted/60 px-3 py-2 text-[14px] text-foreground">
          {conversation.messages[0].body}
        </div>
      </div>
      {a && (
        <>
          <div>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Answer (truncated)
            </div>
            <div className="rounded-md border border-border bg-card px-3 py-2 text-[14px] text-foreground">
              {a.body.replace(/\[#\d+\]/g, "").slice(0, 360) + (a.body.length > 360 ? "…" : "")}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">Confidence:</span> {a.confidence}</span>
            <span><span className="font-medium text-foreground">Depth:</span> {a.depth}</span>
            <span><span className="font-medium text-foreground">Scope:</span> {a.scope.label}</span>
            <span><span className="font-medium text-foreground">Citations:</span> {a.citations.length}</span>
            <span><span className="font-medium text-foreground">Trace steps:</span> {a.trace.length}</span>
            <span><span className="font-medium text-foreground">Artifacts:</span> {a.artifacts.length}</span>
          </div>
        </>
      )}
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: AssistantMessage["outcome"] }) {
  if (outcome === "answered")
    return (
      <Badge variant="green" className="gap-1 text-[10px]">
        <CheckCircle2 className="h-3 w-3" />Answered
      </Badge>
    );
  if (outcome === "refused")
    return (
      <Badge variant="destructive" className="gap-1 text-[10px]">
        <ShieldX className="h-3 w-3" />Refused
      </Badge>
    );
  if (outcome === "low-confidence")
    return (
      <Badge variant="yellow" className="gap-1 text-[10px]">
        <AlertTriangle className="h-3 w-3" />Low conf.
      </Badge>
    );
  return (
    <Badge variant="yellow" className="gap-1 text-[10px]">
      <AlertTriangle className="h-3 w-3" />Escalated
    </Badge>
  );
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

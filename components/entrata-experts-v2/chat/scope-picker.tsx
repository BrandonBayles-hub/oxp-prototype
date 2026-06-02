"use client";
import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  PROPERTIES,
  PROPERTY_GROUPS,
  REGION_DEFS,
  SEGMENTS,
  propertiesForScopeIds,
  type SegmentId,
} from "@/lib/entrata-experts-v2/data/portfolio";
import type { Scope, ScopeKind, ScopeSelection } from "@/lib/entrata-experts-v2/types";
import {
  Building2,
  Check,
  ChevronDown,
  Folder,
  Globe,
  Info,
  Layers,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Scope composition
//
// Single source of truth: `selections[]`. Everything else on the Scope object
// (kind, id, label, propertyIds) is derived from selections at compose time.
// "portfolio" is mutually exclusive with all other selections.
// ---------------------------------------------------------------------------

const PORTFOLIO_SELECTION: ScopeSelection = {
  kind: "portfolio",
  id: "portfolio",
  label: "Whole portfolio",
};

function composeScope(selections: ScopeSelection[]): Scope {
  // Empty or contains portfolio => everything.
  if (selections.length === 0 || selections.some((s) => s.id === "portfolio")) {
    return {
      kind: "portfolio",
      id: "portfolio",
      label: "Whole portfolio",
      selections: [PORTFOLIO_SELECTION],
      propertyIds: PROPERTIES.map((p) => p.id),
    };
  }

  const propertyIds = propertiesForScopeIds(selections.map((s) => s.id)).map(
    (p) => p.id,
  );

  // Single selection => mirror that selection's kind/id and use its label.
  if (selections.length === 1) {
    const only = selections[0];
    return {
      kind: only.kind as ScopeKind,
      id: only.id,
      label: only.label,
      selections,
      propertyIds,
    };
  }

  // Multi-select => composed label, synthetic id.
  const first = selections[0].label;
  const more = selections.length - 1;
  return {
    kind: "custom",
    id: `custom:${selections.map((s) => s.id).join(",")}`,
    label: `${first} + ${more} more`,
    selections,
    propertyIds,
  };
}

function iconForKind(kind: ScopeSelection["kind"]) {
  switch (kind) {
    case "portfolio":
      return Globe;
    case "group":
      return Folder;
    case "region":
      return MapPin;
    case "segment":
      return Layers;
    case "property":
    default:
      return Building2;
  }
}

// ---------------------------------------------------------------------------
// Recent scopes (persisted to localStorage)
// ---------------------------------------------------------------------------

const RECENT_KEY = "ee:scope-recents";
const RECENT_MAX = 4;

interface RecentScope {
  key: string;
  label: string;
  selections: ScopeSelection[];
}

function loadRecents(): RecentScope[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecents(list: RecentScope[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    /* noop */
  }
}

function recentKey(selections: ScopeSelection[]): string {
  return selections.map((s) => `${s.kind}:${s.id}`).sort().join("|");
}

// ---------------------------------------------------------------------------
// Picker
// ---------------------------------------------------------------------------

export function ScopePicker({
  scope,
  onChange,
}: {
  scope: Scope;
  onChange: (scope: Scope) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  // Draft selections live only while the popover is open. We commit on Apply
  // (or auto-commit when the popover closes via outside click).
  const initialSelections = React.useMemo<ScopeSelection[]>(
    () => scope.selections ?? [PORTFOLIO_SELECTION],
    [scope],
  );
  const [draft, setDraft] = React.useState<ScopeSelection[]>(initialSelections);
  const [recents, setRecents] = React.useState<RecentScope[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setDraft(initialSelections);
      setQuery("");
      setRecents(loadRecents());
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, initialSelections]);

  // ----- Selection helpers -----------------------------------------------

  const isSelected = (kind: ScopeSelection["kind"], id: string) =>
    draft.some((s) => s.kind === kind && s.id === id);

  function toggle(selection: ScopeSelection) {
    // Selecting portfolio clears everything else (and selects portfolio).
    if (selection.id === "portfolio") {
      setDraft([PORTFOLIO_SELECTION]);
      return;
    }
    // Selecting anything else removes portfolio.
    const withoutPortfolio = draft.filter((s) => s.id !== "portfolio");
    const existing = withoutPortfolio.find(
      (s) => s.kind === selection.kind && s.id === selection.id,
    );
    if (existing) {
      const next = withoutPortfolio.filter(
        (s) => !(s.kind === selection.kind && s.id === selection.id),
      );
      setDraft(next.length === 0 ? [PORTFOLIO_SELECTION] : next);
    } else {
      setDraft([...withoutPortfolio, selection]);
    }
  }

  function clearAll() {
    setDraft([PORTFOLIO_SELECTION]);
  }

  function applyAndClose(committed?: ScopeSelection[]) {
    const final = committed ?? draft;
    const next = composeScope(final);
    onChange(next);
    // Persist anything more interesting than "Whole portfolio" to recents.
    if (!(final.length === 1 && final[0].id === "portfolio")) {
      const key = recentKey(final);
      const without = recents.filter((r) => r.key !== key);
      const updated = [
        { key, label: next.label, selections: final },
        ...without,
      ].slice(0, RECENT_MAX);
      setRecents(updated);
      saveRecents(updated);
    }
    setOpen(false);
  }

  // ----- Filtering -------------------------------------------------------

  const q = query.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);

  const filteredGroups = PROPERTY_GROUPS.filter(
    (g) => matches(g.label) || matches(g.description),
  );
  const filteredRegions = REGION_DEFS.filter(
    (r) => r.id !== "all" && matches(r.label),
  );
  const filteredSegments = SEGMENTS.filter((s) =>
    matches(s.label),
  ).map((s) => ({
    ...s,
    count: PROPERTIES.filter((p) => p.segment === s.id).length,
  }));
  const filteredProperties = PROPERTIES.filter(
    (p) =>
      matches(p.shortName) ||
      matches(p.name) ||
      matches(p.city) ||
      matches(p.state) ||
      matches(p.segment),
  );
  const filteredRecents = recents.filter((r) => matches(r.label));

  const totalMatches =
    (matches("whole portfolio") ? 1 : 0) +
    filteredGroups.length +
    filteredRegions.length +
    filteredSegments.length +
    filteredProperties.length;

  // ----- Selected property count for the apply button -------------------

  const draftPropertyCount = React.useMemo(() => {
    if (draft.some((s) => s.id === "portfolio")) return PROPERTIES.length;
    return propertiesForScopeIds(draft.map((s) => s.id)).length;
  }, [draft]);

  // ----- Trigger label rendering ----------------------------------------

  const TriggerIcon = iconForKind(scope.kind === "custom" ? "portfolio" : (scope.kind as ScopeSelection["kind"]));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 hover:bg-muted/60",
            "text-[12px] font-medium text-foreground transition-colors",
          )}
        >
          <TriggerIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[180px] truncate">{scope.label}</span>
          {scope.kind === "custom" && scope.selections && (
            <span className="rounded-sm bg-muted px-1 text-[10px] text-muted-foreground">
              {scope.propertyIds?.length ?? 0}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[360px] p-0 overflow-hidden"
        onOpenAutoFocus={(e) => {
          // Let our manual focus on the search input win.
          e.preventDefault();
        }}
      >
        {/* Search header */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search properties, groups, regions, types…"
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Selected chips strip — only when there's something interesting */}
        {!draft.some((s) => s.id === "portfolio") && draft.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 px-3 py-2">
            {draft.map((s) => {
              const Icon = iconForKind(s.kind);
              return (
                <span
                  key={`${s.kind}:${s.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground"
                >
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  {s.label}
                  <button
                    type="button"
                    onClick={() => toggle(s)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${s.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}

        {/* Scrollable results */}
        <div className="max-h-[340px] overflow-y-auto scrollbar-hover p-1">
          {/* Recents */}
          {!q && filteredRecents.length > 0 && (
            <Section title="Recent">
              {filteredRecents.map((r) => (
                <Row
                  key={r.key}
                  icon={Folder}
                  label={r.label}
                  meta={`${propertiesForScopeIds(r.selections.map((s) => s.id)).length} properties`}
                  selected={false}
                  onClick={() => applyAndClose(r.selections)}
                />
              ))}
            </Section>
          )}

          {/* Portfolio */}
          {matches("whole portfolio") && (
            <Section title="Portfolio">
              <Row
                icon={Globe}
                label="Whole portfolio"
                meta={`${PROPERTIES.length} properties`}
                selected={isSelected("portfolio", "portfolio")}
                onClick={() => toggle(PORTFOLIO_SELECTION)}
              />
            </Section>
          )}

          {/* Property Groups */}
          {filteredGroups.length > 0 && (
            <Section
              title="Property Groups"
              hint="Managed in Entrata · Properties · Groups"
            >
              {filteredGroups.map((g) => (
                <Row
                  key={g.id}
                  icon={Folder}
                  label={g.label}
                  sub={g.description}
                  meta={`${g.propertyIds.length} properties`}
                  selected={isSelected("group", g.id)}
                  onClick={() =>
                    toggle({ kind: "group", id: g.id, label: g.label })
                  }
                />
              ))}
            </Section>
          )}

          {/* Regions */}
          {filteredRegions.length > 0 && (
            <Section title="Regions">
              {filteredRegions.map((r) => (
                <Row
                  key={r.id}
                  icon={MapPin}
                  label={r.label}
                  meta={`${r.propertyIds.length} properties`}
                  selected={isSelected("region", r.id)}
                  onClick={() =>
                    toggle({ kind: "region", id: r.id, label: r.label })
                  }
                />
              ))}
            </Section>
          )}

          {/* Property Types */}
          {filteredSegments.length > 0 && (
            <Section title="Property Types">
              {filteredSegments.map((s) => (
                <Row
                  key={s.id}
                  icon={Layers}
                  label={s.label}
                  meta={`${s.count} ${s.count === 1 ? "property" : "properties"}`}
                  disabled={s.count === 0}
                  selected={isSelected("segment", s.id)}
                  onClick={() =>
                    toggle({ kind: "segment", id: s.id as SegmentId, label: s.label })
                  }
                />
              ))}
            </Section>
          )}

          {/* Properties */}
          {filteredProperties.length > 0 && (
            <Section title={`Properties (${filteredProperties.length})`}>
              {filteredProperties.map((p) => (
                <Row
                  key={p.id}
                  icon={Building2}
                  label={p.shortName}
                  sub={`${p.city}, ${p.state} · ${p.segment}`}
                  selected={isSelected("property", p.id)}
                  onClick={() =>
                    toggle({ kind: "property", id: p.id, label: p.shortName })
                  }
                />
              ))}
            </Section>
          )}

          {totalMatches === 0 && filteredRecents.length === 0 && (
            <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
              No matches for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer: hint + apply */}
        <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-3 py-2">
          <Info className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          <span className="flex-1 text-[11px] text-muted-foreground">
            {draftPropertyCount} {draftPropertyCount === 1 ? "property" : "properties"} selected
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => applyAndClose()}
            className="rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background hover:opacity-90"
          >
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Local UI primitives
// ---------------------------------------------------------------------------

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pb-1">
      <div className="flex items-center justify-between px-2.5 pb-0.5 pt-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {hint && (
          <span className="text-[10px] text-muted-foreground/80">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  sub,
  meta,
  selected,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub?: string;
  meta?: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : selected
            ? "bg-muted"
            : "hover:bg-muted/60",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border",
          selected
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-background",
        )}
        aria-hidden
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px]">{label}</div>
        {sub && (
          <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
        )}
      </div>
      {meta && (
        <span className="text-[11px] text-muted-foreground">{meta}</span>
      )}
    </button>
  );
}

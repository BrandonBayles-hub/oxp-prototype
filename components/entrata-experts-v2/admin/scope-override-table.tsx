"use client";

import * as React from "react";
import { Building2, Plus, Search, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWorkforce } from "@/lib/workforce-context";
import { ENTRATA_GROUPS } from "@/lib/entrata-groups";
import { PROPERTIES } from "@/lib/entrata-experts-v2/data/portfolio";
import {
  makeScopeKey,
  parseScopeKey,
  type ScopeKey,
  type ScopeKind,
} from "@/lib/entrata-experts-v2/admin-policy-context";
import { cn } from "@/lib/utils";

// =============================================================================
// ScopeOverrideTable
// -----------------------------------------------------------------------------
// Generic admin-control surface used by the Spend Limits and Model Access
// sections of the Experts admin sheet. Renders:
//
//   ┌─ Default row ──────────────────────────────┐
//   │ Org default                       [editor] │
//   ├─ Override rows ────────────────────────────┤
//   │ [Group] Leasing Team              [editor] [×] │
//   │ [User] Sarah Chen                 [editor] [×] │
//   ├─ Add override ─────────────────────────────┤
//   │ + Add override (User / Group / Property)   │
//   └────────────────────────────────────────────┘
//
// The actual editor rendering is delegated to the parent via render props so
// the table is fully reusable across policy types (spend caps, model access,
// future: surface visibility, depth limits, etc.).
// =============================================================================

export interface ScopeOverrideTableProps<T> {
  title: string;
  description?: string;
  /** The org-default value rendered in the first row. */
  defaultValue: T;
  /** Sparse map of overrides keyed by ScopeKey. */
  overrides: Record<ScopeKey, T>;
  onDefaultChange: (next: T) => void;
  onOverrideChange: (key: ScopeKey, next: T) => void;
  onOverrideRemove: (key: ScopeKey) => void;
  /** Render the editor cell for a given value. Used by both default row and override rows. */
  renderEditor: (
    value: T,
    onChange: (next: T) => void,
    /** Hint to compactify or otherwise tweak rendering for override rows. */
    isOverride: boolean,
  ) => React.ReactNode;
  /** Default value to seed a freshly-added override (defaults to the current org default). */
  newOverrideValue?: T;
  /** Optional summary string shown next to each override label, e.g. "Up to $500/mo". */
  renderSummary?: (value: T) => React.ReactNode;
}

export function ScopeOverrideTable<T>({
  title,
  description,
  defaultValue,
  overrides,
  onDefaultChange,
  onOverrideChange,
  onOverrideRemove,
  renderEditor,
  newOverrideValue,
  renderSummary,
}: ScopeOverrideTableProps<T>) {
  const overrideEntries = React.useMemo(
    () => Object.entries(overrides) as [ScopeKey, T][],
    [overrides],
  );

  const [pickerOpen, setPickerOpen] = React.useState(false);

  const handleAdd = (key: ScopeKey) => {
    if (overrides[key]) {
      // Already exists — no-op; we don't reset existing overrides on re-pick.
      setPickerOpen(false);
      return;
    }
    onOverrideChange(key, newOverrideValue ?? defaultValue);
    setPickerOpen(false);
  };

  return (
    <section className="rounded-lg border border-border bg-background">
      <header className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </header>

      <div className="divide-y divide-border border-t border-border">
        {/* Default row — always visible, can't be removed. */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex min-w-[180px] items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Org default
            </span>
          </div>
          <div className="flex-1">
            {renderEditor(defaultValue, onDefaultChange, false)}
          </div>
          <div className="w-8" aria-hidden />
        </div>

        {/* Override rows */}
        {overrideEntries.map(([key, value]) => (
          <OverrideRow
            key={key}
            scopeKey={key}
            value={value}
            renderEditor={renderEditor}
            renderSummary={renderSummary}
            onChange={(next) => onOverrideChange(key, next)}
            onRemove={() => onOverrideRemove(key)}
          />
        ))}
      </div>

      {/* Add-override picker */}
      <div className="border-t border-border px-3 py-2">
        <ScopePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          existingKeys={new Set(Object.keys(overrides) as ScopeKey[])}
          onPick={handleAdd}
        />
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// OverrideRow — one scope override.
// -----------------------------------------------------------------------------

function OverrideRow<T>({
  scopeKey,
  value,
  renderEditor,
  renderSummary,
  onChange,
  onRemove,
}: {
  scopeKey: ScopeKey;
  value: T;
  renderEditor: ScopeOverrideTableProps<T>["renderEditor"];
  renderSummary?: (value: T) => React.ReactNode;
  onChange: (next: T) => void;
  onRemove: () => void;
}) {
  const { kind, id } = parseScopeKey(scopeKey);
  const label = useScopeLabel(kind, id);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-[180px] items-center gap-2">
        <ScopeBadge kind={kind} />
        <span className="truncate text-[13px] text-foreground" title={label}>
          {label}
        </span>
        {renderSummary && (
          <span className="ml-1 text-[11px] text-muted-foreground">
            {renderSummary(value)}
          </span>
        )}
      </div>
      <div className="flex-1">{renderEditor(value, onChange, true)}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={onRemove}
        aria-label={`Remove ${label} override`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ScopeBadge({ kind }: { kind: ScopeKind }) {
  const config: Record<
    ScopeKind,
    { label: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    user: { label: "User", icon: UserIcon },
    group: { label: "Group", icon: Users },
    property: { label: "Property", icon: Building2 },
  };
  const { label, icon: Icon } = config[kind];
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// Use a small inline icon instead of pulling in another lucide name; keeps
// the row tightly aligned with the Group + Property icon sizes.
function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Scope label resolution — pulls from the canonical data sources.
// -----------------------------------------------------------------------------

function useScopeLabel(kind: ScopeKind, id: string): string {
  const { members } = useWorkforce();
  return React.useMemo(() => {
    if (kind === "user") {
      const m = members.find((mm) => mm.id === id);
      return m ? `${m.name} · ${m.role}` : id;
    }
    if (kind === "group") {
      const g = ENTRATA_GROUPS.find((gg) => gg.id === id);
      return g ? g.name : id;
    }
    if (kind === "property") {
      const p = PROPERTIES.find((pp) => pp.id === id);
      return p ? p.name : id;
    }
    return id;
  }, [kind, id, members]);
}

// -----------------------------------------------------------------------------
// ScopePicker — three-tab combobox for choosing the next override scope.
// -----------------------------------------------------------------------------

function ScopePicker({
  open,
  onOpenChange,
  existingKeys,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingKeys: Set<ScopeKey>;
  onPick: (key: ScopeKey) => void;
}) {
  const [tab, setTab] = React.useState<ScopeKind>("group");
  const [query, setQuery] = React.useState("");

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add override
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        collisionPadding={16}
        className="w-[360px] p-0"
      >
        <div className="flex items-center gap-0.5 border-b border-border p-1">
          {(["user", "group", "property"] as ScopeKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setTab(k);
                setQuery("");
              }}
              className={cn(
                "flex-1 rounded px-2 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors",
                tab === k
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {k === "user" ? "User" : k === "group" ? "Group" : "Property"}
            </button>
          ))}
        </div>
        <div className="relative border-b border-border px-2 py-1.5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tab}s…`}
            className="h-7 w-full rounded border border-input bg-background pl-7 pr-2 text-[12px] focus-visible:border-foreground/40 focus-visible:outline-none"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="max-h-[260px] overflow-y-auto py-1">
          {tab === "user" && (
            <UserList query={query} existingKeys={existingKeys} onPick={onPick} />
          )}
          {tab === "group" && (
            <GroupList query={query} existingKeys={existingKeys} onPick={onPick} />
          )}
          {tab === "property" && (
            <PropertyList
              query={query}
              existingKeys={existingKeys}
              onPick={onPick}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ListEmpty({ label }: { label: string }) {
  return (
    <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
      {label}
    </div>
  );
}

function PickRow({
  label,
  sub,
  onClick,
  disabled,
}: {
  label: string;
  sub?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left transition-colors",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-muted/60",
      )}
      title={disabled ? "Already overridden" : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-foreground">{label}</div>
        {sub && (
          <div className="truncate text-[11px] text-muted-foreground">
            {sub}
          </div>
        )}
      </div>
      {disabled && (
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          Added
        </span>
      )}
    </button>
  );
}

function UserList({
  query,
  existingKeys,
  onPick,
}: {
  query: string;
  existingKeys: Set<ScopeKey>;
  onPick: (key: ScopeKey) => void;
}) {
  const { members } = useWorkforce();
  const q = query.trim().toLowerCase();
  // Humans only — agents aren't billable users for spend / model purposes.
  const filtered = React.useMemo(() => {
    return members
      .filter((m) => m.type === "human")
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          m.team.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [members, q]);

  if (filtered.length === 0) {
    return <ListEmpty label={`No users match "${query || "—"}"`} />;
  }

  return (
    <div className="px-1">
      {filtered.map((m) => {
        const key = makeScopeKey("user", m.id);
        return (
          <PickRow
            key={key}
            label={m.name}
            sub={`${m.role} · ${m.team}`}
            onClick={() => onPick(key)}
            disabled={existingKeys.has(key)}
          />
        );
      })}
    </div>
  );
}

function GroupList({
  query,
  existingKeys,
  onPick,
}: {
  query: string;
  existingKeys: Set<ScopeKey>;
  onPick: (key: ScopeKey) => void;
}) {
  const q = query.trim().toLowerCase();
  const filtered = ENTRATA_GROUPS.filter(
    (g) => !q || g.name.toLowerCase().includes(q),
  );

  if (filtered.length === 0) {
    return <ListEmpty label={`No groups match "${query || "—"}"`} />;
  }

  return (
    <div className="px-1">
      {filtered.map((g) => {
        const key = makeScopeKey("group", g.id);
        return (
          <PickRow
            key={key}
            label={g.name}
            sub={`${g.memberCount} member${g.memberCount === 1 ? "" : "s"}`}
            onClick={() => onPick(key)}
            disabled={existingKeys.has(key)}
          />
        );
      })}
    </div>
  );
}

function PropertyList({
  query,
  existingKeys,
  onPick,
}: {
  query: string;
  existingKeys: Set<ScopeKey>;
  onPick: (key: ScopeKey) => void;
}) {
  const q = query.trim().toLowerCase();
  const filtered = PROPERTIES.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.shortName.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q),
  );

  if (filtered.length === 0) {
    return <ListEmpty label={`No properties match "${query || "—"}"`} />;
  }

  return (
    <div className="px-1">
      {filtered.map((p) => {
        const key = makeScopeKey("property", p.id);
        return (
          <PickRow
            key={key}
            label={p.name}
            sub={`${p.city}, ${p.state} · ${p.units} units`}
            onClick={() => onPick(key)}
            disabled={existingKeys.has(key)}
          />
        );
      })}
    </div>
  );
}

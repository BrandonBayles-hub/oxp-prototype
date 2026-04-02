"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ROLES } from "@/lib/role-context";
import { useWorkforce, type WorkforceMember } from "@/lib/workforce-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RemovableMetadataChip } from "@/components/removable-metadata-chip";
import { cn } from "@/lib/utils";

const ROLE_PREFIX = "role:";
const USER_PREFIX = "user:";

function labelForEntry(key: string, humans: WorkforceMember[]): string {
  if (key.startsWith(ROLE_PREFIX)) {
    const v = key.slice(ROLE_PREFIX.length);
    return ROLES.find((r) => r.value === v)?.label ?? v;
  }
  if (key.startsWith(USER_PREFIX)) {
    const id = key.slice(USER_PREFIX.length);
    const m = humans.find((h) => h.id === id);
    return m?.name ?? id;
  }
  return key;
}

type OptionRow = {
  key: string;
  primary: string;
  secondary?: string;
  group: "role" | "user";
};

const VIEWER_CHIP_LIMIT = 4;

export function ViewerAccessCombobox({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const { humanMembers } = useWorkforce();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const options = useMemo((): OptionRow[] => {
    const roleRows: OptionRow[] = ROLES.map((r) => ({
      key: `${ROLE_PREFIX}${r.value}`,
      primary: r.label,
      secondary: "Role",
      group: "role" as const,
    }));
    const userRows: OptionRow[] = humanMembers
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => ({
        key: `${USER_PREFIX}${m.id}`,
        primary: m.name,
        secondary: `${m.role} · ${m.team}`,
        group: "user" as const,
      }));
    return [...roleRows, ...userRows];
  }, [humanMembers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.primary.toLowerCase().includes(q) ||
        (o.secondary?.toLowerCase().includes(q) ?? false)
    );
  }, [options, query]);

  const roleOpts = filtered.filter((o) => o.group === "role");
  const userOpts = filtered.filter((o) => o.group === "user");

  const toggle = (key: string, checked: boolean) => {
    const set = new Set(value);
    if (checked) set.add(key);
    else set.delete(key);
    const next = [...set];
    if (next.length === 0) return;
    onChange(next);
  };

  const remove = (key: string) => {
    const next = value.filter((k) => k !== key);
    if (next.length === 0) return;
    onChange(next);
  };

  if (disabled) {
    const visible = expanded ? value : value.slice(0, VIEWER_CHIP_LIMIT);
    return (
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          {visible.map((k) => (
            <RemovableMetadataChip key={k}>{labelForEntry(k, humanMembers)}</RemovableMetadataChip>
          ))}
        </div>
        {value.length > VIEWER_CHIP_LIMIT && (
          <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1.5 text-xs font-medium text-primary hover:underline">
            {expanded ? "See less" : `See more (${value.length - VIEWER_CHIP_LIMIT} more)`}
          </button>
        )}
      </div>
    );
  }

  const visibleChips = expanded ? value : value.slice(0, VIEWER_CHIP_LIMIT);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleChips.map((k) => (
              <RemovableMetadataChip
                key={k}
                removeLabel={`Remove ${labelForEntry(k, humanMembers)}`}
                onRemove={() => remove(k)}
              >
                {labelForEntry(k, humanMembers)}
              </RemovableMetadataChip>
            ))}
          </div>
          {value.length > VIEWER_CHIP_LIMIT && (
            <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1.5 text-xs font-medium text-primary hover:underline">
              {expanded ? "See less" : `See more (${value.length - VIEWER_CHIP_LIMIT} more)`}
            </button>
          )}
        </div>
      )}

      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-9 w-full justify-between px-3 py-2 text-left font-normal"
            aria-label="Add viewers"
          >
            <span className="text-muted-foreground text-sm">Search roles and people…</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start">
          <div className="border-b border-border p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {roleOpts.length > 0 && (
              <>
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Roles
                </p>
                {roleOpts.map((o) => {
                  const checked = value.includes(o.key);
                  return (
                    <label
                      key={o.key}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/80"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => toggle(o.key, c === true)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block font-medium leading-tight">{o.primary}</span>
                        <span className="text-[10px] text-muted-foreground">{o.secondary}</span>
                      </span>
                    </label>
                  );
                })}
              </>
            )}
            {userOpts.length > 0 && (
              <>
                <p className="mt-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  People
                </p>
                {userOpts.map((o) => {
                  const checked = value.includes(o.key);
                  return (
                    <label
                      key={o.key}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/80"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => toggle(o.key, c === true)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block font-medium leading-tight">{o.primary}</span>
                        <span className="line-clamp-2 text-[10px] text-muted-foreground">{o.secondary}</span>
                      </span>
                    </label>
                  );
                })}
              </>
            )}
            {filtered.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">No matches.</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

"use client";

/**
 * Call Queue tab body — lists every configured queue, lets an operator
 * create/edit/duplicate/delete them, and surfaces live-ish metrics per
 * queue. Every queue can span multiple properties and has an assignable
 * agent roster (drawn from `useWorkforce()`), plus routing strategy,
 * business hours, SLA target, overflow chain, callback policy, and
 * after-hours behavior — matching the depth Five9 / Talkdesk / Genesys
 * expose to supervisors.
 *
 * The edit sheet is intentionally organized as five sub-tabs so a big
 * form isn't a wall — the user asked us to fill in the gaps from
 * market research, and each of those gap-fill fields lives in the tab
 * where a supervisor would look for it (skills → Agents, holidays →
 * Hours, etc.).
 */

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
  Pause,
  Phone,
  Play,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PropertySelector } from "@/components/property-selector";
import {
  ALL_PROPERTIES,
  afterHoursDisplay,
  daysDisplay,
  formatWait,
  overflowStepDisplay,
  queueStatus,
  strategyDescription,
  strategyLabel,
  useCallRouting,
  type AfterHoursAction,
  type CallQueue,
  type OverflowStep,
  type QueueAgentTier,
  type QueueGroupMembership,
  type QueueRoutingStrategy,
} from "@/lib/call-routing-context";
import { ENTRATA_GROUPS, type EntrataGroup } from "@/lib/entrata-groups";
import { useWorkforce, type WorkforceMember } from "@/lib/workforce-context";
import {
  getSelectedPropertyNames,
  getDataForView,
  propertyNamesToIdsFromList,
} from "@/lib/property-selector-data";
import { AgentAvatarStack, AggregateOverview, PropertyChips, QueueLiveMetrics } from "./shared";

// ─── Top-level panel ──────────────────────────────────────────────────────

export function CallQueuePanel() {
  const { queues, createQueue, updateQueue, deleteQueue, duplicateQueue } = useCallRouting();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return queues;
    const q = search.trim().toLowerCase();
    return queues.filter(
      (queue) =>
        queue.name.toLowerCase().includes(q) ||
        queue.description.toLowerCase().includes(q) ||
        queue.properties.some((p) => p.toLowerCase().includes(q)) ||
        queue.skills.some((s) => s.toLowerCase().includes(q)),
    );
  }, [queues, search]);

  const editing = queues.find((q) => q.id === editingId) ?? null;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Call Queues</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create queues that span one or more properties, assign agents with
            per-member priority (primary / secondary / backup), set skills for
            routing, and configure hours, SLA, overflow, and callback policy.
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => {
            const created = createQueue({
              name: "New queue",
              description: "",
              properties: [],
              members: [],
              skills: [],
            });
            setEditingId(created.id);
          }}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New queue
        </Button>
      </div>

      <AggregateOverview queues={queues} />

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queues, properties, skills…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((queue) => (
          <QueueCard
            key={queue.id}
            queue={queue}
            onEdit={() => setEditingId(queue.id)}
            onDuplicate={() => duplicateQueue(queue.id)}
            onPauseToggle={() => updateQueue(queue.id, { paused: !queue.paused })}
            onDelete={() => {
              if (window.confirm(`Delete queue "${queue.name}"? This can't be undone.`)) {
                deleteQueue(queue.id);
              }
            }}
          />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No queues match your search</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adjust your search or create a new queue.
            </p>
          </div>
        )}
      </div>

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-0 sm:max-w-2xl"
        >
          {editing && (
            <QueueEditSheet
              queue={editing}
              onClose={() => setEditingId(null)}
              onChange={(updates) => updateQueue(editing.id, updates)}
              onDelete={() => {
                deleteQueue(editing.id);
                setEditingId(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Single queue row ─────────────────────────────────────────────────────

function QueueCard({
  queue,
  onEdit,
  onDuplicate,
  onPauseToggle,
  onDelete,
}: {
  queue: CallQueue;
  onEdit: () => void;
  onDuplicate: () => void;
  onPauseToggle: () => void;
  onDelete: () => void;
}) {
  const status = queueStatus(queue);
  return (
    <div className="rounded-lg border border-border bg-background transition-colors hover:border-primary/30">
      <button
        type="button"
        onClick={onEdit}
        className="w-full space-y-3 p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{queue.name}</p>
              <QueueStatusBadge status={status.status} label={status.label} />
              <Badge variant="secondary" className="text-[10px]">
                Priority {queue.priority}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {queue.description || "No description"}
            </p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <PropertyChips properties={queue.properties} max={3} />
          <AgentAvatarStack memberIds={queue.members.map((m) => m.memberId)} max={5} />
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="text-foreground/70">Strategy:</span>
            <span className="font-medium text-foreground">{strategyLabel(queue.routingStrategy)}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="text-foreground/70">SLA:</span>
            <span className="font-medium text-foreground">
              {queue.slaTargetPct}% / {queue.slaTargetSec}s
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="text-foreground/70">Max wait:</span>
            <span className="font-medium text-foreground">{formatWait(queue.maxWaitSec)}</span>
          </span>
        </div>

        <QueueLiveMetrics queue={queue} />
      </button>

      <div className="flex items-center justify-between gap-1 border-t border-border px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          {queue.skills.length > 0 && (
            <span>
              Skills:{" "}
              <span className="font-medium text-foreground">
                {queue.skills.slice(0, 3).join(", ")}
                {queue.skills.length > 3 ? ` +${queue.skills.length - 3}` : ""}
              </span>
            </span>
          )}
          {queue.callback.enabled && (
            <span>
              Callback:{" "}
              <span className="font-medium text-foreground">
                after {queue.callback.offerAfterSec}s
              </span>
            </span>
          )}
          {queue.aiVoiceEnabled && (
            <Badge variant="ai" className="gap-1 text-[10px]">
              AI voice
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onPauseToggle}>
            {queue.paused ? (
              <>
                <Play className="h-3 w-3" aria-hidden />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-3 w-3" aria-hidden />
                Pause
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onDuplicate}>
            <Copy className="h-3 w-3" aria-hidden />
            Duplicate
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

function QueueStatusBadge({
  status,
  label,
}: {
  status: "open" | "closed" | "paused";
  label: string;
}) {
  const cls =
    status === "open"
      ? "bg-status-success text-status-success-foreground"
      : status === "paused"
      ? "bg-status-warning text-status-warning-foreground"
      : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", cls)}>
      {label}
    </span>
  );
}

// ─── Queue edit sheet ────────────────────────────────────────────────────

type EditTab = "details" | "properties" | "agents" | "routing" | "hours" | "overflow";

const EDIT_TABS: { id: EditTab; label: string; description: string }[] = [
  { id: "details", label: "Details", description: "Name, description, connected IVR, priority" },
  { id: "properties", label: "Properties", description: "Which communities feed this queue" },
  { id: "agents", label: "Agents & Skills", description: "Assign agents, tiers, and required skills" },
  { id: "routing", label: "Routing & SLA", description: "Strategy, targets, callback, AI voice" },
  { id: "hours", label: "Hours", description: "Business hours, timezone, holidays" },
  { id: "overflow", label: "Overflow", description: "What happens when the queue is over capacity" },
];

function QueueEditSheet({
  queue,
  onClose,
  onChange,
  onDelete,
}: {
  queue: CallQueue;
  onClose: () => void;
  onChange: (updates: Partial<CallQueue>) => void;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<EditTab>("details");
  const status = queueStatus(queue);

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="shrink-0 border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <SheetTitle className="truncate text-lg">{queue.name || "Untitled queue"}</SheetTitle>
              <QueueStatusBadge status={status.status} label={status.label} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{queue.id}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </SheetHeader>

      <div className="flex flex-1 min-h-0">
        {/* Sub-tab nav */}
        <div className="w-[180px] shrink-0 border-r border-border bg-muted/30 p-2">
          <ul className="space-y-0.5">
            {EDIT_TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full rounded-md px-2.5 py-1.5 text-left transition-colors",
                    activeTab === tab.id
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                  )}
                >
                  <p className="text-xs font-semibold leading-tight">{tab.label}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                    {tab.description}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "details" && <DetailsTab queue={queue} onChange={onChange} />}
          {activeTab === "properties" && <PropertiesTab queue={queue} onChange={onChange} />}
          {activeTab === "agents" && <AgentsTab queue={queue} onChange={onChange} />}
          {activeTab === "routing" && <RoutingTab queue={queue} onChange={onChange} />}
          {activeTab === "hours" && <HoursTab queue={queue} onChange={onChange} />}
          {activeTab === "overflow" && <OverflowTab queue={queue} onChange={onChange} />}
        </div>
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete queue
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tabs ────────────────────────────────────────────────────────────

function DetailsTab({
  queue,
  onChange,
}: {
  queue: CallQueue;
  onChange: (u: Partial<CallQueue>) => void;
}) {
  const { routes, updateRoute, queues } = useCallRouting();
  const [ivrOpen, setIvrOpen] = useState(false);

  // A route is "connected" to this queue if its default (no-menu-selection)
  // destination lands calls here. That's the closest mapping to the caller
  // experience: "someone dials this DID and doesn't press anything → they
  // ring this queue."
  const connectedRoutes = useMemo(
    () => routes.filter((r) => r.defaultQueueId === queue.id),
    [routes, queue.id],
  );

  const toggleRoute = (routeId: string, currentlyConnected: boolean) => {
    if (currentlyConnected) {
      // Break the connection — hand the DID's default back to a sensible
      // catch-all queue (front-desk-style if we have one, otherwise the
      // first queue that isn't the one we're editing).
      const fallback =
        queues.find((q) => q.id === "queue-front-desk" && q.id !== queue.id) ??
        queues.find((q) => q.id !== queue.id);
      if (fallback) {
        updateRoute(routeId, { defaultQueueId: fallback.id });
      }
    } else {
      updateRoute(routeId, { defaultQueueId: queue.id });
    }
  };

  return (
    <div className="space-y-5">
      <Field label="Queue name" htmlFor="q-name">
        <Input
          id="q-name"
          value={queue.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Leasing — All Communities"
        />
      </Field>
      <Field label="Description" htmlFor="q-desc" help="One or two sentences. Shown on the queue card.">
        <textarea
          id="q-desc"
          value={queue.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Cross-property leasing queue. Rings the assigned team first, then Eli — Leasing as backup."
        />
      </Field>
      <Field
        label="Connected IVR"
        help="Pick the inbound-call DIDs whose IVR should route to this queue by default. Manage per-digit IVR menu options on the Call Routing tab."
      >
        <div className="space-y-2">
          <Popover open={ivrOpen} onOpenChange={setIvrOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 w-full justify-between font-normal",
                  connectedRoutes.length > 0 && "border-primary/40",
                )}
              >
                <span className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  {connectedRoutes.length === 0 ? (
                    <span className="text-muted-foreground">No IVRs connected</span>
                  ) : connectedRoutes.length === 1 ? (
                    <span>{connectedRoutes[0].label}</span>
                  ) : (
                    <span>Connected IVRs</span>
                  )}
                  {connectedRoutes.length > 1 && (
                    <Badge variant="default" className="ml-0.5 h-4 min-w-[1rem] rounded-full px-1 text-[10px]">
                      {connectedRoutes.length}
                    </Badge>
                  )}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[380px] p-0">
              <div className="border-b border-border px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Inbound DIDs / IVRs
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Selecting a line sends its no-menu-selection calls to this queue.
                </p>
              </div>
              <div className="max-h-[320px] overflow-y-auto p-1">
                {routes.length === 0 ? (
                  <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                    No DIDs configured yet. Add one from the Call Routing tab.
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    {routes.map((r) => {
                      const connected = r.defaultQueueId === queue.id;
                      const hasMenuLink = r.ivrMenu.some(
                        (opt) => opt.action.type === "queue" && opt.action.queueId === queue.id,
                      );
                      return (
                        <li key={r.id}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50",
                              !r.enabled && "opacity-60",
                            )}
                          >
                            <Checkbox
                              checked={connected}
                              onCheckedChange={() => toggleRoute(r.id, connected)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold">
                                {r.label}
                                {!r.enabled && (
                                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                                    (disabled)
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {r.did}
                                {r.property && r.property !== "*" && ` · ${r.property}`}
                                {r.language === "es" && " · Español"}
                              </p>
                              {hasMenuLink && !connected && (
                                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                                  <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-medium text-foreground">
                                    IVR menu option points here
                                  </span>
                                </p>
                              )}
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {connectedRoutes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {connectedRoutes.map((r) => (
                <Badge key={r.id} variant="secondary" className="gap-1">
                  <Phone className="h-3 w-3" aria-hidden />
                  {r.label}
                  <button
                    type="button"
                    onClick={() => toggleRoute(r.id, true)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-background"
                    aria-label={`Disconnect ${r.label}`}
                  >
                    <X className="h-2.5 w-2.5" aria-hidden />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Field>
      <Field label="Priority" help="1 is highest. When an agent belongs to multiple queues, the higher-priority queue wins.">
        <Select
          value={String(queue.priority)}
          onValueChange={(v) => onChange({ priority: Number(v) })}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} — {n === 1 ? "Highest" : n <= 3 ? "High" : n <= 6 ? "Normal" : "Low"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function PropertiesTab({
  queue,
  onChange,
}: {
  queue: CallQueue;
  onChange: (u: Partial<CallQueue>) => void;
}) {
  const isAll = queue.properties.includes(ALL_PROPERTIES);
  const propertyData = useMemo(() => getDataForView("Property List"), []);
  const selectedIds = useMemo(
    () => propertyNamesToIdsFromList(queue.properties.filter((p) => p !== ALL_PROPERTIES), propertyData),
    [queue.properties, propertyData],
  );

  const handleSelectionChange = (next: Set<string>) => {
    const names = getSelectedPropertyNames(propertyData, next);
    onChange({ properties: names });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold">Properties served</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick every community that should feed this queue. A queue can span
          any combination of properties — that&apos;s how you make one team cover
          multiple sites without duplicating the queue.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Apply to all properties</p>
          <p className="text-xs text-muted-foreground">
            Fastest option for portfolio-level queues (payments, after-hours).
          </p>
        </div>
        <Switch
          checked={isAll}
          onCheckedChange={(v) =>
            onChange({ properties: v ? [ALL_PROPERTIES] : [] })
          }
        />
      </div>

      {!isAll && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Selected properties
          </p>
          {queue.properties.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground">No properties selected yet.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {queue.properties.map((p) => (
                <Badge key={p} variant="secondary" className="gap-1">
                  <Building className="h-3 w-3" aria-hidden />
                  {p}
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ properties: queue.properties.filter((x) => x !== p) })
                    }
                    className="ml-0.5 rounded-full p-0.5 hover:bg-background"
                    aria-label={`Remove ${p}`}
                  >
                    <X className="h-2.5 w-2.5" aria-hidden />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-3">
            <PropertySelector
              className="max-h-[380px]"
              selected={selectedIds}
              onSelectionChange={handleSelectionChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AgentsTab({
  queue,
  onChange,
}: {
  queue: CallQueue;
  onChange: (u: Partial<CallQueue>) => void;
}) {
  const { members } = useWorkforce();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [skillDraft, setSkillDraft] = useState("");

  const assignedIds = useMemo(
    () => new Set(queue.members.map((m) => m.memberId)),
    [queue.members],
  );

  const assignedGroupIds = useMemo(
    () => new Set(queue.groups.map((g) => g.groupId)),
    [queue.groups],
  );

  const assignedMembers = useMemo(
    () =>
      queue.members
        .map((m) => {
          const workforceMember = members.find((mm) => mm.id === m.memberId);
          return workforceMember ? { workforceMember, tier: m.tier } : null;
        })
        .filter((m): m is { workforceMember: WorkforceMember; tier: QueueAgentTier } => Boolean(m)),
    [queue.members, members],
  );

  const assignedGroups = useMemo(
    () =>
      queue.groups
        .map((g) => {
          const group = ENTRATA_GROUPS.find((eg) => eg.id === g.groupId);
          return group ? { group, tier: g.tier } : null;
        })
        .filter((g): g is { group: EntrataGroup; tier: QueueAgentTier } => Boolean(g)),
    [queue.groups],
  );

  const unassigned = useMemo(() => {
    const list = members.filter((m) => !assignedIds.has(m.id));
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.team.toLowerCase().includes(q) ||
        (m.specialties ?? []).some((s) => s.toLowerCase().includes(q)),
    );
  }, [members, assignedIds, search]);

  const unassignedGroups = useMemo(() => {
    const list = ENTRATA_GROUPS.filter((g) => !assignedGroupIds.has(g.id));
    if (!groupSearch.trim()) return list;
    const q = groupSearch.trim().toLowerCase();
    return list.filter((g) => g.name.toLowerCase().includes(q));
  }, [assignedGroupIds, groupSearch]);

  const assignMember = (id: string) => {
    onChange({
      members: [...queue.members, { memberId: id, tier: "primary" }],
    });
  };

  const removeMember = (id: string) => {
    onChange({ members: queue.members.filter((m) => m.memberId !== id) });
  };

  const setTier = (id: string, tier: QueueAgentTier) => {
    onChange({
      members: queue.members.map((m) =>
        m.memberId === id ? { ...m, tier } : m,
      ),
    });
  };

  const assignGroup = (id: string) => {
    onChange({
      groups: [...queue.groups, { groupId: id, tier: "primary" }],
    });
  };

  const removeGroup = (id: string) => {
    onChange({ groups: queue.groups.filter((g) => g.groupId !== id) });
  };

  const setGroupTier = (id: string, tier: QueueAgentTier) => {
    onChange({
      groups: queue.groups.map((g) =>
        g.groupId === id ? { ...g, tier } : g,
      ),
    });
  };

  const addSkill = () => {
    const s = skillDraft.trim();
    if (!s || queue.skills.includes(s)) {
      setSkillDraft("");
      return;
    }
    onChange({ skills: [...queue.skills, s] });
    setSkillDraft("");
  };

  const removeSkill = (s: string) => {
    onChange({ skills: queue.skills.filter((x) => x !== s) });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold">Skills required</p>
        <p className="mt-1 text-xs text-muted-foreground">
          When the strategy is <em>Skills-based</em>, callers ring the agents whose specialties
          match the most of these tags first. Use short, lowercase tags: <code>spanish</code>,{" "}
          <code>renewals</code>, <code>emergency</code>.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {queue.skills.map((s) => (
            <Badge key={s} variant="outline" className="gap-1">
              {s}
              <button
                type="button"
                onClick={() => removeSkill(s)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                aria-label={`Remove ${s}`}
              >
                <X className="h-2.5 w-2.5" aria-hidden />
              </button>
            </Badge>
          ))}
          {queue.skills.length === 0 && (
            <span className="text-xs text-muted-foreground">No skills — routing falls back to strategy default.</span>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="Add a skill (e.g. Spanish, Renewals, HVAC)"
            className="h-8 text-xs"
          />
          <Button size="sm" variant="outline" onClick={addSkill} disabled={!skillDraft.trim()}>
            Add
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Assigned agents &amp; groups</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Primary agents ring first. Secondaries only ring if all primaries are busy. Backups
              are the last-resort pool (usually AI or leadership). Assign individual agents or an
              Entrata user group (bulk role-based assignment).
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Popover open={groupPickerOpen} onOpenChange={setGroupPickerOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  Add group
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-[320px] p-0">
                <div className="p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Entrata user groups
                  </p>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      placeholder="Search groups by name"
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>
                <div className="max-h-[280px] overflow-y-auto border-t border-border">
                  {unassignedGroups.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">
                      No matching groups left to assign.
                    </p>
                  ) : (
                    <ul>
                      {unassignedGroups.map((g) => (
                        <li key={g.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
                            onClick={() => {
                              assignGroup(g.id);
                              setGroupSearch("");
                            }}
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Users className="h-3.5 w-3.5" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold">{g.name}</p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Assign agent
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-[360px] p-0">
                <div className="p-3">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search agents by name, role, or skill"
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto border-t border-border">
                  {unassigned.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">
                      No matching agents left to assign.
                    </p>
                  ) : (
                    <ul>
                      {unassigned.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/50"
                            onClick={() => {
                              assignMember(m.id);
                              setSearch("");
                            }}
                          >
                            <div
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                                m.type === "agent"
                                  ? "bg-eli-warm-bg text-eli-warm-bg-foreground"
                                  : "bg-primary/10 text-primary",
                              )}
                            >
                              {m.name
                                .split(" ")
                                .map((w) => w[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold">
                                {m.name}
                                {m.type === "agent" && (
                                  <Badge variant="ai" className="ml-1 text-[9px]">
                                    AI
                                  </Badge>
                                )}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {m.role} · {m.team}
                              </p>
                              {(m.specialties?.length ?? 0) > 0 && (
                                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                                  {m.specialties!.slice(0, 3).join(" · ")}
                                </p>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {assignedMembers.length === 0 && assignedGroups.length === 0 && (
            <div className="rounded-md border border-dashed border-border px-3 py-6 text-center">
              <p className="text-xs text-muted-foreground">
                No agents or groups assigned. Add a group for bulk role-based assignment
                (e.g. Leasing Team, Regional Operations) or click <span className="font-medium">Assign agent</span>{" "}
                to pick individuals.
              </p>
            </div>
          )}
          {(["primary", "secondary", "backup"] as QueueAgentTier[]).map((tier) => {
            const tierMembers = assignedMembers.filter((m) => m.tier === tier);
            const tierGroups = assignedGroups.filter((g) => g.tier === tier);
            const total = tierMembers.length + tierGroups.length;
            if (total === 0) return null;
            return (
              <div key={tier}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tier} ({total})
                </p>
                <div className="space-y-1.5">
                  {tierGroups.map((g) => (
                    <GroupRow
                      key={g.group.id}
                      group={g.group}
                      tier={g.tier}
                      onTierChange={(t) => setGroupTier(g.group.id, t)}
                      onRemove={() => removeGroup(g.group.id)}
                    />
                  ))}
                  {tierMembers.map((m) => (
                    <div
                      key={m.workforceMember.id}
                      className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
                    >
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                          m.workforceMember.type === "agent"
                            ? "bg-eli-warm-bg text-eli-warm-bg-foreground"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {m.workforceMember.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">
                          {m.workforceMember.name}
                          {m.workforceMember.type === "agent" && (
                            <Badge variant="ai" className="ml-1 text-[9px]">
                              AI
                            </Badge>
                          )}
                        </p>
                      </div>
                      <Select
                        value={m.tier}
                        onValueChange={(v) => setTier(m.workforceMember.id, v as QueueAgentTier)}
                      >
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primary</SelectItem>
                          <SelectItem value="secondary">Secondary</SelectItem>
                          <SelectItem value="backup">Backup</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember(m.workforceMember.id)}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a single group membership row inside a tier group — visually
 * matches an agent row but uses the Users icon and a "Group · N members"
 * subtitle to signal that it's a bulk role rule rather than an individual.
 */
function GroupRow({
  group,
  tier,
  onTierChange,
  onRemove,
}: {
  group: EntrataGroup;
  tier: QueueAgentTier;
  onTierChange: (t: QueueAgentTier) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/[0.03] px-3 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Users className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">
          {group.name}
          <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
            Group · {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
          </span>
        </p>
      </div>
      <Select value={tier} onValueChange={(v) => onTierChange(v as QueueAgentTier)}>
        <SelectTrigger className="h-7 w-[120px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="primary">Primary</SelectItem>
          <SelectItem value="secondary">Secondary</SelectItem>
          <SelectItem value="backup">Backup</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );
}

function RoutingTab({
  queue,
  onChange,
}: {
  queue: CallQueue;
  onChange: (u: Partial<CallQueue>) => void;
}) {
  const STRATEGIES: QueueRoutingStrategy[] = [
    "longest-idle",
    "round-robin",
    "most-idle",
    "ring-all",
    "skills-based",
    "top-down",
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold">Routing strategy</p>
        <p className="mt-1 text-xs text-muted-foreground">
          How the queue picks which agent to ring next.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {STRATEGIES.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => onChange({ routingStrategy: s })}
              className={cn(
                "rounded-md border p-3 text-left transition-colors",
                queue.routingStrategy === s
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40",
              )}
            >
              <p className="text-xs font-semibold">{strategyLabel(s)}</p>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                {strategyDescription(s)}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ring per agent (seconds)" help="Max ring time before falling to next agent.">
          <Select
            value={String(queue.maxAgentRingSec)}
            onValueChange={(v) => onChange({ maxAgentRingSec: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[15, 20, 25, 30, 40, 45, 60].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} sec
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Max queue wait (seconds)" help="After this, calls fall to the overflow chain.">
          <Select
            value={String(queue.maxWaitSec)}
            onValueChange={(v) => onChange({ maxWaitSec: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[60, 90, 120, 180, 240, 300, 480, 600].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {formatWait(n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="SLA target %" help="Answer this % of calls within the target seconds.">
          <Select
            value={String(queue.slaTargetPct)}
            onValueChange={(v) => onChange({ slaTargetPct: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[60, 70, 75, 80, 85, 90, 95, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="SLA target seconds">
          <Select
            value={String(queue.slaTargetSec)}
            onValueChange={(v) => onChange({ slaTargetSec: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 15, 20, 25, 30, 45, 60].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} sec
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Max callers in queue" help="0 = no cap. Extra callers hit overflow immediately.">
          <Select
            value={String(queue.maxCallersInQueue)}
            onValueChange={(v) => onChange({ maxCallersInQueue: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No cap</SelectItem>
              {[5, 10, 15, 20, 25, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} callers
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="rounded-md border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Callback while waiting</p>
            <p className="mt-1 text-xs text-muted-foreground">
              After the offer-after time, we ask the caller if they&apos;d rather receive a callback.
              They keep their place in the queue — Fonolo/Talkdesk-style virtual hold.
            </p>
          </div>
          <Switch
            checked={queue.callback.enabled}
            onCheckedChange={(v) =>
              onChange({ callback: { ...queue.callback, enabled: v } })
            }
          />
        </div>
        {queue.callback.enabled && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Offer after (seconds)">
              <Select
                value={String(queue.callback.offerAfterSec)}
                onValueChange={(v) =>
                  onChange({
                    callback: { ...queue.callback, offerAfterSec: Number(v) },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[30, 60, 90, 120, 180, 240].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {formatWait(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Max callback attempts">
              <Select
                value={String(queue.callback.maxAttempts)}
                onValueChange={(v) =>
                  onChange({
                    callback: { ...queue.callback, maxAttempts: Number(v) },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "attempt" : "attempts"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}
      </div>

      <div className="rounded-md border border-eli-purple/30 bg-eli-warm-bg p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-eli-warm-bg-foreground">
              AI voice fallback
            </p>
            <p className="mt-1 text-xs text-eli-warm-bg-foreground/80">
              When no human is available inside business hours, hand the call to the Eli voice agent
              instead of dropping to voicemail.
            </p>
          </div>
          <Switch
            variant="eli"
            checked={queue.aiVoiceEnabled}
            onCheckedChange={(v) => onChange({ aiVoiceEnabled: v })}
          />
        </div>
        {queue.aiVoiceEnabled && (
          <div className="mt-3">
            <Field label="AI voice agent">
              <Input
                value={queue.aiVoiceAgentName}
                onChange={(e) => onChange({ aiVoiceAgentName: e.target.value })}
                placeholder="e.g. Eli — Leasing"
                className="bg-background"
              />
            </Field>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Announce position in queue</p>
            <p className="text-xs text-muted-foreground">&quot;You are caller number X in line.&quot;</p>
          </div>
          <Switch
            checked={queue.announcePosition}
            onCheckedChange={(v) => onChange({ announcePosition: v })}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Announce estimated wait time</p>
            <p className="text-xs text-muted-foreground">&quot;Estimated wait time is 2 minutes.&quot;</p>
          </div>
          <Switch
            checked={queue.announceEta}
            onCheckedChange={(v) => onChange({ announceEta: v })}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Whisper queue name to agent</p>
            <p className="text-xs text-muted-foreground">
              Plays the queue name to the agent only, before connecting the caller.
            </p>
          </div>
          <Switch
            checked={queue.whisperEnabled}
            onCheckedChange={(v) => onChange({ whisperEnabled: v })}
          />
        </div>
      </div>
    </div>
  );
}

function HoursTab({
  queue,
  onChange,
}: {
  queue: CallQueue;
  onChange: (u: Partial<CallQueue>) => void;
}) {
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const bh = queue.businessHours;
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayLabel, setHolidayLabel] = useState("");

  const toggleDay = (d: number) => {
    const set = new Set(bh.days);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    onChange({ businessHours: { ...bh, days: Array.from(set).sort((a, b) => a - b) } });
  };

  const addHoliday = () => {
    if (!holidayDate || !holidayLabel) return;
    onChange({
      businessHours: {
        ...bh,
        holidays: [...(bh.holidays ?? []), { date: holidayDate, label: holidayLabel }],
      },
    });
    setHolidayDate("");
    setHolidayLabel("");
  };

  const removeHoliday = (date: string) => {
    onChange({
      businessHours: {
        ...bh,
        holidays: (bh.holidays ?? []).filter((h) => h.date !== date),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold">Business hours</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Days and hours this queue accepts calls. Outside these hours the After-hours action fires.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {DAY_LABELS.map((label, idx) => {
            const active = bh.days.includes(idx);
            return (
              <button
                type="button"
                key={idx}
                onClick={() => toggleDay(idx)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Start time">
            <Input
              type="time"
              value={bh.startTime}
              onChange={(e) => onChange({ businessHours: { ...bh, startTime: e.target.value } })}
            />
          </Field>
          <Field label="End time">
            <Input
              type="time"
              value={bh.endTime}
              onChange={(e) => onChange({ businessHours: { ...bh, endTime: e.target.value } })}
            />
          </Field>
          <Field label="Timezone">
            <Select
              value={bh.timezone}
              onValueChange={(v) => onChange({ businessHours: { ...bh, timezone: v } })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "America/New_York",
                  "America/Chicago",
                  "America/Denver",
                  "America/Phoenix",
                  "America/Los_Angeles",
                  "Pacific/Honolulu",
                ].map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">Holiday exceptions</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Full-day exceptions. On these dates the queue behaves like it&apos;s outside hours.
        </p>
        <div className="mt-3 space-y-1.5">
          {(bh.holidays ?? []).map((h) => (
            <div
              key={h.date}
              className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
            >
              <div className="text-xs">
                <span className="font-semibold">{h.date}</span>
                <span className="ml-2 text-muted-foreground">{h.label}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeHoliday(h.date)}
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" aria-hidden />
              </Button>
            </div>
          ))}
          {(bh.holidays ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">No holidays configured.</p>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="date"
            value={holidayDate}
            onChange={(e) => setHolidayDate(e.target.value)}
            className="h-8 w-[160px] text-xs"
          />
          <Input
            value={holidayLabel}
            onChange={(e) => setHolidayLabel(e.target.value)}
            placeholder="e.g. Thanksgiving"
            className="h-8 flex-1 text-xs"
          />
          <Button size="sm" variant="outline" onClick={addHoliday} disabled={!holidayDate || !holidayLabel}>
            Add
          </Button>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">After-hours action</p>
        <p className="mt-1 text-xs text-muted-foreground">
          What happens to callers who dial in outside business hours.
        </p>
        <div className="mt-3">
          <AfterHoursPicker
            action={queue.afterHoursAction}
            onChange={(action) => onChange({ afterHoursAction: action })}
          />
        </div>
      </div>
    </div>
  );
}

function OverflowTab({
  queue,
  onChange,
}: {
  queue: CallQueue;
  onChange: (u: Partial<CallQueue>) => void;
}) {
  const { queues } = useCallRouting();
  const otherQueues = queues.filter((q) => q.id !== queue.id);

  const addStep = (step: OverflowStep) => {
    onChange({ overflow: [...queue.overflow, step] });
  };

  const removeStep = (idx: number) => {
    onChange({ overflow: queue.overflow.filter((_, i) => i !== idx) });
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const next = [...queue.overflow];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ overflow: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold">Overflow chain</p>
        <p className="mt-1 text-xs text-muted-foreground">
          When a call breaches the max wait time OR the queue is at capacity, we walk this chain in
          order until something answers.
        </p>
        <div className="mt-3 space-y-2">
          {queue.overflow.map((step, idx) => (
            <div
              key={`${step.type}-${idx}`}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                {idx + 1}
              </div>
              <span className="min-w-0 flex-1 truncate text-xs">
                {overflowStepDisplay(step, (id) => queues.find((q) => q.id === id)?.name)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveStep(idx, -1)}
                disabled={idx === 0}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveStep(idx, 1)}
                disabled={idx === queue.overflow.length - 1}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeStep(idx)}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          ))}
          {queue.overflow.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No overflow steps. Calls that time out drop straight to voicemail.
            </p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {otherQueues.map((q) => (
            <Button
              key={q.id}
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => addStep({ type: "queue", queueId: q.id })}
            >
              <ArrowRight className="h-3 w-3" aria-hidden />
              Fall to {q.name}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => addStep({ type: "ai-voice" })}
          >
            <ArrowRight className="h-3 w-3" aria-hidden />
            Fall to AI voice
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => addStep({ type: "voicemail" })}
          >
            <ArrowRight className="h-3 w-3" aria-hidden />
            Fall to voicemail
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() =>
              addStep({
                type: "external",
                phone: "+1 (555) 000-0000",
                label: "External line",
              })
            }
          >
            <ArrowRight className="h-3 w-3" aria-hidden />
            Forward to external number
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Building blocks ─────────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  help,
  children,
}: {
  label: string;
  htmlFor?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {help && (
        <p className="mt-1 flex items-start gap-1 text-[10px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          {help}
        </p>
      )}
    </div>
  );
}

/** Reusable picker for either the queue's after-hours action or a DID's override. */
export function AfterHoursPicker({
  action,
  onChange,
}: {
  action: AfterHoursAction;
  onChange: (next: AfterHoursAction) => void;
}) {
  const { queues } = useCallRouting();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        className={cn(
          "rounded-md border p-3 text-left text-xs transition-colors",
          action.type === "voicemail"
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "border-border hover:border-primary/40",
        )}
        onClick={() => onChange({ type: "voicemail" })}
      >
        <p className="text-sm font-semibold">Voicemail</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Send to the queue&apos;s voicemail box.</p>
      </button>
      <button
        type="button"
        className={cn(
          "rounded-md border p-3 text-left text-xs transition-colors",
          action.type === "ai-voice"
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "border-border hover:border-primary/40",
        )}
        onClick={() => onChange({ type: "ai-voice" })}
      >
        <p className="text-sm font-semibold">AI voice</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Hand to the Eli voice agent.</p>
      </button>
      <div
        className={cn(
          "rounded-md border p-3 text-left text-xs",
          action.type === "queue"
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "border-border hover:border-primary/40",
        )}
      >
        <div className="flex items-center gap-2">
          <Checkbox
            checked={action.type === "queue"}
            onCheckedChange={(v) => {
              if (v)
                onChange({
                  type: "queue",
                  queueId: action.type === "queue" ? action.queueId : queues[0]?.id ?? "",
                });
            }}
          />
          <p className="text-sm font-semibold">Fall to another queue</p>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Great for pointing after-hours residents to the emergency queue.
        </p>
        {action.type === "queue" && (
          <Select
            value={action.queueId}
            onValueChange={(v) => onChange({ type: "queue", queueId: v })}
          >
            <SelectTrigger className="mt-2 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {queues.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  {q.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div
        className={cn(
          "rounded-md border p-3 text-left text-xs",
          action.type === "external"
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "border-border hover:border-primary/40",
        )}
      >
        <div className="flex items-center gap-2">
          <Checkbox
            checked={action.type === "external"}
            onCheckedChange={(v) => {
              if (v)
                onChange({
                  type: "external",
                  phone: action.type === "external" ? action.phone : "",
                  label: action.type === "external" ? action.label : "",
                });
            }}
          />
          <p className="text-sm font-semibold">Forward to external number</p>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Route to an answering service or manager&apos;s cell after hours.
        </p>
        {action.type === "external" && (
          <div className="mt-2 grid gap-2">
            <Input
              value={action.phone}
              onChange={(e) => onChange({ type: "external", phone: e.target.value, label: action.label })}
              placeholder="+1 (555) 000-0000"
              className="h-7 text-xs"
            />
            <Input
              value={action.label ?? ""}
              onChange={(e) => onChange({ type: "external", phone: action.phone, label: e.target.value })}
              placeholder="Answering service"
              className="h-7 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Marker for lint — makes sure re-imported values compile even when unused elsewhere. */
export const _keep = { Check, afterHoursDisplay, daysDisplay };

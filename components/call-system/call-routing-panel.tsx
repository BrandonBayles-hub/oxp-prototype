"use client";

/**
 * Call Routing tab body.
 *
 * Two sections stacked vertically:
 *
 *   1. Inbound number routing — one row per DID. Each row shows the DID
 *      itself, the property it belongs to, whether an IVR menu is
 *      configured, and the fallback queue. Clicking a row opens the
 *      DID/IVR editor sheet (see `RouteEditSheet` below), where an
 *      operator builds the IVR tree (press 1 → queue X, press 2 → …),
 *      chooses a default queue, and sets an optional after-hours
 *      override.
 *
 *   2. Priority rules — cross-cutting rules that either jump a caller to
 *      the front of the queue (VIP, repeat caller) or override queue
 *      selection entirely (emergency keywords → after-hours emergency
 *      queue). Rules fire in weight order.
 *
 * Together these two sections describe "what happens when the phone
 * rings" before the queue ever sees the caller — the inverse of the
 * Call Queue tab which owns "what happens once the queue picks up".
 */

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building,
  ChevronRight,
  Phone,
  PhoneCall,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ALL_PROPERTIES,
  ivrActionDisplay,
  useCallRouting,
  type CallRoute,
  type IvrAction,
  type IvrOption,
  type PriorityRule,
} from "@/lib/call-routing-context";
import { AfterHoursPicker } from "./call-queue-panel";

// ─── Top-level panel ──────────────────────────────────────────────────────

export function CallRoutingPanel() {
  const {
    routes,
    queues,
    updateRoute,
    deleteRoute,
    createRoute,
    priorityRules,
    togglePriorityRule,
    updatePriorityRule,
  } = useCallRouting();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = routes.find((r) => r.id === editingId) ?? null;

  return (
    <div className="max-w-5xl space-y-8">
      {/* ─── Inbound number routing ─── */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Inbound number routing</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Every DID your properties own maps to an IVR menu and a fallback queue. Callers who
              dial one of these numbers hear the greeting, pick a menu option, and are routed to
              the matching queue.
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => {
              const created = createRoute({
                did: "",
                label: "New number",
                property: ALL_PROPERTIES,
                greeting: "",
                ivrMenu: [],
                defaultQueueId: queues[queues.length - 1]?.id ?? "",
              });
              setEditingId(created.id);
            }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add number
          </Button>
        </div>

        <div className="mt-4 rounded-lg border border-border">
          <div className="hidden grid-cols-[1fr_180px_120px_1fr_60px] items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <div>DID · Label</div>
            <div>Property</div>
            <div>Menu</div>
            <div>Default queue</div>
            <div className="text-right">Status</div>
          </div>
          <ul>
            {routes.map((route) => (
              <li key={route.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setEditingId(route.id)}
                  className="grid w-full grid-cols-[1fr_180px_120px_1fr_60px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{route.label}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {route.did || <em>No number yet</em>}
                    </p>
                  </div>
                  <div className="min-w-0">
                    {route.property === ALL_PROPERTIES ? (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Building className="h-3 w-3" aria-hidden />
                        All
                      </Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-foreground">
                        <Building className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">{route.property}</span>
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 text-xs">
                    {route.ivrMenu.length === 0 ? (
                      <span className="text-muted-foreground">Direct</span>
                    ) : (
                      <span className="text-foreground">
                        {route.ivrMenu.length} option{route.ivrMenu.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 text-xs">
                    <span className="truncate text-foreground">
                      {queues.find((q) => q.id === route.defaultQueueId)?.name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {route.enabled ? (
                      <Badge variant="green" className="text-[10px]">
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="gray" className="text-[10px]">
                        Off
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                </button>
              </li>
            ))}
            {routes.length === 0 && (
              <li className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No inbound numbers configured yet.
                </p>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* ─── Priority rules ─── */}
      <div>
        <h3 className="text-base font-semibold">Priority routing rules</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-cutting rules that fire before the queue accepts a call. They either boost a caller
          to the front of the queue, override queue selection entirely, or skip the IVR menu. Rules
          fire top-to-bottom by weight.
        </p>
        <div className="mt-4 space-y-2">
          {priorityRules
            .slice()
            .sort((a, b) => b.weight - a.weight)
            .map((rule) => (
              <PriorityRuleRow
                key={rule.id}
                rule={rule}
                onToggle={() => togglePriorityRule(rule.id)}
                onChange={(u) => updatePriorityRule(rule.id, u)}
              />
            ))}
        </div>
      </div>

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
          {editing && (
            <RouteEditSheet
              route={editing}
              onClose={() => setEditingId(null)}
              onChange={(u) => updateRoute(editing.id, u)}
              onDelete={() => {
                deleteRoute(editing.id);
                setEditingId(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Priority rule row ────────────────────────────────────────────────────

function PriorityRuleRow({
  rule,
  onToggle,
  onChange,
}: {
  rule: PriorityRule;
  onToggle: () => void;
  onChange: (u: Partial<PriorityRule>) => void;
}) {
  const { queues } = useCallRouting();

  const conditionCopy = useMemo(() => {
    switch (rule.condition.type) {
      case "vip":
        return "Caller has VIP flag on their profile";
      case "repeat-caller":
        return `Caller has ${rule.condition.minCalls}+ calls in the last ${rule.condition.withinHours}h`;
      case "emergency-keyword":
        return `Caller says any of: ${rule.condition.keywords.slice(0, 4).join(", ")}${
          rule.condition.keywords.length > 4 ? `, +${rule.condition.keywords.length - 4}` : ""
        }`;
      case "lead-source":
        return `Caller lead source is ${rule.condition.source}`;
      case "current-resident":
        return "Caller is a current resident";
      case "language":
        return `Caller language = ${rule.condition.code.toUpperCase()}`;
    }
  }, [rule.condition]);

  const actionCopy = useMemo(() => {
    // Narrow via a local so TS refines the shape inside each case; touching
    // `rule.action.queueId` twice on the union member loses the narrowing.
    const action = rule.action;
    switch (action.type) {
      case "boost-priority":
        return action.queueId
          ? `Boost to front of ${queues.find((q) => q.id === action.queueId)?.name ?? "queue"}`
          : "Boost to front of matched queue";
      case "route-to-queue":
        return `Route to ${queues.find((q) => q.id === action.queueId)?.name ?? "queue"}`;
      case "skip-ivr":
        return "Skip the IVR menu";
    }
  }, [rule.action, queues]);

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2.5 transition-colors",
        rule.enabled ? "border-border bg-background" : "border-border bg-muted/20 opacity-70",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{rule.label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="secondary" className="text-[10px]">
              IF
            </Badge>
            <span>{conditionCopy}</span>
            <ArrowRight className="h-3 w-3" aria-hidden />
            <Badge variant="outline" className="text-[10px]">
              THEN
            </Badge>
            <span>{actionCopy}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Weight</span>
          <Input
            type="number"
            min={0}
            max={999}
            value={rule.weight}
            onChange={(e) => onChange({ weight: Number(e.target.value) })}
            className="h-7 w-[64px] text-center text-xs"
          />
          <Switch checked={rule.enabled} onCheckedChange={onToggle} />
        </div>
      </div>
    </div>
  );
}

// ─── Route (DID) edit sheet ──────────────────────────────────────────────

function RouteEditSheet({
  route,
  onClose,
  onChange,
  onDelete,
}: {
  route: CallRoute;
  onClose: () => void;
  onChange: (u: Partial<CallRoute>) => void;
  onDelete: () => void;
}) {
  const { queues } = useCallRouting();

  const addIvrOption = () => {
    const usedDigits = new Set(route.ivrMenu.map((o) => o.dtmf));
    const nextDigit = (["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const).find(
      (d) => !usedDigits.has(d),
    );
    if (!nextDigit) return;
    onChange({
      ivrMenu: [
        ...route.ivrMenu,
        {
          dtmf: nextDigit,
          label: `Option ${nextDigit}`,
          action: { type: "queue", queueId: queues[queues.length - 1]?.id ?? "" },
        },
      ],
    });
  };

  const updateIvrOption = (idx: number, patch: Partial<IvrOption>) => {
    onChange({
      ivrMenu: route.ivrMenu.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    });
  };

  const removeIvrOption = (idx: number) => {
    onChange({ ivrMenu: route.ivrMenu.filter((_, i) => i !== idx) });
  };

  const moveIvrOption = (idx: number, dir: -1 | 1) => {
    const next = [...route.ivrMenu];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ ivrMenu: next });
  };

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="shrink-0 border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SheetTitle className="truncate text-lg">
              <PhoneCall className="mr-2 inline h-5 w-5 text-primary" aria-hidden />
              {route.label || "Untitled route"}
            </SheetTitle>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{route.did || "No DID"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={route.enabled} onCheckedChange={(v) => onChange({ enabled: v })} />
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Label" htmlFor="r-label">
            <Input
              id="r-label"
              value={route.label}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </Field>
          <Field label="DID (dialed number)" htmlFor="r-did">
            <Input
              id="r-did"
              value={route.did}
              onChange={(e) => onChange({ did: e.target.value })}
              placeholder="+1 (801) 555-0100"
              className="font-mono"
            />
          </Field>
          <Field label="Property">
            <Select
              value={route.property}
              onValueChange={(v) => onChange({ property: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROPERTIES}>All properties</SelectItem>
                {[
                  "Hillside Living",
                  "Jamison Apartments",
                  "Property C",
                  "Ocean View",
                  "Beach Front",
                  "Peak View",
                  "Mountain Vista",
                ].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Language">
            <Select
              value={route.language}
              onValueChange={(v) => onChange({ language: v as "en" | "es" | "multi" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="multi">Multi-language menu</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Greeting" help="Played once before the IVR menu starts. Keep it under 8s.">
          <textarea
            value={route.greeting}
            onChange={(e) => onChange({ greeting: e.target.value })}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Field>

        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">IVR menu</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Press-N destinations. Leave empty for a direct-dial line that skips the menu.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={addIvrOption}
              disabled={route.ivrMenu.length >= 10}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add option
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {route.ivrMenu.map((opt, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[52px_1fr_1fr_auto] items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
              >
                <Select
                  value={opt.dtmf}
                  onValueChange={(v) => updateIvrOption(idx, { dtmf: v as IvrOption["dtmf"] })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const).map((d) => (
                      <SelectItem key={d} value={d}>
                        Press {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={opt.label}
                  onChange={(e) => updateIvrOption(idx, { label: e.target.value })}
                  placeholder="Menu label"
                  className="h-8 text-xs"
                />
                <IvrActionSelect
                  action={opt.action}
                  onChange={(action) => updateIvrOption(idx, { action })}
                />
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveIvrOption(idx, -1)} disabled={idx === 0}>
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveIvrOption(idx, 1)}
                    disabled={idx === route.ivrMenu.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeIvrOption(idx)}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
            {route.ivrMenu.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No IVR options. Calls will fall straight to the default queue below.
              </p>
            )}
          </div>
        </div>

        <Field
          label="Default queue"
          help="Where calls land if they don't pick a menu option (or if there is no menu)."
        >
          <Select
            value={route.defaultQueueId}
            onValueChange={(v) => onChange({ defaultQueueId: v })}
          >
            <SelectTrigger>
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
        </Field>

        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">After-hours override</p>
              <p className="mt-1 text-xs text-muted-foreground">
                By default we use the target queue&apos;s after-hours action. Override here to route
                after-hours calls on this DID somewhere else — most common use case is pointing the
                main line to the After-Hours Emergency queue.
              </p>
            </div>
            <Switch
              checked={!!route.afterHoursOverride}
              onCheckedChange={(v) => {
                onChange({
                  afterHoursOverride: v ? { type: "queue", queueId: queues[0]?.id ?? "" } : undefined,
                });
              }}
            />
          </div>
          {route.afterHoursOverride && (
            <div className="mt-3">
              <AfterHoursPicker
                action={route.afterHoursOverride}
                onChange={(action) => onChange({ afterHoursOverride: action })}
              />
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete number
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

function IvrActionSelect({
  action,
  onChange,
}: {
  action: IvrAction;
  onChange: (action: IvrAction) => void;
}) {
  const { queues } = useCallRouting();

  const currentValue: string = (() => {
    switch (action.type) {
      case "queue":
        return `queue:${action.queueId}`;
      case "voicemail":
        return "voicemail";
      case "ai-voice":
        return "ai-voice";
      case "submenu":
        return "submenu";
      case "external":
        return "external";
    }
  })();

  const handleChange = (v: string) => {
    if (v.startsWith("queue:")) {
      onChange({ type: "queue", queueId: v.slice("queue:".length) });
    } else if (v === "voicemail") {
      onChange({ type: "voicemail" });
    } else if (v === "ai-voice") {
      onChange({ type: "ai-voice", agentName: "Eli — Voice" });
    } else if (v === "submenu") {
      onChange({ type: "submenu", menuId: "" });
    } else if (v === "external") {
      onChange({ type: "external", phone: "" });
    }
  };

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue>
          <span className="truncate text-xs">
            {ivrActionDisplay(action, (id) => queues.find((q) => q.id === id)?.name)}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Queues
        </div>
        {queues.map((q) => (
          <SelectItem key={q.id} value={`queue:${q.id}`}>
            {q.name}
          </SelectItem>
        ))}
        <div className="mt-1 border-t border-border px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Other
        </div>
        <SelectItem value="ai-voice">AI voice agent</SelectItem>
        <SelectItem value="voicemail">Voicemail</SelectItem>
        <SelectItem value="external">Forward to external number</SelectItem>
      </SelectContent>
    </Select>
  );
}

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
      {help && <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{help}</p>}
    </div>
  );
}

/** Marker for lint. */
export const _keep = { Phone };

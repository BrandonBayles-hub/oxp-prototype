"use client";

/* ───────────────────────────────────────────────────────────────────────────
   Setup Wizard 2.0 — framework prototype.

   Synthesizes feedback from:
   - #setup-wizard Slack channel (Hyrum, Paige, Valerie, Brandon)
   - Hyrum's onboarding feedback transcript (2026-04-29)
   - Paige's prototype feedback transcript (2026-04-28)
   - Brandon's strategic guidance (chaos control, two buckets, receipts,
     MVP = Add-On with ACH/Banking via Plaid)

   Real data wires in later. This file orchestrates; logic lives in
   components/, types/, and data.ts.
   ─────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { DemoControls } from "./components/DemoControls";
import { TaskDrawer, type ConfirmedPropertyData, type DrawerSimState } from "./components/TaskDrawer";
import { PropertyCard, PropertyCardSkeleton } from "./components/PropertyCard";
import { PropertyReceiptsSheet } from "./components/PropertyReceiptsSheet";
import { QueueRow, affectedFor, isItemDone } from "./components/QueueRow";
import {
  CUSTOMER,
  PROPERTIES_ADD_ON,
  PROPERTIES_NEW_LOGO,
  QUEUE_ADD_ON,
  QUEUE_NEW_LOGO,
} from "./data";
import type {
  Bucket,
  CustomerView,
  Property,
  PrototypeVersion,
  QueueItem,
  SimulateState,
  Urgency,
} from "./types";

/** Queue item IDs visible per version. Each version is a superset of the prior. */
const VERSION_QUEUE_IDS: Record<PrototypeVersion, string[]> = {
  v1: ["confirm-migration", "pick-template-addon", "plaid-banking"],
  "v1.1": [
    "confirm-migration",
    "pick-template-addon",
    "plaid-banking",
    "schedule-takeover",
    "confirm-occupancy",
    "il-compliance",
  ],
  "v1.2": [
    "confirm-migration",
    "pick-template-addon",
    "plaid-banking",
    "schedule-takeover",
    "confirm-occupancy",
    "il-compliance",
    "review-deltas",
    "notd-accounting",
  ],
  "v1.3": [], // empty = show all
};

const URGENCY_RANK: Record<Urgency, number> = {
  now: 0,
  soon: 1,
  later: 2,
};

export default function SetupWizardPage() {
  const [bucket, setBucket] = useState<Bucket>("add-on");
  const [view, setView] = useState<CustomerView>("customer");
  const [devMode, setDevMode] = useState(false);
  const [simulateState, setSimulateState] = useState<SimulateState>("normal");
  const [version, setVersion] = useState<PrototypeVersion>("v1");
  const [drawerState, setDrawerState] = useState<DrawerSimState>("normal");
  const [openProperty, setOpenProperty] = useState<Property | null>(null);
  const [openTask, setOpenTask] = useState<QueueItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(true);

  // Confirmed property data flows back from the drawer on completion.
  const [confirmedOverrides, setConfirmedOverrides] = useState<Record<string, ConfirmedPropertyData>>({});

  // Runtime completion overrides — maps queue item IDs to additional completed property IDs.
  // Lets the confirm drawer mark queue items done without touching static mock data.
  const [queueCompletions, setQueueCompletions] = useState<Record<string, string[]>>({});

  // Persisted field state for the confirm drawer — preserves progress between opens.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [confirmFieldState, setConfirmFieldState] = useState<any>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const baseQueue = bucket === "new-logo" ? QUEUE_NEW_LOGO : QUEUE_ADD_ON;
  const baseProperties =
    bucket === "new-logo" ? PROPERTIES_NEW_LOGO : PROPERTIES_ADD_ON;

  // Merge confirmed overrides — updates migration type, confirmed flag, and state_label
  const properties = simulateState === "empty"
    ? []
    : baseProperties.map((p) => {
        const override = confirmedOverrides[p.id];
        if (!override) return p;
        return {
          ...p,
          migrationConfirmed: override.migrationConfirmed,
          migrationType: override.migrationType as Property["migrationType"],
          // Promote "Just added" to "Configuring" once type is confirmed
          state_label: p.state_label === "Just added" ? ("Configuring" as const) : p.state_label,
        };
      });

  const filteredQueue = useMemo(() => {
    if (simulateState === "empty") return [];
    const allowedIds = VERSION_QUEUE_IDS[version];
    const base = allowedIds.length === 0 ? baseQueue : baseQueue.filter((q) => allowedIds.includes(q.id));
    // Merge runtime completions so queue items reflect drawer confirmations
    return base.map((q) => {
      const extra = queueCompletions[q.id];
      if (!extra || extra.length === 0) return q;
      const merged = [...new Set([...(q.completedIds ?? []), ...extra])];
      return { ...q, completedIds: merged };
    });
  }, [simulateState, version, baseQueue, queueCompletions]);

  const queue = filteredQueue;

  const headline = useMemo(() => {
    if (bucket === "new-logo") {
      return `Welcome, ${CUSTOMER.name}. Let's get your first property live.`;
    }
    return `Welcome back, ${CUSTOMER.name}.`;
  }, [bucket]);

  const isLoading = simulateState === "loading";
  const isError = simulateState === "error";
  const isEmpty = simulateState === "empty";

  return (
    <>
      <PageHeader
        title="Setup Wizard"
        description="Guided setup for new logo and add-on properties — pre-filled, reviewable, and live in minutes."
        actions={
          <DemoControls
            bucket={bucket}
            setBucket={setBucket}
            view={view}
            setView={setView}
            devMode={devMode}
            setDevMode={setDevMode}
            simulateState={simulateState}
            setSimulateState={setSimulateState}
            version={version}
            setVersion={setVersion}
            drawerState={drawerState}
            setDrawerState={setDrawerState}
          />
        }
      />

      {/* Toast — premium dark banner, top-center, auto-dismisses after 4s */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-20 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-3 duration-300"
        >
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 shadow-2xl shadow-black/30">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{toast.split(" · ")[0]}</p>
              {toast.includes(" · ") && (
                <p className="text-xs text-white/50">{toast.split(" · ")[1]}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isError ? (
        <ErrorState onRetry={() => setSimulateState("normal")} />
      ) : (
        <>
          <WelcomeCard
            headline={headline}
            properties={properties}
            isLoading={isLoading}
            isEmpty={isEmpty}
            onOpenProperty={setOpenProperty}
          />

          <OnYourPlate
            queue={queue}
            properties={properties}
            isLoading={isLoading}
            isEmpty={isEmpty}
            showOnlyIncomplete={showOnlyIncomplete}
            setShowOnlyIncomplete={setShowOnlyIncomplete}
            onStartTask={setOpenTask}
          />

          {/* ActivationCard (Go-Live) deferred to future version */}

          <ContextRail bucket={bucket} view={view} devMode={devMode} version={version} />
        </>
      )}

      <PropertyReceiptsSheet
        property={openProperty}
        bucket={bucket}
        onClose={() => setOpenProperty(null)}
      />

      <TaskDrawer
        task={openTask}
        onClose={() => setOpenTask(null)}
        drawerState={drawerState}
        onComplete={(taskTitle) => {
          if (taskTitle === "Confirm Property Type & Date") {
            // confirm-migration fires its toast via onConfirmProperties — skip here
          } else if (taskTitle === "Pick Settings Template") {
            // Mark all properties done for this cohort task
            const propertyIds = properties.map((p) => p.id);
            setQueueCompletions((prev) => ({
              ...prev,
              "pick-template-addon": propertyIds,
            }));
            showToast("Pick Settings Template complete · moved to completed section");
          } else {
            showToast(`${taskTitle} complete · moved to completed section`);
          }
        }}
        onConfirmProperties={(data) => {
          setConfirmedOverrides((prev) => ({ ...prev, ...data }));
          // Mark confirm-migration as complete for all newly confirmed properties
          const newIds = Object.keys(data).filter((id) => data[id].migrationConfirmed);
          setQueueCompletions((prev) => ({
            ...prev,
            "confirm-migration": [...new Set([...(prev["confirm-migration"] ?? []), ...newIds])],
          }));
          showToast("Confirm Property Type & Date complete · moved to completed section");
        }}
        savedFieldState={confirmFieldState}
        onSaveFieldState={setConfirmFieldState}
      />
    </>
  );
}

/* ─── Welcome card ─────────────────────────────────────────────────────── */

function WelcomeCard({
  headline,
  properties,
  isLoading,
  isEmpty,
  onOpenProperty,
}: {
  headline: string;
  properties: Property[];
  isLoading: boolean;
  isEmpty: boolean;
  onOpenProperty: (p: Property) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  /* Roll-up stats for the collapsed header */
  const stats = useMemo(() => {
    const ready = properties.filter((p) => p.progress >= 100).length;
    const inProgress = properties.filter(
      (p) => p.progress > 0 && p.progress < 100,
    ).length;
    const unconfirmed = properties.filter((p) => !p.migrationConfirmed).length;
    return { total: properties.length, ready, inProgress, unconfirmed };
  }, [properties]);

  /* Priority sort: unconfirmed first (highest urgency), then lowest progress
     first (most work remaining). Matches left-to-right reading order so
     the most important cards are always top-left. */
  const sortedProperties = useMemo(
    () =>
      [...properties].sort((a, b) => {
        if (!a.migrationConfirmed && b.migrationConfirmed) return -1;
        if (a.migrationConfirmed && !b.migrationConfirmed) return 1;
        return a.progress - b.progress;
      }),
    [properties],
  );

  return (
    <Card className="mb-4 max-w-6xl">
      <CardContent className="py-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="welcome-properties"
          className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-none"
        >
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold text-foreground">
              {headline}
            </h2>
            {!isEmpty && !isLoading && (
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">
                    {stats.total}
                  </span>{" "}
                  properties
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <span className="font-semibold text-emerald-700">
                    {stats.ready}
                  </span>{" "}
                  ready
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <span className="font-semibold text-foreground">
                    {stats.inProgress}
                  </span>{" "}
                  in progress
                </span>
                {stats.unconfirmed > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-800">
                      <span className="font-semibold">
                        {stats.unconfirmed}
                      </span>{" "}
                      need confirmation
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>

        {expanded && (
          <div
            id="welcome-properties"
            className="mt-3 max-h-[26rem] overflow-y-auto pr-1"
            aria-busy={isLoading}
          >
            <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <PropertyCardSkeleton key={i} />
                  ))
                : isEmpty
                  ? null
                  : sortedProperties.map((p) => (
                      <PropertyCard
                        key={p.id}
                        property={p}
                        onOpen={onOpenProperty}
                      />
                    ))}
            </div>

            {isEmpty && <EmptyPropertiesState />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyPropertiesState() {
  return (
    <div className="mt-2 flex flex-col items-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Sparkles
          className="h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">
        No properties on this contract yet
      </p>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">
        The wizard wakes up the moment a contract + SKU lands. As soon as
        properties are attached, they&apos;ll appear here automatically — no
        manual kickoff needed.
      </p>
    </div>
  );
}

/* ─── On your plate ────────────────────────────────────────────────────── */

function OnYourPlate({
  queue,
  properties,
  isLoading,
  isEmpty,
  showOnlyIncomplete,
  setShowOnlyIncomplete,
  onStartTask,
}: {
  queue: QueueItem[];
  properties: Property[];
  isLoading: boolean;
  isEmpty: boolean;
  showOnlyIncomplete: boolean;
  setShowOnlyIncomplete: (v: boolean) => void;
  onStartTask: (task: QueueItem) => void;
}) {
  if (isLoading) {
    return (
      <Card className="mb-6 max-w-6xl">
        <CardContent className="py-4">
          <div className="space-y-3" aria-busy="true">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted/70" />
            <div className="space-y-2 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 w-full animate-pulse rounded-lg bg-muted/60"
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty || queue.length === 0) {
    return (
      <Card className="mb-6 max-w-6xl">
        <CardContent className="py-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <Sparkles
                className="h-5 w-5 text-emerald-600"
                aria-hidden="true"
              />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">
              Nothing on your plate yet
            </p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Tasks appear here when the wizard needs your input. Right now,
              everything we know is auto-applied — open any property to review
              the receipts.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isDone = (q: QueueItem) => isItemDone(q, properties);

  /* One flat list: blocking item first, then urgency-sorted active tasks.
     Completed tasks are separated out — collapsed at the bottom. */
  const allSorted = [
    ...queue.filter((q) => q.id === "confirm-migration"),
    ...queue
      .filter((q) => q.id !== "confirm-migration")
      .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]),
  ];

  const activeTasks = allSorted.filter((q) => !isDone(q));
  const completedTasks = allSorted.filter((q) => isDone(q));
  const visibleActive = showOnlyIncomplete ? activeTasks : allSorted;

  const totalActions = queue.length;
  const completedActions = completedTasks.length;

  return (
    <Card className="mb-6 max-w-6xl">
      <CardContent className="py-4">
        {/* Header — progress fraction + toggle */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            On your plate{" "}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {completedActions} of {totalActions} done
            </span>
          </p>
          {/* Segmented toggle — clear visual state, no ambiguity */}
          <div
            role="group"
            aria-label="Task view"
            className="flex shrink-0 rounded-full border border-border bg-muted/40 p-0.5 text-xs"
          >
            {[
              { label: "Action items", value: true },
              { label: "Show all", value: false },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setShowOnlyIncomplete(opt.value)}
                aria-pressed={showOnlyIncomplete === opt.value}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition-all",
                  showOnlyIncomplete === opt.value
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flat task list */}
        {visibleActive.length > 0 ? (
          <div className="space-y-2">
            {visibleActive.map((item) => (
              <QueueRow
                key={item.id}
                item={item}
                properties={properties}
                isBlocking={item.id === "confirm-migration"}
                onStart={() => onStartTask(item)}
                comingSoon={item.id === "plaid-banking"}
              />
            ))}
          </div>
        ) : (
          <p
            role="status"
            aria-live="polite"
            className="rounded-lg border border-emerald-500/30 bg-emerald-50/40 p-3 text-xs text-emerald-800"
          >
            Everything on your plate is done. Hit Go-Live when you&apos;re ready.
          </p>
        )}

        {/* Collapsed completed tasks — always at bottom, expandable */}
        {completedTasks.length > 0 && showOnlyIncomplete && (
          <details className="mt-3 group">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <span className="transition-transform group-open:rotate-90">▸</span>
              {completedTasks.length} completed{" "}
              {completedTasks.length === 1 ? "task" : "tasks"}
            </summary>
            <div className="mt-2 space-y-2">
              {completedTasks.map((item) => (
                <QueueRow
                  key={item.id}
                  item={item}
                  properties={properties}
                  onStart={() => onStartTask(item)}
                />
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Right rail: internal + dev panels ────────────────────────────────── */

function ContextRail({
  bucket,
  view,
  devMode,
  version,
}: {
  bucket: Bucket;
  view: CustomerView;
  devMode: boolean;
  version: PrototypeVersion;
}) {
  if (view !== "internal" && !devMode) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-12">
        {view === "internal" && version !== "v1" && (
          <Card className="max-w-6xl">
            <CardContent className="py-4">
              <div className="mb-2 flex items-center gap-2">
                <Lightbulb
                  className="h-4 w-4 text-amber-600"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold text-foreground">
                  Internal-only revenue impact
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Per Valerie: don&apos;t expose ARR ticker to customers on the
                main dashboard. Use this internal-only view (or a contextual
                callout next to revenue-share products like Rent Reporting) to
                drive urgency.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Revenue waiting" value="$1,450,000.00" />
                <Stat label="Days to first live" value="30d target" />
                <Stat label="Bucket" value={bucket === "new-logo" ? "New Logo" : "Add-On"} />
                <Stat label="Properties in flight" value="12" />
              </div>
            </CardContent>
          </Card>
        )}

        {devMode && (
          <Card className="max-w-6xl">
            <CardContent className="py-4">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck
                  className="h-4 w-4 text-foreground"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold text-foreground">
                  Phased release scope
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Tags on every panel show which release each piece ships in.
                Toggle Dev view off to hide.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  {
                    tag: "P1",
                    title: "MVP",
                    scope:
                      "Add-On bucket, banking via Plaid, receipts, queue, single phase tracker.",
                  },
                  {
                    tag: "P2",
                    title: "Phase 2",
                    scope:
                      "New Logo bucket templates, shell preview, vertical mismatch flag, deltas review.",
                  },
                  {
                    tag: "P3",
                    title: "Phase 3",
                    scope:
                      "Outcomes validation, post-go-live telemetry, training environments, Aria deep skills.",
                  },
                ].map((p) => (
                  <div
                    key={p.tag}
                    className="rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {p.tag}
                      </Badge>
                      <p className="text-xs font-semibold text-foreground">
                        {p.title}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.scope}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

/* ─── Error state ──────────────────────────────────────────────────────── */

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="mb-6 max-w-6xl">
      <CardContent className="py-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">
            We couldn&apos;t pull your contract data
          </p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            One or more upstream sources (Yardi, your website, HRIS) is
            unreachable. We&apos;ll keep retrying in the background — you can
            also retry manually.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={onRetry}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Retry now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ExternalLink,
  LayoutGrid,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import type { QueueItem } from "../types";

export type ConfirmedPropertyData = {
  migrationConfirmed: boolean;
  migrationType: string;
};

export type DrawerSimState = "normal" | "loading" | "error";

type Props = {
  task: QueueItem | null;
  onClose: () => void;
  onComplete: (taskTitle: string) => void;
  /** Called when Confirm Property Type & Date completes successfully. */
  onConfirmProperties?: (data: Record<string, ConfirmedPropertyData>) => void;
  /** Persisted field state so the drawer resumes from the first incomplete step. */
  savedFieldState?: FieldState | null;
  onSaveFieldState?: (state: FieldState) => void;
  drawerState?: DrawerSimState;
};

/* ─── Shared Sheet wrapper ───────────────────────────────────────────────── */

/* ─── Drawer loading + error states ─────────────────────────────────────── */

function DrawerLoadingState({ onClose }: { onClose: () => void }) {
  return (
    <>
      <DrawerHeader progress="Loading…" onClose={onClose} />
      <div className="flex flex-1 flex-col gap-4 px-8 py-8">
        <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted/70" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      </div>
      <DrawerFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" disabled className="opacity-40">Loading…</Button>
      </DrawerFooter>
    </>
  );
}

function DrawerErrorState({ onClose }: { onClose: () => void }) {
  return (
    <>
      <DrawerHeader progress="Unable to load" onClose={onClose} />
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">
          Couldn't load this step
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          We couldn't pull the data needed for this task. Check your connection and try again — your progress is saved.
        </p>
        <Button size="sm" variant="outline" className="mt-5" onClick={onClose}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Retry
        </Button>
      </div>
      <DrawerFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
      </DrawerFooter>
    </>
  );
}

export function TaskDrawer({
  task,
  onClose,
  onComplete,
  onConfirmProperties,
  savedFieldState,
  onSaveFieldState,
  drawerState = "normal",
}: Props) {
  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col bg-white p-0 sm:max-w-2xl [&>button]:hidden"
      >
        {task && drawerState === "loading" && <DrawerLoadingState onClose={onClose} />}
        {task && drawerState === "error" && <DrawerErrorState onClose={onClose} />}
        {task && drawerState === "normal" && (
          <DrawerBody
            task={task}
            onClose={onClose}
            onComplete={onComplete}
            onConfirmProperties={onConfirmProperties}
            savedFieldState={savedFieldState}
            onSaveFieldState={onSaveFieldState}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({
  task,
  onClose,
  onComplete,
  onConfirmProperties,
  savedFieldState,
  onSaveFieldState,
}: {
  task: QueueItem;
  onClose: () => void;
  onComplete: (t: string) => void;
  onConfirmProperties?: (data: Record<string, ConfirmedPropertyData>) => void;
  savedFieldState?: FieldState | null;
  onSaveFieldState?: (state: FieldState) => void;
}) {
  if (task.id === "confirm-migration")
    return (
      <ConfirmMigrationDrawer
        task={task}
        onClose={onClose}
        onComplete={onComplete}
        onConfirmProperties={onConfirmProperties}
        savedFieldState={savedFieldState}
        onSaveFieldState={onSaveFieldState}
      />
    );
  if (task.id === "pick-template-addon")
    return <PickTemplateDrawer task={task} onClose={onClose} onComplete={onComplete} />;
  if (task.id === "plaid-banking")
    return <ConnectBankingDrawer task={task} onClose={onClose} onComplete={onComplete} />;
  return <GenericDrawer task={task} onClose={onClose} onComplete={onComplete} />;
}

/* ─── Shared chrome ──────────────────────────────────────────────────────── */

function DrawerHeader({ progress, title, onClose }: { progress: string; title?: string; onClose: () => void }) {
  return (
    <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div>
          {title && (
            <SheetTitle className="text-base font-semibold text-foreground">
              {title}
            </SheetTitle>
          )}
          <p className={cn("text-xs text-muted-foreground", title ? "mt-1" : "text-sm font-medium")}>
            {progress}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </SheetHeader>
  );
}

function DrawerFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 border-t border-border px-6 py-4">
      <div className="flex items-center justify-between gap-3">{children}</div>
    </div>
  );
}

/* ─── Confirm Property Type & Date — isolated field stepper ─────────────── */

const UNCONFIRMED = [
  {
    id: "ap3",
    name: "Aspen Trail",
    city: "Chicago",
    state: "IL",
    units: 246,
    products: [
      "Entrata Core", "Lease Execution", "ResidentPay", "Bill Pay",
      "Utility Billing", "Maintenance", "Leasing AI", "Payments AI",
      "Renewals AI", "Website", "Online Applications", "Screening",
      "Rent Reporting", "ILS Integration", "10DLC Compliance",
      "Lease Templates", "Inspection", "Academy Elite",
    ],
    contractDate: "May 1, 2026",
    newLocale: "Illinois",
  },
  {
    id: "ap4",
    name: "Pine Ridge",
    city: "Sacramento",
    state: "CA",
    units: 192,
    products: ["Entrata Core", "Lease Execution", "ResidentPay"],
    contractDate: "May 1, 2026",
    newLocale: null,
  },
];

const MIGRATION_TYPES = [
  { id: "standard", label: "Standard", description: "Standard add-on flow." },
  { id: "takeover", label: "Takeover", description: "Pre-configure now, activate at legal close." },
  { id: "notd", label: "NOTD", description: "Accounting reset — operations carry over." },
  { id: "lease-up", label: "Lease-Up", description: "Resident setup held until occupancy date." },
  { id: "acquisition", label: "Acquisition", description: "Copy from prior environment via E-form." },
];

type FieldState = {
  correctedUnits: Record<string, string>;
  unitStatus: Record<string, "pending" | "correct" | "corrected">;
  productStatus: Record<string, "pending" | "correct" | "flagged">;
  migrationType: Record<string, string>;
  anchorDate: Record<string, string>;
  anchorStatus: Record<string, "pending" | "set" | "deferred">;
};

/* Celebration overlay — shown for 650ms after any field is confirmed.
   The motion IS the advance — no separate Next button needed. */
function CelebrationOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-emerald-50 animate-in fade-in duration-200">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg animate-in zoom-in-50 duration-300">
        <Check className="h-10 w-10 text-white" strokeWidth={3} aria-hidden="true" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-emerald-600">
        Confirmed
      </p>
      <p className="mt-1 text-lg font-semibold text-emerald-900">{label}</p>
    </div>
  );
}

const DEFAULT_FIELD_STATE = (): FieldState => ({
  correctedUnits: Object.fromEntries(UNCONFIRMED.map((p) => [p.id, String(p.units)])),
  unitStatus: Object.fromEntries(UNCONFIRMED.map((p) => [p.id, "pending"])),
  productStatus: Object.fromEntries(UNCONFIRMED.map((p) => [p.id, "pending"])),
  migrationType: Object.fromEntries(UNCONFIRMED.map((p) => [p.id, ""])),
  anchorDate: Object.fromEntries(UNCONFIRMED.map((p) => [p.id, ""])),
  anchorStatus: Object.fromEntries(UNCONFIRMED.map((p) => [p.id, "pending"])),
});

/** Compute the first step that is still incomplete so re-entry resumes there. */
function firstIncompleteStep(fields: FieldState): number {
  for (let pi = 0; pi < UNCONFIRMED.length; pi++) {
    const pid = UNCONFIRMED[pi].id;
    if (fields.unitStatus[pid] === "pending") return pi * 4 + 0;
    if (fields.productStatus[pid] === "pending") return pi * 4 + 1;
    if (!fields.migrationType[pid]) return pi * 4 + 2;
    if (fields.anchorStatus[pid] === "pending") return pi * 4 + 3;
  }
  return UNCONFIRMED.length * 4; // all done → review
}

function ConfirmMigrationDrawer({
  task, onClose, onComplete, onConfirmProperties, savedFieldState, onSaveFieldState,
}: {
  task: QueueItem;
  onClose: () => void;
  onComplete: (t: string) => void;
  onConfirmProperties?: (data: Record<string, ConfirmedPropertyData>) => void;
  savedFieldState?: FieldState | null;
  onSaveFieldState?: (state: FieldState) => void;
}) {
  const TOTAL_FIELDS = UNCONFIRMED.length * 4;
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fields, setFields] = useState<FieldState>(savedFieldState ?? DEFAULT_FIELD_STATE());

  // Resume from first incomplete step so re-entry never restarts from 0
  const [step, setStep] = useState(() =>
    savedFieldState ? firstIncompleteStep(savedFieldState) : 0,
  );

  // Persist field state to parent whenever it changes
  useEffect(() => {
    onSaveFieldState?.(fields);
  }, [fields, onSaveFieldState]);

  useEffect(() => () => { if (celebrationTimer.current) clearTimeout(celebrationTimer.current); }, []);

  const celebrate = (label: string, then: () => void) => {
    setCelebrating(label);
    celebrationTimer.current = setTimeout(() => {
      setCelebrating(null);
      then();
    }, 700);
  };

  const isReview = step === TOTAL_FIELDS;
  const propIndex = isReview ? 0 : Math.floor(step / 4);
  const fieldIndex = isReview ? 0 : step % 4;
  const property = UNCONFIRMED[propIndex];

  const progressLabel = isReview
    ? `Review · ${UNCONFIRMED.length} properties`
    : `Step ${step + 1} of ${TOTAL_FIELDS}`;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {celebrating && <CelebrationOverlay label={celebrating} />}

      <DrawerHeader progress={progressLabel} onClose={onClose} />

      <div className="flex flex-1 flex-col overflow-y-auto">
        {!isReview && (
          <FieldPane
            property={property}
            fieldIndex={fieldIndex}
            fields={fields}
            setFields={setFields}
            celebrate={celebrate}
            advanceStep={() => setStep((s) => s + 1)}
          />
        )}
        {isReview && <ReviewPane fields={fields} />}
      </div>

      <DrawerFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              Back
            </Button>
          )}
          {isReview && (
            <Button
              size="sm"
              onClick={() => {
                // Emit confirmed migration types back to the page
                onConfirmProperties?.(
                  Object.fromEntries(
                    UNCONFIRMED.map((p) => [
                      p.id,
                      {
                        migrationConfirmed: true,
                        migrationType: fields.migrationType[p.id] || "standard",
                      },
                    ]),
                  ),
                );
                onComplete(task.title);
                onClose();
              }}
            >
              Confirm all
            </Button>
          )}
        </div>
      </DrawerFooter>
    </div>
  );
}

/* ── Individual field pane ── */

function FieldPane({
  property,
  fieldIndex,
  fields,
  setFields,
  celebrate,
  advanceStep,
}: {
  property: typeof UNCONFIRMED[0];
  fieldIndex: number;
  fields: FieldState;
  setFields: React.Dispatch<React.SetStateAction<FieldState>>;
  celebrate: (label: string, then: () => void) => void;
  advanceStep: () => void;
}) {
  const pid = property.id;

  if (fieldIndex === 0) {
    const status = fields.unitStatus[pid];
    const [editMode, setEditMode] = useState(false);
    const [inputVal, setInputVal] = useState(String(property.units));

    const confirmUnit = (type: "correct" | "corrected") => {
      setFields((f) => ({ ...f, unitStatus: { ...f.unitStatus, [pid]: type } }));
      celebrate("Unit count", advanceStep);
    };

    return (
      <IsolatedField
        propertyName={property.name}
        label="Unit count"
        value={
          status === "corrected"
            ? `${fields.correctedUnits[pid]} units`
            : `${property.units} units`
        }
        context="Drives billing — if wrong, we'll file an amendment before charging goes live."
      >
        {!editMode && (
          <ConfirmActions
            onCorrect={() => confirmUnit("correct")}
            onWrong={() => setEditMode(true)}
          />
        )}
        {editMode && (
          <div className="w-full space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground" htmlFor={`unit-${pid}`}>
                What's the actual count?
              </label>
              <input
                id={`unit-${pid}`}
                type="number"
                min={1}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                placeholder="Enter correct unit count"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                We'll file a contract amendment to reflect this change.
              </p>
            </div>
            <ConfirmActions
              primaryLabel="Save & confirm"
              primaryDisabled={!inputVal || Number(inputVal) < 1}
              onCorrect={() => {
                setFields((f) => ({
                  ...f,
                  correctedUnits: { ...f.correctedUnits, [pid]: inputVal },
                  unitStatus: { ...f.unitStatus, [pid]: "corrected" },
                }));
                setEditMode(false);
                celebrate("Unit count", advanceStep);
              }}
              onWrong={() => setEditMode(false)}
              wrongLabel="Never mind"
            />
          </div>
        )}
      </IsolatedField>
    );
  }

  if (fieldIndex === 1) {
    const status = fields.productStatus[pid];
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Fixed header section */}
        <div className="px-10 pt-10 text-center">
          <p className="text-xl font-bold text-foreground">{property.name}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Products on this property
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Determines which tasks appear in your setup queue. If the list is wrong, your account rep will update the contract.
          </p>
          {status !== "pending" && (
            <div className="mt-3">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  status === "correct" && "border-emerald-500/40 bg-emerald-50 text-emerald-700",
                  status === "flagged" && "border-amber-400/60 bg-amber-50 text-amber-800",
                )}
              >
                {status === "correct" && <Check className="mr-1 h-3 w-3" aria-hidden="true" />}
                {status === "correct" ? "Confirmed" : "Flagged for account rep"}
              </Badge>
            </div>
          )}
        </div>

        {/* Scrollable product list */}
        <div className="mx-10 mt-5 flex-1 overflow-y-auto rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {property.products.map((product) => (
              <li key={product} className="flex items-center gap-2 px-4 py-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/30" aria-hidden="true" />
                <span className="text-sm text-foreground">{product}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            {property.products.length} products total
          </p>
        </div>

        {/* Actions */}
        <div className="px-10 py-6 text-center">
          {status === "pending" && (
            <ConfirmActions
              onCorrect={() => {
                setFields((f) => ({ ...f, productStatus: { ...f.productStatus, [pid]: "correct" } }));
                celebrate("Products confirmed", advanceStep);
              }}
              onWrong={() => {
                setFields((f) => ({ ...f, productStatus: { ...f.productStatus, [pid]: "flagged" } }));
                celebrate("Flagged for account rep", advanceStep);
              }}
              wrongLabel="Something's off"
            />
          )}
          {status === "flagged" && (
            <div className="w-full rounded-lg border border-amber-400/60 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              <p className="font-semibold">Flagged for your account rep.</p>
              <p className="mt-1 text-amber-800">
                They'll reach out to correct the product list. You can keep going — this will stay pending until resolved.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (fieldIndex === 2) {
    const selected = fields.migrationType[pid];
    return (
      <IsolatedField
        propertyName={property.name}
        label="Migration type"
        value={selected ? undefined : undefined}
        context="This shapes every downstream task. Select the type that applies to this property."
        statusBadge={selected ? `${MIGRATION_TYPES.find(t => t.id === selected)?.label} selected` : undefined}
        statusVariant={selected ? "emerald" : undefined}
      >
        <div className="w-full space-y-2">
          {MIGRATION_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setFields((f) => ({ ...f, migrationType: { ...f.migrationType, [pid]: t.id } }));
                celebrate(t.label, advanceStep);
              }}
              className="flex w-full items-start gap-3 rounded-lg border border-border px-4 py-3 text-left transition-colors hover:border-foreground/40 hover:bg-foreground/[0.02] active:bg-foreground/5"
            >
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </IsolatedField>
    );
  }

  if (fieldIndex === 3) {
    const anchorStatus = fields.anchorStatus[pid];
    const migrationType = fields.migrationType[pid];
    const dateLabel =
      migrationType === "lease-up" ? "Certificate of occupancy date" :
      migrationType === "takeover" ? "Legal close date" :
      migrationType === "notd" ? "Ownership transfer date" :
      "Migration date";

    return (
      <IsolatedField
        propertyName={property.name}
        label={dateLabel}
        value={fields.anchorDate[pid] || undefined}
        context={
          migrationType === "lease-up"
            ? "Unlocks banking and resident products. Required before go-live."
            : migrationType === "takeover"
              ? "Nothing activates for residents until this date. Required to schedule activation."
              : "Helps us schedule migration tasks. Required before go-live."
        }
        statusBadge={
          anchorStatus === "set" ? "Date confirmed" :
          anchorStatus === "deferred" ? "Set later — pending" : undefined
        }
        statusVariant={anchorStatus === "set" ? "emerald" : anchorStatus === "deferred" ? "amber" : undefined}
      >
        {anchorStatus === "pending" && (
          <div className="w-full space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground" htmlFor={`date-${pid}`}>
                Select date
              </label>
              <input
                id={`date-${pid}`}
                type="date"
                value={fields.anchorDate[pid]}
                onChange={(e) =>
                  setFields((f) => ({ ...f, anchorDate: { ...f.anchorDate, [pid]: e.target.value } }))
                }
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
              />
            </div>
            <ConfirmActions
              primaryLabel="Confirm date"
              primaryDisabled={!fields.anchorDate[pid]}
              onCorrect={() => {
                setFields((f) => ({ ...f, anchorStatus: { ...f.anchorStatus, [pid]: "set" } }));
                celebrate("Date confirmed", advanceStep);
              }}
              onWrong={() => {
                setFields((f) => ({ ...f, anchorStatus: { ...f.anchorStatus, [pid]: "deferred" } }));
                celebrate("Set later — noted", advanceStep);
              }}
              wrongLabel="I'll set this later"
            />
          </div>
        )}
      </IsolatedField>
    );
  }

  return null;
}

/* ── Shared confirm actions — same layout, same position on every field ──
   Primary: "This is correct" (or custom label). Secondary: "That's wrong".
   Always centered, always the same size. ─────────────────────────────── */

function ConfirmActions({
  onCorrect,
  onWrong,
  primaryLabel = "This is correct",
  primaryDisabled = false,
  wrongLabel = "That's wrong",
}: {
  onCorrect: () => void;
  onWrong: () => void;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  wrongLabel?: string;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <Button
        size="sm"
        className="w-full max-w-xs"
        disabled={primaryDisabled}
        onClick={onCorrect}
      >
        <Check className="mr-2 h-4 w-4" aria-hidden="true" />
        {primaryLabel}
      </Button>
      <button
        type="button"
        onClick={onWrong}
        className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {wrongLabel}
      </button>
    </div>
  );
}

/* ── Isolated field layout ───────────────────────────────────────────────
   No card borders. Whitespace-focused. Property name prominent and centered.
   One value. One question. No surrounding noise.
   ──────────────────────────────────────────────────────────────────────── */

function IsolatedField({
  propertyName,
  label,
  value,
  context,
  statusBadge,
  statusVariant,
  children,
}: {
  propertyName?: string;
  label: string;
  value?: string;
  context: string;
  statusBadge?: string;
  statusVariant?: "emerald" | "amber";
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-10 py-10 text-center">
      {/* Property name — large and prominent so there's never any ambiguity */}
      {propertyName && (
        <p className="text-xl font-bold text-foreground">{propertyName}</p>
      )}

      {/* Field label — small and muted, below the property name */}
      <p className={cn(
        "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
        propertyName ? "mt-4" : "",
      )}>
        {label}
      </p>

      {value && (
        <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      )}

      {statusBadge && (
        <div className="mt-3">
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              statusVariant === "emerald" && "border-emerald-500/40 bg-emerald-50 text-emerald-700",
              statusVariant === "amber" && "border-amber-400/60 bg-amber-50 text-amber-800",
            )}
          >
            {statusVariant === "emerald" && <Check className="mr-1 h-3 w-3" aria-hidden="true" />}
            {statusBadge}
          </Badge>
        </div>
      )}

      <p className="mt-3 max-w-sm text-xs text-muted-foreground">{context}</p>

      {children && (
        <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Review pane ── */

function ReviewPane({ fields }: { fields: FieldState }) {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <p className="text-lg font-semibold text-foreground">Review before confirming</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Once confirmed, setup tasks will unlock for each property.
      </p>
      <div className="mt-6 space-y-6">
        {UNCONFIRMED.map((p) => {
          const migration = MIGRATION_TYPES.find((t) => t.id === fields.migrationType[p.id]);
          return (
            <div key={p.id}>
              <p className="text-sm font-semibold text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.city}, {p.state}</p>
              <dl className="mt-3 space-y-2 text-xs">
                <ReviewRow
                  label="Units"
                  value={
                    fields.unitStatus[p.id] === "corrected"
                      ? `${fields.correctedUnits[p.id]} units (corrected — amendment queued)`
                      : `${p.units} units`
                  }
                  status={fields.unitStatus[p.id] === "pending" ? "pending" : "done"}
                />
                <ReviewRow
                  label="Products"
                  value={
                    fields.productStatus[p.id] === "flagged"
                      ? "Flagged for account rep — pending"
                      : `${p.products.length} products confirmed`
                  }
                  status={fields.productStatus[p.id] === "flagged" ? "amber" : fields.productStatus[p.id] === "correct" ? "done" : "pending"}
                />
                <ReviewRow
                  label="Migration type"
                  value={migration?.label ?? "Not selected"}
                  status={migration ? "done" : "pending"}
                />
                <ReviewRow
                  label="Anchor date"
                  value={
                    fields.anchorStatus[p.id] === "deferred"
                      ? "Set later — pending"
                      : fields.anchorDate[p.id] || "Not set"
                  }
                  status={fields.anchorStatus[p.id] === "set" ? "done" : fields.anchorStatus[p.id] === "deferred" ? "amber" : "pending"}
                />
              </dl>
              <div className="mt-3 border-t border-border" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewRow({ label, value, status }: { label: string; value: string; status: "done" | "pending" | "amber" }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn(
        "flex-1",
        status === "done" ? "text-foreground" :
        status === "amber" ? "text-amber-800" :
        "text-muted-foreground italic",
      )}>
        {status === "done" && <Check className="mr-1 inline h-3 w-3 text-emerald-600" aria-hidden="true" />}
        {value}
      </dd>
    </div>
  );
}

/* ─── Pick Settings Template ─────────────────────────────────────────────── */

/* Templates are client-named — could be by vertical, region, use case, or anything.
   We're just displaying what was already assigned in the Overlays workflow. */
const EXISTING_TEMPLATES = [
  { id: "t1", title: "Standard Conventional",      match: 88 },
  { id: "t2", title: "Midwest Portfolio",           match: 82 },
  { id: "t3", title: "Student Housing — Core",     match: 76 },
  { id: "t4", title: "New Acquisition",             match: 70 },
  { id: "t5", title: "Affordable Standard",         match: 64 },
];

const AUTO_APPLIED_TEMPLATE = EXISTING_TEMPLATES[0];

// Sample properties for the template confirmation list
const TEMPLATE_PROPERTIES = [
  { id: "ap1",  name: "Cedar Vista",    occupancyType: "Conventional", group: "Midwest Group",    templateId: "t1" },
  { id: "ap2",  name: "Birch Ridge",    occupancyType: "Conventional", group: "Northeast Group",  templateId: "t2" },
  { id: "ap3",  name: "Aspen Trail",    occupancyType: "Conventional", group: "Midwest Group",    templateId: "t1" },
  { id: "ap4",  name: "Pine Ridge",     occupancyType: "Conventional", group: "California Group", templateId: "t4" },
  { id: "ap5",  name: "Maple Court",    occupancyType: "Conventional", group: "Midwest Group",    templateId: "t2" },
  { id: "ap6",  name: "Willow Lane",    occupancyType: "Conventional", group: "Southeast Group",  templateId: "t1" },
  { id: "ap7",  name: "Oak Hollow",     occupancyType: "Conventional", group: "Northeast Group",  templateId: "t2" },
  { id: "ap8",  name: "Sage Brook",     occupancyType: "Conventional", group: "Northwest Group",  templateId: "t4" },
  { id: "ap9",  name: "Linden Park",    occupancyType: "Student",      group: "Southeast Group",  templateId: "t3" },
  { id: "ap10", name: "Juniper Yards",  occupancyType: "Student",      group: "Northwest Group",  templateId: "t3" },
  { id: "ap11", name: "Elm Crossing",   occupancyType: "Affordable",   group: "Midwest Group",    templateId: "t5" },
  { id: "ap12", name: "Hawthorn Place", occupancyType: "Conventional", group: "Southeast Group",  templateId: "t1" },
];

function PickTemplateDrawer({ task, onClose, onComplete }: { task: QueueItem; onClose: () => void; onComplete: (t: string) => void }) {
  // Seed from each property's already-applied template — not all the same
  const [assignments, setAssignments] = useState<Record<string, string>>(
    () => Object.fromEntries(TEMPLATE_PROPERTIES.map((p) => [p.id, p.templateId])),
  );
  const [expanding, setExpanding] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const templateLabel = (id: string) =>
    EXISTING_TEMPLATES.find((t) => t.id === id)?.title ?? id;

  const handleConfirmAll = () => {
    setCelebrating(true);
    celebrationTimer.current = setTimeout(() => {
      setCelebrating(false);
      onComplete(task.title);
      onClose();
    }, 750);
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {celebrating && <CelebrationOverlay label="Templates confirmed" />}

      <DrawerHeader
        title="Pick Settings Template"
        progress={`${TEMPLATE_PROPERTIES.length} properties · confirm or override per property`}
        onClose={onClose}
      />

      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Auto-applied banner */}
        <div className="border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Settings templates applied at property creation
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Each property inherited a template based on its occupancy type and group.
                Confirm the assignments below or change any that don't look right.
              </p>
            </div>
          </div>
        </div>

        {/* Per-property list */}
        <div className="divide-y divide-border">
          {TEMPLATE_PROPERTIES.map((p) => {
            const current = assignments[p.id];
            const isExpanded = expanding === p.id;
            const isOverridden = current !== AUTO_APPLIED_TEMPLATE.id;

            return (
              <div key={p.id} className="px-6 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.occupancyType} · {p.group}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/70">
                      <span className="text-muted-foreground">Template:</span>{" "}
                      <span className={cn("font-medium", isOverridden && "text-foreground")}>
                        {templateLabel(current)}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanding(isExpanded ? null : p.id)}
                    className="shrink-0 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background transition-colors hover:bg-foreground/80"
                  >
                    {isExpanded ? "Close" : "Change"}
                  </button>
                </div>

                {/* Inline template picker — clear hierarchy */}
                {isExpanded && (
                  <div className="mt-3 rounded-lg border border-border bg-white p-3 shadow-sm">
                    <div className="space-y-1">
                      {EXISTING_TEMPLATES.map((t) => {
                        const isCurrent = current === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setAssignments((prev) => ({ ...prev, [p.id]: t.id }));
                              setExpanding(null);
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                              isCurrent
                                ? "bg-foreground"
                                : "hover:bg-muted",
                            )}
                          >
                            {/* Check or empty dot */}
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                                isCurrent
                                  ? "border-background bg-background"
                                  : "border-muted-foreground",
                              )}
                              aria-hidden="true"
                            >
                              {isCurrent && <Check className="h-2.5 w-2.5 text-foreground" strokeWidth={3} />}
                            </span>
                            <div className="min-w-0 flex-1">
                              {/* Template name clearly labeled */}
                              <p className={cn(
                                "text-xs font-semibold",
                                isCurrent ? "text-background" : "text-foreground",
                              )}>
                                {t.title}
                              </p>
                            </div>
                            <span className={cn(
                              "shrink-0 text-xs",
                              isCurrent ? "text-background/60" : "text-muted-foreground",
                            )}>
                              {t.match}% match
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Consultant note instead of create-new modal */}
                    <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      Need a different template?{" "}
                      <span className="font-medium text-foreground">Contact your consultant</span>
                      {" "}— they'll set it up and it will appear in this list.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <DrawerFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleConfirmAll}>
          <Check className="mr-1 h-4 w-4" aria-hidden="true" />
          Confirm all templates
        </Button>
      </DrawerFooter>
    </div>
  );
}

/* ─── Connect Banking — one property at a time ───────────────────────────── */

const BANKING_STEPS = [
  { id: "ap2", name: "Birch Ridge", city: "Charlotte", state: "NC", units: 238, type: "Takeover" },
  { id: "ap6", name: "Willow Lane", city: "Austin", state: "TX", units: 220, type: "Standard" },
  { id: "ap7", name: "Oak Hollow", city: "Raleigh", state: "NC", units: 256, type: "Takeover" },
  { id: "ap8", name: "Sage Brook", city: "Boise", state: "ID", units: 168, type: "Takeover" },
  { id: "ap12", name: "Hawthorn Place", city: "Kansas City", state: "MO", units: 176, type: "NOTD" },
];

function ConnectBankingDrawer({ task, onClose, onComplete }: { task: QueueItem; onClose: () => void; onComplete: (t: string) => void }) {
  const [step, setStep] = useState(0);
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const property = BANKING_STEPS[step];
  const isConnected = connected.has(property.id);
  const isLast = step === BANKING_STEPS.length - 1;

  return (
    <>
      <DrawerHeader
        title="Connect Banking"
        progress={`Property ${step + 1} of ${BANKING_STEPS.length}`}
        onClose={onClose}
      />

      <div className="flex flex-1 flex-col items-center justify-center px-10 py-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Connect banking
        </p>

        <p className="mt-4 text-2xl font-semibold text-foreground">{property.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {property.city}, {property.state} · {property.units} units · {property.type}
        </p>

        <p className="mt-4 max-w-sm text-xs text-muted-foreground">
          Each property needs its own bank account for payment processing. Plaid verifies ownership securely in about 3 minutes.
        </p>

        {isConnected ? (
          <div className="mt-8 flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            <p className="text-sm font-semibold text-emerald-800">Connected</p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              onClick={() => setConnected((prev) => new Set([...prev, property.id]))}
            >
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Connect via Plaid
            </Button>
            <button
              type="button"
              onClick={() => {
                if (isLast) { onComplete(task.title); onClose(); }
                else setStep((s) => s + 1);
              }}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Skip for now — come back before go-live
            </button>
          </div>
        )}

        {/* Progress dots */}
        <div className="mt-10 flex items-center justify-center gap-2">
          {BANKING_STEPS.map((p, i) => (
            <span
              key={p.id}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === step ? "bg-foreground" :
                connected.has(p.id) ? "bg-emerald-500" : "bg-muted",
              )}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      <DrawerFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              Back
            </Button>
          )}
          <Button
            size="sm"
            disabled={!isConnected}
            onClick={() => {
              if (isLast) { onComplete(task.title); onClose(); }
              else setStep((s) => s + 1);
            }}
          >
            {isLast ? "Confirm all" : `Next: ${BANKING_STEPS[step + 1]?.name}`}
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </DrawerFooter>
    </>
  );
}

/* ─── Generic fallback ───────────────────────────────────────────────────── */

function GenericDrawer({ task, onClose, onComplete }: { task: QueueItem; onClose: () => void; onComplete: (t: string) => void }) {
  return (
    <>
      <DrawerHeader progress={task.title} onClose={onClose} />
      <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
        <LayoutGrid className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-foreground">{task.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">Content coming in a future version.</p>
      </div>
      <DrawerFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => { onComplete(task.title); onClose(); }}>
          Mark started <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </Button>
      </DrawerFooter>
    </>
  );
}

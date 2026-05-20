import type { LucideIcon } from "lucide-react";

export type Bucket = "new-logo" | "add-on";
export type CustomerView = "customer" | "internal";
export type SimulateState = "normal" | "loading" | "error" | "empty";
export type PrototypeVersion = "v1" | "v1.1" | "v1.2" | "v1.3";
export type DrawerState = "normal" | "loading" | "error";

export type MigrationType =
  | "standard"
  | "takeover"
  | "notd"
  | "lease-up"
  | "acquisition";

export type Urgency = "now" | "soon" | "later";
export type DevPhase = "P1" | "P2" | "P3";

export type Property = {
  id: string;
  name: string;
  city: string;
  state: string;
  units: number;
  vertical: "Conventional" | "Student" | "Affordable" | "Commercial";
  progress: number;
  state_label: "Just added" | "Configuring" | "Ready" | "Live" | "Needs review";
  addedDaysAgo: number;
  migrationType: MigrationType;
  anchorDateLabel?: string;
  newLocale?: string;
  productCount: number;
  /**
   * Migration type + projected migration date are not known when the contract
   * triggers the wizard. Until the client confirms both, downstream
   * property-scoped tasks won't include this property.
   */
  migrationConfirmed: boolean;
};

export type QueueItem = {
  id: string;
  title: string;
  context: string;
  ownerRole: string;
  cta: string;
  href?: string;
  urgency: Urgency;
  devPhase: DevPhase;
  /**
   * cohort = applies to every property in the bucket.
   * property = listed in appliesToIds; gated on migrationConfirmed.
   */
  scope: "cohort" | "property";
  appliesToIds?: string[];
  completedIds?: string[];
  /** Optional event/locale flag that explains why this task exists. */
  trigger?: string;
  estimateLabel?: string;
};

export type FeeSchedule = {
  application: number;
  admin: number;
  latePct: number;
  lateGraceDays: number;
};

export type PropertyReceipt = {
  id: string;
  label: string;
  value: string;
  sourceLabel: string;
  sourceIcon: LucideIcon;
  confidence: number;
  editable: boolean;
};

export type MigrationMeta = {
  label: string;
  chipClass: string;
  dotClass: string;
  helper: string;
};

export type ActivationStatus = "pending" | "firing" | "done" | "failed";

export type ActivationTrigger = {
  id: string;
  title: string;
  detail: string;
  icon: LucideIcon;
};

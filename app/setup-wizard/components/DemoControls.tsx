"use client";

import { ChevronDown, Wand2 } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import type { Bucket, CustomerView, DrawerState, PrototypeVersion, SimulateState } from "../types";

type Props = {
  bucket: Bucket;
  setBucket: (b: Bucket) => void;
  view: CustomerView;
  setView: (v: CustomerView) => void;
  devMode: boolean;
  setDevMode: (v: boolean) => void;
  simulateState: SimulateState;
  setSimulateState: (s: SimulateState) => void;
  version: PrototypeVersion;
  setVersion: (v: PrototypeVersion) => void;
  drawerState: DrawerState;
  setDrawerState: (s: DrawerState) => void;
};

const BUCKET_OPTIONS: { id: Bucket; label: string }[] = [
  { id: "new-logo", label: "New Logo" },
  { id: "add-on", label: "Add-On" },
];

const VIEW_OPTIONS: { id: CustomerView; label: string }[] = [
  { id: "customer", label: "Customer" },
  { id: "internal", label: "Internal" },
];

const STATE_OPTIONS: { id: SimulateState; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "Error" },
  { id: "empty", label: "Empty" },
];

const DRAWER_STATE_OPTIONS: { id: DrawerState; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "Error" },
];

const VERSION_OPTIONS: { id: PrototypeVersion; label: string; description: string }[] = [
  {
    id: "v1",
    label: "V1",
    description: "Confirm type · Pick settings template · Banking",
  },
  {
    id: "v1.1",
    label: "V1.1",
    description: "+ Takeover scheduling · Occupancy · IL compliance",
  },
  {
    id: "v1.2",
    label: "V1.2",
    description: "+ Review settings · NOTD accounting",
  },
  {
    id: "v1.3",
    label: "V1.3",
    description: "Full queue — all items",
  },
];

export function DemoControls({
  bucket,
  setBucket,
  view,
  setView,
  devMode,
  setDevMode,
  simulateState,
  setSimulateState,
  version,
  setVersion,
  drawerState,
  setDrawerState,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600/40"
        >
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          Demo controls
          <ChevronDown className="h-3 w-3 opacity-80" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="space-y-3">
          {/* Version selector */}
          <div role="group" aria-label="Version">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Version
            </p>
            <div className="mt-2 space-y-1">
              {VERSION_OPTIONS.map((opt) => {
                const selected = version === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVersion(opt.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-foreground hover:border-foreground/40",
                    )}
                  >
                    <span className="shrink-0 text-xs font-bold">{opt.label}</span>
                    <span className={cn("text-xs", selected ? "text-background/70" : "text-muted-foreground")}>
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <ToggleGroup
              label="Bucket"
              value={bucket}
              options={BUCKET_OPTIONS}
              onChange={setBucket}
            />
          </div>

          <ToggleGroup
            label="View"
            value={view}
            options={VIEW_OPTIONS}
            onChange={setView}
          />

          <ToggleGroup
            label="Page state"
            value={simulateState}
            options={STATE_OPTIONS}
            onChange={setSimulateState}
          />

          <ToggleGroup
            label="Drawer state"
            value={drawerState}
            options={DRAWER_STATE_OPTIONS}
            onChange={setDrawerState}
          />

          <p className="text-xs text-muted-foreground">
            Demo-only controls. These won&apos;t appear in production.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 inline-flex w-full rounded-md border border-border bg-white p-1 text-xs">
        {options.map((opt) => {
          const pressed = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={pressed}
              className={cn(
                "flex-1 rounded px-2 py-1 font-medium transition-colors",
                pressed
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

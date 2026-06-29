"use client";

import { Cpu, ExternalLink } from "lucide-react";
import type { WorkflowEngine } from "@/lib/workflow-router";

const ENGINE_CONFIG: Record<
  WorkflowEngine,
  {
    label: string;
    shortLabel: string;
    icon: typeof Cpu;
    className: string;
    dotColor: string;
    bgColor: string;
  }
> = {
  "entrata-native": {
    label: "Entrata Native",
    shortLabel: "Native",
    icon: Cpu,
    className: "border-emerald-300 bg-emerald-50 text-emerald-800",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-100",
  },
  workato: {
    label: "Powered by Workato",
    shortLabel: "Workato",
    icon: ExternalLink,
    className: "border-orange-300 bg-orange-50 text-orange-800",
    dotColor: "bg-orange-500",
    bgColor: "bg-orange-100",
  },
};

const SIZE_MAP = {
  sm: { badge: "px-1.5 py-0.5 text-[9px]", icon: "h-2.5 w-2.5", dot: "h-1.5 w-1.5" },
  md: { badge: "px-2 py-0.5 text-[10px]", icon: "h-3 w-3", dot: "h-2 w-2" },
  lg: { badge: "px-2.5 py-1 text-[11px]", icon: "h-3.5 w-3.5", dot: "h-2.5 w-2.5" },
} as const;

export function WorkflowEngineBadge({
  engine,
  size = "md",
  showLabel = true,
}: {
  engine: WorkflowEngine;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const config = ENGINE_CONFIG[engine];
  const sizeStyle = SIZE_MAP[size];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${config.className} ${sizeStyle.badge}`}
    >
      <Icon className={sizeStyle.icon} />
      {showLabel && config.label}
    </span>
  );
}

export function WorkflowEngineDot({ engine }: { engine: WorkflowEngine }) {
  const config = ENGINE_CONFIG[engine];
  return (
    <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.shortLabel}
    </span>
  );
}

export function WorkflowEngineIcon({
  engine,
  className = "h-4 w-4",
}: {
  engine: WorkflowEngine;
  className?: string;
}) {
  const config = ENGINE_CONFIG[engine];
  const Icon = config.icon;
  return (
    <div className={`flex items-center justify-center rounded-md p-1 ${config.bgColor}`}>
      <Icon className={className} />
    </div>
  );
}

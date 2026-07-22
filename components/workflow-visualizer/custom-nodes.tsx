"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WorkflowNodeData } from "./types";
import {
  Zap,
  GitBranch,
  Cog,
  Repeat,
  Clock,
  CircleCheckBig,
  Database,
  Shield,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const NODE_STYLES: Record<
  WorkflowNodeData["type"],
  { bg: string; border: string; icon: string; text: string; accent: string }
> = {
  trigger: { bg: "bg-amber-50", border: "border-amber-300", icon: "text-amber-600", text: "text-amber-900", accent: "bg-amber-100" },
  condition: { bg: "bg-blue-50", border: "border-blue-300", icon: "text-blue-600", text: "text-blue-900", accent: "bg-blue-100" },
  action: { bg: "bg-emerald-50", border: "border-emerald-300", icon: "text-emerald-600", text: "text-emerald-900", accent: "bg-emerald-100" },
  loop: { bg: "bg-purple-50", border: "border-purple-300", icon: "text-purple-600", text: "text-purple-900", accent: "bg-purple-100" },
  delay: { bg: "bg-orange-50", border: "border-orange-300", icon: "text-orange-600", text: "text-orange-900", accent: "bg-orange-100" },
  end: { bg: "bg-gray-50", border: "border-gray-300", icon: "text-gray-500", text: "text-gray-700", accent: "bg-gray-100" },
};

function NodeIcon({ type }: { type: WorkflowNodeData["type"] }) {
  const cls = "h-4 w-4";
  switch (type) {
    case "trigger": return <Zap className={cls} />;
    case "condition": return <GitBranch className={cls} />;
    case "action": return <Cog className={cls} />;
    case "loop": return <Repeat className={cls} />;
    case "delay": return <Clock className={cls} />;
    case "end": return <CircleCheckBig className={cls} />;
  }
}

const TYPE_LABELS: Record<WorkflowNodeData["type"], string> = {
  trigger: "Trigger",
  condition: "Condition",
  action: "Action",
  loop: "Loop",
  delay: "Delay",
  end: "End",
};

function WorkflowNode({ data, selected }: NodeProps & { data: Record<string, unknown> }) {
  const d = data as unknown as WorkflowNodeData & {
    execStatus?: "pending" | "running" | "success" | "failure" | "skipped";
    highlighted?: boolean;
  };
  const s = NODE_STYLES[d.type] ?? NODE_STYLES.action;
  const isCondition = d.type === "condition";
  const hasError = d.errorPath === "branch";
  const hasRetry = d.retryPolicy && d.retryPolicy.maxRetries > 0;
  const mappedInputCount = d.config
    ? Object.values(d.config).filter((v) => typeof v === "string" && v.includes("{{")).length
    : 0;
  const outputFieldCount = d.outputFields?.length ?? 0;
  const loopType = d.type === "loop" ? d.config?.["loopType"] ?? "for_each" : null;
  const loopTypeLabel =
    loopType === "do_while" ? "Do While" : loopType === "while" ? "While" : "For Each";
  const isFailureMonitor = d.config?.["monitorMode"] === "step_failure";
  const isFailureReport = d.config?.["reportChannel"] === "email_or_webhook";

  let execRing = "";
  if (d.execStatus === "running") execRing = "ring-2 ring-indigo-400 ring-offset-2";
  else if (d.execStatus === "success") execRing = "ring-2 ring-emerald-400 ring-offset-2";
  else if (d.execStatus === "failure") execRing = "ring-2 ring-red-400 ring-offset-2";

  return (
    <div
      className={`w-[260px] rounded-xl border-2 ${s.border} ${s.bg} shadow-sm transition-all hover:shadow-md ${
        selected ? "ring-2 ring-indigo-500 ring-offset-2" : ""
      } ${execRing} ${d.highlighted ? "ring-2 ring-amber-400 ring-offset-2" : ""}`}
    >
      {d.type !== "trigger" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-3.5 !w-3.5 !border-2 !border-white !bg-gray-400 hover:!bg-indigo-500 hover:!scale-125 !transition-all"
        />
      )}

      <div className="px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2">
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${s.accent} ${s.icon}`}>
            <NodeIcon type={d.type} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`truncate text-[11px] font-bold uppercase tracking-wide ${s.icon}`}>
              {TYPE_LABELS[d.type]}
            </div>
            <div className={`truncate text-[13px] font-semibold leading-tight ${s.text}`}>
              {d.label}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {hasRetry && (
              <div className="rounded bg-amber-200/60 p-0.5" title={`Retry: ${d.retryPolicy?.maxRetries}x`}>
                <RefreshCw className="h-2.5 w-2.5 text-amber-700" />
              </div>
            )}
            {hasError && (
              <div className="rounded bg-red-200/60 p-0.5" title="Error path configured">
                <AlertTriangle className="h-2.5 w-2.5 text-red-600" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-200 px-3 py-2">
        <p className="line-clamp-2 text-[11px] leading-relaxed text-gray-600">
          {d.description}
        </p>
        {d.type === "trigger" && (() => {
          let evts: string[] = [];
          try { evts = JSON.parse(d.config?.["selected_events"] ?? "[]"); } catch { /* ignore */ }
          if (evts.length === 0 && d.config?.["event_type"]) evts = [d.config["event_type"]];
          const schedOn = d.config?.["trigger_schedule_enabled"] === "true";
          if (evts.length === 0 && !schedOn) return null;
          return (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {evts.map((e) => (
                <span key={e} className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold text-amber-700">
                  <Zap className="h-2 w-2" /> {e.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              ))}
              {schedOn && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-semibold text-blue-700">
                  <Clock className="h-2 w-2" /> Schedule
                </span>
              )}
            </div>
          );
        })()}
        {d.mcpTool && (
          <div className="mt-1.5 flex items-center gap-1 rounded bg-white/70 px-1.5 py-0.5">
            <Database className="h-3 w-3 text-gray-400" />
            <span className="truncate text-[10px] font-mono text-gray-500">
              {d.mcpTool}
            </span>
          </div>
        )}
        {d.type === "loop" && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-1.5 py-0.5 text-[8px] font-semibold text-purple-700">
              <Repeat className="h-2 w-2" /> {loopTypeLabel}
            </span>
            {loopType === "for_each" && d.config?.["itemAlias"] ? (
              <span className="inline-flex items-center rounded-full bg-white/80 px-1.5 py-0.5 text-[8px] font-semibold text-purple-700">
                item: {d.config["itemAlias"]}
              </span>
            ) : null}
          </div>
        )}
        {isFailureMonitor && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold text-amber-700">
              <AlertTriangle className="h-2 w-2" /> monitors step failures
            </span>
          </div>
        )}
        {isFailureReport && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[8px] font-semibold text-red-700">
              <Shield className="h-2 w-2" /> sends failure details
            </span>
          </div>
        )}
        {/* Data flow indicators */}
        {mappedInputCount > 0 || outputFieldCount > 0 ? (
          <div className="mt-1.5 flex items-center gap-2">
            {mappedInputCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-700">
                <Database className="h-2 w-2" />
                {mappedInputCount} input{mappedInputCount > 1 ? "s" : ""} mapped
              </span>
            )}
            {outputFieldCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                {outputFieldCount} output{outputFieldCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        ) : null}
      </div>

      {d.type !== "end" && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3.5 !w-3.5 !border-2 !border-white !bg-gray-400 hover:!bg-indigo-500 hover:!scale-125 !transition-all"
        />
      )}

      {/* Dedicated on-error path handle */}
      {hasError && d.type !== "end" && d.type !== "trigger" && (
        <Handle
          type="source"
          position={Position.Right}
          id="on-error"
          className="!h-3.5 !w-3.5 !border-2 !border-white !bg-red-500 hover:!scale-125 !transition-all"
          style={{ top: "70%" }}
          title="On-error path"
        />
      )}

      {isCondition && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="yes"
            className="!h-3.5 !w-3.5 !border-2 !border-white !bg-emerald-500 hover:!scale-125 !transition-all"
            style={{ top: "50%" }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="no"
            className="!h-3.5 !w-3.5 !border-2 !border-white !bg-red-400 hover:!scale-125 !transition-all"
            style={{ top: "50%" }}
          />
        </>
      )}
    </div>
  );
}

export const CustomWorkflowNode = memo(WorkflowNode);

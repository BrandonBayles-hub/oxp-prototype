"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { Plus, Cog, GitBranch, Repeat, X, ArrowRight } from "lucide-react";
import type { WorkflowNodeData } from "./types";

export type InsertStepType = Extract<WorkflowNodeData["type"], "action" | "loop" | "condition">;

type InsertEdgeData = {
  onInsert?: (edgeId: string, source: string, target: string, type: InsertStepType) => void;
  isErrorPath?: boolean;
};

const INSERT_OPTIONS: Array<{
  type: InsertStepType;
  label: string;
  icon: typeof Cog;
  desc: string;
  next: string;
}> = [
  {
    type: "action",
    label: "Action",
    icon: Cog,
    desc: "Call an MCP tool or connector",
    next: "Pick a tool and map its inputs",
  },
  {
    type: "condition",
    label: "Condition",
    icon: GitBranch,
    desc: "Branch yes / no based on a formula",
    next: "Write a condition that returns true/false",
  },
  {
    type: "loop",
    label: "Loop",
    icon: Repeat,
    desc: "Iterate over a list of items",
    next: "Choose the list to iterate and the loop body",
  },
];

const MENU_WIDTH = 288;
const MENU_EST_HEIGHT = 340;

function InsertStepMenu({
  anchor,
  onClose,
  onPick,
}: {
  anchor: DOMRect;
  onClose: () => void;
  onPick: (type: InsertStepType) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const gap = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const measured = menuRef.current?.getBoundingClientRect().height ?? MENU_EST_HEIGHT;
    const spaceBelow = vh - anchor.bottom;
    const placeAbove = spaceBelow < measured + gap && anchor.top > spaceBelow;
    let left = anchor.left + anchor.width / 2 - MENU_WIDTH / 2;
    left = Math.max(12, Math.min(left, vw - MENU_WIDTH - 12));
    let top = placeAbove ? anchor.top - measured - gap : anchor.bottom + gap;
    top = Math.max(12, Math.min(top, vh - measured - 12));
    setPos({ top, left });
  }, [anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[10000]" aria-modal="true" role="dialog">
      {/* Dim canvas so the picker is the clear focus */}
      <div className="pointer-events-auto absolute inset-0 bg-slate-900/25 backdrop-blur-[1px]" onClick={onClose} />

      {/* Pulse marker at the insert point on the edge */}
      <div
        className="pointer-events-none absolute z-[10001]"
        style={{
          left: anchor.left + anchor.width / 2,
          top: anchor.top + anchor.height / 2,
          transform: "translate(-50%, -50%)",
        }}
      >
        <span className="absolute inset-0 -m-3 animate-ping rounded-full bg-indigo-400/50" />
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-indigo-500 bg-white text-indigo-600 shadow-lg">
          <Plus className="h-4 w-4" />
        </span>
      </div>

      <div
        ref={menuRef}
        className="pointer-events-auto absolute z-[10002] overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-2xl ring-1 ring-indigo-100"
        style={{
          top: pos.top,
          left: pos.left,
          width: MENU_WIDTH,
        }}
      >
        <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-white px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-bold text-indigo-900">Insert step here</p>
              <p className="mt-0.5 text-[10px] leading-snug text-indigo-700/80">
                This step will sit between the connected nodes on this path.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <ol className="mt-2 space-y-0.5 text-[10px] text-slate-600">
            <li className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
                1
              </span>
              Choose Action, Condition, or Loop
            </li>
            <li className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
                2
              </span>
              Configure it in the panel that opens on the right
            </li>
          </ol>
        </div>

        <div className="p-1.5">
          {INSERT_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPick(opt.type);
              }}
              className="group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-indigo-50"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600 group-hover:border-indigo-300 group-hover:bg-indigo-100">
                <opt.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-[12px] font-semibold text-foreground">
                  {opt.label}
                  <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">{opt.desc}</span>
                <span className="mt-1 block text-[9px] font-medium text-indigo-600">Next: {opt.next}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function InsertableEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  data,
  source,
  target,
}: EdgeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const edgeData = useMemo(() => (data ?? {}) as InsertEdgeData, [data]);
  const onInsert = edgeData.onInsert;
  const isError =
    edgeData.isErrorPath || (typeof label === "string" && label.toLowerCase().includes("error"));

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const openMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setAnchor(rect);
      setMenuOpen(true);
    }
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setAnchor(null);
  }, []);

  const handleInsert = useCallback(
    (type: InsertStepType) => {
      onInsert?.(id, source, target, type);
      closeMenu();
    },
    [onInsert, id, source, target, closeMenu],
  );

  const stroke = isError ? "#f87171" : "#94a3b8";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke,
          strokeWidth: isError ? 2 : 2,
          strokeDasharray: isError ? "6 3" : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            // Keep the + above nearby nodes so it stays visible/clickable
            zIndex: menuOpen ? 1000 : 1001,
          }}
          className="nodrag nopan"
        >
          {label && (
            <div
              className={`mb-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                isError
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-slate-50 text-slate-600 border border-slate-200"
              }`}
              style={{
                ...labelStyle,
                ...(labelBgStyle as React.CSSProperties),
                padding: labelBgPadding ? `${labelBgPadding[1]}px ${labelBgPadding[0]}px` : undefined,
                borderRadius: labelBgBorderRadius,
              }}
            >
              {String(label)}
            </div>
          )}
          {!isError && (
            <div className="relative flex flex-col items-center">
              <button
                ref={buttonRef}
                type="button"
                onClick={openMenu}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white text-indigo-600 shadow-md transition-all hover:scale-110 hover:border-indigo-500 hover:bg-indigo-50 ${
                  menuOpen
                    ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-200/70"
                    : "border-indigo-300"
                }`}
                title="Insert step here"
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
              >
                {menuOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>

      {menuOpen && anchor && (
        <InsertStepMenu anchor={anchor} onClose={closeMenu} onPick={handleInsert} />
      )}
    </>
  );
}

export const InsertableEdge = memo(InsertableEdgeComponent);

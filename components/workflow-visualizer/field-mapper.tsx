"use client";

import { useMemo, useState } from "react";
import type { OutputField, WorkflowNodeData } from "./types";
import {
  FORMULA_FUNCTIONS,
  WORKFLOW_PROPERTY_FIELDS,
  ERROR_PROPERTY_FIELDS,
  evaluateFormula,
  type FormulaFunction,
} from "./formula-engine";
import {
  X,
  Database,
  Zap,
  Cog,
  GitBranch,
  Repeat,
  Clock,
  CircleCheckBig,
  AlertTriangle,
  Workflow,
  Search,
  FunctionSquare,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export type DataSourceGroup = {
  id: string;
  label: string;
  kind: "workflow" | "trigger" | "step" | "error";
  fields: Array<OutputField & { description?: string }>;
};

function NodeIcon({ type }: { type: WorkflowNodeData["type"] | "workflow" | "error" }) {
  const cls = "h-3.5 w-3.5";
  switch (type) {
    case "trigger": return <Zap className={cls} />;
    case "condition": return <GitBranch className={cls} />;
    case "action": return <Cog className={cls} />;
    case "loop": return <Repeat className={cls} />;
    case "delay": return <Clock className={cls} />;
    case "end": return <CircleCheckBig className={cls} />;
    case "workflow": return <Workflow className={cls} />;
    case "error": return <AlertTriangle className={cls} />;
  }
}

const KIND_STYLES: Record<DataSourceGroup["kind"], { bg: string; text: string; pill: string }> = {
  workflow: { bg: "bg-slate-100", text: "text-slate-700", pill: "bg-slate-200 text-slate-800" },
  trigger: { bg: "bg-amber-50", text: "text-amber-800", pill: "bg-amber-100 text-amber-800" },
  step: { bg: "bg-indigo-50", text: "text-indigo-800", pill: "bg-indigo-100 text-indigo-800" },
  error: { bg: "bg-red-50", text: "text-red-800", pill: "bg-red-100 text-red-800" },
};

// ─── Formula Editor ───

export function FormulaEditor({
  value,
  onChange,
  sources,
  sampleContext,
}: {
  value: string;
  onChange: (v: string) => void;
  sources: DataSourceGroup[];
  sampleContext?: Record<string, unknown>;
}) {
  const [showFunctions, setShowFunctions] = useState(false);
  const [fnSearch, setFnSearch] = useState("");
  const [category, setCategory] = useState<FormulaFunction["category"] | "all">("all");

  const filtered = useMemo(() => {
    return FORMULA_FUNCTIONS.filter((f) => {
      if (category !== "all" && f.category !== category) return false;
      if (!fnSearch) return true;
      const q = fnSearch.toLowerCase();
      return f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
    });
  }, [fnSearch, category]);

  const preview = useMemo(() => {
    if (!value.trim()) return null;
    const ctx = sampleContext ?? buildSampleContext(sources);
    return evaluateFormula(value, ctx);
  }, [value, sampleContext, sources]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
          <FunctionSquare className="h-3 w-3" /> Formula / Expression
        </label>
        <button
          type="button"
          onClick={() => setShowFunctions((v) => !v)}
          className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
        >
          {showFunctions ? "Hide functions" : "Function library"}
        </button>
      </div>
      <textarea
        className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 font-mono text-xs text-foreground focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
        rows={3}
        placeholder='e.g. CONCAT({{trigger.first_name}}, " ", {{trigger.last_name}}) or {{workflow.name}}'
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {preview && (
        <div className={`rounded-md border px-2.5 py-1.5 text-[10px] ${preview.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {preview.ok ? (
            <span>
              <span className="font-semibold">Preview: </span>
              <code className="font-mono">{preview.value == null ? "null" : typeof preview.value === "object" ? JSON.stringify(preview.value) : String(preview.value)}</code>
            </span>
          ) : (
            <span><span className="font-semibold">Error: </span>{preview.error}</span>
          )}
        </div>
      )}
      {showFunctions && (
        <div className="rounded-lg border border-border bg-white">
          <div className="flex items-center gap-2 border-b border-border p-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                value={fnSearch}
                onChange={(e) => setFnSearch(e.target.value)}
                placeholder="Search functions..."
                className="w-full rounded border border-border bg-slate-50 py-1 pl-7 pr-2 text-[11px] focus:outline-none"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FormulaFunction["category"] | "all")}
              className="rounded border border-border bg-white px-1.5 py-1 text-[10px]"
            >
              <option value="all">All</option>
              <option value="text">Text</option>
              <option value="math">Math</option>
              <option value="date">Date</option>
              <option value="logic">Logic</option>
              <option value="list">List</option>
              <option value="type">Type</option>
            </select>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filtered.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => {
                  const insert = f.minArgs === 0 ? `${f.name}()` : `${f.name}(`;
                  onChange(value ? `${value}${insert}` : insert);
                }}
                className="flex w-full flex-col gap-0.5 border-b border-border/50 px-3 py-2 text-left hover:bg-indigo-50 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-indigo-700">{f.name}</span>
                  <span className="rounded bg-slate-100 px-1 text-[8px] uppercase text-slate-500">{f.category}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{f.description}</p>
                <code className="text-[9px] text-indigo-500">{f.example}</code>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">No matching functions</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function buildSampleContext(sources: DataSourceGroup[]): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};
  for (const src of sources) {
    const obj: Record<string, unknown> = {};
    for (const f of src.fields) {
      if (f.sample) {
        try {
          obj[f.name] = JSON.parse(f.sample);
        } catch {
          const n = Number(f.sample);
          obj[f.name] = Number.isFinite(n) && f.type === "number" ? n : f.sample;
        }
      } else {
        obj[f.name] = f.type === "number" ? 0 : f.type === "boolean" ? true : f.type === "array" ? [] : "";
      }
    }
    ctx[src.id] = obj;
  }
  return ctx;
}

// ─── Two-pane Field Mapper ───

export function FieldMapperModal({
  open,
  onClose,
  targetField,
  targetLabel,
  currentValue,
  sources,
  onApply,
  showErrorSource = false,
}: {
  open: boolean;
  onClose: () => void;
  targetField: string;
  targetLabel?: string;
  currentValue: string;
  sources: DataSourceGroup[];
  onApply: (value: string) => void;
  showErrorSource?: boolean;
}) {
  const [mode, setMode] = useState<"map" | "formula">(
    currentValue.includes("(") && /[A-Z_]+\s*\(/.test(currentValue) ? "formula" : "map",
  );
  const [selectedPill, setSelectedPill] = useState<string | null>(
    currentValue.match(/^\{\{(.+)\}\}$/)?.[1] ?? null,
  );
  const [formula, setFormula] = useState(currentValue);
  const [sourceSearch, setSourceSearch] = useState("");
  const [activeSourceId, setActiveSourceId] = useState<string | null>(sources[0]?.id ?? null);

  const allSources = useMemo(() => {
    const base = [...sources];
    const hasWorkflow = base.some((s) => s.id === "workflow");
    if (!hasWorkflow) {
      base.unshift({
        id: "workflow",
        label: "Workflow Properties",
        kind: "workflow",
        fields: WORKFLOW_PROPERTY_FIELDS,
      });
    }
    if (showErrorSource && !base.some((s) => s.id === "error")) {
      base.push({
        id: "error",
        label: "Error Details",
        kind: "error",
        fields: ERROR_PROPERTY_FIELDS,
      });
    }
    return base;
  }, [sources, showErrorSource]);

  const activeSource = allSources.find((s) => s.id === activeSourceId) ?? allSources[0];
  const filteredFields = (activeSource?.fields ?? []).filter((f) => {
    if (!sourceSearch) return true;
    const q = sourceSearch.toLowerCase();
    return f.name.toLowerCase().includes(q) || (f.description ?? "").toLowerCase().includes(q);
  });

  if (!open) return null;

  const apply = () => {
    if (mode === "map" && selectedPill) {
      onApply(`{{${selectedPill}}}`);
    } else if (mode === "formula") {
      onApply(formula);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex h-[560px] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Map field: {targetLabel ?? targetField}</h3>
            <p className="text-[11px] text-muted-foreground">Pick a data pill from a previous step, or write a formula</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setMode("map")}
            className={`flex-1 border-b-2 px-3 py-2 text-[11px] font-semibold ${mode === "map" ? "border-indigo-500 text-indigo-600" : "border-transparent text-muted-foreground"}`}
          >
            <Database className="mr-1 inline h-3 w-3" /> Field Mapper
          </button>
          <button
            type="button"
            onClick={() => setMode("formula")}
            className={`flex-1 border-b-2 px-3 py-2 text-[11px] font-semibold ${mode === "formula" ? "border-indigo-500 text-indigo-600" : "border-transparent text-muted-foreground"}`}
          >
            <FunctionSquare className="mr-1 inline h-3 w-3" /> Formula Editor
          </button>
        </div>

        {mode === "map" ? (
          <div className="flex min-h-0 flex-1">
            {/* Left: source groups */}
            <div className="flex w-44 shrink-0 flex-col border-r border-border bg-slate-50">
              <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Sources</p>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {allSources.map((src) => {
                  const style = KIND_STYLES[src.kind];
                  const active = activeSourceId === src.id;
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => setActiveSourceId(src.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition-colors ${
                        active ? `${style.bg} ${style.text} font-semibold` : "text-muted-foreground hover:bg-white"
                      }`}
                    >
                      <NodeIcon type={src.kind === "workflow" ? "workflow" : src.kind === "error" ? "error" : src.kind === "trigger" ? "trigger" : "action"} />
                      <span className="min-w-0 flex-1 truncate">{src.label}</span>
                      <span className="text-[9px] opacity-60">{src.fields.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Middle: fields */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="border-b border-border p-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    placeholder={`Search ${activeSource?.label ?? "fields"}...`}
                    className="w-full rounded border border-border bg-slate-50 py-1 pl-7 pr-2 text-[11px] focus:outline-none"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {filteredFields.map((f) => {
                  const pillPath = `${activeSource?.id}.${f.name}`;
                  const selected = selectedPill === pillPath;
                  return (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setSelectedPill(pillPath)}
                      className={`mb-1 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-transparent hover:border-border hover:bg-slate-50"
                      }`}
                    >
                      <span className="shrink-0 rounded bg-slate-200 px-1 py-px text-[8px] font-mono font-bold text-slate-600">{f.type}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-foreground">{f.name}</p>
                        {(f.description || f.sample) && (
                          <p className="truncate text-[9px] text-muted-foreground">{f.description ?? f.sample}</p>
                        )}
                      </div>
                      {selected && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
                    </button>
                  );
                })}
                {filteredFields.length === 0 && (
                  <p className="py-8 text-center text-[11px] text-muted-foreground">No fields match</p>
                )}
              </div>
            </div>

            {/* Right: target preview */}
            <div className="flex w-52 shrink-0 flex-col border-l border-border bg-slate-50/80 p-3">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Target</p>
              <div className="rounded-lg border border-border bg-white p-3">
                <p className="text-[11px] font-semibold text-foreground">{targetLabel ?? targetField}</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">Parameter</p>
              </div>
              <div className="my-3 flex items-center justify-center">
                <ChevronRight className="h-4 w-4 text-indigo-400" />
              </div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Mapped value</p>
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                {selectedPill ? (
                  <code className="break-all font-mono text-[11px] text-indigo-700">{`{{${selectedPill}}}`}</code>
                ) : (
                  <p className="text-[11px] italic text-muted-foreground">Select a field</p>
                )}
              </div>
              <p className="mt-auto pt-3 text-[9px] leading-relaxed text-muted-foreground">
                <Sparkles className="mr-0.5 inline h-2.5 w-2.5" />
                No need to type <code className="rounded bg-slate-100 px-0.5">{"{{step.field}}"}</code> — click a field to map it.
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <FormulaEditor
              value={formula}
              onChange={setFormula}
              sources={allSources}
            />
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Insert pill into formula</p>
              <div className="flex flex-wrap gap-1">
                {allSources.flatMap((src) =>
                  src.fields.slice(0, 4).map((f) => (
                    <button
                      key={`${src.id}.${f.name}`}
                      type="button"
                      onClick={() => setFormula((v) => `${v}{{${src.id}.${f.name}}}`)}
                      className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${KIND_STYLES[src.kind].pill}`}
                    >
                      {src.id}.{f.name}
                    </button>
                  )),
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={mode === "map" ? !selectedPill : !formula.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            Apply Mapping
          </button>
        </div>
      </div>
    </div>
  );
}

/** Compact button that opens the field mapper for a parameter. */
export function FieldMapButton({
  targetField,
  targetLabel,
  currentValue,
  sources,
  onApply,
  showErrorSource,
}: {
  targetField: string;
  targetLabel?: string;
  currentValue: string;
  sources: DataSourceGroup[];
  onApply: (value: string) => void;
  showErrorSource?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isMapped = currentValue.includes("{{") || /[A-Z_]+\s*\(/.test(currentValue);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-[26px] items-center gap-0.5 rounded border px-1.5 text-[9px] font-semibold transition-colors ${
          isMapped
            ? "border-indigo-300 bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
            : "border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
        }`}
        title="Open field mapper"
      >
        <Database className="h-2.5 w-2.5" />
        Map
      </button>
      <FieldMapperModal
        open={open}
        onClose={() => setOpen(false)}
        targetField={targetField}
        targetLabel={targetLabel}
        currentValue={currentValue}
        sources={sources}
        onApply={onApply}
        showErrorSource={showErrorSource}
      />
    </>
  );
}

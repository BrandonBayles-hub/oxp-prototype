"use client";

import { useState, useCallback, useRef } from "react";
import type { GeneratedWorkflow, ExecutionRun, StepRunLog } from "./types";
import { buildFormulaContext, evaluateFormula } from "./formula-engine";
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  SkipForward,
  History,
  FlaskConical,
  Rocket,
  AlertTriangle,
} from "lucide-react";

interface ExecutionPanelProps {
  workflow: GeneratedWorkflow;
  onHighlightNode: (nodeId: string | null) => void;
}

function generateMockOutput(nodeType: string, mcpTool?: string): Record<string, unknown> {
  if (mcpTool === "renewals.get_expiring_leases") {
    return { items: [{ lease_id: 4521, resident: "Jane Smith", unit: "204B", expires: "2026-08-15", rent: 1850 }, { lease_id: 4533, resident: "Mark Johnson", unit: "112A", expires: "2026-08-20", rent: 2100 }], count: 2, leases: [{ lease_id: 4521 }, { lease_id: 4533 }], total_count: 2 };
  }
  if (mcpTool === "renewals.get_resident_history") {
    return { resident_id: 4521, payment_score: 94, tenure_months: 18, violations: 0, retention_score: 87, payment_history: { on_time_pct: 98 }, lease_count: 2 };
  }
  if (mcpTool === "renewals.get_market_rent") {
    return { unit_type: "2BR/2BA", market_rent: 2050, avg_concession: 50, effective_date: "2026-07-01" };
  }
  if (mcpTool === "renewals.create_renewal_offer") {
    return { offer_id: "RO-8821", new_rent: 1990, term_months: 12, discount_pct: 3, lease_id: 4521, status: "pending" };
  }
  if (mcpTool === "maintenance.get_work_order") {
    return { work_order_id: 7892, description: "Leaking kitchen faucet", priority: "medium", unit: "204B", resident: "Jane Smith", status: "open", unit_id: 204, resident_id: 5521, created_at: "2026-06-20T14:00:00Z" };
  }
  if (mcpTool === "maintenance.dispatch_vendor") {
    return { dispatch_id: "D-441", vendor: "ABC Plumbing", eta: "2h", status: "dispatched", vendor_name: "ABC Plumbing" };
  }
  if (mcpTool?.startsWith("comms.send_sms")) {
    return { message_id: "SMS-9921", status: "delivered", to: "+1-555-0142" };
  }
  if (mcpTool?.startsWith("comms.send_email")) {
    return { message_id: "EM-3310", status: "sent", to: "jane.smith@email.com" };
  }
  if (mcpTool === "residents.post_note") {
    return { note_id: "N-2287", posted: true };
  }
  if (nodeType === "trigger") {
    return { triggered_at: new Date().toISOString(), event: "scheduled_run", property_id: 1042, first_name: "Jane", last_name: "Smith", email: "jane.smith@email.com", priority: "medium", rent: 1850 };
  }
  if (nodeType === "condition") {
    return { evaluated: true, result: Math.random() > 0.3 };
  }
  if (nodeType === "loop") {
    return { total_items: 12, processed: 12, failed: 0 };
  }
  if (nodeType === "delay") {
    return { waited_ms: 3600000, resumed_at: new Date().toISOString() };
  }
  return { result: "ok", processed: true, success: true };
}

function resolveNodeInputs(
  node: GeneratedWorkflow["nodes"][0],
  ctx: ReturnType<typeof buildFormulaContext>,
): { input: Record<string, unknown>; resolvedInputs: Record<string, unknown>; formulaErrors: string[] } {
  const input: Record<string, unknown> = {};
  const resolvedInputs: Record<string, unknown> = {};
  const formulaErrors: string[] = [];
  const config = node.config ?? {};
  for (const [key, raw] of Object.entries(config)) {
    if (key.startsWith("__")) continue;
    const result = evaluateFormula(raw, ctx);
    if (result.ok) {
      input[key] = result.value;
      resolvedInputs[key] = result.value;
    } else {
      input[key] = raw;
      formulaErrors.push(`${key}: ${result.error}`);
    }
  }
  return { input, resolvedInputs, formulaErrors };
}

const STATUS_ICON: Record<StepRunLog["status"], typeof CheckCircle2> = {
  pending: Clock,
  running: Loader2,
  success: CheckCircle2,
  failure: XCircle,
  skipped: SkipForward,
  error_handled: AlertTriangle,
};

const STATUS_COLOR: Record<StepRunLog["status"], string> = {
  pending: "text-gray-400",
  running: "text-indigo-500 animate-spin",
  success: "text-emerald-500",
  failure: "text-red-500",
  skipped: "text-gray-400",
  error_handled: "text-amber-500",
};

export function ExecutionPanel({ workflow, onHighlightNode }: ExecutionPanelProps) {
  const [mode, setMode] = useState<"idle" | "running" | "paused" | "complete">("idle");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [steps, setSteps] = useState<StepRunLog[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepOutputsRef = useRef<Record<string, Record<string, unknown>>>({});
  const lastErrorRef = useRef<{
    message: string;
    code?: string;
    step_id?: string;
    step_label?: string;
    timestamp?: string;
    retry_count?: number;
  } | null>(null);

  const orderedNodeIds = (() => {
    const visited: string[] = [];
    const seen = new Set<string>();
    const trigger = workflow.nodes.find((n) => n.type === "trigger");
    if (!trigger) return workflow.nodes.map((n) => n.id);

    function walk(id: string) {
      if (seen.has(id)) return;
      seen.add(id);
      visited.push(id);
      // Prefer happy-path edges first; error paths are followed only on failure
      const outEdges = workflow.edges.filter((e) => e.source === id && !e.isErrorPath);
      for (const e of outEdges) walk(e.target);
    }
    walk(trigger.id);
    for (const n of workflow.nodes) {
      if (!seen.has(n.id)) visited.push(n.id);
    }
    return visited;
  })();

  const initSteps = useCallback((): StepRunLog[] => {
    stepOutputsRef.current = {};
    lastErrorRef.current = null;
    return orderedNodeIds.map((id): StepRunLog => ({
      nodeId: id,
      status: "pending",
    }));
  }, [orderedNodeIds]);

  const buildCtx = useCallback(() => {
    const wfId = workflow.id ?? `wf-${workflow.name.toLowerCase().replace(/\s+/g, "-").slice(0, 24)}`;
    return buildFormulaContext({
      workflowId: wfId,
      workflowName: workflow.name,
      workflowDescription: workflow.description,
      stepOutputs: stepOutputsRef.current,
      triggerPayload: (stepOutputsRef.current["trigger"] ??
        stepOutputsRef.current[workflow.nodes.find((n) => n.type === "trigger")?.id ?? ""] ??
        {}) as Record<string, unknown>,
      error: lastErrorRef.current ?? undefined,
    });
  }, [workflow]);

  const advanceStep = useCallback(
    (stepList: StepRunLog[], idx: number): StepRunLog[] => {
      const newSteps = [...stepList];
      const nodeId = orderedNodeIds[idx];
      if (!nodeId) return newSteps;

      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) return newSteps;

      const ctx = buildCtx();
      // Alias trigger outputs under "trigger" for convenience
      if (node.type === "trigger") {
        /* resolved below after output */
      } else {
        const triggerNode = workflow.nodes.find((n) => n.type === "trigger");
        if (triggerNode && stepOutputsRef.current[triggerNode.id]) {
          ctx.trigger = stepOutputsRef.current[triggerNode.id];
        }
      }

      const { input, resolvedInputs, formulaErrors } = resolveNodeInputs(node, ctx);

      // Force failure more often when formula errors, or random 8% for demo
      const willFail =
        (node.type === "action" && (Math.random() < 0.08 || formulaErrors.length > 0)) ||
        (node.label.toLowerCase().includes("on error") ? false : false);

      const duration = Math.floor(80 + Math.random() * 600);

      if (willFail) {
        const errorMsg = formulaErrors[0] ?? "Connection timeout after 30000ms";
        const errorCode = formulaErrors.length > 0 ? "FORMULA_ERROR" : "TIMEOUT";
        lastErrorRef.current = {
          message: errorMsg,
          code: errorCode,
          step_id: nodeId,
          step_label: node.label,
          timestamp: new Date().toISOString(),
          retry_count: node.retryPolicy?.maxRetries ?? 0,
        };

        const errorPath = node.errorPath ?? "stop";
        if (errorPath === "branch" && node.errorTargetId) {
          newSteps[idx] = {
            nodeId,
            status: "error_handled",
            input,
            resolvedInputs,
            durationMs: duration,
            error: errorMsg,
            errorCode,
            startedAt: new Date().toISOString(),
          };
          // Skip happy-path children; queue error target if not already next
          const happyTargets = workflow.edges
            .filter((e) => e.source === nodeId && !e.isErrorPath)
            .map((e) => e.target);
          for (const tid of happyTargets) {
            const skipIdx = orderedNodeIds.indexOf(tid);
            if (skipIdx >= 0 && newSteps[skipIdx]) {
              newSteps[skipIdx] = { ...newSteps[skipIdx], status: "skipped" };
            }
          }
          // Ensure error target is not skipped
          const errIdx = orderedNodeIds.indexOf(node.errorTargetId);
          if (errIdx >= 0 && newSteps[errIdx]?.status === "skipped") {
            newSteps[errIdx] = { ...newSteps[errIdx], status: "pending" };
          }
        } else if (errorPath === "continue") {
          newSteps[idx] = {
            nodeId,
            status: "error_handled",
            input,
            resolvedInputs,
            durationMs: duration,
            error: errorMsg,
            errorCode,
            startedAt: new Date().toISOString(),
          };
        } else {
          newSteps[idx] = {
            nodeId,
            status: "failure",
            input,
            resolvedInputs,
            durationMs: duration,
            error: errorMsg,
            errorCode,
            startedAt: new Date().toISOString(),
          };
          // Skip remaining
          for (let i = idx + 1; i < newSteps.length; i++) {
            if (newSteps[i].status === "pending") {
              newSteps[i] = { ...newSteps[i], status: "skipped" };
            }
          }
        }
        return newSteps;
      }

      let output = generateMockOutput(node.type, node.mcpTool);

      // Evaluate condition expressions with real formula engine when present
      if (node.type === "condition" && node.config?.["expression"]) {
        const condResult = evaluateFormula(node.config["expression"], ctx);
        const passed = condResult.ok ? Boolean(condResult.value) : Math.random() > 0.35;
        output = { evaluated: true, result: passed, expression: node.config["expression"], formulaOk: condResult.ok };
        const yesEdge = workflow.edges.find((e) => e.source === nodeId && (e.label?.toLowerCase().includes("yes") || e.label?.toLowerCase().includes("true")));
        const noEdge = workflow.edges.find((e) => e.source === nodeId && (e.label?.toLowerCase().includes("no") || e.label?.toLowerCase().includes("false")));
        const skipTargetId = passed ? noEdge?.target : yesEdge?.target;
        if (skipTargetId) {
          const skipIdx = orderedNodeIds.indexOf(skipTargetId);
          if (skipIdx >= 0 && newSteps[skipIdx]) {
            newSteps[skipIdx] = { ...newSteps[skipIdx], status: "skipped" };
          }
        }
      } else if (node.type === "condition") {
        const passed = Math.random() > 0.35;
        output = { evaluated: true, result: passed };
        const yesEdge = workflow.edges.find((e) => e.source === nodeId && (e.label?.toLowerCase().includes("yes") || e.label?.toLowerCase().includes("true")));
        const noEdge = workflow.edges.find((e) => e.source === nodeId && (e.label?.toLowerCase().includes("no") || e.label?.toLowerCase().includes("false")));
        const skipTargetId = passed ? noEdge?.target : yesEdge?.target;
        if (skipTargetId) {
          const skipIdx = orderedNodeIds.indexOf(skipTargetId);
          if (skipIdx >= 0 && newSteps[skipIdx]) {
            newSteps[skipIdx] = { ...newSteps[skipIdx], status: "skipped" };
          }
        }
      }

      stepOutputsRef.current[nodeId] = output;
      if (node.type === "trigger") {
        stepOutputsRef.current["trigger"] = output;
      }

      newSteps[idx] = {
        nodeId,
        status: "success",
        input,
        resolvedInputs,
        output,
        durationMs: duration,
        startedAt: new Date().toISOString(),
      };

      return newSteps;
    },
    [orderedNodeIds, workflow, buildCtx],
  );

  const runAll = useCallback(() => {
    const initial: StepRunLog[] = initSteps();
    setSteps(initial);
    setCurrentStepIdx(0);
    setMode("running");
    onHighlightNode(orderedNodeIds[0] ?? null);

    let idx = 0;
    let currentSteps: StepRunLog[] = initial;

    function tick() {
      if (idx >= orderedNodeIds.length) {
        const hasFail = currentSteps.some((s: StepRunLog) => s.status === "failure");
        setMode("complete");
        onHighlightNode(null);
        const run: ExecutionRun = {
          id: `run-${Date.now()}`,
          status: hasFail ? "failure" : "success",
          startedAt: new Date(Date.now() - orderedNodeIds.length * 400).toISOString(),
          endedAt: new Date().toISOString(),
          trigger: "manual",
          environment,
          steps: currentSteps,
        };
        setRuns((prev: ExecutionRun[]) => [run, ...prev].slice(0, 20));
        return;
      }

      const step: StepRunLog | undefined = currentSteps[idx];
      if (step && step.status === "skipped") {
        idx++;
        setCurrentStepIdx(idx);
        onHighlightNode(orderedNodeIds[idx] ?? null);
        timerRef.current = setTimeout(tick, 150);
        return;
      }

      currentSteps = [...currentSteps];
      const runningStep: StepRunLog = { ...(currentSteps[idx] ?? { nodeId: orderedNodeIds[idx], status: "pending" }), status: "running" };
      currentSteps[idx] = runningStep;
      setSteps([...currentSteps]);
      onHighlightNode(orderedNodeIds[idx]);

      timerRef.current = setTimeout(() => {
        currentSteps = advanceStep(currentSteps, idx);
        setSteps([...currentSteps]);
        idx++;
        setCurrentStepIdx(idx);
        timerRef.current = setTimeout(tick, 200);
      }, 300 + Math.random() * 500);
    }

    tick();
  }, [initSteps, orderedNodeIds, advanceStep, onHighlightNode, environment]);

  const stepOnce = useCallback(() => {
    if (currentStepIdx < 0 || currentStepIdx >= orderedNodeIds.length) return;

    let newSteps: StepRunLog[] = [...steps];
    if (newSteps[currentStepIdx]?.status === "skipped") {
      setCurrentStepIdx((i) => i + 1);
      onHighlightNode(orderedNodeIds[currentStepIdx + 1] ?? null);
      return;
    }

    const runStep: StepRunLog = { ...(newSteps[currentStepIdx] ?? { nodeId: orderedNodeIds[currentStepIdx], status: "pending" }), status: "running" };
    newSteps[currentStepIdx] = runStep;
    setSteps(newSteps);
    onHighlightNode(orderedNodeIds[currentStepIdx]);

    setTimeout(() => {
      newSteps = advanceStep(newSteps, currentStepIdx);
      setSteps(newSteps);
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      onHighlightNode(orderedNodeIds[nextIdx] ?? null);
      if (nextIdx >= orderedNodeIds.length) {
        setMode("complete");
        onHighlightNode(null);
        const hasFail = newSteps.some((s: StepRunLog) => s.status === "failure");
        const completeRun: ExecutionRun = {
          id: `run-${Date.now()}`,
          status: hasFail ? "failure" : "success",
          startedAt: new Date(Date.now() - 5000).toISOString(),
          endedAt: new Date().toISOString(),
          trigger: "manual_step",
          environment,
          steps: newSteps,
        };
        setRuns((prev: ExecutionRun[]) => [completeRun, ...prev].slice(0, 20));
      }
    }, 400);
  }, [steps, currentStepIdx, orderedNodeIds, advanceStep, onHighlightNode, environment]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSteps([]);
    setCurrentStepIdx(-1);
    setMode("idle");
    onHighlightNode(null);
  }, [onHighlightNode]);

  return (
    <div className="flex h-full flex-col border-l border-border bg-white" style={{ width: 340 }}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          {showHistory ? "Run History" : "Test Runner"}
        </h3>
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50"
        >
          {showHistory ? <FlaskConical className="h-3 w-3" /> : <History className="h-3 w-3" />}
          {showHistory ? "Test Runner" : `History (${runs.length})`}
        </button>
      </div>

      {!showHistory ? (
        <>
          {/* Environment Picker */}
          <div className="border-b border-border px-4 py-2">
            <div className="flex rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setEnvironment("sandbox")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-l-lg py-1.5 text-[11px] font-medium transition-colors ${
                  environment === "sandbox" ? "bg-amber-50 text-amber-700" : "text-muted-foreground hover:bg-slate-50"
                }`}
              >
                <FlaskConical className="h-3 w-3" /> Sandbox
              </button>
              <button
                type="button"
                onClick={() => setEnvironment("production")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-r-lg border-l border-border py-1.5 text-[11px] font-medium transition-colors ${
                  environment === "production" ? "bg-emerald-50 text-emerald-700" : "text-muted-foreground hover:bg-slate-50"
                }`}
              >
                <Rocket className="h-3 w-3" /> Production
              </button>
            </div>
            {environment === "production" && (
              <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-amber-600">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>Production runs will use real data and trigger actual actions.</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            {mode === "idle" || mode === "complete" ? (
              <>
                <button
                  type="button"
                  onClick={runAll}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                >
                  <Play className="h-3 w-3" /> Run All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const init = initSteps();
                    setSteps(init);
                    setCurrentStepIdx(0);
                    setMode("paused");
                    onHighlightNode(orderedNodeIds[0] ?? null);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-slate-50"
                >
                  <StepForward className="h-3 w-3" /> Step Through
                </button>
              </>
            ) : mode === "running" ? (
              <button
                type="button"
                onClick={() => {
                  if (timerRef.current) clearTimeout(timerRef.current);
                  setMode("paused");
                }}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-600"
              >
                <Pause className="h-3 w-3" /> Pause
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={stepOnce}
                  disabled={currentStepIdx >= orderedNodeIds.length}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  <StepForward className="h-3 w-3" /> Next Step
                </button>
                <button
                  type="button"
                  onClick={runAll}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-slate-50"
                >
                  <Play className="h-3 w-3" /> Resume
                </button>
              </>
            )}
            {mode !== "idle" && (
              <button
                type="button"
                onClick={reset}
                className="ml-auto rounded p-1.5 text-muted-foreground hover:bg-slate-100"
                title="Reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Steps List */}
          <div className="flex-1 overflow-y-auto">
            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <Play className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-xs font-medium text-muted-foreground">Click &quot;Run All&quot; or &quot;Step Through&quot; to simulate execution</p>
                <p className="mt-1 text-[10px] text-gray-400">Mock data will flow through each node</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {steps.map((step, i) => {
                  const node = workflow.nodes.find((n) => n.id === step.nodeId);
                  if (!node) return null;
                  const Icon = STATUS_ICON[step.status];
                  const isExpanded = expandedStep === step.nodeId;
                  const hasData = step.input || step.output || step.error || step.resolvedInputs;
                  return (
                    <div
                      key={step.nodeId}
                      className={`transition-colors ${
                        step.status === "running"
                          ? "bg-indigo-50/50"
                          : step.status === "failure"
                            ? "bg-red-50/30"
                            : step.status === "error_handled"
                              ? "bg-amber-50/40"
                              : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-slate-50/50"
                        onClick={() => {
                          setExpandedStep(isExpanded ? null : step.nodeId);
                          onHighlightNode(step.nodeId);
                        }}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${STATUS_COLOR[step.status]}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-foreground">{node.label}</p>
                          <div className="flex items-center gap-2">
                            {step.durationMs != null && (
                              <p className="text-[10px] text-muted-foreground">{step.durationMs}ms</p>
                            )}
                            {step.status === "error_handled" && (
                              <span className="text-[9px] font-semibold text-amber-600">on-error path</span>
                            )}
                          </div>
                        </div>
                        {hasData && (
                          isExpanded
                            ? <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" />
                            : <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
                        )}
                      </button>
                      {isExpanded && hasData && (
                        <div className="border-t border-dashed border-gray-200 bg-slate-50/50 px-4 py-2.5">
                          {step.error && (
                            <div className="mb-2 rounded bg-red-100 px-2.5 py-1.5 text-[10px] font-medium text-red-700">
                              {step.errorCode && <span className="mr-1 rounded bg-red-200 px-1 font-mono text-[8px]">{step.errorCode}</span>}
                              {step.error}
                            </div>
                          )}
                          {step.resolvedInputs && Object.keys(step.resolvedInputs).length > 0 && (
                            <div className="mb-2">
                              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-indigo-500">Resolved formulas</p>
                              <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-indigo-50 p-2 font-mono text-[10px] text-indigo-800">
                                {JSON.stringify(step.resolvedInputs, null, 2)}
                              </pre>
                            </div>
                          )}
                          {step.input && Object.keys(step.input).length > 0 && (
                            <div className="mb-2">
                              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">Input</p>
                              <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-white p-2 font-mono text-[10px] text-gray-700">
                                {JSON.stringify(step.input, null, 2)}
                              </pre>
                            </div>
                          )}
                          {step.output && (
                            <div>
                              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">Output</p>
                              <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-white p-2 font-mono text-[10px] text-gray-700">
                                {JSON.stringify(step.output, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary */}
          {mode === "complete" && (
            <div className="border-t border-border px-4 py-3">
              {steps.some((s) => s.status === "failure") ? (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-[11px] font-semibold text-red-800">
                      Failed — {steps.filter((s) => s.status === "failure").length} step(s) errored
                    </p>
                    <p className="text-[10px] text-red-600">
                      Total: {steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0)}ms
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-800">All steps passed</p>
                    <p className="text-[10px] text-emerald-600">
                      Total: {steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0)}ms ·{" "}
                      {steps.filter((s) => s.status === "success").length} success ·{" "}
                      {steps.filter((s) => s.status === "skipped").length} skipped
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Run History */
        <div className="flex-1 overflow-y-auto">
          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <History className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-xs font-medium text-muted-foreground">No runs yet</p>
              <p className="mt-1 text-[10px] text-gray-400">Execute the workflow to see history here</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {runs.map((run) => {
                const successCount = run.steps.filter((s) => s.status === "success").length;
                const failCount = run.steps.filter((s) => s.status === "failure").length;
                return (
                  <div key={run.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {run.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-foreground">
                          {run.status === "success" ? "Passed" : "Failed"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(run.startedAt).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          run.environment === "sandbox"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {run.environment}
                      </span>
                    </div>
                    <div className="mt-1.5 flex gap-3 text-[10px]">
                      <span className="text-emerald-600">{successCount} passed</span>
                      {failCount > 0 && <span className="text-red-600">{failCount} failed</span>}
                      <span className="text-gray-400">
                        {run.steps.reduce((s, st) => s + (st.durationMs ?? 0), 0)}ms total
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

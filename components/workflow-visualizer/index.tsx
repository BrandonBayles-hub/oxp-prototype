"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  addEdge,
  type NodeTypes,
  type EdgeTypes,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomWorkflowNode } from "./custom-nodes";
import { InsertableEdge, type InsertStepType } from "./insertable-edge";
import { workflowToReactFlow } from "./layout";
import type { GeneratedWorkflow, WorkflowNodeData } from "./types";
import { generateWorkflow } from "@/lib/workflow-generator";
import { NodeConfigPanel } from "./node-config-panel";
import { ExecutionPanel } from "./execution-panel";
import {
  Send,
  Loader2,
  Sparkles,
  Check,
  RefreshCw,
  Zap,
  Cog,
  GitBranch,
  Repeat,
  Clock,
  CircleCheckBig,
  Play,
} from "lucide-react";

const nodeTypes: NodeTypes = { workflowNode: CustomWorkflowNode };
const edgeTypes: EdgeTypes = { insertable: InsertableEdge };

const PALETTE_ITEMS: Array<{ type: WorkflowNodeData["type"]; label: string; icon: typeof Zap }> = [
  { type: "action", label: "Action", icon: Cog },
  { type: "condition", label: "Condition", icon: GitBranch },
  { type: "loop", label: "Loop", icon: Repeat },
  { type: "delay", label: "Delay", icon: Clock },
  { type: "end", label: "End", icon: CircleCheckBig },
];

interface WorkflowVisualizerProps {
  workflow: GeneratedWorkflow;
  onWorkflowChange?: (workflow: GeneratedWorkflow) => void;
  prompt?: string;
  showIteratePanel?: boolean;
  onIterationRequest?: (changeRequest: string) => Promise<"proceed" | "convert">;
}

function WorkflowCanvas({
  workflow,
  onWorkflowChange,
  prompt,
  showIteratePanel = true,
  onIterationRequest,
}: WorkflowVisualizerProps) {
  const { fitView, screenToFlowPosition } = useReactFlow();

  // Stable ref so layout edges and insert handlers always call the latest insert fn
  const handleInsertStepRef = useRef<
    (edgeId: string, source: string, target: string, type: InsertStepType) => void
  >(() => {});

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () =>
      workflowToReactFlow(workflow, {
        onInsert: (edgeId, source, target, type) =>
          handleInsertStepRef.current(edgeId, source, target, type),
      }),
    [workflow],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<"none" | "config" | "execution">("none");
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);

  const internalEditRef = useRef(false);
  const [changeRequest, setChangeRequest] = useState("");
  const [isIterating, setIsIterating] = useState(false);
  const [rebuildPhase, setRebuildPhase] = useState<"idle" | "analyzing" | "redesigning" | "done">("idle");
  const [iterationHistory, setIterationHistory] = useState<Array<{ request: string; timestamp: string }>>([]);

  const prevWorkflowRef = useRef(workflow);
  useEffect(() => {
    if (prevWorkflowRef.current !== workflow) {
      const isInternalEdit = internalEditRef.current;
      internalEditRef.current = false;
      prevWorkflowRef.current = workflow;
      setNodes(layoutNodes);
      setEdges(layoutEdges);
      if (!isInternalEdit) {
        setSelectedNodeId(null);
        setTimeout(() => fitView({ padding: 0.3, maxZoom: 1, duration: 600 }), 50);
      }
    }
  }, [workflow, layoutNodes, layoutEdges, setNodes, setEdges, fitView]);

  useEffect(() => {
    if (!highlightedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, highlighted: n.id === highlightedNodeId },
      })),
    );
    return () => {
      setNodes((nds) =>
        nds.map((n) => ({ ...n, data: { ...n.data, highlighted: false } })),
      );
    };
  }, [highlightedNodeId, setNodes]);

  const syncWorkflow = useCallback(
    (updatedNodes: Node[], updatedEdges: Record<string, unknown>[]) => {
      if (!onWorkflowChange) return;
      const wfNodes = updatedNodes.map((n) => {
        const d = n.data as Record<string, unknown>;
        return {
          id: n.id,
          type: (d.type as WorkflowNodeData["type"]) ?? "action",
          label: (d.label as string) ?? "",
          description: (d.description as string) ?? "",
          mcpTool: d.mcpTool as string | undefined,
          mcpServer: d.mcpServer as string | undefined,
          config: d.config as Record<string, string> | undefined,
          retryPolicy: d.retryPolicy as WorkflowNodeData["retryPolicy"],
          timeout: d.timeout as number | undefined,
          inputMappings: d.inputMappings as WorkflowNodeData["inputMappings"],
          outputFields: d.outputFields as WorkflowNodeData["outputFields"],
          errorPath: d.errorPath as WorkflowNodeData["errorPath"],
          errorTargetId: d.errorTargetId as string | undefined,
        };
      });
      const wfEdges = updatedEdges.map((e) => ({
        id: e.id as string,
        source: e.source as string,
        target: e.target as string,
        label: typeof e.label === "string" ? e.label : undefined,
        isErrorPath: Boolean((e.data as { isErrorPath?: boolean } | undefined)?.isErrorPath) ||
          (typeof e.label === "string" && e.label.toLowerCase().includes("error")),
      }));
      onWorkflowChange({
        ...workflow,
        id: workflow.id ?? `wf-${workflow.name.toLowerCase().replace(/\s+/g, "-").slice(0, 24)}`,
        nodes: wfNodes,
        edges: wfEdges,
      });
    },
    [onWorkflowChange, workflow],
  );

  const handleInsertStep = useCallback(
    (edgeId: string, source: string, target: string, type: InsertStepType) => {
      internalEditRef.current = true;
      const newId = `${type}-${Date.now()}`;
      const labels: Record<InsertStepType, string> = {
        action: "New Action",
        condition: "New Condition",
        loop: "New Loop",
      };
      const newNodeBase: Node = {
        id: newId,
        type: "workflowNode",
        position: { x: 0, y: 0 },
        zIndex: 1000,
        selected: true,
        data: {
          type,
          label: labels[type],
          description: type === "condition"
            ? "Configure a yes/no condition"
            : type === "loop"
              ? "Iterate over a collection"
              : "Configure this action",
        } satisfies Record<string, unknown>,
      };

      setNodes((nds) => {
        const sourceNode = nds.find((n) => n.id === source);
        const targetNode = nds.find((n) => n.id === target);
        const midX = ((sourceNode?.position.x ?? 0) + (targetNode?.position.x ?? 0)) / 2;
        // Offset slightly so the new step doesn't sit under either neighbor
        const midY =
          ((sourceNode?.position.y ?? 0) + (targetNode?.position.y ?? 0)) / 2 + 8;
        const placed = { ...newNodeBase, position: { x: midX, y: midY } };

        setEdges((eds) => {
          const remaining = eds.filter((e) => e.id !== edgeId);
          const oldEdge = eds.find((e) => e.id === edgeId);
          const edge1 = {
            id: `e-${source}-${newId}`,
            source,
            target: newId,
            type: "insertable" as const,
            animated: true,
            style: { stroke: "#94a3b8", strokeWidth: 2 },
            label: oldEdge?.label,
            data: {
              onInsert: (eid: string, s: string, t: string, ty: InsertStepType) =>
                handleInsertStepRef.current(eid, s, t, ty),
            },
          };
          const edge2 = {
            id: `e-${newId}-${target}`,
            source: newId,
            target,
            type: "insertable" as const,
            animated: true,
            style: { stroke: "#94a3b8", strokeWidth: 2 },
            data: {
              onInsert: (eid: string, s: string, t: string, ty: InsertStepType) =>
                handleInsertStepRef.current(eid, s, t, ty),
            },
            ...(type === "condition" ? { sourceHandle: "yes", label: "Yes" } : {}),
          };
          const updated = [...remaining, edge1, edge2];
          const updatedNodes = [...nds, placed];
          setTimeout(() => syncWorkflow(updatedNodes, updated), 0);
          return updated;
        });
        return [...nds, placed];
      });
      setSelectedNodeId(newId);
      setRightPanel("config");
      // Bring the new step into view so it isn't hidden under neighbors
      setTimeout(() => {
        fitView({ nodes: [{ id: newId }], padding: 0.45, duration: 300, maxZoom: 1.1 });
      }, 50);
    },
    [setNodes, setEdges, syncWorkflow, fitView],
  );

  handleInsertStepRef.current = handleInsertStep;

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        ...connection,
        id: `e-${Date.now()}`,
        type: "insertable" as const,
        animated: true,
        style: { stroke: "#94a3b8", strokeWidth: 2 },
        data: {
          onInsert: (eid: string, s: string, t: string, ty: InsertStepType) =>
            handleInsertStepRef.current(eid, s, t, ty),
        },
      };
      // @ts-expect-error -- addEdge returns Edge[] which is wider than the inferred edge state type
      setEdges((eds: Edge[]) => {
        const updated = addEdge(newEdge, eds);
        setTimeout(() => syncWorkflow(nodes, updated), 0);
        return updated;
      });
    },
    [setEdges, nodes, syncWorkflow],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setRightPanel("config");
  }, []);

  const handleEnsureErrorBranch = useCallback(
    (sourceNodeId: string) => {
      internalEditRef.current = true;
      const existing = workflow.nodes.find((n) => n.id === `error-handler-${sourceNodeId}`);
      if (existing) {
        setNodes((nds) => {
          const updated = nds.map((n) =>
            n.id === sourceNodeId
              ? { ...n, data: { ...n.data, errorPath: "branch", errorTargetId: existing.id } }
              : n,
          );
          setTimeout(() => syncWorkflow(updated, edges), 0);
          return updated;
        });
        return;
      }

      const errorNodeId = `error-handler-${sourceNodeId}`;
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      const errorNode: Node = {
        id: errorNodeId,
        type: "workflowNode",
        position: {
          x: (sourceNode?.position.x ?? 0) + 320,
          y: (sourceNode?.position.y ?? 0) + 40,
        },
        data: {
          type: "action",
          label: "On Error Handler",
          description: "Handle failure — error.* pills are available here",
          config: {},
        } satisfies Record<string, unknown>,
      };

      setNodes((nds) => {
        const updated = [
          ...nds.map((n) =>
            n.id === sourceNodeId
              ? { ...n, data: { ...n.data, errorPath: "branch", errorTargetId: errorNodeId } }
              : n,
          ),
          errorNode,
        ];
        setEdges((eds) => {
          const hasEdge = eds.some((e) => e.source === sourceNodeId && e.target === errorNodeId);
          const updatedEdges = hasEdge
            ? eds
            : [
                ...eds,
                {
                  id: `e-${sourceNodeId}-error-${errorNodeId}`,
                  source: sourceNodeId,
                  target: errorNodeId,
                  sourceHandle: "on-error",
                  label: "on-error",
                  type: "insertable" as const,
                  animated: false,
                  style: { stroke: "#f87171", strokeWidth: 2 },
                  data: {
                    isErrorPath: true,
                    onInsert: (eid: string, s: string, t: string, ty: InsertStepType) =>
                      handleInsertStepRef.current(eid, s, t, ty),
                  },
                },
              ];
          setTimeout(() => syncWorkflow(updated, updatedEdges), 0);
          return updatedEdges;
        });
        return updated;
      });
    },
    [workflow.nodes, nodes, edges, setNodes, setEdges, syncWorkflow],
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, patch: Partial<WorkflowNodeData>) => {
      internalEditRef.current = true;
      setNodes((nds) => {
        const updated = nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
        );
        setTimeout(() => syncWorkflow(updated, edges), 0);
        return updated;
      });
    },
    [setNodes, edges, syncWorkflow],
  );

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const updated = nds.filter((n) => n.id !== nodeId);
        setEdges((eds) => {
          const updEdges = eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
          setTimeout(() => syncWorkflow(updated, updEdges), 0);
          return updEdges;
        });
        return updated;
      });
      setSelectedNodeId(null);
      setRightPanel("none");
    },
    [setNodes, setEdges, syncWorkflow],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const typeStr = event.dataTransfer.getData("application/workflow-node-type");
      if (!typeStr) return;
      const nodeType = typeStr as WorkflowNodeData["type"];

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newId = `${nodeType}-${Date.now()}`;
      const newNode: Node = {
        id: newId,
        type: "workflowNode",
        position,
        data: {
          type: nodeType,
          label: `New ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}`,
          description: "Configure this step",
        } satisfies Record<string, unknown>,
      };

      setNodes((nds) => {
        const updated = [...nds, newNode];
        setTimeout(() => syncWorkflow(updated, edges), 0);
        return updated;
      });
      setSelectedNodeId(newId);
      setRightPanel("config");
    },
    [screenToFlowPosition, setNodes, edges, syncWorkflow],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleIterate = useCallback(async () => {
    if (!changeRequest.trim() || !onWorkflowChange || !prompt) return;

    if (onIterationRequest) {
      setIsIterating(true);
      setRebuildPhase("analyzing");
      try {
        const verdict = await onIterationRequest(changeRequest.trim());
        if (verdict === "convert") {
          setIsIterating(false);
          setRebuildPhase("idle");
          return;
        }
      } catch {
        // If routing check fails, proceed with the iteration anyway
      }
    }

    setIsIterating(true);
    setRebuildPhase("analyzing");
    const rebuildTimer = setTimeout(() => setRebuildPhase("redesigning"), 1500);

    try {
      const result = await generateWorkflow(prompt, workflow, changeRequest.trim());
      clearTimeout(rebuildTimer);
      setRebuildPhase("done");
      if (result.workflow) {
        onWorkflowChange(result.workflow);
        setIterationHistory((prev) => [...prev, { request: changeRequest.trim(), timestamp: new Date().toLocaleTimeString() }]);
        setChangeRequest("");
      }
      setTimeout(() => setRebuildPhase("idle"), 2000);
    } catch (err) {
      console.error("Failed to iterate workflow:", err);
      clearTimeout(rebuildTimer);
      setRebuildPhase("idle");
    } finally {
      setIsIterating(false);
    }
  }, [changeRequest, workflow, prompt, onWorkflowChange, onIterationRequest]);

  const selectedNodeData = selectedNodeId
    ? (nodes.find((n) => n.id === selectedNodeId)?.data as unknown as WorkflowNodeData | undefined)
    : undefined;

  const onEdgesDelete = useCallback(
    (deletedEdges: typeof edges) => {
      setEdges((eds) => {
        const delIds = new Set(deletedEdges.map((e) => e.id));
        const updated = eds.filter((e) => !delIds.has(e.id));
        setTimeout(() => syncWorkflow(nodes, updated), 0);
        return updated;
      });
    },
    [setEdges, nodes, syncWorkflow],
  );

  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const delIds = new Set(deletedNodes.map((n) => n.id));
      setNodes((nds) => {
        const updated = nds.filter((n) => !delIds.has(n.id));
        setEdges((eds) => {
          const updEdges = eds.filter((e) => !delIds.has(e.source) && !delIds.has(e.target));
          setTimeout(() => syncWorkflow(updated, updEdges), 0);
          return updEdges;
        });
        return updated;
      });
      if (selectedNodeId && delIds.has(selectedNodeId)) {
        setSelectedNodeId(null);
        setRightPanel("none");
      }
    },
    [setNodes, setEdges, syncWorkflow, selectedNodeId],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Node Palette Sidebar */}
        <div className="flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-border bg-slate-50/80 py-2">
          <p className="mb-1 text-[8px] font-bold uppercase tracking-widest text-gray-400">Nodes</p>
          {PALETTE_ITEMS.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/workflow-node-type", item.type);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="group flex cursor-grab flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white hover:shadow-sm active:cursor-grabbing"
              title={`Drag to add ${item.label} node`}
            >
              <item.icon className="h-4 w-4 text-gray-500 group-hover:text-indigo-600" />
              <span className="text-[8px] font-medium text-gray-400 group-hover:text-indigo-600">{item.label}</span>
            </div>
          ))}
          <div className="my-1 h-px w-8 bg-gray-200" />
          <button
            type="button"
            onClick={() => setRightPanel(rightPanel === "execution" ? "none" : "execution")}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 transition-colors ${
              rightPanel === "execution" ? "bg-emerald-100 text-emerald-700" : "text-gray-500 hover:bg-white hover:shadow-sm"
            }`}
            title="Test Runner"
          >
            <Play className="h-4 w-4" />
            <span className="text-[8px] font-medium">Test</span>
          </button>
        </div>

        {/* Canvas */}
        <div className="relative flex-1" style={{ minHeight: 400 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
            proOptions={{ hideAttribution: true }}
            className="bg-slate-50/50"
            minZoom={0.2}
            maxZoom={1.5}
            deleteKeyCode={["Backspace", "Delete"]}
            connectionLineStyle={{ stroke: "#6366f1", strokeWidth: 2, strokeDasharray: "5 5" }}
            defaultEdgeOptions={{
              type: "insertable",
              animated: true,
              style: { stroke: "#94a3b8", strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
            <Controls showInteractive={false} className="!rounded-lg !border-border !shadow-sm" />
            <MiniMap
              nodeColor={(n) => {
                const d = n.data as { type?: string };
                switch (d?.type) {
                  case "trigger": return "#f59e0b";
                  case "condition": return "#3b82f6";
                  case "action": return "#10b981";
                  case "loop": return "#8b5cf6";
                  case "delay": return "#f97316";
                  case "end": return "#6b7280";
                  default: return "#94a3b8";
                }
              }}
              className="!rounded-lg !border-border !shadow-sm"
              maskColor="rgba(248, 250, 252, 0.7)"
            />
          </ReactFlow>

          {/* Legend */}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-border bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
            {([
              { color: "bg-amber-400", label: "Trigger" },
              { color: "bg-emerald-400", label: "Action" },
              { color: "bg-blue-400", label: "Condition" },
              { color: "bg-purple-400", label: "Loop" },
              { color: "bg-orange-400", label: "Delay" },
              { color: "bg-gray-400", label: "End" },
            ]).map((item, i) => (
              <div key={item.label} className="flex items-center gap-1.5">
                {i > 0 && <div className="h-3 w-px bg-gray-200" />}
                <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                <span className="text-[10px] font-medium text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Drag hint */}
          <div className="absolute bottom-3 left-3 rounded-lg border border-border bg-white/90 px-2.5 py-1.5 text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm">
            Drag nodes from palette · Click <span className="font-semibold text-indigo-600">+</span> on edges to insert · Click node to configure · Backspace to delete
          </div>

          {/* Rebuild overlay */}
          {rebuildPhase !== "idle" && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
              <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl border border-border bg-white px-8 py-6 shadow-lg">
                {rebuildPhase === "done" ? (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-6 w-6 text-emerald-600" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {rebuildPhase === "analyzing" && "Analyzing your changes..."}
                    {rebuildPhase === "redesigning" && "Redesigning workflow..."}
                    {rebuildPhase === "done" && "Workflow updated"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {rebuildPhase === "analyzing" && "Understanding how to incorporate your request"}
                    {rebuildPhase === "redesigning" && "Rebuilding the workflow graph with your changes"}
                    {rebuildPhase === "done" && "Your changes have been applied to the workflow"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Config or Execution */}
        {rightPanel === "config" && selectedNodeId && selectedNodeData && (
          <NodeConfigPanel
            nodeId={selectedNodeId}
            data={selectedNodeData}
            workflow={workflow}
            onUpdate={handleNodeUpdate}
            onDelete={handleNodeDelete}
            onEnsureErrorBranch={handleEnsureErrorBranch}
            onClose={() => { setRightPanel("none"); setSelectedNodeId(null); }}
          />
        )}
        {rightPanel === "execution" && (
          <ExecutionPanel
            workflow={workflow}
            onHighlightNode={setHighlightedNodeId}
          />
        )}
      </div>

      {/* NLP Iterate Panel */}
      {showIteratePanel && onWorkflowChange && (
        <div className="border-t border-border bg-white px-4 py-3">
          {iterationHistory.length > 0 && (
            <div className="mb-2 space-y-1">
              {iterationHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md bg-slate-50 px-2.5 py-1.5">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                  <span className="text-[11px] text-slate-600">{h.request}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-slate-400">{h.timestamp}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-indigo-400" />
            <input
              type="text"
              value={changeRequest}
              onChange={(e) => setChangeRequest(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleIterate(); } }}
              placeholder="Describe changes to this workflow in natural language..."
              className="flex-1 rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
              disabled={isIterating}
            />
            <button
              type="button"
              onClick={handleIterate}
              disabled={isIterating || !changeRequest.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
            >
              {isIterating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Ask for changes like &quot;add an SMS notification step&quot; or &quot;add a condition to check if the balance is overdue&quot;
          </p>
        </div>
      )}
    </div>
  );
}

export default function WorkflowVisualizer(props: WorkflowVisualizerProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  );
}

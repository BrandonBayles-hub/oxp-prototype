import type { Node, Edge } from "@xyflow/react";
import type { GeneratedWorkflow, WorkflowNodeData } from "./types";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 110;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 80;

interface LayoutNode {
  id: string;
  depth: number;
  column: number;
  children: string[];
}

export function workflowToReactFlow(
  workflow: GeneratedWorkflow,
  opts?: {
    onInsert?: (edgeId: string, source: string, target: string, type: Extract<WorkflowNodeData["type"], "action" | "loop" | "condition">) => void;
  },
): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodeMap = new Map<string, typeof workflow.nodes[0]>();
  for (const n of workflow.nodes) nodeMap.set(n.id, n);

  const childrenMap = new Map<string, Array<{ target: string; label?: string; isErrorPath?: boolean }>>();

  for (const e of workflow.edges) {
    const list = childrenMap.get(e.source) ?? [];
    list.push({ target: e.target, label: e.label, isErrorPath: e.isErrorPath });
    childrenMap.set(e.source, list);
  }

  const triggerNode = workflow.nodes.find((n) => n.type === "trigger");
  if (!triggerNode) {
    return { nodes: [], edges: [] };
  }

  const layoutNodes = new Map<string, LayoutNode>();
  const depthColumns = new Map<number, number>();

  function assignPositions(nodeId: string, depth: number, visited = new Set<string>()) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const existing = layoutNodes.get(nodeId);
    if (existing && existing.depth <= depth) return;

    const col = depthColumns.get(depth) ?? 0;
    depthColumns.set(depth, col + 1);

    const children = (childrenMap.get(nodeId) ?? []).map((c) => c.target);
    layoutNodes.set(nodeId, { id: nodeId, depth, column: col, children });

    for (const child of children) {
      assignPositions(child, depth + 1, visited);
    }
  }

  assignPositions(triggerNode.id, 0);

  for (const n of workflow.nodes) {
    if (!layoutNodes.has(n.id)) {
      const col = depthColumns.get(0) ?? 0;
      depthColumns.set(0, col + 1);
      layoutNodes.set(n.id, { id: n.id, depth: 0, column: col, children: [] });
    }
  }

  const maxColPerDepth = new Map<number, number>();
  for (const ln of layoutNodes.values()) {
    const cur = maxColPerDepth.get(ln.depth) ?? 0;
    maxColPerDepth.set(ln.depth, Math.max(cur, ln.column + 1));
  }

  const rfNodes: Node[] = [];
  for (const ln of layoutNodes.values()) {
    const raw = nodeMap.get(ln.id);
    if (!raw) continue;

    const totalCols = maxColPerDepth.get(ln.depth) ?? 1;
    const totalWidth = totalCols * NODE_WIDTH + (totalCols - 1) * HORIZONTAL_GAP;
    const startX = -totalWidth / 2;

    const x = startX + ln.column * (NODE_WIDTH + HORIZONTAL_GAP);
    const y = ln.depth * (NODE_HEIGHT + VERTICAL_GAP);

    const nodeData: Record<string, unknown> = {
      type: raw.type,
      label: raw.label,
      description: raw.description,
      mcpTool: raw.mcpTool,
      mcpServer: raw.mcpServer,
      config: raw.config,
      retryPolicy: raw.retryPolicy,
      timeout: raw.timeout,
      inputMappings: raw.inputMappings,
      outputFields: raw.outputFields,
      errorPath: raw.errorPath,
      errorTargetId: raw.errorTargetId,
    };

    rfNodes.push({
      id: raw.id,
      type: "workflowNode",
      position: { x, y },
      data: nodeData,
    });
  }

  const rfEdges: Edge[] = workflow.edges.map((e) => {
    const sourceNode = nodeMap.get(e.source);
    const isCondition = sourceNode?.type === "condition";
    const isErrorPath =
      e.isErrorPath ||
      (typeof e.label === "string" && e.label.toLowerCase().includes("error"));

    let sourceHandle: string | undefined;
    if (isErrorPath) {
      sourceHandle = "on-error";
    } else if (isCondition) {
      const lbl = (e.label ?? "").toLowerCase();
      if (lbl.includes("yes") || lbl.includes("true")) sourceHandle = "yes";
      else if (lbl.includes("no") || lbl.includes("false")) sourceHandle = "no";
    }

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle,
      label: e.label,
      type: "insertable",
      animated: !isErrorPath,
      style: { stroke: isErrorPath ? "#f87171" : "#94a3b8", strokeWidth: 2 },
      data: {
        onInsert: opts?.onInsert,
        isErrorPath,
      },
    };
  });

  return { nodes: rfNodes, edges: rfEdges };
}

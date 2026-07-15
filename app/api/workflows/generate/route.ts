import { NextResponse } from "next/server";
import {
  callLiteLLM,
  isLiteLLMConfigured,
  type ChatMessage,
} from "@/lib/entrata-experts-v2/llm/litellm";
import {
  MCP_SERVER_CATALOG,
  type McpTool,
} from "@/components/custom-agent-builder/lib/mcp-server-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface WorkflowNode {
  id: string;
  type: "trigger" | "condition" | "action" | "loop" | "delay" | "end";
  label: string;
  description: string;
  mcpTool?: string;
  mcpServer?: string;
  config?: Record<string, string>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  dataSources: string[];
  triggers: string[];
}

function buildToolCatalogSummary(): string {
  return MCP_SERVER_CATALOG.map((server) => {
    const tools = server.tools
      .map(
        (t: McpTool) =>
          `  - ${t.id}: ${t.name} — ${t.description}${t.mutates ? " [WRITE]" : " [READ]"}${t.requiresApproval ? " [APPROVAL REQUIRED]" : ""}`,
      )
      .join("\n");
    return `## ${server.name} (${server.id})\n${server.description}\n${tools}`;
  }).join("\n\n");
}

const SYSTEM_PROMPT = `You are a deterministic workflow builder for Entrata, a property management platform.

Given a user's natural language description, generate a JSON workflow graph that can be visualized as a flowchart.

## Available MCP Tools (use these as actions in the workflow)
${buildToolCatalogSummary()}

## Output Format
Return a JSON object with this exact structure:
{
  "name": "Workflow name",
  "description": "One sentence description",
  "nodes": [
    {
      "id": "node-1",
      "type": "trigger",
      "label": "Short label",
      "description": "What this step does",
      "mcpTool": "leasing.search_leads",
      "mcpServer": "mcp.leasing",
      "config": { "key": "value" }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "label": "Optional edge label",
      "condition": "Optional condition expression"
    }
  ],
  "dataSources": ["Leases", "Resident records"],
  "triggers": ["Nightly at 2:00 AM"]
}

## Node Types
- "trigger": Entry point — schedule, event, or manual invocation
- "condition": Decision point with true/false branches
- "action": An MCP tool call or data operation
- "loop": Iterates over a collection
- "delay": Waits for a time period or event
- "end": Terminal node

## Rules
1. Every workflow starts with exactly one "trigger" node.
2. Use actual MCP tool IDs from the catalog above for action nodes.
3. Condition nodes must have exactly two outgoing edges — one labeled "Yes"/"True" and one labeled "No"/"False".
4. Loop nodes have an outgoing "Each item" edge and a "Done" edge.
5. End with one or more "end" nodes.
6. Keep workflows between 5–15 nodes for clarity.
7. Use descriptive labels that a property manager would understand.
8. Reference specific MCP tools by their exact id from the catalog.
9. Return ONLY the JSON object — no markdown, no explanation.`;

interface RequestBody {
  prompt: string;
  existingWorkflow?: GeneratedWorkflow;
  changeRequest?: string;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json(
      { ok: false, error: "Missing prompt." },
      { status: 400 },
    );
  }

  if (!isLiteLLMConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "not-configured", workflow: buildFallbackWorkflow(prompt, body.existingWorkflow, body.changeRequest) },
    );
  }

  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

  if (body.existingWorkflow && body.changeRequest) {
    messages.push({
      role: "user",
      content: `Here is the current workflow:\n\`\`\`json\n${JSON.stringify(body.existingWorkflow, null, 2)}\n\`\`\`\n\nOriginal request: ${prompt}\n\nPlease modify this workflow based on the following change request: ${body.changeRequest}\n\nReturn the complete updated workflow JSON.`,
    });
  } else {
    messages.push({
      role: "user",
      content: `Build a deterministic workflow for this request:\n\n${prompt}`,
    });
  }

  try {
    const result = await callLiteLLM(messages, {
      temperature: 0.1,
      maxTokens: 4000,
    });

    let workflow: GeneratedWorkflow;
    try {
      workflow = JSON.parse(result.content);
    } catch {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        workflow = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse workflow JSON from LLM response.");
      }
    }

    return NextResponse.json({
      ok: true,
      workflow,
      meta: { model: result.model, usage: result.usage ?? null },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        reason: "error",
        error,
        workflow: buildFallbackWorkflow(prompt, body.existingWorkflow, body.changeRequest),
      },
      { status: 502 },
    );
  }
}

function applyFallbackChange(
  existing: GeneratedWorkflow,
  changeRequest: string,
): GeneratedWorkflow {
  const lower = changeRequest.toLowerCase();
  const nextNodeId = `action-${Date.now()}`;
  const nextEdgeId = `e-${Date.now()}`;

  const endNodes = existing.nodes.filter((n) => n.type === "end");
  const nonEndNodes = existing.nodes.filter((n) => n.type !== "end");
  const edgesToEnd = existing.edges.filter((e) => endNodes.some((en) => en.id === e.target));
  const otherEdges = existing.edges.filter((e) => !edgesToEnd.some((ee) => ee.id === e.id));

  if (lower.includes("sms") || lower.includes("text message") || lower.includes("text notification")) {
    const smsNode: WorkflowNode = {
      id: nextNodeId,
      type: "action",
      label: "Send SMS Notification",
      description: "Send a text message notification to the relevant parties",
      mcpTool: "comms.send_sms",
      mcpServer: "mcp.communications",
    };
    const newEdges = edgesToEnd.map((e) => ({ ...e, target: nextNodeId }));
    const smsToEnd = endNodes.map((en, i) => ({
      id: `${nextEdgeId}-${i}`,
      source: nextNodeId,
      target: en.id,
    }));
    return {
      ...existing,
      description: `${existing.description} (+ SMS notification)`,
      nodes: [...nonEndNodes, smsNode, ...endNodes],
      edges: [...otherEdges, ...newEdges, ...smsToEnd],
    };
  }

  if (lower.includes("email") || lower.includes("email notification")) {
    const emailNode: WorkflowNode = {
      id: nextNodeId,
      type: "action",
      label: "Send Email Notification",
      description: "Send an email notification to the relevant parties",
      mcpTool: "comms.send_email",
      mcpServer: "mcp.communications",
    };
    const newEdges = edgesToEnd.map((e) => ({ ...e, target: nextNodeId }));
    const emailToEnd = endNodes.map((en, i) => ({
      id: `${nextEdgeId}-${i}`,
      source: nextNodeId,
      target: en.id,
    }));
    return {
      ...existing,
      description: `${existing.description} (+ email notification)`,
      nodes: [...nonEndNodes, emailNode, ...endNodes],
      edges: [...otherEdges, ...newEdges, ...emailToEnd],
    };
  }

  if (lower.includes("condition") || lower.includes("check") || lower.includes("if ")) {
    const condLabel = changeRequest.length > 40
      ? changeRequest.slice(0, 37) + "..."
      : changeRequest;
    const condNode: WorkflowNode = {
      id: `condition-${Date.now()}`,
      type: "condition",
      label: condLabel,
      description: `Evaluate: ${changeRequest}`,
    };
    const skipNode: WorkflowNode = {
      id: `${nextNodeId}-skip`,
      type: "action",
      label: "Log & Skip",
      description: "Record skipped items for manual review",
      mcpTool: "residents.post_note",
      mcpServer: "mcp.residents",
    };
    const skipEnd: WorkflowNode = {
      id: `end-skip-${Date.now()}`,
      type: "end",
      label: "Skipped",
      description: "Did not pass condition",
    };

    const firstActionIdx = existing.nodes.findIndex((n) => n.type === "action");
    const insertAfter = firstActionIdx >= 0 ? existing.nodes[firstActionIdx] : existing.nodes[0];
    const edgesFromInsert = existing.edges.filter((e) => e.source === insertAfter.id);
    const otherEdges2 = existing.edges.filter((e) => e.source !== insertAfter.id);

    const newEdges2 = [
      ...otherEdges2,
      { id: `${nextEdgeId}-tocond`, source: insertAfter.id, target: condNode.id },
      ...edgesFromInsert.map((e) => ({ ...e, source: condNode.id, label: "Yes" })),
      { id: `${nextEdgeId}-no`, source: condNode.id, target: skipNode.id, label: "No" },
      { id: `${nextEdgeId}-skipend`, source: skipNode.id, target: skipEnd.id },
    ];

    return {
      ...existing,
      description: `${existing.description} (+ condition check)`,
      nodes: [...existing.nodes, condNode, skipNode, skipEnd],
      edges: newEdges2,
    };
  }

  if (lower.includes("delay") || lower.includes("wait") || lower.includes("pause")) {
    const delayNode: WorkflowNode = {
      id: nextNodeId,
      type: "delay",
      label: "Wait Period",
      description: `Pause execution: ${changeRequest}`,
    };
    const newEdges = edgesToEnd.map((e) => ({ ...e, target: nextNodeId }));
    const delayToEnd = endNodes.map((en, i) => ({
      id: `${nextEdgeId}-${i}`,
      source: nextNodeId,
      target: en.id,
    }));
    return {
      ...existing,
      description: `${existing.description} (+ delay step)`,
      nodes: [...nonEndNodes, delayNode, ...endNodes],
      edges: [...otherEdges, ...newEdges, ...delayToEnd],
    };
  }

  if (lower.includes("approval") || lower.includes("review") || lower.includes("human")) {
    const approvalNode: WorkflowNode = {
      id: nextNodeId,
      type: "action",
      label: "Require Human Approval",
      description: `Wait for manual review before proceeding: ${changeRequest}`,
    };
    const newEdges = edgesToEnd.map((e) => ({ ...e, target: nextNodeId }));
    const approvalToEnd = endNodes.map((en, i) => ({
      id: `${nextEdgeId}-${i}`,
      source: nextNodeId,
      target: en.id,
    }));
    return {
      ...existing,
      description: `${existing.description} (+ human approval)`,
      nodes: [...nonEndNodes, approvalNode, ...endNodes],
      edges: [...otherEdges, ...newEdges, ...approvalToEnd],
    };
  }

  const genericNode: WorkflowNode = {
    id: nextNodeId,
    type: "action",
    label: changeRequest.length > 30 ? changeRequest.slice(0, 27) + "..." : changeRequest,
    description: changeRequest,
  };
  const newEdges = edgesToEnd.map((e) => ({ ...e, target: nextNodeId }));
  const genericToEnd = endNodes.map((en, i) => ({
    id: `${nextEdgeId}-${i}`,
    source: nextNodeId,
    target: en.id,
  }));
  return {
    ...existing,
    description: `${existing.description} (+ ${changeRequest.slice(0, 40)})`,
    nodes: [...nonEndNodes, genericNode, ...endNodes],
    edges: [...otherEdges, ...newEdges, ...genericToEnd],
  };
}

function buildFallbackWorkflow(
  prompt: string,
  existing?: GeneratedWorkflow,
  changeRequest?: string,
): GeneratedWorkflow {
  if (existing && changeRequest) {
    return applyFallbackChange(existing, changeRequest);
  }

  const lower = prompt.toLowerCase();

  if (lower.includes("renewal") || lower.includes("lease expir")) {
    return {
      name: "Lease Renewal Automation",
      description: "Scans expiring leases, calculates renewal offers, and sends to residents.",
      nodes: [
        { id: "trigger-1", type: "trigger", label: "Nightly Schedule", description: "Runs every night at 2:00 AM to check for expiring leases" },
        { id: "action-1", type: "action", label: "Get Expiring Leases", description: "Query leases expiring within 90-day window", mcpTool: "renewals.get_expiring_leases", mcpServer: "mcp.renewals" },
        { id: "loop-1", type: "loop", label: "For Each Lease", description: "Process each expiring lease individually" },
        { id: "action-2", type: "action", label: "Get Resident History", description: "Pull payment history and retention score", mcpTool: "renewals.get_resident_history", mcpServer: "mcp.renewals" },
        { id: "action-3", type: "action", label: "Get Market Rent", description: "Look up current market rent for this unit type", mcpTool: "renewals.get_market_rent", mcpServer: "mcp.renewals" },
        { id: "condition-1", type: "condition", label: "Retention Score > 70?", description: "Check if resident qualifies for preferred renewal rate" },
        { id: "action-4", type: "action", label: "Create Premium Offer", description: "Generate renewal offer at 3% below market rate", mcpTool: "renewals.create_renewal_offer", mcpServer: "mcp.renewals", config: { discount: "3%" } },
        { id: "action-5", type: "action", label: "Create Standard Offer", description: "Generate renewal offer at market rate", mcpTool: "renewals.create_renewal_offer", mcpServer: "mcp.renewals" },
        { id: "action-6", type: "action", label: "Send Renewal Email", description: "Email the renewal offer to the resident", mcpTool: "comms.send_email", mcpServer: "mcp.communications" },
        { id: "action-7", type: "action", label: "Log to Audit Trail", description: "Record the renewal action with full context", mcpTool: "residents.post_note", mcpServer: "mcp.residents" },
        { id: "end-1", type: "end", label: "Done", description: "Lease processed" },
        { id: "end-2", type: "end", label: "All Leases Processed", description: "Workflow complete" },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "action-1" },
        { id: "e2", source: "action-1", target: "loop-1" },
        { id: "e3", source: "loop-1", target: "action-2", label: "Each lease" },
        { id: "e4", source: "action-2", target: "action-3" },
        { id: "e5", source: "action-3", target: "condition-1" },
        { id: "e6", source: "condition-1", target: "action-4", label: "Yes", condition: "retentionScore > 70" },
        { id: "e7", source: "condition-1", target: "action-5", label: "No" },
        { id: "e8", source: "action-4", target: "action-6" },
        { id: "e9", source: "action-5", target: "action-6" },
        { id: "e10", source: "action-6", target: "action-7" },
        { id: "e11", source: "action-7", target: "end-1" },
        { id: "e12", source: "loop-1", target: "end-2", label: "Done" },
      ],
      dataSources: ["Leases", "Resident records", "Market rent data"],
      triggers: ["Nightly at 2:00 AM", "On lease expiration (< 90 days)"],
    };
  }

  if (lower.includes("maintenance") || lower.includes("work order")) {
    return {
      name: "Maintenance Triage Workflow",
      description: "Auto-triages incoming maintenance requests by urgency and dispatches vendors.",
      nodes: [
        { id: "trigger-1", type: "trigger", label: "New Work Order", description: "Triggered when a resident submits a maintenance request" },
        { id: "action-1", type: "action", label: "Get Work Order", description: "Retrieve the full work order details", mcpTool: "maintenance.get_work_order", mcpServer: "mcp.maintenance" },
        { id: "action-2", type: "action", label: "Check Problems Catalog", description: "Look up known issue patterns and solutions", mcpTool: "maintenance.get_problems_catalog", mcpServer: "mcp.maintenance" },
        { id: "condition-1", type: "condition", label: "Is Emergency?", description: "Check if issue is urgent (flood, fire, gas, lockout)" },
        { id: "action-3", type: "action", label: "Dispatch Emergency Vendor", description: "Immediately assign an emergency vendor", mcpTool: "maintenance.dispatch_vendor", mcpServer: "mcp.maintenance" },
        { id: "action-4", type: "action", label: "Notify Resident (Urgent)", description: "SMS the resident that emergency help is on the way", mcpTool: "comms.send_sms", mcpServer: "mcp.communications" },
        { id: "action-5", type: "action", label: "Queue for Next Business Day", description: "Update priority and schedule for morning review", mcpTool: "maintenance.update_work_order", mcpServer: "mcp.maintenance" },
        { id: "action-6", type: "action", label: "Notify Resident (Scheduled)", description: "Email the resident with expected timeline", mcpTool: "comms.send_email", mcpServer: "mcp.communications" },
        { id: "end-1", type: "end", label: "Emergency Handled", description: "Emergency vendor dispatched" },
        { id: "end-2", type: "end", label: "Queued for Review", description: "Non-urgent request scheduled" },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "action-1" },
        { id: "e2", source: "action-1", target: "action-2" },
        { id: "e3", source: "action-2", target: "condition-1" },
        { id: "e4", source: "condition-1", target: "action-3", label: "Yes" },
        { id: "e5", source: "condition-1", target: "action-5", label: "No" },
        { id: "e6", source: "action-3", target: "action-4" },
        { id: "e7", source: "action-4", target: "end-1" },
        { id: "e8", source: "action-5", target: "action-6" },
        { id: "e9", source: "action-6", target: "end-2" },
      ],
      dataSources: ["Work orders", "Vendor directory", "Problems catalog"],
      triggers: ["On new work order submitted"],
    };
  }

  return {
    name: "Custom Workflow",
    description: prompt.slice(0, 120),
    nodes: [
      { id: "trigger-1", type: "trigger", label: "Trigger", description: "Workflow entry point — configure schedule or event" },
      { id: "action-1", type: "action", label: "Fetch Data", description: "Retrieve the data needed for this workflow", mcpTool: "leasing.get_properties", mcpServer: "mcp.leasing" },
      { id: "condition-1", type: "condition", label: "Check Criteria", description: "Evaluate business rules" },
      { id: "action-2", type: "action", label: "Process Match", description: "Handle items that match criteria" },
      { id: "action-3", type: "action", label: "Log & Skip", description: "Record items that don't match for review", mcpTool: "residents.post_note", mcpServer: "mcp.residents" },
      { id: "action-4", type: "action", label: "Send Notification", description: "Notify relevant parties of the outcome", mcpTool: "comms.send_email", mcpServer: "mcp.communications" },
      { id: "end-1", type: "end", label: "Complete", description: "Workflow finished" },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "action-1" },
      { id: "e2", source: "action-1", target: "condition-1" },
      { id: "e3", source: "condition-1", target: "action-2", label: "Yes" },
      { id: "e4", source: "condition-1", target: "action-3", label: "No" },
      { id: "e5", source: "action-2", target: "action-4" },
      { id: "e6", source: "action-3", target: "action-4" },
      { id: "e7", source: "action-4", target: "end-1" },
    ],
    dataSources: ["Properties", "Residents"],
    triggers: ["Manual invocation"],
  };
}

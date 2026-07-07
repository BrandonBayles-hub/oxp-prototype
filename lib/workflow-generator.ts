/**
 * Unified workflow generation — works in both local dev and static deploy.
 *
 * Strategy:
 *  1. Try the Next.js API route (/api/workflows/generate) — available in
 *     local dev where the server is running.
 *  2. If the route 404s (static deploy on S3/CloudFront), fall back to
 *     calling the GenAI Gateway directly from the browser via llm-client.
 *  3. If neither works, return a hardcoded fallback workflow.
 */

import {
  MCP_SERVER_CATALOG,
  type McpTool,
} from "@/components/custom-agent-builder/lib/mcp-server-catalog";
import { callClientLLM, isClientLLMConfigured } from "./llm-client";

export interface OutputField {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  sample?: string;
}

export interface WorkflowNode {
  id: string;
  type: "trigger" | "condition" | "action" | "loop" | "delay" | "end";
  label: string;
  description: string;
  mcpTool?: string;
  mcpServer?: string;
  config?: Record<string, string>;
  outputFields?: OutputField[];
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

export interface GenerateResult {
  ok: boolean;
  workflow: GeneratedWorkflow;
  source: "llm" | "fallback";
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
Each step must declare what data it produces (outputFields) and how its inputs map from upstream steps (config values using {{step_id.field}} syntax).

## Available MCP Tools (use these as actions in the workflow)
${buildToolCatalogSummary()}

## Available Trigger Event Types
- lease_signed: Fires when a new lease is signed. Fields: lease_id, resident_id, unit_id, property_id, rent_amount, lease_start, lease_end, term_months, resident_name, resident_email
- renewal_signed: Fires when a renewal lease is signed. Fields: lease_id, resident_id, unit_id, property_id, old_rent, new_rent, new_lease_start, new_lease_end, resident_name, resident_email
- work_order_created: Fires when a maintenance work order is created. Fields: work_order_id, property_id, unit_id, resident_id, description, priority, category
- payment_received: Fires when a payment is received. Fields: payment_id, resident_id, amount, payment_method, ledger_balance, property_id
- lease_expiring: Fires when a lease is within a configurable window of expiration. Fields: lease_id, resident_id, unit_id, property_id, expiration_date, days_remaining, current_rent, resident_name, resident_email
- move_in: Fires on a resident's move-in day. Fields: resident_id, lease_id, unit_id, property_id, move_in_date, resident_name, resident_email, resident_phone
- move_out: Fires on a resident's move-out day. Fields: resident_id, lease_id, unit_id, property_id, move_out_date, balance_due
- schedule: Fires on a cron/scheduled basis. Fields: run_time, schedule_name
- manual: Manually triggered by a user. Fields: triggered_by, triggered_at

## Output Format
Return a JSON object with this exact structure:
{
  "name": "Workflow name",
  "description": "One sentence description",
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger",
      "label": "Renewal Lease Signed",
      "description": "Fires when a resident signs their renewal",
      "config": { "event_type": "renewal_signed" },
      "outputFields": [
        { "name": "lease_id", "type": "number", "sample": "4521" },
        { "name": "resident_email", "type": "string", "sample": "jane@email.com" }
      ]
    },
    {
      "id": "action-1",
      "type": "action",
      "label": "Send Thank-You Email",
      "description": "Email the resident thanking them for renewing",
      "mcpTool": "comms.send_email",
      "mcpServer": "mcp.communications",
      "config": {
        "to": "{{trigger-1.resident_email}}",
        "subject": "Thank you for renewing!",
        "body": "Dear resident, thank you for renewing your lease."
      },
      "outputFields": [
        { "name": "message_id", "type": "string", "sample": "EM-3310" },
        { "name": "status", "type": "string", "sample": "sent" }
      ]
    }
  ],
  "edges": [
    { "id": "e1", "source": "trigger-1", "target": "action-1" }
  ],
  "dataSources": ["Leases"],
  "triggers": ["Renewal lease signed"]
}

## Data Flow Rules (CRITICAL)
1. Trigger nodes MUST have a "config.event_type" field matching one of the trigger event types above.
2. Trigger nodes MUST have "outputFields" listing the fields from that event type.
3. Action nodes MUST map their input parameters from upstream steps using {{step_id.field}} syntax in the config.
   For example, if the trigger produces "resident_email", an email action's config should be: "to": "{{trigger-1.resident_email}}"
4. Action nodes SHOULD have "outputFields" declaring what they return, so downstream steps can reference them.
5. The data flow chain must be complete: every downstream input should trace back to an upstream output.

## Node Types
- "trigger": Entry point — schedule, event, or manual invocation. Must include config.event_type.
- "condition": Decision point with true/false branches. config.expression uses {{step.field}} syntax.
- "action": An MCP tool call or data operation. config maps inputs from upstream data pills.
- "loop": Iterates over a collection. config.collection references an upstream array field.
- "delay": Waits for a time period or event.
- "end": Terminal node.

## Rules
1. Every workflow starts with exactly one "trigger" node.
2. Use actual MCP tool IDs from the catalog above for action nodes.
3. Condition nodes must have exactly two outgoing edges — one labeled "Yes"/"True" and one labeled "No"/"False".
4. Loop nodes have an outgoing "Each item" edge and a "Done" edge.
5. End with one or more "end" nodes.
6. Keep workflows between 5–15 nodes for clarity.
7. Use descriptive labels that a property manager would understand.
8. Reference specific MCP tools by their exact id from the catalog.
9. ALWAYS populate config fields with {{step_id.field}} references when the data comes from a previous step.
10. Return ONLY the JSON object — no markdown, no explanation.`;

function parseWorkflowJSON(raw: string): GeneratedWorkflow {
  try {
    return JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Could not parse workflow JSON from LLM response.");
  }
}

async function callClientDirect(
  prompt: string,
  existingWorkflow?: GeneratedWorkflow,
  changeRequest?: string,
): Promise<GeneratedWorkflow> {
  let userContent: string;
  if (existingWorkflow && changeRequest) {
    userContent = `Here is the current workflow:\n\`\`\`json\n${JSON.stringify(existingWorkflow, null, 2)}\n\`\`\`\n\nOriginal request: ${prompt}\n\nPlease modify this workflow based on the following change request: ${changeRequest}\n\nReturn the complete updated workflow JSON.`;
  } else {
    userContent = `Build a deterministic workflow for this request:\n\n${prompt}`;
  }

  const result = await callClientLLM(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    { temperature: 0.1, maxTokens: 4000 },
  );

  return parseWorkflowJSON(result.content);
}

async function tryApiRoute(
  prompt: string,
  existingWorkflow?: GeneratedWorkflow,
  changeRequest?: string,
): Promise<{ ok: boolean; workflow: GeneratedWorkflow } | null> {
  try {
    const res = await fetch("/api/workflows/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, existingWorkflow, changeRequest }),
    });
    if (res.status === 404) return null;
    const data = await res.json();
    if (data.workflow) return { ok: data.ok ?? false, workflow: data.workflow };
    return null;
  } catch {
    return null;
  }
}

function applyFallbackIteration(
  existing: GeneratedWorkflow,
  changeRequest: string,
): GeneratedWorkflow {
  const lower = changeRequest.toLowerCase();
  const nextNodeId = `action-${Date.now()}`;
  const nextEdgeId = `e-${Date.now()}`;

  const endNodes = existing.nodes.filter((n) => n.type === "end");
  const nonEndNodes = existing.nodes.filter((n) => n.type !== "end");
  const edgesToEnd = existing.edges.filter((e) =>
    endNodes.some((en) => en.id === e.target),
  );
  const otherEdges = existing.edges.filter(
    (e) => !edgesToEnd.some((ee) => ee.id === e.id),
  );

  let newNode: WorkflowNode;
  if (lower.includes("sms") || lower.includes("text")) {
    newNode = { id: nextNodeId, type: "action", label: "Send SMS", description: "Send a text notification", mcpTool: "comms.send_sms", mcpServer: "mcp.communications" };
  } else if (lower.includes("email")) {
    newNode = { id: nextNodeId, type: "action", label: "Send Email", description: "Send an email notification", mcpTool: "comms.send_email", mcpServer: "mcp.communications" };
  } else if (lower.includes("delay") || lower.includes("wait")) {
    newNode = { id: nextNodeId, type: "delay", label: "Wait", description: `Pause: ${changeRequest}` };
  } else if (lower.includes("approval") || lower.includes("review") || lower.includes("human")) {
    newNode = { id: nextNodeId, type: "action", label: "Require Approval", description: `Manual review: ${changeRequest}` };
  } else if (lower.includes("condition") || lower.includes("check") || lower.includes("if ")) {
    const condId = `cond-${Date.now()}`;
    const skipId = `skip-${Date.now()}`;
    const condNode: WorkflowNode = { id: condId, type: "condition", label: changeRequest.slice(0, 40), description: changeRequest };
    const skipEnd: WorkflowNode = { id: skipId, type: "end", label: "Skipped", description: "Did not pass condition" };
    const firstAction = existing.nodes.find((n) => n.type === "action");
    const insertAfter = firstAction ?? existing.nodes[0];
    const outEdges = existing.edges.filter((e) => e.source === insertAfter.id);
    const remainingEdges = existing.edges.filter((e) => e.source !== insertAfter.id);
    return {
      ...existing,
      description: `${existing.description} (+ condition)`,
      nodes: [...existing.nodes, condNode, skipEnd],
      edges: [
        ...remainingEdges,
        { id: `${nextEdgeId}-a`, source: insertAfter.id, target: condId },
        ...outEdges.map((e) => ({ ...e, source: condId, label: "Yes" })),
        { id: `${nextEdgeId}-b`, source: condId, target: skipId, label: "No" },
      ],
    };
  } else {
    newNode = { id: nextNodeId, type: "action", label: changeRequest.slice(0, 30), description: changeRequest };
  }

  const rewiredEdges = edgesToEnd.map((e) => ({ ...e, target: nextNodeId }));
  const toEnd = endNodes.map((en, i) => ({
    id: `${nextEdgeId}-${i}`,
    source: nextNodeId,
    target: en.id,
  }));

  return {
    ...existing,
    description: `${existing.description} (+ ${changeRequest.slice(0, 30)})`,
    nodes: [...nonEndNodes, newNode!, ...endNodes],
    edges: [...otherEdges, ...rewiredEdges, ...toEnd],
  };
}

function buildFallbackWorkflow(prompt: string): GeneratedWorkflow {
  const lower = prompt.toLowerCase();

  if (lower.includes("renewal") || lower.includes("lease expir")) {
    return {
      name: "Lease Renewal Automation",
      description: "Scans expiring leases, calculates renewal offers, and sends to residents.",
      nodes: [
        { id: "trigger-1", type: "trigger", label: "Nightly Schedule", description: "Runs every night at 2:00 AM", config: { event_type: "schedule" }, outputFields: [{ name: "run_time", type: "string" as const, sample: "2026-06-26T02:00:00Z" }] },
        { id: "action-1", type: "action", label: "Get Expiring Leases", description: "Query leases expiring within 90 days", mcpTool: "renewals.get_expiring_leases", mcpServer: "mcp.renewals", config: { property_id: "100", days_out: "90" }, outputFields: [{ name: "leases", type: "array" as const, sample: "[{lease_id, resident_id, ...}]" }, { name: "total_count", type: "number" as const, sample: "15" }] },
        { id: "loop-1", type: "loop", label: "For Each Lease", description: "Process each expiring lease", config: { collection: "{{action-1.leases}}" } },
        { id: "action-2", type: "action", label: "Get Resident History", description: "Pull payment history and retention score", mcpTool: "renewals.get_resident_history", mcpServer: "mcp.renewals", config: { resident_id: "{{loop-1.current_item.resident_id}}" }, outputFields: [{ name: "retention_score", type: "number" as const, sample: "87" }, { name: "tenure_months", type: "number" as const, sample: "24" }] },
        { id: "condition-1", type: "condition", label: "Retention Score > 70?", description: "Check if resident qualifies for preferred rate", config: { expression: "{{action-2.retention_score}} > 70" } },
        { id: "action-3", type: "action", label: "Create Premium Offer", description: "Renewal offer at 3% below market", mcpTool: "renewals.create_renewal_offer", mcpServer: "mcp.renewals", config: { lease_id: "{{loop-1.current_item.lease_id}}", new_rent: "{{loop-1.current_item.current_rent}}", term_months: "12" }, outputFields: [{ name: "offer_id", type: "number" as const, sample: "8821" }] },
        { id: "action-4", type: "action", label: "Create Standard Offer", description: "Renewal offer at market rate", mcpTool: "renewals.create_renewal_offer", mcpServer: "mcp.renewals", config: { lease_id: "{{loop-1.current_item.lease_id}}", new_rent: "{{loop-1.current_item.current_rent}}", term_months: "12" }, outputFields: [{ name: "offer_id", type: "number" as const, sample: "8822" }] },
        { id: "action-5", type: "action", label: "Send Email", description: "Email the renewal offer", mcpTool: "comms.send_email", mcpServer: "mcp.communications", config: { to: "{{loop-1.current_item.resident_email}}", subject: "Your Renewal Offer", body: "Dear resident, here is your renewal offer." }, outputFields: [{ name: "message_id", type: "string" as const, sample: "EM-3310" }] },
        { id: "end-1", type: "end", label: "Done", description: "Lease processed" },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "action-1" },
        { id: "e2", source: "action-1", target: "loop-1" },
        { id: "e3", source: "loop-1", target: "action-2", label: "Each lease" },
        { id: "e4", source: "action-2", target: "condition-1" },
        { id: "e5", source: "condition-1", target: "action-3", label: "Yes" },
        { id: "e6", source: "condition-1", target: "action-4", label: "No" },
        { id: "e7", source: "action-3", target: "action-5" },
        { id: "e8", source: "action-4", target: "action-5" },
        { id: "e9", source: "action-5", target: "end-1" },
      ],
      dataSources: ["Leases", "Resident records"],
      triggers: ["Nightly at 2:00 AM"],
    };
  }

  if (lower.includes("renewal") && lower.includes("sign")) {
    return {
      name: "Renewal Thank-You Workflow",
      description: "When a renewal is signed, send a thank-you email to the resident.",
      nodes: [
        { id: "trigger-1", type: "trigger", label: "Renewal Signed", description: "Fires when a resident signs their renewal", config: { event_type: "renewal_signed" }, outputFields: [{ name: "lease_id", type: "number" as const, sample: "4521" }, { name: "resident_id", type: "number" as const, sample: "1102" }, { name: "resident_name", type: "string" as const, sample: "Jane Smith" }, { name: "resident_email", type: "string" as const, sample: "jane@email.com" }, { name: "new_rent", type: "number" as const, sample: "1850" }] },
        { id: "action-1", type: "action", label: "Send Thank-You Email", description: "Send a personalized thank-you email", mcpTool: "comms.send_email", mcpServer: "mcp.communications", config: { to: "{{trigger-1.resident_email}}", subject: "Thank you for renewing your lease!", body: "Dear {{trigger-1.resident_name}}, thank you for renewing." }, outputFields: [{ name: "message_id", type: "string" as const, sample: "EM-3310" }, { name: "status", type: "string" as const, sample: "sent" }] },
        { id: "end-1", type: "end", label: "Complete", description: "Workflow finished" },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "action-1" },
        { id: "e2", source: "action-1", target: "end-1" },
      ],
      dataSources: ["Leases"],
      triggers: ["Renewal lease signed"],
    };
  }

  return {
    name: "Custom Workflow",
    description: prompt.slice(0, 120),
    nodes: [
      { id: "trigger-1", type: "trigger", label: "Trigger", description: "Workflow entry point", config: { event_type: "manual" }, outputFields: [{ name: "triggered_by", type: "string" as const, sample: "user@entrata.com" }, { name: "triggered_at", type: "string" as const, sample: "2026-06-26T14:30:00Z" }] },
      { id: "action-1", type: "action", label: "Fetch Data", description: "Retrieve needed data", mcpTool: "leasing.get_properties", mcpServer: "mcp.leasing", outputFields: [{ name: "properties", type: "array" as const, sample: "[{id, name, ...}]" }] },
      { id: "condition-1", type: "condition", label: "Check Criteria", description: "Evaluate business rules", config: { expression: "{{action-1.properties}}.length > 0" } },
      { id: "action-2", type: "action", label: "Process Match", description: "Handle matching items" },
      { id: "action-3", type: "action", label: "Send Notification", description: "Notify relevant parties", mcpTool: "comms.send_email", mcpServer: "mcp.communications", config: { to: "admin@property.com", subject: "Workflow completed", body: "The workflow has finished processing." }, outputFields: [{ name: "message_id", type: "string" as const, sample: "EM-3311" }] },
      { id: "end-1", type: "end", label: "Complete", description: "Workflow finished" },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "action-1" },
      { id: "e2", source: "action-1", target: "condition-1" },
      { id: "e3", source: "condition-1", target: "action-2", label: "Yes" },
      { id: "e4", source: "condition-1", target: "action-3", label: "No" },
      { id: "e5", source: "action-2", target: "action-3" },
      { id: "e6", source: "action-3", target: "end-1" },
    ],
    dataSources: ["Properties", "Residents"],
    triggers: ["Manual invocation"],
  };
}

/**
 * Generate or iterate on a workflow. Tries multiple strategies:
 * 1. Next.js API route (local dev)
 * 2. Direct client-side LLM call (static deploy)
 * 3. Hardcoded fallback
 */
export async function generateWorkflow(
  prompt: string,
  existingWorkflow?: GeneratedWorkflow,
  changeRequest?: string,
): Promise<GenerateResult> {
  const apiResult = await tryApiRoute(prompt, existingWorkflow, changeRequest);
  if (apiResult) {
    return { ok: apiResult.ok, workflow: apiResult.workflow, source: apiResult.ok ? "llm" : "fallback" };
  }

  if (isClientLLMConfigured()) {
    try {
      const workflow = await callClientDirect(prompt, existingWorkflow, changeRequest);
      return { ok: true, workflow, source: "llm" };
    } catch (err) {
      console.error("Client-side LLM call failed:", err);
    }
  }

  if (existingWorkflow && changeRequest) {
    return {
      ok: false,
      workflow: applyFallbackIteration(existingWorkflow, changeRequest),
      source: "fallback",
    };
  }

  return { ok: false, workflow: buildFallbackWorkflow(prompt), source: "fallback" };
}

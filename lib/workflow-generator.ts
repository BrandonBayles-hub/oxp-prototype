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

function buildFallbackWorkflow(prompt: string): GeneratedWorkflow {
  const lower = prompt.toLowerCase();

  if (lower.includes("renewal") || lower.includes("lease expir")) {
    return {
      name: "Lease Renewal Automation",
      description: "Scans expiring leases, calculates renewal offers, and sends to residents.",
      nodes: [
        { id: "trigger-1", type: "trigger", label: "Nightly Schedule", description: "Runs every night at 2:00 AM" },
        { id: "action-1", type: "action", label: "Get Expiring Leases", description: "Query leases expiring within 90 days", mcpTool: "renewals.get_expiring_leases", mcpServer: "mcp.renewals" },
        { id: "loop-1", type: "loop", label: "For Each Lease", description: "Process each expiring lease" },
        { id: "action-2", type: "action", label: "Get Resident History", description: "Pull payment history and retention score", mcpTool: "renewals.get_resident_history", mcpServer: "mcp.renewals" },
        { id: "condition-1", type: "condition", label: "Retention Score > 70?", description: "Check if resident qualifies for preferred rate" },
        { id: "action-3", type: "action", label: "Create Premium Offer", description: "Renewal offer at 3% below market", mcpTool: "renewals.create_renewal_offer", mcpServer: "mcp.renewals" },
        { id: "action-4", type: "action", label: "Create Standard Offer", description: "Renewal offer at market rate", mcpTool: "renewals.create_renewal_offer", mcpServer: "mcp.renewals" },
        { id: "action-5", type: "action", label: "Send Email", description: "Email the renewal offer", mcpTool: "comms.send_email", mcpServer: "mcp.communications" },
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

  return {
    name: "Custom Workflow",
    description: prompt.slice(0, 120),
    nodes: [
      { id: "trigger-1", type: "trigger", label: "Trigger", description: "Workflow entry point" },
      { id: "action-1", type: "action", label: "Fetch Data", description: "Retrieve needed data", mcpTool: "leasing.get_properties", mcpServer: "mcp.leasing" },
      { id: "condition-1", type: "condition", label: "Check Criteria", description: "Evaluate business rules" },
      { id: "action-2", type: "action", label: "Process Match", description: "Handle matching items" },
      { id: "action-3", type: "action", label: "Send Notification", description: "Notify relevant parties", mcpTool: "comms.send_email", mcpServer: "mcp.communications" },
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

  return { ok: false, workflow: buildFallbackWorkflow(prompt), source: "fallback" };
}

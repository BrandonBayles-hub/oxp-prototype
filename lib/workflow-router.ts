/**
 * Workflow Engine Router
 *
 * Uses the LLM to analyze a natural-language prompt and determine whether
 * the workflow can be handled entirely by Entrata's internal MCP servers
 * ("entrata-native") or requires external connectors via Workato ("workato").
 *
 * Three possible outcomes:
 * 1. entrata-native — all steps handled by internal MCPs
 * 2. workato — at least one step requires external software
 * 3. connectors-unavailable — the user wants Entrata-internal functionality
 *    that we have not yet built connectors for (e.g. Purchase Orders, GL Accounts)
 */

import {
  MCP_SERVER_CATALOG,
  type McpTool,
} from "@/components/custom-agent-builder/lib/mcp-server-catalog";
import { callClientLLM, isClientLLMConfigured } from "./llm-client";

export type WorkflowEngine = "entrata-native" | "workato";

export interface CapabilityMatch {
  name: string;
  description: string;
  source: "entrata" | "workato";
  mcpTool?: string;
  externalSystem?: string;
}

export interface ConnectorGap {
  name: string;
  description: string;
  category: string;
}

export interface RoutingDecision {
  engine: WorkflowEngine;
  confidence: number;
  matches: CapabilityMatch[];
  entrataCount: number;
  workatoCount: number;
  reasoning: string;
  costImpact: CostImpact;
  externalSystems: string[];
  source: "llm" | "fallback";
  connectorGaps: ConnectorGap[];
}

export interface CostImpact {
  label: string;
  monthlyEstimate: string;
  perTaskEstimate: string;
  explanation: string;
}

function buildMcpCatalogForPrompt(): string {
  return MCP_SERVER_CATALOG.map((server) => {
    const tools = server.tools
      .map(
        (t: McpTool) =>
          `  - ${t.id}: ${t.name} — ${t.description}${t.mutates ? " [WRITE]" : " [READ]"}`,
      )
      .join("\n");
    return `### ${server.name} (${server.id})\n${server.description}\n${tools}`;
  }).join("\n\n");
}

const ROUTING_SYSTEM_PROMPT = `You are a workflow routing engine for Entrata, a property management software platform.

Your job is to analyze a user's workflow request and determine whether Entrata can handle it ENTIRELY with its internal MCP (Model Context Protocol) servers, or whether ANY part of the request requires integration with external third-party software, or whether the user is requesting Entrata-internal functionality that we do NOT yet have connectors for.

## Entrata's Internal MCP Capabilities
These are the ONLY things Entrata can do natively. If a capability is NOT listed here, it either requires an external connector OR is a connector gap:

${buildMcpCatalogForPrompt()}

## Connector Gaps — Entrata functionality that does NOT have connectors yet
The following are Entrata-internal operations that we have NOT built connectors for. If a user requests ANY of these, they should be flagged as "connector gaps" — NOT routed to Workato (since these are internal Entrata operations, not third-party).

IMPORTANT: ANY workflow involving accounting operations — invoices, purchase orders, GL accounts, budgets, financial reports, or similar — should be flagged as a connector gap. Even if the MCP catalog lists basic invoice or ledger read tools, those are limited to simple lookups for AI agents. Full accounting workflow automation (analyzing, creating, updating, flagging, routing, approving invoices or other accounting records) is NOT available as a deterministic workflow connector.

Specific connector gaps:
- **Invoices / AP**: Creating, analyzing, flagging, routing, approving, or managing vendor invoices or accounts payable workflows
- **Purchase Orders**: Creating, updating, approving, or managing purchase orders
- **GL Accounts / Chart of Accounts**: Creating, updating, or managing general ledger accounts or chart of accounts
- **AP Payment Runs**: Initiating or managing bulk accounts payable payment runs
- **Budget Management**: Creating, updating, or managing property budgets or budget vs actual reports
- **Bank Reconciliation**: Performing or managing bank reconciliation processes
- **Financial Statements**: Generating balance sheets, income statements, or cash flow statements
- **Journal Entries**: Creating, posting, or reversing manual journal entries
- **1099 Processing**: Generating or managing 1099 tax forms for vendors
- **Utility Billing Setup**: Configuring utility billing ratios or RUBS allocations
- **Accounts Receivable Write-offs**: Writing off uncollectable resident balances

## Routing Rules

1. **entrata-native**: Use this ONLY when every single action in the workflow can be accomplished using the MCP tools listed above.

2. **workato**: Use this if ANY part of the workflow requires action in, through, or involving an external third-party system that is NOT Entrata. When this happens, the ENTIRE workflow moves to Workato.

3. **Connector gaps**: If the workflow is entirely internal to Entrata but requires operations listed in the "Connector Gaps" section above, set engine to "entrata-native" but populate the "connectorGaps" array. This signals that we CANNOT build this workflow yet because the connectors don't exist — the user should be offered the option to request them.

## Key Signals for Workato
The strongest signal is when the user mentions ANY software, service, platform, or company that is NOT Entrata. This includes but is not limited to:
- CRM systems (Salesforce, HubSpot)
- Communication platforms (Slack, Microsoft Teams, Discord)
- Project management (Jira, Asana, Monday.com)
- ERP/Accounting (NetSuite, QuickBooks, Xero)
- E-commerce/Retail (Amazon, Walmart, Shopify)
- Food/Services (Crumbl, DoorDash, Uber Eats)
- Cloud storage (Google Drive, Dropbox, Box, OneDrive)
- E-signature (DocuSign, Adobe Sign)
- Marketing (Mailchimp, Constant Contact)
- Analytics/Data (Snowflake, BigQuery, Tableau)
- HR (Workday, BambooHR, ADP)
- Social media (Facebook, Instagram, LinkedIn, Twitter/X)
- IoT/Smart home (SmartRent, Latch)
- Payment/Rewards (Stripe, Square, PayPal, Amazon Gift Cards, any gift card provider)
- Any website, app, or SaaS product not listed in the MCP catalog above

## Output Format
Return a JSON object with this exact structure:
{
  "engine": "entrata-native" | "workato",
  "confidence": 0.0 to 1.0,
  "reasoning": "One paragraph explaining your decision",
  "externalSystems": ["Amazon", "Slack"],
  "connectorGaps": [
    {
      "name": "Purchase Order Management",
      "description": "Create and update purchase orders",
      "category": "Accounting"
    }
  ],
  "capabilities": [
    {
      "name": "Short name of the capability",
      "description": "What this step does",
      "source": "entrata" | "workato",
      "mcpTool": "tool.id if entrata, omit if workato",
      "externalSystem": "System name if workato, omit if entrata"
    }
  ]
}

The "externalSystems" array should list every non-Entrata system detected. Empty array if entrata-native.
The "connectorGaps" array should list every Entrata-internal capability that was requested but does NOT have a connector. Empty array if no gaps.

Return ONLY the JSON object — no markdown, no explanation outside the JSON.`;

interface LLMRoutingResponse {
  engine: WorkflowEngine;
  confidence: number;
  reasoning: string;
  externalSystems?: string[];
  connectorGaps?: ConnectorGap[];
  capabilities: CapabilityMatch[];
}

function parseLLMResponse(raw: string): LLMRoutingResponse {
  try {
    return JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Could not parse routing JSON from LLM response.");
  }
}

function normalizeEngine(engine: string): WorkflowEngine {
  if (engine === "entrata-native") return "entrata-native";
  return "workato";
}

function getCostImpact(engine: WorkflowEngine, _premiumConnectors: number): CostImpact {
  if (engine === "entrata-native") {
    return {
      label: "Included in plan",
      monthlyEstimate: "Free",
      perTaskEstimate: "Free",
      explanation: "Your first 5 deterministic agents are free. Additional agents and AI-powered agents require a premium plan.",
    };
  }

  return {
    label: "Premium plan required",
    monthlyEstimate: "Premium",
    perTaskEstimate: "Premium",
    explanation: "Agents using external connectors require a Premium plan. Your first 5 deterministic agents are free — this one uses a Premium slot.",
  };
}

/**
 * Use the LLM to analyze a prompt and decide the workflow engine.
 * Falls back to a keyword-based heuristic if the LLM is unavailable.
 */
export async function analyzePrompt(prompt: string): Promise<RoutingDecision> {
  if (isClientLLMConfigured()) {
    try {
      const result = await callClientLLM(
        [
          { role: "system", content: ROUTING_SYSTEM_PROMPT },
          { role: "user", content: `Analyze this workflow request and determine the appropriate engine:\n\n${prompt}` },
        ],
        { temperature: 0.1, maxTokens: 2000 },
      );

      const parsed = parseLLMResponse(result.content);
      const engine = normalizeEngine(parsed.engine);
      const entrataCount = parsed.capabilities.filter((c) => c.source === "entrata").length;
      const workatoCount = parsed.capabilities.filter((c) => c.source === "workato").length;
      const externalSystems = parsed.externalSystems ?? parsed.capabilities
        .filter((c) => c.source === "workato" && c.externalSystem)
        .map((c) => c.externalSystem!);

      return {
        engine,
        confidence: parsed.confidence,
        matches: parsed.capabilities,
        entrataCount,
        workatoCount,
        reasoning: parsed.reasoning,
        costImpact: getCostImpact(engine, workatoCount),
        externalSystems,
        source: "llm",
        connectorGaps: parsed.connectorGaps ?? [],
      };
    } catch (err) {
      console.error("LLM routing failed, falling back to heuristic:", err);
    }
  }

  try {
    const res = await fetch("/api/workflows/generate", { method: "HEAD" });
    if (res.status !== 404) {
      const routeRes = await fetch("/api/workflows/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (routeRes.ok) {
        const data = await routeRes.json();
        if (data.engine) {
          const engine = normalizeEngine(data.engine);
          const entrataCount = (data.capabilities ?? []).filter((c: CapabilityMatch) => c.source === "entrata").length;
          const workatoCount = (data.capabilities ?? []).filter((c: CapabilityMatch) => c.source === "workato").length;
          return {
            engine,
            confidence: data.confidence ?? 0.8,
            matches: data.capabilities ?? [],
            entrataCount,
            workatoCount,
            reasoning: data.reasoning ?? "",
            costImpact: getCostImpact(engine, workatoCount),
            externalSystems: data.externalSystems ?? [],
            source: "llm",
            connectorGaps: data.connectorGaps ?? [],
          };
        }
      }
    }
  } catch {
    // API route not available
  }

  return analyzePromptFallback(prompt);
}

/**
 * Re-analyze after a change request to detect if the workflow needs
 * to convert from native to Workato.
 */
export async function analyzeChangeRequest(
  originalPrompt: string,
  changeRequest: string,
): Promise<RoutingDecision> {
  const combined = `Original workflow: ${originalPrompt}\n\nRequested change: ${changeRequest}`;
  return analyzePrompt(combined);
}

// ─── Fallback heuristic (used when LLM is unavailable) ───

const EXTERNAL_SIGNALS = [
  "salesforce", "hubspot", "slack", "microsoft teams", "teams",
  "jira", "asana", "monday.com", "trello",
  "netsuite", "quickbooks", "xero", "sage",
  "amazon", "walmart", "shopify", "ebay", "etsy",
  "crumbl", "doordash", "uber eats", "grubhub",
  "google drive", "dropbox", "box", "onedrive",
  "docusign", "adobe sign",
  "mailchimp", "constant contact", "sendgrid",
  "snowflake", "bigquery", "redshift", "tableau", "power bi",
  "workday", "bamboohr", "adp", "gusto",
  "facebook", "instagram", "linkedin", "twitter", "tiktok",
  "smartrent", "latch",
  "stripe", "square", "paypal", "venmo",
  "zendesk", "intercom", "freshdesk",
  "twilio", "whatsapp", "discord",
  "github", "gitlab", "bitbucket",
  "aws", "azure", "gcp",
  "zapier", "workato", "make.com",
  "webhook", "external api", "third-party",
  "sap", "oracle", "peoplesoft",
  "gift card", "gift-card",
];

const ENTRATA_SIGNALS = [
  "lease", "leasing", "renewal", "renew", "resident", "tenant",
  "unit", "property", "floorplan", "floor plan",
  "work order", "maintenance", "repair", "vendor", "dispatch",
  "ledger", "charge", "payment", "invoice", "balance", "delinquent",
  "lead", "prospect", "applicant", "tour", "guest card",
  "sms", "email", "notification", "message",
  "move-in", "move-out", "amenities",
];

const CONNECTOR_GAP_SIGNALS: Array<{ keywords: string[]; gap: ConnectorGap }> = [
  { keywords: ["purchase order", "po ", "create po", "new po"], gap: { name: "Purchase Order Management", description: "Create, update, and approve purchase orders", category: "Accounting" } },
  { keywords: ["invoice", "invoices", "analyze invoice", "review invoice", "flag invoice", "vendor invoice", "ap invoice", "post invoice", "create invoice"], gap: { name: "Invoice Management", description: "Create, analyze, flag, or manage vendor invoices and AP workflows", category: "Accounting" } },
  { keywords: ["gl account", "general ledger", "chart of accounts", "coa"], gap: { name: "GL Account Management", description: "Create, update, and manage general ledger accounts and chart of accounts", category: "Accounting" } },
  { keywords: ["ap payment run", "payment run", "bulk payment", "pay vendors"], gap: { name: "AP Payment Runs", description: "Initiate and manage bulk accounts payable payment runs", category: "Accounting" } },
  { keywords: ["budget", "budget vs actual", "create budget"], gap: { name: "Budget Management", description: "Create, update, and manage property budgets", category: "Accounting" } },
  { keywords: ["bank reconciliation", "reconcile bank", "bank rec"], gap: { name: "Bank Reconciliation", description: "Perform and manage bank reconciliation processes", category: "Accounting" } },
  { keywords: ["financial statement", "balance sheet", "income statement", "cash flow statement", "p&l"], gap: { name: "Financial Statements", description: "Generate balance sheets, income statements, and cash flow reports", category: "Accounting" } },
  { keywords: ["journal entry", "journal entries", "manual entry", "adjusting entry"], gap: { name: "Journal Entries", description: "Create, post, and reverse manual journal entries", category: "Accounting" } },
  { keywords: ["1099", "tax form", "vendor tax"], gap: { name: "1099 Processing", description: "Generate and manage 1099 tax forms for vendors", category: "Accounting" } },
  { keywords: ["write-off", "write off", "uncollectable", "bad debt"], gap: { name: "AR Write-offs", description: "Write off uncollectable resident balances", category: "Accounting" } },
];

function analyzePromptFallback(prompt: string): RoutingDecision {
  const lower = prompt.toLowerCase();
  const matches: CapabilityMatch[] = [];

  for (const kw of ENTRATA_SIGNALS) {
    if (lower.includes(kw)) {
      matches.push({
        name: kw,
        description: `Entrata internal capability: ${kw}`,
        source: "entrata",
      });
    }
  }

  const detectedExternal: string[] = [];
  for (const kw of EXTERNAL_SIGNALS) {
    if (lower.includes(kw)) {
      detectedExternal.push(kw);
      matches.push({
        name: kw,
        description: `External system: ${kw}`,
        source: "workato",
        externalSystem: kw,
      });
    }
  }

  const detectedGaps: ConnectorGap[] = [];
  for (const gap of CONNECTOR_GAP_SIGNALS) {
    if (gap.keywords.some((kw) => lower.includes(kw))) {
      detectedGaps.push(gap.gap);
    }
  }

  const entrataCount = matches.filter((m) => m.source === "entrata").length;
  const workatoCount = matches.filter((m) => m.source === "workato").length;

  let engine: WorkflowEngine;
  let reasoning: string;
  let confidence: number;

  if (workatoCount > 0) {
    engine = "workato";
    reasoning = `This workflow requires external systems (${detectedExternal.join(", ")}) that are not part of Entrata. The entire workflow will use Premium, which can handle both Entrata operations and external integrations in a single pipeline.`;
    confidence = Math.min(0.85, 0.5 + workatoCount * 0.1);
  } else if (entrataCount > 0) {
    engine = "entrata-native";
    reasoning = detectedGaps.length > 0
      ? `This workflow involves Entrata-internal operations, but some of the requested capabilities (${detectedGaps.map((g) => g.name).join(", ")}) do not have connectors built yet.`
      : `All detected capabilities are available through Entrata's internal MCP servers. No external connectors required.`;
    confidence = Math.min(0.85, 0.5 + entrataCount * 0.1);
  } else {
    engine = "entrata-native";
    reasoning = detectedGaps.length > 0
      ? `The requested capabilities (${detectedGaps.map((g) => g.name).join(", ")}) are Entrata-internal operations but do not have connectors built yet.`
      : "No specific connectors detected — defaulting to Entrata's in-house builder. Note: analysis was performed without LLM assistance.";
    confidence = 0.4;
  }

  return {
    engine,
    confidence,
    matches,
    entrataCount,
    workatoCount,
    reasoning,
    costImpact: getCostImpact(engine, workatoCount),
    externalSystems: detectedExternal,
    source: "fallback",
    connectorGaps: detectedGaps,
  };
}

export function engineLabel(engine: WorkflowEngine): string {
  switch (engine) {
    case "entrata-native": return "Basic";
    case "workato": return "Premium";
  }
}

export function engineDescription(engine: WorkflowEngine): string {
  switch (engine) {
    case "entrata-native":
      return "Runs entirely on Entrata infrastructure using internal MCP servers. No external dependencies or additional costs.";
    case "workato":
      return "This workflow requires external connectors for systems outside of Entrata. Premium handles both Entrata operations and external integrations in a single pipeline.";
  }
}

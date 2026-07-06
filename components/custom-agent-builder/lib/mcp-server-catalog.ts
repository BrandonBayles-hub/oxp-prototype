/**
 * MCP Server catalog for the Agent Builder.
 *
 * Each MCP server exposes a set of tools via the Model Context Protocol.
 * Authors can enable entire servers or restrict to specific tools within
 * a server for fine-grained access control.
 */

export type DataSensitivity = "standard" | "sensitive" | "restricted";

export type McpTool = {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Whether this tool modifies data (vs read-only). */
  mutates: boolean;
  /** Whether using this tool requires human approval before execution. */
  requiresApproval: boolean;
  /** Data sensitivity level — affects audit logging and access review requirements. */
  sensitivity?: DataSensitivity;
};

export type McpServerDefinition = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tools: McpTool[];
  /** Default: all tools enabled. */
  defaultEnabled: boolean;
};

export const MCP_SERVER_CATALOG: McpServerDefinition[] = [
  {
    id: "mcp.leasing",
    name: "Leasing MCP",
    description: "Full leasing lifecycle — leads, tours, applications, availability, and property info.",
    icon: "Home",
    category: "Leasing",
    defaultEnabled: false,
    tools: [
      { id: "leasing.search_leads", name: "Search leads", description: "Search for leads by name, email, phone, or property.", category: "Leads", mutates: false, requiresApproval: false },
      { id: "leasing.get_lead", name: "Get lead details", description: "Retrieve full lead profile including preferences and activity.", category: "Leads", mutates: false, requiresApproval: false },
      { id: "leasing.capture_lead", name: "Capture new lead", description: "Create a new guest card / lead record.", category: "Leads", mutates: true, requiresApproval: false },
      { id: "leasing.update_guest_card", name: "Update guest card", description: "Update lead preferences, notes, or contact info.", category: "Leads", mutates: true, requiresApproval: false },
      { id: "leasing.search_applicant", name: "Search applicant", description: "Find an applicant by name or application ID.", category: "Leads", mutates: false, requiresApproval: false, sensitivity: "sensitive" },
      { id: "leasing.update_applicant", name: "Update applicant", description: "Update applicant information during the application process.", category: "Leads", mutates: true, requiresApproval: false, sensitivity: "sensitive" },
      { id: "leasing.list_lead_activities", name: "List lead activities", description: "Get activity history for a lead (calls, emails, tours, notes).", category: "Leads", mutates: false, requiresApproval: false },
      { id: "leasing.get_tour_schedule", name: "Get tour time slots", description: "Look up available tour slots for a property in a date window.", category: "Tours", mutates: false, requiresApproval: false },
      { id: "leasing.schedule_tour", name: "Schedule tour", description: "Book a tour appointment for a prospect.", category: "Tours", mutates: true, requiresApproval: false },
      { id: "leasing.reschedule_tour", name: "Reschedule tour", description: "Move an existing tour to a new date/time.", category: "Tours", mutates: true, requiresApproval: false },
      { id: "leasing.cancel_tour", name: "Cancel tour", description: "Cancel a scheduled tour.", category: "Tours", mutates: true, requiresApproval: false },
      { id: "leasing.get_tour", name: "Get tour details", description: "Retrieve details of a specific tour.", category: "Tours", mutates: false, requiresApproval: false },
      { id: "leasing.list_tours", name: "List tours", description: "List all tours for a property in a date range.", category: "Tours", mutates: false, requiresApproval: false },
      { id: "leasing.list_tour_types", name: "List tour types", description: "Get available tour types (in-person, self-guided, video).", category: "Tours", mutates: false, requiresApproval: false },
      { id: "leasing.get_floorplans", name: "Get floorplans", description: "List all floorplans with bedroom/bath counts, sqft, and layouts.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.get_floorplan", name: "Get single floorplan", description: "Retrieve details of a specific floorplan.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.available_units", name: "Available units", description: "Get currently available units with pricing and move-in dates.", category: "Availability", mutates: false, requiresApproval: false },
      { id: "leasing.unit_matrix", name: "Unit availability matrix", description: "Full unit matrix with pricing, availability, and lease status.", category: "Availability", mutates: false, requiresApproval: false },
      { id: "leasing.get_unit", name: "Get unit details", description: "Retrieve details of a specific unit.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.get_properties", name: "Get properties", description: "List properties accessible to the current user.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.get_property", name: "Get property details", description: "Retrieve full property info including amenities and policies.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.property_amenities", name: "Property amenities", description: "List community and unit amenities.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.property_policies", name: "Property policies", description: "Pet, smoking, parking, guest policies.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.property_hours", name: "Property hours", description: "Office hours and tour availability hours.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.property_contact", name: "Property contact details", description: "Phone, email, and address for the property.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.property_specials", name: "Property specials", description: "Current move-in specials and promotions.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.property_utilities", name: "Property utilities", description: "Utility information and estimated costs.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.property_lease_terms", name: "Lease terms", description: "Available lease term lengths and pricing.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.property_selling_points", name: "Selling points", description: "Key selling points and differentiators for the property.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.fee_catalog", name: "Fee catalog", description: "All recurring and one-time fees with descriptions.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.property_addons", name: "Property add-ons", description: "Optional add-on services (storage, parking, pet rent).", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.property_addresses", name: "Property addresses", description: "Physical addresses for the property.", category: "Property", mutates: false, requiresApproval: false },
      { id: "leasing.search_tools", name: "Search available tools", description: "Discover what tools are available on this MCP server.", category: "Platform", mutates: false, requiresApproval: false },
    ],
  },
  {
    id: "mcp.maintenance",
    name: "Maintenance MCP",
    description: "Work orders, vendor dispatch, inspection scheduling, and make-ready tracking.",
    icon: "Wrench",
    category: "Maintenance",
    defaultEnabled: false,
    tools: [
      { id: "maintenance.create_work_order", name: "Create work order", description: "Open a new maintenance request.", category: "Work Orders", mutates: true, requiresApproval: false },
      { id: "maintenance.get_work_order", name: "Get work order", description: "Retrieve work order details and status.", category: "Work Orders", mutates: false, requiresApproval: false },
      { id: "maintenance.update_work_order", name: "Update work order", description: "Update status, priority, or assignee.", category: "Work Orders", mutates: true, requiresApproval: false },
      { id: "maintenance.close_work_order", name: "Close work order", description: "Mark a work order as complete.", category: "Work Orders", mutates: true, requiresApproval: false },
      { id: "maintenance.list_work_orders", name: "List work orders", description: "Search and filter work orders by property, status, or date.", category: "Work Orders", mutates: false, requiresApproval: false },
      { id: "maintenance.get_problems_catalog", name: "Problems catalog", description: "Common issues with troubleshooting steps.", category: "Knowledge", mutates: false, requiresApproval: false },
      { id: "maintenance.dispatch_vendor", name: "Dispatch vendor", description: "Assign a vendor to a work order.", category: "Vendors", mutates: true, requiresApproval: true },
    ],
  },
  {
    id: "mcp.accounting",
    name: "Accounting MCP",
    description: "Ledgers, invoices, payments, pre-bills, and financial reporting.",
    icon: "Calculator",
    category: "Accounting",
    defaultEnabled: false,
    tools: [
      { id: "accounting.get_resident_ledger", name: "Get resident ledger", description: "View charges, credits, and balance for a resident.", category: "Ledger", mutates: false, requiresApproval: false, sensitivity: "sensitive" },
      { id: "accounting.post_charge", name: "Post charge", description: "Add a charge to a resident's ledger.", category: "Ledger", mutates: true, requiresApproval: true, sensitivity: "sensitive" },
      { id: "accounting.waive_fee", name: "Waive fee", description: "Waive a charge on a resident's ledger.", category: "Ledger", mutates: true, requiresApproval: true, sensitivity: "sensitive" },
      { id: "accounting.approve_pre_bill", name: "Approve pre-bill", description: "Approve a utility pre-bill batch.", category: "Pre-bills", mutates: true, requiresApproval: true },
      { id: "accounting.reject_pre_bill", name: "Reject pre-bill", description: "Reject a utility pre-bill with reason.", category: "Pre-bills", mutates: true, requiresApproval: true },
      { id: "accounting.get_pre_bill_batch", name: "Get pre-bill batch", description: "Retrieve pre-bill batch details and line items.", category: "Pre-bills", mutates: false, requiresApproval: false },
      { id: "accounting.post_invoice", name: "Post invoice", description: "Code and post an AP invoice.", category: "Invoices", mutates: true, requiresApproval: true },
      { id: "accounting.get_invoice", name: "Get invoice", description: "Retrieve invoice details.", category: "Invoices", mutates: false, requiresApproval: false },
    ],
  },
  {
    id: "mcp.renewals",
    name: "Renewals MCP",
    description: "Renewal offers, lease expirations, rent adjustments, and resident retention.",
    icon: "RefreshCw",
    category: "Renewals",
    defaultEnabled: false,
    tools: [
      { id: "renewals.get_expiring_leases", name: "Get expiring leases", description: "List leases expiring within a date range.", category: "Leases", mutates: false, requiresApproval: false },
      { id: "renewals.create_renewal_offer", name: "Create renewal offer", description: "Generate a renewal offer for a resident.", category: "Offers", mutates: true, requiresApproval: true, sensitivity: "restricted" },
      { id: "renewals.get_renewal_offer", name: "Get renewal offer", description: "Retrieve renewal offer details.", category: "Offers", mutates: false, requiresApproval: false },
      { id: "renewals.get_market_rent", name: "Get market rent", description: "Look up current market rent for a unit type.", category: "Pricing", mutates: false, requiresApproval: false, sensitivity: "restricted" },
      { id: "renewals.get_resident_history", name: "Get resident history", description: "Payment history, violations, and tenure for retention scoring.", category: "Residents", mutates: false, requiresApproval: false, sensitivity: "sensitive" },
    ],
  },
  {
    id: "mcp.communications",
    name: "Communications MCP",
    description: "Send and receive messages across SMS, email, voice, and chat channels.",
    icon: "MessageSquare",
    category: "Communications",
    defaultEnabled: false,
    tools: [
      { id: "comms.send_sms", name: "Send SMS", description: "Send a text message to a phone number.", category: "Messaging", mutates: true, requiresApproval: false },
      { id: "comms.send_email", name: "Send email", description: "Send an email from the agent mailbox.", category: "Messaging", mutates: true, requiresApproval: false },
      { id: "comms.reply_message", name: "Reply to message", description: "Reply to an inbound text or email.", category: "Messaging", mutates: true, requiresApproval: false },
      { id: "comms.get_thread", name: "Get conversation thread", description: "Retrieve conversation history for a contact.", category: "History", mutates: false, requiresApproval: false },
      { id: "comms.warm_transfer", name: "Warm transfer", description: "Transfer a live call to a human with context.", category: "Voice", mutates: true, requiresApproval: false },
      { id: "comms.take_message", name: "Take a message", description: "Capture a voicemail-style message.", category: "Voice", mutates: true, requiresApproval: false },
    ],
  },
  {
    id: "mcp.residents",
    name: "Residents MCP",
    description: "Resident profiles, lease data, move-in/move-out, and identity verification.",
    icon: "Users",
    category: "Residents",
    defaultEnabled: false,
    tools: [
      { id: "residents.get_resident", name: "Get resident profile", description: "Retrieve resident identity, contact info, unit, and household.", category: "Profile", mutates: false, requiresApproval: false, sensitivity: "sensitive" },
      { id: "residents.verify_identity", name: "Verify resident identity", description: "Confirm a caller is a current resident before sharing account details.", category: "Security", mutates: false, requiresApproval: false, sensitivity: "sensitive" },
      { id: "residents.get_lease", name: "Get lease details", description: "Retrieve lease terms, dates, and rent amount.", category: "Lease", mutates: false, requiresApproval: false, sensitivity: "sensitive" },
      { id: "residents.post_note", name: "Post note", description: "Add a note to a resident's record.", category: "Notes", mutates: true, requiresApproval: false },
      { id: "residents.get_balance", name: "Get balance", description: "Check a resident's current balance.", category: "Financials", mutates: false, requiresApproval: false, sensitivity: "sensitive" },
    ],
  },
];

/**
 * Capabilities we know users will ask for but don't yet have MCPs/tools to support.
 * Used by the capability-validation step to clearly communicate gaps.
 */
export type UnsupportedCapability = {
  id: string;
  label: string;
  description: string;
  category: string;
  reason: string;
};

export const UNSUPPORTED_CAPABILITIES: UnsupportedCapability[] = [
  {
    id: "unsupported.weather",
    label: "Weather data",
    description: "Check current or forecasted weather conditions.",
    category: "External",
    reason: "No weather API integration exists. Entrata does not have a weather data MCP.",
  },
  {
    id: "unsupported.credit_check",
    label: "Credit check / screening",
    description: "Run credit checks or background screenings on applicants.",
    category: "External",
    reason: "Credit bureau integrations (Experian, TransUnion, Equifax) are not available as MCP tools.",
  },
  {
    id: "unsupported.package_tracking",
    label: "Package tracking",
    description: "Track inbound packages via USPS, FedEx, UPS, or Amazon.",
    category: "External",
    reason: "No package carrier tracking API integration exists.",
  },
  {
    id: "unsupported.social_media",
    label: "Social media posting",
    description: "Post to social media platforms (Facebook, Instagram, X/Twitter).",
    category: "External",
    reason: "Social media platform integrations are not available.",
  },
  {
    id: "unsupported.smart_lock",
    label: "Smart lock / access control",
    description: "Lock or unlock doors, generate access codes, or manage smart home devices.",
    category: "IoT",
    reason: "Smart lock and IoT device integrations are not yet available as MCP tools.",
  },
  {
    id: "unsupported.utility_provider",
    label: "Utility provider API",
    description: "Connect to utility companies (electric, gas, water) to read meters or transfer service.",
    category: "External",
    reason: "Direct utility provider integrations are not available.",
  },
  {
    id: "unsupported.insurance_verify",
    label: "Insurance verification",
    description: "Verify renters insurance policies with insurance carriers.",
    category: "External",
    reason: "Insurance carrier API integrations are not available.",
  },
  {
    id: "unsupported.payment_processing",
    label: "External payment processing",
    description: "Process payments through Venmo, Zelle, CashApp, or PayPal.",
    category: "External",
    reason: "Third-party payment processor integrations are not available. Payments must go through Entrata's built-in payment system.",
  },
  {
    id: "unsupported.translation",
    label: "Real-time translation",
    description: "Translate text or speech between languages in real-time.",
    category: "External",
    reason: "Real-time translation service integrations (Google Translate, DeepL) are not available.",
  },
  {
    id: "unsupported.calendar_sync",
    label: "External calendar sync",
    description: "Sync with Google Calendar, Outlook, or iCal.",
    category: "External",
    reason: "External calendar service integrations are not available.",
  },
  {
    id: "unsupported.market_research",
    label: "Market rent comparisons (external)",
    description: "Pull competitive rent data from external sources like Zillow, Apartments.com, or CoStar.",
    category: "External",
    reason: "External market data provider integrations are not available. Internal market rent data is available via the Renewals MCP.",
  },
];

/** Flat list of all tools across all MCP servers for search/filter. */
export function allMcpTools(): Array<McpTool & { serverId: string; serverName: string }> {
  return MCP_SERVER_CATALOG.flatMap((s) =>
    s.tools.map((t) => ({ ...t, serverId: s.id, serverName: s.name }))
  );
}

/**
 * Given an array of tool IDs (e.g. from LLM generation), derive the
 * corresponding McpServerConfig[] with each relevant server enabled
 * and restrictedToolIds set to only the referenced tools.
 */
export function deriveMcpServersFromToolIds(
  skillIds: string[],
): Array<{
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  enabled: boolean;
  restrictedToolIds?: string[];
}> {
  const serverMap = new Map<string, string[]>();
  for (const toolId of skillIds) {
    const server = MCP_SERVER_CATALOG.find((s) => s.tools.some((t) => t.id === toolId));
    if (!server) continue;
    const existing = serverMap.get(server.id) ?? [];
    existing.push(toolId);
    serverMap.set(server.id, existing);
  }
  return Array.from(serverMap.entries()).map(([serverId, toolIds]) => {
    const def = MCP_SERVER_CATALOG.find((s) => s.id === serverId)!;
    const useAll = toolIds.length === def.tools.length;
    return {
      id: serverId,
      name: def.name,
      description: def.description,
      icon: def.icon,
      category: def.category,
      enabled: true,
      restrictedToolIds: useAll ? undefined : toolIds,
    };
  });
}

/**
 * Represents one discrete capability the agent needs, mapped to the
 * MCP tool (or gap) that would fulfill it.
 */
export type CapabilityMapping = {
  id: string;
  capability: string;
  status: "supported" | "no_access" | "unavailable";
  toolId?: string;
  toolLabel?: string;
  serverName?: string;
  reason?: string;
};

export type CapabilityAnalysis = {
  capabilities: CapabilityMapping[];
  supported: CapabilityMapping[];
  unsupported: CapabilityMapping[];
};

/**
 * Build the system prompt for capability analysis.
 */
export function buildCapabilityAnalysisPrompt(): string {
  const allTools = allMcpTools();
  const toolList = allTools
    .map((t) => `  - ${t.id}: ${t.name} — ${t.description} [Server: ${t.serverName}]`)
    .join("\n");

  const unsupportedList = UNSUPPORTED_CAPABILITIES
    .map((u) => `  - ${u.id}: ${u.label} — ${u.description}`)
    .join("\n");

  return `You are an expert at analyzing AI agent prompts for a property management platform (Entrata).

Given an agent's system prompt, extract every distinct capability or action the agent needs to perform. Then map each capability to either an available MCP tool or mark it as unsupported.

## Available MCP Tools
${toolList}

## Known Unsupported Capabilities
${unsupportedList}

## Rules
1. Extract EVERY distinct action/capability from the prompt — be thorough
2. Group related sub-actions under one capability when they clearly belong together
3. For each capability, determine if an available MCP tool can fulfill it
4. If the capability matches a known unsupported item, mark status as "unavailable"
5. If a tool exists but is not in the agent's enabled servers, mark status as "no_access"
6. If no tool exists at all, mark status as "unavailable"
7. Be specific — "Send email to residents" maps to comms.send_email, not just "Communications MCP"
8. Include internal prompt capabilities like "analyze data" or "make decisions" as "supported" with toolId "llm.reasoning"

## Output Format
Return a JSON object:
{
  "capabilities": [
    {
      "id": "cap_1",
      "capability": "Short description of what the agent needs to do",
      "status": "supported" | "no_access" | "unavailable",
      "toolId": "the.tool.id or null",
      "toolLabel": "Human-readable tool name",
      "serverName": "Name of the MCP server",
      "reason": "Why this is unsupported (only for no_access/unavailable)"
    }
  ]
}

Return ONLY the JSON object.`;
}

/**
 * Analyze the agent's prompt against available and enabled MCP tools.
 * Returns a structured mapping of capabilities to tools/gaps.
 */
export function analyzeCapabilitiesLocally(
  prompt: string,
  enabledServers: Array<{ id: string; enabled: boolean; restrictedToolIds?: string[] }>,
): CapabilityAnalysis {
  const capabilities: CapabilityMapping[] = [];
  const p = prompt.toLowerCase();
  let capId = 1;

  const enabledToolIds = new Set<string>();
  for (const server of enabledServers) {
    if (!server.enabled) continue;
    const def = MCP_SERVER_CATALOG.find((s) => s.id === server.id);
    if (!def) continue;
    const toolIds = server.restrictedToolIds ?? def.tools.map((t) => t.id);
    for (const tid of toolIds) enabledToolIds.add(tid);
  }

  const allTools = allMcpTools();
  const findTool = (id: string) => allTools.find((t) => t.id === id);

  const matchAndAdd = (
    keywords: string[],
    capLabel: string,
    toolId: string,
  ) => {
    if (!keywords.some((kw) => p.includes(kw))) return;
    const tool = findTool(toolId);
    if (!tool) return;

    if (enabledToolIds.has(toolId)) {
      capabilities.push({
        id: `cap_${capId++}`,
        capability: capLabel,
        status: "supported",
        toolId,
        toolLabel: tool.name,
        serverName: tool.serverName,
      });
    } else {
      capabilities.push({
        id: `cap_${capId++}`,
        capability: capLabel,
        status: "no_access",
        toolId,
        toolLabel: tool.name,
        serverName: tool.serverName,
        reason: `Tool exists in ${tool.serverName} but the agent does not have access. Enable the server or grant access to this tool.`,
      });
    }
  };

  matchAndAdd(["send email", "email notification", "email the", "send an email", "email to"], "Send email notifications", "comms.send_email");
  matchAndAdd(["send sms", "text message", "sms notification", "send a text", "send text"], "Send SMS / text messages", "comms.send_sms");
  matchAndAdd(["work order", "maintenance request", "repair request"], "Create or manage work orders", "maintenance.create_work_order");
  matchAndAdd(["resident profile", "resident info", "resident data", "resident record"], "Access resident profiles", "residents.get_resident");
  matchAndAdd(["verify identity", "confirm identity", "identity verification"], "Verify resident identity", "residents.verify_identity");
  matchAndAdd(["lease detail", "lease term", "lease info", "lease data"], "Access lease details", "residents.get_lease");
  matchAndAdd(["balance", "outstanding balance", "amount owed", "amount due"], "Check resident balances", "residents.get_balance");
  matchAndAdd(["ledger", "charges", "credits", "financial history"], "Access resident ledger", "accounting.get_resident_ledger");
  matchAndAdd(["post charge", "add charge", "apply fee", "late fee"], "Post charges to ledger", "accounting.post_charge");
  matchAndAdd(["waive fee", "waive charge", "remove fee", "credit"], "Waive fees", "accounting.waive_fee");
  matchAndAdd(["renewal offer", "renew lease", "renewal", "retention"], "Create renewal offers", "renewals.create_renewal_offer");
  matchAndAdd(["expiring lease", "lease expir"], "Find expiring leases", "renewals.get_expiring_leases");
  matchAndAdd(["market rent", "market rate", "comparable rent", "comp rent"], "Look up market rent", "renewals.get_market_rent");
  matchAndAdd(["tour", "schedule tour", "book tour", "tour appointment"], "Schedule property tours", "leasing.schedule_tour");
  matchAndAdd(["lead", "prospect", "guest card", "new lead"], "Manage leads / prospects", "leasing.search_leads");
  matchAndAdd(["available unit", "availability", "vacant unit"], "Check unit availability", "leasing.available_units");
  matchAndAdd(["floorplan", "floor plan", "unit layout"], "Access floorplan information", "leasing.get_floorplans");
  matchAndAdd(["amenity", "amenities", "community feature"], "List property amenities", "leasing.property_amenities");
  matchAndAdd(["warm transfer", "transfer call", "connect to agent", "transfer to"], "Warm-transfer calls to humans", "comms.warm_transfer");
  matchAndAdd(["vendor", "dispatch vendor", "assign vendor"], "Dispatch maintenance vendors", "maintenance.dispatch_vendor");
  matchAndAdd(["invoice", "post invoice"], "Post AP invoices", "accounting.post_invoice");
  matchAndAdd(["pre-bill", "prebill", "utility bill"], "Manage utility pre-bills", "accounting.approve_pre_bill");
  matchAndAdd(["resident history", "payment history", "tenant history"], "Access resident payment history", "renewals.get_resident_history");
  matchAndAdd(["property polic", "pet policy", "smoking policy", "parking policy"], "Access property policies", "leasing.property_policies");
  matchAndAdd(["note", "add note", "post note", "resident note"], "Post notes to resident records", "residents.post_note");
  matchAndAdd(["conversation thread", "message history", "chat history"], "Access conversation history", "comms.get_thread");

  for (const unsup of UNSUPPORTED_CAPABILITIES) {
    const kw = unsup.label.toLowerCase().split(/\s+/);
    const matchesDesc = unsup.description.toLowerCase().split(/\s+/);
    const combined = [...kw, ...matchesDesc];
    const uniqueWords = combined.filter((w) => w.length > 3);

    if (uniqueWords.some((w) => p.includes(w))) {
      const alreadyMapped = capabilities.some(
        (c) => c.capability.toLowerCase().includes(unsup.label.toLowerCase()),
      );
      if (!alreadyMapped) {
        capabilities.push({
          id: `cap_${capId++}`,
          capability: unsup.label,
          status: "unavailable",
          reason: unsup.reason,
        });
      }
    }
  }

  if (p.includes("weather") || p.includes("forecast") || p.includes("temperature")) {
    const alreadyAdded = capabilities.some((c) => c.capability.toLowerCase().includes("weather"));
    if (!alreadyAdded) {
      capabilities.push({
        id: `cap_${capId++}`,
        capability: "Check weather conditions",
        status: "unavailable",
        reason: "No weather API integration exists. Entrata does not have a weather data MCP.",
      });
    }
  }

  const supportedCaps = capabilities.filter((c) => c.status === "supported");
  const unsupportedCaps = capabilities.filter((c) => c.status !== "supported");

  return { capabilities, supported: supportedCaps, unsupported: unsupportedCaps };
}

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

/** Flat list of all tools across all MCP servers for search/filter. */
export function allMcpTools(): Array<McpTool & { serverId: string; serverName: string }> {
  return MCP_SERVER_CATALOG.flatMap((s) =>
    s.tools.map((t) => ({ ...t, serverId: s.id, serverName: s.name }))
  );
}

"use client";

import { useState, useRef } from "react";
import type {
  WorkflowNodeData,
  RetryPolicy,
  GeneratedWorkflow,
  OutputField,
} from "./types";
import {
  allMcpTools,
  MCP_SERVER_CATALOG,
} from "@/components/custom-agent-builder/lib/mcp-server-catalog";
import {
  X,
  Cog,
  Database,
  AlertTriangle,
  ArrowRight,
  Zap,
  GitBranch,
  Repeat,
  Clock,
  CircleCheckBig,
  Trash2,
  Shield,
  ChevronDown,
  ArrowDown,
} from "lucide-react";

interface NodeConfigPanelProps {
  nodeId: string;
  data: WorkflowNodeData;
  workflow: GeneratedWorkflow;
  onUpdate: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

const DEFAULT_RETRY: RetryPolicy = { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 };

// ─── Tool INPUT parameters ───

const TOOL_PARAMS: Record<string, Array<{ name: string; type: string; required: boolean; description: string }>> = {
  "leasing.search_leads": [
    { name: "query", type: "string", required: true, description: "Search by name, email, or phone" },
    { name: "property_id", type: "number", required: false, description: "Filter by property" },
    { name: "limit", type: "number", required: false, description: "Max results to return" },
  ],
  "leasing.capture_lead": [
    { name: "first_name", type: "string", required: true, description: "Lead first name" },
    { name: "last_name", type: "string", required: true, description: "Lead last name" },
    { name: "email", type: "string", required: false, description: "Lead email address" },
    { name: "phone", type: "string", required: false, description: "Lead phone number" },
    { name: "property_id", type: "number", required: true, description: "Target property" },
    { name: "source", type: "string", required: false, description: "Lead source (website, walk-in, referral)" },
  ],
  "maintenance.get_work_order": [
    { name: "work_order_id", type: "number", required: true, description: "Work order ID" },
  ],
  "maintenance.create_work_order": [
    { name: "property_id", type: "number", required: true, description: "Property ID" },
    { name: "unit_id", type: "number", required: false, description: "Unit ID" },
    { name: "description", type: "string", required: true, description: "Issue description" },
    { name: "priority", type: "string", required: true, description: "low, medium, high, emergency" },
    { name: "category", type: "string", required: false, description: "Issue category" },
  ],
  "maintenance.dispatch_vendor": [
    { name: "work_order_id", type: "number", required: true, description: "Work order to assign" },
    { name: "vendor_id", type: "number", required: false, description: "Specific vendor ID" },
    { name: "urgency", type: "string", required: true, description: "routine, urgent, emergency" },
  ],
  "maintenance.update_work_order": [
    { name: "work_order_id", type: "number", required: true, description: "Work order ID" },
    { name: "status", type: "string", required: false, description: "New status" },
    { name: "priority", type: "string", required: false, description: "New priority" },
    { name: "notes", type: "string", required: false, description: "Notes to add" },
  ],
  "comms.send_sms": [
    { name: "to", type: "string", required: true, description: "Phone number" },
    { name: "body", type: "string", required: true, description: "Message content" },
    { name: "resident_id", type: "number", required: false, description: "Link to resident record" },
  ],
  "comms.send_email": [
    { name: "to", type: "string", required: true, description: "Recipient email" },
    { name: "subject", type: "string", required: true, description: "Email subject" },
    { name: "body", type: "string", required: true, description: "Email body (HTML or text)" },
    { name: "template_id", type: "string", required: false, description: "Use email template" },
  ],
  "renewals.get_expiring_leases": [
    { name: "property_id", type: "number", required: true, description: "Property ID" },
    { name: "days_out", type: "number", required: true, description: "Days until expiration" },
  ],
  "renewals.create_renewal_offer": [
    { name: "lease_id", type: "number", required: true, description: "Current lease ID" },
    { name: "new_rent", type: "number", required: true, description: "Proposed rent amount" },
    { name: "term_months", type: "number", required: true, description: "Proposed term length" },
  ],
  "renewals.get_market_rent": [
    { name: "property_id", type: "number", required: true, description: "Property ID" },
    { name: "unit_type", type: "string", required: true, description: "Unit type / floorplan" },
  ],
  "renewals.get_resident_history": [
    { name: "resident_id", type: "number", required: true, description: "Resident ID" },
  ],
  "residents.get_resident": [
    { name: "resident_id", type: "number", required: true, description: "Resident ID" },
  ],
  "residents.post_note": [
    { name: "resident_id", type: "number", required: true, description: "Resident ID" },
    { name: "note", type: "string", required: true, description: "Note content" },
    { name: "category", type: "string", required: false, description: "Note category" },
  ],
  "residents.get_balance": [
    { name: "resident_id", type: "number", required: true, description: "Resident ID" },
  ],
  "accounting.get_resident_ledger": [
    { name: "resident_id", type: "number", required: true, description: "Resident ID" },
    { name: "from_date", type: "string", required: false, description: "Start date (YYYY-MM-DD)" },
  ],
};

// ─── Tool OUTPUT schemas — what each tool returns ───

const TOOL_OUTPUTS: Record<string, OutputField[]> = {
  "leasing.search_leads": [
    { name: "leads", type: "array", sample: "[{id, first_name, last_name, email, phone, ...}]" },
    { name: "total_count", type: "number", sample: "42" },
  ],
  "leasing.capture_lead": [
    { name: "lead_id", type: "number", sample: "12345" },
    { name: "guest_card_id", type: "number", sample: "67890" },
  ],
  "leasing.available_units": [
    { name: "units", type: "array", sample: "[{unit_id, unit_number, floorplan, rent, available_date, ...}]" },
    { name: "total_available", type: "number", sample: "8" },
  ],
  "leasing.get_properties": [
    { name: "properties", type: "array", sample: "[{id, name, address, unit_count, ...}]" },
  ],
  "leasing.get_floorplans": [
    { name: "floorplans", type: "array", sample: "[{id, name, bedrooms, bathrooms, sqft, base_rent}]" },
  ],
  "maintenance.get_work_order": [
    { name: "work_order_id", type: "number", sample: "1001" },
    { name: "status", type: "string", sample: "open" },
    { name: "priority", type: "string", sample: "high" },
    { name: "description", type: "string", sample: "Leaking faucet in kitchen" },
    { name: "unit_id", type: "number", sample: "204" },
    { name: "resident_id", type: "number", sample: "5521" },
    { name: "created_at", type: "string", sample: "2026-06-20T14:00:00Z" },
  ],
  "maintenance.create_work_order": [
    { name: "work_order_id", type: "number", sample: "1002" },
    { name: "status", type: "string", sample: "open" },
  ],
  "maintenance.dispatch_vendor": [
    { name: "dispatch_id", type: "number", sample: "3001" },
    { name: "vendor_name", type: "string", sample: "ABC Plumbing" },
    { name: "eta", type: "string", sample: "2026-06-21T10:00:00Z" },
  ],
  "comms.send_sms": [
    { name: "message_id", type: "string", sample: "SMS-9921" },
    { name: "status", type: "string", sample: "delivered" },
  ],
  "comms.send_email": [
    { name: "message_id", type: "string", sample: "EM-3310" },
    { name: "status", type: "string", sample: "sent" },
  ],
  "renewals.get_expiring_leases": [
    { name: "leases", type: "array", sample: "[{lease_id, resident_id, unit_id, rent, expiration_date, ...}]" },
    { name: "total_count", type: "number", sample: "15" },
  ],
  "renewals.create_renewal_offer": [
    { name: "offer_id", type: "number", sample: "8821" },
    { name: "lease_id", type: "number", sample: "4521" },
    { name: "new_rent", type: "number", sample: "1990" },
    { name: "status", type: "string", sample: "pending" },
  ],
  "renewals.get_market_rent": [
    { name: "market_rent", type: "number", sample: "2100" },
    { name: "unit_type", type: "string", sample: "2BR/2BA" },
    { name: "effective_date", type: "string", sample: "2026-07-01" },
  ],
  "renewals.get_resident_history": [
    { name: "resident_id", type: "number", sample: "1102" },
    { name: "payment_history", type: "object", sample: "{on_time_pct: 98, late_count: 1, ...}" },
    { name: "lease_count", type: "number", sample: "2" },
    { name: "tenure_months", type: "number", sample: "24" },
    { name: "violations", type: "array", sample: "[]" },
    { name: "retention_score", type: "number", sample: "87" },
  ],
  "residents.get_resident": [
    { name: "resident_id", type: "number", sample: "1102" },
    { name: "first_name", type: "string", sample: "Jane" },
    { name: "last_name", type: "string", sample: "Smith" },
    { name: "email", type: "string", sample: "jane.smith@email.com" },
    { name: "phone", type: "string", sample: "+1-555-0142" },
    { name: "unit_id", type: "number", sample: "204" },
    { name: "unit_number", type: "string", sample: "204B" },
    { name: "lease_id", type: "number", sample: "4521" },
    { name: "move_in_date", type: "string", sample: "2024-07-01" },
  ],
  "residents.get_balance": [
    { name: "resident_id", type: "number", sample: "1102" },
    { name: "current_balance", type: "number", sample: "0.00" },
    { name: "past_due", type: "number", sample: "0.00" },
  ],
  "accounting.get_resident_ledger": [
    { name: "entries", type: "array", sample: "[{date, description, amount, balance, ...}]" },
    { name: "current_balance", type: "number", sample: "150.00" },
  ],
};

// ─── Trigger event schemas — what each trigger event produces ───

const TRIGGER_EVENT_SCHEMAS: Record<string, OutputField[]> = {
  "lease_signed": [
    { name: "lease_id", type: "number", sample: "4521" },
    { name: "resident_id", type: "number", sample: "1102" },
    { name: "unit_id", type: "number", sample: "204" },
    { name: "unit_number", type: "string", sample: "204B" },
    { name: "property_id", type: "number", sample: "100" },
    { name: "rent_amount", type: "number", sample: "1850" },
    { name: "lease_start", type: "string", sample: "2026-07-01" },
    { name: "lease_end", type: "string", sample: "2027-06-30" },
    { name: "term_months", type: "number", sample: "12" },
    { name: "resident_name", type: "string", sample: "Jane Smith" },
    { name: "resident_email", type: "string", sample: "jane.smith@email.com" },
  ],
  "renewal_signed": [
    { name: "lease_id", type: "number", sample: "4521" },
    { name: "resident_id", type: "number", sample: "1102" },
    { name: "unit_id", type: "number", sample: "204" },
    { name: "property_id", type: "number", sample: "100" },
    { name: "old_rent", type: "number", sample: "1800" },
    { name: "new_rent", type: "number", sample: "1850" },
    { name: "new_lease_start", type: "string", sample: "2026-07-01" },
    { name: "new_lease_end", type: "string", sample: "2027-06-30" },
    { name: "resident_name", type: "string", sample: "Jane Smith" },
    { name: "resident_email", type: "string", sample: "jane.smith@email.com" },
  ],
  "work_order_created": [
    { name: "work_order_id", type: "number", sample: "1001" },
    { name: "property_id", type: "number", sample: "100" },
    { name: "unit_id", type: "number", sample: "204" },
    { name: "resident_id", type: "number", sample: "1102" },
    { name: "description", type: "string", sample: "Leaking faucet in kitchen" },
    { name: "priority", type: "string", sample: "high" },
    { name: "category", type: "string", sample: "plumbing" },
  ],
  "payment_received": [
    { name: "payment_id", type: "number", sample: "9001" },
    { name: "resident_id", type: "number", sample: "1102" },
    { name: "amount", type: "number", sample: "1850" },
    { name: "payment_method", type: "string", sample: "ach" },
    { name: "ledger_balance", type: "number", sample: "0.00" },
    { name: "property_id", type: "number", sample: "100" },
  ],
  "lease_expiring": [
    { name: "lease_id", type: "number", sample: "4521" },
    { name: "resident_id", type: "number", sample: "1102" },
    { name: "unit_id", type: "number", sample: "204" },
    { name: "property_id", type: "number", sample: "100" },
    { name: "expiration_date", type: "string", sample: "2026-09-30" },
    { name: "days_remaining", type: "number", sample: "87" },
    { name: "current_rent", type: "number", sample: "1800" },
    { name: "resident_name", type: "string", sample: "Jane Smith" },
    { name: "resident_email", type: "string", sample: "jane.smith@email.com" },
  ],
  "move_in": [
    { name: "resident_id", type: "number", sample: "1102" },
    { name: "lease_id", type: "number", sample: "4521" },
    { name: "unit_id", type: "number", sample: "204" },
    { name: "property_id", type: "number", sample: "100" },
    { name: "move_in_date", type: "string", sample: "2026-07-01" },
    { name: "resident_name", type: "string", sample: "Jane Smith" },
    { name: "resident_email", type: "string", sample: "jane.smith@email.com" },
    { name: "resident_phone", type: "string", sample: "+1-555-0142" },
  ],
  "move_out": [
    { name: "resident_id", type: "number", sample: "1102" },
    { name: "lease_id", type: "number", sample: "4521" },
    { name: "unit_id", type: "number", sample: "204" },
    { name: "property_id", type: "number", sample: "100" },
    { name: "move_out_date", type: "string", sample: "2026-06-30" },
    { name: "balance_due", type: "number", sample: "0.00" },
  ],
  "invoice_received": [
    { name: "invoice_id", type: "number", sample: "7001" },
    { name: "vendor_name", type: "string", sample: "ABC Plumbing" },
    { name: "amount", type: "number", sample: "2750" },
    { name: "property_id", type: "number", sample: "100" },
    { name: "due_date", type: "string", sample: "2026-07-15" },
    { name: "line_items", type: "array", sample: "[{description, amount, gl_code}]" },
  ],
  "schedule": [
    { name: "run_time", type: "string", sample: "2026-06-26T02:00:00Z" },
    { name: "schedule_name", type: "string", sample: "Nightly at 2:00 AM" },
  ],
  "manual": [
    { name: "triggered_by", type: "string", sample: "user@entrata.com" },
    { name: "triggered_at", type: "string", sample: "2026-06-26T14:30:00Z" },
  ],
};

const TRIGGER_EVENTS = Object.entries(TRIGGER_EVENT_SCHEMAS).map(([key, fields]) => ({
  id: key,
  label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  fieldCount: fields.length,
}));

// ─── Helpers ───

function NodeIcon({ type }: { type: WorkflowNodeData["type"] }) {
  const cls = "h-4 w-4";
  switch (type) {
    case "trigger": return <Zap className={cls} />;
    case "condition": return <GitBranch className={cls} />;
    case "action": return <Cog className={cls} />;
    case "loop": return <Repeat className={cls} />;
    case "delay": return <Clock className={cls} />;
    case "end": return <CircleCheckBig className={cls} />;
  }
}

function getNodeOutputFields(node: { type: string; mcpTool?: string; config?: Record<string, string>; outputFields?: OutputField[] }): OutputField[] {
  if (node.outputFields && node.outputFields.length > 0) return node.outputFields;
  if (node.type === "trigger") {
    const eventType = node.config?.["event_type"];
    if (eventType && TRIGGER_EVENT_SCHEMAS[eventType]) return TRIGGER_EVENT_SCHEMAS[eventType];
    return TRIGGER_EVENT_SCHEMAS["manual"];
  }
  if (node.mcpTool && TOOL_OUTPUTS[node.mcpTool]) return TOOL_OUTPUTS[node.mcpTool];
  return [
    { name: "result", type: "object" },
    { name: "success", type: "boolean" },
  ];
}

// ─── Data Pill Picker (inline dropdown for parameter fields) ───

function DataPillPicker({
  upstreamNodes,
  onSelect,
}: {
  upstreamNodes: Array<{ id: string; type: string; label: string; mcpTool?: string; config?: Record<string, string>; outputFields?: OutputField[] }>;
  onSelect: (expression: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (upstreamNodes.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-[26px] items-center gap-0.5 rounded border border-indigo-200 bg-indigo-50 px-1.5 text-[9px] font-semibold text-indigo-600 hover:bg-indigo-100"
        title="Insert data from a previous step"
      >
        <Database className="h-2.5 w-2.5" />
        <ChevronDown className="h-2 w-2" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-white shadow-xl">
          <div className="border-b border-border px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Insert data from previous step</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {upstreamNodes.map((un) => {
              const fields = getNodeOutputFields(un);
              return (
                <div key={un.id} className="border-b border-border/50 last:border-b-0">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5">
                    <NodeIcon type={un.type as WorkflowNodeData["type"]} />
                    <span className="text-[10px] font-semibold text-foreground">{un.label}</span>
                    <span className="ml-auto text-[9px] text-muted-foreground">{fields.length} fields</span>
                  </div>
                  <div className="py-1">
                    {fields.map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => {
                          onSelect(`{{${un.id}.${f.name}}}`);
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-indigo-50"
                      >
                        <span className="shrink-0 rounded bg-indigo-100 px-1 py-px text-[8px] font-mono font-bold text-indigo-600">{f.type}</span>
                        <span className="text-[11px] font-medium text-foreground">{f.name}</span>
                        {f.sample && <span className="ml-auto truncate text-[9px] text-muted-foreground max-w-[100px]">{f.sample}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───

export function NodeConfigPanel({
  nodeId,
  data,
  workflow,
  onUpdate,
  onDelete,
  onClose,
}: NodeConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<"config" | "mapping" | "errors">("config");
  const [showToolPicker, setShowToolPicker] = useState(false);
  const [toolSearch, setToolSearch] = useState("");

  const currentTool = data.mcpTool
    ? allMcpTools().find((t) => t.id === data.mcpTool)
    : null;

  const toolParams = data.mcpTool ? (TOOL_PARAMS[data.mcpTool] ?? []) : [];
  const toolOutputs = getNodeOutputFields(data);

  const upstreamNodes = workflow.nodes.filter((n) => {
    const reachable = new Set<string>();
    function walk(id: string) {
      for (const e of workflow.edges) {
        if (e.source === id && !reachable.has(e.target)) {
          reachable.add(e.target);
          walk(e.target);
        }
      }
    }
    walk(n.id);
    return reachable.has(nodeId) && n.id !== nodeId;
  });

  const filteredTools = allMcpTools().filter(
    (t) =>
      !toolSearch ||
      t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.id.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(toolSearch.toLowerCase()),
  );

  const retry = data.retryPolicy ?? DEFAULT_RETRY;

  return (
    <div className="flex h-full w-[380px] flex-col border-l border-border bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <NodeIcon type={data.type} />
        </div>
        <div className="min-w-0 flex-1">
          <input
            className="w-full truncate bg-transparent text-sm font-semibold text-foreground outline-none focus:underline"
            value={data.label}
            onChange={(e) => onUpdate(nodeId, { label: e.target.value })}
          />
          <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
            {data.type} node
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(nodeId)}
          className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Delete node"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(
          [
            { id: "config" as const, label: "Configuration", icon: Cog },
            { id: "mapping" as const, label: "Data Flow", icon: ArrowRight },
            { id: "errors" as const, label: "Error Handling", icon: AlertTriangle },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-[11px] font-medium transition-colors ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "config" && (
          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Description</label>
              <textarea
                className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                rows={2}
                value={data.description}
                onChange={(e) => onUpdate(nodeId, { description: e.target.value })}
              />
            </div>

            {/* Trigger Event Type */}
            {data.type === "trigger" && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Trigger Event</label>
                <select
                  className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs focus:border-indigo-300 focus:outline-none"
                  value={data.config?.["event_type"] ?? ""}
                  onChange={(e) =>
                    onUpdate(nodeId, { config: { ...data.config, event_type: e.target.value } })
                  }
                >
                  <option value="">Select an event...</option>
                  {TRIGGER_EVENTS.map((evt) => (
                    <option key={evt.id} value={evt.id}>{evt.label} ({evt.fieldCount} fields)</option>
                  ))}
                </select>
                {data.config?.["event_type"] && TRIGGER_EVENT_SCHEMAS[data.config["event_type"]] && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      <Zap className="mr-0.5 inline h-2.5 w-2.5" /> Trigger payload ({TRIGGER_EVENT_SCHEMAS[data.config["event_type"]].length} fields)
                    </p>
                    <div className="space-y-0.5">
                      {TRIGGER_EVENT_SCHEMAS[data.config["event_type"]].map((f) => (
                        <div key={f.name} className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px]">
                          <span className="shrink-0 rounded bg-amber-200/60 px-1 py-px font-mono text-[8px] font-bold text-amber-800">{f.type}</span>
                          <span className="font-medium text-amber-900">{f.name}</span>
                          {f.sample && <span className="ml-auto text-[9px] text-amber-600">{f.sample}</span>}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[9px] text-amber-600">These fields are available as data pills in all downstream steps.</p>
                  </div>
                )}
              </div>
            )}

            {/* MCP Tool Selector */}
            {(data.type === "action" || (data.type === "trigger" && !data.config?.["event_type"])) && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">MCP Tool</label>
                {currentTool && !showToolPicker ? (
                  <div className="rounded-lg border border-border bg-slate-50 p-2.5">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 shrink-0 text-emerald-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">{currentTool.name}</p>
                        <p className="truncate text-[10px] font-mono text-muted-foreground">{currentTool.id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowToolPicker(true)}
                        className="rounded px-2 py-0.5 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50"
                      >
                        Change
                      </button>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-relaxed text-gray-500">{currentTool.description}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      {currentTool.mutates && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">Write</span>
                      )}
                      {currentTool.requiresApproval && (
                        <span className="flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700">
                          <Shield className="h-2.5 w-2.5" /> Approval
                        </span>
                      )}
                      {currentTool.sensitivity && currentTool.sensitivity !== "standard" && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-purple-700">{currentTool.sensitivity}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-white">
                    <input
                      type="text"
                      placeholder="Search MCP tools..."
                      className="w-full rounded-t-lg border-b border-border bg-slate-50 px-3 py-2 text-xs focus:outline-none"
                      value={toolSearch}
                      onChange={(e) => setToolSearch(e.target.value)}
                      autoFocus
                    />
                    <div className="max-h-48 overflow-y-auto">
                      {MCP_SERVER_CATALOG.map((server) => {
                        const serverTools = filteredTools.filter((t) => t.serverId === server.id);
                        if (serverTools.length === 0) return null;
                        return (
                          <div key={server.id}>
                            <div className="sticky top-0 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              {server.name}
                            </div>
                            {serverTools.map((tool) => (
                              <button
                                key={tool.id}
                                type="button"
                                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-indigo-50"
                                onClick={() => {
                                  onUpdate(nodeId, {
                                    mcpTool: tool.id,
                                    mcpServer: tool.serverId,
                                  });
                                  setShowToolPicker(false);
                                  setToolSearch("");
                                }}
                              >
                                <Database className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                                <div>
                                  <p className="text-[11px] font-medium text-foreground">{tool.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{tool.description}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                    {showToolPicker && (
                      <button
                        type="button"
                        onClick={() => { setShowToolPicker(false); setToolSearch(""); }}
                        className="w-full border-t border-border py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tool Parameters with inline pill picker */}
            {toolParams.length > 0 && (
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Parameters</label>
                <div className="space-y-2">
                  {toolParams.map((param) => (
                    <div key={param.name} className="rounded-lg border border-border bg-slate-50 px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-foreground">{param.name}</span>
                        <span className="rounded bg-gray-200 px-1 py-px text-[9px] font-mono text-gray-600">{param.type}</span>
                        {param.required && <span className="text-[9px] font-bold text-red-500">required</span>}
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{param.description}</p>
                      <div className="mt-1.5 flex items-center gap-1">
                        <input
                          type="text"
                          placeholder={`Value or {{step.field}}...`}
                          className={`flex-1 rounded border bg-white px-2 py-1 text-[11px] focus:border-indigo-300 focus:outline-none ${
                            (data.config?.[param.name] ?? "").startsWith("{{")
                              ? "border-indigo-200 bg-indigo-50/30 font-mono text-indigo-700"
                              : "border-gray-200"
                          }`}
                          value={data.config?.[param.name] ?? ""}
                          onChange={(e) =>
                            onUpdate(nodeId, {
                              config: { ...data.config, [param.name]: e.target.value },
                            })
                          }
                        />
                        <DataPillPicker
                          upstreamNodes={upstreamNodes}
                          onSelect={(expr) =>
                            onUpdate(nodeId, {
                              config: { ...data.config, [param.name]: expr },
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Condition expression */}
            {data.type === "condition" && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Condition Expression</label>
                <div className="flex items-start gap-1">
                  <textarea
                    className="flex-1 rounded-lg border border-border bg-slate-50 px-3 py-2 font-mono text-xs text-foreground focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                    rows={2}
                    placeholder="e.g. {{trigger.priority}} === 'emergency'"
                    value={data.config?.["expression"] ?? ""}
                    onChange={(e) =>
                      onUpdate(nodeId, {
                        config: { ...data.config, expression: e.target.value },
                      })
                    }
                  />
                  <DataPillPicker
                    upstreamNodes={upstreamNodes}
                    onSelect={(expr) =>
                      onUpdate(nodeId, {
                        config: { ...data.config, expression: `${data.config?.["expression"] ?? ""}${expr}` },
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* Delay config */}
            {data.type === "delay" && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Wait Duration</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="w-20 rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs focus:border-indigo-300 focus:outline-none"
                    value={data.config?.["duration"] ?? "1"}
                    onChange={(e) =>
                      onUpdate(nodeId, {
                        config: { ...data.config, duration: e.target.value },
                      })
                    }
                  />
                  <select
                    className="flex-1 rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs focus:border-indigo-300 focus:outline-none"
                    value={data.config?.["unit"] ?? "hours"}
                    onChange={(e) =>
                      onUpdate(nodeId, {
                        config: { ...data.config, unit: e.target.value },
                      })
                    }
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="business_days">Business Days</option>
                  </select>
                </div>
              </div>
            )}

            {/* Loop config */}
            {data.type === "loop" && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Iterate Over</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    className="flex-1 rounded-lg border border-border bg-slate-50 px-3 py-2 font-mono text-xs focus:border-indigo-300 focus:outline-none"
                    placeholder="e.g. {{get_leases.output.items}}"
                    value={data.config?.["collection"] ?? ""}
                    onChange={(e) =>
                      onUpdate(nodeId, {
                        config: { ...data.config, collection: e.target.value },
                      })
                    }
                  />
                  <DataPillPicker
                    upstreamNodes={upstreamNodes}
                    onSelect={(expr) =>
                      onUpdate(nodeId, {
                        config: { ...data.config, collection: expr },
                      })
                    }
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-[11px] text-muted-foreground">Batch size</label>
                  <input
                    type="number"
                    className="w-16 rounded border border-border bg-slate-50 px-2 py-1 text-xs focus:border-indigo-300 focus:outline-none"
                    value={data.config?.["batchSize"] ?? "10"}
                    onChange={(e) =>
                      onUpdate(nodeId, {
                        config: { ...data.config, batchSize: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* Timeout */}
            {data.type !== "end" && data.type !== "trigger" && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Timeout (seconds)</label>
                <input
                  type="number"
                  className="w-24 rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs focus:border-indigo-300 focus:outline-none"
                  value={data.timeout ?? 30}
                  onChange={(e) => onUpdate(nodeId, { timeout: parseInt(e.target.value) || 30 })}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "mapping" && (
          <div className="space-y-4">
            {/* Data flow visualization */}
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Data flowing into this step
              </p>
              {upstreamNodes.length === 0 ? (
                <p className="text-[11px] italic text-muted-foreground">
                  {data.type === "trigger" ? "This is the entry point — it produces data for downstream steps." : "No upstream nodes connected."}
                </p>
              ) : (
                <div className="space-y-2">
                  {upstreamNodes.map((un) => {
                    const fields = getNodeOutputFields(un);
                    return (
                      <div key={un.id} className="rounded-lg border border-border bg-white p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <NodeIcon type={un.type as WorkflowNodeData["type"]} />
                          <span className="text-[11px] font-semibold text-foreground">{un.label}</span>
                          <ArrowDown className="ml-auto h-3 w-3 text-indigo-400" />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {fields.map((f) => (
                            <button
                              key={f.name}
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100"
                              onClick={() => {
                                navigator.clipboard.writeText(`{{${un.id}.${f.name}}}`);
                              }}
                              title={`Click to copy {{${un.id}.${f.name}}}${f.sample ? ` — sample: ${f.sample}` : ""}`}
                            >
                              <span className="rounded bg-indigo-200/60 px-0.5 text-[8px] font-mono font-bold">{f.type}</span>
                              {f.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Current step's configured mappings */}
            {toolParams.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Parameter mappings
                </p>
                <div className="space-y-1">
                  {toolParams.map((p) => {
                    const value = data.config?.[p.name] ?? "";
                    const isMapped = value.startsWith("{{");
                    return (
                      <div key={p.name} className={`flex items-center gap-2 rounded px-2.5 py-1.5 ${isMapped ? "bg-indigo-50" : value ? "bg-slate-50" : "bg-white border border-dashed border-gray-200"}`}>
                        <span className="text-[11px] font-medium text-foreground w-28 truncate">{p.name}</span>
                        {isMapped ? (
                          <span className="flex-1 truncate rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] text-indigo-700">{value}</span>
                        ) : value ? (
                          <span className="flex-1 truncate text-[10px] text-muted-foreground">&quot;{value}&quot;</span>
                        ) : (
                          <span className="flex-1 text-[10px] italic text-gray-300">not configured</span>
                        )}
                        {p.required && !value && (
                          <span className="shrink-0 text-[9px] font-bold text-red-500">!</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Output fields */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                <ArrowDown className="mr-0.5 inline h-2.5 w-2.5" /> Data produced by this step
              </p>
              <div className="space-y-1">
                {toolOutputs.map((f) => (
                  <div key={f.name} className="flex items-center gap-2 rounded bg-emerald-50 px-2.5 py-1.5">
                    <span className="shrink-0 rounded bg-emerald-200 px-1 py-px text-[9px] font-mono text-emerald-800">{f.type}</span>
                    <span className="text-[11px] font-medium text-emerald-900">{f.name}</span>
                    {f.sample && <span className="ml-auto truncate text-[9px] text-emerald-600 max-w-[120px]">{f.sample}</span>}
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[9px] text-muted-foreground">
                Reference these fields in downstream steps using <code className="rounded bg-slate-100 px-1 text-indigo-600">{`{{${nodeId}.field_name}}`}</code>
              </p>
            </div>
          </div>
        )}

        {activeTab === "errors" && (
          <div className="space-y-4">
            {/* Retry Policy */}
            <div>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Retry Policy</h4>
              <div className="space-y-2 rounded-lg border border-border bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-foreground">Max retries</label>
                  <input
                    type="number"
                    className="w-16 rounded border border-gray-200 bg-white px-2 py-1 text-center text-xs focus:border-indigo-300 focus:outline-none"
                    value={retry.maxRetries}
                    onChange={(e) =>
                      onUpdate(nodeId, { retryPolicy: { ...retry, maxRetries: parseInt(e.target.value) || 0 } })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-foreground">Initial backoff (ms)</label>
                  <input
                    type="number"
                    className="w-20 rounded border border-gray-200 bg-white px-2 py-1 text-center text-xs focus:border-indigo-300 focus:outline-none"
                    value={retry.backoffMs}
                    onChange={(e) =>
                      onUpdate(nodeId, { retryPolicy: { ...retry, backoffMs: parseInt(e.target.value) || 1000 } })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-foreground">Backoff multiplier</label>
                  <input
                    type="number"
                    step="0.5"
                    className="w-16 rounded border border-gray-200 bg-white px-2 py-1 text-center text-xs focus:border-indigo-300 focus:outline-none"
                    value={retry.backoffMultiplier}
                    onChange={(e) =>
                      onUpdate(nodeId, { retryPolicy: { ...retry, backoffMultiplier: parseFloat(e.target.value) || 2 } })
                    }
                  />
                </div>
              </div>
            </div>

            {/* On Error Behavior */}
            <div>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">On Error</h4>
              <div className="space-y-1.5">
                {(
                  [
                    { value: "stop", label: "Stop workflow", desc: "Halt execution and mark as failed" },
                    { value: "continue", label: "Continue to next step", desc: "Log error and proceed" },
                    { value: "branch", label: "Follow error path", desc: "Route to a dedicated error-handling branch" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                      (data.errorPath ?? "stop") === opt.value
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-border bg-white hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="errorPath"
                      className="mt-0.5"
                      checked={(data.errorPath ?? "stop") === opt.value}
                      onChange={() => onUpdate(nodeId, { errorPath: opt.value })}
                    />
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

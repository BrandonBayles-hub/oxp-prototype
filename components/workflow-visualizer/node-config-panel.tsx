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
  Filter,
  Plus,
} from "lucide-react";
import { FieldMapButton, type DataSourceGroup } from "./field-mapper";
import { WORKFLOW_PROPERTY_FIELDS, ERROR_PROPERTY_FIELDS } from "./formula-engine";

interface NodeConfigPanelProps {
  nodeId: string;
  data: WorkflowNodeData;
  workflow: GeneratedWorkflow;
  onUpdate: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
  /** Create or wire a dedicated on-error target node for this step. */
  onEnsureErrorBranch?: (nodeId: string) => void;
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
    let selectedEvts: string[] = [];
    try { selectedEvts = JSON.parse(node.config?.["selected_events"] ?? "[]"); } catch { /* ignore */ }
    if (selectedEvts.length === 0 && node.config?.["event_type"]) selectedEvts = [node.config["event_type"]];
    if (selectedEvts.length > 0) {
      const seen = new Set<string>();
      const merged: OutputField[] = [];
      for (const evtId of selectedEvts) {
        for (const f of (TRIGGER_EVENT_SCHEMAS[evtId] ?? [])) {
          if (!seen.has(f.name)) { seen.add(f.name); merged.push(f); }
        }
      }
      if (merged.length > 0) return merged;
    }
    return TRIGGER_EVENT_SCHEMAS["manual"];
  }
  if (node.mcpTool && TOOL_OUTPUTS[node.mcpTool]) return TOOL_OUTPUTS[node.mcpTool];
  return [
    { name: "result", type: "object" },
    { name: "success", type: "boolean" },
  ];
}

// ─── Trigger Configuration ───

function TriggerConfig({
  nodeId,
  data,
  onUpdate,
}: {
  nodeId: string;
  data: WorkflowNodeData;
  onUpdate: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
}) {
  const selectedEvents: string[] = (() => {
    try {
      const stored = data.config?.["selected_events"];
      if (stored) return JSON.parse(stored);
    } catch { /* ignore parse errors */ }
    const legacy = data.config?.["event_type"];
    if (legacy && TRIGGER_EVENT_SCHEMAS[legacy]) return [legacy];
    return [];
  })();

  const hasExplicitModeFlags = data.config?.["trigger_event_enabled"] !== undefined || data.config?.["trigger_schedule_enabled"] !== undefined;
  const hasScheduleConfig = !!(data.config?.["schedule_frequency"] || data.config?.["schedule_time"]);

  const eventEnabled = hasExplicitModeFlags
    ? data.config?.["trigger_event_enabled"] === "true"
    : selectedEvents.length > 0 || !hasScheduleConfig;
  const scheduleEnabled = hasExplicitModeFlags
    ? data.config?.["trigger_schedule_enabled"] === "true"
    : hasScheduleConfig;

  const [eventSearch, setEventSearch] = useState("");
  const [expandedPayload, setExpandedPayload] = useState<string | null>(null);

  const filteredEvents = TRIGGER_EVENTS.filter(
    (e) => !eventSearch || e.label.toLowerCase().includes(eventSearch.toLowerCase()) || e.id.toLowerCase().includes(eventSearch.toLowerCase()),
  );

  const buildDescription = (events: string[], schedOn: boolean, cfg: Record<string, string>) => {
    const parts: string[] = [];
    if (events.length > 0) {
      const labels = events.map((id) => TRIGGER_EVENTS.find((e) => e.id === id)?.label ?? id);
      parts.push(labels.length <= 2 ? labels.join(" or ") : `${labels[0]} + ${labels.length - 1} more`);
    }
    if (schedOn) {
      const freq = cfg["schedule_frequency"] ?? "daily";
      const time = cfg["schedule_time"] ?? "02:00";
      const tz = cfg["timezone"] ?? "America/Chicago";
      const tzAbbr = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts().find((p) => p.type === "timeZoneName")?.value ?? tz;
      const freqLabel: Record<string, string> = { every_15_min: "Every 15 min", hourly: "Hourly", daily: `Daily at ${time}`, weekly: `Weekly at ${time}`, monthly: `Monthly at ${time}`, cron: "Cron schedule" };
      parts.push(`${freqLabel[freq] ?? freq} ${tzAbbr}`);
    }
    return parts.length > 0 ? `Trigger: ${parts.join(" + ")}` : "Trigger workflow";
  };

  const toggleEvent = (eventId: string) => {
    const next = selectedEvents.includes(eventId)
      ? selectedEvents.filter((id) => id !== eventId)
      : [...selectedEvents, eventId];
    const cfg = {
      ...data.config,
      selected_events: JSON.stringify(next),
      event_type: next[0] ?? "",
    };
    onUpdate(nodeId, { config: cfg, description: buildDescription(next, scheduleEnabled, cfg) });
  };

  const toggleEventMode = () => {
    const next = !eventEnabled;
    if (!next && !scheduleEnabled) return;
    const cfg = { ...data.config, trigger_event_enabled: String(next) };
    const evts = next ? selectedEvents : [];
    onUpdate(nodeId, { config: cfg, description: buildDescription(evts, scheduleEnabled, cfg) });
  };

  const toggleScheduleMode = () => {
    const next = !scheduleEnabled;
    if (!next && !eventEnabled) return;
    const cfg = { ...data.config, trigger_schedule_enabled: String(next) };
    onUpdate(nodeId, { config: cfg, description: buildDescription(selectedEvents, next, cfg) });
  };

  const updateScheduleField = (field: string, value: string) => {
    const cfg = { ...data.config, [field]: value };
    onUpdate(nodeId, { config: cfg, description: buildDescription(selectedEvents, scheduleEnabled, cfg) });
  };

  return (
    <div className="space-y-3">
      {/* Mode selectors — both can be active */}
      <div>
        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Trigger Type</label>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={toggleEventMode}
            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[11px] font-semibold transition-colors ${
              eventEnabled
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-border bg-white text-muted-foreground hover:bg-slate-50"
            }`}
          >
            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              eventEnabled ? "border-amber-500 bg-amber-500 text-white" : "border-gray-300 bg-white"
            }`}>
              {eventEnabled && <span className="text-[9px] font-bold">&#10003;</span>}
            </div>
            <Zap className="h-3 w-3" /> Event
            <span className="ml-auto text-[9px] font-normal text-muted-foreground">Runs when an event fires</span>
          </button>
          <button
            type="button"
            onClick={toggleScheduleMode}
            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[11px] font-semibold transition-colors ${
              scheduleEnabled
                ? "border-blue-300 bg-blue-50 text-blue-800"
                : "border-border bg-white text-muted-foreground hover:bg-slate-50"
            }`}
          >
            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              scheduleEnabled ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300 bg-white"
            }`}>
              {scheduleEnabled && <span className="text-[9px] font-bold">&#10003;</span>}
            </div>
            <Clock className="h-3 w-3" /> Schedule
            <span className="ml-auto text-[9px] font-normal text-muted-foreground">Runs on a time schedule</span>
          </button>
        </div>
        {eventEnabled && scheduleEnabled && (
          <p className="mt-1.5 text-[9px] text-blue-600">This trigger fires on any selected event OR on the schedule — whichever comes first.</p>
        )}
      </div>

      {/* Event section */}
      {eventEnabled && (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Events <span className="font-normal text-muted-foreground">(select one or more)</span>
          </label>
          <div className="rounded-lg border border-border bg-white">
            <div className="relative">
              <input
                type="text"
                placeholder="Search events..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full rounded-t-lg border-b border-border bg-slate-50 px-3 py-2 pl-8 text-xs focus:outline-none"
              />
              <Filter className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredEvents.map((evt) => {
                const isSelected = selectedEvents.includes(evt.id);
                return (
                  <div key={evt.id}>
                    <button
                      type="button"
                      onClick={() => toggleEvent(evt.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors ${
                        isSelected ? "bg-amber-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected ? "border-amber-500 bg-amber-500 text-white" : "border-gray-300 bg-white"
                      }`}>
                        {isSelected && <span className="text-[9px] font-bold">&#10003;</span>}
                      </div>
                      <span className={`flex-1 ${isSelected ? "font-semibold text-amber-900" : "text-foreground"}`}>{evt.label}</span>
                      <span className="text-[9px] text-muted-foreground">{evt.fieldCount} fields</span>
                      {isSelected && TRIGGER_EVENT_SCHEMAS[evt.id] && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPayload(expandedPayload === evt.id ? null : evt.id);
                          }}
                          className="rounded p-0.5 text-amber-500 hover:bg-amber-100"
                        >
                          <ChevronDown className={`h-3 w-3 transition-transform ${expandedPayload === evt.id ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </button>
                    {expandedPayload === evt.id && TRIGGER_EVENT_SCHEMAS[evt.id] && (
                      <div className="border-t border-amber-200 bg-amber-50/50 px-3 py-2">
                        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-amber-700">
                          Payload ({TRIGGER_EVENT_SCHEMAS[evt.id].length} fields)
                        </p>
                        <div className="space-y-0.5">
                          {TRIGGER_EVENT_SCHEMAS[evt.id].map((f) => (
                            <div key={f.name} className="flex items-center gap-1.5 text-[10px]">
                              <span className="shrink-0 rounded bg-amber-200/60 px-1 py-px font-mono text-[8px] font-bold text-amber-800">{f.type}</span>
                              <span className="font-medium text-amber-900">{f.name}</span>
                              {f.sample && <span className="ml-auto text-[9px] text-amber-600">{f.sample}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredEvents.length === 0 && (
                <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">No events match &ldquo;{eventSearch}&rdquo;</p>
              )}
            </div>
          </div>
          {selectedEvents.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedEvents.map((evtId) => {
                const evt = TRIGGER_EVENTS.find((e) => e.id === evtId);
                return (
                  <span key={evtId} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    <Zap className="h-2.5 w-2.5" /> {evt?.label ?? evtId}
                    <button
                      type="button"
                      onClick={() => toggleEvent(evtId)}
                      className="ml-0.5 rounded-full p-0.5 text-amber-400 hover:bg-amber-200 hover:text-amber-700"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <p className="mt-1.5 text-[9px] text-muted-foreground">
            This workflow fires when any of the selected events occur. Payload fields from all selected events are available as data pills.
          </p>
        </div>
      )}

      {/* Schedule section */}
      {scheduleEnabled && (
        <div className="space-y-3">
          <label className="block text-[11px] font-medium text-muted-foreground">
            <Clock className="mr-1 inline h-3 w-3" /> Schedule Settings
          </label>
          <div>
            <label className="mb-0.5 block text-[10px] text-muted-foreground">Frequency</label>
            <select
              className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs focus:border-indigo-300 focus:outline-none"
              value={data.config?.["schedule_frequency"] ?? "daily"}
              onChange={(e) => updateScheduleField("schedule_frequency", e.target.value)}
            >
              <option value="every_15_min">Every 15 minutes</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="cron">Custom (cron)</option>
            </select>
          </div>

          {(data.config?.["schedule_frequency"] ?? "daily") === "weekly" && (
            <div>
              <label className="mb-0.5 block text-[10px] text-muted-foreground">Day of week</label>
              <select
                className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs focus:border-indigo-300 focus:outline-none"
                value={data.config?.["schedule_day"] ?? "monday"}
                onChange={(e) => updateScheduleField("schedule_day", e.target.value)}
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                  <option key={d} value={d.toLowerCase()}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {(data.config?.["schedule_frequency"] ?? "daily") === "monthly" && (
            <div>
              <label className="mb-0.5 block text-[10px] text-muted-foreground">Day of month</label>
              <select
                className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs focus:border-indigo-300 focus:outline-none"
                value={data.config?.["schedule_day_of_month"] ?? "1"}
                onChange={(e) => updateScheduleField("schedule_day_of_month", e.target.value)}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>{d}{d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"}</option>
                ))}
                <option value="last">Last day</option>
              </select>
            </div>
          )}

          {!["every_15_min", "hourly", "cron"].includes(data.config?.["schedule_frequency"] ?? "daily") && (
            <div>
              <label className="mb-0.5 block text-[10px] text-muted-foreground">Time</label>
              <input
                type="time"
                className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs focus:border-indigo-300 focus:outline-none"
                value={data.config?.["schedule_time"] ?? "02:00"}
                onChange={(e) => updateScheduleField("schedule_time", e.target.value)}
              />
            </div>
          )}

          {(data.config?.["schedule_frequency"]) === "cron" && (
            <div>
              <label className="mb-0.5 block text-[10px] text-muted-foreground">Cron expression</label>
              <input
                type="text"
                className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 font-mono text-xs focus:border-indigo-300 focus:outline-none"
                placeholder="0 2 * * *"
                value={data.config?.["schedule_cron"] ?? ""}
                onChange={(e) => updateScheduleField("schedule_cron", e.target.value)}
              />
              <p className="mt-0.5 text-[9px] text-muted-foreground">minute hour day month weekday</p>
            </div>
          )}

          <div>
            <label className="mb-0.5 block text-[10px] text-muted-foreground">Time Zone</label>
            <select
              className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs focus:border-indigo-300 focus:outline-none"
              value={data.config?.["timezone"] ?? "America/Chicago"}
              onChange={(e) => updateScheduleField("timezone", e.target.value)}
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Anchorage">Alaska Time (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
              <option value="America/Phoenix">Arizona (MST)</option>
              <option value="UTC">UTC</option>
            </select>
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
  onEnsureErrorBranch,
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
        if (e.source === id && !reachable.has(e.target) && !e.isErrorPath) {
          reachable.add(e.target);
          walk(e.target);
        }
      }
    }
    walk(n.id);
    return reachable.has(nodeId) && n.id !== nodeId;
  });

  const dataSources: DataSourceGroup[] = [
    {
      id: "workflow",
      label: "Workflow Properties",
      kind: "workflow",
      fields: WORKFLOW_PROPERTY_FIELDS.map((f) => ({
        name: f.name,
        type: f.type,
        sample: f.sample,
        description: f.description,
      })),
    },
    ...upstreamNodes.map((un) => ({
      id: un.id,
      label: un.label,
      kind: (un.type === "trigger" ? "trigger" : "step") as DataSourceGroup["kind"],
      fields: getNodeOutputFields(un),
    })),
  ];

  const showErrorSource =
    data.errorPath === "branch" ||
    workflow.edges.some((e) => e.target === nodeId && (e.isErrorPath || (e.label ?? "").toLowerCase().includes("error"))) ||
    nodeId.startsWith("error-handler-");
  if (showErrorSource && !dataSources.some((s) => s.id === "error")) {
    dataSources.push({
      id: "error",
      label: "Error Details",
      kind: "error",
      fields: ERROR_PROPERTY_FIELDS,
    });
  }

  const filteredTools = allMcpTools().filter(
    (t) =>
      !toolSearch ||
      t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.id.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(toolSearch.toLowerCase()),
  );

  const retry = data.retryPolicy ?? DEFAULT_RETRY;

  return (
    <div className="flex h-full min-h-0 w-[380px] flex-col border-l border-border bg-white">
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
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
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

            {/* Trigger Configuration */}
            {data.type === "trigger" && <TriggerConfig nodeId={nodeId} data={data} onUpdate={onUpdate} />}

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
                          placeholder="Map a field or write a formula..."
                          className={`flex-1 rounded border bg-white px-2 py-1 text-[11px] focus:border-indigo-300 focus:outline-none ${
                            String(data.config?.[param.name] ?? "").includes("{{") || /[A-Z_]+\s*\(/.test(String(data.config?.[param.name] ?? ""))
                              ? "border-indigo-200 bg-indigo-50/30 font-mono text-indigo-700"
                              : "border-gray-200"
                          }`}
                          value={String(data.config?.[param.name] ?? "")}
                          onChange={(e) =>
                            onUpdate(nodeId, {
                              config: { ...data.config, [param.name]: e.target.value },
                            })
                          }
                        />
                        <FieldMapButton
                          targetField={param.name}
                          targetLabel={param.name}
                          currentValue={String(data.config?.[param.name] ?? "")}
                          sources={dataSources}
                          showErrorSource={showErrorSource}
                          onApply={(expr) =>
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

            {/* Pre-defined MCP Filters */}
            {currentTool && data.type === "action" && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    <Filter className="mr-1 inline h-3 w-3" />
                    Pre-defined Filters
                  </label>
                  <span className="text-[9px] text-muted-foreground">LLM-suggested · editable</span>
                </div>
                <p className="mb-2 text-[10px] text-muted-foreground">
                  Filters restrict the data returned by this MCP call, reducing payload size and improving performance.
                </p>
                <div className="space-y-1.5">
                  {(data.config?.["__filters"] ? JSON.parse(data.config["__filters"]) as Array<{ field: string; operator: string; value: string }> : []).map((f: { field: string; operator: string; value: string }, idx: number) => (
                    <div key={idx} className="flex items-center gap-1 rounded border border-blue-200 bg-blue-50/50 px-2 py-1.5">
                      <input
                        type="text"
                        className="w-28 rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[10px] font-mono"
                        placeholder="field"
                        value={f.field}
                        onChange={(e) => {
                          const filters = JSON.parse(data.config?.["__filters"] ?? "[]") as Array<{ field: string; operator: string; value: string }>;
                          filters[idx] = { ...filters[idx], field: e.target.value };
                          onUpdate(nodeId, { config: { ...data.config, __filters: JSON.stringify(filters) } });
                        }}
                      />
                      <select
                        className="h-6 rounded border border-blue-200 bg-white px-1 text-[10px]"
                        value={f.operator}
                        onChange={(e) => {
                          const filters = JSON.parse(data.config?.["__filters"] ?? "[]") as Array<{ field: string; operator: string; value: string }>;
                          filters[idx] = { ...filters[idx], operator: e.target.value };
                          onUpdate(nodeId, { config: { ...data.config, __filters: JSON.stringify(filters) } });
                        }}
                      >
                        <option value="equals">equals</option>
                        <option value="not_equals">not equals</option>
                        <option value="greater_than">greater than</option>
                        <option value="less_than">less than</option>
                        <option value="contains">contains</option>
                        <option value="in">in</option>
                      </select>
                      <input
                        type="text"
                        className="flex-1 rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[10px]"
                        placeholder="value or {{step.field}}"
                        value={f.value}
                        onChange={(e) => {
                          const filters = JSON.parse(data.config?.["__filters"] ?? "[]") as Array<{ field: string; operator: string; value: string }>;
                          filters[idx] = { ...filters[idx], value: e.target.value };
                          onUpdate(nodeId, { config: { ...data.config, __filters: JSON.stringify(filters) } });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const filters = JSON.parse(data.config?.["__filters"] ?? "[]") as Array<{ field: string; operator: string; value: string }>;
                          filters.splice(idx, 1);
                          onUpdate(nodeId, { config: { ...data.config, __filters: JSON.stringify(filters) } });
                        }}
                        className="shrink-0 text-muted-foreground hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const filters = JSON.parse(data.config?.["__filters"] ?? "[]") as Array<{ field: string; operator: string; value: string }>;
                      filters.push({ field: "", operator: "equals", value: "" });
                      onUpdate(nodeId, { config: { ...data.config, __filters: JSON.stringify(filters) } });
                    }}
                    className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-blue-300 py-1.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-3 w-3" /> Add Filter
                  </button>
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
                    placeholder='e.g. {{trigger.priority}} === "emergency" or IF(...)'
                    value={data.config?.["expression"] ?? ""}
                    onChange={(e) =>
                      onUpdate(nodeId, {
                        config: { ...data.config, expression: e.target.value },
                      })
                    }
                  />
                  <FieldMapButton
                    targetField="expression"
                    targetLabel="Condition Expression"
                    currentValue={data.config?.["expression"] ?? ""}
                    sources={dataSources}
                    showErrorSource={showErrorSource}
                    onApply={(expr) =>
                      onUpdate(nodeId, {
                        config: { ...data.config, expression: expr },
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
                    placeholder="Map a list field from an upstream step"
                    value={data.config?.["collection"] ?? ""}
                    onChange={(e) =>
                      onUpdate(nodeId, {
                        config: { ...data.config, collection: e.target.value },
                      })
                    }
                  />
                  <FieldMapButton
                    targetField="collection"
                    targetLabel="Iterate Over"
                    currentValue={data.config?.["collection"] ?? ""}
                    sources={dataSources}
                    showErrorSource={showErrorSource}
                    onApply={(expr) =>
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
                Available data pills
              </p>
              <div className="space-y-2">
                {dataSources.map((src) => (
                  <div key={src.id} className="rounded-lg border border-border bg-white p-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <NodeIcon type={src.kind === "workflow" ? "end" : src.kind === "error" ? "end" : src.kind === "trigger" ? "trigger" : "action"} />
                      <span className="text-[11px] font-semibold text-foreground">{src.label}</span>
                      <span className="ml-auto text-[9px] text-muted-foreground">{src.fields.length} fields</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {src.fields.map((f) => (
                        <span
                          key={f.name}
                          className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700"
                          title={f.description ?? f.sample}
                        >
                          <span className="rounded bg-indigo-200/60 px-0.5 text-[8px] font-mono font-bold">{f.type}</span>
                          {src.id}.{f.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[9px] text-muted-foreground">
                Use the <strong>Map</strong> button on each parameter to open the two-pane field mapper — no need to type {"{{step.field}}"} strings.
              </p>
            </div>

            {/* Current step's configured mappings */}
            {toolParams.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Parameter mappings
                </p>
                <div className="space-y-1">
                  {toolParams.map((p) => {
                    const value = String(data.config?.[p.name] ?? "");
                    const isMapped = value.includes("{{") || /[A-Z_]+\s*\(/.test(value);
                    return (
                      <div key={p.name} className={`flex items-center gap-2 rounded px-2.5 py-1.5 ${isMapped ? "bg-indigo-50" : value ? "bg-slate-50" : "bg-white border border-dashed border-gray-200"}`}>
                        <span className="text-[11px] font-medium text-foreground w-24 truncate">{p.name}</span>
                        {isMapped ? (
                          <span className="flex-1 truncate rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] text-indigo-700">{value}</span>
                        ) : value ? (
                          <span className="flex-1 truncate text-[10px] text-muted-foreground">&quot;{value}&quot;</span>
                        ) : (
                          <span className="flex-1 text-[10px] italic text-gray-300">not configured</span>
                        )}
                        <FieldMapButton
                          targetField={p.name}
                          targetLabel={p.name}
                          currentValue={value}
                          sources={dataSources}
                          showErrorSource={showErrorSource}
                          onApply={(expr) =>
                            onUpdate(nodeId, {
                              config: { ...data.config, [p.name]: expr },
                            })
                          }
                        />
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
                Downstream steps can map these fields via the field mapper as <code className="rounded bg-slate-100 px-1 text-indigo-600">{`${nodeId}.field_name`}</code>
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
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">On Error (after retries)</h4>
              <div className="space-y-1.5">
                {(
                  [
                    { value: "stop" as const, label: "Stop workflow", desc: "Halt execution and mark as failed" },
                    { value: "continue" as const, label: "Continue to next step", desc: "Log error and proceed along the happy path" },
                    { value: "branch" as const, label: "Follow on-error path", desc: "Route to a dedicated error-handling branch with error data pills" },
                  ]
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
                      onChange={() => {
                        onUpdate(nodeId, { errorPath: opt.value });
                        if (opt.value === "branch") {
                          onEnsureErrorBranch?.(nodeId);
                        }
                      }}
                    />
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {(data.errorPath ?? "stop") === "branch" && (
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  <p className="text-[11px] font-semibold text-red-800">Error path data pills</p>
                </div>
                <p className="mb-2 text-[10px] text-red-700/80">
                  When this step fails, downstream error-path steps can map these fields:
                </p>
                <div className="flex flex-wrap gap-1">
                  {ERROR_PROPERTY_FIELDS.map((f) => (
                    <span
                      key={f.name}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-2 py-0.5 text-[10px] font-medium text-red-700"
                      title={f.description}
                    >
                      <span className="rounded bg-red-100 px-0.5 text-[8px] font-mono font-bold">{f.type}</span>
                      error.{f.name}
                    </span>
                  ))}
                </div>
                {data.errorTargetId && (
                  <p className="mt-2 text-[10px] text-red-700">
                    Error branch target: <strong>{workflow.nodes.find((n) => n.id === data.errorTargetId)?.label ?? data.errorTargetId}</strong>
                  </p>
                )}
                {!data.errorTargetId && onEnsureErrorBranch && (
                  <button
                    type="button"
                    onClick={() => onEnsureErrorBranch(nodeId)}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-dashed border-red-300 py-1.5 text-[10px] font-medium text-red-700 hover:bg-red-50"
                  >
                    <Plus className="h-3 w-3" /> Create on-error handler step
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

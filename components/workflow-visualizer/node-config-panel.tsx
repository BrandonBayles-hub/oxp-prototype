"use client";

import { useState } from "react";
import type {
  WorkflowNodeData,
  RetryPolicy,
  GeneratedWorkflow,
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

function UpstreamPill({
  nodeId,
  field,
  label,
  onClick,
}: {
  nodeId: string;
  field: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
    >
      <Database className="h-2.5 w-2.5" />
      {label}.{field}
    </button>
  );
}

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
            { id: "mapping" as const, label: "Data Mapping", icon: ArrowRight },
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

            {/* MCP Tool Selector */}
            {(data.type === "action" || data.type === "trigger") && (
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

            {/* Tool Parameters */}
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
                          placeholder={`Value or data pill...`}
                          className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-[11px] focus:border-indigo-300 focus:outline-none"
                          value={data.config?.[param.name] ?? ""}
                          onChange={(e) =>
                            onUpdate(nodeId, {
                              config: { ...data.config, [param.name]: e.target.value },
                            })
                          }
                        />
                      </div>
                      {upstreamNodes.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {upstreamNodes.slice(0, 3).map((un) => (
                            <UpstreamPill
                              key={un.id}
                              nodeId={un.id}
                              field={param.name}
                              label={un.label}
                              onClick={() =>
                                onUpdate(nodeId, {
                                  config: { ...data.config, [param.name]: `{{${un.id}.output.${param.name}}}` },
                                })
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Condition expression */}
            {data.type === "condition" && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Condition Expression</label>
                <textarea
                  className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 font-mono text-xs text-foreground focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                  rows={2}
                  placeholder="e.g. {{previous_step.output.priority}} === 'emergency'"
                  value={data.config?.["expression"] ?? ""}
                  onChange={(e) =>
                    onUpdate(nodeId, {
                      config: { ...data.config, expression: e.target.value },
                    })
                  }
                />
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
                <input
                  type="text"
                  className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 font-mono text-xs focus:border-indigo-300 focus:outline-none"
                  placeholder="e.g. {{get_leases.output.items}}"
                  value={data.config?.["collection"] ?? ""}
                  onChange={(e) =>
                    onUpdate(nodeId, {
                      config: { ...data.config, collection: e.target.value },
                    })
                  }
                />
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
            <div>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Input Data Pills</h4>
              <p className="mb-3 text-[10px] text-muted-foreground">
                Map output from upstream steps into this node&apos;s inputs. Click a pill to insert it as a parameter value.
              </p>
              {upstreamNodes.length === 0 ? (
                <p className="text-[11px] italic text-muted-foreground">No upstream nodes — this node is at the start of the workflow.</p>
              ) : (
                <div className="space-y-2">
                  {upstreamNodes.map((un) => {
                    const upTool = un.mcpTool ? (TOOL_PARAMS[un.mcpTool] ?? []) : [];
                    return (
                      <div key={un.id} className="rounded-lg border border-border bg-slate-50 p-2.5">
                        <div className="flex items-center gap-1.5">
                          <NodeIcon type={un.type} />
                          <span className="text-[11px] font-semibold text-foreground">{un.label}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <UpstreamPill
                            nodeId={un.id}
                            field="output"
                            label={un.label}
                            onClick={() => {}}
                          />
                          {upTool.map((p) => (
                            <UpstreamPill
                              key={p.name}
                              nodeId={un.id}
                              field={p.name}
                              label={un.label}
                              onClick={() => {}}
                            />
                          ))}
                          {upTool.length === 0 && (
                            <>
                              <UpstreamPill nodeId={un.id} field="result" label={un.label} onClick={() => {}} />
                              <UpstreamPill nodeId={un.id} field="status" label={un.label} onClick={() => {}} />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Output Fields</h4>
              <p className="mb-3 text-[10px] text-muted-foreground">
                Fields this node makes available to downstream steps.
              </p>
              {toolParams.length > 0 ? (
                <div className="space-y-1">
                  {toolParams.map((p) => (
                    <div key={p.name} className="flex items-center gap-2 rounded bg-emerald-50 px-2.5 py-1.5">
                      <span className="rounded bg-emerald-200 px-1 py-px text-[9px] font-mono text-emerald-800">{p.type}</span>
                      <span className="text-[11px] font-medium text-emerald-900">{p.name}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 rounded bg-emerald-50 px-2.5 py-1.5">
                    <span className="rounded bg-emerald-200 px-1 py-px text-[9px] font-mono text-emerald-800">object</span>
                    <span className="text-[11px] font-medium text-emerald-900">result</span>
                  </div>
                  <div className="flex items-center gap-2 rounded bg-emerald-50 px-2.5 py-1.5">
                    <span className="rounded bg-emerald-200 px-1 py-px text-[9px] font-mono text-emerald-800">boolean</span>
                    <span className="text-[11px] font-medium text-emerald-900">success</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 rounded bg-emerald-50 px-2.5 py-1.5">
                    <span className="rounded bg-emerald-200 px-1 py-px text-[9px] font-mono text-emerald-800">object</span>
                    <span className="text-[11px] font-medium text-emerald-900">output</span>
                  </div>
                  <div className="flex items-center gap-2 rounded bg-emerald-50 px-2.5 py-1.5">
                    <span className="rounded bg-emerald-200 px-1 py-px text-[9px] font-mono text-emerald-800">boolean</span>
                    <span className="text-[11px] font-medium text-emerald-900">success</span>
                  </div>
                </div>
              )}
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

"use client";

import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { useTools, type EntrataModule, type CustomMcpServer } from "@/lib/tools-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, ExternalLink, ShieldCheck, ShieldAlert,
  CheckCircle2, Clock, XCircle, Server, Plug,
  ChevronDown, ChevronUp, Webhook, Send, Copy, Eye,
} from "lucide-react";

/* ─────────────────────────────── Helpers ────────────────────────────── */

const RISK_STYLES: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  connected: CheckCircle2,
  pending: Clock,
  disconnected: XCircle,
};

const STATUS_STYLE: Record<string, string> = {
  connected: "text-green-600",
  pending: "text-amber-500",
  disconnected: "text-muted-foreground",
};

/* ─────────────────────────────── Page ───────────────────────────────── */

export default function ToolsPage() {
  const tools = useTools();
  const [activeTab, setActiveTab] = useState("entrata");
  const [addServerOpen, setAddServerOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(tools.entrataModules.filter((m) => m.contracted).map((m) => m.id))
  );

  const toggleExpanded = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Stats ── */

  const totalEntrataTools = useMemo(
    () => tools.entrataModules.reduce((sum, m) => sum + m.tools.length, 0),
    [tools.entrataModules]
  );

  const enabledEntrataTools = useMemo(
    () =>
      tools.entrataModules
        .filter((m) => m.contracted)
        .reduce((sum, m) => sum + m.tools.filter((t) => t.enabled).length, 0),
    [tools.entrataModules]
  );

  const contractedModules = useMemo(
    () => tools.entrataModules.filter((m) => m.contracted).length,
    [tools.entrataModules]
  );

  const approvalRequired = useMemo(
    () =>
      tools.entrataModules
        .filter((m) => m.contracted)
        .reduce((sum, m) => sum + m.tools.filter((t) => t.enabled && t.requiresApproval).length, 0),
    [tools.entrataModules]
  );

  const stats = [
    { label: "Entrata tools", value: `${enabledEntrataTools}/${totalEntrataTools}`, sub: "enabled" },
    { label: "Entrata modules", value: `${contractedModules}/${tools.entrataModules.length}`, sub: "contracted" },
    { label: "Custom servers", value: tools.customServers.length },
    { label: "Require approval", value: approvalRequired, sub: "tools" },
  ];

  return (
    <>
      <PageHeader
        title="Tools"
        description="Manage MCP tool servers that your AI agents use. Entrata tools are available based on your contracted products. Add custom MCP servers for additional capabilities."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-3">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              {"sub" in s && s.sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="entrata">Entrata</TabsTrigger>
          <TabsTrigger value="custom">Custom MCP</TabsTrigger>
          <TabsTrigger value="events">Events & Webhooks</TabsTrigger>
        </TabsList>

        {/* ───── TAB 1: Entrata Modules ───── */}
        <TabsContent value="entrata" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Entrata MCP tools organized by product module. Contracted modules are available to your agents.
            Toggle individual tools on or off, and mark high-risk tools as requiring human approval before execution.
          </p>

          {tools.entrataModules.map((mod) => (
            <EntrataModuleCard
              key={mod.id}
              module={mod}
              expanded={expandedModules.has(mod.id)}
              onToggleExpanded={() => toggleExpanded(mod.id)}
              onToggleContracted={() => tools.toggleModuleContracted(mod.id)}
              onToggleToolEnabled={(toolId) => tools.toggleToolEnabled(mod.id, toolId)}
              onToggleToolApproval={(toolId) => tools.toggleToolApproval(mod.id, toolId)}
            />
          ))}
        </TabsContent>

        {/* ───── TAB 2: Custom MCP Servers ───── */}
        <TabsContent value="custom" className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Connect your own MCP servers to extend agent capabilities beyond Entrata.
              Custom tools appear in the agent configuration alongside Entrata tools.
            </p>
            <Button size="sm" onClick={() => setAddServerOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Server
            </Button>
          </div>

          {tools.customServers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Server className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No custom MCP servers</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a server to give your agents access to external tools and APIs.
                </p>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => setAddServerOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add your first server
                </Button>
              </CardContent>
            </Card>
          ) : (
            tools.customServers.map((server) => (
              <CustomServerCard
                key={server.id}
                server={server}
                onToggleEnabled={() => tools.toggleCustomServerEnabled(server.id)}
                onRemove={() => tools.removeCustomServer(server.id)}
              />
            ))
          )}
        </TabsContent>

        {/* ───── TAB 3: Events & Webhooks ───── */}
        <TabsContent value="events" className="space-y-4">
          <EventsAndWebhooks />
        </TabsContent>
      </Tabs>

      <AddServerDialog
        open={addServerOpen}
        onOpenChange={setAddServerOpen}
        onAdd={(server) => {
          tools.addCustomServer(server);
          setAddServerOpen(false);
        }}
      />
    </>
  );
}

/* ────────────────────── Entrata Module Card ─────────────────────────── */

function EntrataModuleCard({
  module: mod,
  expanded,
  onToggleExpanded,
  onToggleContracted,
  onToggleToolEnabled,
  onToggleToolApproval,
}: {
  module: EntrataModule;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleContracted: () => void;
  onToggleToolEnabled: (toolId: string) => void;
  onToggleToolApproval: (toolId: string) => void;
}) {
  const enabledCount = mod.tools.filter((t) => t.enabled).length;

  return (
    <Card className={cn(!mod.contracted && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleExpanded}
              className="text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>{mod.name}</CardTitle>
                {mod.contracted ? (
                  <Badge variant="outline" className="text-[10px] border-green-300 text-green-700 dark:border-green-700 dark:text-green-300">
                    Contracted
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Not contracted</Badge>
                )}
                {mod.contracted && (
                  <span className="text-xs text-muted-foreground">
                    {enabledCount}/{mod.tools.length} tools enabled
                  </span>
                )}
              </div>
              <CardDescription className="mt-1">{mod.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Contracted</span>
            <Switch checked={mod.contracted} onCheckedChange={onToggleContracted} />
          </div>
        </div>
      </CardHeader>

      {expanded && mod.contracted && (
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20">Risk</TableHead>
                <TableHead className="w-28 text-center">Approval</TableHead>
                <TableHead className="w-20 text-right">Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mod.tools.map((tool) => (
                <TableRow key={tool.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{tool.label}</p>
                      <code className="text-[10px] text-muted-foreground">{tool.name}</code>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{tool.description}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px]", RISK_STYLES[tool.risk])}>
                      {tool.risk}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => onToggleToolApproval(tool.id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                        tool.requiresApproval
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {tool.requiresApproval ? (
                        <><ShieldAlert className="h-3 w-3" /> Required</>
                      ) : (
                        <><ShieldCheck className="h-3 w-3" /> Auto</>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={tool.enabled}
                      onCheckedChange={() => onToggleToolEnabled(tool.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}

      {expanded && !mod.contracted && (
        <CardContent>
          <div className="flex items-center gap-3 rounded-md border border-dashed border-border p-6 text-center">
            <Plug className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <p className="text-sm font-medium">Module not contracted</p>
              <p className="text-xs text-muted-foreground">
                Enable the &quot;Contracted&quot; toggle above to make these {mod.tools.length} tools available to your agents.
                In production, this reflects your Entrata product licensing.
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ────────────────────── Custom Server Card ──────────────────────────── */

function CustomServerCard({
  server,
  onToggleEnabled,
  onRemove,
}: {
  server: CustomMcpServer;
  onToggleEnabled: () => void;
  onRemove: () => void;
}) {
  const StatusIcon = STATUS_ICON[server.connectionStatus] ?? XCircle;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Server className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>{server.name}</CardTitle>
                <span className={cn("flex items-center gap-1 text-xs", STATUS_STYLE[server.connectionStatus])}>
                  <StatusIcon className="h-3 w-3" />
                  {server.connectionStatus}
                </span>
              </div>
              {server.description && (
                <CardDescription className="mt-0.5">{server.description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={server.enabled} onCheckedChange={onToggleEnabled} />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            <code className="rounded bg-muted px-1.5 py-0.5">{server.url}</code>
          </span>
          <span>{server.tools.length} tool{server.tools.length !== 1 ? "s" : ""}</span>
          <span>Added {new Date(server.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
        {server.tools.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {server.tools.map((tool) => (
              <Badge key={tool.name} variant="secondary" className="text-[10px]">
                {tool.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────────────────── Add Server Dialog ───────────────────────────── */

function AddServerDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (server: Omit<CustomMcpServer, "id" | "createdAt" | "connectionStatus">) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [toolsInput, setToolsInput] = useState("");

  const reset = () => {
    setName("");
    setUrl("");
    setDescription("");
    setToolsInput("");
  };

  const handleSubmit = () => {
    if (!name.trim() || !url.trim()) return;
    const toolNames = toolsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onAdd({
      name: name.trim(),
      url: url.trim(),
      description: description.trim(),
      enabled: true,
      tools: toolNames.map((n) => ({ name: n, description: "" })),
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom MCP Server</DialogTitle>
          <DialogDescription>
            Connect an external MCP server to make its tools available to your agents.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Server name</label>
            <Input
              placeholder="e.g. Property Analytics API"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Server URL</label>
            <Input
              placeholder="e.g. https://api.example.com/mcp"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Input
              placeholder="What does this server do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tools (comma-separated)</label>
            <Input
              placeholder="e.g. analytics/run_report, analytics/get_metrics"
              value={toolsInput}
              onChange={(e) => setToolsInput(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              In production, tools are auto-discovered from the MCP server. For this POC, enter them manually.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); reset(); }}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!name.trim() || !url.trim()}>
            Add Server
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────── Events & Webhooks ─────────────────────────── */

type PlatformEvent = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  webhookUrl: string;
  samplePayload: Record<string, unknown>;
  recentDeliveries: { at: string; status: "success" | "failed"; httpCode: number }[];
};

const INITIAL_EVENTS: PlatformEvent[] = [
  {
    id: "conversation.ended",
    name: "conversation.ended",
    description: "Fired when an agent completes a conversation with a resident",
    enabled: true,
    webhookUrl: "https://hooks.example.com/janet/conversations",
    samplePayload: { event: "conversation.ended", agentId: "agent-1", agentName: "Leasing AI", residentId: "r-204", unit: "Unit 204", property: "Oakwood Apartments", resolution: "resolved", turns: 4, latencyMs: 1240, timestamp: "2026-02-23T10:30:00Z" },
    recentDeliveries: [
      { at: "2026-02-23T10:30:12Z", status: "success", httpCode: 200 },
      { at: "2026-02-23T09:15:04Z", status: "success", httpCode: 200 },
      { at: "2026-02-22T16:45:33Z", status: "failed", httpCode: 500 },
    ],
  },
  {
    id: "escalation.created",
    name: "escalation.created",
    description: "Fired when an agent escalates to a human operator",
    enabled: true,
    webhookUrl: "https://hooks.example.com/janet/escalations",
    samplePayload: { event: "escalation.created", agentId: "agent-10", agentName: "Maintenance AI", reason: "Emergency work order detected", priority: "urgent", assignee: "On-call maintenance", property: "Oakwood Apartments", timestamp: "2026-02-23T11:00:00Z" },
    recentDeliveries: [
      { at: "2026-02-23T11:00:05Z", status: "success", httpCode: 200 },
    ],
  },
  {
    id: "work_order.created",
    name: "work_order.created",
    description: "Fired when an agent creates a work order via Entrata MCP",
    enabled: false,
    webhookUrl: "",
    samplePayload: { event: "work_order.created", workOrderId: "WO-4521", unit: "Unit 204", category: "plumbing", priority: "standard", createdBy: "Maintenance AI", timestamp: "2026-02-23T08:30:00Z" },
    recentDeliveries: [],
  },
  {
    id: "document.approved",
    name: "document.approved",
    description: "Fired when a Vault document is approved and agents are retrained",
    enabled: false,
    webhookUrl: "",
    samplePayload: { event: "document.approved", documentId: "doc-123", fileName: "Lease Terms SOP v3.pdf", approvedBy: "Admin", version: "3.0", agentsRetrained: 3, timestamp: "2026-02-23T14:00:00Z" },
    recentDeliveries: [],
  },
  {
    id: "agent.suspended",
    name: "agent.suspended",
    description: "Fired when an agent is suspended (emergency kill switch or manual)",
    enabled: true,
    webhookUrl: "https://hooks.example.com/janet/alerts",
    samplePayload: { event: "agent.suspended", agentId: "agent-1", agentName: "Leasing AI", reason: "Emergency kill switch", suspendedBy: "Admin", timestamp: "2026-02-23T12:00:00Z" },
    recentDeliveries: [],
  },
  {
    id: "feedback.submitted",
    name: "feedback.submitted",
    description: "Fired when a user submits feedback on an agent response",
    enabled: false,
    webhookUrl: "",
    samplePayload: { event: "feedback.submitted", agentId: "agent-1", agentName: "Leasing AI", rating: "negative", comment: "Wrong pet deposit amount", messagePreview: "The pet deposit is $250...", timestamp: "2026-02-23T14:30:00Z" },
    recentDeliveries: [],
  },
];

function EventsAndWebhooks() {
  const [events, setEvents] = useState<PlatformEvent[]>(INITIAL_EVENTS);
  const [previewPayload, setPreviewPayload] = useState<PlatformEvent | null>(null);

  const toggleEvent = useCallback((id: string) => {
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, enabled: !e.enabled } : e));
  }, []);

  const updateWebhookUrl = useCallback((id: string, url: string) => {
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, webhookUrl: url } : e));
  }, []);

  const enabledCount = events.filter((e) => e.enabled).length;

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Platform events are emitted when agents take actions. Configure webhook endpoints to receive real-time event data in your systems.
      </p>

      <div className="grid gap-3 sm:grid-cols-3 mb-2">
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <Webhook className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">{events.length}</p>
              <p className="text-xs text-muted-foreground">Event types</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <Send className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-lg font-semibold">{enabledCount}</p>
              <p className="text-xs text-muted-foreground">Active webhooks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-lg font-semibold">
                {events.reduce((s, e) => s + e.recentDeliveries.filter((d) => d.status === "failed").length, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Failed deliveries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {events.map((evt) => (
          <Card key={evt.id} className={cn("transition-colors", evt.enabled ? "border-border" : "border-border/40 opacity-70")}>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Switch
                  checked={evt.enabled}
                  onCheckedChange={() => toggleEvent(evt.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-semibold font-mono">{evt.name}</code>
                    {evt.enabled && <Badge variant="outline" className="text-[10px] text-emerald-600">Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{evt.description}</p>
                  {evt.enabled && (
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        value={evt.webhookUrl}
                        onChange={(e) => updateWebhookUrl(evt.id, e.target.value)}
                        placeholder="https://your-endpoint.com/webhook"
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => setPreviewPayload(evt)}
                    >
                      <Eye className="h-3 w-3 mr-1" /> Sample payload
                    </Button>
                    {evt.recentDeliveries.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        Last: {new Date(evt.recentDeliveries[0].at).toLocaleString()} ·{" "}
                        <span className={evt.recentDeliveries[0].status === "success" ? "text-emerald-600" : "text-red-500"}>
                          {evt.recentDeliveries[0].httpCode}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sample Payload Dialog */}
      <Dialog open={!!previewPayload} onOpenChange={(open) => !open && setPreviewPayload(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{previewPayload?.name}</DialogTitle>
            <DialogDescription>Sample webhook payload for this event type</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted p-3 overflow-auto max-h-[400px]">
            <pre className="text-xs font-mono whitespace-pre-wrap text-foreground">
              {previewPayload ? JSON.stringify(previewPayload.samplePayload, null, 2) : ""}
            </pre>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (previewPayload) {
                  navigator.clipboard?.writeText(JSON.stringify(previewPayload.samplePayload, null, 2));
                }
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
